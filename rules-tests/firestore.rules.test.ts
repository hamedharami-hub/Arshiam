import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  writeBatch,
} from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Fail fast if emulator is not running
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST not set. Emulator must be running before tests."
    );
  }

  // Read the actual firestore.rules file
  const rulesPath = resolve(__dirname, "../firestore.rules");
  const rules = readFileSync(rulesPath, "utf8");

  testEnv = await initializeTestEnvironment({
    projectId: "demo-arshnaz-rules",
    firestore: {
      rules,
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

afterEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

describe("Firestore Rules - Sensitive Collections Security", () => {
  const OWNER_UID = "owner-user-123";
  const OTHER_UID = "other-user-456";

  describe("user_roles subcollection", () => {
    it("should allow owner to GET user_roles", async () => {
      // Setup: Admin creates a role document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        });
      });

      // Test: Owner can read
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertSucceeds(
        getDoc(doc(ownerDb, `users/${OWNER_UID}/user_roles/role1`))
      );
    });

    it("should allow owner to LIST user_roles collection", async () => {
      // Setup: Admin creates role documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        });
        await setDoc(doc(db, `users/${OWNER_UID}/user_roles/role2`), {
          role: "user",
        });
      });

      // Test: Owner CAN list (read permission includes list)
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertSucceeds(
        getDocs(collection(ownerDb, `users/${OWNER_UID}/user_roles`))
      );
    });

    it("should DENY owner CREATE in user_roles", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        setDoc(doc(ownerDb, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        })
      );
    });

    it("should DENY owner UPDATE in user_roles", async () => {
      // Setup: Admin creates a role document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/user_roles/role1`), {
          role: "user",
        });
      });

      // Test: Owner cannot update
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        updateDoc(doc(ownerDb, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        })
      );
    });

    it("should DENY owner DELETE in user_roles", async () => {
      // Setup: Admin creates a role document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        });
      });

      // Test: Owner cannot delete
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        deleteDoc(doc(ownerDb, `users/${OWNER_UID}/user_roles/role1`))
      );
    });

    it("should DENY other user GET user_roles", async () => {
      // Setup: Admin creates a role document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        });
      });

      // Test: Other user cannot read
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        getDoc(doc(otherDb, `users/${OWNER_UID}/user_roles/role1`))
      );
    });

    it("should DENY other user LIST user_roles", async () => {
      // Setup: Admin creates role documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        });
      });

      // Test: Other user cannot list
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        getDocs(collection(otherDb, `users/${OWNER_UID}/user_roles`))
      );
    });

    it("should DENY other user CREATE in user_roles", async () => {
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        setDoc(doc(otherDb, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        })
      );
    });

    it("should DENY anonymous GET user_roles", async () => {
      // Setup: Admin creates a role document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        });
      });

      // Test: Anonymous cannot read
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        getDoc(doc(anonDb, `users/${OWNER_UID}/user_roles/role1`))
      );
    });

    it("should DENY anonymous LIST user_roles", async () => {
      // Setup: Admin creates role documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        });
      });

      // Test: Anonymous cannot list
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        getDocs(collection(anonDb, `users/${OWNER_UID}/user_roles`))
      );
    });

    it("should DENY anonymous CREATE in user_roles", async () => {
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        setDoc(doc(anonDb, `users/${OWNER_UID}/user_roles/role1`), {
          role: "admin",
        })
      );
    });
  });

  describe("assistant_grants subcollection", () => {
    it("should DENY owner GET assistant_grants", async () => {
      // Setup: Admin creates a grant document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        });
      });

      // Test: Owner cannot read
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        getDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_grants/grant1`))
      );
    });

    it("should DENY owner LIST assistant_grants", async () => {
      // Setup: Admin creates grant documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        });
      });

      // Test: Owner cannot list
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        getDocs(collection(ownerDb, `users/${OWNER_UID}/assistant_grants`))
      );
    });

    it("should DENY owner CREATE assistant_grants", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        setDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        })
      );
    });

    it("should DENY owner UPDATE assistant_grants", async () => {
      // Setup: Admin creates a grant document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: false,
        });
      });

      // Test: Owner cannot update
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        updateDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        })
      );
    });

    it("should DENY owner DELETE assistant_grants", async () => {
      // Setup: Admin creates a grant document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        });
      });

      // Test: Owner cannot delete
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        deleteDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_grants/grant1`))
      );
    });

    it("should DENY other user GET assistant_grants", async () => {
      // Setup: Admin creates a grant document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        });
      });

      // Test: Other user cannot read
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        getDoc(doc(otherDb, `users/${OWNER_UID}/assistant_grants/grant1`))
      );
    });

    it("should DENY other user LIST assistant_grants", async () => {
      // Setup: Admin creates grant documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        });
      });

      // Test: Other user cannot list
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        getDocs(collection(otherDb, `users/${OWNER_UID}/assistant_grants`))
      );
    });

    it("should DENY other user CREATE assistant_grants", async () => {
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        setDoc(doc(otherDb, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        })
      );
    });

    it("should DENY anonymous GET assistant_grants", async () => {
      // Setup: Admin creates a grant document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        });
      });

      // Test: Anonymous cannot read
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        getDoc(doc(anonDb, `users/${OWNER_UID}/assistant_grants/grant1`))
      );
    });

    it("should DENY anonymous LIST assistant_grants", async () => {
      // Setup: Admin creates grant documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        });
      });

      // Test: Anonymous cannot list
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        getDocs(collection(anonDb, `users/${OWNER_UID}/assistant_grants`))
      );
    });

    it("should DENY anonymous CREATE assistant_grants", async () => {
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        setDoc(doc(anonDb, `users/${OWNER_UID}/assistant_grants/grant1`), {
          granted: true,
        })
      );
    });
  });

  describe("assistant_audit subcollection", () => {
    it("should DENY owner GET assistant_audit", async () => {
      // Setup: Admin creates an audit document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        });
      });

      // Test: Owner cannot read
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        getDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_audit/audit1`))
      );
    });

    it("should DENY owner LIST assistant_audit", async () => {
      // Setup: Admin creates audit documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        });
      });

      // Test: Owner cannot list
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        getDocs(collection(ownerDb, `users/${OWNER_UID}/assistant_audit`))
      );
    });

    it("should DENY owner CREATE assistant_audit", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        setDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        })
      );
    });

    it("should DENY owner UPDATE assistant_audit", async () => {
      // Setup: Admin creates an audit document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        });
      });

      // Test: Owner cannot update
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        updateDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "updated",
        })
      );
    });

    it("should DENY owner DELETE assistant_audit", async () => {
      // Setup: Admin creates an audit document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        });
      });

      // Test: Owner cannot delete
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        deleteDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_audit/audit1`))
      );
    });

    it("should DENY other user GET assistant_audit", async () => {
      // Setup: Admin creates an audit document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        });
      });

      // Test: Other user cannot read
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        getDoc(doc(otherDb, `users/${OWNER_UID}/assistant_audit/audit1`))
      );
    });

    it("should DENY other user LIST assistant_audit", async () => {
      // Setup: Admin creates audit documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        });
      });

      // Test: Other user cannot list
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        getDocs(collection(otherDb, `users/${OWNER_UID}/assistant_audit`))
      );
    });

    it("should DENY other user CREATE assistant_audit", async () => {
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        setDoc(doc(otherDb, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        })
      );
    });

    it("should DENY anonymous GET assistant_audit", async () => {
      // Setup: Admin creates an audit document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        });
      });

      // Test: Anonymous cannot read
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        getDoc(doc(anonDb, `users/${OWNER_UID}/assistant_audit/audit1`))
      );
    });

    it("should DENY anonymous LIST assistant_audit", async () => {
      // Setup: Admin creates audit documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        });
      });

      // Test: Anonymous cannot list
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        getDocs(collection(anonDb, `users/${OWNER_UID}/assistant_audit`))
      );
    });

    it("should DENY anonymous CREATE assistant_audit", async () => {
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        setDoc(doc(anonDb, `users/${OWNER_UID}/assistant_audit/audit1`), {
          action: "test",
        })
      );
    });
  });

  describe("assistant_trash subcollection", () => {
    it("should DENY owner GET assistant_trash", async () => {
      // Setup: Admin creates a trash document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        });
      });

      // Test: Owner cannot read
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        getDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_trash/trash1`))
      );
    });

    it("should DENY owner LIST assistant_trash", async () => {
      // Setup: Admin creates trash documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        });
      });

      // Test: Owner cannot list
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        getDocs(collection(ownerDb, `users/${OWNER_UID}/assistant_trash`))
      );
    });

    it("should DENY owner CREATE assistant_trash", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        setDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        })
      );
    });

    it("should DENY owner UPDATE assistant_trash", async () => {
      // Setup: Admin creates a trash document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: false,
        });
      });

      // Test: Owner cannot update
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        updateDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        })
      );
    });

    it("should DENY owner DELETE assistant_trash", async () => {
      // Setup: Admin creates a trash document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        });
      });

      // Test: Owner cannot delete
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        deleteDoc(doc(ownerDb, `users/${OWNER_UID}/assistant_trash/trash1`))
      );
    });

    it("should DENY other user GET assistant_trash", async () => {
      // Setup: Admin creates a trash document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        });
      });

      // Test: Other user cannot read
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        getDoc(doc(otherDb, `users/${OWNER_UID}/assistant_trash/trash1`))
      );
    });

    it("should DENY other user LIST assistant_trash", async () => {
      // Setup: Admin creates trash documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        });
      });

      // Test: Other user cannot list
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        getDocs(collection(otherDb, `users/${OWNER_UID}/assistant_trash`))
      );
    });

    it("should DENY other user CREATE assistant_trash", async () => {
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        setDoc(doc(otherDb, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        })
      );
    });

    it("should DENY anonymous GET assistant_trash", async () => {
      // Setup: Admin creates a trash document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        });
      });

      // Test: Anonymous cannot read
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        getDoc(doc(anonDb, `users/${OWNER_UID}/assistant_trash/trash1`))
      );
    });

    it("should DENY anonymous LIST assistant_trash", async () => {
      // Setup: Admin creates trash documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        });
      });

      // Test: Anonymous cannot list
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        getDocs(collection(anonDb, `users/${OWNER_UID}/assistant_trash`))
      );
    });

    it("should DENY anonymous CREATE assistant_trash", async () => {
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        setDoc(doc(anonDb, `users/${OWNER_UID}/assistant_trash/trash1`), {
          deleted: true,
        })
      );
    });
  });

  describe("Recursive path protection", () => {
    it("should allow owner to read deeply nested paths under user_roles", async () => {
      // Setup: Admin creates a nested document under user_roles
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, `users/${OWNER_UID}/user_roles/role1/nested/doc1`),
          { data: "test" }
        );
      });

      // Test: Owner CAN read nested paths under user_roles (read permission extends)
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertSucceeds(
        getDoc(doc(ownerDb, `users/${OWNER_UID}/user_roles/role1/nested/doc1`))
      );
    });

    it("should DENY owner write to nested paths under user_roles", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        setDoc(
          doc(ownerDb, `users/${OWNER_UID}/user_roles/role1/nested/doc1`),
          { data: "test" }
        )
      );
    });

    it("should DENY owner access to nested paths under assistant_grants", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        setDoc(
          doc(ownerDb, `users/${OWNER_UID}/assistant_grants/grant1/nested/doc1`),
          { data: "test" }
        )
      );
    });

    it("should DENY owner access to deeply nested paths under assistant_audit", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        setDoc(
          doc(
            ownerDb,
            `users/${OWNER_UID}/assistant_audit/audit1/nested/doc1`
          ),
          { data: "test" }
        )
      );
    });
  });

  describe("Ordinary user subcollections (should work)", () => {
    it("should allow owner CRUD on tasks subcollection", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();

      // Create
      await assertSucceeds(
        setDoc(doc(ownerDb, `users/${OWNER_UID}/tasks/task1`), {
          title: "Test Task",
        })
      );

      // Read
      await assertSucceeds(
        getDoc(doc(ownerDb, `users/${OWNER_UID}/tasks/task1`))
      );

      // Update
      await assertSucceeds(
        updateDoc(doc(ownerDb, `users/${OWNER_UID}/tasks/task1`), {
          title: "Updated Task",
        })
      );

      // Delete
      await assertSucceeds(
        deleteDoc(doc(ownerDb, `users/${OWNER_UID}/tasks/task1`))
      );
    });

    it("should allow owner to list tasks subcollection", async () => {
      // Setup: Create some tasks
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/tasks/task1`), {
          title: "Task 1",
        });
        await setDoc(doc(db, `users/${OWNER_UID}/tasks/task2`), {
          title: "Task 2",
        });
      });

      // Test: Owner can list
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertSucceeds(
        getDocs(collection(ownerDb, `users/${OWNER_UID}/tasks`))
      );
    });

    it("should allow owner CRUD on profile subcollection", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();

      // Create
      await assertSucceeds(
        setDoc(doc(ownerDb, `users/${OWNER_UID}/profile/settings`), {
          theme: "dark",
        })
      );

      // Read
      await assertSucceeds(
        getDoc(doc(ownerDb, `users/${OWNER_UID}/profile/settings`))
      );

      // Update
      await assertSucceeds(
        updateDoc(doc(ownerDb, `users/${OWNER_UID}/profile/settings`), {
          theme: "light",
        })
      );

      // Delete
      await assertSucceeds(
        deleteDoc(doc(ownerDb, `users/${OWNER_UID}/profile/settings`))
      );
    });

    it("should allow owner CRUD on folders subcollection", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();

      // Create
      await assertSucceeds(
        setDoc(doc(ownerDb, `users/${OWNER_UID}/folders/folder1`), {
          name: "Work",
        })
      );

      // Read
      await assertSucceeds(
        getDoc(doc(ownerDb, `users/${OWNER_UID}/folders/folder1`))
      );

      // Update
      await assertSucceeds(
        updateDoc(doc(ownerDb, `users/${OWNER_UID}/folders/folder1`), {
          name: "Personal",
        })
      );

      // Delete
      await assertSucceeds(
        deleteDoc(doc(ownerDb, `users/${OWNER_UID}/folders/folder1`))
      );
    });

    it("should DENY other user access to owner tasks", async () => {
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        setDoc(doc(otherDb, `users/${OWNER_UID}/tasks/task1`), {
          title: "Malicious Task",
        })
      );
    });

    it("should DENY other user access to owner profile", async () => {
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        setDoc(doc(otherDb, `users/${OWNER_UID}/profile/settings`), {
          theme: "dark",
        })
      );
    });

    it("should DENY other user access to owner folders", async () => {
      const otherContext = testEnv.authenticatedContext(OTHER_UID);
      const otherDb = otherContext.firestore();
      await assertFails(
        setDoc(doc(otherDb, `users/${OWNER_UID}/folders/folder1`), {
          name: "Malicious",
        })
      );
    });

    it("should DENY anonymous access to owner tasks", async () => {
      const anonContext = testEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();
      await assertFails(
        setDoc(doc(anonDb, `users/${OWNER_UID}/tasks/task1`), {
          title: "Anonymous Task",
        })
      );
    });
  });

  describe("Top-level collections", () => {
    it("should DENY access to unknown top-level collections", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        setDoc(doc(ownerDb, `unknown_collection/doc1`), { data: "test" })
      );
    });

    it("should DENY access to server-only collections", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();
      await assertFails(
        setDoc(doc(ownerDb, `server_data/doc1`), { data: "test" })
      );
    });
  });

  describe("Mixed batch operations", () => {
    it("should fail batch with task update + user_role set, verify no changes", async () => {
      const ownerContext = testEnv.authenticatedContext(OWNER_UID);
      const ownerDb = ownerContext.firestore();

      // Setup: Create a task with disabledRules
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `users/${OWNER_UID}/tasks/task1`), {
          title: "Original Task Title",
        });
      });

      // Attempt batch write: update task + set user_role
      const batch = writeBatch(ownerDb);
      batch.update(doc(ownerDb, `users/${OWNER_UID}/tasks/task1`), {
        title: "Updated Task Title",
      });
      batch.set(doc(ownerDb, `users/${OWNER_UID}/user_roles/role1`), {
        role: "admin",
      });

      // Batch should fail due to user_role write denial
      await assertFails(batch.commit());

      // Verify via disabledRules that original task title remains and no role exists
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        
        // Task should still have original title (batch failed, no partial commits)
        const taskDoc = await getDoc(doc(db, `users/${OWNER_UID}/tasks/task1`));
        expect(taskDoc.exists()).toBe(true);
        expect(taskDoc.data()?.title).toBe("Original Task Title");

        // Role should not exist
        const roleDoc = await getDoc(doc(db, `users/${OWNER_UID}/user_roles/role1`));
        expect(roleDoc.exists()).toBe(false);
      });
    });
  });
});
