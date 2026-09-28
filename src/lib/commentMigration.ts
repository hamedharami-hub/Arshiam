import { firebaseStore } from "@/lib/firebaseStore";
import { persistTask } from "@/lib/firestoreDataService";
import { formatDate } from "@/lib/jalali";

/**
 * The "Add comment" feature was removed. Comments used to be appended to the task
 * description without a date, and their text + timestamp were logged in task_activities.
 * This one-time migration makes sure every logged comment lives in the task text with its date.
 */
export type LoggedComment = { text: string; created_at: string };

export function formatCommentLine(c: LoggedComment): string {
  return `— ${formatDate(c.created_at, "yyyy/MM/dd HH:mm")}: ${c.text}`;
}

export function mergeCommentsIntoDescription(description: string | null | undefined, comments: LoggedComment[]): string {
  let desc = description || "";
  const sorted = [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const c of sorted) {
    const text = c.text.trim();
    if (!text) continue;
    const line = formatCommentLine({ ...c, text });
    if (desc.includes(line)) continue;
    const idx = desc.lastIndexOf(text);
    if (idx >= 0) {
      desc = desc.slice(0, idx) + line + desc.slice(idx + text.length);
    } else {
      desc = desc ? `${desc}\n\n${line}` : line;
    }
  }
  return desc;
}

const flagKey = (uid: string) => `arsh_comments_migrated_v1:${uid}`;

export async function migrateLegacyComments(userId: string): Promise<number> {
  if (!userId || localStorage.getItem(flagKey(userId))) return 0;
  const { data, error } = await firebaseStore.from("task_activities").select("*").eq("user_id", userId);
  if (error) return 0;
  const byTask = new Map<string, LoggedComment[]>();
  for (const row of (data || []) as any[]) {
    const p = row.payload || {};
    if (!p.comment_added || typeof p.comment !== "string") continue;
    const list = byTask.get(row.task_id) || [];
    list.push({ text: p.comment, created_at: row.created_at || new Date().toISOString() });
    byTask.set(row.task_id, list);
  }
  let migrated = 0;
  for (const [taskId, comments] of byTask) {
    const { data: task } = await firebaseStore.from("tasks").select("*").eq("id", taskId).maybeSingle();
    if (!task) continue;
    const next = mergeCommentsIntoDescription((task as any).description, comments);
    if (next !== (task as any).description) {
      await persistTask(userId, { id: taskId, description: next });
      migrated++;
    }
  }
  localStorage.setItem(flagKey(userId), new Date().toISOString());
  return migrated;
}
