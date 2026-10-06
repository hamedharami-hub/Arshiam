import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { firebaseStore } from "@/lib/firebaseStore";
import { hasServerSnapshot } from "@/lib/firestoreLive";
import i18n from "@/i18n";
import type { Task } from "@/lib/taskTypes";
import {
  applyPendingTaskOperations,
  fetchTasks,
  getCachedTasks,
  hasServerAuthoritativeTasks,
  isTaskCacheFreshForUser,
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
  const userId = user?.id;
  const [taskState, setTaskState] = useState<{ userId: string | undefined; tasks: Task[] }>({ userId, tasks: [] });
  const allTasks = taskState.userId === userId ? taskState.tasks : [];
  const setAllTasks = useCallback((update: SetStateAction<Task[]>) => {
    setTaskState(current => {
      const currentTasks = current.userId === userId ? current.tasks : [];
      const tasks = typeof update === "function" ? update(currentTasks) : update;
      return { userId, tasks };
    });
  }, [userId]);
  const [taskTagsMap, setTaskTagsMap] = useState<Record<string, string[]>>({});
  const [outcomeById, setOutcomeById] = useState<Record<string, OutcomeMeta>>({});
  const [outcomeByTaskId, setOutcomeByTaskId] = useState<Record<string, string>>({});
  const [folderName, setFolderName] = useState("");
  const [tagName, setTagName] = useState("");
  const [readyOwner, setReadyOwner] = useState<string | null>(null);
  const [authoritativeOwner, setAuthoritativeOwner] = useState<string | null>(null);
  const [loadErrorOwner, setLoadErrorOwner] = useState<string | null>(null);
  const lastLoadRef = useRef(0);
  const inflightRef = useRef<Promise<void> | null>(null);
  const revision = useRef(0);
  const owner = useRef(userId);
  if (owner.current !== userId) { owner.current = userId; revision.current++; inflightRef.current = null; lastLoadRef.current = 0; }
  const MIN_INTERVAL_MS = 1500;

  const fetchAll = useCallback(async (force = false): Promise<void> => {
    if (!userId) return;
    const now = Date.now();
    if (!force && now - lastLoadRef.current < MIN_INTERVAL_MS && isTaskCacheFreshForUser(userId)) return;
    if (inflightRef.current) return inflightRef.current;
    lastLoadRef.current = now;
    const version = revision.current;
    if (owner.current === userId) {
      setReadyOwner(null);
      setAuthoritativeOwner(null);
      setLoadErrorOwner(null);
    }
    const request = (async () => {
      const tasks = await fetchTasks(userId);
      if (owner.current === userId && revision.current === version) {
        setAllTasks(tasks);
        setReadyOwner(userId);
        setAuthoritativeOwner(hasServerAuthoritativeTasks(userId) ? userId : null);
      }
    })();
    inflightRef.current = request;
    try {
      await request;
    } finally {
      if (inflightRef.current === request) inflightRef.current = null;
    }
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) return;
    const version = revision.current;
    setReadyOwner(null);
    setAuthoritativeOwner(null);
    setLoadErrorOwner(null);
    let base = await getCachedTasks(userId);
    base = await applyPendingTaskOperations(base, userId);
    if (owner.current !== userId) return;
    if (revision.current === version) {
      taskMemoryCache.set(userId, base);
      setAllTasks(base);
    }
    await fetchAll(!isTaskCacheFreshForUser(userId));
    if (owner.current === userId && revision.current === version) {
      setReadyOwner(userId);
      setAuthoritativeOwner(hasServerAuthoritativeTasks(userId) ? userId : null);
    }

    if (typeof navigator !== "undefined" && navigator.onLine) {
      if (scope === "folder" && scopeId) {
        const { data } = await firebaseStore.from("folders").select("name").eq("id", scopeId).single();
        if (data) setFolderName(data.name);
      } else if (scope === "tag" && scopeId) {
        const { data } = await firebaseStore.from("tags").select("name").eq("id", scopeId).single();
        if (data) setTagName(data.name);
      }
    }
  }, [fetchAll, scope, scopeId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
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
    const unsubscribe = subscribeToTasks(userId, (tasks) => {
      if (owner.current !== userId) return;
      revision.current++;
      taskMemoryCache.set(userId, tasks);
      setAllTasks(tasks);
      setReadyOwner(userId);
      setLoadErrorOwner(null);
      const serverConfirmed = (typeof navigator === "undefined" || navigator.onLine) && hasServerSnapshot(userId, "tasks");
      setAuthoritativeOwner(serverConfirmed ? userId : null);
    }, () => {
      if (owner.current !== userId) return;
      setLoadErrorOwner(userId);
    });
    return () => {
      if (pending != null) window.clearTimeout(pending);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("tasks-changed", onTasksChanged);
      unsubscribe();
    };
  }, [fetchAll, load, userId]);

  useEffect(() => {
    if (!userId) return;
    const loadTags = () => {
      firebaseStore.from("task_tags").select("task_id,tag_id").then(({ data }) => {
        const mapping: Record<string, string[]> = {};
        (data || []).forEach((row: { task_id: string; tag_id: string }) => {
          (mapping[row.task_id] ||= []).push(row.tag_id);
        });
        setTaskTagsMap(mapping);
      });
    };
    loadTags();
    window.addEventListener("tasks-changed", loadTags);
    window.addEventListener("task-tags-changed", loadTags);
    return () => {
      window.removeEventListener("tasks-changed", loadTags);
      window.removeEventListener("task-tags-changed", loadTags);
    };
  }, [allTasks.length, userId]);

  useEffect(() => {
    if (!userId || allTasks.length === 0) return;
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
  }, [allTasks, userId]);

  const hasLoadError = !!userId && loadErrorOwner === userId;
  const loadErrorMessage = hasLoadError
    ? (i18n.language || "fa").startsWith("en")
      ? "Tasks could not be loaded. Check your connection and try again."
      : "بارگذاری کارها انجام نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن."
    : null;

  return {
    allTasks,
    isReady: !!userId && readyOwner === userId,
    isServerAuthoritative: !!userId && authoritativeOwner === userId,
    hasLoadError,
    loadErrorMessage,
    setAllTasks,
    taskTagsMap,
    outcomeById,
    outcomeByTaskId,
    folderName,
    tagName,
    load,
  };
}
