import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createContact,
  updateContact,
  deleteContact,
  getContacts,
  getContact,
  linkTaskContact,
  unlinkTaskContact,
  getTaskContacts,
  getContactTasks,
  findDuplicateSuggestions,
  normalizePhone,
  normalizeEmail,
} from "./contactService";
import { isDeviceContactImportSupported, requestDeviceContactPermission } from "./deviceContacts";
import { cacheGet, cacheSet, clearQueue, getPendingOps } from "./offlineQueue";
import * as offlineQueue from "./offlineQueue";
import { deleteEntityFromFirestore, saveEntityToFirestore } from "./firestoreSync";
import type { Task } from "./taskTypes";

const mocks = vi.hoisted(() => ({
  doc: vi.fn((...args: unknown[]) => args),
  writeBatch: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  writeBatch: mocks.writeBatch,
}));
vi.mock("@/lib/firebase", () => ({ db: {} }));

// Mock Firebase store and auth
vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  },
}));

vi.mock("@/lib/firestoreSync", () => ({
  saveEntityToFirestore: vi.fn().mockResolvedValue(true),
  deleteEntityFromFirestore: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: { uid: "test-user-id" } },
  db: {},
}));

describe("contactService & task_contacts relations", () => {
  const userId = "user-test-123";

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await clearQueue();
    await cacheSet(`contacts_${userId}`, []);
    await cacheSet(`task_contacts_${userId}`, []);
    mocks.writeBatch.mockReturnValue({
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await clearQueue();
  });

  it("1. creates a Contact and links it to a Task", async () => {
    const contact = await createContact(userId, {
      display_name: "Ali Rezaei",
      phones: [{ label: "موبایل", value: "09123456789" }],
      emails: [{ label: "کاری", value: "ali@example.com" }],
    });

    expect(contact.id).toBeDefined();
    expect(contact.display_name).toBe("Ali Rezaei");
    expect(contact.user_id).toBe(userId);

    const link = await linkTaskContact("task-100", contact.id, userId, "مسئول پیگیری");
    expect(link.task_id).toBe("task-100");
    expect(link.contact_id).toBe(contact.id);
    expect(link.role_or_context).toBe("مسئول پیگیری");

    const taskContacts = await getTaskContacts("task-100", userId);
    expect(taskContacts).toHaveLength(1);
    expect(taskContacts[0].contact?.display_name).toBe("Ali Rezaei");
  });

  it("2. links multiple Contacts to a single Task", async () => {
    const contact1 = await createContact(userId, { display_name: "Person One" });
    const contact2 = await createContact(userId, { display_name: "Person Two" });

    await linkTaskContact("task-200", contact1.id, userId);
    await linkTaskContact("task-200", contact2.id, userId);

    const taskContacts = await getTaskContacts("task-200", userId);
    expect(taskContacts).toHaveLength(2);
    const names = taskContacts.map((tc) => tc.contact?.display_name);
    expect(names).toContain("Person One");
    expect(names).toContain("Person Two");
  });

  it("3. links a single Contact to multiple Tasks", async () => {
    const contact = await createContact(userId, { display_name: "Busy Manager" });

    await linkTaskContact("task-A", contact.id, userId);
    await linkTaskContact("task-B", contact.id, userId);

    // Mock tasks in cache
    const mockTasks: Task[] = [
      { id: "task-A", title: "Task A", user_id: userId, created_at: "", completed: false, priority: "high", status: "todo", updated_at: "" },
      { id: "task-B", title: "Task B", user_id: userId, created_at: "", completed: false, priority: "urgent", status: "todo", updated_at: "" },
    ];
    await cacheSet(`tasks_${userId}`, mockTasks);

    const contactTasks = await getContactTasks(contact.id, userId);
    expect(contactTasks).toHaveLength(2);
    const taskIds = contactTasks.map((ct) => ct.taskContact.task_id);
    expect(taskIds).toContain("task-A");
    expect(taskIds).toContain("task-B");
  });

  it("4. prevents duplicate task_contacts relation", async () => {
    const contact = await createContact(userId, { display_name: "Unique Link Test" });

    const link1 = await linkTaskContact("task-duplicate-test", contact.id, userId, "Initial Role");
    const link2 = await linkTaskContact("task-duplicate-test", contact.id, userId, "Initial Role");

    // Must return existing relation with same ID
    expect(link1.id).toBe(link2.id);

    const all = await getTaskContacts("task-duplicate-test", userId);
    expect(all).toHaveLength(1);
  });

  it("5. deleting a Contact deletes relations in task_contacts but preserves the Task", async () => {
    const contact = await createContact(userId, { display_name: "To Delete" });
    await linkTaskContact("task-safe-preserve", contact.id, userId);

    // Ensure link exists
    let taskContacts = await getTaskContacts("task-safe-preserve", userId);
    expect(taskContacts).toHaveLength(1);

    // Delete contact
    await deleteContact(contact.id, userId);

    // Contact is removed
    const fetched = await getContact(contact.id, userId);
    expect(fetched).toBeNull();

    // Relation is removed
    taskContacts = await getTaskContacts("task-safe-preserve", userId);
    expect(taskContacts).toHaveLength(0);
  });

  it("6. deleting a relation unlinks without deleting the Contact or Task", async () => {
    const contact = await createContact(userId, { display_name: "Permanent Contact" });
    const link = await linkTaskContact("task-unlink-test", contact.id, userId);

    await unlinkTaskContact(link.id, userId);

    // Relation is gone from task
    const taskContacts = await getTaskContacts("task-unlink-test", userId);
    expect(taskContacts).toHaveLength(0);

    // Contact still exists
    const preservedContact = await getContact(contact.id, userId);
    expect(preservedContact).not.toBeNull();
    expect(preservedContact?.display_name).toBe("Permanent Contact");
  });

  it("7. handles offline creation and task linking by enqueueing operations", async () => {
    // Simulate offline
    const originalNavigator = window.navigator;
    Object.defineProperty(window, "navigator", {
      value: { ...originalNavigator, onLine: false },
      writable: true,
      configurable: true,
    });

    const contact = await createContact(userId, {
      display_name: "Offline Contact",
      phones: [{ label: "phone", value: "09990001122" }],
    });

    expect(contact.id).toBeDefined();

    await linkTaskContact("task-offline-1", contact.id, userId, "Offline lead");

    const pendingContacts = await getPendingOps("contacts");
    expect(pendingContacts.length).toBeGreaterThanOrEqual(1);
    expect(pendingContacts[0].op).toBe("insert");

    const pendingTaskContacts = await getPendingOps("task_contacts");
    expect(pendingTaskContacts.length).toBeGreaterThanOrEqual(1);
    expect(pendingTaskContacts[0].op).toBe("insert");

    // Restore online navigator
    Object.defineProperty(window, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("8. detects duplicate suggestions without auto-merging", async () => {
    await createContact(userId, {
      display_name: "Original John",
      phones: [{ label: "mob", value: "+98 912 111 2233" }],
      emails: [{ label: "work", value: "john@example.com" }],
    });

    // Test phone match
    const suggestions1 = await findDuplicateSuggestions(
      userId,
      [{ label: "mob", value: "0912-111-2233" }],
      []
    );
    expect(suggestions1.length).toBeGreaterThanOrEqual(1);
    expect(suggestions1[0].contact.display_name).toBe("Original John");
    expect(suggestions1[0].matchedOn).toBe("phone");

    // Test email match
    const suggestions2 = await findDuplicateSuggestions(
      userId,
      [],
      [{ label: "email", value: "JOHN@example.com" }]
    );
    expect(suggestions2.length).toBeGreaterThanOrEqual(1);
    expect(suggestions2[0].matchedOn).toBe("email");
  });

  it("9. checks device contact import platform gating", async () => {
    // In node/JSDOM environment, it is not native Android
    expect(isDeviceContactImportSupported()).toBe(false);

    // Permission request returns unsupported error gracefully
    const permResult = await requestDeviceContactPermission();
    expect(permResult.granted).toBe(false);
    expect(permResult.error).toContain("Android");
  });

  it("restores contact cache when a create cannot be synced or durably queued", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(offlineQueue, "enqueueOp").mockResolvedValueOnce(false);
    (saveEntityToFirestore as any).mockResolvedValueOnce(false);

    await expect(createContact(userId, { display_name: "Unsaved contact" })).rejects.toThrow(
      "sync queue storage is unavailable",
    );
    expect(await getContacts(userId)).toEqual([]);
  });

  it("restores a contact edit when neither Firestore nor the durable queue accepts it", async () => {
    const original = await createContact(userId, { display_name: "Original contact" });
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(offlineQueue, "enqueueOp").mockResolvedValueOnce(false);
    (saveEntityToFirestore as any).mockResolvedValueOnce(false);

    await expect(updateContact(original.id, userId, { display_name: "Unsaved edit" })).rejects.toThrow(
      "sync queue storage is unavailable",
    );
    expect((await getContact(original.id, userId))?.display_name).toBe("Original contact");
  });

  it("does not hide a task-contact link when it cannot be durably saved", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(offlineQueue, "enqueueOp").mockResolvedValueOnce(false);
    (saveEntityToFirestore as any).mockResolvedValueOnce(false);

    await expect(linkTaskContact("task-link-failure", "contact-link-failure", userId)).rejects.toThrow(
      "sync queue storage is unavailable",
    );
    expect(await getTaskContacts("task-link-failure", userId)).toEqual([]);
  });

  it("restores the relation when unlink cannot be synced or durably queued", async () => {
    const contact = await createContact(userId, { display_name: "Unlink rollback" });
    const relation = await linkTaskContact("task-unlink-rollback", contact.id, userId);
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(offlineQueue, "enqueueOp").mockResolvedValueOnce(false);
    (deleteEntityFromFirestore as any).mockResolvedValueOnce(false);

    await expect(unlinkTaskContact(relation.id, userId)).rejects.toThrow(
      "sync queue storage is unavailable",
    );
    expect(await getTaskContacts("task-unlink-rollback", userId)).toEqual([
      expect.objectContaining({ id: relation.id }),
    ]);
  });

  it("keeps contact and relation caches unchanged if an offline delete batch cannot be queued", async () => {
    const contact = await createContact(userId, { display_name: "Keep on queue failure" });
    const relation = await linkTaskContact("task-delete-failure", contact.id, userId);
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    vi.spyOn(offlineQueue, "enqueueOps").mockResolvedValueOnce(false);

    await expect(deleteContact(contact.id, userId)).rejects.toThrow("complete delete operation could not be stored");
    expect(await getContact(contact.id, userId)).not.toBeNull();
    expect(await getTaskContacts("task-delete-failure", userId)).toEqual([
      expect.objectContaining({ id: relation.id }),
    ]);
  });

  it("uses one atomic Firestore batch for deleting a contact and its known relations", async () => {
    const contact = await createContact(userId, { display_name: "Atomic contact" });
    const relation = await linkTaskContact("task-atomic-delete", contact.id, userId);
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mocks.writeBatch.mockReturnValue(batch);

    await deleteContact(contact.id, userId);

    expect(batch.delete).toHaveBeenCalledTimes(2);
    expect(batch.commit).toHaveBeenCalledOnce();
    expect(await getContact(contact.id, userId)).toBeNull();
    expect(await getTaskContacts("task-atomic-delete", userId)).toEqual([]);
    expect(relation.contact_id).toBe(contact.id);
  });

  it("keeps contact and relations visible if cloud delete and durable retry both fail", async () => {
    const contact = await createContact(userId, { display_name: "Keep after cloud failure" });
    const relation = await linkTaskContact("task-cloud-delete-failure", contact.id, userId);
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    mocks.writeBatch.mockReturnValue({
      delete: vi.fn(),
      commit: vi.fn().mockRejectedValue(new Error("temporary cloud failure")),
    });
    vi.spyOn(offlineQueue, "enqueueOps").mockResolvedValueOnce(false);

    await expect(deleteContact(contact.id, userId)).rejects.toThrow(
      "cloud deletion failed and the complete retry could not be stored",
    );
    expect(await getContact(contact.id, userId)).not.toBeNull();
    expect(await getTaskContacts("task-cloud-delete-failure", userId)).toEqual([
      expect.objectContaining({ id: relation.id }),
    ]);
  });

  it("queues the complete contact cascade if its atomic cloud batch fails", async () => {
    const contact = await createContact(userId, { display_name: "Retry contact" });
    const relation = await linkTaskContact("task-retry-delete", contact.id, userId);
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const batch = { delete: vi.fn(), commit: vi.fn().mockRejectedValue(new Error("temporary failure")) };
    mocks.writeBatch.mockReturnValue(batch);
    vi.spyOn(offlineQueue, "enqueueOps").mockResolvedValueOnce(true);

    await deleteContact(contact.id, userId);

    expect(offlineQueue.enqueueOps).toHaveBeenCalledWith([
      { ownerId: userId, table: "contacts", op: "delete", match: { id: contact.id } },
      { ownerId: userId, table: "task_contacts", op: "delete", match: { id: relation.id } },
    ]);
    expect(await getContact(contact.id, userId)).toBeNull();
    expect(await getTaskContacts("task-retry-delete", userId)).toEqual([]);
  });
});
