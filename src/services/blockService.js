import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export const getBlocks = async () => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) throw new Error('No authenticated user');

  const snapshot = await firestore().collection('blocks').where('ownerId', '==', ownerId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getDashboardStats = async () => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) throw new Error('No authenticated user');

  // Efficient parallel queries using count() instead of fetching all documents
  const [vacantSnapshot, fullSnapshot, partialSnapshot, unpaidSnapshot] = await Promise.all([
    firestore().collection('rooms').where('ownerId', '==', ownerId).where('status', '==', 'vacant').count().get(),
    firestore().collection('rooms').where('ownerId', '==', ownerId).where('status', '==', 'full').count().get(),
    firestore().collection('rooms').where('ownerId', '==', ownerId).where('status', '==', 'partial').count().get(),
    firestore().collection('tenants').where('ownerId', '==', ownerId).where('rentStatus', '==', 'Pending').count().get(),
  ]);

  return {
    vacantRooms: vacantSnapshot.data().count,
    totalOccupiedRooms: fullSnapshot.data().count + partialSnapshot.data().count,
    unpaidTenants: unpaidSnapshot.data().count,
  };
};

export const addBlock = async (blockData) => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) throw new Error('No authenticated user');

  const { name, floors, area, genderType, acType, sharingCapacities, pricingMatrix, amenities } = blockData;
  const sanitizedName = name.trim();

  const newBlock = {
    name: sanitizedName,
    ownerId,
    floors: parseInt(floors, 10),
    area: area || '',
    genderType: genderType || 'Coliving',
    acType: acType || 'Both',
    sharingCapacities: sharingCapacities || [],
    amenities: amenities || [],
    createdAt: firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await firestore().collection('blocks').add(newBlock);

  if (pricingMatrix) {
    await firestore().collection('settings').doc(`pricing_${ownerId}`).set(
      { [sanitizedName]: pricingMatrix },
      { merge: true }
    );
  }

  return { id: docRef.id, ...newBlock };
};

export const updateBlockDetails = async ({ blockId, blockName, updatedData }) => {
  const ownerId = auth().currentUser?.uid;
  const { area, genderType, acType, sharingCapacities, amenities, pricingMatrix } = updatedData;

  await firestore().collection('blocks').doc(blockId).update({
    area: area || '',
    genderType: genderType || 'Coliving',
    acType: acType || 'Both',
    sharingCapacities: sharingCapacities || [],
    amenities: amenities || [],
  });

  if (pricingMatrix) {
    await firestore().collection('settings').doc(`pricing_${ownerId}`).set(
      { [blockName]: pricingMatrix },
      { merge: true }
    );
  }
};

/**
 * FIX 1: deleteBlock — was setting orphaned tenants to blockId: 'A' (data corruption).
 * Now correctly sets blockId to null so they appear as truly unassigned.
 */
export const deleteBlock = async ({ blockId, blockName }) => {
  const ownerId = auth().currentUser?.uid;
  const batch = firestore().batch();

  // Unassign all tenants in this block
  const tenantsSnapshot = await firestore().collection('tenants')
    .where('ownerId', '==', ownerId)
    .where('blockId', '==', blockName)
    .get();

  tenantsSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      roomNumber: null,
      blockId: null,           // FIX: was hardcoded 'A' — caused data corruption
      rentStatus: 'Unassigned',
      currentRoomJoinedDate: null,
    });
  });

  // Delete all rooms in this block
  const roomsSnapshot = await firestore().collection('rooms')
    .where('ownerId', '==', ownerId)
    .where('blockName', '==', blockName)
    .get();

  roomsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // Delete the block document
  batch.delete(firestore().collection('blocks').doc(blockId));
  await batch.commit();
};

export const getPricing = async () => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) return {};

  const doc = await firestore().collection('settings').doc(`pricing_${ownerId}`).get();
  return doc.exists ? doc.data() : {};
};

/**
 * FIX 9: addFloorToBlock — was assigning sharing with (i % 3) + 1, ignoring the
 * block's actual sharingCapacities config. Now fetches the block document to get
 * real sharing types and cycles through them correctly.
 */
export const addFloorToBlock = async ({ blockId, blockName, currentFloorCount, numberOfRooms, isACFloor = false }) => {
  const ownerId = auth().currentUser?.uid;
  const newFloorNum = currentFloorCount + 1;
  const numRoomsToGenerate = parseInt(numberOfRooms, 10);

  // Fetch the block to get sharingCapacities — this is what the owner configured
  const blockDoc = await firestore().collection('blocks').doc(blockId).get();
  const sharingCapacities = blockDoc.data()?.sharingCapacities;
  // Fallback only if block has no config (edge case for old data)
  const validSharings = Array.isArray(sharingCapacities) && sharingCapacities.length > 0
    ? sharingCapacities
    : [1, 2, 3];

  const batch = firestore().batch();
  const blockRef = firestore().collection('blocks').doc(blockId);
  batch.update(blockRef, { floors: newFloorNum });

  for (let i = 1; i <= numRoomsToGenerate; i++) {
    const roomNum = (newFloorNum * 100) + i;
    const roomRef = firestore().collection('rooms').doc();
    // FIX: cycles through actual sharingCapacities from block config
    const sharing = validSharings[(i - 1) % validSharings.length];

    batch.set(roomRef, {
      blockName: blockName,
      ownerId,
      floor: newFloorNum,
      roomNumber: roomNum,
      sharing: sharing,
      status: 'vacant',
      hasAC: isACFloor,
    });
  }

  await batch.commit();
};

export const deleteFloor = async ({ blockId, blockName, floorId, currentFloorCount }) => {
  const ownerId = auth().currentUser?.uid;
  const roomsSnapshot = await firestore().collection('rooms')
    .where('ownerId', '==', ownerId)
    .where('blockName', '==', blockName)
    .where('floor', '==', parseInt(floorId, 10))
    .get();

  const roomNumbers = roomsSnapshot.docs.map(doc => doc.data().roomNumber);
  const batch = firestore().batch();

  if (roomNumbers.length > 0) {
    const tenantsSnapshot = await firestore().collection('tenants')
      .where('ownerId', '==', ownerId)
      .where('blockId', '==', blockName)
      .get();

    tenantsSnapshot.docs.forEach(doc => {
      if (roomNumbers.includes(doc.data().roomNumber)) {
        batch.update(doc.ref, {
          roomNumber: null,
          blockId: null,   // FIX: consistent with deleteBlock fix
          rentStatus: 'Unassigned',
          currentRoomJoinedDate: null,
        });
      }
    });
  }

  roomsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  const blockRef = firestore().collection('blocks').doc(blockId);
  batch.update(blockRef, { floors: Math.max(0, currentFloorCount - 1) });

  await batch.commit();
};
