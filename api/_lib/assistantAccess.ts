import { createHash, randomBytes } from "node:crypto";
import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { extractBearerToken } from "./auth";
import { sendError } from "./response";

export const ASSISTANT_SCOPES = ["tasks:read", "tasks:create", "tasks:update", "tasks:delete"] as const;
export type AssistantScope = typeof ASSISTANT_SCOPES[number];
const databaseId = process.env.FIREBASE_DATABASE_ID || (firebaseConfig as any).firestoreDatabaseId || "(default)";

function adminApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccount) {
    const parsed = JSON.parse(serviceAccount);
    return initializeApp({ credential: cert(parsed), projectId: parsed.project_id });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault(), projectId: (firebaseConfig as any).projectId });
  }
  throw new Error("Assistant access requires FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS");
}

export function adminDb() {
  return getFirestore(adminApp(), databaseId);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateOwner(req: any, res: any): Promise<string | null> {
  const token = extractBearerToken(req);
  if (!token || token.startsWith("arshnaz_pat_")) {
    sendError(res, 401, "UNAUTHORIZED", "Sign in with your account to manage assistant access.");
    return null;
  }
  try {
    const decoded = await getAuth(adminApp()).verifyIdToken(token, true);
    return decoded.uid;
  } catch {
    sendError(res, 401, "UNAUTHORIZED", "Invalid or expired account session.");
    return null;
  }
}

export interface AssistantGrant {
  id: string;
  userId: string;
  name: string;
  scopes: AssistantScope[];
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export function grantAllows(indexUserId: string, grant: AssistantGrant | undefined, scope: AssistantScope, now = Date.now()) {
  return Boolean(grant && grant.userId === indexUserId && !grant.revokedAt &&
    Date.parse(grant.expiresAt) > now && grant.scopes.includes(scope));
}

export async function createGrant(userId: string, name: string, scopes: AssistantScope[], expiresAt: string) {
  const db = adminDb();
  const id = randomBytes(16).toString("hex");
  const secret = `arshnaz_pat_${randomBytes(32).toString("base64url")}`;
  const hash = tokenHash(secret);
  const grant: AssistantGrant = { id, userId, name, scopes, createdAt: new Date().toISOString(), expiresAt, revokedAt: null };
  const grantRef = db.doc(`users/${userId}/assistant_grants/${id}`);
  const indexRef = db.doc(`assistant_token_index/${hash}`);
  const batch = db.batch();
  batch.create(grantRef, grant);
  batch.create(indexRef, { grantId: id, userId });
  await batch.commit();
  return { grant, secret };
}

export async function listGrants(userId: string): Promise<AssistantGrant[]> {
  const snapshot = await adminDb().collection(`users/${userId}/assistant_grants`).get();
  return snapshot.docs.map((doc) => doc.data() as AssistantGrant).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeGrant(userId: string, grantId: string): Promise<boolean> {
  const ref = adminDb().doc(`users/${userId}/assistant_grants/${grantId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) return false;
  await ref.update({ revokedAt: new Date().toISOString() });
  return true;
}

export async function authenticateAssistant(req: any, res: any, scope: AssistantScope): Promise<AssistantGrant | null> {
  const token = extractBearerToken(req);
  if (!token?.startsWith("arshnaz_pat_")) {
    sendError(res, 401, "UNAUTHORIZED", "Assistant access token required.");
    return null;
  }
  const db = adminDb();
  const index = await db.doc(`assistant_token_index/${tokenHash(token)}`).get();
  if (!index.exists) {
    sendError(res, 401, "UNAUTHORIZED", "Invalid assistant token.");
    return null;
  }
  const { userId, grantId } = index.data()!;
  const grantDoc = await db.doc(`users/${userId}/assistant_grants/${grantId}`).get();
  const grant = grantDoc.data() as AssistantGrant | undefined;
  if (!grant || grant.userId !== userId || grant.revokedAt || Date.parse(grant.expiresAt) <= Date.now()) {
    sendError(res, 401, "UNAUTHORIZED", "Assistant access has expired or been revoked.");
    return null;
  }
  if (!grantAllows(userId, grant, scope)) {
    sendError(res, 403, "FORBIDDEN", `Assistant access lacks ${scope}.`);
    return null;
  }
  return grant;
}
