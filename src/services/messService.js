// src/services/messService.js
// Manages the weekly mess/cafeteria menu per block.
// Owner creates/edits, tenants read.

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MEALS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

/**
 * Get the mess menu for a specific block (real-time).
 * Works for both owner and tenant/staff — queried by ownerId + blockId.
 */
export const getMessMenu = (ownerId, blockId, callback) => {
  const menuId = `${ownerId}_${blockId}`;
  return firestore()
    .collection('mess_menus')
    .doc(menuId)
    .onSnapshot(
      doc => {
        if (doc && doc.exists) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      },
      error => {
        console.error("Error in getMessMenu:", error);
        callback(null);
      }
    );
};

/**
 * Save/update the mess menu for a block.
 * menu structure: { Monday: { Breakfast: '...', Lunch: '...', Snacks: '...', Dinner: '...' }, ... }
 */
export const saveMessMenu = async ({ blockId, blockName, menu, timings }) => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) throw new Error('Not authenticated');

  const menuId = `${ownerId}_${blockId}`;
  await firestore().collection('mess_menus').doc(menuId).set({
    ownerId,
    blockId,
    blockName,
    menu,        // { [day]: { [meal]: string } }
    timings,     // { Breakfast: '7:00-9:00 AM', ... }
    updatedAt: firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
};

/**
 * Get all mess menus for the owner (for management screen).
 */
export const getAllMessMenus = async () => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) return [];

  const snapshot = await firestore()
    .collection('mess_menus')
    .where('ownerId', '==', ownerId)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get mess menu by block name for tenant (by ownerId).
 * Tenant must know their ownerId (stored in their tenant doc).
 */
export const getMessMenuForTenant = (ownerId, blockId, callback) => {
  return getMessMenu(ownerId, blockId, callback);
};
