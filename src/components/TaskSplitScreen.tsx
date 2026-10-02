import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Columns2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HeaderActionsPortal } from "./HeaderActionsPortal";
import { TaskDetail } from "./TaskDetail";
import { Button } from "./ui/button";
import { useResizableSplit } from "@/hooks/useResizableSplit";
import type { ConfirmState } from "@/lib/taskTypes";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "./ui/alert-dialog";

type Props = Omit<ComponentProps<typeof TaskDetail>, "task" | "mode" | "setConfirm"> & {
  task: ComponentProps<typeof TaskDetail>["task"] | null;
  children: ReactNode;
  setConfirm?: (value: ConfirmState) => void;
};
/** A task selection opens the inspector; closing it restores the full list width. */
export function TaskSplitScreen({ task, children, setConfirm, ...detail }: Props) {
  const { i18n } = useTranslation();
  const en = (i18n.language || "fa").startsWith("en");
  const [enabled, setEnabled] = useState(() => localStorage.getItem("arshnaz_tasks_split_view") !== "false");
  const [width, setWidth] = useState(0);
  const [confirm, updateConfirm] = useState<ConfirmState>(null);
  const split = useResizableSplit({ storageKey: "arshnaz_tasks_split_ratio", minRatio: 28, maxRatio: 72 });
  useEffect(() => {
    const element = split.containerRef.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(element); window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [split.containerRef]);
  const active = enabled && width >= 640 && !!task;
  const toggle = () => {
    const next = !enabled; setEnabled(next);
    localStorage.setItem("arshnaz_tasks_split_view", String(next));
  };
  return <>
    <HeaderActionsPortal><Button size="icon" variant={enabled ? "secondary" : "ghost"} onClick={toggle} disabled={width < 640}
      aria-pressed={enabled} aria-label={en ? "Split view" : "نمای دوپنله"} title={width < 640 ? (en ? "Widen the window to use split view" : "برای نمای دوپنله، عرض پنجره را بیشتر کنید") : (en ? "Split view" : "نمای دوپنله")}
      data-testid="tasks-toggle-split" className="hidden h-9 w-9 rounded-xl text-muted-foreground md:inline-flex"><Columns2 className="h-4 w-4" /></Button></HeaderActionsPortal>
    <div ref={split.containerRef} data-task-split={active ? "true" : "false"} dir="ltr" className={`flex w-full min-w-0 gap-3 ${active ? "items-start" : "flex-col"}`}>
      {active && task && <aside className="sticky top-16 h-[calc(100dvh-8rem)] shrink-0 overflow-hidden" style={{ width: `clamp(280px, ${split.splitRatio}%, calc(100% - 320px))` }}>
        <TaskDetail key={task.id} {...detail} task={task} mode="embedded" setConfirm={setConfirm || updateConfirm} />
      </aside>}
      {active && <div role="separator" aria-orientation="vertical" aria-label={en ? "Resize columns" : "تغییر عرض ستون‌ها"} onPointerDown={split.handlePointerDown} onPointerMove={split.handlePointerMove} onPointerUp={split.handlePointerUp} onPointerCancel={split.handlePointerUp} className="sticky top-16 flex h-[calc(100dvh-8rem)] w-3 shrink-0 cursor-col-resize items-center justify-center touch-none"><div className="h-12 w-1 rounded bg-border" /></div>}
      <div className="w-full min-w-0 flex-1" dir={en ? "ltr" : "rtl"}>{children}</div>
    </div>
    {!active && task && <TaskDetail key={task.id} {...detail} task={task} mode="drawer" setConfirm={setConfirm || updateConfirm} />}
    {!setConfirm && <AlertDialog open={!!confirm} onOpenChange={open => !open && updateConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{en ? "Delete task?" : "حذف تسک؟"}</AlertDialogTitle><AlertDialogDescription>{confirm?.title}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{en ? "Cancel" : "انصراف"}</AlertDialogCancel><AlertDialogAction onClick={async () => { await confirm?.onConfirm(); updateConfirm(null); }}>{en ? "Delete" : "حذف"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
  </>;
}
