import { useCallback, useEffect, useRef, useState } from "react";
import { firebaseStore } from "@/lib/firebaseStore";
import type { Task } from "@/lib/taskTypes";
import {
  applyPendingTaskOperations,
  fetchTasks,
  getCachedTasks,
  subscribeToTasks,
  taskMemoryCache,
} from "@/features/tasks/taskService";

type TaskUser = { id: string } | null | undefined;
type OutcomeMeta = { label: string; color?: string | null; icon?: string | null };

type UseTasksDataOptions = {
  user: TaskUser;
  scope: string;
  scopeId?: string;
};

export function useTasksData({ user, scope, scopeId }: UseTasksDataOptions) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskTagsMap, setTaskTagsMap] = useState<Record<string, string[]>>({});
  const [outcomeById, setOutcomeById] = useState<Record<string, OutcomeMeta>>({});
  const [outcomeByTaskId, setOutcomeByTaskId] = useState<Record<string, string>>({});
  const [folderName, setFolderName] = useState("");
  const [tagName, setTagName] = useState("");
  const lastLoadRef = useRef(0);
  const inflightRef = useRef<Promise<void> | null>(null);
  const MIN_INTERVAL_MS = 1500;

  const fetchAll = useCallback(async (force = false): Promise<void> => {
    if (!user) return;
    const now = Date.now();
    if (!force && now - lastLoadRef.current < MIN_INTERVAL_MS && taskMemoryCache.get(user.id)) return;
    if (inflightRef.current) return inflightRef.current;
    lastLoadRef.current = now;
    const request = (async () => {
      const tasks = await fetchTasks(user.id);
      if (tasks.length > 0) setAllTasks(tasks);
    })();
    inflightRef.current = request;
    try {
      await request;
    } finally {
      inflightRef.current = null;
    }
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    let base = await getCachedTasks(user.id);
    base = await applyPendingTaskOperations(base);
    taskMemoryCache.set(user.id, base);
    setAllTasks(base);
    await fetchAll(!taskMemoryCache.get(user.id));

    if (typeof navigator !== "undefined" && navigator.onLine) {
      if (scope === "folder" && scopeId) {
        const { data } = await firebaseStore.from("folders").select("name").eq("id", scopeId).single();
        if (data) setFolderName(data.name);
      } else if (scope === "tag" && scopeId) {
        const { data } = await firebaseStore.from("tags").select("name").eq("id", scopeId).single();
        if (data) setTagName(data.name);
      }
    }
  }, [fetchAll, scope, scopeId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    let pending: number | null = null;
    let dirty = false;
    const flush = () => {
      pending = null;
      if (document.hidden) {
        dirty = true;
        return;
      }
      dirty = false;
      void fetchAll();
    };
    const scheduleLoad = () => {
      if (pending != null) window.clearTimeout(pending);
      pending = window.setTimeout(flush, 600);
    };
    const onVisible = () => {
      if (!document.hidden && dirty) {
        dirty = false;
        void fetchAll(true);
      }
    };
    const onTasksChanged = () => void load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("tasks-changed", onTasksChanged);
    const unsubscribe = subscribeToTasks(user.id, (tasks) => {
      if (tasks.length > 0) {
        taskMemoryCache.set(user.id, tasks);
        setAllTasks(tasks);
      }
    });
    const channel = firebaseStore.channel(`tasks-rt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtasks" }, scheduleLoad)
      .subscribe();
    return () => {
      if (pending != null) window.clearTimeout(pending);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("tasks-changed", onTasksChanged);
      unsubscribe();
      firebaseStore.removeChannel(channel);
    };
  }, [fetchAll, load, user]);

  useEffect(() => {
    if (!user) return;
    firebaseStore.from("task_tags").select("task_id,tag_id").then(({ data }) => {
      const mapping: Record<string, string[]> = {};
      (data || []).forEach((row: { task_id: string; tag_id: string }) => {
        (mapping[row.task_id] ||= []).push(row.tag_id);
      });
      setTaskTagsMap(mapping);
    });
  }, [allTasks.length, user]);

  useEffect(() => {
    if (!user || allTasks.length === 0) return;
    const parentIds = [...new Set(allTasks.filter((task) => !task.parent_id).map((task) => task.id))];
    if (parentIds.length === 0) return;
    void Promise.all([
      firebaseStore.from("task_outcomes").select("id,label,color,icon,task_id").in("task_id", parentIds),
      firebaseStore.from("outcome_executions").select("outcome_id,created_task_ids,task_id").in("task_id", parentIds),
    ]).then(([{ data: outcomesData }, { data: executionsData }]) => {
      const byId: Record<string, OutcomeMeta> = {};
      (outcomesData || []).forEach((outcome: { id: string; label: string; color?: string | null; icon?: string | null }) => {
        byId[outcome.id] = { label: outcome.label, color: outcome.color, icon: outcome.icon };
      });
      const byTaskId: Record<string, string> = {};
      (executionsData || []).forEach((execution: { outcome_id: string; created_task_ids?: string[] }) => {
        (execution.created_task_ids || []).forEach((taskId) => { byTaskId[taskId] = execution.outcome_id; });
      });
      setOutcomeById(byId);
      setOutcomeByTaskId(byTaskId);
    });
  }, [allTasks, user]);

  return {
    allTasks,
    setAllTasks,
    taskTagsMap,
    outcomeById,
    outcomeByTaskId,
    folderName,
    tagName,
    load,
  };
}
