import { useCallback, useEffect, useMemo, useState } from "react";
import { firebaseStore } from "@/lib/firebaseStore";
import {
  persistTask, subscribeFolders, subscribeTags, upsertFolder, upsertTag, upsertTask,
  type FolderItem, type TagItem,
} from "@/lib/firestoreDataService";
import { subscribeToTasks } from "@/features/tasks/taskService";
import { setTaskCompletion, type CompletionOutcome } from "@/features/tasks/taskCompletion";
import type { TaskPersistenceStatus } from "@/lib/firestoreDataService";
import { persistTaskTagChange } from "@/lib/taskTagService";
import type { Task } from "@/lib/taskTypes";
import type { Priority } from "@/lib/priority";
import { timePatch, type TimeFields, type TimeSettings } from "@/lib/timeHorizon";

const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `t_${Date.now()}_${Math.random().toString(36).slice(2)}`);

export type NewTaskInput = {
  title: string;
  time: TimeFields;
  priority: Priority;
  folderName?: string | null;
  folderId?: string | null;
  tagNames: string[];
  tagIds: string[];
};

export function useHorizonData(userId: string | undefined, settings: TimeSettings) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [taskTags, setTaskTags] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    // Never show the previous account's tasks while the next one loads.
    setTasks([]); setLoading(true);
    if (!userId) return;
    const offT = subscribeToTasks(userId, (list) => { setTasks(list); setLoading(false); });
    const offF = subscribeFolders(userId, setFolders);
    const offG = subscribeTags(userId, setTags);
    return () => { offT(); offF(); offG(); };
  }, [userId]);

  const reloadTaskTags = useCallback(async () => {
    if (!userId) return;
    const { data } = await firebaseStore.from("task_tags").select("task_id,tag_id").eq("user_id", userId);
    const map = new Map<string, Set<string>>();
    for (const r of (data || []) as any[]) {
      if (!map.has(r.task_id)) map.set(r.task_id, new Set());
      map.get(r.task_id)!.add(r.tag_id);
    }
    setTaskTags(map);
  }, [userId]);
  useEffect(() => { void reloadTaskTags(); }, [reloadTaskTags]);

  /** Optimistic update that reports the real result and rolls back when the save failed. */
  const saveTask = useCallback(async (id: string, patch: Partial<Task>): Promise<TaskPersistenceStatus> => {
    if (!userId) return "failed";
    let before: Task | undefined;
    setTasks((prev) => prev.map((t) => { if (t.id !== id) return t; before = t; return { ...t, ...patch }; }));
    const status = await persistTask(userId, { id, ...patch });
    if (status === "failed" && before) { const prev = before; setTasks((list) => list.map((t) => (t.id === id ? prev : t))); }
    return status;
  }, [userId]);
  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => (await saveTask(id, patch)) !== "failed", [saveTask]);

  const setTime = useCallback((id: string, tf: TimeFields) => updateTask(id, timePatch(tf, settings)), [updateTask, settings]);

  /** Same completion path as Tasks: a repeating task moves to its next occurrence, study tasks open the session. */
  const toggleDone = useCallback(async (t: Task): Promise<CompletionOutcome> => {
    if (!userId) return { kind: "failed" };
    const done = !t.completed;
    const result = await setTaskCompletion(userId, t, done, { allKnownTasks: tasks });
    if (result.kind === "saved" || result.kind === "queued" || result.kind === "advanced") {
      const patch = result.patch;
      setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    }
    return result;
  }, [userId, tasks]);

  const folderByName = useMemo(() => new Map(folders.map((f) => [f.name.trim().toLowerCase(), f])), [folders]);
  const tagByName = useMemo(() => new Map(tags.map((t) => [t.name.trim().toLowerCase(), t])), [tags]);

  const createTask = useCallback(async (input: NewTaskInput) => {
    if (!userId) return false;
    let folderId = input.folderId ?? null;
    if (input.folderName) {
      const found = folderByName.get(input.folderName.toLowerCase());
      if (found) folderId = found.id;
      else {
        const f: FolderItem = { id: newId(), name: input.folderName, parent_id: null, color: "#e11d48", position: folders.length };
        await upsertFolder(userId, f);
        folderId = f.id;
      }
    }
    const tagIds = new Set(input.tagIds);
    for (const name of input.tagNames) {
      const found = tagByName.get(name.toLowerCase());
      if (found) tagIds.add(found.id);
      else {
        const tg: TagItem = { id: newId(), name, color: "#f59e0b" };
        await upsertTag(userId, tg);
        tagIds.add(tg.id);
      }
    }
    const id = newId();
    const task: Task = {
      id,
      user_id: userId,
      title: input.title,
      priority: input.priority,
      folder_id: folderId,
      completed: false,
      status: "todo",
      parent_id: null,
      position: 0,
      created_at: new Date().toISOString(),
      ...timePatch(input.time, settings),
    } as Task;
    setTasks((prev) => [task, ...prev]);
    const ok = await upsertTask(userId, task);
    for (const tagId of tagIds) await persistTaskTagChange(userId, id, tagId, "add");
    if (tagIds.size) void reloadTaskTags();
    return ok;
  }, [userId, folderByName, tagByName, folders.length, settings, reloadTaskTags]);

  return { tasks, loading, folders, tags, taskTags, updateTask, saveTask, setTime, toggleDone, createTask };
}
