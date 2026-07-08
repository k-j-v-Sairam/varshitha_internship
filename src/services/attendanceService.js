// src/services/attendanceService.js
// Handles attendance marking for the Attendance Taker role.
// Uses a dedicated `attendance_logs` collection for audit-safe, locked submissions
// while also updating the `staff.attendance` map for personal history views.

import firestore from '@react-native-firebase/firestore';

/**
 * Fetches all staff assigned to a specific block (for the attendance taker's list).
 */
export const getStaffInBlock = async (ownerId, blockId) => {
  const snapshot = await firestore()
    .collection('staff')
    .where('ownerId', '==', ownerId)
    .get();
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(staff => staff.block === blockId);
};

/**
 * Checks if attendance for a specific date+block has already been submitted.
 * Returns the existing log or null.
 */
export const checkAttendanceSubmitted = async (ownerId, blockId, date) => {
  const doc = await firestore().collection('attendance_logs').doc(`SUMMARY_${blockId}_${date}`).get();
  if (doc.exists) {
    const data = doc.data() || {};
    if (data.ownerId === ownerId) {
      return { id: doc.id, ...data };
    }
  }
  return null;
};

/**
 * Submits attendance for all staff in a block for a given date.
 * Creates individual logs per staff member AND a summary lock document.
 * Also updates each staff member's `attendance` map for personal history.
 *
 * @param {Object[]} attendanceRecords - Array of { staffId, staffName, status }
 * @param {string} date - ISO date string e.g. "2026-06-27"
 * @param {string} blockId - Block name
 * @param {string} ownerId - Owner's UID
 * @param {string} markedById - Staff UID of the attendance taker
 * @param {string} markedByName - Name of the attendance taker
 */
export const submitAttendanceBatch = async ({
  attendanceRecords,
  date,
  blockId,
  ownerId,
  markedById,
  markedByName,
}) => {
  const batch = firestore().batch();
  const logsRef = firestore().collection('attendance_logs');
  const staffRef = firestore().collection('staff');

  // 1. Write individual log per staff + update staff attendance map
  attendanceRecords.forEach(record => {
    // attendance_log doc
    const logDocRef = logsRef.doc(`${blockId}_${date}_${record.staffId}`);
    batch.set(logDocRef, {
      ownerId,
      blockId,
      staffId: record.staffId,
      staffName: record.staffName,
      date,
      status: record.status,
      markedById,
      markedByName,
      isSummary: false,
      locked: true,
      markedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Update attendance map on staff doc
    batch.update(staffRef.doc(record.staffId), {
      [`attendance.${date}`]: record.status,
    });
  });

  // 2. Write summary lock document (prevents re-submission)
  const summaryRef = logsRef.doc(`SUMMARY_${blockId}_${date}`);
  batch.set(summaryRef, {
    ownerId,
    blockId,
    date,
    isSummary: true,
    locked: true,
    markedById,
    markedByName,
    totalRecords: attendanceRecords.length,
    presentCount: attendanceRecords.filter(r => r.status === 'Present').length,
    absentCount: attendanceRecords.filter(r => r.status === 'Absent').length,
    submittedAt: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
};

/**
 * Get personal attendance history for a staff member from their staff doc's
 * `attendance` map. Returns { date: status } for the given year/month.
 */
export const getPersonalAttendanceForMonth = (staffDoc, year, month) => {
  const attendanceMap = staffDoc.attendance || {};
  const monthStr = String(month + 1).padStart(2, '0');
  const yearStr = String(year);

  const result = {};
  Object.keys(attendanceMap).forEach(dateStr => {
    if (dateStr.startsWith(`${yearStr}-${monthStr}`)) {
      result[dateStr] = attendanceMap[dateStr];
    }
  });
  return result;
};
