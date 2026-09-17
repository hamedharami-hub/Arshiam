import firebaseConfig from "../../firebase-applet-config.json";
import { sendError } from "./response";

export interface AuthUser {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  idToken?: string;
}

const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || (firebaseConfig as any).apiKey;

/**
 * Extracts Bearer token from the incoming request's Authorization header
 */
export function extractBearerToken(req: any): string | null {
  const authHeader =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    req.headers?.["x-access-token"];

  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
    return parts[1];
  }
  // Allow raw token if passed directly
  if (parts.length === 1 && parts[0].length > 20) {
    return parts[0];
  }
  return null;
}

/**
 * Validates a Bearer token:
 * 1. Checks as Firebase ID Token (via accounts:lookup)
 * 2. Checks as Google OAuth Access Token via Firebase IdP exchange (accounts:signInWithIdp)
 * 3. Checks as Google OAuth Access Token via Google OAuth2 UserInfo
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  if (!token || typeof token !== "string") {
    return null;
  }

  // 1. Try Firebase ID Token verification
  try {
    const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;
    const lookupRes = await fetch(lookupUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });

    if (lookupRes.ok) {
      const data: any = await lookupRes.json();
      const user = data.users?.[0];
      if (user && user.localId) {
        return {
          userId: user.localId,
          email: user.email || null,
          displayName: user.displayName || user.email?.split("@")[0] || null,
          idToken: token,
        };
      }
    }
  } catch (err) {
    console.warn("[Auth] Firebase ID Token lookup error:", err);
  }

  // 2. Try Google OAuth Access Token with signInWithIdp (exchanges OAuth access token for Firebase UID)
  try {
    const idpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`;
    const idpRes = await fetch(idpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `access_token=${encodeURIComponent(token)}&providerId=google.com`,
        requestUri: "http://localhost",
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    });

    if (idpRes.ok) {
      const data: any = await idpRes.json();
      if (data.localId) {
        return {
          userId: data.localId,
          email: data.email || null,
          displayName: data.displayName || data.email?.split("@")[0] || null,
          idToken: data.idToken,
        };
      }
    }
  } catch (err) {
    console.warn("[Auth] Google signInWithIdp error:", err);
  }

  // 3. Fallback: Direct Google OAuth2 UserInfo validation (e.g. Gemini Spark access token)
  try {
    const userinfoUrl = "https://www.googleapis.com/oauth2/v3/userinfo";
    const userinfoRes = await fetch(userinfoUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (userinfoRes.ok) {
      const data: any = await userinfoRes.json();
      if (data.sub) {
        return {
          userId: data.sub,
          email: data.email || null,
          displayName: data.name || data.email?.split("@")[0] || null,
        };
      }
    }
  } catch (err) {
    console.warn("[Auth] Google OAuth2 userinfo error:", err);
  }

  return null;
}

/**
 * Authentication middleware helper for API routes.
 * Sends 401 response and returns null if unauthenticated.
 */
export async function authenticateRequest(
  req: any,
  res: any
): Promise<AuthUser | null> {
  const token = extractBearerToken(req);
  if (!token) {
    sendError(
      res,
      401,
      "UNAUTHORIZED",
      "Missing or malformed Authorization header. Expected 'Authorization: Bearer <token>'."
    );
    return null;
  }

  const user = await verifyToken(token);
  if (!user) {
    sendError(
      res,
      401,
      "UNAUTHORIZED",
      "Invalid or expired authorization token. Authentication failed."
    );
    return null;
  }

  return user;
}
