import { Capacitor, registerPlugin } from "@capacitor/core";
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import config from "../../firebase-applet-config.json";

const nativeGoogle = registerPlugin<{ signIn(options: { clientId: string }): Promise<{ idToken: string }> }>("ArshnazGoogleAuth");

export async function signInGoogleCredential() {
  if (Capacitor.getPlatform() !== "android") return signInWithPopup(auth, googleProvider);
  const { idToken } = await nativeGoogle.signIn({ clientId: config.oAuthClientId });
  if (!idToken) throw Object.assign(new Error("Missing Google credential"), { code: "GOOGLE_CREDENTIAL" });
  return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
}

export function googleSignInError(code: string): string {
  const messages: Record<string, string> = {
    GOOGLE_CONFIG: "ورود گوگل در اندروید آماده نیست. حساب Google و Google Play Services گوشی و تنظیمات شناسه برنامه و امضای APK در Google/Firebase باید بررسی شوند.",
    GOOGLE_CANCELLED: "ورود گوگل کامل نشد (GOOGLE_CANCELLED). اگر خودتان پنجره را نبستید و پس از انتخاب حساب برگشتید، ثبت شناسه و امضای این نسخهٔ اندروید در Google/Firebase باید بررسی شود.",
    GOOGLE_BUSY: "ورود گوگل در حال انجام است.",
    GOOGLE_CREDENTIAL: "اطلاعات ورود گوگل معتبر دریافت نشد. دوباره تلاش کنید.",
    "auth/unauthorized-domain": "دامنه برنامه در تنظیمات ورود Firebase مجاز نیست.",
    "auth/operation-not-allowed": "ورود با گوگل در Firebase فعال نیست.",
    "auth/admin-restricted-operation": "ورود توسط تنظیمات مدیر محدود شده است.",
    "auth/popup-blocked": "مرورگر پنجره ورود را مسدود کرده است.",
    "auth/popup-closed-by-user": "پنجره ورود بسته شد.",
    "auth/network-request-failed": "ارتباط با سرویس ورود برقرار نشد. اینترنت را بررسی کنید.",
    "auth/account-exists-with-different-credential": "این ایمیل با روش ورود دیگری ثبت شده است. با همان روش وارد شوید.",
  };
  return messages[code] || `ورود گوگل انجام نشد (${code || "UNKNOWN"}).`;
}
