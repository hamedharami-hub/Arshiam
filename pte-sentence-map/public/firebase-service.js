// Firebase Service Module for PTE Sentence Map (جمله‌یار)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

let app = null;
let auth = null;
let db = null;
let isInitialized = false;

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || false,
      isAnonymous: auth?.currentUser?.isAnonymous || false,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(database) {
  try {
    await getDocFromServer(doc(database, 'test', 'connection'));
    console.log('[Firebase] Connection to Firestore verified.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Offline or connecting to Firebase...');
    }
  }
}

export async function initFirebase({ onAuthChange, onSyncStatus }) {
  if (isInitialized) return { auth, db };

  try {
    let config = null;
    try {
      const res = await fetch('/api/firebase-config');
      if (res.ok) {
        config = await res.json();
      }
    } catch {
      // fallback to static file if api route is inaccessible
      const res2 = await fetch('/firebase-applet-config.json');
      if (res2.ok) {
        config = await res2.json();
      }
    }

    if (!config || !config.apiKey) {
      console.warn('[Firebase] Configuration not found or incomplete.');
      return null;
    }

    app = initializeApp(config);
    auth = getAuth(app);
    // CRITICAL: The app will break without specifying firestoreDatabaseId if configured
    db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
    isInitialized = true;

    // Validate connection at initial boot per specification
    testConnection(db);

    onAuthStateChanged(auth, user => {
      if (typeof onAuthChange === 'function') {
        onAuthChange(user);
      }
    });

    return { auth, db };
  } catch (err) {
    console.error('[Firebase] Init failed:', err);
    return null;
  }
}

export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase Auth not initialized');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return await signInWithPopup(auth, provider);
}

export async function signOutUser() {
  if (!auth) return;
  return await signOut(auth);
}

export function getCurrentUser() {
  return auth?.currentUser || null;
}

export async function loadStudyState(userId) {
  if (!db || !userId) return null;
  const docPath = `users/${userId}/user_data/study_state`;
  try {
    const docRef = doc(db, 'users', userId, 'user_data', 'study_state');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, docPath);
  }
}

export async function saveStudyState(userId, { starred, flagged, review }) {
  if (!db || !userId) return;
  const docPath = `users/${userId}/user_data/study_state`;
  try {
    const payload = {
      userId,
      starred: Array.isArray(starred) ? starred : Array.from(starred || []),
      flagged: Array.isArray(flagged) ? flagged : Array.from(flagged || []),
      review: review && typeof review === 'object' ? review : {},
      updatedAt: new Date().toISOString()
    };
    const docRef = doc(db, 'users', userId, 'user_data', 'study_state');
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}
