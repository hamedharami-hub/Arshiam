import { createHash, randomBytes } from "node:crypto";
import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../../firebase-applet-config.json" with { type: "json" };
import { extractBearerToken, verifyFirebaseIdToken } from "./auth.js";
import { sendError } from "./response.js";

export const ASSISTANT_SCOPES = [
  "tasks:read",
  "tasks:write",
  "folders:read",
  "folders:write",
  "memories:read",
  "memories:write",
  "calendar:read",
  "calendar:write",
  // Legacy / granular scopes:
  "tasks:create",
  "tasks:update",
  "tasks:delete",
] as const;

export type AssistantScope = (typeof ASSISTANT_SCOPES)[number];
const databaseId = process.env.FIREBASE_DATABASE_ID || (firebaseConfig as any).firestoreDatabaseId || "(default)";

/** In-memory test store used for fast, isolated unit and integration testing */
export const testStore = {
  enabled: false,
  grants: new Map<string, AssistantGrant>(),
  tokenIndex: new Map<string, { grantId: string; userId: string }>(),
  tasks: new Map<string, any>(),
  folders: new Map<string, any>(),
  notes: new Map<string, any>(),
  audit: [] as any[],
  reset() {
    this.grants.clear();
    this.tokenIndex.clear();
    this.tasks.clear();
    this.folders.clear();
    this.notes.clear();
    this.audit = [];
  },
};

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

/** Verify a Firebase session before granting any server-side module permissions. */
export async function verifyFirebaseSession(token: string) {
  const user = await verifyFirebaseIdToken(token);
  if (!user) throw new Error("Invalid Firebase ID token");
  return user;
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateOwner(req: any, res: any): Promise<string | null> {
  const token = extractBearerToken(req);
  if (!token || token.startsWith("arshnaz_pat_")) {
    sendError(res, 401, "UNAUTHORIZED", "Sign in with your account to manage assistant access.");
    return null;
  }
  try {
    const decoded = await verifyFirebaseSession(token);
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
  lastUsedAt?: string | null;
  revokedAt: string | null;
}

export function grantAllows(
  indexUserId: string,
  grant: AssistantGrant | undefined,
  scope: AssistantScope,
  now = Date.now()
) {
  if (!grant || grant.userId !== indexUserId || grant.revokedAt) return false;
  if (Date.parse(grant.expiresAt) <= now) return false;

  if (grant.scopes.includes(scope)) return true;

  // Compound scope hierarchy:
  // tasks:write implies tasks:read, tasks:create, tasks:update, tasks:delete
  if (grant.scopes.includes("tasks:write")) {
    if (
      scope === "tasks:read" ||
      scope === "tasks:create" ||
      scope === "tasks:update" ||
      scope === "tasks:delete"
    ) {
      return true;
    }
  }

  // folders:write implies folders:read
  if (grant.scopes.includes("folders:write") && scope === "folders:read") {
    return true;
  }

  // memories:write implies memories:read
  if (grant.scopes.includes("memories:write") && scope === "memories:read") {
    return true;
  }

  // calendar:write implies calendar:read
  if (grant.scopes.includes("calendar:write") && scope === "calendar:read") {
    return true;
  }

  return false;
}

export async function createGrant(userId: string, name: string, scopes: AssistantScope[], expiresAt: string) {
  const id = randomBytes(16).toString("hex");
  const secret = `arshnaz_pat_${randomBytes(32).toString("base64url")}`;
  const hash = tokenHash(secret);
  const grant: AssistantGrant = {
    id,
    userId,
    name,
    scopes,
    createdAt: new Date().toISOString(),
    expiresAt,
    lastUsedAt: null,
    revokedAt: null,
  };

  if (testStore.enabled) {
    testStore.grants.set(id, grant);
    testStore.tokenIndex.set(hash, { grantId: id, userId });
    return { grant, secret };
  }

  const db = adminDb();
  const grantRef = db.doc(`users/${userId}/assistant_grants/${id}`);
  const indexRef = db.doc(`assistant_token_index/${hash}`);
  const batch = db.batch();
  batch.create(grantRef, grant);
  batch.create(indexRef, { grantId: id, userId });
  await batch.commit();
  return { grant, secret };
}

export async function listGrants(userId: string): Promise<AssistantGrant[]> {
  if (testStore.enabled) {
    return Array.from(testStore.grants.values())
      .filter((g) => g.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const snapshot = await adminDb().collection(`users/${userId}/assistant_grants`).get();
  return snapshot.docs
    .map((doc) => doc.data() as AssistantGrant)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeGrant(userId: string, grantId: string): Promise<boolean> {
  const now = new Date().toISOString();
  if (testStore.enabled) {
    const grant = testStore.grants.get(grantId);
    if (!grant || grant.userId !== userId) return false;
    grant.revokedAt = now;
    return true;
  }

  const ref = adminDb().doc(`users/${userId}/assistant_grants/${grantId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) return false;
  await ref.update({ revokedAt: now });
  return true;
}

export async function recordGrantUsage(grant: AssistantGrant): Promise<void> {
  const now = new Date().toISOString();
  grant.lastUsedAt = now;

  if (testStore.enabled) {
    const stored = testStore.grants.get(grant.id);
    if (stored) stored.lastUsedAt = now;
    return;
  }

  try {
    const ref = adminDb().doc(`users/${grant.userId}/assistant_grants/${grant.id}`);
    await ref.update({ lastUsedAt: now });
  } catch (err) {
    // Non-blocking usage record update
    console.warn("[Assistant] Failed to update lastUsedAt", err);
  }
}

export async function authenticateAssistant(
  req: any,
  res: any,
  scope: AssistantScope
): Promise<AssistantGrant | null> {
  const token = extractBearerToken(req);
  if (!token?.startsWith("arshnaz_pat_")) {
    sendError(res, 401, "UNAUTHORIZED", "Assistant access token required.");
    return null;
  }

  const hash = tokenHash(token);

  if (testStore.enabled) {
    const indexed = testStore.tokenIndex.get(hash);
    if (!indexed) {
      sendError(res, 401, "UNAUTHORIZED", "Invalid assistant token.");
      return null;
    }
    const grant = testStore.grants.get(indexed.grantId);
    if (!grant || grant.userId !== indexed.userId || grant.revokedAt || Date.parse(grant.expiresAt) <= Date.now()) {
      sendError(res, 401, "UNAUTHORIZED", "Assistant access has expired or been revoked.");
      return null;
    }
    if (!grantAllows(indexed.userId, grant, scope)) {
      sendError(res, 403, "FORBIDDEN", `Assistant access lacks ${scope}.`);
      return null;
    }
    void recordGrantUsage(grant);
    return grant;
  }

  const db = adminDb();
  const index = await db.doc(`assistant_token_index/${hash}`).get();
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

  void recordGrantUsage(grant);
  return grant;
}
