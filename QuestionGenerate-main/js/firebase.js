import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import * as au from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import * as fs from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Firebase Storage is intentionally never imported anywhere in this project.
export const isConfigured = !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_');
export let app = null, auth = null, db = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = au.getAuth(app);
  try {
    // Offline cache (IndexedDB), shared across browser tabs.
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch (e) {
    console.warn('Offline persistence unavailable, using memory cache', e);
    db = fs.getFirestore(app);
  }
}
export { au, fs };
