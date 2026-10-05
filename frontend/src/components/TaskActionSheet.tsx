import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Task } from "@/lib/taskTypes";
import type { TaskPersistenceStatus } from "@/lib/firestoreDataService";
import { reportSave, toSaveStatus } from "@/lib/saveFeedback";
import ShareDialog from "@/components/ShareDialog";
import { TaskActivities } from "@/components/TaskActivities";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { useTodayPlanning } from "@/hooks/useTodayPlanning";
import { useShareAccess } from "@/hooks/useShareAccess";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { logTaskActivity } from "@/lib/taskActivity";
import { isFeatureEnabled } from "@/lib/capabilities";
import {
  Check, Trash2, FolderInput, Network, Pencil, Copy, Share2,
  Sparkles, CopyPlus, Pin, PinOff, Timer, ListTree, Paperclip,
  Tag as TagIcon, MoreHorizontal, MapPin, X, Flag, CircleDot,
  ArrowRight, Loader2, Save, StickyNote, History, BookOpen,
} from "lucide-react";
import { getStudyTaskNavigation, isLeitnerStudyTask } from "@/lib/taskStudyService";
import { getCurrentTaskLocation, taskLocationErrorMessage } from "@/lib/taskLocation";
import { duplicateTaskCascade } from "@/lib/taskDuplicateService";
import { getLocalDateString } from "@/lib/taskDate";
import { fetchTasks, hasServerAuthoritativeTasks } from "@/features/tasks/taskService";
import { isRecurringPrerequisite, prerequisiteReadiness, validatePrerequisiteLink } from "@/lib/taskRelations";
import { isTaskEligibleForNext, isTaskImportantForDay, isTaskScheduledInFuture, shouldWarnWipStart } from "@/lib/todayPlanning";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type View = "main" | "more" | "activities" | "subtask" | "location" | "dependencies";

interface Props {
  task: Task | null;
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onDelete: () => void;
  onMove: () => void;
  onMakeChild: () => void;
  onEdit: () => void;
  onPin?: () => Promise<TaskPersistenceStatus>;
  onPomodoro?: () => void;
  onPatch?: (patch: Partial<Task>) => Promise<TaskPersistenceStatus>;
  onRefresh?: () => void;
  canEdit?: boolean;
  isOwner?: boolean;
  canComment?: boolean;
  hideDuplicates?: boolean;
  wipEnabled?: boolean;
  wipLimit?: number;
  wipCount?: number;
  onSetWipEnabled?: (enabled: boolean) => void;
  onSetWipLimit?: (limit: number) => void;
}

export default function TaskActionSheet({
  task, open, onOpenChange, onComplete, onDelete, onMove, onMakeChild, onEdit, onPin, onPomodoro, onPatch, onRefresh,
  canEdit: propCanEdit, isOwner: propIsOwner, canComment: propCanComment,
  hideDuplicates = false,
  wipEnabled = false, wipLimit = 3, wipCount = 0, onSetWipEnabled, onSetWipLimit,
}: Props) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = getLocalDateString();
  const planning = useTodayPlanning(user?.id, today);
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const { prefersDialog } = useDeviceFormFactor();
  const [shareOpen, setShareOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [location, setLocation] = useState(task?.location || "");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [locating, setLocating] = useState(false);
  const [confirmFutureNext, setConfirmFutureNext] = useState(false);
  const [wipLimitDraft, setWipLimitDraft] = useState(String(wipLimit));
  const [knownTasks, setKnownTasks] = useState<Task[]>([]);
  const [relationshipsLoaded, setRelationshipsLoaded] = useState(false);
  const [relationshipsError, setRelationshipsError] = useState(false);
  const [waitingReason, setWaitingReason] = useState(task?.waiting_reason || "");
  const [selectedPrerequisites, setSelectedPrerequisites] = useState<string[]>(task?.prerequisite_ids || []);
  const relationshipsDirty = useRef(false);
  useEffect(() => setWipLimitDraft(String(wipLimit)), [wipLimit]);
  useEffect(() => {
    relationshipsDirty.current = false;
    setWaitingReason(task?.waiting_reason || "");
    setSelectedPrerequisites(task?.prerequisite_ids || []);
  }, [task?.id]);
  useEffect(() => {
    if (relationshipsDirty.current) return;
    setWaitingReason(task?.waiting_reason || "");
    setSelectedPrerequisites(task?.prerequisite_ids || []);
  }, [task?.id, task?.waiting_reason, task?.prerequisite_ids]);
  useEffect(() => {
    if (view !== "dependencies" || !user?.id) return;
    const uid = user.id;
    let active = true;
    setRelationshipsLoaded(false);
    setRelationshipsError(false);
    setKnownTasks([]);
    void fetchTasks(uid).then((rows) => {
      if (active) {
        setKnownTasks(rows);
        setRelationshipsLoaded(true);
        // An offline/cache snapshot cannot prove that a referenced ID was deleted.
        setRelationshipsError(!hasServerAuthoritativeTasks(uid));
      }
    }).catch(() => {
      if (active) { setKnownTasks([]); setRelationshipsLoaded(true); setRelationshipsError(true); }
    });
    return () => { active = false; };
  }, [view, user?.id]);

  const fallbackIsOwner = !!user && !!task && user.id === task.user_id;
  const isOwner = propIsOwner ?? fallbackIsOwner;
  const canEdit = propCanEdit ?? isOwner;
  const canComment = propCanComment ?? canEdit;
  if (!task) return null;

  const isScheduledLeitnerReview = isLeitnerStudyTask(task);
  const studyNavigation = getStudyTaskNavigation(task);
  const isNextTask = planning.nextTaskId === task.id;
  const isImportantToday = isTaskImportantForDay(planning.data, task.id, today);
  const eligibleForNext = isTaskEligibleForNext(task);
  const isFuture = isTaskScheduledInFuture(task, today);
  const dependencyState = useMemo(() => task ? prerequisiteReadiness(task, knownTasks) : "none", [task, knownTasks]);

  const chooseAsNext = () => {
    if (!eligibleForNext) return;
    if (isNextTask) {
      planning.clearNextTaskIf(task.id);
      return;
    }
    if (isFuture) {
      setConfirmFutureNext(true);
      return;
    }
    planning.setNextTask(task.id);
  };

  const startWork = async () => {
    if (!canEdit || busy || task.completed || task.status !== "todo") return;
    setBusy(true);
    try {
      if (shouldWarnWipStart(wipEnabled, wipCount, wipLimit, task)) {
        toast.warning(T(
          `هم‌اکنون ${wipCount} کار در حال انجام است؛ این کار هم بدون محدودیت شروع می‌شود.`,
          `${wipCount} tasks are already in progress. This task can still be started.`
        ));
      }
      const status = await applyPatch({ status: "in_progress", completed: false }, "started", { status: "in_progress" });
      reportSave(status, isEn, T("کار شروع شد", "Work started"));
      if (status !== "failed") close();
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setView("main");
    onOpenChange(false);
  };

  const backToMain = () => setView("main");

  const applyPatch = async (patch: Partial<Task>, activityAction?: string, activityPayload?: Record<string, unknown>): Promise<TaskPersistenceStatus> => {
    if (!canEdit) { toast(T("دسترسی ویرایش ندارید", "No edit permission")); return "failed"; }
    let status: TaskPersistenceStatus;
    try {
      if (onPatch) status = toSaveStatus(await onPatch(patch));
      else {
        const { error } = await firebaseStore.from("tasks").update(patch as never).eq("id", task.id);
        if (error) throw new Error(error.message);
        status = "saved";
      }
    } catch { status = "failed"; }
    if (status === "failed") return status;
    if (activityAction && user) {
      try { await logTaskActivity(task.id, user.id, activityAction, activityPayload || patch); }
      catch (error) { console.warn("Task activity after save failed:", error); }
    }
    try { onRefresh?.(); } catch (error) { console.warn("Task refresh after save failed:", error); }
    return status;
  };

  const Tile = ({ icon: Icon, label, onClick, color, disabled }: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    onClick?: () => void;
    color?: "yellow" | "green" | "blue" | "red" | "muted";
    disabled?: boolean;
  }) => {
    const colorClass =
      color === "yellow" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15" :
      color === "green" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15" :
      color === "blue" ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/15" :
      color === "red" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15" :
      "bg-muted/60 hover:bg-muted text-foreground";
    return (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition active:scale-95 ${
          disabled ? "opacity-40 cursor-not-allowed bg-muted/40 text-muted-foreground" : colorClass
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="text-[10px] leading-tight text-center">{label}</span>
      </button>
    );
  };

  const Row = ({ icon: Icon, label, onClick, disabled, value }: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    value?: string;
  }) => (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition active:scale-[0.99] ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-start text-sm">{label}</span>
      {value && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{value}</span>}
    </button>
  );

  const setWontDo = async () => {
    if (!canEdit) return;
    const next = task.status === "wont_do" ? "todo" : "wont_do";
    const status = await applyPatch({ status: next, completed: false }, next === "wont_do" ? "wont_do" : "reopened", { status: next });
    reportSave(status, isEn, next === "wont_do" ? T("علامت‌گذاری شد: انجام نمی‌شود", "Marked won't do") : T("بازگشایی شد", "Reopened"));
    if (status === "failed") return;
    close();
  };

  const handlePin = async () => {
    let status: TaskPersistenceStatus;
    try { status = onPin ? toSaveStatus(await onPin()) : await applyPatch({ pinned: !task.pinned }, "pinned", { pinned: !task.pinned }); }
    catch { status = "failed"; }
    reportSave(status, isEn);
    if (status === "failed") return;
    close();
  };

  const addSubtask = async () => {
    if (!user || !subtaskTitle.trim()) return;
    setBusy(true);
    try {
      const { error } = await firebaseStore.from("tasks").insert({
        user_id: user.id,
        parent_id: task.id,
        title: subtaskTitle.trim(),
        priority: "none",
        completed: false,
        status: "todo",
      });
      if (error) throw error;
      await logTaskActivity(task.id, user.id, "updated", { subtask_added: subtaskTitle.trim() });
      setSubtaskTitle("");
      onRefresh?.();
      onEdit();
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : T("خطا", "Error"));
    } finally {
      setBusy(false);
    }
  };

  const convertToNote = async () => {
    if (!user || !canEdit) return;
    setBusy(true);
    try {
      const { createTaskNote } = await import("@/lib/taskNotesService");
      const created = await createTaskNote(user.id, task.id, {
        title: task.title,
        content: task.description || "",
      });
      await logTaskActivity(task.id, user.id, "note_created", { note_id: created.id });
      toast.success(T("نوت ساخته شد و به تسک پیوست شد", "Note created and attached to task"));
      onRefresh?.();
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : T("خطا", "Error"));
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (andOpen = false) => {
    if (!user || !canEdit) return;
    setBusy(true);
    const toastId = toast.loading(T("در حال کپی کامل تسک…", "Duplicating task with all items…"));
    try {
      const result = await duplicateTaskCascade(user.id, task, {
        newTitle: `${task.title} (${T("کپی", "copy")})`,
      });
      if (!result.success) throw result.error || new Error(T("خطا", "Error"));
      const newId = result.newTaskId;
      onRefresh?.();
      toast.success(T("تسک با تمام زیرتسک‌ها، یادداشت‌ها و فایل‌ها کپی شد", "Task duplicated with all subtasks, notes, and files"), { id: toastId });
      if (andOpen && newId) {
        navigate(`/app/tasks/${newId}`);
      }
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : T("خطا", "Error"), { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const saveLocation = async () => {
    if (!canEdit) return;
    const status = await applyPatch({ location: location.trim() || null }, "location_set", { location: location.trim() || null });
    reportSave(status, isEn, T("موقعیت ثبت شد", "Location saved"));
    if (status === "failed") return;
    close();
  };

  const saveWaitingState = async (waiting: boolean) => {
    if (busyRef.current) return;
    const patch: Partial<Task> = waiting
      ? { status: "waiting", completed: false, waiting_reason: waitingReason.trim() || null }
      : { status: "todo", completed: false, waiting_reason: null };
    busyRef.current = true;
    setBusy(true);
    let status: TaskPersistenceStatus;
    try { status = await applyPatch(patch, waiting ? "waiting" : "reopened", patch as Record<string, unknown>); }
    catch { status = "failed"; }
    finally { busyRef.current = false; setBusy(false); }
    reportSave(status, isEn, waiting ? T("در انتظار ثبت شد", "Marked as waiting") : T("کار ادامه پیدا می‌کند", "Task resumed"));
    if (status !== "failed") { relationshipsDirty.current = false; close(); }
  };

  const savePrerequisites = async () => {
    if (busyRef.current || !relationshipsLoaded || relationshipsError) return;
    const ids = [...new Set(selectedPrerequisites)];
    const invalid = ids.find((id) => !validatePrerequisiteLink(knownTasks, task.id, id).valid);
    if (invalid) {
      toast.error(T("یکی از پیش‌نیازها دیگر معتبر نیست؛ آن را بردار یا مورد را بازبینی کن.", "A prerequisite is no longer valid. Remove it or review the task."));
      return;
    }
    busyRef.current = true;
    setBusy(true);
    let status: TaskPersistenceStatus;
    try { status = await applyPatch({ prerequisite_ids: ids }, "prerequisites_updated", { prerequisite_ids: ids }); }
    catch { status = "failed"; }
    finally { busyRef.current = false; setBusy(false); }
    reportSave(status, isEn, T("پیش‌نیازها ذخیره شد", "Prerequisites saved"));
    if (status !== "failed") { relationshipsDirty.current = false; close(); }
  };

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/app/tasks/${task.id}`;
      await navigator.clipboard.writeText(url);
      toast.success(T("لینک کپی شد", "Link copied"));
    } catch {
      toast.error(T("کپی نشد", "Could not copy"));
    }
    close();
  };

  const mainView = (
    <div className="space-y-4 animate-fade-in">
      {/* Top icon row: Pin, Share, Won't Do, Delete */}
      <div className="grid grid-cols-4 gap-2">
        <Tile
          icon={task.pinned ? PinOff : Pin}
          label={task.pinned ? T("حذف پین", "Unpin") : T("پین", "Pin")}
          onClick={handlePin}
          color="yellow"
          disabled={!canEdit}
        />
        {isFeatureEnabled("sharing") && (
          <Tile icon={Share2} label={T("اشتراک", "Share")} onClick={() => setShareOpen(true)} color="green" disabled={!isOwner} />
        )}
        <Tile
          icon={task.status === "wont_do" ? Check : X}
          label={task.status === "wont_do" ? T("بازگشایی", "Reopen") : T("انجام نمی‌شود", "Won't Do")}
          onClick={setWontDo}
          color="blue"
          disabled={!canEdit}
        />
        <Tile icon={Trash2} label={T("حذف", "Delete")} onClick={() => { onDelete(); close(); }} color="red" disabled={!isOwner} />
      </div>

      {/* Action list */}
      <div className="space-y-0.5">
        {hideDuplicates ? (
          <>
            <Row icon={CircleDot} label={T("انتظار و پیش‌نیازها", "Waiting & prerequisites")} onClick={() => setView("dependencies")} disabled={!canEdit} />
            <Row icon={StickyNote} label={T("تبدیل به یادداشت", "Convert to Note")} onClick={convertToNote} disabled={!canEdit || busy} />
            <Row icon={CopyPlus} label={T("تکثیر تسک", "Duplicate Task")} onClick={() => duplicate(false)} disabled={!canEdit || busy} />
            <Row icon={Save} label={T("تکثیر و باز کردن", "Duplicate & Open")} onClick={() => duplicate(true)} disabled={!canEdit || busy} />
            <Row icon={Copy} label={T("کپی لینک تسک", "Copy Task Link")} onClick={copyLink} />
            <Row icon={MapPin} label={T("موقعیت مکانی", "Location")} onClick={() => setView("location")} value={task.location || undefined} disabled={!canEdit} />
            <Row icon={History} label={T("فعالیت‌ها و تاریخچه", "Activity History")} onClick={() => setView("activities")} />
          </>
        ) : (
          <>
            {isScheduledLeitnerReview && !task.completed ? (
              <Row icon={BookOpen} label={T("شروع مرور لایتنر", "Open Leitner review")} onClick={() => { navigate(studyNavigation.navUrl); close(); }} disabled={!studyNavigation.navUrl} />
            ) : (
              <Row icon={Check} label={task.completed ? T("بازگشایی تکمیل", "Reopen") : T("تکمیل", "Done")} onClick={() => { onComplete(); close(); }} disabled={!canComment} />
            )}
            {eligibleForNext && (
              <Row
                icon={CircleDot}
                label={isNextTask ? T("برداشتن از کار بعدی من", "Clear my next task") : T("انتخاب به‌عنوان کار بعدی من", "Set as my next task")}
                onClick={chooseAsNext}
                disabled={!canEdit}
              />
            )}
            {eligibleForNext && !isFuture && (
              <Row
                icon={Flag}
                label={isImportantToday ? T("برداشتن نشان مهم امروز", "Unmark important today") : T("مهم امروز", "Important today")}
                onClick={() => planning.toggleImportant(task.id)}
                disabled={!canEdit}
              />
            )}
            {onSetWipEnabled && !task.completed && task.status === "todo" && !isScheduledLeitnerReview && (
              <Row icon={Timer} label={T("شروع کار", "Start work")} onClick={startWork} disabled={!canEdit || busy} />
            )}
            <Row icon={Pencil} label={T("ویرایش / باز کردن", "Edit / Open")} onClick={() => { onEdit(); close(); }} />
            <Row icon={Sparkles} label="AI" onClick={() => { navigate(`/app/tasks/${task.id}?ai=1`); close(); }} disabled={!canEdit} />
            <Row icon={Timer} label={T("پومودورو", "Pomodoro")} onClick={() => { onPomodoro?.(); close(); }} />
            <Row icon={FolderInput} label={T("انتقال", "Move")} onClick={() => { onMove(); close(); }} disabled={!canEdit} />
            <Row icon={ListTree} label={T("افزودن زیرتسک", "Add Subtask")} onClick={() => setView("subtask")} disabled={!canEdit} />
            <Row icon={CircleDot} label={T("انتظار و پیش‌نیازها", "Waiting & prerequisites")} onClick={() => setView("dependencies")} disabled={!canEdit} />
            <Row icon={Network} label={T("لینک به تسک والد", "Link Parent Task")} onClick={() => { onMakeChild(); close(); }} disabled={!canEdit} />
            <Row icon={StickyNote} label={T("تبدیل به نوت", "Convert to Note")} onClick={convertToNote} disabled={!canEdit || busy} />
            <Row icon={Paperclip} label={T("ضمیمه", "Attachment")} onClick={() => { onEdit(); close(); }} disabled={!canEdit} />
            <Row icon={TagIcon} label={T("تگ", "Tags")} onClick={() => { onEdit(); close(); }} disabled={!isOwner} />
            <Row icon={History} label={T("فعالیت‌ها", "Activities")} onClick={() => setView("activities")} />
            <Row icon={MoreHorizontal} label={T("بیشتر", "More")} onClick={() => setView("more")} />
          </>
        )}
      </div>
    </div>
  );

  const header = (title: string, onBack: () => void) => (
    <div className="flex items-center gap-2 mb-4">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
        <ArrowRight className="w-4 h-4" />
      </Button>
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );

  const renderView = () => {
    switch (view) {
      case "subtask":
        return (
          <div className="animate-fade-in space-y-3">
            {header(T("افزودن زیرتسک", "Add Subtask"), backToMain)}
            <AutoTextarea
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder={T("عنوان زیرتسک...", "Subtask title...")}
              dir="auto"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addSubtask();
                }
              }}
              rows={1}
              minHeight={40}
              maxHeight={160}
              className="min-h-[40px] max-h-[160px] py-2.5"
            />
            <Button onClick={addSubtask} disabled={!subtaskTitle.trim() || busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {T("ذخیره", "Save")}
            </Button>
          </div>
        );
      case "activities":
        return (
          <div className="animate-fade-in">
            {header(T("فعالیت‌های تسک", "Task Activities"), backToMain)}
            <TaskActivities taskId={task.id} />
          </div>
        );
      case "more":
        return (
          <div className="animate-fade-in space-y-0.5">
            {header(T("بیشتر", "More"), backToMain)}
            <Row icon={MapPin} label={T("موقعیت", "Location")} onClick={() => setView("location")} value={task.location || undefined} disabled={!canEdit} />
            <Row icon={Copy} label={T("کپی لینک", "Copy Link")} onClick={copyLink} />
            <Row icon={CopyPlus} label={T("تکثیر", "Duplicate")} onClick={() => duplicate(false)} disabled={!canEdit || busy} />
            <Row icon={Save} label={T("ذخیره و جدید", "Save & New")} onClick={() => duplicate(true)} disabled={!canEdit || busy} />
            <Row icon={Pencil} label={T("ویرایش کامل", "Full Edit")} onClick={() => { onEdit(); close(); }} />
            <Row icon={CircleDot} label={T("انتظار و پیش‌نیازها", "Waiting & prerequisites")} onClick={() => setView("dependencies")} disabled={!canEdit} />
            {onSetWipEnabled && (
              <div className="px-2 py-2.5 rounded-xl" data-testid="today-wip-settings">
                <button
                  type="button"
                  role="switch"
                  aria-checked={wipEnabled}
                  data-testid="today-wip-toggle"
                  onClick={() => onSetWipEnabled(!wipEnabled)}
                  className="w-full flex items-center gap-3 text-start"
                >
                  <Timer className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-sm">{T("هشدار تعداد کارهای در حال انجام", "Work-in-progress warning")}</span>
                  <span className={`text-xs ${wipEnabled ? "text-primary" : "text-muted-foreground"}`}>{wipEnabled ? T("روشن", "On") : T("خاموش", "Off")}</span>
                </button>
                {wipEnabled && onSetWipLimit && (
                  <label className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex-1">{T("حد پیشنهادی", "Suggested limit")}</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={wipLimitDraft}
                      aria-label={T("حد کارهای در حال انجام", "Work-in-progress limit")}
                      data-testid="today-wip-limit"
                      onChange={event => setWipLimitDraft(event.target.value)}
                      onBlur={() => {
                        const parsed = Number(wipLimitDraft);
                        if (Number.isSafeInteger(parsed) && parsed >= 1) onSetWipLimit(parsed);
                        else setWipLimitDraft(String(wipLimit));
                      }}
                      className="w-16 rounded-md border border-input bg-background px-2 py-1 text-center text-foreground"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        );
      case "location":
        return (
          <div className="animate-fade-in space-y-3">
            {header(T("موقعیت", "Location"), hideDuplicates ? backToMain : () => setView("more"))}
            <AutoTextarea
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={T("مثلاً: دفتر، خانه...", "e.g. Office, Home...")}
              dir="auto"
              rows={1}
              minHeight={40}
              maxHeight={120}
              className="min-h-[40px] max-h-[120px] py-2.5"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveLocation();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={locating}
              onClick={async () => {
                setLocating(true);
                try {
                  const current = await getCurrentTaskLocation();
                  setLocation(current.text);
                  toast.success(T("موقعیت دستگاه پیدا شد؛ برای ثبت، ذخیره را بزن.", "Device location found. Tap Save to keep it."));
                } catch (error) {
                  toast.error(taskLocationErrorMessage(error, isEn));
                } finally {
                  setLocating(false);
                }
              }}
              data-testid="task-location-current"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {T("استفاده از موقعیت فعلی دستگاه", "Use current device location")}
            </Button>
            <Button onClick={saveLocation} className="w-full">
              {T("ذخیره موقعیت", "Save Location")}
            </Button>
          </div>
        );
      case "dependencies":
        return (
          <div className="animate-fade-in space-y-3" data-testid="task-dependencies-panel">
            {header(T("انتظار و پیش‌نیازها", "Waiting & prerequisites"), backToMain)}
            <div className="space-y-2 rounded-xl bg-muted/40 p-3">
              <label className="block text-xs font-medium" htmlFor="task-waiting-reason">{T("علت انتظار (اختیاری)", "Waiting reason (optional)")}</label>
              <Textarea id="task-waiting-reason" value={waitingReason} onChange={(event) => { relationshipsDirty.current = true; setWaitingReason(event.target.value); }} rows={2} placeholder={T("منتظر چه چیزی هستی؟", "What are you waiting for?")} data-testid="task-waiting-reason" />
              <div className="flex gap-2">
                <Button type="button" className="flex-1" disabled={!canEdit || busy} onClick={() => void saveWaitingState(true)} data-testid="task-mark-waiting">{T("منتظر بماند", "Mark waiting")}</Button>
                {task.status === "waiting" && <Button type="button" variant="outline" className="flex-1" disabled={!canEdit || busy} onClick={() => void saveWaitingState(false)} data-testid="task-resume-waiting">{T("ادامهٔ کار", "Resume work")}</Button>}
              </div>
            </div>
            <section className="space-y-2" aria-label={T("پیش‌نیازها", "Prerequisites")}>
              <p className="text-xs font-medium">{T("پیش‌نیازها", "Prerequisites")}</p>
              <p className="text-[11px] leading-5 text-muted-foreground" data-testid="task-prerequisite-readiness">
                {!relationshipsLoaded ? T("در حال بارگیری تسک‌ها…", "Loading tasks…") : relationshipsError ? T("فهرست کامل تسک‌ها در دسترس نیست؛ پیش‌نیازها تغییر نکرده‌اند.", "The complete task list is unavailable; prerequisites were not changed.") : dependencyState === "ready" ? T("همهٔ پیش‌نیازها انجام شده‌اند؛ این تسک خودکار شروع یا زمان‌بندی نمی‌شود.", "All prerequisites are done. This task will not start or schedule itself.") : dependencyState === "blocked" ? T("هنوز دست‌کم یک پیش‌نیاز باز است.", "At least one prerequisite is still open.") : dependencyState === "needs_decision" ? T("پیش‌نیاز حذف‌شده، کنارگذاشته‌شده یا تکرارشونده نیاز به تصمیم تو دارد.", "A deleted, set-aside, or recurring prerequisite needs your decision.") : T("پیش‌نیازی ثبت نشده است.", "No prerequisites are linked.")}
              </p>
              {!relationshipsError && selectedPrerequisites.filter((id) => !knownTasks.some((candidate) => candidate.id === id)).map((id) => (
                <label key={id} className="flex items-center gap-2 rounded-lg border border-amber-500/30 px-2 py-1.5 text-xs">
                  <input type="checkbox" checked onChange={() => { relationshipsDirty.current = true; setSelectedPrerequisites((current) => current.filter((item) => item !== id)); }} />
                  <span className="flex-1">{T("پیش‌نیاز پیدا نشد", "Missing prerequisite")} · {id}</span>
                </label>
              ))}
              {relationshipsLoaded && !relationshipsError && knownTasks.filter((candidate) => candidate.id !== task.id).map((candidate) => {
                const selected = selectedPrerequisites.includes(candidate.id);
                const validation = validatePrerequisiteLink(knownTasks, task.id, candidate.id);
                const disabled = !selected && !validation.valid;
                return (
                  <label key={candidate.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${disabled ? "opacity-50" : "hover:bg-muted/60"}`}>
                    <input type="checkbox" checked={selected} disabled={!selected && disabled} onChange={() => { relationshipsDirty.current = true; setSelectedPrerequisites((current) => selected ? current.filter((id) => id !== candidate.id) : [...current, candidate.id]); }} />
                    <span className="min-w-0 flex-1 truncate">{candidate.title}</span>
                    {isRecurringPrerequisite(candidate) && <span className="text-muted-foreground">{T("تکراری؛ نیازمند شناسهٔ وقوع", "Recurring; occurrence ID required")}</span>}
                    {!isRecurringPrerequisite(candidate) && !validation.valid && !selected && <span className="text-muted-foreground">{T("چرخه ایجاد می‌کند", "Would create a cycle")}</span>}
                  </label>
                );
              })}
              {relationshipsLoaded && <Button type="button" variant="outline" className="w-full" disabled={!canEdit || busy || relationshipsError} onClick={() => void savePrerequisites()} data-testid="task-save-prerequisites">{T("ذخیرهٔ پیش‌نیازها", "Save prerequisites")}</Button>}
            </section>
          </div>
        );
      default:
        return mainView;
    }
  };

  return (
    <>
      {prefersDialog ? (
        <Dialog open={!!open && !shareOpen} onOpenChange={onOpenChange}>
          <DialogContent
            dir={isEn ? "ltr" : "rtl"}
            className="w-full max-w-md sm:max-w-lg max-h-[75vh] flex flex-col p-4 sm:p-5 overflow-hidden rounded-2xl"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{task.title || T("اقدامات تسک", "Task Actions")}</DialogTitle>
              <DialogDescription>{T("منوی اقدامات تسک", "Task action menu")}</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto min-h-0 flex-1 pe-1">
              {renderView()}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={!!open && !shareOpen} onOpenChange={onOpenChange} modal={false}>
          <SheetContent side="bottom" className="rounded-t-2xl pb-5 px-3 pt-4 max-h-[85vh] overflow-y-auto" dir={isEn ? "ltr" : "rtl"}>
            <SheetHeader className="sr-only">
              <SheetTitle>{task.title || T("اقدامات تسک", "Task Actions")}</SheetTitle>
            </SheetHeader>
            {renderView()}
          </SheetContent>
        </Sheet>
      )}

      <AlertDialog open={confirmFutureNext} onOpenChange={setConfirmFutureNext}>
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("این کار برای آینده برنامه‌ریزی شده است", "This task is planned for the future")}</AlertDialogTitle>
            <AlertDialogDescription>
              {T("آن را به‌عنوان کار بعدی امروز انتخاب می‌کنی؟ تاریخ برنامه‌ریزی‌شدهٔ تسک تغییر نمی‌کند.", "Choose it as your next task for today? Its planned date will stay unchanged.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T("انصراف", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { planning.setNextTask(task.id); setConfirmFutureNext(false); }}>
              {T("انتخاب بدون تغییر تاریخ", "Choose without changing date")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isFeatureEnabled("sharing") && shareOpen && (
        <ShareDialog
          open={shareOpen}
          onOpenChange={(v) => { setShareOpen(v); if (!v) onOpenChange(false); }}
          resourceType="task"
          resourceId={task.id}
          resourceTitle={task.title}
        />
      )}
    </>
  );
}
