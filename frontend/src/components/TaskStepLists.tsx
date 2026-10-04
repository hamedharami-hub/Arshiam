import { useCallback, useEffect, useState } from "react";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { BidiText } from "@/components/BidiText";
import { playCompletionFeedback } from "@/lib/completionFeedback";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type StepStyle = "numbered" | "checkbox" | "bullet" | "arrow";

type StepList = {
  id: string; title: string; style: StepStyle; position: number;
};
type Step = {
  id: string; list_id: string; text: string; completed: boolean; position: number;
};

export function TaskStepLists({
  taskId,
  onCountChange,
  readOnly = false,
}: {
  taskId: string;
  onCountChange?: (count: number) => void;
  readOnly?: boolean;
}) {
  const { T } = useBilingual();
  const { user } = useAuth();
  const [lists, setLists] = useState<StepList[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [newListTitle, setNewListTitle] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newStep, setNewStep] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data: ls } = await firebaseStore
      .from("task_step_lists" as any)
      .select("*")
      .eq("task_id", taskId)
      .order("position");
    const lists = (ls || []) as unknown as StepList[];
    setLists(lists);
    onCountChange?.(lists.length);
    if (lists.length) {
      const { data: st } = await firebaseStore
        .from("task_steps" as any)
        .select("*")
        .in("list_id", lists.map((l) => l.id))
        .order("position");
      setSteps(((st || []) as unknown) as Step[]);
    } else {
      setSteps([]);
    }
  }, [taskId, onCountChange]);

  useEffect(() => { load(); }, [load]);

  const addList = async () => {
    if (!user || readOnly) return;
    const title = newListTitle.trim() || T("چک‌لیست", "Checklist");
    const { data, error } = await firebaseStore
      .from("task_step_lists" as any)
      .insert({
        user_id: user.id,
        task_id: taskId,
        title,
        style: "checkbox",
        position: lists.length,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    const next = [...lists, data as any];
    setLists(next);
    onCountChange?.(next.length);
    setNewListTitle("");
    setAddingList(false);
  };

  const updateList = async (id: string, patch: Partial<StepList>) => {
    if (readOnly) return;
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    await firebaseStore.from("task_step_lists" as any).update(patch).eq("id", id);
  };

  const deleteList = async (id: string) => {
    if (readOnly) return;
    const next = lists.filter((l) => l.id !== id);
    setLists(next);
    onCountChange?.(next.length);
    setSteps((prev) => prev.filter((s) => s.list_id !== id));
    await firebaseStore.from("task_step_lists" as any).delete().eq("id", id);
  };

  const addStep = async (listId: string) => {
    if (!user) return;
    const text = (newStep[listId] || "").trim();
    if (!text) return;
    const listSteps = steps.filter((s) => s.list_id === listId);
    const { data, error } = await firebaseStore
      .from("task_steps" as any)
      .insert({
        user_id: user.id,
        list_id: listId,
        text,
        position: listSteps.length,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setSteps((prev) => [...prev, data as any]);
    setNewStep((s) => ({ ...s, [listId]: "" }));
  };

  const updateStep = async (id: string, patch: Partial<Step>) => {
    if (patch.completed === true) {
      playCompletionFeedback();
    }
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await firebaseStore.from("task_steps" as any).update(patch).eq("id", id);
  };

  const deleteStep = async (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    await firebaseStore.from("task_steps" as any).delete().eq("id", id);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const reorderSteps = async (listId: string, fromId: string, toId: string) => {
    const listSteps = steps
      .filter((s) => s.list_id === listId)
      .sort((a, b) => a.position - b.position);
    const fromIdx = listSteps.findIndex((s) => s.id === fromId);
    const toIdx = listSteps.findIndex((s) => s.id === toId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const reordered = arrayMove(listSteps, fromIdx, toIdx);
    setSteps((prev) => {
      const map = new Map(reordered.map((s, i) => [s.id, i]));
      return prev.map((s) => (map.has(s.id) ? { ...s, position: map.get(s.id)! } : s));
    });
    await Promise.all(
      reordered.map((s, i) =>
        firebaseStore.from("task_steps" as any).update({ position: i }).eq("id", s.id)
      )
    );
  };

  return (
    <div className="space-y-2">
      {!readOnly && (addingList ? <div className="flex items-center gap-2 rounded-xl border bg-muted/20 p-2">
          <AutoTextarea
            placeholder={T("نام چک‌لیست", "Checklist name")}
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addList();
              }
            }}
            className="text-xs flex-1 min-h-[32px] max-h-[120px] py-1.5"
            dir="auto"
            rows={1}
            minHeight={32}
            maxHeight={120}
          />
          <Button size="sm" onClick={addList} className="h-8 gap-1">
            <Plus className="w-3 h-3" /> {T("افزودن", "Add")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingList(false)} className="h-8">{T("لغو", "Cancel")}</Button>
        </div> : <Button size="sm" variant="outline" onClick={() => setAddingList(true)} className="h-8 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" />{T("چک‌لیست جدید", "New checklist")}
        </Button>)}

      {lists.map((list) => {
        const listSteps = steps
          .filter((s) => s.list_id === list.id)
          .sort((a, b) => a.position - b.position);
        return (
          <Card key={list.id} className="p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AutoTextarea
                value={list.title}
                onChange={(e) => updateList(list.id, { title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    (e.currentTarget as HTMLTextAreaElement).blur();
                  }
                }}
                className="flex-1 text-sm font-medium min-h-[28px] max-h-[120px] py-1 px-2"
                dir="auto"
                rows={1}
                minHeight={28}
                maxHeight={120}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteList(list.id)}
                className="h-7 w-7"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e: DragEndEvent) => {
                const { active, over } = e;
                if (!over || active.id === over.id) return;
                reorderSteps(list.id, String(active.id), String(over.id));
              }}
            >
              <SortableContext
                items={listSteps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-1">
                  {listSteps.map((s, idx) => (
                    <SortableStepItem
                      key={s.id}
                      id={s.id}
                      style="checkbox"
                      index={idx}
                      completed={s.completed}
                      text={s.text}
                      onToggle={() => updateStep(s.id, { completed: !s.completed })}
                      onChange={(text) => updateStep(s.id, { text })}
                      onDelete={() => deleteStep(s.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>

            <div className="flex items-start gap-2">
              <AutoTextarea
                value={newStep[list.id] || ""}
                onChange={(e) => setNewStep((st) => ({ ...st, [list.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addStep(list.id);
                  }
                }}
                placeholder={T("+ مرحلهٔ تازه…", "+ New step…")}
                className="text-xs flex-1 min-h-[28px] max-h-[120px] py-1.5"
                dir="auto"
                rows={1}
                minHeight={28}
                maxHeight={120}
              />
              <Button size="icon" variant="ghost" onClick={() => addStep(list.id)} className="h-7 w-7">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        );
      })}

    </div>
  );
}

function StepBullet({
  style, index, completed, onToggle,
}: {
  style: StepStyle; index: number; completed: boolean; onToggle: () => void;
}) {
  const { T } = useBilingual();
  if (style === "checkbox") {
    return (
      <div className="pt-1.5">
        <Checkbox checked={completed} onCheckedChange={onToggle} />
      </div>
    );
  }
  // For non-checkbox styles, clicking the bullet still toggles completion.
  let glyph: string;
  if (style === "numbered") glyph = `${index + 1}.`;
  else if (style === "bullet") glyph = "•";
  else glyph = "→"; // arrow
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`pt-1 w-6 text-sm tabular-nums text-muted-foreground hover:text-foreground select-none ${
        completed ? "line-through opacity-60" : ""
      }`}
      title={T("انجام / نیمه‌کاره", "Done / not done")}
    >
      {glyph}
    </button>
  );
}

function SortableStepItem({
  id, style, index, completed, text, onToggle, onChange, onDelete,
}: {
  id: string;
  style: StepStyle;
  index: number;
  completed: boolean;
  text: string;
  onToggle: () => void;
  onChange: (text: string) => void;
  onDelete: () => void;
}) {
  const { T } = useBilingual();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const sty = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li ref={setNodeRef} style={sty} className="flex items-start gap-1 group">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="pt-1.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label={T("جابه‌جایی", "Reorder")}
        title={T("جابه‌جایی", "Reorder")}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <StepBullet style={style} index={index} completed={completed} onToggle={onToggle} />
      <AutoTextarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        className={`text-sm flex-1 border-none bg-transparent focus-visible:ring-1 px-1 py-1 leading-relaxed ${
          completed ? "line-through text-muted-foreground" : ""
        }`}
        minHeight={28}
        maxHeight={400}
        dir="auto"
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={onDelete}
        className="h-6 w-6 opacity-60 group-hover:opacity-100"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </li>
  );
}
