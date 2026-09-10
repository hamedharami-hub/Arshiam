import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  auth,
  onAuthStateChanged,
  type FirebaseUser,
} from "@/lib/firebase";
import {
  AppUser,
  AppSession,
  clearLegacyAuthStorage,
  logoutUser,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  loginAsGuest,
} from "@/lib/authService";
import { setGardenUser } from "@/lib/garden";
import { startWidgetSessionSync } from "@/lib/androidWidget";

interface AuthContextType {
  user: AppUser | null;
  session: AppSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setUser: (user: AppUser | null) => void;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; user?: AppUser; error?: string }>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ success: boolean; user?: AppUser; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; user?: AppUser; error?: string; fallbackNeeded?: boolean }>;
  signInAsGuest: (name?: string) => Promise<{ success: boolean; user?: AppUser; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  setUser: () => {},
  signInWithEmail: async () => ({ success: false, error: "Not initialized" }),
  signUpWithEmail: async () => ({ success: false, error: "Not initialized" }),
  signInWithGoogle: async () => ({ success: false, error: "Not initialized" }),
  signInAsGuest: async () => ({ success: false, error: "Not initialized" }),
});

function createSessionForUser(appUser: AppUser): AppSession {
  return { user: appUser };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => startWidgetSessionSync(), []);
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearLegacyAuthStorage();
    setGardenUser(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const appUser: AppUser = {
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
        setUser(appUser);
        setSession(createSessionForUser(appUser));
      } else {
        // Never trust a user object from localStorage as authentication.
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    });

    // Safety timeout in case onAuthStateChanged takes long
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSignOut = async () => {
    await logoutUser();
    setUser(null);
    setSession(null);
  };

  const handleSignInEmail = async (email: string, pass: string) => {
    const res = await loginWithEmail(email, pass);
    if (res.success && res.user) {
      setUser(res.user);
      setSession(createSessionForUser(res.user));
    }
    return res;
  };

  const handleSignUpEmail = async (email: string, pass: string, name?: string) => {
    const res = await registerWithEmail(email, pass, name);
    if (res.success && res.user) {
      setUser(res.user);
      setSession(createSessionForUser(res.user));
    }
    return res;
  };

  const handleSignInGoogle = async () => {
    const res = await loginWithGoogle();
    if (res.success && res.user) {
      setUser(res.user);
      setSession(createSessionForUser(res.user));
    }
    return res;
  };

  const handleSignInAsGuest = async (name?: string) => {
    const res = await loginAsGuest(name);
    if (res.success && res.user) {
      setUser(res.user);
      setSession(createSessionForUser(res.user));
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signOut: handleSignOut,
        setUser,
        signInWithEmail: handleSignInEmail,
        signUpWithEmail: handleSignUpEmail,
        signInWithGoogle: handleSignInGoogle,
        signInAsGuest: handleSignInAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
