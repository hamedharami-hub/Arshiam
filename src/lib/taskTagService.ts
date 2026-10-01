import { firebaseStore } from "@/lib/firebaseStore";
import { enqueueOp } from "@/lib/offlineQueue";

export type TaskTagAction = "add" | "remove";
export type TaskTagSaveResult = "saved" | "queued" | "failed";

export async function persistTaskTagChange(
  userId: string,
  taskId: string,
  tagId: string,
  action: TaskTagAction,
): Promise<TaskTagSaveResult> {
  const result = await persistTaskTagChangeInner(userId, taskId, tagId, action);
  if (result !== "failed" && typeof window !== "undefined") window.dispatchEvent(new Event("task-tags-changed"));
  return result;
}

async function persistTaskTagChangeInner(
  userId: string,
  taskId: string,
  tagId: string,
  action: TaskTagAction,
): Promise<TaskTagSaveResult> {
  const op = action === "add"
    ? {
        ownerId: userId,
        table: "task_tags",
        op: "insert" as const,
        payload: { user_id: userId, task_id: taskId, tag_id: tagId },
      }
    : {
        ownerId: userId,
        table: "task_tags",
        op: "delete" as const,
        match: { user_id: userId, task_id: taskId, tag_id: tagId },
      };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    try {
      return await enqueueOp(op) ? "queued" : "failed";
    } catch (error) {
      console.warn("[TaskTagService] Could not queue offline tag change:", error);
      return "failed";
    }
  }

  try {
    if (action === "add") {
      const { error } = await firebaseStore.from("task_tags").insert(op.payload);
      if (error) throw error;
    } else {
      const { error } = await firebaseStore
        .from("task_tags")
        .delete()
        .eq("user_id", userId)
        .eq("task_id", taskId)
        .eq("tag_id", tagId);
      if (error) throw error;
    }
    return "saved";
  } catch (error) {
    console.warn("[TaskTagService] Online tag change failed; queueing it:", error);
    try {
      return await enqueueOp(op) ? "queued" : "failed";
    } catch (queueError) {
      console.warn("[TaskTagService] Could not queue tag change:", queueError);
      return "failed";
    }
  }
}
