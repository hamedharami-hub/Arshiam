import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TaskDeleteConfirmDialog } from "@/components/tasks/TaskDeleteConfirmDialog";
import { reportSave } from "@/lib/saveFeedback";
import { Settings2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { useHorizonData } from "@/hooks/useHorizonData";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { HeaderActionsPortal } from "@/components/HeaderActionsPortal";
import { TaskSplitScreen } from "@/components/TaskSplitScreen";
import { TimeSettingsFields } from "@/components/horizon/TimeSettingsFields";
import { PlanningBoard } from "@/components/planning/PlanningBoard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { playCompletionFeedback } from "@/lib/completionFeedback";
import { getTimeSettings, type TimeSettings } from "@/lib/timeHorizon";
import type { ConfirmState, Task } from "@/lib/taskTypes";

export function useTimeSettings(): [TimeSettings, () => void] {
  const [s, setS] = useState<TimeSettings>(getTimeSettings);
  useEffect(() => {
    const on = () => setS(getTimeSettings());
    window.addEventListener("arsh:time-settings", on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener("arsh:time-settings", on); window.removeEventListener("storage", on); };
  }, []);
  return [s, () => setS(getTimeSettings())];
}

export default function PlanningView() {
  const { user } = useAuth();
  const { isEn } = useBilingual();
  const fa = !isEn;
  const [settings, refresh] = useTimeSettings();
  const { tasks, loading, saveTask, toggleDone } = useHorizonData(user?.id, settings);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Task | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const T = (faText: string, en: string) => (fa ? faText : en);

  useEffect(() => {
    if (selected) setSelected(tasks.find((t) => t.id === selected.id) || null);
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async (t: Task) => {
    if (!t.completed) playCompletionFeedback();
    const result = await toggleDone(t);
    if (result.kind === "study") navigate(result.navUrl);
    else if (result.kind === "advanced") toast.success(fa ? `نوبت بعدی: ${result.nextLabel} 🔁` : `Next occurrence: ${result.nextLabel} 🔁`);
    else if (result.kind === "queued") reportSave("queued", fa);
    else if (result.kind === "failed") reportSave("failed", fa);
    return result;
  }, [toggleDone, navigate, fa]);

  return (
    <TaskSplitScreen task={selected} onClose={() => setSelected(null)} onChanged={() => {}} setConfirm={setConfirm} allowDelete>
      <div className="page-shell page-shell--xl !pt-2 pb-safe-bottom" data-testid="planning-view">
        <HeaderTitlePortal title={fa ? "برنامه‌ریزی" : "Planning"} />
        <HeaderActionsPortal>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-muted-foreground" aria-label={fa ? "تنظیمات زمان" : "Time settings"} data-testid="planning-settings-btn">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3" dir={fa ? "rtl" : "ltr"}>
              <TimeSettingsFields settings={settings} fa={fa} onChanged={refresh} />
            </PopoverContent>
          </Popover>
        </HeaderActionsPortal>
        {loading ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : (
          <PlanningBoard tasks={tasks} settings={settings} fa={fa} onToggle={toggle} onUpdate={saveTask} onOpen={setSelected} />
        )}
      </div>
      <TaskDeleteConfirmDialog confirm={confirm} setConfirm={setConfirm} T={T} />
    </TaskSplitScreen>
  );
}
