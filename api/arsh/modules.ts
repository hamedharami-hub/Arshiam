import { createHmac, randomBytes } from "node:crypto";
import { adminDb, verifyFirebaseSession } from "../_lib/assistantAccess.js";
import { extractBearerToken } from "../_lib/auth.js";

const MODULE_IDS = ["pharmacy", "study", "mind"] as const;
type ModuleId = typeof MODULE_IDS[number];
type Entry = { code_id: string; installed: boolean; unlocked_at: string; installed_at: string };
type ModuleDocument = { modules?: Partial<Record<ModuleId, Entry>> };
type CodeDocument = {
  label: string; modules: string[]; max_uses: number | null; uses: number;
  expires_at: string | null; revoked: boolean; created_at: string; created_by: string;
};

const ownerEmails = new Set(["haramipours@gmail.com", "hamed.haramipour@gmail.com"]);

function fail(res: any, status: number, detail: string) {
  return res.status(status).json({ detail });
}

export function moduleState(data: ModuleDocument | undefined, isAdmin: boolean, isOwner: boolean) {
  const modules = data?.modules || {};
  const unlocked = isOwner ? [...MODULE_IDS] : MODULE_IDS.filter((id) => Boolean(modules[id]));
  return { catalog: MODULE_IDS, unlocked, installed: isOwner ? [...MODULE_IDS] : unlocked.filter((id) => modules[id]?.installed), is_admin: isAdmin, is_owner: isOwner };
}

function publicCode(id: string, code: CodeDocument) {
  return { id, ...code };
}

function normalizedCode(code: string) {
  return code.replace(/[\s\-_]/g, "").toUpperCase();
}

function codeHash(code: string) {
  const secret = process.env.ARSH_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw new Error("ARSH_SIGNING_SECRET must be at least 32 characters");
  return createHmac("sha256", secret).update(`module-code:${normalizedCode(code)}`).digest("hex");
}

function segments(req: any): string[] {
  const raw = req.query?.path;
  return (Array.isArray(raw) ? raw.join("/") : typeof raw === "string" ? raw : "").split("/").filter(Boolean);
}

export default async function handler(req: any, res: any) {
  if ((!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) ||
      !process.env.ARSH_SIGNING_SECRET || process.env.ARSH_SIGNING_SECRET.length < 32) {
    return fail(res, 503, "Module service is not configured: Firebase Admin credentials or signing secret are missing.");
  }
  const token = extractBearerToken(req);
  if (!token) return fail(res, 401, "Sign in to your Firebase account first.");
  let claims;
  try {
    claims = await verifyFirebaseSession(token);
  } catch {
    return fail(res, 401, "Firebase session is invalid or expired.");
  }

  const uid = claims.uid;
  const email = claims.email?.trim().toLowerCase() || "";
  const extraAdmins = (process.env.ARSH_ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase());
  const isOwner = claims.email_verified === true && ownerEmails.has(email);
  const isAdmin = isOwner || (claims.email_verified === true && extraAdmins.includes(email));
  const parts = segments(req);
  // Owners' module access comes from the verified Firebase identity, not a Firestore grant.
  // Keep this path available even when the module-grant database has exhausted its read quota.
  if (isOwner && req.method === "GET" && parts.join("/") === "me") {
    return res.status(200).json(moduleState(undefined, true, true));
  }
  const db = adminDb();
  const userRef = db.doc(`users/${uid}/module_access/state`);

  try {
    if (req.method === "GET" && parts.join("/") === "me") {
      const user = await userRef.get();
      return res.status(200).json(moduleState(user.data() as ModuleDocument | undefined, isAdmin, isOwner));
    }

    if (req.method === "POST" && parts.join("/") === "redeem") {
      const raw = String(req.body?.code || "");
      if (raw.length < 4 || raw.length > 64) return fail(res, 400, "Invalid code format.");
      const codeRef = db.doc(`module_codes/${codeHash(raw)}`);
      const attemptsRef = db.doc(`users/${uid}/module_access/attempts`);
      const now = new Date();
      const outcome = await db.runTransaction(async (tx) => {
        const [codeSnap, userSnap, attemptsSnap] = await Promise.all([
          tx.get(codeRef), tx.get(userRef), tx.get(attemptsRef),
        ]);
        const recent = ((attemptsSnap.data()?.failed_at || []) as string[])
          .filter((at) => Date.parse(at) > now.getTime() - 15 * 60_000);
        if (recent.length >= 5) return { status: 429 };
        const code = codeSnap.data() as CodeDocument | undefined;
        const valid = code && !code.revoked && (!code.expires_at || Date.parse(code.expires_at) > now.getTime()) &&
          (code.max_uses === null || code.uses < code.max_uses);
        if (!valid) {
          tx.set(attemptsRef, { failed_at: [...recent, now.toISOString()] });
          return { status: 400 };
        }
        const existing = (userSnap.data() as ModuleDocument | undefined)?.modules || {};
        const targets = MODULE_IDS.filter((id) => code.modules.includes("*") || code.modules.includes(id));
        const newly = targets.filter((id) => !existing[id]);
        const next = { ...existing };
        for (const id of newly) next[id] = {
          code_id: codeRef.id, installed: true, unlocked_at: now.toISOString(), installed_at: now.toISOString(),
        };
        if (newly.length) {
          tx.set(userRef, { modules: next }, { merge: true });
          tx.update(codeRef, { uses: code.uses + 1 });
          tx.set(codeRef.collection("redeemers").doc(uid), { redeemed_at: now.toISOString() });
        }
        tx.delete(attemptsRef);
        return { status: 200, newly, next };
      });
      if (outcome.status === 429) return fail(res, 429, "Too many wrong codes. Try again in 15 minutes.");
      if (outcome.status === 400) return fail(res, 400, "Invalid code.");
      return res.status(200).json({ ...moduleState({ modules: outcome.next }, isAdmin, isOwner), newly_unlocked: outcome.newly });
    }

    if (req.method === "POST" && parts.length === 2 && ["install", "uninstall"].includes(parts[1])) {
      const id = parts[0] as ModuleId;
      if (!MODULE_IDS.includes(id)) return fail(res, 404, "Unknown module.");
      const installed = parts[1] === "install";
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const doc = snap.data() as ModuleDocument | undefined;
        if (!doc?.modules?.[id]) return null;
        const next = { ...doc.modules, [id]: { ...doc.modules[id], installed, installed_at: new Date().toISOString() } };
        tx.set(userRef, { modules: next }, { merge: true });
        return next;
      });
      if (!result) return fail(res, 403, "Module is not unlocked for this account.");
      return res.status(200).json(moduleState({ modules: result }, isAdmin, isOwner));
    }

    if (parts[0] === "admin") {
      if (!isAdmin) return fail(res, 403, "Admin only. Sign in with a verified owner email.");
      if (req.method === "GET" && parts.join("/") === "admin/codes") {
        const snapshot = await db.collection("module_codes").orderBy("created_at", "desc").limit(100).get();
        return res.status(200).json({ items: snapshot.docs.map((doc) => publicCode(doc.id, doc.data() as CodeDocument)) });
      }
      if (req.method === "POST" && parts.join("/") === "admin/codes") {
        const label = String(req.body?.label || "").trim();
        if (!label || label.length > 80) return fail(res, 400, "Enter a label of up to 80 characters.");
        const selected = Array.isArray(req.body?.modules) ? req.body.modules : ["*"];
        const modules = selected.includes("*") ? ["*"] : selected.filter((id: string) => MODULE_IDS.includes(id as ModuleId));
        if (!modules.length) return fail(res, 400, "Choose at least one module.");
        const max = req.body?.max_uses == null ? null : Number(req.body.max_uses);
        const days = req.body?.expires_in_days == null ? null : Number(req.body.expires_in_days);
        if (max !== null && (!Number.isInteger(max) || max < 1 || max > 100000)) return fail(res, 400, "Invalid use limit.");
        if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) return fail(res, 400, "Invalid expiry.");
        const raw = `ARSH-${randomBytes(6).toString("hex").toUpperCase()}`;
        const now = new Date();
        const doc: CodeDocument = {
          label, modules, max_uses: max, uses: 0,
          expires_at: days ? new Date(now.getTime() + days * 86_400_000).toISOString() : null,
          revoked: false, created_at: now.toISOString(), created_by: uid,
        };
        const ref = db.doc(`module_codes/${codeHash(raw)}`);
        await ref.create(doc);
        return res.status(200).json({ ...publicCode(ref.id, doc), code: raw });
      }
      if (req.method === "POST" && parts.length === 4 && parts[1] === "codes" && parts[3] === "revoke") {
        const id = parts[2];
        if (!/^[a-f0-9]{64}$/.test(id)) return fail(res, 404, "Code not found.");
        const ref = db.doc(`module_codes/${id}`);
        const snapshot = await ref.get();
        if (!snapshot.exists) return fail(res, 404, "Code not found.");
        await ref.update({ revoked: true, revoked_at: new Date().toISOString() });
        let withdrawn = 0;
        if (req.body?.withdraw_access === true) {
          const redeemers = await ref.collection("redeemers").get();
          for (const redeemer of redeemers.docs) {
            const accessRef = db.doc(`users/${redeemer.id}/module_access/state`);
            const doc = (await accessRef.get()).data() as ModuleDocument | undefined;
            const next = { ...(doc?.modules || {}) };
            let changed = false;
            for (const moduleId of MODULE_IDS) {
              if (next[moduleId]?.code_id === id) { delete next[moduleId]; withdrawn++; changed = true; }
            }
            if (changed) await accessRef.update({ modules: next });
          }
        }
        return res.status(200).json({ ok: true, withdrawn });
      }
    }
    return fail(res, 404, "Unknown module endpoint.");
  } catch (error) {
    console.error("[modules] request failed", error);
    return fail(res, 503, "Module service is temporarily unavailable. Check server configuration and Firestore access.");
  }
}
