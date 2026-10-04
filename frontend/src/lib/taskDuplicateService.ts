import { firebaseStore } from "./firebaseStore";
import { upsertTask } from "./firestoreDataService";
import { getCachedTasks } from "@/features/tasks/taskService";
import { buildTaskChildrenMap } from "@/features/tasks/taskTree";
import { getTaskNotes, createTaskNote } from "./taskNotesService";
import { listAttachments, listQueued, enqueueAttachment } from "./attachmentUpload";
import { persistTaskTagChange } from "./taskTagService";
import { getTaskKnowledgeLinks, linkTaskKnowledge } from "./taskKnowledgeService";
import { logTaskActivity } from "./taskActivity";
import type { Task } from "./taskTypes";

const generateUUID = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export type DuplicateTaskResult = {
  success: boolean;
  newTaskId?: string;
  error?: unknown;
};

/**
 * Deep-duplicates a task and all its associated items:
 * 1. Clones the task itself with a new ID, status reset to "todo", and completed reset to false.
 * 2. Recursively clones all subtasks (preserving the entire subtask tree hierarchy).
 * 3. Copies all task notes for the task and its subtasks.
 * 4. Copies all file attachments (legacy, remote, and queued) for the task and its subtasks.
 * 5. Copies all tags associated with the task and its subtasks.
 * 6. Copies all knowledge document links for the task and its subtasks.
 * 7. Dispatches events to update UI and logs activity.
 */
export async function duplicateTaskCascade(
  userId: string,
  task: Task,
  options?: {
    newTitle?: string;
    knownTasks?: Task[];
  }
): Promise<DuplicateTaskResult> {
  if (!userId || !task || !task.id) {
    return { success: false, error: new Error("Invalid user or task") };
  }

  try {
    const newTaskId = generateUUID();
    const idMap = new Map<string, string>();
    idMap.set(task.id, newTaskId);

    const now = new Date().toISOString();
    const { id: _id, created_at: _ca, updated_at: _ua, completed_at: _cta, ...rest } = task;
    const newRootTask: Task = {
      ...rest,
      id: newTaskId,
      user_id: userId,
      title: options?.newTitle ?? `${task.title} (کپی)`,
      completed: false,
      status: "todo",
      created_at: now,
      updated_at: now,
    };

    // 1. Save the new root task
    await upsertTask(userId, newRootTask);

    // 2. Discover subtasks tree
    let allTasks = options?.knownTasks || (await getCachedTasks(userId));
    if (!allTasks || allTasks.length === 0) {
      try {
        const { data } = await firebaseStore.from("tasks").select("*").eq("user_id", userId);
        allTasks = (data as Task[]) || [];
      } catch {
        allTasks = [];
      }
    }

    // Supplementary check: load direct subtasks if not yet present in allTasks
    try {
      const { data: directSubs } = await firebaseStore
        .from("tasks")
        .select("*")
        .eq("parent_id", task.id);
      if (directSubs && directSubs.length > 0) {
        const existingIds = new Set((allTasks || []).map((t) => t.id));
        for (const sub of directSubs as Task[]) {
          if (!existingIds.has(sub.id)) {
            allTasks.push(sub);
          }
        }
      }
    } catch {
      // Ignore if offline
    }

    const childrenMap = buildTaskChildrenMap(allTasks || []);

    // Recursively duplicate subtasks
    async function cloneSubtasksRecursively(originalParentId: string, newParentId: string) {
      const children = childrenMap[originalParentId] || [];
      for (const child of children) {
        const newChildId = generateUUID();
        idMap.set(child.id, newChildId);

        const {
          id: _cid,
          created_at: _cca,
          updated_at: _cua,
          completed_at: _ccta,
          ...crest
        } = child;

        const newChild: Task = {
          ...crest,
          id: newChildId,
          user_id: userId,
          parent_id: newParentId,
          title: child.title,
          completed: false,
          status: "todo",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await upsertTask(userId, newChild);
        await cloneSubtasksRecursively(child.id, newChildId);
      }
    }

    await cloneSubtasksRecursively(task.id, newTaskId);

    // 3. Duplicate Notes, Attachments, Tags, and Knowledge Links for every task in the tree
    for (const [oldId, newMappedId] of idMap.entries()) {
      // 3a. Task Notes
      try {
        const [cachedNotes, remoteNotesRes] = await Promise.all([
          getTaskNotes(oldId, userId).catch(() => []),
          Promise.resolve(
            firebaseStore.from("notes").select("*").eq("user_id", userId).eq("task_id", oldId)
          ).catch(() => ({ data: [] })),
        ]);
        const combinedNotesMap = new Map<string, any>();
        for (const n of cachedNotes) {
          if (n && n.id) combinedNotesMap.set(n.id, n);
        }
        if (Array.isArray(remoteNotesRes.data)) {
          for (const n of remoteNotesRes.data) {
            if (n && n.id && !combinedNotesMap.has(n.id)) {
              combinedNotesMap.set(n.id, n);
            }
          }
        }
        for (const note of combinedNotesMap.values()) {
          if (note.title || note.content) {
            await createTaskNote(userId, newMappedId, {
              title: note.title,
              content: note.content,
            }).catch((err) => console.warn("[TaskDuplicate] Failed to copy note:", err));
          }
        }
      } catch (noteErr) {
        console.warn("[TaskDuplicate] Note copy error for task:", oldId, noteErr);
      }

      // 3b. File Attachments
      try {
        const { data: legacyAttachments } = await firebaseStore
          .from("task_attachments")
          .select("*")
          .eq("task_id", oldId);

        const existingLegacy = Array.isArray(legacyAttachments) ? legacyAttachments : [];
        for (const att of existingLegacy) {
          const newAtt = {
            id: generateUUID(),
            user_id: userId,
            task_id: newMappedId,
            url: att.url,
            storage_path: att.storage_path || "",
            file_name: att.file_name,
            mime_type: att.mime_type || "",
            kind: att.kind || "file",
            size_bytes: att.size_bytes || 0,
            created_at: new Date().toISOString(),
          };
          await firebaseStore.from("task_attachments").insert(newAtt as never).catch((e) => console.warn(e));
        }

        try {
          const remotes = await listAttachments(oldId);
          for (const rem of remotes) {
            const alreadyInLegacy = existingLegacy.some(
              (l: any) =>
                l.url === rem.download_url ||
                l.url === rem.view_url ||
                (l.file_name === rem.file_name && l.size_bytes === rem.size_bytes)
            );
            if (!alreadyInLegacy) {
              const newAtt = {
                id: generateUUID(),
                user_id: userId,
                task_id: newMappedId,
                url: rem.download_url || rem.view_url,
                storage_path: "",
                file_name: rem.file_name,
                mime_type: rem.mime_type || "",
                kind: rem.kind || "file",
                size_bytes: rem.size_bytes || 0,
                created_at: new Date().toISOString(),
              };
              await firebaseStore.from("task_attachments").insert(newAtt as never).catch((e) => console.warn(e));
            }
          }
        } catch {
          // Ignore remote listing if offline or unavailable
        }

        try {
          const queuedList = await listQueued(oldId);
          for (const q of queuedList) {
            const file = Object.assign(q.blob, { name: q.name }) as File;
            await enqueueAttachment(newMappedId, file).catch(() => {});
          }
        } catch {
          // Ignore queued list errors
        }
      } catch (attErr) {
        console.warn("[TaskDuplicate] Attachment copy error for task:", oldId, attErr);
      }

      // 3c. Tags
      try {
        const { data: tagLinks } = await firebaseStore
          .from("task_tags")
          .select("*")
          .eq("task_id", oldId);
        if (Array.isArray(tagLinks)) {
          for (const tl of tagLinks) {
            if (tl.tag_id) {
              await persistTaskTagChange(userId, newMappedId, tl.tag_id, "add").catch((e) => console.warn(e));
            }
          }
        }
      } catch (tagErr) {
        console.warn("[TaskDuplicate] Tag copy error for task:", oldId, tagErr);
      }

      // 3d. Knowledge Links
      try {
        const knowledgeLinks = await getTaskKnowledgeLinks(oldId, userId);
        for (const kl of knowledgeLinks) {
          if (kl.document_id) {
            await linkTaskKnowledge(userId, newMappedId, kl.document_id, kl.note_or_context).catch((e) => console.warn(e));
          }
        }
      } catch (kErr) {
        console.warn("[TaskDuplicate] Knowledge link copy error for task:", oldId, kErr);
      }
    }

    // 4. Log activity
    await logTaskActivity(task.id, userId, "duplicated", { new_task_id: newTaskId }).catch(() => {});

    // 5. Notify UI
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("tasks-changed"));
      window.dispatchEvent(new CustomEvent(`arshnaz:attach-refresh:${newTaskId}`));
    }

    return { success: true, newTaskId };
  } catch (error) {
    console.error("[TaskDuplicate] Deep duplicate failed:", error);
    return { success: false, error };
  }
}
