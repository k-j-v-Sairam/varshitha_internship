const { initializeApp, getApps } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = require('firebase/auth');
const { getFirestore, collection, doc, setDoc, getDocs, getDoc, query, where, updateDoc, deleteDoc, serverTimestamp, onSnapshot, addDoc } = require('firebase/firestore');

let app;
if (!getApps().length) {
  app = initializeApp({
    projectId: "hostelmanager-bdfdb",
    appId: "1:113753128245:android:d4115ae3a49bde2ca9a07c",
    databaseURL: "https://hostelmanager-bdfdb-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "hostelmanager-bdfdb.appspot.com",
    apiKey: "AIzaSyBPi3SrUDxbTJSwcwu0LpXylrMYs6PuEIE",
    authDomain: "hostelmanager-bdfdb.firebaseapp.com",
  });
} else {
  app = getApps()[0];
}

const mockAuth = () => {
  const auth = getAuth(app);
  return {
    signInWithEmailAndPassword: (email, pass) => signInWithEmailAndPassword(auth, email, pass),
    createUserWithEmailAndPassword: (email, pass) => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');
      return createUserWithEmailAndPassword(auth, email, pass);
    },
    signOut: () => signOut(auth),
    onAuthStateChanged: (cb) => onAuthStateChanged(auth, (user) => {
      cb(user);
    }),
    get currentUser() { return auth.currentUser; }
  };
};
mockAuth.GoogleAuthProvider = { credential: () => {} };

const mockFirestore = () => {
  const db = getFirestore(app);
  return {
    collection: (path) => {
      const colRef = collection(db, path);
      return {
        doc: (id) => {
          const docRef = id ? doc(colRef, id) : doc(collection(db, path));
          return {
            set: (data) => setDoc(docRef, data),
            update: (data) => updateDoc(docRef, data),
            delete: () => deleteDoc(docRef),
            get: () => getDoc(docRef).then(snap => ({ exists: snap.exists(), id: snap.id, data: () => snap.data() })),
            onSnapshot: (cb) => onSnapshot(docRef, snap => cb({ exists: snap.exists(), id: snap.id, data: () => snap.data() }))
          };
        },
        add: (data) => addDoc(colRef, data).then(docRef => ({ id: docRef.id })),
        get: () => getDocs(colRef).then(snap => ({
          docs: snap.docs.map(d => ({ id: d.id, data: () => d.data(), ref: { delete: () => deleteDoc(d.ref) } }))
        })),
        where: function(field, op, value) {
          return createQuery(query(colRef, where(field, op, value)));
        },
        onSnapshot: (cb) => onSnapshot(colRef, snap => cb({
          docs: snap.docs.map(d => ({ id: d.id, data: () => d.data(), ref: { delete: () => deleteDoc(d.ref) } }))
        }))
      };
      
      function createQuery(q) {
        return {
          where: function(field, op, value) {
            return createQuery(query(q, where(field, op, value)));
          },
          get: () => getDocs(q).then(snap => ({
            docs: snap.docs.map(d => ({ id: d.id, data: () => d.data(), ref: { delete: () => deleteDoc(d.ref) } }))
          })),
          onSnapshot: (cb) => onSnapshot(q, snap => cb({
            docs: snap.docs.map(d => ({ id: d.id, data: () => d.data(), ref: { delete: () => deleteDoc(d.ref) } }))
          }))
        };
      }
    }
  };
};
mockFirestore.FieldValue = { serverTimestamp };

const mockStorage = () => ({
  ref: () => ({
    putFile: () => Promise.resolve({ state: 'success' }),
    getDownloadURL: () => Promise.resolve('https://mocked-url.com/file.jpg'),
  }),
});

module.exports = { mockAuth, mockFirestore, mockStorage };
