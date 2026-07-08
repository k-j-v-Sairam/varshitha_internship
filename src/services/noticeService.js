import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

/**
 * Owner: get all notices for their hostel.
 */
export const getNotices = async () => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) throw new Error("No authenticated user");

  const snapshot = await firestore()
    .collection('notices')
    .where('ownerId', '==', ownerId)
    .get();

  const notices = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  notices.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  return notices;
};

/**
 * Tenant/Staff: real-time listener for notices by ownerId.
 * Optionally filter by audience: 'All', 'Tenants', 'Staff'.
 * Returns unsubscribe function.
 */
export const getNoticesForUser = (ownerId, audience, callback) => {
  let query = firestore()
    .collection('notices')
    .where('ownerId', '==', ownerId);

  return query.onSnapshot(
    snapshot => {
      if (!snapshot) { callback([]); return; }
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter audience client-side (notices targeting this role or 'All')
      const filtered = all.filter(n => {
        const target = n.targetAudience || 'All';
        return target === 'All' || target === audience;
      });
      filtered.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      callback(filtered);
    },
    error => {
      console.error('getNoticesForUser error:', error);
      callback([]);
    }
  );
};

/**
 * Owner: add a new notice with audience targeting.
 * noticeData should include: title, description, priority, type, targetAudience
 */
export const addNotice = async (noticeData) => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) throw new Error("No authenticated user");

  const newNotice = {
    targetAudience: 'All',
    ...noticeData,
    ownerId,
    createdAt: firestore.FieldValue.serverTimestamp(),
    active: true,
  };

  const docRef = await firestore().collection('notices').add(newNotice);
  return { id: docRef.id, ...newNotice };
};

export const deleteNotice = async (noticeId) => {
  await firestore().collection('notices').doc(noticeId).delete();
};
