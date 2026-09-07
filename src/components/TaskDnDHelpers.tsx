import React from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor,
  closestCenter, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CornerDownRight } from "lucide-react";

export function SortableTaskRow({ id, children }: { id: string; children: (dragHandle: any) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

export function ChildDropZone({ parentId }: { parentId: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `child:${parentId}` });
  return (
    <div
      ref={setNodeRef}
      className={`w-7 h-7 rounded-md border-2 border-dashed flex items-center justify-center transition ${isOver ? "border-primary bg-primary/10" : "border-transparent hover:border-muted-foreground/40"}`}
      title="رها کن تا زیرتسک شود"
    >
      <CornerDownRight className="w-3 h-3 text-muted-foreground" />
    </div>
  );
}

export function RootDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "root" });
  return (
    <div
      ref={setNodeRef}
      className={`text-xs text-center py-2 rounded-md border border-dashed transition ${isOver ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground/60"}`}
    >
      {isOver ? "↑ رها کن تا تسک ریشه شود" : "— ناحیه‌ی ریشه (drop here to make top-level) —"}
    </div>
  );
}

// Re-export DnD primitives so TasksView only imports from one place
export {
  DndContext, DragOverlay, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors,
};
export type { DragEndEvent, DragStartEvent };
