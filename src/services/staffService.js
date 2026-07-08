// src/services/staffService.js
// Staff-specific Firestore operations.

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const DEFAULT_ROLES = ['Warden', 'Security', 'Cook', 'Cleaning', 'Care Taker'];

/**
 * Staff: fetch their own staff document using their Firebase Auth UID.
 * Staff doc ID = Firebase Auth UID (set in AddStaff.js line 170).
 * Returns a real-time listener (unsubscribe function).
 */
export const getMyStaffProfile = (uid, callback) => {
  return firestore()
    .collection('staff')
    .doc(uid)
    .onSnapshot(
      doc => {
        if (doc && doc.exists) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      },
      error => {
        console.error('getMyStaffProfile error:', error);
        callback(null);
      }
    );
};

/**
 * Owner: update a staff member's salary status.
 * Also logs a salary transaction for history.
 */
export const updateSalaryStatus = async ({ staffDocId, staffName, ownerId, salary, salaryMonth, newStatus }) => {
  const batch = firestore().batch();

  // Update staff doc with salary status
  batch.update(firestore().collection('staff').doc(staffDocId), {
    salaryStatus: newStatus,
    status: newStatus === 'Cleared' ? 'Paid' : 'Pending',
    salaryMonth,
  });

  // Log a salary transaction
  const txRef = firestore().collection('transactions').doc(`salary_${staffDocId}_${salaryMonth}`);
  if (newStatus === 'Cleared') {
    batch.set(txRef, {
      type: 'SalaryPayment',
      staffId: staffDocId,
      staffName,
      ownerId,
      amount: salary,
      salaryMonth,
      description: `Salary cleared for ${salaryMonth}`,
      date: firestore.FieldValue.serverTimestamp(),
    });
  } else {
    batch.delete(txRef);
  }

  await batch.commit();
};

/**
 * Get salary transaction history for a staff member (owner view).
 */
export const getStaffSalaryHistory = async (staffDocId) => {
  try {
    const snapshot = await firestore()
      .collection('transactions')
      .where('type', '==', 'SalaryPayment')
      .where('staffId', '==', staffDocId)
      .orderBy('date', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('getStaffSalaryHistory error:', err);
    return [];
  }
};

/**
 * Fetches persisted custom role list for this owner.
 * Falls back to DEFAULT_ROLES if none saved yet.
 */
export const getCustomRoles = async () => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) return DEFAULT_ROLES;

  try {
    const doc = await firestore()
      .collection('settings')
      .doc(`staff_roles_${ownerId}`)
      .get();

    if (doc.exists && Array.isArray(doc.data()?.roles) && doc.data().roles.length > 0) {
      return doc.data().roles;
    }
  } catch (err) {
    console.error('getCustomRoles error:', err);
  }
  return DEFAULT_ROLES;
};

/**
 * Persists the owner's custom role list to Firestore.
 * @param {string[]} roles - Array of role name strings
 */
export const saveCustomRoles = async (roles) => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) return;

  await firestore()
    .collection('settings')
    .doc(`staff_roles_${ownerId}`)
    .set({ roles }, { merge: true });
};
