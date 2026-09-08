import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
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
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App safely (singleton)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// If firestoreDatabaseId is defined, use it; otherwise fallback to default db
export const db: Firestore = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
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
