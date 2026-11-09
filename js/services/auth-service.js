import { auth, db, au, fs } from '../firebase.js';

export const onUser = cb => au.onAuthStateChanged(auth, cb);
export const signIn = (email, password) => au.signInWithEmailAndPassword(auth, email, password);
export const signUp = (email, password) => au.createUserWithEmailAndPassword(auth, email, password);
export const signInGoogle = () => au.signInWithPopup(auth, new au.GoogleAuthProvider());
export const signOut = () => au.signOut(auth);

/** Creates users/{uid} once and never overwrites it. A local flag avoids a read on every page load. */
export async function ensureProfile(user) {
  const flag = `qg.profile.${user.uid}`;
  if (localStorage.getItem(flag)) return;
  const ref = fs.doc(db, 'users', user.uid);
  if (!(await fs.getDoc(ref)).exists()) {
    await fs.setDoc(ref, { email: user.email || '', displayName: user.displayName || '', createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp() });
  }
  localStorage.setItem(flag, '1');
}

export async function loadPreference(uid, id) {
  const snap = await fs.getDoc(fs.doc(db, 'users', uid, 'preferences', id));
  return snap.exists() ? snap.data() : null;
}
export const savePreference = (uid, id, data) =>
  fs.setDoc(fs.doc(db, 'users', uid, 'preferences', id), { ...data, updatedAt: fs.serverTimestamp() }, { merge: true });
