import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import firebaseConfig from "../../frontend/firebase-applet-config.json" with { type: "json" };
import { adminDb, AssistantConfigurationError } from "../_lib/assistantAccess.js";
import { extractBearerToken } from "../_lib/auth.js";
import { deleteAccountResources } from "../_lib/accountDeletion.js";
import { handleCors, sendError, sendJson } from "../_lib/response.js";

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== "DELETE") return sendError(res, 405, "METHOD_NOT_ALLOWED", "Use DELETE.");

  const token = extractBearerToken(req);
  if (!token || token.startsWith("arshnaz_pat_")) {
    return sendError(res, 401, "UNAUTHORIZED", "Sign in with your Firebase account.");
  }

  let uid: string;
  let auth: ReturnType<typeof getAuth>;
  let db: ReturnType<typeof adminDb>;
  try {
    db = adminDb();
    const app = getApps()[0];
    auth = getAuth(app);
    const decoded = await auth.verifyIdToken(token, true);
    // Firebase treats account deletion as a sensitive operation. Require a fresh login.
    if (!decoded.auth_time || Date.now() / 1000 - decoded.auth_time > 10 * 60) {
      return sendError(res, 403, "RECENT_LOGIN_REQUIRED", "Sign in again, then retry account deletion.");
    }
    uid = decoded.uid;
  } catch (error) {
    if (error instanceof AssistantConfigurationError) {
      return sendError(res, 503, "SERVICE_NOT_CONFIGURED", error.message);
    }
    return sendError(res, 401, "UNAUTHORIZED", "Invalid or expired account session.");
  }

  const configuredApi = (process.env.ARSH_API_BASE_URL || process.env.VITE_ARSH_API_URL || "").trim().replace(/\/$/, "");
  try {
    const target = new URL(configuredApi);
    if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash) throw new Error("Invalid URL");
  } catch {
    // Diagnose a missing or unsafe companion API before deleting any resource.
    return sendError(res, 503, "SERVICE_NOT_CONFIGURED", "Configure ARSH_API_BASE_URL with the HTTPS address of the account-data service.");
  }

  let stage = "legacy-attachments";
  try {
    const app = getApps()[0];
    const bucket = getStorage(app).bucket((firebaseConfig as { storageBucket: string }).storageBucket);
    await deleteAccountResources(uid, {
      deleteLegacyAttachments: async (ownerUid) => {
        stage = "legacy-attachments";
        const response = await fetch(`${configuredApi}/api/arsh/account/data`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) throw new Error(`Legacy attachment deletion failed (${response.status}) for ${ownerUid}`);
        const result = await response.json();
        if (result?.ok !== true) throw new Error("Legacy attachment service did not confirm account-data deletion.");
      },
      deleteStoragePrefix: async (prefix) => {
        stage = "storage";
        // Prefixes always contain the authenticated UID and a trailing slash.
        // Without force, any individual object deletion error rejects immediately.
        await bucket.deleteFiles({ prefix });
        const [remaining] = await bucket.getFiles({ prefix, maxResults: 1 });
        if (remaining.length) throw new Error(`Storage deletion incomplete for ${prefix}`);
      },
      deleteUserTree: async (ownerUid) => {
        stage = "firestore";
        await db.recursiveDelete(db.doc(`users/${ownerUid}`));
      },
      deleteAssistantTokenIndexes: async (ownerUid) => {
        stage = "assistant-token-index";
        const owned = db.collection("assistant_token_index").where("userId", "==", ownerUid);
        // Small bounded batches handle accounts with more than 500 grants and
        // make a partially completed cleanup safe to retry.
        while (true) {
          const snapshot = await owned.limit(400).get();
          if (snapshot.empty) break;
          const batch = db.batch();
          for (const doc of snapshot.docs) batch.delete(doc.ref);
          await batch.commit();
        }
      },
      deleteAuthUser: async (ownerUid) => {
        stage = "auth";
        await auth.deleteUser(ownerUid);
      },
    });
    res.setHeader("Cache-Control", "no-store");
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error(`Account deletion failed at ${stage}`, error);
    return sendError(res, 500, "DELETE_INCOMPLETE", "Account deletion was incomplete. Sign in again and retry.", { stage });
  }
}
