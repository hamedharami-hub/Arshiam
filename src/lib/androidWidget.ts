import { Capacitor, registerPlugin } from "@capacitor/core";
import { onIdTokenChanged } from "firebase/auth";
import type { Task } from "@/lib/taskTypes";
import { auth } from "@/lib/firebase";
import config from "../../firebase-applet-config.json";

type WidgetPlugin = {
  prepareSession(options: { userId: string }): Promise<void>;
  setSession(options: { userId: string; idToken?: string; refreshToken?: string; expiresAt?: number;
    apiKey?: string; projectId?: string; databaseId?: string }): Promise<void>;
  syncWidgetData(options: { activeCount: number; nextTaskId: string; nextTaskTitle: string; userId: string; pendingChanges: boolean; tasks: object[] }): Promise<void>;
};
const widget = registerPlugin<WidgetPlugin>("ArshnazWidget");
let queue: Promise<void> = Promise.resolve();
let readyUid = "";
let latestTasks: { ownerId: string; tasks: Task[] } | undefined;
function enqueue(action: () => Promise<void>): Promise<void> {
  const next = queue.then(action);
  queue = next.catch(() => { console.warn("Android widget update unavailable"); });
  return next;
}

export async function clearAndroidWidget(): Promise<void> {
  readyUid = "";
  latestTasks = undefined;
  if (Capacitor.getPlatform() === "android") await enqueue(() => widget.setSession({ userId: "" }));
}

/** Credentials cross only the local bridge into encrypted, backup-excluded storage. */
export function startWidgetSessionSync(): () => void {
  if (Capacitor.getPlatform() !== "android") return () => {};
  let generation = 0;
  let previousUid: string | undefined;
  const unsubscribe = onIdTokenChanged(auth, (user) => {
    const current = ++generation;
    const uid = user?.uid || "";
    if (uid !== previousUid) {
      previousUid = uid;
      readyUid = "";
      if (latestTasks?.ownerId !== uid) latestTasks = undefined;
      void enqueue(() => uid ? widget.prepareSession({ userId: uid }) : widget.setSession({ userId: "" })).catch(() => {});
    }
    if (!user) return;
    void user.getIdTokenResult().then((token) => {
      if (current !== generation || auth.currentUser !== user) return;
      return enqueue(async () => {
        if (current !== generation || auth.currentUser !== user) return;
        await widget.setSession({
          userId: uid, idToken: token.token, refreshToken: user.refreshToken,
          expiresAt: Date.parse(token.expirationTime),
          apiKey: config.apiKey, projectId: config.projectId, databaseId: config.firestoreDatabaseId,
        });
        if (current !== generation || auth.currentUser !== user) return;
        readyUid = uid;
        if (latestTasks?.ownerId === uid) await sendTasks(latestTasks.tasks, uid);
      });
    }).catch(() => { console.warn("Android widget session unavailable"); });
  });
  return () => { generation++; unsubscribe(); };
}

export function widgetPayload(tasks: Task[], today = new Date()) {
  const active = tasks.filter((task) => {
    if (task.completed || task.status === "done" || !task.due_date) return false;
    const due = new Date(task.due_date.length === 10 ? task.due_date + "T00:00:00" : task.due_date);
    return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth()
      && due.getDate() === today.getDate();
  }).sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "") || a.id.localeCompare(b.id));
  return { activeCount: active.length, nextTaskId: active[0]?.id || "",
    nextTaskTitle: active.slice(0, 3).map((task) => `• ${task.title}`).join("\n") };
}

export async function syncAndroidWidget(tasks: Task[], ownerId = auth.currentUser?.uid): Promise<void> {
  if (Capacitor.getPlatform() !== "android" || !ownerId || auth.currentUser?.uid !== ownerId) return;
  latestTasks = { ownerId, tasks: tasks.map(task => ({ ...task })) };
  await enqueue(async () => {
    if (auth.currentUser?.uid !== ownerId || readyUid !== ownerId) return;
    await sendTasks(tasks, ownerId);
  });
}

async function sendTasks(tasks: Task[], ownerId: string): Promise<void> {
    const { getPendingOps } = await import("./offlineQueue");
    const pendingChanges = (await getPendingOps("tasks")).length > 0;
    if (auth.currentUser?.uid !== ownerId || readyUid !== ownerId) return;
    await widget.syncWidgetData({ ...widgetPayload(tasks), userId: ownerId, pendingChanges,
      tasks: tasks.map(({ id, title, due_date, completed, status, priority, reminder_at, folder_id }) =>
        ({ id, title, due_date: due_date || "", completed, status, priority, reminder_at: reminder_at || "", folder_id: folder_id || "" })) });
}
