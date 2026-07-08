// src/services/complaintService.js
// Handles all complaint CRUD operations for Tenants, Staff, and Owner.

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

/**
 * Tenant submits a new complaint.
 * tenantUid is stored for security rule matching.
 */
export const submitComplaint = async ({ tenantId, tenantName, tenantUid, ownerId, blockId, roomNumber, title, description, category }) => {
  const ref = await firestore().collection('complaints').add({
    tenantId,
    tenantName,
    tenantUid,
    ownerId,
    blockId,
    roomNumber,
    title: title.trim(),
    description: description.trim(),
    category,
    status: 'Open',
    assignedTo: null,
    assignedToName: null,
    assignedToUid: null,
    createdAt: firestore.FieldValue.serverTimestamp(),
    resolvedAt: null,
  });
  return ref.id;
};

/**
 * Get all complaints for a tenant (tenant's own view).
 */
export const getComplaintsForTenant = (tenantUid, callback) => {
  return firestore()
    .collection('complaints')
    .where('tenantUid', '==', tenantUid)
    .onSnapshot(
      snapshot => {
        if (!snapshot) { callback([]); return; }
        const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        complaints.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        callback(complaints);
      },
      error => {
        console.error("Error in getComplaintsForTenant:", error);
        callback([]);
      }
    );
};

/**
 * Get all complaints for owner (real-time).
 */
export const getComplaintsForOwner = (ownerId, callback) => {
  return firestore()
    .collection('complaints')
    .where('ownerId', '==', ownerId)
    .onSnapshot(
      snapshot => {
        if (!snapshot) { callback([]); return; }
        const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        complaints.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        callback(complaints);
      },
      error => {
        console.error("Error in getComplaintsForOwner:", error);
        callback([]);
      }
    );
};

/**
 * Get all complaints for a specific block (real-time).
 */
export const getComplaintsForBlock = (ownerId, blockId, callback) => {
  return firestore()
    .collection('complaints')
    .where('ownerId', '==', ownerId)
    .where('blockId', '==', blockId)
    .onSnapshot(
      snapshot => {
        if (!snapshot) { callback([]); return; }
        const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        complaints.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        callback(complaints);
      },
      error => {
        console.error("Error in getComplaintsForBlock:", error);
        callback([]);
      }
    );
};

/**
 * Get complaints assigned to a specific staff member (real-time).
 */
export const getComplaintsForStaff = (staffUid, callback) => {
  return firestore()
    .collection('complaints')
    .where('assignedToUid', '==', staffUid)
    .onSnapshot(
      snapshot => {
        if (!snapshot) { callback([]); return; }
        const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        complaints.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        callback(complaints);
      },
      error => {
        console.error("Error in getComplaintsForStaff:", error);
        callback([]);
      }
    );
};

/**
 * Owner assigns a complaint to a staff member.
 */
export const assignComplaint = async ({ complaintId, staffDocId, staffName, staffUid }) => {
  await firestore().collection('complaints').doc(complaintId).update({
    assignedTo: staffDocId,
    assignedToName: staffName,
    assignedToUid: staffUid,
    status: 'In Progress',
  });
};

/**
 * Staff marks a complaint as resolved.
 */
export const resolveComplaint = async (complaintId) => {
  await firestore().collection('complaints').doc(complaintId).update({
    status: 'Resolved',
    resolvedAt: firestore.FieldValue.serverTimestamp(),
  });
};

/**
 * Owner deletes a complaint.
 */
export const deleteComplaint = async (complaintId) => {
  await firestore().collection('complaints').doc(complaintId).delete();
};
