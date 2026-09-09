import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  deleteField,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
};

export type { User };

import { LeitnerCard } from '@/types/leitner';
import { UserStudyState } from '@/types/studyTrack';

// User data state shape saved in Firestore
export interface CloudUserData {
  language?: string;
  theme?: string;
  fontSize?: string;
  displayMode?: string;
  layoutMode?: string;
  flags?: Record<string, any>;
  deleted?: string[];
  customEdits?: Record<string, any>;
  reviewedCards?: Record<string, boolean>;
  quizScores?: Record<string, { total: number; correct: number }>;
  savedNotes?: Record<string, string[]>;
  leitnerCards?: LeitnerCard[];
  studyTracker?: UserStudyState;
  updatedAt?: string;
}

// Save user state to Firestore under user document
export async function saveUserDataToFirestore(userId: string, data: CloudUserData): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'studyState');
    await setDoc(userDocRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving data to Firestore:', error);
    throw error;
  }
}

// Save Leitner cards specifically
export async function saveLeitnerCardsToFirestore(userId: string, cards: LeitnerCard[]): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'leitnerData');
    await setDoc(userDocRef, {
      cards,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving Leitner cards to Firestore:', error);
    throw error;
  }
}

// Load Leitner cards
export async function loadLeitnerCardsFromFirestore(userId: string): Promise<LeitnerCard[] | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'leitnerData');
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists() && docSnap.data()?.cards) {
      return docSnap.data().cards as LeitnerCard[];
    }
    return null;
  } catch (error) {
    console.error('Error loading Leitner cards from Firestore:', error);
    throw error;
  }
}

// Save User AI Config & API Keys to Firestore
export async function saveUserAiConfigToFirestore(userId: string, aiConfig: any): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'aiConfig');
    const {
      geminiApiKey: _geminiApiKey,
      groqApiKey: _groqApiKey,
      xaiApiKey: _xaiApiKey,
      ...safeConfig
    } = aiConfig || {};
    await setDoc(userDocRef, {
      ...safeConfig,
      // Remove credentials written by older app versions as soon as config syncs.
      geminiApiKey: deleteField(),
      groqApiKey: deleteField(),
      xaiApiKey: deleteField(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving AI config to Firestore:', error);
    throw error;
  }
}

// Load User AI Config & API Keys from Firestore
export async function loadUserAiConfigFromFirestore(userId: string): Promise<any | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'aiConfig');
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error loading AI config from Firestore:', error);
    throw error;
  }
}

// Fetch user state from Firestore
export async function loadUserDataFromFirestore(userId: string): Promise<CloudUserData | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'studyState');
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as CloudUserData;
    }
    return null;
  } catch (error) {
    console.error('Error loading data from Firestore:', error);
    throw error;
  }
}
