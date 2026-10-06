/** Exclusive collections only. Knowledge/library/cards and attachment objects are shared. */
export const RETIRED_COLLECTIONS = Object.freeze([
  "pharmacy_practice", "fredProgress", "fredProgressLegacy", "leitner_reviews",
]);
export function validOwner(uid) {
  return typeof uid === "string" && uid.length > 0 && uid.length <= 128 &&
    !/[\x00-\x1f/]/.test(uid) && !["guest", "anonymous-kb-user", "anonymous-review-user"].includes(uid);
}
export function mayPurgeDedicatedRow(uid, path, data) {
  if (!validOwner(uid) || !data || typeof data !== "object") return false;
  const parts = path.split("/");
  if (parts.length !== 4 || parts[0] !== "users" || parts[1] !== uid ||
      !RETIRED_COLLECTIONS.includes(parts[2]) || !parts[3]) return false;
  // Path proves ownership; contradictory historical payload owners are retained for inspection.
  return [data.user_id, data.owner_id, data.uid].every(owner => owner == null || owner === uid);
}
