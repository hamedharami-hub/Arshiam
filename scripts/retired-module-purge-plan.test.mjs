import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mayPurgeDedicatedRow, validOwner } from "./retired-module-purge-plan.mjs";
test("verified path can purge dedicated records, including old records without a payload owner", () => {
  assert.equal(mayPurgeDedicatedRow("u", "users/u/pharmacy_practice/a", { user_id: "u" }), true);
  assert.equal(mayPurgeDedicatedRow("u", "users/u/fredProgress/a", {}), true);
});
test("cross-account, contradictory-owner, and shared content cannot be purged", () => {
  for (const path of ["users/v/pharmacy_practice/a", "users/u/knowledge_documents/a", "users/u/leitner_cards/a", "users/u/attachments/a", "users/u/notes/a", "users/u/pharmacy_practice/a/child/b"]) {
    assert.equal(mayPurgeDedicatedRow("u", path, { user_id: "u" }), false);
  }
  assert.equal(mayPurgeDedicatedRow("u", "users/u/fredProgress/a", { owner_id: "v" }), false);
  for (const uid of ["", "guest", "u/x", "u\n"]) assert.equal(validOwner(uid), false);
});
