import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { grantAllows, type AssistantGrant } from "../_lib/assistantAccess";
import { assistantTaskCollectionPath } from "../_lib/assistantTasks";

const now = Date.parse("2026-09-24T00:00:00Z");
const grant: AssistantGrant = {
  id: "a".repeat(32), userId: "alice", name: "Job assistant",
  scopes: ["tasks:read", "tasks:create"], createdAt: "2026-09-23T00:00:00Z",
  expiresAt: "2026-10-24T00:00:00Z", revokedAt: null,
};

describe("assistant access isolation", () => {
  it("allows only listed scopes for the indexed account", () => {
    expect(grantAllows("alice", grant, "tasks:read", now)).toBe(true);
    expect(grantAllows("alice", grant, "tasks:create", now)).toBe(true);
    expect(grantAllows("alice", grant, "tasks:delete", now)).toBe(false);
    expect(grantAllows("bob", grant, "tasks:read", now)).toBe(false);
    expect(assistantTaskCollectionPath(grant)).toBe("users/alice/tasks");
    expect(assistantTaskCollectionPath({ ...grant, userId: "bob" })).toBe("users/bob/tasks");
  });

  it("rejects revoked and expired grants", () => {
    expect(grantAllows("alice", { ...grant, revokedAt: "2026-09-23T12:00:00Z" }, "tasks:read", now)).toBe(false);
    expect(grantAllows("alice", { ...grant, expiresAt: "2026-09-23T00:00:00Z" }, "tasks:read", now)).toBe(false);
  });

  it("does not let browser clients rewrite grants or assistant audit records", () => {
    const rules = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
    for (const name of ["assistant_grants", "assistant_audit", "assistant_trash"]) {
      expect(rules).toMatch(new RegExp(`match /${name}/\\{docId=\\*\\*\\} \\{\\s*allow read, write: if false;`));
    }
  });
});
