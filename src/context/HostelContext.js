import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage'; 
import auth from '@react-native-firebase/auth'; // 🔥 IMPORT ADDED FOR SECURITY ISOLATION

const HostelContext = createContext();

export const HostelProvider = ({ children }) => {
  const [blocks, setBlocks] = useState([]);
  const [stats, setStats] = useState({ vacantRooms: 0, unpaidTenants: 0, totalOccupiedRooms: 0 });
  const [loading, setLoading] = useState(true);
  const [pricingMatrix, setPricingMatrix] = useState(null);
  
  // 🔥 NEW STATE FOR NOTICES
  const [notices, setNotices] = useState([]);

  const fetchPricing = useCallback(async () => {
    try {
      const ownerId = auth().currentUser?.uid;
      if (!ownerId) return;

      const doc = await firestore().collection('settings').doc(`pricing_${ownerId}`).get();
      if (doc.exists) {
        setPricingMatrix(doc.data());
      } else {
        setPricingMatrix({}); 
      }
    } catch (error) { 
      console.error("Error fetching pricing", error); 
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    const ownerId = auth().currentUser?.uid;
    if (!ownerId) return;

    setLoading(true);
    try {
      const blocksSnapshot = await firestore().collection('blocks').where('ownerId', '==', ownerId).get();
      const fetchedBlocks = blocksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBlocks(fetchedBlocks);

      const roomsSnapshot = await firestore().collection('rooms').where('ownerId', '==', ownerId).get();
      const tenantsSnapshot = await firestore().collection('tenants')
        .where('ownerId', '==', ownerId)
        .where('rentStatus', '==', 'Pending')
        .get();

      let vacantCount = 0;
      let occupiedCount = 0;
      
      roomsSnapshot.forEach(doc => {
        const status = doc.data().status;
        if (status === 'vacant') vacantCount++;
        if (status === 'full' || status === 'partial') occupiedCount++;
      });

      setStats({
        vacantRooms: vacantCount,
        unpaidTenants: tenantsSnapshot.size, 
        totalOccupiedRooms: occupiedCount
      });

    } catch (error) {
      console.error("Error fetching dashboard data: ", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
    fetchPricing(); 
  }, [refreshDashboard, fetchPricing]);

  // ==========================================
  // 🔥 NOTICE BOARD FUNCTIONS (OWNER ISOLATED)
  // ==========================================

  const fetchNotices = useCallback(async () => {
    try {
      const ownerId = auth().currentUser?.uid;
      if (!ownerId) return;

      const snapshot = await firestore()
        .collection('notices')
        .where('ownerId', '==', ownerId)
        .get();

      let fetchedNotices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort locally by date (newest first) to avoid needing a Firebase composite index
      fetchedNotices.sort((a, b) => {
        const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
        return timeB - timeA; 
      });

      setNotices(fetchedNotices);
    } catch (error) {
      console.error("Error fetching notices: ", error);
    }
  }, []);

  const addNotice = useCallback(async (noticeData) => {
    try {
      const ownerId = auth().currentUser?.uid;
      if (!ownerId) return;

      const newNotice = {
        ...noticeData,
        ownerId,
        createdAt: firestore.FieldValue.serverTimestamp(),
        active: true,
      };

      const docRef = await firestore().collection('notices').add(newNotice);
      
      // Update local state instantly (putting the new notice at the top)
      setNotices(prev => [{ id: docRef.id, ...newNotice, createdAt: { toMillis: () => Date.now() } }, ...prev]);
    } catch (error) {
      console.error("Error adding notice: ", error);
      throw error;
    }
  }, []);

  const deleteNotice = useCallback(async (noticeId) => {
    try {
      await firestore().collection('notices').doc(noticeId).delete();
      // Instantly remove from UI
      setNotices(prev => prev.filter(notice => notice.id !== noticeId));
    } catch (error) {
      console.error("Error deleting notice: ", error);
      throw error;
    }
  }, []);

  // ==========================================
  // EXISTING FUNCTIONS
  // ==========================================

  const recordTransaction = useCallback(async (tenantId, amount, type, description) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const numAmount = Number(amount);
      
      await firestore().collection('transactions').add({
        tenantId, 
        ownerId,
        amount: numAmount, 
        type, 
        description, 
        date: firestore.FieldValue.serverTimestamp()
      });
      
      const tenantRef = firestore().collection('tenants').doc(tenantId);
      const tenantDoc = await tenantRef.get();
      if (tenantDoc.exists) {
        const currentBalance = tenantDoc.data().balance || 0;
        const newBalance = type === 'Charge' ? currentBalance + numAmount : currentBalance - numAmount;
        await tenantRef.update({ balance: newBalance });
      }
    } catch(error) { 
      console.error("Error recording transaction: ", error); 
      throw error; 
    }
  }, []);

  const fetchBlockExpenses = useCallback(async (blockName, monthYear) => {
    try {
      const ownerId = auth().currentUser?.uid;
      if (!ownerId) return [];

      const snapshot = await firestore().collection('block_expenses')
        .where('ownerId', '==', ownerId)
        .where('blockName', '==', blockName)
        .where('monthYear', '==', monthYear)
        .get();
        
      let expensesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      expensesList.sort((a, b) => {
        const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
        return timeB - timeA; 
      });

      return expensesList;
    } catch (error) {
      console.error("Error fetching expenses:", error);
      return [];
    }
  }, []);

  const addBlockExpense = useCallback(async (expenseData) => {
    try {
      const ownerId = auth().currentUser?.uid;
      await firestore().collection('block_expenses').add({
        ...expenseData,
        ownerId,
        createdAt: firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding expense:", error);
      throw error;
    }
  }, []);

  const saveBatchExpenses = useCallback(async (expensesArray) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const batch = firestore().batch();
      const collectionRef = firestore().collection('block_expenses');

      expensesArray.forEach(expense => {
        const docRef = collectionRef.doc(); 
        batch.set(docRef, {
          ...expense,
          ownerId,
          createdAt: firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit(); 
    } catch (error) {
      console.error("Error saving batch expenses:", error);
      throw error;
    }
  }, []);

  const deleteBlockExpense = useCallback(async (expenseId) => {
    try {
      await firestore().collection('block_expenses').doc(expenseId).delete();
    } catch (error) {
      console.error("Error deleting expense:", error);
      throw error;
    }
  }, []);

  const addBlock = useCallback(async (blockData) => {
    try {
      const ownerId = auth().currentUser?.uid;
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
        createdAt: firestore.FieldValue.serverTimestamp() 
      };
      
      const docRef = await firestore().collection('blocks').add(newBlock);
      setBlocks(prev => [...prev, { id: docRef.id, ...newBlock }]);

      if (pricingMatrix) {
        await firestore().collection('settings').doc(`pricing_${ownerId}`).set({
          [sanitizedName]: pricingMatrix
        }, { merge: true });
        await fetchPricing(); 
      }

    } catch (error) {
      console.error("Error adding block: ", error);
      throw error; 
    }
  }, [fetchPricing]);

  const updateBlockDetails = useCallback(async (blockId, blockName, updatedData) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const { area, genderType, acType, sharingCapacities, amenities, pricingMatrix } = updatedData;

      await firestore().collection('blocks').doc(blockId).update({
        area: area || '',
        genderType: genderType || 'Coliving',
        acType: acType || 'Both',
        sharingCapacities: sharingCapacities || [],
        amenities: amenities || [],
      });

      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, area, genderType, acType, sharingCapacities, amenities } : b));

      if (pricingMatrix) {
        await firestore().collection('settings').doc(`pricing_${ownerId}`).set({
          [blockName]: pricingMatrix
        }, { merge: true });
        await fetchPricing();
      }
    } catch (error) {
      console.error("Error updating block:", error);
      throw error;
    }
  }, [fetchPricing]);

  const deleteBlock = useCallback(async (blockId, blockName) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const tenantsSnapshot = await firestore().collection('tenants')
        .where('ownerId', '==', ownerId)
        .where('blockId', '==', blockName).get();
      
      const batch = firestore().batch();

      tenantsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          roomNumber: null,
          blockId: 'A', 
          rentStatus: 'Unassigned',
          currentRoomJoinedDate: null
        });
      });

      const roomsSnapshot = await firestore().collection('rooms')
        .where('ownerId', '==', ownerId)
        .where('blockName', '==', blockName).get();
        
      roomsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      batch.delete(firestore().collection('blocks').doc(blockId));
      
      await batch.commit();
      await refreshDashboard();
    } catch (error) {
      console.error("Error deleting block: ", error);
      throw error;
    }
  }, [refreshDashboard]);

  const addFloorToBlock = useCallback(async (blockId, blockName, currentFloorCount, numberOfRooms, isACFloor = false) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const newFloorNum = currentFloorCount + 1;
      const numRoomsToGenerate = parseInt(numberOfRooms, 10);
      
      const batch = firestore().batch();
      
      const blockRef = firestore().collection('blocks').doc(blockId);
      batch.update(blockRef, { floors: newFloorNum });

      for (let i = 1; i <= numRoomsToGenerate; i++) {
        const roomNum = (newFloorNum * 100) + i; 
        const roomRef = firestore().collection('rooms').doc(); 
        
        batch.set(roomRef, {
          blockName: blockName,
          ownerId,
          floor: newFloorNum,
          roomNumber: roomNum,
          sharing: (i % 3) + 1,
          status: 'vacant',
          hasAC: isACFloor 
        });
      }
      
      await batch.commit();
      await refreshDashboard();
      
    } catch (error) {
      console.error("Error generating floor and rooms: ", error);
      throw error;
    }
  }, [refreshDashboard]);

  const deleteFloor = useCallback(async (blockId, blockName, floorId, currentFloorCount) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const roomsSnapshot = await firestore().collection('rooms')
        .where('ownerId', '==', ownerId)
        .where('blockName', '==', blockName)
        .where('floor', '==', parseInt(floorId, 10)).get();
      
      const roomNumbers = roomsSnapshot.docs.map(doc => doc.data().roomNumber);
      const batch = firestore().batch();

      if (roomNumbers.length > 0) {
        const tenantsSnapshot = await firestore().collection('tenants')
          .where('ownerId', '==', ownerId)
          .where('blockId', '==', blockName).get();
          
        tenantsSnapshot.docs.forEach(doc => {
          if (roomNumbers.includes(doc.data().roomNumber)) {
            batch.update(doc.ref, { roomNumber: null, rentStatus: 'Unassigned', currentRoomJoinedDate: null });
          }
        });
      }

      roomsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      const blockRef = firestore().collection('blocks').doc(blockId);
      batch.update(blockRef, { floors: Math.max(0, currentFloorCount - 1) });

      await batch.commit();
      await refreshDashboard();
    } catch (error) {
      console.error("Error deleting floor: ", error);
      throw error;
    }
  }, [refreshDashboard]);

  const addSingleRoom = useCallback(async (blockName, floorId, roomNumber, sharing, hasAC = false) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const roomRef = firestore().collection('rooms').doc(); 
      await roomRef.set({
        blockName: blockName,
        ownerId,
        floor: parseInt(floorId, 10),
        roomNumber: parseInt(roomNumber, 10),
        sharing: parseInt(sharing, 10),
        status: 'vacant',
        hasAC: hasAC 
      });
      await refreshDashboard();
    } catch (error) {
      console.error("Error adding single room: ", error);
      throw error;
    }
  }, [refreshDashboard]);

  const getRoomsForFloor = useCallback(async (blockName, floorId) => {
    try {
       const ownerId = auth().currentUser?.uid;
       if (!ownerId) return [];

       const snapshot = await firestore()
         .collection('rooms')
         .where('ownerId', '==', ownerId)
         .where('blockName', '==', blockName)
         .where('floor', '==', parseInt(floorId, 10))
         .get();
       return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
       console.error("Error fetching rooms: ", error);
       return [];
    }
  }, []);

  const getTenantsForRoom = useCallback(async (blockName, roomNumber) => {
    try {
       const ownerId = auth().currentUser?.uid;
       if (!ownerId) return [];

       const snapshot = await firestore()
         .collection('tenants')
         .where('ownerId', '==', ownerId)
         .where('blockId', '==', blockName)
         .where('roomNumber', '==', parseInt(roomNumber, 10))
         .get();
       return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
       console.error("Error fetching tenants: ", error);
       return [];
    }
  }, []);

  const removeTenant = useCallback(async (tenantId, blockName, roomNumber) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const tenantDocRef = firestore().collection('tenants').doc(tenantId);
      const tenantSnap = await tenantDocRef.get();
      const tenantData = tenantSnap.data();

      let currentHistory = Array.isArray(tenantData.roomHistory) ? [...tenantData.roomHistory] : [];
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      
      let joinedDate = tenantData.currentRoomJoinedDate || tenantData.joined || 'Unknown';
      if (!tenantData.currentRoomJoinedDate && currentHistory.length > 0) {
          joinedDate = currentHistory[currentHistory.length - 1].left || tenantData.joined;
      }

      currentHistory.push({
          historyId: Date.now().toString() + Math.random().toString(36).substring(7),
          block: blockName,
          room: roomNumber.toString(),
          joined: joinedDate,
          left: today
      });

      await tenantDocRef.update({
        roomNumber: null, 
        rentStatus: 'Unassigned',
        roomHistory: currentHistory,
        currentRoomJoinedDate: null 
      });

      const parsedRoomNumber = parseInt(roomNumber, 10);
      const roomQuery = await firestore().collection('rooms')
        .where('ownerId', '==', ownerId)
        .where('blockName', '==', blockName)
        .where('roomNumber', '==', parsedRoomNumber).get();
      
      if (!roomQuery.empty) {
        const roomDoc = roomQuery.docs[0];
        const maxSharing = roomDoc.data().sharing || 1;

        const tenantsQuery = await firestore().collection('tenants')
          .where('ownerId', '==', ownerId)
          .where('blockId', '==', blockName)
          .where('roomNumber', '==', parsedRoomNumber).get();
        const currentTenantCount = tenantsQuery.size;

        let newStatus = 'vacant'; 
        if (currentTenantCount > 0 && currentTenantCount < maxSharing) newStatus = 'partial'; 
        if (currentTenantCount >= maxSharing) newStatus = 'full'; 

        await roomDoc.ref.update({ status: newStatus });
      }

      await refreshDashboard();
    } catch (error) {
      console.error("Error removing tenant: ", error);
      throw error;
    }
  }, [refreshDashboard]);

  const getAllTenants = useCallback(async () => {
    try {
      const ownerId = auth().currentUser?.uid;
      if (!ownerId) return [];

      const snapshot = await firestore().collection('tenants')
        .where('ownerId', '==', ownerId).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching all tenants:", error);
      return [];
    }
  }, []);

  const reassignTenant = useCallback(async (tenantId, oldRoomNumber, newRoomNumber, newBlockId, oldBlockId) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const parsedNewRoom = parseInt(newRoomNumber, 10);
      const tenantDocRef = firestore().collection('tenants').doc(tenantId);
      const tenantSnap = await tenantDocRef.get();
      const tenantData = tenantSnap.data();

      let currentHistory = Array.isArray(tenantData.roomHistory) ? [...tenantData.roomHistory] : [];
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      
      const safeOldBlockId = oldBlockId || tenantData.blockId || 'Unassigned';
      const hasOldRoom = oldRoomNumber !== null && oldRoomNumber !== undefined && oldRoomNumber !== '';
      
      const updates = {
        roomNumber: parsedNewRoom,
        blockId: newBlockId || 'A',
        currentRoomJoinedDate: today
      };

      if (hasOldRoom) {
        let joinedDate = tenantData.currentRoomJoinedDate || tenantData.joined || 'Unknown';
        if (!tenantData.currentRoomJoinedDate && currentHistory.length > 0) {
            joinedDate = currentHistory[currentHistory.length - 1].left || tenantData.joined;
        }

        currentHistory.push({
          historyId: Date.now().toString() + Math.random().toString(36).substring(7),
          block: safeOldBlockId,
          room: oldRoomNumber.toString(),
          joined: joinedDate,
          left: today
        });

        updates.roomHistory = currentHistory;
      }

      await tenantDocRef.update(updates);

      if (hasOldRoom) {
        const parsedOldRoom = parseInt(oldRoomNumber, 10);
        const oldRoomQuery = await firestore().collection('rooms')
          .where('ownerId', '==', ownerId)
          .where('blockName', '==', safeOldBlockId)
          .where('roomNumber', '==', parsedOldRoom).get();
          
        if (!oldRoomQuery.empty) {
          const oldRoomDoc = oldRoomQuery.docs[0];
          const maxSharing = oldRoomDoc.data().sharing || 1;
          const tenantsQuery = await firestore().collection('tenants')
            .where('ownerId', '==', ownerId)
            .where('blockId', '==', safeOldBlockId)
            .where('roomNumber', '==', parsedOldRoom).get();
          const count = tenantsQuery.size;
          
          let status = 'vacant';
          if (count > 0 && count < maxSharing) status = 'partial';
          if (count >= maxSharing) status = 'full';
          await oldRoomDoc.ref.update({ status });
        }
      }

      const newRoomQuery = await firestore().collection('rooms')
        .where('ownerId', '==', ownerId)
        .where('blockName', '==', newBlockId || 'A')
        .where('roomNumber', '==', parsedNewRoom).get();
        
      if (!newRoomQuery.empty) {
        const newRoomDoc = newRoomQuery.docs[0];
        const maxSharing = newRoomDoc.data().sharing || 1;
        const tenantsQuery = await firestore().collection('tenants')
          .where('ownerId', '==', ownerId)
          .where('blockId', '==', newBlockId || 'A')
          .where('roomNumber', '==', parsedNewRoom).get();
        const count = tenantsQuery.size;
        
        let status = 'vacant';
        if (count > 0 && count < maxSharing) status = 'partial';
        if (count >= maxSharing) status = 'full';
        await newRoomDoc.ref.update({ status });
      }

      await refreshDashboard();
    } catch (error) {
      console.error("Error reassigning tenant:", error);
      throw error;
    }
  }, [refreshDashboard]);

  const getRoomDetails = useCallback(async (blockName, roomNumber) => {
    try {
      const ownerId = auth().currentUser?.uid;
      if (!ownerId) return null;

      const snapshot = await firestore().collection('rooms')
        .where('ownerId', '==', ownerId)
        .where('blockName', '==', blockName)
        .where('roomNumber', '==', parseInt(roomNumber, 10)).get();
      if (!snapshot.empty) return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      return null;
    } catch (error) {
      console.error("Error fetching room details: ", error);
      return null;
    }
  }, []);

  const toggleRoomAC = useCallback(async (blockName, roomNumber, currentACStatus) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const snapshot = await firestore().collection('rooms')
        .where('ownerId', '==', ownerId)
        .where('blockName', '==', blockName)
        .where('roomNumber', '==', parseInt(roomNumber, 10)).get();
      if (!snapshot.empty) {
        await snapshot.docs[0].ref.update({ hasAC: !currentACStatus });
      }
    } catch (error) { 
      console.error("Error toggling AC: ", error); 
    }
  }, []);

  const addTenant = useCallback(async (tenantData) => {
    try {
      const ownerId = auth().currentUser?.uid;
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const newTenant = {
        ...tenantData,
        ownerId,
        joined: today,
        currentRoomJoinedDate: tenantData.roomNumber ? today : null,
        rentStatus: tenantData.roomNumber ? 'Pending' : 'Unassigned', 
        roomHistory: [], 
        createdAt: firestore.FieldValue.serverTimestamp()
      };
      await firestore().collection('tenants').add(newTenant);
      await refreshDashboard();
    } catch (error) { throw error; }
  }, [refreshDashboard]);

  const uploadTenantDocument = useCallback(async (tenantId, fileUri, fileName) => {
    try {
      const storageRef = storage().ref(`tenant_documents/${tenantId}/${fileName}`);
      await storageRef.putFile(fileUri);
      const downloadURL = await storageRef.getDownloadURL();
      
      await firestore().collection('tenants').doc(tenantId).update({
        idDocumentUrl: downloadURL,
        idDocumentPath: `tenant_documents/${tenantId}/${fileName}`
      });

      return downloadURL;
    } catch (error) {
      console.error("Error uploading to Firebase Storage:", error);
      throw error;
    }
  }, []);

  const deleteTenantDocument = useCallback(async (tenantId, documentPath) => {
    try {
      if (documentPath) {
        await storage().ref(documentPath).delete();
      }
      await firestore().collection('tenants').doc(tenantId).update({
        idDocumentUrl: firestore.FieldValue.delete(),
        idDocumentPath: firestore.FieldValue.delete()
      });
    } catch (error) {
      console.error("Error deleting document from Storage:", error);
      throw error;
    }
  }, []);

  // 🔥 ADDED NOTICES TO THE MEMOIZED EXPORT
  const contextValue = useMemo(() => ({
    blocks, stats, loading, refreshDashboard, addBlock, updateBlockDetails, deleteBlock, 
    addFloorToBlock, deleteFloor, addSingleRoom, getRoomsForFloor,
    getTenantsForRoom, removeTenant, getAllTenants, reassignTenant,
    getRoomDetails, toggleRoomAC, addTenant, 
    uploadTenantDocument, deleteTenantDocument,
    pricingMatrix, fetchPricing, recordTransaction,fetchBlockExpenses, addBlockExpense, deleteBlockExpense, saveBatchExpenses,
    notices, fetchNotices, addNotice, deleteNotice 
  }), [
    blocks, stats, loading, refreshDashboard, addBlock, updateBlockDetails, deleteBlock, 
    addFloorToBlock, deleteFloor, addSingleRoom, getRoomsForFloor, getTenantsForRoom, 
    removeTenant, getAllTenants, reassignTenant, getRoomDetails, toggleRoomAC, addTenant, 
    uploadTenantDocument, deleteTenantDocument, pricingMatrix, fetchPricing, recordTransaction, 
    fetchBlockExpenses, addBlockExpense, deleteBlockExpense, saveBatchExpenses,
    notices, fetchNotices, addNotice, deleteNotice 
  ]);

  return (
    <HostelContext.Provider value={contextValue}>
      {children}
    </HostelContext.Provider>
  );
};
export const useHostel = () => useContext(HostelContext);