import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export const getRoomsForFloor = async (blockName, floorId) => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) throw new Error("No authenticated user");

  const snapshot = await firestore()
    .collection('rooms')
    .where('ownerId', '==', ownerId)
    .where('blockName', '==', blockName)
    .where('floor', '==', parseInt(floorId, 10))
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getRoomDetails = async (blockName, roomNumber) => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) return null;

  const snapshot = await firestore().collection('rooms')
    .where('ownerId', '==', ownerId)
    .where('blockName', '==', blockName)
    .where('roomNumber', '==', parseInt(roomNumber, 10)).get();
  if (!snapshot.empty) return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  return null;
};

export const addSingleRoom = async ({ blockName, floorId, roomNumber, sharing, hasAC = false }) => {
  const ownerId = auth().currentUser?.uid;
  const roomRef = firestore().collection('rooms').doc(); 
  await roomRef.set({
    blockName,
    ownerId,
    floor: parseInt(floorId, 10),
    roomNumber: parseInt(roomNumber, 10),
    sharing: parseInt(sharing, 10),
    status: 'vacant',
    hasAC 
  });
};

export const toggleRoomAC = async ({ blockName, roomNumber, currentACStatus }) => {
  const ownerId = auth().currentUser?.uid;
  const snapshot = await firestore().collection('rooms')
    .where('ownerId', '==', ownerId)
    .where('blockName', '==', blockName)
    .where('roomNumber', '==', parseInt(roomNumber, 10)).get();
  if (!snapshot.empty) {
    await snapshot.docs[0].ref.update({ hasAC: !currentACStatus });
  }
};
