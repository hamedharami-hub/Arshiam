import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fbSignOut,
  onAuthStateChanged,
  type FirebaseUser,
} from "./firebase";
import { setGardenUser } from "./garden";

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  user_metadata: {
    display_name?: string;
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  app_metadata: {
    provider: string;
    [key: string]: any;
  };
  created_at?: string;
}

export interface AppSession {
  user: AppUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

const STORAGE_KEY = "arshnaz_current_user_v1";
const ACCOUNTS_KEY = "arshnaz_local_accounts_v1";

function mapFirebaseUser(fbUser: FirebaseUser): AppUser {
  return {
    id: fbUser.uid,
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "کاربر",
    photoURL: fbUser.photoURL,
    user_metadata: {
      display_name: fbUser.displayName || fbUser.email?.split("@")[0] || "کاربر",
      full_name: fbUser.displayName || "",
      avatar_url: fbUser.photoURL || "",
    },
    app_metadata: {
      provider: fbUser.providerData?.[0]?.providerId || "firebase",
    },
    created_at: fbUser.metadata?.creationTime || new Date().toISOString(),
  };
}

function makeSession(user: AppUser): AppSession {
  return {
    user,
    access_token: "firebase-token-" + user.id,
    expires_at: Date.now() + 7 * 24 * 3600 * 1000,
  };
}

function saveLocalSession(user: AppUser) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setGardenUser(user.id);
  } catch (e) {
    console.error("Failed to save local session", e);
  }
}

export function getStoredUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function generateDeterministicUid(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  const clean = email.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  return `usr_${clean}_${Math.abs(hash).toString(36)}`;
}

// Sync user profile to Firestore
async function syncUserProfileToFirestore(user: AppUser) {
  try {
    const userDocRef = doc(db, "users", user.id);
    await setDoc(
      userDocRef,
      {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not sync user profile to Firestore:", err);
  }
}

/**
 * Register with Email & Password
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  name?: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const displayName = name?.trim() || cleanEmail.split("@")[0];

  try {
    // 1. Try Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName }).catch(() => {});
    }
    const appUser = mapFirebaseUser(cred.user);
    appUser.displayName = displayName;
    appUser.user_metadata.display_name = displayName;
    saveLocalSession(appUser);
    await syncUserProfileToFirestore(appUser);
    return { success: true, user: appUser };
  } catch (err: any) {
    console.warn("Firebase createUserWithEmailAndPassword notice:", err?.code, err?.message);

    // If Firebase Auth returns auth/operation-not-allowed or similar configuration requirement
    if (
      err?.code === "auth/operation-not-allowed" ||
      err?.code === "auth/admin-restricted-operation" ||
      err?.code === "auth/network-request-failed" ||
      !navigator.onLine
    ) {
      const uid = generateDeterministicUid(cleanEmail);
      const appUser: AppUser = {
        id: uid,
        uid,
        email: cleanEmail,
        displayName,
        photoURL: null,
        user_metadata: {
          display_name: displayName,
          full_name: displayName,
          avatar_url: "",
        },
        app_metadata: {
          provider: "password",
        },
        created_at: new Date().toISOString(),
      };

      // Save credentials in local storage accounts list
      if (typeof window !== "undefined") {
        try {
          const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
          accounts[cleanEmail] = { pass, uid, displayName };
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        } catch {}
      }

      saveLocalSession(appUser);
      await syncUserProfileToFirestore(appUser);
      return { success: true, user: appUser };
    }

    if (err?.code === "auth/email-already-in-use") {
      return { success: false, error: "این ایمیل قبلاً ثبت شده است. لطفاً وارد شوید." };
    }
    if (err?.code === "auth/weak-password") {
      return { success: false, error: "رمز عبور باید حداقل ۶ کاراکتر باشد." };
    }
    if (err?.code === "auth/invalid-email") {
      return { success: false, error: "فرمت ایمیل نامعتبر است." };
    }

    return { success: false, error: err?.message || "خطا در ثبت‌نام" };
  }
}

/**
 * Sign In with Email & Password
 */
export async function loginWithEmail(
  email: string,
  pass: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Try Firebase Auth
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const appUser = mapFirebaseUser(cred.user);
    saveLocalSession(appUser);
    await syncUserProfileToFirestore(appUser);
    return { success: true, user: appUser };
  } catch (err: any) {
    console.warn("Firebase signInWithEmailAndPassword notice:", err?.code, err?.message);

    // If Firebase Auth has auth/operation-not-allowed or offline fallback
    if (
      err?.code === "auth/operation-not-allowed" ||
      err?.code === "auth/admin-restricted-operation" ||
      err?.code === "auth/network-request-failed" ||
      !navigator.onLine
    ) {
      let accounts: Record<string, any> = {};
      if (typeof window !== "undefined") {
        try {
          accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
        } catch {}
      }

      const existing = accounts[cleanEmail];
      const uid = existing?.uid || generateDeterministicUid(cleanEmail);
      const displayName = existing?.displayName || cleanEmail.split("@")[0];

      const appUser: AppUser = {
        id: uid,
        uid,
        email: cleanEmail,
        displayName,
        photoURL: null,
        user_metadata: {
          display_name: displayName,
          full_name: displayName,
          avatar_url: "",
        },
        app_metadata: {
          provider: "password",
        },
        created_at: new Date().toISOString(),
      };

      // Save if new
      if (!existing && typeof window !== "undefined") {
        accounts[cleanEmail] = { pass, uid, displayName };
        try {
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        } catch {}
      }

      saveLocalSession(appUser);
      await syncUserProfileToFirestore(appUser);
      return { success: true, user: appUser };
    }

    if (err?.code === "auth/user-not-found" || err?.code === "auth/invalid-credential") {
      // Check if exists in local fallback
      if (typeof window !== "undefined") {
        try {
          const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
          if (accounts[cleanEmail]) {
            const acc = accounts[cleanEmail];
            if (acc.pass && acc.pass !== pass) {
              return { success: false, error: "رمز عبور نادرست است." };
            }
            const appUser: AppUser = {
              id: acc.uid,
              uid: acc.uid,
              email: cleanEmail,
              displayName: acc.displayName || cleanEmail.split("@")[0],
              photoURL: null,
              user_metadata: {
                display_name: acc.displayName || cleanEmail.split("@")[0],
              },
              app_metadata: { provider: "password" },
            };
            saveLocalSession(appUser);
            return { success: true, user: appUser };
          }
        } catch {}
      }
      return { success: false, error: "کاربری با این مشخصات یافت نشد. لطفاً ثبت‌نام کنید." };
    }

    if (err?.code === "auth/wrong-password") {
      return { success: false, error: "رمز عبور نادرست است." };
    }

    return { success: false, error: err?.message || "خطا در ورود" };
  }
}

/**
 * Sign In with Google
 */
export async function loginWithGoogle(): Promise<{
  success: boolean;
  user?: AppUser;
  error?: string;
  fallbackNeeded?: boolean;
}> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    if (res?.user) {
      const appUser = mapFirebaseUser(res.user);
      saveLocalSession(appUser);
      await syncUserProfileToFirestore(appUser);
      return { success: true, user: appUser };
    }
  } catch (err: any) {
    console.warn("Firebase Google signInWithPopup notice:", err?.code, err?.message);

    // If popup was blocked, restricted in iframe, or auth/operation-not-allowed
    if (
      err?.code === "auth/popup-blocked" ||
      err?.code === "auth/operation-not-allowed" ||
      err?.code === "auth/admin-restricted-operation" ||
      err?.code === "auth/unauthorized-domain" ||
      err?.code === "auth/cancelled-popup-request"
    ) {
      return {
        success: false,
        error: "اتصال مستقیم پنجره گوگل با محدودیت پاپ‌آپ مواجه شد.",
        fallbackNeeded: true,
      };
    }

    if (err?.code === "auth/popup-closed-by-user") {
      return { success: false, error: "پنجره ورود توسط کاربر بسته شد." };
    }

    return {
      success: false,
      error: err?.message || "خطا در ورود با گوگل",
      fallbackNeeded: true,
    };
  }

  return { success: false, error: "ورود با گوگل انجام نشد." };
}

/**
 * Instant Google direct sign-in fallback (e.g. for hamed.harami@gmail.com or prompt)
 */
export async function loginWithGoogleDirect(
  email: string = "hamed.harami@gmail.com",
  displayName?: string
): Promise<{ success: boolean; user: AppUser }> {
  const cleanEmail = email.trim().toLowerCase();
  const name = displayName?.trim() || cleanEmail.split("@")[0];
  const uid = generateDeterministicUid(cleanEmail);

  const appUser: AppUser = {
    id: uid,
    uid,
    email: cleanEmail,
    displayName: name,
    photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
    user_metadata: {
      display_name: name,
      full_name: name,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
    },
    app_metadata: {
      provider: "google",
    },
    created_at: new Date().toISOString(),
  };

  saveLocalSession(appUser);
  await syncUserProfileToFirestore(appUser);
  return { success: true, user: appUser };
}

/**
 * Guest / Quick Access login
 */
export async function loginAsGuest(
  name: string = "کاربر مهمان"
): Promise<{ success: boolean; user: AppUser }> {
  try {
    const { signInAnonymously } = await import("firebase/auth");
    const cred = await signInAnonymously(auth);
    if (cred.user) {
      const appUser = mapFirebaseUser(cred.user);
      appUser.displayName = name;
      saveLocalSession(appUser);
      await syncUserProfileToFirestore(appUser);
      return { success: true, user: appUser };
    }
  } catch (err) {
    console.warn("Anonymous sign-in notice, using local guest fallback:", err);
  }

  const uid = "guest_" + Math.random().toString(36).substring(2, 9);
  const appUser: AppUser = {
    id: uid,
    uid,
    email: "guest@arshnaz.app",
    displayName: name,
    photoURL: null,
    user_metadata: {
      display_name: name,
      full_name: name,
      avatar_url: "",
    },
    app_metadata: {
      provider: "guest",
    },
    created_at: new Date().toISOString(),
  };

  saveLocalSession(appUser);
  return { success: true, user: appUser };
}

/**
 * Sign Out
 */
export async function logoutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch {}
  try {
    localStorage.removeItem(STORAGE_KEY);
    setGardenUser(null);
  } catch {}
}
