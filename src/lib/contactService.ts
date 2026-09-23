import { firebaseStore } from "./firebaseStore";
import { cacheGet, cacheSet, enqueueOp } from "./offlineQueue";
import { saveEntityToFirestore, deleteEntityFromFirestore } from "./firestoreSync";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type {
  Contact,
  TaskContact,
  TaskContactWithDetails,
  ContactDuplicateSuggestion,
  ContactPhone,
  ContactEmail,
} from "./contactTypes";
import type { Task } from "./taskTypes";

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

function getContactsCacheKey(userId: string) {
  return `contacts_${userId}`;
}

function getTaskContactsCacheKey(userId: string) {
  return `task_contacts_${userId}`;
}

export function isOnline(): boolean {
  if (typeof window !== "undefined" && window.navigator && typeof window.navigator.onLine === "boolean") {
    return window.navigator.onLine;
  }
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

/**
 * Normalizes phone number for fuzzy duplicate suggestion.
 * Iranian mobile/landline numbers or international numbers match on last 10 digits.
 */
export function normalizePhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Normalizes email for duplicate suggestion.
 */
export function normalizeEmail(email: string): string {
  return (email || "").toLowerCase().trim();
}

/**
 * Retrieve all contacts for the user.
 * Cache-first with background/online sync.
 */
export async function getContacts(userId: string): Promise<Contact[]> {
  if (!userId) return [];
  const cacheKey = getContactsCacheKey(userId);

  // 1. Read local cache
  const cached = (await cacheGet<Contact[]>(cacheKey)) || [];

  // 2. Fetch fresh from remote if online
  if (isOnline()) {
    try {
      const { data, error } = await firebaseStore
        .from("contacts")
        .select("*")
        .eq("user_id", userId);

      if (!error && Array.isArray(data)) {
        // Merge remote with cached: keep local items that haven't synced yet
        const map = new Map<string, Contact>();
        for (const item of data as Contact[]) {
          if (item?.id) map.set(item.id, item);
        }
        for (const item of cached) {
          if (item?.id && !map.has(item.id)) {
            map.set(item.id, item);
          }
        }
        const merged = Array.from(map.values()).sort((a, b) =>
          (a.display_name || "").localeCompare(b.display_name || "", "fa")
        );
        await cacheSet(cacheKey, merged);
        return merged;
      }
    } catch {
      // offline or network hiccup, fall back to cache
    }
  }

  return cached;
}

/**
 * Retrieve single contact.
 */
export async function getContact(contactId: string, userId: string): Promise<Contact | null> {
  if (!contactId || !userId) return null;
  const all = await getContacts(userId);
  return all.find((c) => c.id === contactId) || null;
}

/**
 * Find existing contacts that share phone or email.
 * Suggestion ONLY — never auto-merged.
 */
export async function findDuplicateSuggestions(
  userId: string,
  phones: ContactPhone[],
  emails: ContactEmail[],
  excludeContactId?: string
): Promise<ContactDuplicateSuggestion[]> {
  if (!userId) return [];
  const contacts = await getContacts(userId);
  const suggestions: ContactDuplicateSuggestion[] = [];
  const seenIds = new Set<string>();

  const normalizedInputPhones = phones
    .map((p) => normalizePhone(p.value))
    .filter((p) => p.length >= 7);

  const normalizedInputEmails = emails
    .map((e) => normalizeEmail(e.value))
    .filter((e) => e.length > 3);

  for (const contact of contacts) {
    if (excludeContactId && contact.id === excludeContactId) continue;
    if (seenIds.has(contact.id)) continue;

    // Check phones
    for (const cp of contact.phones || []) {
      const norm = normalizePhone(cp.value);
      if (norm && normalizedInputPhones.includes(norm)) {
        suggestions.push({
          contact,
          matchedOn: "phone",
          matchedValue: cp.value,
        });
        seenIds.add(contact.id);
        break;
      }
    }

    if (seenIds.has(contact.id)) continue;

    // Check emails
    for (const ce of contact.emails || []) {
      const norm = normalizeEmail(ce.value);
      if (norm && normalizedInputEmails.includes(norm)) {
        suggestions.push({
          contact,
          matchedOn: "email",
          matchedValue: ce.value,
        });
        seenIds.add(contact.id);
        break;
      }
    }
  }

  return suggestions;
}

/**
 * Creates a new Contact.
 * Validates display_name, caches optimistically, syncs or queues offline.
 */
export async function createContact(
  userId: string,
  input: Omit<Partial<Contact>, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Contact> {
  if (!userId) throw new Error("User ID is required");
  const trimmedName = (input.display_name || "").trim();
  if (!trimmedName) throw new Error("نام شخص الزامی است / Display name is required");

  const now = new Date().toISOString();
  const contact: Contact = {
    id: makeId(),
    user_id: userId,
    display_name: trimmedName,
    first_name: input.first_name?.trim() || undefined,
    last_name: input.last_name?.trim() || undefined,
    company: input.company?.trim() || undefined,
    job_title: input.job_title?.trim() || undefined,
    photo_url: input.photo_url || undefined,
    photo_path: input.photo_path || undefined,
    phones: input.phones || [],
    emails: input.emails || [],
    addresses: input.addresses || [],
    websites: input.websites || [],
    social_links: input.social_links || [],
    notes: input.notes?.trim() || undefined,
    source: input.source || "manual",
    created_at: now,
    updated_at: now,
  };

  // Optimistic cache update
  const cacheKey = getContactsCacheKey(userId);
  const current = (await cacheGet<Contact[]>(cacheKey)) || [];
  const updated = [contact, ...current.filter((c) => c.id !== contact.id)].sort((a, b) =>
    (a.display_name || "").localeCompare(b.display_name || "", "fa")
  );
  await cacheSet(cacheKey, updated);

  // Sync to Firestore or enqueue offline
  let synced = false;
  if (isOnline()) {
    try {
      synced = await saveEntityToFirestore(userId, "contacts", contact.id, contact);
    } catch {
      synced = false;
    }
  }

  if (!synced) {
    await enqueueOp({
      table: "contacts",
      op: "insert",
      payload: contact,
    });
  }

  return contact;
}

/**
 * Updates an existing contact.
 */
export async function updateContact(
  contactId: string,
  userId: string,
  patch: Partial<Omit<Contact, "id" | "user_id" | "created_at">>
): Promise<Contact> {
  if (!contactId || !userId) throw new Error("Contact ID and User ID are required");

  const current = await getContact(contactId, userId);
  if (!current) throw new Error("Contact not found");

  const now = new Date().toISOString();
  const updated: Contact = {
    ...current,
    ...patch,
    display_name: patch.display_name ? patch.display_name.trim() : current.display_name,
    updated_at: now,
  };

  // Optimistic cache update
  const cacheKey = getContactsCacheKey(userId);
  const all = (await cacheGet<Contact[]>(cacheKey)) || [];
  const nextList = all.map((c) => (c.id === contactId ? updated : c)).sort((a, b) =>
    (a.display_name || "").localeCompare(b.display_name || "", "fa")
  );
  await cacheSet(cacheKey, nextList);

  // Sync to Firestore or enqueue offline
  let synced = false;
  if (isOnline()) {
    try {
      synced = await saveEntityToFirestore(userId, "contacts", contactId, updated);
    } catch {
      synced = false;
    }
  }

  if (!synced) {
    await enqueueOp({
      table: "contacts",
      op: "update",
      payload: updated,
      match: { id: contactId },
    });
  }

  return updated;
}

/**
 * Deletes a contact and its relations in task_contacts.
 * CRITICAL: Never deletes tasks, notes, or attachments!
 */
export async function deleteContact(contactId: string, userId: string): Promise<void> {
  if (!contactId || !userId) return;

  // 1. Update contacts cache
  const contactsKey = getContactsCacheKey(userId);
  const currentContacts = (await cacheGet<Contact[]>(contactsKey)) || [];
  await cacheSet(
    contactsKey,
    currentContacts.filter((c) => c.id !== contactId)
  );

  // 2. Update task_contacts cache (remove relations for this contact)
  const taskContactsKey = getTaskContactsCacheKey(userId);
  const currentRelations = (await cacheGet<TaskContact[]>(taskContactsKey)) || [];
  const remainingRelations = currentRelations.filter((tc) => tc.contact_id !== contactId);
  const removedRelations = currentRelations.filter((tc) => tc.contact_id === contactId);
  await cacheSet(taskContactsKey, remainingRelations);

  // 3. Delete from Firestore or enqueue offline
  let contactSynced = false;
  if (isOnline()) {
    try {
      contactSynced = await deleteEntityFromFirestore(userId, "contacts", contactId);
      // Delete relation documents
      for (const rel of removedRelations) {
        await deleteEntityFromFirestore(userId, "task_contacts", rel.id);
      }
    } catch {
      contactSynced = false;
    }
  }

  if (!contactSynced) {
    await enqueueOp({
      table: "contacts",
      op: "delete",
      match: { id: contactId },
    });
    for (const rel of removedRelations) {
      await enqueueOp({
        table: "task_contacts",
        op: "delete",
        match: { id: rel.id },
      });
    }
  }
}

/**
 * Get all relations from task_contacts for user.
 */
export async function getAllTaskContacts(userId: string): Promise<TaskContact[]> {
  if (!userId) return [];
  const cacheKey = getTaskContactsCacheKey(userId);
  const cached = (await cacheGet<TaskContact[]>(cacheKey)) || [];

  if (isOnline()) {
    try {
      const { data, error } = await firebaseStore
        .from("task_contacts")
        .select("*")
        .eq("user_id", userId);

      if (!error && Array.isArray(data)) {
        const map = new Map<string, TaskContact>();
        for (const item of data as TaskContact[]) {
          if (item?.id) map.set(item.id, item);
        }
        for (const item of cached) {
          if (item?.id && !map.has(item.id)) {
            map.set(item.id, item);
          }
        }
        const merged = Array.from(map.values());
        await cacheSet(cacheKey, merged);
        return merged;
      }
    } catch {}
  }

  return cached;
}

/**
 * Get contacts linked to a specific Task.
 */
export async function getTaskContacts(taskId: string, userId: string): Promise<TaskContactWithDetails[]> {
  if (!taskId || !userId) return [];
  const [relations, contacts] = await Promise.all([
    getAllTaskContacts(userId),
    getContacts(userId),
  ]);

  const taskRelations = relations.filter((r) => r.task_id === taskId);
  const contactsMap = new Map(contacts.map((c) => [c.id, c]));

  return taskRelations.map((r) => ({
    ...r,
    contact: contactsMap.get(r.contact_id),
  }));
}

/**
 * Get tasks linked to a specific Contact.
 */
export async function getContactTasks(
  contactId: string,
  userId: string
): Promise<{ taskContact: TaskContact; task?: Task }[]> {
  if (!contactId || !userId) return [];
  const [relations, cachedTasks] = await Promise.all([
    getAllTaskContacts(userId),
    cacheGet<Task[]>(`tasks_${userId}`).then((t) => t || []),
  ]);

  const contactRelations = relations.filter((r) => r.contact_id === contactId);
  const tasksMap = new Map(cachedTasks.map((t) => [t.id, t]));

  return contactRelations.map((r) => ({
    taskContact: r,
    task: tasksMap.get(r.task_id),
  }));
}

/**
 * Links a contact to a task.
 * PREVENTS duplicate links!
 */
export async function linkTaskContact(
  taskId: string,
  contactId: string,
  userId: string,
  roleOrContext?: string
): Promise<TaskContact> {
  if (!taskId || !contactId || !userId) {
    throw new Error("taskId, contactId, and userId are required");
  }

  const existingRelations = await getAllTaskContacts(userId);
  const duplicate = existingRelations.find(
    (r) => r.task_id === taskId && r.contact_id === contactId
  );

  if (duplicate) {
    // Already linked; if role changed, update it
    if (roleOrContext !== undefined && duplicate.role_or_context !== roleOrContext) {
      const updatedRel: TaskContact = {
        ...duplicate,
        role_or_context: roleOrContext.trim() || undefined,
      };
      const cacheKey = getTaskContactsCacheKey(userId);
      const updatedList = existingRelations.map((r) => (r.id === duplicate.id ? updatedRel : r));
      await cacheSet(cacheKey, updatedList);

      let synced = false;
      if (isOnline()) {
        try {
          synced = await saveEntityToFirestore(userId, "task_contacts", updatedRel.id, updatedRel);
        } catch {
          synced = false;
        }
      }
      if (!synced) {
        await enqueueOp({
          table: "task_contacts",
          op: "update",
          payload: updatedRel,
          match: { id: updatedRel.id },
        });
      }
      return updatedRel;
    }
    return duplicate;
  }

  const newRelation: TaskContact = {
    id: makeId(),
    user_id: userId,
    task_id: taskId,
    contact_id: contactId,
    role_or_context: roleOrContext?.trim() || undefined,
    created_at: new Date().toISOString(),
  };

  // Optimistic cache update
  const cacheKey = getTaskContactsCacheKey(userId);
  const updatedList = [...existingRelations, newRelation];
  await cacheSet(cacheKey, updatedList);

  // Sync to Firestore or enqueue offline
  let synced = false;
  if (isOnline()) {
    try {
      synced = await saveEntityToFirestore(userId, "task_contacts", newRelation.id, newRelation);
    } catch {
      synced = false;
    }
  }

  if (!synced) {
    await enqueueOp({
      table: "task_contacts",
      op: "insert",
      payload: newRelation,
    });
  }

  return newRelation;
}

/**
 * Removes a task-contact relation.
 * Does NOT delete the contact or task!
 */
export async function unlinkTaskContact(taskContactId: string, userId: string): Promise<void> {
  if (!taskContactId || !userId) return;

  const cacheKey = getTaskContactsCacheKey(userId);
  const existingRelations = await getAllTaskContacts(userId);
  const updatedList = existingRelations.filter((r) => r.id !== taskContactId);
  await cacheSet(cacheKey, updatedList);

  let synced = false;
  if (isOnline()) {
    try {
      synced = await deleteEntityFromFirestore(userId, "task_contacts", taskContactId);
    } catch {
      synced = false;
    }
  }

  if (!synced) {
    await enqueueOp({
      table: "task_contacts",
      op: "delete",
      match: { id: taskContactId },
    });
  }
}

/**
 * Uploads contact photo.
 * Strictly image file only.
 * Max 2MB.
 * Fails gracefully when offline.
 */
export async function uploadContactPhoto(
  userId: string,
  contactId: string,
  file: File
): Promise<string> {
  if (!userId) throw new Error("Authentication required");

  // Validate type
  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("فقط فایل‌های تصویری مجاز هستند / Only image files are allowed");
  }

  // Validate size (2MB)
  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("حجم عکس نباید بیشتر از ۲ مگابایت باشد / Photo size must not exceed 2MB");
  }

  // Offline check
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("آپلود عکس در حالت آفلاین پشتیبانی نمی‌شود / Photo upload is not supported while offline");
  }

  const storage = getStorage();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `users/${userId}/contact_photos/${contactId || makeId()}_${Date.now()}.${extension}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}
