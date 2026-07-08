// src/services/supplyAlertService.js
// Quick one-tap supply alert system for staff to notify the owner.

import firestore from '@react-native-firebase/firestore';

/**
 * Send a supply alert to the owner.
 * @param {Object} params
 * @param {string} params.item - Name of the supply item
 * @param {string} params.itemIcon - Icon name for the item
 * @param {string} params.staffUid - Firebase Auth UID of the staff
 * @param {string} params.staffName - Name of the staff
 * @param {string} params.blockId - Block assigned to staff
 * @param {string} params.ownerId - Owner's UID
 * @param {number} params.quantity - Quantity of the supply item
 * @param {string} params.description - Optional details provided by staff
 */
export const sendSupplyAlert = async ({ item, itemIcon, staffUid, staffName, blockId, ownerId, quantity = 1, description = '' }) => {
  await firestore().collection('supply_alerts').add({
    item,
    itemIcon,
    staffUid,
    staffName,
    blockId,
    ownerId,
    quantity,
    description,
    status: 'Pending',
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
};

/**
 * Get all pending supply alerts for the owner (real-time listener).
 */
export const getSupplyAlertsForOwner = (ownerId, callback) => {
  return firestore()
    .collection('supply_alerts')
    .where('ownerId', '==', ownerId)
    .onSnapshot(
      snapshot => {
        if (!snapshot) { callback([]); return; }
        const alerts = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (b.createdAt?.toMillis() || Date.now()) - (a.createdAt?.toMillis() || Date.now()));
        callback(alerts);
      },
      error => {
        console.error("Error in getSupplyAlertsForOwner:", error);
        callback([]);
      }
    );
};

/**
 * Get recent supply alerts sent by a specific staff member.
 */
export const getMySupplyAlerts = (staffUid, callback) => {
  return firestore()
    .collection('supply_alerts')
    .where('staffUid', '==', staffUid)
    .onSnapshot(
      snapshot => {
        if (!snapshot) { callback([]); return; }
        const alerts = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (b.createdAt?.toMillis() || Date.now()) - (a.createdAt?.toMillis() || Date.now()))
          .slice(0, 10);
        callback(alerts);
      },
      error => {
        console.error("Error in getMySupplyAlerts:", error);
        callback([]);
      }
    );
};

/**
 * Owner acknowledges a supply alert.
 */
export const acknowledgeAlert = async (alertId) => {
  await firestore().collection('supply_alerts').doc(alertId).update({
    status: 'Acknowledged',
    acknowledgedAt: firestore.FieldValue.serverTimestamp(),
  });
};

/**
 * Owner resolves a supply alert.
 */
export const resolveSupplyAlert = async (alertId) => {
  await firestore().collection('supply_alerts').doc(alertId).update({
    status: 'Resolved',
    resolvedAt: firestore.FieldValue.serverTimestamp(),
  });
};

/**
 * Staff deletes their own supply alert.
 */
export const deleteSupplyAlert = async (alertId) => {
  await firestore().collection('supply_alerts').doc(alertId).delete();
};
