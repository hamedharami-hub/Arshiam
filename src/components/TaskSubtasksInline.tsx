import { TaskPlanningPicker } from "./TaskPlanningPicker";
import { useCallback, useEffect, useRef, useState } from "react";
import { cacheGet } from "@/lib/offlineQueue";
import { extractTasksFromCache } from "@/features/tasks/taskCache";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ListTree, GripVertical, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useBilingual } from "@/hooks/useBilingual";
import { useShowCompletedTasks, setShowCompletedTasks } from "@/lib/completedTaskVisibility";
import { toPersianDigits } from "@/lib/jalali";
import { BidiText } from "@/components/BidiText";
import { persistTask } from "@/lib/firestoreDataService";
import { deleteTaskCascade } from "@/features/tasks/taskService";
import type { Task } from "@/lib/taskTypes";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { awardTaskWatering } from "@/lib/garden";
import { playCompletionFeedback } from "@/lib/completionFeedback";

type Sub = Partial<Task> & {
  id: string; title: string; completed: boolean; position: number;
};

export function TaskSubtasksInline({
  taskId, onOpenSubtask, onProgressChange, onSubtasksChange, readOnly = false, initialSubs,
}: {
  taskId: string;
  onOpenSubtask?: (id: string) => void;
  onProgressChange?: (completed: number, total: number) => void;
  onSubtasksChange?: (subs: Sub[]) => void;
  readOnly?: boolean;
  initialSubs?: Sub[];
}) {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const showCompletedTasks = useShowCompletedTasks();
  const [subs, setSubs] = useState<Sub[]>(initialSubs || []);
  const [newTitle, setNewTitle] = useState("");

  const editingRef = useRef<Set<string>>(new Set());
  const pendingTitles = useRef<Record<string, string>>({});
  const writeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Guard against stale background Firestore snapshots or un-synced parent initialSubs reverting checks
  const recentTogglesRef = useRef<Map<string, { completed: boolean; time: number }>>(new Map());

  const flushPendingTitle = useCallback(async (id: string) => {
    if (writeTimers.current[id]) {
      clearTimeout(writeTimers.current[id]);
      delete writeTimers.current[id];
    }
    const title = pendingTitles.current[id];
    if (title !== undefined && user) {
      delete pendingTitles.current[id];
      await persistTask(user.id, { id, title });
      window.dispatchEvent(new Event("tasks-changed"));
    }
  }, [user]);

  useEffect(() => {
    return () => {
      // Flush any debounced title writes on unmount so changes are never lost
      Object.keys(pendingTitles.current).forEach((id) => {
        const title = pendingTitles.current[id];
        if (title !== undefined && user) {
          void persistTask(user.id, { id, title });
        }
      });
      Object.values(writeTimers.current).forEach(clearTimeout);
    };
  }, [user]);

  useEffect(() => {
    if (initialSubs && initialSubs.length > 0) {
      setSubs((prev) => {
        if (prev.length === 0) return initialSubs;
        const prevMap = new Map(prev.map((p) => [p.id, p]));
        const merged = initialSubs.map((row) => {
          let title = row.title;
          let completed = row.completed;
          if (editingRef.current.has(row.id) && prevMap.has(row.id)) {
            title = prevMap.get(row.id)!.title;
          }
          const recentToggle = recentTogglesRef.current.get(row.id);
          if (recentToggle && Date.now() - recentToggle.time < 15000) {
            completed = recentToggle.completed;
          }
          return { ...row, title, completed };
        });
        return merged;
      });
    }
  }, [initialSubs]);

  const replaceRows = useCallback((rows: Sub[]) => {
    // Preserve titles for rows actively edited, and preserve recently toggled completed state
    setSubs((prev) => {
      const prevMap = new Map(prev.map((p) => [p.id, p]));
      const merged = rows.map((row) => {
        let title = row.title;
        let completed = row.completed;
        if (editingRef.current.has(row.id) && prevMap.has(row.id)) {
          title = prevMap.get(row.id)!.title;
        }
        const recentToggle = recentTogglesRef.current.get(row.id);
        if (recentToggle && Date.now() - recentToggle.time < 15000) {
          completed = recentToggle.completed;
        }
        return { ...row, title, completed };
      });
      return merged;
    });
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const cachedRaw = await cacheGet<unknown>(`tasks:all:${user.id}`);
    const cached = extractTasksFromCache(cachedRaw);
    if (cached) {
      const childRows = cached
        .filter((row) => row && row.parent_id === taskId)
        .sort((a, b) => ((a as any).position ?? 0) - ((b as any).position ?? 0))
        .map((row, i) => ({
          ...row,
          id: row.id,
          title: row.title,
          completed: Boolean(row.completed),
          position: (row as any).position ?? i,
        }));
      replaceRows(childRows);
    }
  }, [taskId, user, replaceRows]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const onTasksChanged = () => void load();
    window.addEventListener("tasks-changed", onTasksChanged);
    return () => {
      window.removeEventListener("tasks-changed", onTasksChanged);
    };
  }, [user, load]);

  const add = async () => {
    if (readOnly) return;
    const title = newTitle.trim();
    if (!title || !user) return;

    const newId = crypto.randomUUID();
    const position = subs.length;
    const newSubTask: Task = {
      id: newId,
      user_id: user.id,
      title,
      parent_id: taskId,
      priority: "none",
      position,
      completed: false,
      status: "todo",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextSubs = [...subs, { id: newId, title, completed: false, position }];
    setSubs(nextSubs);
    onSubtasksChange?.(nextSubs);
    setNewTitle("");

    const status = await persistTask(user.id, newSubTask);
    if (status === "failed") {
      const reverted = subs.filter((x) => x.id !== newId);
      setSubs(reverted);
      onSubtasksChange?.(reverted);
      toast.error(T("خطا در ایجاد زیرتسک", "Failed to create subtask"));
      return;
    }
    window.dispatchEvent(new Event("tasks-changed"));
  };

  const toggle = async (s: Sub) => {
    if (readOnly || !user) return;
    const next = !s.completed;
    const prevSubs = subs;
    const nextSubs = subs.map((x) => (x.id === s.id ? { ...x, completed: next } : x));
    setSubs(nextSubs);
    onSubtasksChange?.(nextSubs);

    recentTogglesRef.current.set(s.id, { completed: next, time: Date.now() });

    // Award watering and drops to garden when checking subtask
    if (next) {
      playCompletionFeedback();
      awardTaskWatering(s.title, true);
    }

    const status = await persistTask(user.id, {
      id: s.id,
      completed: next,
      status: next ? "done" : "todo",
      parent_id: taskId,
      completed_at: next ? new Date().toISOString() : null,
    });
    if (status === "failed") {
      recentTogglesRef.current.delete(s.id);
      setSubs(prevSubs);
      onSubtasksChange?.(prevSubs);
      toast.error(T("خطا در به‌روزرسانی زیرتسک", "Failed to update subtask"));
      return;
    }
    window.dispatchEvent(new Event("tasks-changed"));
  };

  const patchPlanning = async (sub: Sub, patch: Partial<Task>) => {
    if (!user || readOnly) return;
    const inverse = Object.fromEntries(Object.keys(patch).map(key => [key, sub[key as keyof Sub]]));
    setSubs(previous => previous.map(row => row.id === sub.id ? { ...row, ...patch } : row));
    const status = await persistTask(user.id, { id: sub.id, ...patch });
    if (status === "failed") {
      setSubs(previous => previous.map(row => row.id === sub.id ? { ...row, ...inverse } : row));
      toast.error(T("برنامه‌ریزی ذخیره نشد", "Could not save planning"));
    }
    window.dispatchEvent(new Event("tasks-changed"));
  };

  const updateTitle = (id: string, title: string) => {
    if (readOnly || !user) return;
    editingRef.current.add(id);
    pendingTitles.current[id] = title;
    setSubs((prev) => prev.map((x) => (x.id === id ? { ...x, title } : x)));

    if (writeTimers.current[id]) clearTimeout(writeTimers.current[id]);
    writeTimers.current[id] = setTimeout(async () => {
      delete writeTimers.current[id];
      delete pendingTitles.current[id];
      const status = await persistTask(user.id, { id, title });
      if (status === "failed") {
        toast.error(T("خطا در ذخیره عنوان زیرتسک", "Failed to save subtask title"));
      }
      window.dispatchEvent(new Event("tasks-changed"));
      setTimeout(() => editingRef.current.delete(id), 800);
    }, 500);
  };

  const remove = async (id: string) => {
    if (readOnly || !user) return;
    const prevSubs = subs;
    const nextSubs = subs.filter((x) => x.id !== id);
    setSubs(nextSubs);
    onSubtasksChange?.(nextSubs);

    const res = await deleteTaskCascade(user.id, id);
    if (!res.success) {
      setSubs(prevSubs);
      onSubtasksChange?.(prevSubs);
      toast.error(T("خطا در حذف زیرتسک", "Failed to delete subtask"));
      return;
    }
    window.dispatchEvent(new Event("tasks-changed"));
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const reorder = async (fromId: string, toId: string) => {
    if (readOnly || !user) return;
    const fromIdx = subs.findIndex((s) => s.id === fromId);
    const toIdx = subs.findIndex((s) => s.id === toId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const prevSubs = subs;
    const reordered = arrayMove(subs, fromIdx, toIdx).map((s, i) => ({ ...s, position: i }));
    setSubs(reordered);

    const results = await Promise.all(
      reordered.map((s, i) => persistTask(user.id, { id: s.id, position: i }))
    );
    if (results.some((r) => r === "failed")) {
      setSubs(prevSubs);
      toast.error(T("خطا در تغییر ترتیب زیرتسک‌ها", "Failed to reorder subtasks"));
      return;
    }
    window.dispatchEvent(new Event("tasks-changed"));
  };

  const done = subs.filter((s) => s.completed).length;
  const visibleSubs = showCompletedTasks ? subs : subs.filter((subtask) => !subtask.completed);
  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));

  useEffect(() => { onProgressChange?.(done, subs.length); }, [done, subs.length, onProgressChange]);

  return (
    <div className="space-y-2">
      {subs.length > 0 && done > 0 && (
        <div className="flex items-center justify-between text-xs px-0.5 pb-0.5">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {T(`${num(done)} از ${num(subs.length)} زیرتسک انجام شده`, `${num(done)} of ${num(subs.length)} subtasks completed`)}
          </span>
          <button
            type="button"
            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/70 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            title={showCompletedTasks ? T("مخفی‌سازی زیرتسک‌های انجام‌شده", "Hide completed subtasks") : T("نمایش زیرتسک‌های انجام‌شده", "Show completed subtasks")}
            data-testid="toggle-completed-subtasks"
          >
            {showCompletedTasks ? <EyeOff className="w-3 h-3 text-primary" /> : <Eye className="w-3 h-3" />}
            <span>
              {showCompletedTasks
                ? T("مخفی‌سازی انجام‌شده‌ها", "Hide completed")
                : T(`نمایش انجام‌شده‌ها (${num(done)})`, `Show completed (${num(done)})`)}
            </span>
          </button>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e: DragEndEvent) => {
          const { active, over } = e;
          if (!over || active.id === over.id) return;
          reorder(String(active.id), String(over.id));
        }}
      >
        <SortableContext items={visibleSubs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            {visibleSubs.map((s) => (
              <SortableSubtaskRow
                key={s.id}
                sub={s}
                readOnly={readOnly}
                onToggle={() => toggle(s)}
                onPatch={patch => void patchPlanning(s, patch)}
                onChangeTitle={(title) => updateTitle(s.id, title)}
                onBlur={() => void flushPendingTitle(s.id)}
                onOpen={onOpenSubtask ? () => onOpenSubtask(s.id) : undefined}
                onDelete={() => remove(s.id)}
                isEn={isEn}
                T={T}
              />
            ))}
            {visibleSubs.length === 0 && (
              <li className="text-xs text-muted-foreground/70 px-1 py-1">
                {subs.length > 0 && done > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowCompletedTasks(true)}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline cursor-pointer font-medium"
                    data-testid="show-hidden-completed-subtasks"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{T(`${num(done)} زیرتسک انجام‌شده مخفی است — برای مشاهده کلیک کنید`, `${num(done)} completed subtask(s) hidden — click to show`)}</span>
                  </button>
                ) : (
                  <span>— {T("زیرتسکی نیست", "No subtasks")} —</span>
                )}
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-2">
        <AutoTextarea
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
          disabled={readOnly}
          placeholder={readOnly ? "" : `+ ${T("زیرتسک جدید...", "New subtask...")}`}
          className="text-xs flex-1 min-h-[28px] max-h-[120px] py-1.5"
          dir="auto"
          rows={1}
          minHeight={28}
          maxHeight={120}
        />
        <Button size="icon" variant="ghost" onClick={add} disabled={readOnly} className="h-7 w-7">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function SortableSubtaskRow({
  sub, readOnly, onToggle, onPatch, onChangeTitle, onBlur, onOpen, onDelete, isEn, T,
}: {
  sub: Sub;
  readOnly: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<Task>) => void;
  onChangeTitle: (title: string) => void;
  onBlur?: () => void;
  onOpen?: () => void;
  onDelete: () => void;
  isEn: boolean;
  T: (fa: string, en: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sub.id,
    disabled: readOnly,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className="flex items-start gap-1.5 group">
      {!readOnly && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="pt-1.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
          aria-label={T("جابجایی", "Drag")}
          title={T("جابجایی", "Drag")}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="pt-1.5"><Checkbox checked={sub.completed} onCheckedChange={onToggle} disabled={readOnly} /></div>
      <div className="flex-1 min-w-0">
      <AutoTextarea
        value={sub.title}
        onChange={(e) => onChangeTitle(e.target.value)}
        onBlur={onBlur}
        disabled={readOnly}
        minHeight={28}
        maxHeight={240}
        rows={1}
        className={`text-sm flex-1 min-w-0 border-none bg-transparent focus-visible:ring-1 px-1 py-1 leading-snug break-words whitespace-pre-wrap ${
          sub.completed ? "line-through text-muted-foreground" : ""
        }`}
      />
      <TaskPlanningPicker task={{ ...sub, priority: sub.priority || "none", status: sub.status || "todo" } as Task} onPatch={onPatch} disabled={readOnly} />
      </div>
      {onOpen && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onOpen}
          className="h-7 px-2 text-xs gap-1 opacity-90 sm:opacity-75 sm:hover:opacity-100 text-muted-foreground hover:text-foreground shrink-0 rounded-lg hover:bg-muted/60 transition-all active:scale-95"
          title={T("باز کردن زیرتسک", "Open subtask")}
        >
          <span className="text-[11px] font-medium">{T("باز کردن", "Open")}</span>
          {isEn ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </Button>
      )}
      {!readOnly && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="h-6 w-6 opacity-70 sm:opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </li>
  );
}
