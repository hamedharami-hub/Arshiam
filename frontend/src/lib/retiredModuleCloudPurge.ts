import { documentId, getDocsFromServer, limit, orderBy, query, writeBatch } from "firebase/firestore";
import { auth, collection, db } from "./firebase";

const RETIRED_CLOUD_COLLECTIONS = ["pharmacy_practice", "leitner_reviews"] as const;
const DELETE_PAGE_SIZE = 300;

/**
 * Delete only the retired user's own documents from the two retired collections.
 * Re-querying from the beginning after every committed page makes retries safe:
 * if a batch commit had an uncertain result, already-deleted rows simply no
 * longer appear. The user's Firestore rules also enforce owner access.
 */
export async function purgeRetiredModuleCloudData(
  uid: string,
): Promise<{ deleted: Record<(typeof RETIRED_CLOUD_COLLECTIONS)[number], number>; incomplete: boolean }> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("The signed-in account must own retired-module cleanup.");
  }

  const deleted: Record<(typeof RETIRED_CLOUD_COLLECTIONS)[number], number> = {
    pharmacy_practice: 0,
    leitner_reviews: 0,
  };
  let incomplete = false;

  for (const collectionName of RETIRED_CLOUD_COLLECTIONS) {
    try {
      while (true) {
        if (auth.currentUser?.uid !== uid) throw new Error("Account changed during cleanup.");
        const page = await getDocsFromServer(query(
          collection(db, "users", uid, collectionName),
          orderBy(documentId()),
          limit(DELETE_PAGE_SIZE),
        ));
        if (page.empty) break;
        if (auth.currentUser?.uid !== uid) throw new Error("Account changed during cleanup.");

        const batch = writeBatch(db);
        for (const row of page.docs) batch.delete(row.ref);
        await batch.commit();
        deleted[collectionName] += page.size;
      }
    } catch (error) {
      incomplete = true;
      console.warn(`[retiredModuleCloudPurge] Could not fully purge ${collectionName}; it will be retried.`, error);
    }
  }

  return { deleted, incomplete };
}
