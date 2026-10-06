#!/usr/bin/env node
/** Usage: node scripts/purge-retired-modules.mjs --uid OWNER --project PROJECT [--apply]
 * Defaults to an inventory. Never enumerates accounts or deletes shared Knowledge data.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { FieldPath, FieldValue, getFirestore } from "firebase-admin/firestore";
import { RETIRED_COLLECTIONS, validOwner, mayPurgeDedicatedRow } from "./retired-module-purge-plan.mjs";

const args = process.argv.slice(2);
const value = name => args[args.indexOf(name) + 1];
if (args.some((arg, index) => !["--uid", "--project", "--apply"].includes(arg) && !["--uid", "--project"].includes(args[index - 1]))) {
  throw new Error("Unknown argument. Use --uid OWNER --project PROJECT [--apply].");
}
const uid = args.includes("--uid") ? value("--uid") : null;
const project = args.includes("--project") ? value("--project") : null;
const apply = args.includes("--apply");
if (!validOwner(uid) || !project || project.startsWith("--")) throw new Error("A verified account UID and explicit project are required.");
const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!rawCredentials) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required; do not pass secrets as command arguments.");
const serviceAccount = JSON.parse(rawCredentials);
if (serviceAccount.project_id !== project) throw new Error("The requested project does not match the configured service account.");
const db = getFirestore(initializeApp({ credential: cert(serviceAccount), projectId: project }));
const counts = { mode: apply ? "apply" : "inventory", project, uid, deleted: 0, eligible: 0, retained: 0, modulesGrantRemoved: false, collections: {} };
for (const name of RETIRED_COLLECTIONS) {
  const ref = db.collection("users").doc(uid).collection(name);
  let last = null;
  let eligible = 0, retained = 0;
  for (;;) {
    let query = ref.orderBy(FieldPath.documentId()).limit(200);
    if (last) query = query.startAfter(last);
    const page = await query.get();
    if (page.empty) break;
    last = page.docs.at(-1).id;
    const batch = db.batch(); let pending = 0;
    for (const snapshot of page.docs) {
      if (!mayPurgeDedicatedRow(uid, snapshot.ref.path, snapshot.data()) || (await snapshot.ref.listCollections()).length > 0) {
        retained++; continue;
      }
      eligible++;
      // Optimistic precondition: edits from a still-open old client cannot be silently deleted.
      if (apply) { batch.delete(snapshot.ref, { lastUpdateTime: snapshot.updateTime }); pending++; }
    }
    if (pending) { await batch.commit(); counts.deleted += pending; }
  }
  counts.collections[name] = { eligible, retained };
  counts.eligible += eligible; counts.retained += retained;
}
const stateRef = db.doc(`users/${uid}/module_access/state`);
counts.modulesGrantRemoved = await db.runTransaction(async tx => {
  const state = await tx.get(stateRef);
  if (!state.data()?.modules?.pharmacy) return false;
  if (apply) tx.update(stateRef, { "modules.pharmacy": FieldValue.delete() });
  return apply;
});
console.log(JSON.stringify(counts, null, 2));
