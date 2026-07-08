import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

/**
 * Tenant: fetch their own profile document using their Firebase Auth UID.
 * The tenant's Firestore doc ID equals their Firebase Auth UID (set during TenantOnboarding).
 * Returns a real-time listener (unsubscribe fn).
 */
export const getMyTenantProfile = (uid, callback) => {
  // Staff doc ID = uid (set in TenantOnboarding)
  return firestore()
    .collection('tenants')
    .doc(uid)
    .onSnapshot(
      doc => {
        if (doc && doc.exists) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          // Fallback: query by uid field (if doc ID differs)
          firestore()
            .collection('tenants')
            .where('uid', '==', uid)
            .limit(1)
            .get()
            .then(snap => {
              if (!snap.empty) {
                callback({ id: snap.docs[0].id, ...snap.docs[0].data() });
              } else {
                callback(null);
              }
            })
            .catch(() => callback(null));
        }
      },
      error => {
        console.error('getMyTenantProfile error:', error);
        callback(null);
      }
    );
};

/**
 * Tenant: fetch rent payment history and pending dues.
 * Queries transactions where tenantUid matches the signed-in user.
 */
export const getTenantRentLedger = async (tenantUid) => {
  try {
    const snapshot = await firestore()
      .collection('transactions')
      .where('tenantUid', '==', tenantUid)
      .get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return data.sort((a, b) => {
      const aTime = a.date?.toDate ? a.date.toDate().getTime() : 0;
      const bTime = b.date?.toDate ? b.date.toDate().getTime() : 0;
      return bTime - aTime;
    });
  } catch (err) {
    console.error('getTenantRentLedger error:', err);
    return [];
  }
};

export const getAllTenants = async () => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) throw new Error('No authenticated user');

  const snapshot = await firestore().collection('tenants')
    .where('ownerId', '==', ownerId)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getTenantsForRoom = async (blockName, roomNumber) => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) return [];

  const snapshot = await firestore().collection('tenants')
    .where('ownerId', '==', ownerId)
    .where('blockId', '==', blockName)
    .where('roomNumber', '==', parseInt(roomNumber, 10))
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addTenant = async (tenantData) => {
  const ownerId = auth().currentUser?.uid;
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const newTenant = {
    ...tenantData,
    ownerId,
    joined: today,
    currentRoomJoinedDate: tenantData.roomNumber ? today : null,
    rentStatus: tenantData.roomNumber ? 'Pending' : 'Unassigned',
    roomHistory: [],
    createdAt: firestore.FieldValue.serverTimestamp(),
  };
  await firestore().collection('tenants').add(newTenant);
};

/**
 * FIX 3: removeTenant — fixed the race condition where a re-query after the update
 * could still count the just-removed tenant.
 *
 * Strategy: Count tenants BEFORE the update (includes the tenant being removed),
 * then subtract 1. This is accurate regardless of Firestore propagation timing.
 * The update and room status change are applied atomically via a batch write.
 */
export const removeTenant = async ({ tenantId, blockName, roomNumber }) => {
  const ownerId = auth().currentUser?.uid;
  const parsedRoomNumber = parseInt(roomNumber, 10);

  // --- Step 1: Read all data BEFORE any writes ---
  const tenantDocRef = firestore().collection('tenants').doc(tenantId);
  const [tenantSnap, roomQuery, tenantsInRoomQuery] = await Promise.all([
    tenantDocRef.get(),
    firestore().collection('rooms')
      .where('ownerId', '==', ownerId)
      .where('blockName', '==', blockName)
      .where('roomNumber', '==', parsedRoomNumber)
      .get(),
    // Count tenants BEFORE removal — this avoids the race condition
    firestore().collection('tenants')
      .where('ownerId', '==', ownerId)
      .where('blockId', '==', blockName)
      .where('roomNumber', '==', parsedRoomNumber)
      .get(),
  ]);

  const tenantData = tenantSnap.data();

  // --- Step 2: Build room history entry ---
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  let currentHistory = Array.isArray(tenantData.roomHistory) ? [...tenantData.roomHistory] : [];
  const joinedDate = tenantData.currentRoomJoinedDate || tenantData.joined || 'Unknown';

  currentHistory.push({
    historyId: Date.now().toString() + Math.random().toString(36).substring(7),
    block: blockName,
    room: roomNumber.toString(),
    joined: joinedDate,
    left: today,
  });

  // --- Step 3: Calculate new room status using pre-read count ---
  // Subtract 1 because we are removing this tenant in the same batch
  const countAfterRemoval = Math.max(0, tenantsInRoomQuery.size - 1);

  // --- Step 4: Apply all writes atomically in a batch ---
  const batch = firestore().batch();

  batch.update(tenantDocRef, {
    roomNumber: null,
    rentStatus: 'Unassigned',
    roomHistory: currentHistory,
    currentRoomJoinedDate: null,
  });

  if (!roomQuery.empty) {
    const roomDoc = roomQuery.docs[0];
    const maxSharing = roomDoc.data().sharing || 1;

    let newStatus = 'vacant';
    if (countAfterRemoval > 0 && countAfterRemoval < maxSharing) newStatus = 'partial';
    if (countAfterRemoval >= maxSharing) newStatus = 'full';

    batch.update(roomDoc.ref, { status: newStatus });
  }

  await batch.commit();
};

/**
 * FIX 2: reassignTenant — removed hardcoded 'A' fallback for newBlockId.
 * Also fixed same race condition in old room status recalculation.
 */
export const reassignTenant = async ({ tenantId, oldRoomNumber, newRoomNumber, newBlockId, oldBlockId }) => {
  const ownerId = auth().currentUser?.uid;
  const parsedNewRoom = parseInt(newRoomNumber, 10);
  const tenantDocRef = firestore().collection('tenants').doc(tenantId);

  const hasOldRoom = oldRoomNumber !== null && oldRoomNumber !== undefined && oldRoomNumber !== '';
  const parsedOldRoom = hasOldRoom ? parseInt(oldRoomNumber, 10) : null;

  // --- Step 1: Read all data BEFORE any writes ---
  const reads = [tenantDocRef.get()];

  if (hasOldRoom) {
    reads.push(
      firestore().collection('rooms')
        .where('ownerId', '==', ownerId)
        .where('blockName', '==', oldBlockId)
        .where('roomNumber', '==', parsedOldRoom)
        .get(),
      // Count tenants in old room BEFORE move (race condition fix)
      firestore().collection('tenants')
        .where('ownerId', '==', ownerId)
        .where('blockId', '==', oldBlockId)
        .where('roomNumber', '==', parsedOldRoom)
        .get()
    );
  }

  reads.push(
    firestore().collection('rooms')
      .where('ownerId', '==', ownerId)
      .where('blockName', '==', newBlockId)
      .where('roomNumber', '==', parsedNewRoom)
      .get(),
    // Count tenants in new room BEFORE move (race condition fix)
    firestore().collection('tenants')
      .where('ownerId', '==', ownerId)
      .where('blockId', '==', newBlockId)
      .where('roomNumber', '==', parsedNewRoom)
      .get()
  );

  const results = await Promise.all(reads);

  const tenantSnap = results[0];
  const tenantData = tenantSnap.data();
  let idx = 1;

  let oldRoomDoc = null, oldRoomCountBefore = 0;
  if (hasOldRoom) {
    const oldRoomQuery = results[idx++];
    const oldTenantsQuery = results[idx++];
    oldRoomDoc = oldRoomQuery.empty ? null : oldRoomQuery.docs[0];
    oldRoomCountBefore = oldTenantsQuery.size;
  }

  const newRoomQuery = results[idx++];
  const newTenantsQuery = results[idx];
  const newRoomDoc = newRoomQuery.empty ? null : newRoomQuery.docs[0];
  const newRoomCountBefore = newTenantsQuery.size;

  // --- Step 2: Build history and updates ---
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  let currentHistory = Array.isArray(tenantData.roomHistory) ? [...tenantData.roomHistory] : [];
  const safeOldBlockId = oldBlockId || tenantData.blockId || null;

  const updates = {
    roomNumber: parsedNewRoom,
    blockId: newBlockId,  // FIX: was `newBlockId || 'A'` — removed dangerous fallback
    rentStatus: 'Pending',
    currentRoomJoinedDate: today,
  };

  if (hasOldRoom) {
    const joinedDate = tenantData.currentRoomJoinedDate || tenantData.joined || 'Unknown';
    currentHistory.push({
      historyId: Date.now().toString() + Math.random().toString(36).substring(7),
      block: safeOldBlockId,
      room: oldRoomNumber.toString(),
      joined: joinedDate,
      left: today,
    });
    updates.roomHistory = currentHistory;
  }

  // --- Step 3: Apply all writes atomically ---
  const batch = firestore().batch();
  batch.update(tenantDocRef, updates);

  // Update old room status (subtract 1 tenant — race condition fix)
  if (hasOldRoom && oldRoomDoc) {
    const maxSharing = oldRoomDoc.data().sharing || 1;
    const newCount = Math.max(0, oldRoomCountBefore - 1);
    let status = 'vacant';
    if (newCount > 0 && newCount < maxSharing) status = 'partial';
    if (newCount >= maxSharing) status = 'full';
    batch.update(oldRoomDoc.ref, { status });
  }

  // Update new room status (add 1 tenant)
  if (newRoomDoc) {
    const maxSharing = newRoomDoc.data().sharing || 1;
    const newCount = newRoomCountBefore + 1;
    let status = 'partial';
    if (newCount >= maxSharing) status = 'full';
    if (newCount === 0) status = 'vacant';
    batch.update(newRoomDoc.ref, { status });
  }

  await batch.commit();
};

export const uploadTenantDocument = async ({ tenantId, fileUri, fileName }) => {
  // Update Firestore directly with the local file path, bypassing Firebase Storage completely.
  await firestore().collection('tenants').doc(tenantId).update({
    idDocumentUrl: fileUri,
    idDocumentPath: `local_documents/${tenantId}/${fileName}`, // Optional reference
  });

  return fileUri;
};

export const deleteTenantDocument = async ({ tenantId, documentPath }) => {
  if (documentPath) {
    try {
      await storage().ref(documentPath).delete();
    } catch (e) {
      console.warn('Ignoring delete error:', e);
    }
  }
  await firestore().collection('tenants').doc(tenantId).update({
    idDocumentUrl: firestore.FieldValue.delete(),
    idDocumentPath: firestore.FieldValue.delete(),
  });
};

/**
 * Deletes a single room history entry for a tenant.
 * Previously done via direct Firestore call in TenantProfile (bypassing React Query).
 * Now properly routed through the service layer.
 */
export const deleteTenantHistory = async ({ tenantId, historyId, currentHistory }) => {
  const newHistory = currentHistory.filter(h =>
    h.historyId ? h.historyId !== historyId : false
  );
  await firestore().collection('tenants').doc(tenantId).update({
    roomHistory: newHistory,
  });
};

/**
 * Records a rent payment for a specific month.
 * Uses a deterministic ID (rent_tenantId_monthYear) to easily toggle Paid/Pending.
 */
export const recordRentPayment = async ({ tenantId, tenantUid, ownerId, amount, newStatus, monthYear }) => {
  const batch = firestore().batch();
  
  // We use a predictable ID for rent transactions so we can easily create/delete them
  const txRef = firestore().collection('transactions').doc(`rent_${tenantId}_${monthYear}`);

  if (newStatus === 'Paid') {
    batch.set(txRef, {
      tenantId,
      tenantUid: tenantUid || null,   // stored for Firestore security rule read access by tenant
      ownerId,
      amount: Number(amount) || 0,
      type: 'Payment',
      description: `Rent payment for ${monthYear}`,
      monthYear,
      date: firestore.FieldValue.serverTimestamp(),
    });
  } else if (newStatus === 'Pending') {
    // Revert to pending = delete the transaction
    batch.delete(txRef);
  }

  // Update overall tenant rent status
  const tenantRef = firestore().collection('tenants').doc(tenantId);
  batch.update(tenantRef, { rentStatus: newStatus });

  await batch.commit();
};

/**
 * Fetches all payment transactions for a specific tenant.
 * Must include ownerId in the query to satisfy Firestore security rules
 * which require resource.data.ownerId == request.auth.uid.
 */
export const getTenantTransactions = async (tenantId, ownerId) => {
  if (!tenantId || !ownerId) return [];
  try {
    const snapshot = await firestore().collection('transactions')
      .where('tenantId', '==', tenantId)
      .where('ownerId', '==', ownerId)
      .get();
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(tx => tx.type === 'Payment');
  } catch (err) {
    console.error('getTenantTransactions error:', err);
    return [];
  }
};
