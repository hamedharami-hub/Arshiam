import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  getDocsFromServer,
  setDoc,
  writeBatch,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  clearIndexedDbPersistence,
  terminate,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
  connectAuthEmulator,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App safely (singleton)
// Dev-only: local emulators for QA so testing never spends the real project's daily quota.
const useEmulator = import.meta.env.DEV && typeof localStorage !== "undefined" && localStorage.getItem("arsh_use_emulator") === "1";
const app = !getApps().length ? initializeApp(useEmulator ? { ...firebaseConfig, projectId: "demo-arshnaz" } : firebaseConfig) : getApp();
let persistentCacheEnabled = false;

// Persistent multi-tab cache: listeners resume from IndexedDB and only one tab owns the network stream.
function createDb(): Firestore {
  const dbId = (firebaseConfig as any).firestoreDatabaseId as string | undefined;
  if (import.meta.env.MODE !== "test" && typeof indexedDB !== "undefined") {
    try {
      const settings = { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) };
      const firestore = dbId ? initializeFirestore(app, settings, dbId) : initializeFirestore(app, settings);
      persistentCacheEnabled = true;
      return firestore;
    } catch (error) {
      console.warn("[firebase] persistent cache unavailable, using memory cache", error);
    }
  }
  return dbId ? getFirestore(app, dbId) : getFirestore(app);
}
export const db: Firestore = createDb();

/** Terminate this Firestore instance and remove its persistent IndexedDB cache. */
export async function clearFirestorePersistence(firestore: Firestore): Promise<boolean> {
  try {
    await terminate(firestore);
    await clearIndexedDbPersistence(firestore);
    return true;
  } catch (error) {
    // Firestore can reject this while another tab still owns the persistence
    // lease. Callers must report incomplete device cleanup in that case.
    console.warn("[firebase] Could not clear persistent Firestore cache:", error);
    return false;
  }
}

/** Clear persisted local Firestore data when this app enabled IndexedDB caching. */
export async function clearPersistentFirestoreCache(): Promise<boolean> {
  if (!persistentCacheEnabled) return true;
  const cleared = await clearFirestorePersistence(db);
  if (cleared) persistentCacheEnabled = false;
  return cleared;
}

export const auth: Auth = getAuth(app);

if (useEmulator) {
  connectFirestoreEmulator(db, "localhost", 8085);
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
}
export const googleProvider = new GoogleAuthProvider();

export {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  getDocsFromServer,
  setDoc,
  writeBatch,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fbSignOut,
  onAuthStateChanged,
};

export type { FirebaseUser };

/**
 * Helper to get user-scoped collection ref: /users/{uid}/{subcollection}
 */
export function getUserCollection(userId: string, subcollection: string) {
  return collection(db, "users", userId, subcollection);
}

/**
 * Diagnostic test function: writes and reads back a test document to verify Firestore
 */
export async function testFirebaseConnection(): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  docData?: any;
}> {
  const start = performance.now();
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        message: "برای بررسی اتصال ابتدا باید وارد حساب کاربری شوید.",
      };
    }

    const testDocRef = doc(db, "users", currentUser.uid, "_health", "connection-test");
    const payload = {
      ping: "pong",
      app: "ARSHNAZ",
      userId: currentUser.uid,
      timestamp: new Date().toISOString(),
      verifiedAt: Date.now(),
    };

    // Write document
    await setDoc(testDocRef, payload);

    // Read back document
    const snap = await getDoc(testDocRef);
    const end = performance.now();
    const latencyMs = Math.round(end - start);

    if (snap.exists() && snap.data()?.ping === "pong") {
      return {
        success: true,
        message: `پایگاه داده Firebase Firestore فعال است و خواندن/نوشتن در ${latencyMs} میلی‌ثانیه با موفقیت انجام شد.`,
        latencyMs,
        docData: snap.data(),
      };
    } else {
      return {
        success: false,
        message: "سند ذخیره شد اما داده خوانده شده با داده ارسالی مطابقت ندارد.",
        latencyMs,
      };
    }
  } catch (error: any) {
    console.error("Firebase connection test error:", error);
    return {
      success: false,
      message: error?.message || "خطا در ارتباط با فایربیس",
    };
  }
}
