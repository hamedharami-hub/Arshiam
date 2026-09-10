import {
  auth,
  db,
  doc,
  setDoc,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fbSignOut,
  onAuthStateChanged,
  type FirebaseUser,
} from "./firebase";
import { setGardenUser } from "./garden";
import { signInGoogleCredential, googleSignInError } from "./googleSignIn";
import { clearAndroidWidget } from "./androidWidget";

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
  /** Firebase owns the real token; never persist or fabricate one in app storage. */
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

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

function saveLocalSession(user: AppUser) {
  if (typeof window === "undefined") return;
  try {
    setGardenUser(user.id);
  } catch (e) {
    console.error("Failed to update local user context", e);
  }
}

export function getStoredUser(): AppUser | null {
  // Authentication state must come from Firebase Auth, not from mutable browser storage.
  return null;
}

/** Remove credentials written by versions that used the insecure local fallback. */
export function clearLegacyAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("arshnaz_local_accounts_v1");
    localStorage.removeItem("arshnaz_current_user_v1");
  } catch {
    // Storage can be unavailable in private browsing or restricted webviews.
  }
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

    if (err?.code === "auth/wrong-password") {
      return { success: false, error: "رمز عبور نادرست است." };
    }

    if (err?.code === "auth/user-not-found" || err?.code === "auth/invalid-credential") {
      return { success: false, error: "کاربری با این مشخصات یافت نشد. لطفاً ثبت‌نام کنید." };
    }

    if (!navigator.onLine || err?.code === "auth/network-request-failed") {
      return { success: false, error: "برای ورود با ایمیل اتصال اینترنت لازم است." };
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
    const res = await signInGoogleCredential();
    if (res?.user) {
      const appUser = mapFirebaseUser(res.user);
      saveLocalSession(appUser);
      await syncUserProfileToFirestore(appUser);
      return { success: true, user: appUser };
    }
  } catch (err: any) {
    return { success: false, error: googleSignInError(err?.code || ""), fallbackNeeded: false };

  }

  return { success: false, error: "ورود با گوگل انجام نشد." };
}

/**
 * Guest / Quick Access login
 */
export async function loginAsGuest(
  name: string = "کاربر مهمان"
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
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
  } catch (err: any) {
    console.warn("Anonymous sign-in failed; refusing unauthenticated local guest fallback:", err?.code);
    return {
      success: false,
      error: "ورود مهمان در Firebase فعال نیست یا اتصال برقرار نشد.",
    };
  }

  return { success: false, error: "ورود مهمان انجام نشد." };
}

/**
 * Sign Out
 */
export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
  await clearAndroidWidget();
  try {
    localStorage.removeItem("arshnaz_current_user_v1");
    setGardenUser(null);
  } catch {}
}
