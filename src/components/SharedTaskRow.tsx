import { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useShowCompletedTasks } from "@/lib/completedTaskVisibility";
import type { Task } from "@/lib/taskTypes";
import { TaskListItem } from "./TaskListItem";

type Collection = {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onPatch: (task: Task, patch: Partial<Task>) => void;
  onOpen?: (task: Task) => void;
};
const Context = createContext<Collection | null>(null);
export function SharedTaskRowsProvider({ children, ...collection }: Collection & { children: React.ReactNode }) {
  return <Context.Provider value={collection}>{children}</Context.Provider>;
}

/** Reuse the Today/Inbox row, including its recursive expandable subtask tree. */
export function SharedTaskRow({ task, externalDragHandle, initiallyExpanded = false }: { task: Task; initiallyExpanded?: boolean; externalDragHandle?: Record<string, any> }) {
  const collection = useContext(Context);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const showCompleted = useShowCompletedTasks();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => initiallyExpanded ? Object.fromEntries((collection?.tasks || [task]).map(task => [task.id, true])) : {});
  const tasks = collection?.tasks;
  const { taskMap, childrenMap } = useMemo(() => {
    const rows = tasks || [task];
    const taskMap = new Map(rows.map((t) => [t.id, t]));
    const childrenMap: Record<string, Task[]> = {};
    for (const t of rows) if (t.parent_id && t.parent_id !== t.id) (childrenMap[t.parent_id] ||= []).push(t);
    for (const children of Object.values(childrenMap)) children.sort((a, b) => (a.position || 0) - (b.position || 0));
    return { taskMap, childrenMap };
  }, [tasks, task]);
  const getProgress = (id: string) => {
    const children = childrenMap[id] || [];
    return { done: children.filter((t) => t.completed).length, total: children.length };
  };
  const open = (t: Task) => collection?.onOpen ? collection.onOpen(t) : navigate(`/app/tasks/${t.id}`);
  return <TaskListItem
    t={task} subs={childrenMap[task.id] || []} open={!!expanded[task.id]}
    onToggleExpand={(id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))}
    onSelectTask={open} onActionTask={open}
    onToggleTask={(t) => collection?.onToggle(t)}
    onPatchTask={(id, patch) => { const t = taskMap.get(id); if (t) collection?.onPatch(t, patch); }}
    userId={user?.id} isSelected={false} splitView={false} layout="compact" isEn={isEn}
    T={(fa, en) => isEn ? en : fa} navigate={navigate}
    outcomeByTaskId={{}} outcomeById={{}} childrenMap={childrenMap} expanded={expanded}
    getProgress={getProgress} taskMap={taskMap} showCompletedTasks={showCompleted}
    allowDrag={!!externalDragHandle} externalDragHandle={externalDragHandle}
  />;
}
