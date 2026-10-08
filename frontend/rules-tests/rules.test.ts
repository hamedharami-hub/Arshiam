import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const firestoreConfig = JSON.parse(readFileSync(resolve(repositoryRoot, "firebase.json"), "utf8"));
const rules = readFileSync(resolve(repositoryRoot, firestoreConfig.firestore.rules), "utf8");

describe("Firestore rule assumptions", () => {
  it("deploys the reviewed rules file", () => {
    expect(firestoreConfig.firestore.rules).toBe("firestore.rules");
  });

  it("keeps server-managed assistant records explicitly client-inaccessible", () => {
    for (const collection of ["assistant_grants", "assistant_audit", "assistant_idempotency", "assistant_trash"]) {
      expect(rules).toMatch(new RegExp(
        `match \/${collection}\/\\{docId=\\*\\*\\}\\s*\\{\\s*allow read, write: if false;`,
      ));
    }
  });

  it("excludes server-managed assistant records from the broad owner write grant", () => {
    const wildcard = rules.match(/match \/\{subcollection\}\/\{docId=\*\*\} \{([\s\S]*?)\n {6}\}/)?.[1] || "";
    for (const collection of ["assistant_grants", "assistant_audit", "assistant_idempotency", "assistant_trash"]) {
      expect(wildcard).toContain(`'${collection}'`);
    }
  });
});
