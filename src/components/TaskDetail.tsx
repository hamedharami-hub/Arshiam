import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { useShareAccess } from "@/hooks/useShareAccess";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { BidiText } from "@/components/BidiText";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Sparkles, Trash2, FileText, Clock, ArrowRight, Ban,
  Folder as FolderIcon, Tag as TagIcon, Check, Calendar as CalendarIcon,
  Flag, Repeat, ListTree, Paperclip, X, Image as ImageIcon, Music, Link as LinkIcon,
  CheckSquare, ListChecks, CalendarDays, Mic, MicOff, Pin, PinOff, Maximize2, Minimize2,
  GitBranch, Zap,
  Save, ExternalLink, Loader2, Circle, CheckCircle2, MoreHorizontal,
} from "lucide-react";
import { VoiceInput } from "@/lib/voiceInput";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { TaskAIPanel } from "@/components/TaskAIPanel";
import { NoteEditorTabs } from "@/components/NoteEditorTabs";
import { TaskStepLists } from "@/components/TaskStepLists";
import { TaskSubtasksInline } from "@/components/TaskSubtasksInline";
import { TaskAttachments } from "@/components/TaskAttachments";
import { TaskDescriptionEditor } from "@/components/TaskDescriptionEditor";
import TaskActionSheet from "@/components/TaskActionSheet";
import PomodoroSheet from "@/components/PomodoroSheet";
import { TaskOutcomeSheet } from "@/components/TaskOutcomeSheet";
import { TaskOutcomesInline } from "@/components/TaskOutcomesInline";
import { DueDatePicker } from "@/components/DueDatePicker";
import { BucketPickerBody } from "@/components/BucketPickerInline";
import { bucketLabel, kindLabel } from "@/lib/timeBuckets";
import { describeRule } from "@/lib/recurrence";
import { addDays, endOfDay } from "date-fns";
import { addTaskToAndroidCalendar } from "@/lib/androidNative";

import { Switch } from "@/components/ui/switch";
import { pushUndo } from "@/lib/undoStack";
import { enqueueOp, cacheGet, cacheSet } from "@/lib/offlineQueue";
import { deleteTask as deletePersistedTask, persistTask } from "@/lib/firestoreDataService";
import type { Task, TaskNote, ConfirmState } from "@/lib/taskTypes";
import { clearTaskDraft, taskPatch, writeTaskDraft } from "@/lib/taskDraft";
import { shouldShowTaskSection } from "@/lib/taskSectionVisibility";
import { descriptionLines } from "@/lib/descriptionLines";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type TaskDetailHandle = {
  /** Flushes the current editor state before a parent route is allowed to leave. */
  savePendingChanges: (force?: boolean) => Promise<void>;
  hasPendingChanges: () => boolean;
  getCurrentTask: () => Task;
  openActions: () => void;
  setFolderId: (id: string | null) => Promise<void>;
};

export type TaskHeaderContext = {
  folderId: string | null;
  parentId: string | null;
  parentTitle: string;
  parentFolderId: string | null;
  folders: { id: string; name: string; parent_id: string | null; color: string | null }[];
};

export const TaskDetail = forwardRef<TaskDetailHandle, {
  task: Task;
  onClose: () => void;
  onChanged: () => void;
  setConfirm: (c: ConfirmState) => void;
  mode?: "sheet" | "page" | "drawer" | "embedded";
  allowDelete?: boolean;
  /** The new-task route owns its sole Save/More toolbar. */
  hidePageToolbar?: boolean;
  onHeaderContextChange?: (context: TaskHeaderContext) => void;
  onRequestFolderPicker?: () => void;
}>(function TaskDetail({ task, onClose, onChanged, setConfirm, mode = "sheet", allowDelete = false, hidePageToolbar = false, onHeaderContextChange, onRequestFolderPicker }, ref) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const { canEdit, canComment, isOwner } = useShareAccess("task", task.id, task.user_id);
  const isMobile = useIsMobile();

  const [t, setT] = useState(task);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);
  const [activeNote, setActiveNote] = useState<TaskNote | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [snap, setSnap] = useState<number | string>(0.5);
  const [folders, setFolders] = useState<{ id: string; name: string; parent_id: string | null; color: string | null }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [taskTagIds, setTaskTagIds] = useState<string[]>([]);

  const hasTimeBlock = !!(t.start_at || t.end_at || t.estimated_minutes);
  const isScheduled = !!t.due_date || !!t.reminder_at || !!t.recurrence_rule || !!t.bucket_kind || hasTimeBlock;
  const [subtaskCount, setSubtaskCount] = useState(0);
  const [stepListCount, setStepListCount] = useState(0);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [subtaskProgress, setSubtaskProgress] = useState({ completed: 0, total: 0 });
  const [tagOpen, setTagOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [showTimeBlock, setShowTimeBlock] = useState(hasTimeBlock);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceInstance, setVoiceInstance] = useState<VoiceInput | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [parentTitle, setParentTitle] = useState("");
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<{ id: string; title: string; parent_id: string | null; folder_id: string | null }[]>([]);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeCount, setOutcomeCount] = useState(0);
  const showSubtasks = shouldShowTaskSection(t.show_subtasks, subtaskCount);
  const showSteps = shouldShowTaskSection(t.show_step_lists, stepListCount);
  const showOutcomes = shouldShowTaskSection(t.show_outcomes, outcomeCount);
  const [outcomeRefresh, setOutcomeRefresh] = useState(0);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "queued" | "error">("saved");
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertMode, setConvertMode] = useState<"task" | "subtask" | "checklist">("subtask");
  const [converting, setConverting] = useState(false);
  const [conversionRevision, setConversionRevision] = useState(0);
  const [conversionUndo, setConversionUndo] = useState<{
    mode: "task" | "subtask" | "checklist"; source: string; ids: string[]; listId?: string; restored?: boolean;
  } | null>(null);
  const latestTaskRef = useRef(task);
  const savedTaskRef = useRef(task);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightSavesRef = useRef(new Set<Promise<void>>());


  useEffect(() => {
    let restored = task;
    try {
      const raw = localStorage.getItem(`arshnaz-task-draft:${task.id}`);
      if (raw) {
        const draft = JSON.parse(raw) as { task?: Partial<Task>; description?: string };
        const recovered = draft.task || (typeof draft.description === "string" ? { description: draft.description } : null);
        if (recovered) restored = { ...task, ...recovered, id: task.id };
      }
    } catch { /* corrupted drafts are ignored */ }
    setT(restored);
    setSubtaskCount(0);
    setStepListCount(0);
    setOutcomeCount(0);
    setConversionUndo(null);
    setConvertOpen(false);
    setConversionRevision(0);
    latestTaskRef.current = restored;
    savedTaskRef.current = task;
    setSaveState(Object.keys(taskPatch(restored, task)).length ? "dirty" : "saved");
  }, [task.id]);

  useEffect(() => {
    // A widget route shows an account-scoped cached task first. Adopt the
    // authoritative network refresh only while this editor is clean.
    if (task.id !== latestTaskRef.current.id) return;
    if (Object.keys(taskPatch(latestTaskRef.current, savedTaskRef.current)).length) return;
    savedTaskRef.current = task;
    latestTaskRef.current = task;
    setT(task);
  }, [task]);

  useEffect(() => { latestTaskRef.current = t; }, [t]);

  // Initialize voice input
  useEffect(() => {
    const voice = new VoiceInput({
      onTranscript: (text) => {
        setT(prev => ({ ...prev, title: prev.title ? prev.title.trimEnd() + " " + text : text }));
      },
      onError: (error) => {
        toast.error(error);
      },
      onListeningChange: (isListening) => {
        setVoiceListening(isListening);
      },
    });
    setVoiceInstance(voice);
    return () => {
      voice.stop();
    };
  }, []);

  // Auto-reveal sections that already have data so user doesn't need to tap rail icons
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [notesRes, tagsRes, subRes, stepListsRes, attachRes, outcomesRes] = await Promise.all([
        firebaseStore.from("notes").select("id,title,content").eq("task_id", task.id).order("updated_at", { ascending: false }),
        firebaseStore.from("task_tags").select("tag_id").eq("task_id", task.id),
        firebaseStore.from("tasks").select("id", { count: "exact", head: true }).eq("parent_id", task.id),
        firebaseStore.from("task_step_lists").select("id", { count: "exact", head: true }).eq("task_id", task.id),
        firebaseStore.from("task_attachments").select("id", { count: "exact", head: true }).eq("task_id", task.id),
        firebaseStore.from("task_outcomes").select("id", { count: "exact", head: true }).eq("task_id", task.id),
      ]);
      if (cancelled) return;
      const list = (notesRes.data || []) as any;
      setTaskNotes(list);
      if (list.length > 0) setShowNotes(true);
      setTaskTagIds((tagsRes.data || []).map((r: any) => r.tag_id));
      if (subRes.count !== null && subRes.count !== undefined) setSubtaskCount(subRes.count);
      if (stepListsRes.count !== null && stepListsRes.count !== undefined) setStepListCount(stepListsRes.count);
      if ((attachRes.count || 0) > 0) setShowAttachments(true);
      if (hasTimeBlock) setShowTimeBlock(true);
      setOutcomeCount(outcomesRes.count || 0);
    })();
    return () => { cancelled = true; };
  }, [task.id, hasTimeBlock]);

  // The parent-task cache makes existing child tasks visible even before an
  // online count query finishes, including when this page opens offline.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void cacheGet<Task[]>(`tasks:all:${user.id}`).then((rows) => {
      if (!cancelled && rows) setSubtaskCount(rows.filter(row => row.parent_id === task.id).length);
    });
    return () => { cancelled = true; };
  }, [task.id, user?.id]);

  useEffect(() => {
    if (!user) return;
    const loadCached = async () => {
      const [cf, ct, ca] = await Promise.all([
        cacheGet<any[]>(`folders:${user.id}`),
        cacheGet<any[]>(`tags:${user.id}`),
        cacheGet<{ id: string; title: string; parent_id: string | null; folder_id: string | null }[]>(`tasks:all:${user.id}`),
      ]);
      if (cf) setFolders(cf);
      if (ct) setTags(ct);
      if (ca) setAllTasks(ca.map(t => ({ id: t.id, title: t.title, parent_id: t.parent_id ?? null, folder_id: t.folder_id ?? null })));
    };
    loadCached();

    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    firebaseStore.from("folders").select("id,name,parent_id,color").order("position").then(({ data }) => {
      setFolders((data || []) as any);
    });
    firebaseStore.from("tags").select("id,name,color").order("name").then(({ data }) => {
      setTags((data || []) as any);
    });
    firebaseStore.from("tasks").select("id,title,parent_id,folder_id").order("title").then(({ data }) => {
      setAllTasks((data || []) as unknown as typeof allTasks);
    });
  }, [user]);

  useEffect(() => {
    if (!t.parent_id) { setParentTitle(""); setParentFolderId(null); return; }
    const cachedParent = allTasks.find(candidate => candidate.id === t.parent_id);
    setParentTitle(cachedParent?.title || "");
    setParentFolderId(cachedParent?.folder_id || null);
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    let cancelled = false;
    firebaseStore.from("tasks").select("title,folder_id").eq("id", t.parent_id).maybeSingle().then(({ data }) => {
      if (!cancelled) {
        setParentTitle((data?.title as string) || "");
        setParentFolderId((data?.folder_id as string) || null);
      }
    });
    return () => { cancelled = true; };
  }, [t.parent_id, allTasks]);

  useEffect(() => {
    onHeaderContextChange?.({ folderId: t.folder_id, parentId: t.parent_id, parentTitle, parentFolderId, folders });
  }, [t.folder_id, t.parent_id, parentTitle, parentFolderId, folders, onHeaderContextChange]);

  const parentCandidates = useMemo(() => {
    const id = t.id;
    const byId: Record<string, typeof allTasks[number]> = {};
    allTasks.forEach((x) => { byId[x.id] = x; });
    const descendants = new Set<string>();
    const collect = (root: string) => {
      allTasks.filter((x) => x.parent_id === root).forEach((x) => { descendants.add(x.id); collect(x.id); });
    };
    collect(id);
    return allTasks.filter((x) => x.id !== id && !descendants.has(x.id));
  }, [allTasks, t.id]);

  const folderName = (id: string | null): string => {
    if (!id) return T("بدون فولدر", "No folder");
    const f = folders.find(x => x.id === id);
    if (!f) return "—";
    const parent = f.parent_id ? folders.find(x => x.id === f.parent_id) : null;
    return parent ? `${parent.name} / ${f.name}` : f.name;
  };

  const generateId = () => {
    try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
  };

  const toggleTag = async (tagId: string) => {
    if (!user || !canEdit) return;
    if (taskTagIds.includes(tagId)) {
      const next = taskTagIds.filter(x => x !== tagId);
      setTaskTagIds(next);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOp({ table: "task_tags", op: "delete", match: { task_id: t.id, tag_id: tagId } });
        return;
      }
      try { await firebaseStore.from("task_tags").delete().eq("task_id", t.id).eq("tag_id", tagId); } catch { void 0; }
    } else {
      setTaskTagIds([...taskTagIds, tagId]);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOp({ table: "task_tags", op: "insert", payload: { task_id: t.id, tag_id: tagId, user_id: user.id } });
        return;
      }
      try { await firebaseStore.from("task_tags").insert({ task_id: t.id, tag_id: tagId, user_id: user.id }); } catch { void 0; }
    }
  };

  const refreshTask = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
      const { data } = await firebaseStore.from("tasks").select("*").eq("id", task.id).single();
      if (data) setT(data as any);
      onChanged();
    } catch {
      // ignore network errors while offline
    }
  };

  const refreshOutcomeCount = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
      const { count } = await firebaseStore.from("task_outcomes").select("id", { count: "exact", head: true }).eq("task_id", task.id);
      setOutcomeCount(count || 0);
      setOutcomeRefresh(n => n + 1);
    } catch {
      // ignore network errors while offline
    }
  };

  const saveTask = useCallback(async (patch: Partial<Task>, force = false) => {
    if (!canEdit) return;
    if (!force && !Object.keys(patch).length) return;
    const current = latestTaskRef.current;
    const next = { ...current, ...patch };
    latestTaskRef.current = next;
    setT(next);
    setSaveState("saving");

    const finish = (state: "saved" | "queued") => {
      savedTaskRef.current = { ...savedTaskRef.current, ...patch };
      if (!Object.keys(taskPatch(latestTaskRef.current, savedTaskRef.current)).length) clearTaskDraft(current.id);
      setSaveState(state);
      // Refreshing a parent list is helpful, but must never turn a successful
      // persistence operation into a visible save failure.
      try { void Promise.resolve(onChanged()).catch((error) => console.warn("Task refresh after save failed:", error)); }
      catch (error) { console.warn("Task refresh after save failed:", error); }
    };

    // The Firestore task service is the authoritative path. It writes the
    // local cache first, then persists to /users/{uid}/tasks/{id}; a temporary
    // cloud failure never discards an edit or traps the user in the close prompt.
    if (user) {
      try {
        const result = await persistTask(user.id, next);
        if (result === "failed") throw new Error("Task could not be saved on this device");
        finish(result);
        return;
      } catch (error) {
        setSaveState("error");
        throw error;
      }
    }

    try {
      // This is reachable only while the authentication state is temporarily
      // unavailable. Keep the edit locally instead of attempting a write with
      // no owner; the normal authenticated path above will persist it.
      const queued = await enqueueOp({ table: "tasks", op: "update", payload: patch, match: { id: current.id } });
      if (!queued) throw new Error("Task could not be queued on this device");
      finish("queued");
    } catch (e) {
      setSaveState("error");
      throw e;
    }
  }, [canEdit, onChanged, user]);

  const save = useCallback((patch: Partial<Task>, force = false) => {
    const operation = saveTask(patch, force);
    inFlightSavesRef.current.add(operation);
    void operation.finally(() => inFlightSavesRef.current.delete(operation)).catch(() => {});
    return operation;
  }, [saveTask]);

  const pendingPatch = taskPatch(t, savedTaskRef.current);
  const hasPendingChanges = Object.keys(pendingPatch).length > 0;

  const savePendingChanges = useCallback(async (force = false) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const patch = taskPatch(latestTaskRef.current, savedTaskRef.current);
    if (!force && !Object.keys(patch).length) return;
    await save(patch, force);
  }, [save]);

  const convertDescription = async () => {
    if (!user || !canEdit || converting) return;
    const source = latestTaskRef.current.description || "";
    const lines = descriptionLines(source);
    if (!lines.length || lines.length > 50) {
      toast.error(T("تعداد خط‌ها باید بین ۱ تا ۵۰ باشد", "Enter between 1 and 50 nonempty lines"));
      return;
    }
    if (!latestTaskRef.current.title.trim()) {
      toast.error(T("ابتدا عنوان تسک را وارد کن", "Add a task title first"));
      return;
    }
    if (convertMode === "checklist" && typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error(T("ساخت چک‌لیست به اینترنت نیاز دارد؛ متن شما باقی می‌ماند", "Checklist creation needs a connection; your text is unchanged"));
      return;
    }
    setConverting(true);
    const ids: string[] = [];
    let listId: string | undefined;
    try {
      // Leaving the textarea starts an immediate save; wait for that write so
      // it cannot finish after the new empty description is persisted.
      await Promise.all([...inFlightSavesRef.current]);
      await savePendingChanges(true);
      if (convertMode === "checklist") {
        listId = generateId();
        const list = await firebaseStore.from("task_step_lists").insert({
          id: listId, user_id: user.id, task_id: t.id,
          title: T("چک‌لیست", "Checklist"), style: "checkbox", position: stepListCount,
        });
        if (list.error) throw list.error;
        for (const [position, line] of lines.entries()) {
          const id = generateId();
          ids.push(id);
          const result = await firebaseStore.from("task_steps").insert({
            id, user_id: user.id, list_id: listId, text: line, completed: false, position,
          });
          if (result.error) throw result.error;
        }
      } else {
        for (const [position, title] of lines.entries()) {
          const id = generateId();
          ids.push(id);
          const result = await persistTask(user.id, {
            id, user_id: user.id, title, description: null, completed: false,
            status: "todo", priority: "none", folder_id: latestTaskRef.current.folder_id,
            parent_id: convertMode === "subtask" ? t.id : null,
            due_date: null, reminder_at: null, recurrence: "none", recurrence_rule: null,
            pinned: false, start_at: null, end_at: null, estimated_minutes: null,
            position,
          } as Task & { position: number });
          if (result === "failed") throw new Error("Task could not be saved on this device");
        }
      }
      await save({
        description: "",
        ...(convertMode === "subtask" ? { show_subtasks: true } : {}),
        ...(convertMode === "checklist" ? { show_step_lists: true } : {}),
      });
      setConversionUndo({ mode: convertMode, source, ids, listId });
      if (convertMode === "subtask") setSubtaskCount((count) => count + lines.length);
      if (convertMode === "checklist") setStepListCount((count) => count + 1);
      setConversionRevision((revision) => revision + 1);
      setConvertOpen(false);
      toast.success(T(`${lines.length} مورد ساخته شد`, `${lines.length} items created`));
    } catch (error) {
      // A partially successful batch must never consume the source text.
      if (convertMode === "checklist") {
        for (const id of ids) await firebaseStore.from("task_steps").delete().eq("id", id);
        if (listId) await firebaseStore.from("task_step_lists").delete().eq("id", listId);
      } else {
        for (const id of ids) await deletePersistedTask(user.id, id);
      }
      const restored = { ...latestTaskRef.current, description: source };
      latestTaskRef.current = restored;
      setT(restored);
      writeTaskDraft(restored);
      toast.error(T("تبدیل انجام نشد؛ متن اصلی حفظ شد", "Conversion failed; your original text is preserved"));
      console.error("Task description conversion failed:", error);
    } finally {
      setConverting(false);
    }
  };

  const undoDescriptionConversion = async () => {
    if (!user || !conversionUndo || converting) return;
    setConverting(true);
    try {
      // Restore the source before removing generated items. A failed delete
      // can leave duplicates, but it can never make the user's text vanish.
      if (!conversionUndo.restored) {
        const currentText = latestTaskRef.current.description || "";
        const restoredText = currentText.trim() ? `${conversionUndo.source.trimEnd()}\n\n${currentText}` : conversionUndo.source;
        await save({ description: restoredText });
        setConversionUndo({ ...conversionUndo, restored: true });
      }
      if (conversionUndo.mode === "checklist") {
        for (const id of conversionUndo.ids) {
          const result = await firebaseStore.from("task_steps").delete().eq("id", id);
          if (result.error) throw result.error;
        }
        if (conversionUndo.listId) {
          const result = await firebaseStore.from("task_step_lists").delete().eq("id", conversionUndo.listId);
          if (result.error) throw result.error;
        }
      } else {
        for (const id of conversionUndo.ids) {
          if (!await deletePersistedTask(user.id, id)) throw new Error("Could not remove converted task");
        }
      }
      setConversionUndo(null);
      if (conversionUndo.mode === "subtask") setSubtaskCount((count) => Math.max(0, count - conversionUndo.ids.length));
      if (conversionUndo.mode === "checklist") setStepListCount((count) => Math.max(0, count - 1));
      setConversionRevision((revision) => revision + 1);
      toast.success(T("متن توضیحات بازگردانده شد", "Description restored"));
    } catch (error) {
      console.error("Task description conversion undo failed:", error);
      toast.error(T("بازگردانی کامل نشد؛ دوباره تلاش کن", "Undo was incomplete; please retry"));
    } finally {
      setConverting(false);
    }
  };

  // A full-page creation screen owns its Back/Save buttons. Giving it one
  // awaited save boundary prevents navigation from racing the editor's debounce.
  useImperativeHandle(ref, () => ({
    savePendingChanges,
    hasPendingChanges: () => Object.keys(taskPatch(latestTaskRef.current, savedTaskRef.current)).length > 0,
    getCurrentTask: () => latestTaskRef.current,
    openActions: () => setActionMenuOpen(true),
    setFolderId: (id) => save({ folder_id: id }),
  }), [savePendingChanges, save]);

  useEffect(() => {
    if (!canEdit || !hasPendingChanges) return;
    setSaveState("dirty");
    writeTaskDraft(t);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void savePendingChanges(); }, 1200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [canEdit, hasPendingChanges, t, savePendingChanges]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") void savePendingChanges();
    };
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!Object.keys(taskPatch(latestTaskRef.current, savedTaskRef.current)).length) return;
      event.preventDefault();
      event.returnValue = "";
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [savePendingChanges]);

  const requestClose = useCallback(() => {
    if (hasPendingChanges || saveState === "saving" || saveState === "error") setClosePromptOpen(true);
    else onClose();
  }, [hasPendingChanges, saveState, onClose]);

  useEffect(() => {
    const request = () => requestClose();
    window.addEventListener("arshnaz:request-task-close", request);
    return () => window.removeEventListener("arshnaz:request-task-close", request);
  }, [requestClose]);

  const deleteTask = () => {
    setConfirm({
      kind: "task",
      id: t.id,
      title: t.title || T("بدون عنوان", "Untitled"),
      onConfirm: async () => {
        if (!user || !await deletePersistedTask(user.id, t.id)) {
          toast.error(T("حذف روی این دستگاه ذخیره نشد", "Delete could not be saved on this device"));
          return;
        }
        onClose();
        onChanged();
      },
    });
  };

  const postpone = (days: number) => {
    const base = t.due_date ? new Date(t.due_date) : endOfDay(new Date());
    const next = addDays(base, days);
    save({ due_date: next.toISOString() });
    setScheduleOpen(false);
    toast(T(`تسک به ${days} روز دیگر موکول شد`, `Task postponed by ${days} day(s)`));
  };

  const toggleCompletion = () => {
    const nextCompleted = !t.completed;
    void save({ completed: nextCompleted, status: nextCompleted ? "done" : "todo" });
  };

  const addNote = async () => {
    if (!user || !canEdit) return;
    const { data, error } = await firebaseStore.from("notes").insert({
      user_id: user.id, task_id: t.id, title: T("نوت جدید", "New note"), content: "",
    }).select().single();
    if (error) return toast.error(error.message);
    if (data) {
      setTaskNotes([data as any, ...taskNotes]);
      setActiveNote(data as any);
      setShowNotes(true);
    }
  };

  const saveNote = async (id: string, patch: Partial<TaskNote>) => {
    if (!canEdit) return;
    setTaskNotes(taskNotes.map(n => n.id === id ? { ...n, ...patch } : n));
    if (activeNote?.id === id) setActiveNote({ ...activeNote, ...patch });
    await firebaseStore.from("notes").update(patch).eq("id", id);
  };

  const askDelNote = (n: TaskNote) => {
    setConfirm({
      kind: "note", id: n.id, title: n.title || T("بدون عنوان", "Untitled"),
      onConfirm: async () => {
        const { data: snap } = await firebaseStore.from("notes").select("*").eq("id", n.id).maybeSingle();
        await firebaseStore.from("notes").delete().eq("id", n.id);
        setTaskNotes(prev => prev.filter(x => x.id !== n.id));
        if (activeNote?.id === n.id) setActiveNote(null);
        if (snap) {
          pushUndo({
            label: T(`نوت «${snap.title || "بدون عنوان"}» حذف شد`, `Note "${snap.title || "Untitled"}" deleted`),
            undo: async () => {
              await firebaseStore.from("notes").insert(snap as any);
              const { data } = await firebaseStore.from("notes").select("id,title,content").eq("task_id", task.id)
                .order("updated_at", { ascending: false });
              setTaskNotes((data || []) as any);
            },
          });
        }
      },
    });
  };

  // ── Quick chip helpers ──────────────────────────────────────────────
  const formatDue = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString(isEn ? "en-US" : "fa-IR", { month: "short", day: "numeric" });
  };

  const priorityMeta = PRIORITY_META[t.priority];
  const dueLabel = formatDue(t.due_date);
  const recLabel = t.recurrence_rule ? describeRule(t.recurrence_rule, isEn) : null;
  const scheduleLabel = (() => {
    if (t.due_date) {
      const dateStr = formatDue(t.due_date);
      if (t.reminder_at) {
        const timeStr = new Date(t.reminder_at).toLocaleTimeString(isEn ? "en-US" : "fa-IR", { hour: "2-digit", minute: "2-digit" });
        return `${dateStr} · ${timeStr}`;
      }
      return dateStr;
    }
    if (t.reminder_at) {
      return new Date(t.reminder_at).toLocaleTimeString(isEn ? "en-US" : "fa-IR", { hour: "2-digit", minute: "2-digit" });
    }
    if (t.bucket_kind && t.bucket_anchor) {
      return bucketLabel(t.bucket_kind, (t.bucket_calendar as any) || "gregorian", t.bucket_anchor, isEn ? "en" : "fa");
    }
    if (t.recurrence_rule) return recLabel;
    if (t.start_at || t.end_at) return T("تایم‌بلاک", "Time block");
    return null;
  })();
  const progressPercent = t.completed ? 100 : subtaskProgress.total
    ? Math.round((subtaskProgress.completed / subtaskProgress.total) * 100) : 0;
  const handleSubtaskProgress = useCallback((completed: number, total: number) => {
    setSubtaskProgress((current) => current.completed === completed && current.total === total
      ? current : { completed, total });
    setSubtaskCount(total);
  }, []);

  const toggleItemSection = (field: "show_subtasks" | "show_step_lists" | "show_outcomes", visible: boolean, count: number) => {
    if (visible && count > 0) {
      toast.info(T("این بخش محتوا دارد و همیشه نمایش داده می‌شود", "This section has content and stays visible"));
      return;
    }
    void save({ [field]: !visible } as Partial<Task>)
      .catch(() => toast.error(T("انتخاب این بخش ذخیره نشد", "Could not save this section choice")));
  };

  // ── Rail icon button (MD3 tonal) ────────────────────────────────────
  const RailButton = ({
    icon: Icon, label, active, badge, onClick, accent, className, disabled,
  }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`relative flex flex-col items-center justify-center gap-0 min-w-[52px] h-11 rounded-xl transition active:scale-95 disabled:opacity-50 disabled:cursor-default ${
        active
          ? accent
            ? "bg-primary/15 text-primary"
            : "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-muted/60"
      } ${className || ""}`}
    >
      <Icon className="w-4 h-4" />
      {badge != null && badge !== 0 && (
        <span className="absolute top-0.5 end-0.5 min-w-[13px] h-[13px] px-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-medium flex items-center justify-center">
          {badge}
        </span>
      )}
      <span className="text-[9px] mt-0.5 leading-none line-clamp-1 px-1 text-center">{label}</span>
    </button>
  );

  const Chip = ({ icon: Icon, children, onClick, onClear, color, disabled }: any) => (
    <span
      onClick={disabled ? undefined : onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-lg text-[11px] font-medium transition-all duration-150 border ${
        disabled
          ? "text-muted-foreground/50 border-transparent"
          : color
            ? `${color} border-current/20 shadow-2xs`
            : "bg-muted/40 text-foreground/80 hover:bg-muted/80 border-border/50 cursor-pointer shadow-2xs"
      }`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span className="truncate max-w-[130px]">{children}</span>
      {onClear && !disabled && (
        <X
          className="w-3 h-3 opacity-60 hover:opacity-100 hover:text-destructive cursor-pointer ms-0.5"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
        />
      )}
    </span>
  );

  // ── Hero (task state + title) ──────────────────────────────────────
  const hero = (
    <div className="px-1 pb-2 space-y-2">
      <div className="flex items-center gap-2 bg-card/50 dark:bg-card/30 rounded-2xl p-1.5 border border-border/50 hover:border-border/80 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200">
        <Button
          size="icon"
          variant="ghost"
          disabled={!canEdit}
          onClick={toggleCompletion}
          className={`h-10 w-10 shrink-0 rounded-xl transition-all border ${
            t.completed ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "text-muted-foreground hover:text-primary border-border/70 hover:border-primary/50 hover:bg-primary/5"
          }`}
          title={t.completed ? T("بازکردن تسک", "Reopen task") : T("تکمیل تسک", "Complete task")}
        >
          {t.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </Button>
        <AutoTextarea
          value={t.title}
          onChange={(e) => setT({ ...t, title: e.target.value })}
          onBlur={() => save({ title: t.title })}
          readOnly={!canEdit}
          minHeight={42}
          maxHeight={220}
          rows={1}
          dir="auto"
          placeholder={T("عنوان تسک را اینجا بنویس…", "Write the task title here…")}
          data-task-title
          className="text-lg md:text-xl font-bold leading-relaxed bg-transparent border-0 focus-visible:ring-0 focus-visible:bg-transparent px-2 py-1 text-foreground placeholder:text-muted-foreground/45 break-words whitespace-pre-wrap tracking-tight flex-1"
        />
        <Button
          size="icon"
          variant={voiceListening ? "default" : "ghost"}
          disabled={!canEdit}
          onClick={() => voiceInstance?.toggle(i18n.language === "en" ? "en-US" : "fa-IR")}
          className={`h-9 w-9 shrink-0 rounded-xl transition-all ${
            voiceListening ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : "text-muted-foreground/60 hover:text-foreground"
          }`}
          title={T("ضبط صوتی", "Voice input")}
        >
          {voiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
      </div>
      </div>
    );

  const descriptionSection = (
    <section className="mx-1 rounded-2xl border border-border/50 bg-card/45 p-2.5 sm:p-3" aria-label={T("متن تسک", "Task notes")}>
      {canEdit && !!descriptionLines(t.description || "").length && (
        <div className="mb-2 flex justify-end">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground" onClick={() => setConvertOpen(true)}>
            <ListChecks className="h-3.5 w-3.5" />{T("تبدیل خط‌ها", "Convert lines")}
          </Button>
        </div>
      )}
      <div data-rich-selection onContextMenu={(e) => e.preventDefault()} style={{ WebkitTouchCallout: "none" } as any}>
        <TaskDescriptionEditor
          taskId={t.id}
          value={t.description || ""}
          onChange={(v) => {
            const next = { ...latestTaskRef.current, description: v };
            latestTaskRef.current = next;
            setT(next);
            writeTaskDraft(next);
          }}
          onSave={(v) => save({ description: v })}
          readOnly={!canEdit}
        />
      </div>
      {conversionUndo && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs">
          <span>{T("خط‌ها تبدیل شدند؛ می‌توانی متن تازه بنویسی", "Lines converted; you can write new notes")}</span>
          <Button size="sm" variant="outline" disabled={converting} onClick={() => void undoDescriptionConversion()}>{T("بازگردانی", "Undo")}</Button>
        </div>
      )}
      </section>
    );

  // ── Quick-info chips row (only what's set) ──────────────────────────
  const quickChips = (
    <div className="flex flex-wrap gap-1 px-1 pb-2">
      {t.bucket_kind && t.bucket_anchor && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Chip
                  icon={CalendarDays}
                  onClear={() => save({ bucket_kind: null, bucket_calendar: null, bucket_anchor: null } as any)}
                  disabled={!canEdit}
                  color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  {kindLabel(t.bucket_kind, isEn ? "en" : "fa")} · {bucketLabel(t.bucket_kind, (t.bucket_calendar as any) || "gregorian", t.bucket_anchor, isEn ? "en" : "fa")}
                </Chip>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {T("این تسک در بازهٔ زمانی قرار دارد", "This task is in a time bucket")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {t.parent_id && !hidePageToolbar && (
        <Chip
          icon={ListTree}
          color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          onClick={() => navigate(`/app/tasks/${t.parent_id}`)}
          onClear={isOwner ? () => save({ parent_id: null }) : undefined}
          disabled={!canEdit}
        >
          {parentTitle || "—"}
        </Chip>
      )}
      {t.pinned && (
        <Chip icon={Pin} color="bg-primary/10 text-primary">
          {T("پین شده", "Pinned")}
        </Chip>
      )}
      {t.is_avoidance && (
        <Chip
          icon={Ban}
          onClear={() => save({ is_avoidance: false } as any)}
          disabled={!canEdit}
          color="bg-amber-500/15 text-amber-700 dark:text-amber-400"
        >
          {T("اجتنابی", "Avoidance")}
        </Chip>
      )}
    </div>
  );

  // ── Quick-create helpers ────────────────────────────────────────────
  const TAG_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState<string>(TAG_COLORS[5]);
  const [showFolderCreate, setShowFolderCreate] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[3]);
  const [showTagCreate, setShowTagCreate] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const createFolderAndAssign = async () => {
    if (!user || !isOwner || !newFolderName.trim()) return;
    const folderId = generateId();
    const newFolder = { id: folderId, user_id: user.id, name: newFolderName.trim(), color: newFolderColor, parent_id: null };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setFolders((f) => [...f, newFolder]);
      setNewFolderName("");
      await enqueueOp({ table: "folders", op: "insert", payload: newFolder });
      await save({ folder_id: folderId });
      toast.success(T("فولدر ساخته شد؛ با اتصال اینترنت همگام می‌شود", "Folder created — will sync when online"));
      return;
    }

    const { data, error } = await firebaseStore
      .from("folders")
      .insert({ user_id: user.id, name: newFolderName.trim(), color: newFolderColor })
      .select().single();
    if (error) return toast.error(error.message);
    setFolders((f) => [...f, data as any]);
    setNewFolderName("");
    await save({ folder_id: (data as any).id });
    toast.success(T("فولدر ساخته شد", "Folder created"));
  };

  const createTagAndAssign = async () => {
    if (!user || !canEdit || !newTagName.trim()) return;
    const tagId = generateId();
    const newTag = { id: tagId, user_id: user.id, name: newTagName.trim(), color: newTagColor };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setTags((tg) => [...tg, newTag]);
      setTaskTagIds([...taskTagIds, tagId]);
      await enqueueOp({ table: "tags", op: "insert", payload: newTag });
      await enqueueOp({ table: "task_tags", op: "insert", payload: { task_id: t.id, tag_id: tagId, user_id: user.id } });
      setNewTagName("");
      toast.success(T("تگ ساخته شد؛ با اتصال اینترنت همگام می‌شود", "Tag created — will sync when online"));
      return;
    }

    const { data, error } = await firebaseStore
      .from("tags")
      .insert({ user_id: user.id, name: newTagName.trim(), color: newTagColor })
      .select().single();
    if (error) return toast.error(error.message);
    setTags((tg) => [...tg, data as any]);
    setNewTagName("");
    await firebaseStore.from("task_tags").insert({ task_id: t.id, tag_id: (data as any).id, user_id: user.id });
    setTaskTagIds([...taskTagIds, (data as any).id]);
    toast.success(T("تگ ساخته شد", "Tag created"));
  };

  const attachLink = async () => {
    if (!user || !canEdit || !linkUrl.trim()) return;
    const url = linkUrl.trim();
    const { error } = await firebaseStore.from("task_attachments").insert({
      user_id: user.id,
      task_id: t.id,
      url,
      storage_path: "",
      file_name: url.replace(/^https?:\/\//, "").slice(0, 80),
      mime_type: "text/uri-list",
      kind: "file" as any,
      size_bytes: 0,
    } as any);
    if (error) return toast.error(error.message);
    setLinkUrl("");
    setShowAttachments(true);
    toast.success(T("لینک افزوده شد", "Link added"));
    window.dispatchEvent(new CustomEvent(`arshnaz:attach-refresh:${t.id}`));
  };

  const pickFileType = (accept: string) => {
    setShowAttachments(true);
    // Defer so the section mounts first
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(`arshnaz:attach-pick:${t.id}`, { detail: { accept } }));
    }, 50);
  };

  // ── Folder breadcrumb followed by compact task metadata ───────────
  const topControls = (
    <div className="mx-auto max-w-3xl w-full px-1 pt-1 pb-2">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {/* 1. Schedule (Date + Time block + Repeat + Bucket) */}
        <div className="order-2">
        <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={!canEdit}
              className={`w-full min-w-0 h-10 rounded-xl text-[11px] font-medium gap-1.5 justify-center px-1.5 sm:px-3 transition-all duration-150 ${isScheduled ? "bg-primary/15 text-primary border-primary/35 shadow-xs font-semibold" : "bg-muted/30 text-foreground/85 hover:bg-muted/60 border-border/60"}`}
            >
              <Clock className={`w-4 h-4 shrink-0 ${isScheduled ? "text-primary" : "text-muted-foreground"}`} />
              <span className="truncate flex-1 text-start">{scheduleLabel ?? T("زمان‌بندی", "Schedule")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="w-full max-w-2xl mx-auto rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto" aria-describedby="schedule-sheet-desc">
            <SheetHeader className="mb-3">
              <SheetTitle className="text-base">{T("زمان‌بندی تسک", "Task schedule")}</SheetTitle>
            </SheetHeader>
            <Tabs defaultValue="date">
              <TabsList className="grid grid-cols-4 w-full mb-2">
                <TabsTrigger value="date" className="text-[11px] px-1 relative">
                  {T("تاریخ", "Date")}
                  {(t.due_date || t.reminder_at) && <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
                <TabsTrigger value="block" className="text-[11px] px-1 relative">
                  {T("تایم‌بلاک", "Block")}
                  {hasTimeBlock && <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
                <TabsTrigger value="repeat" className="text-[11px] px-1 relative">
                  {T("تکرار", "Repeat")}
                  {t.recurrence_rule && <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
                <TabsTrigger value="bucket" className="text-[11px] px-1 relative">
                  {T("بازه", "Bucket")}
                  {t.bucket_kind && <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="date" className="mt-0 space-y-3">
                <DueDatePicker
                  label=""
                  value={t.due_date}
                  reminderValue={t.reminder_at}
                  onReminderChange={(iso) => save({ reminder_at: iso })}
                  onChange={(iso) => save({ due_date: iso })}
                />
                <div className="border-t pt-2">
                  <label className="text-[10px] text-muted-foreground mb-1.5 block">{T("به تعویق انداختن", "Postpone")}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 3, 7].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-2.5"
                        onClick={() => postpone(d)}
                      >
                        {d === 1 ? T("فردا", "Tomorrow") : d === 3 ? T("۳ روز دیگر", "+3 days") : T("هفته آینده", "Next week")}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="block" className="mt-0 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">{T("شروع", "Start")}</label>
                    <Input type="datetime-local" className="h-9 text-xs"
                      value={t.start_at ? t.start_at.slice(0, 16) : ""}
                      onChange={(e) => save({ start_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">{T("پایان", "End")}</label>
                    <Input type="datetime-local" className="h-9 text-xs"
                      value={t.end_at ? t.end_at.slice(0, 16) : ""}
                      onChange={(e) => save({ end_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-[10px] text-muted-foreground whitespace-nowrap">{T("تخمین (دقیقه):", "Estimate:")}</label>
                  <Input type="number" placeholder="—"
                    value={t.estimated_minutes ?? ""}
                    onChange={(e) => save({ estimated_minutes: e.target.value ? Number(e.target.value) : null } as any)}
                    className="h-8 w-20 text-xs" />
                  <div className="flex gap-1">
                    {[15, 30, 60].map(m => (
                      <button key={m} type="button"
                        onClick={() => save({ estimated_minutes: m } as any)}
                        className={`px-2 h-7 text-[10px] rounded-lg border ${t.estimated_minutes === m ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="repeat" className="mt-0">
                <RecurrenceEditor
                  value={t.recurrence_rule}
                  onChange={(rule) => save({ recurrence_rule: rule } as any)}
                />
              </TabsContent>
              <TabsContent value="bucket" className="mt-0">
                <p className="text-[10px] text-muted-foreground mb-1.5 px-1">
                  {T("بدون زمان دقیق — فقط بازه‌ای که کار باید توش انجام بشه.", "Fuzzy schedule — pick a period instead of an exact time.")}
                </p>
                <BucketPickerBody
                  value={{
                    kind: (t.bucket_kind as any) || null,
                    calendar: (t.bucket_calendar as any) || null,
                    anchor: (t.bucket_anchor as any) || null,
                  }}
                  onChange={(v) => save({
                    bucket_kind: v.kind,
                    bucket_calendar: v.calendar,
                    bucket_anchor: v.anchor,
                  } as any)}
                  onPickTimeOfDay={(hour) => {
                    const d = new Date();
                    d.setHours(hour, 0, 0, 0);
                    save({ due_date: d.toISOString() } as any);
                  }}
                />
              </TabsContent>
            </Tabs>
            <p id="schedule-sheet-desc" className="sr-only">{T("زمان‌بندی تسک", "Task scheduling")}</p>
          </SheetContent>
        </Sheet>
        </div>

        {/* 2. Priority */}
        <div className="order-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={!canEdit}
              className={`w-full min-w-0 h-10 rounded-xl text-[11px] font-medium gap-1.5 justify-center px-1.5 sm:px-3 transition-all duration-150 ${t.priority !== "none" ? `${priorityMeta.bgClass} ${priorityMeta.textClass} border-border/80 shadow-xs font-semibold` : "bg-muted/30 text-foreground/85 hover:bg-muted/60 border-border/60"}`}
            >
              <Flag className={`w-4 h-4 shrink-0 ${t.priority !== "none" ? priorityMeta.textClass : "text-muted-foreground"}`} />
              <span className="truncate flex-1 text-start">{t.priority !== "none" ? T(priorityMeta.label, priorityMeta.labelEn) : T("اولویت", "Priority")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2" align="start" side="top">
            <div className="grid grid-cols-2 gap-1.5">
              {PRIORITY_ORDER.map((p) => {
                const m = PRIORITY_META[p];
                const active = t.priority === p;
                return (
                  <button key={p} disabled={!canEdit} onClick={() => save({ priority: p })}
                    className={`px-2 h-9 rounded-xl text-[12px] font-medium transition disabled:opacity-50 disabled:cursor-default ${active ? `${m.bgClass} ${m.textClass}` : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}>
                    {m.emoji} {T(m.label, m.labelEn)}
                  </button>
                );
              })}
            </div>
            {t.priority !== "none" && (
              <button disabled={!canEdit} onClick={() => save({ priority: "none" as Priority })}
                className="w-full mt-2 h-8 rounded-lg text-xs text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-default">
                {T("حذف اولویت", "Clear priority")}
              </button>
            )}
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Ban className="w-3.5 h-3.5 text-amber-600" /> {T("اجتنابی", "Avoidance")}
              </span>
              <Switch checked={!!t.is_avoidance} onCheckedChange={(v) => save({ is_avoidance: !!v } as any)} />
            </div>
          </PopoverContent>
        </Popover>
        </div>

        {/* 3. Folder + quick-create */}
        {!hidePageToolbar && <div className="order-first col-span-3">
        <Popover open={folderOpen} onOpenChange={setFolderOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={!canEdit}
              className="w-auto max-w-full h-8 rounded-lg border-0 bg-transparent text-xs text-muted-foreground hover:bg-muted/50 gap-1.5 px-2 justify-start"
            >
              <FolderIcon className="w-4 h-4 shrink-0" style={{ color: t.folder_id ? folders.find(f => f.id === t.folder_id)?.color || undefined : undefined }} />
              <span className="truncate text-start">{t.folder_id ? folderName(t.folder_id) : T("صندوق ورودی", "Inbox")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2 max-h-[55vh] overflow-y-auto" align="start" side="top">
            {isOwner && !showFolderCreate && (
              <button
                onClick={() => setShowFolderCreate(true)}
                className="w-full flex items-center gap-2 p-2 mb-1 rounded-xl bg-muted/40 hover:bg-accent text-sm text-muted-foreground"
              >
                <Plus className="w-4 h-4" /> {T("ساخت فولدر جدید", "Create new folder")}
              </button>
            )}
            {isOwner && showFolderCreate && (
              <>
                <div className="flex items-center gap-1.5 mb-2 p-1.5 rounded-xl bg-muted/40">
                  <span className="w-6 h-6 rounded-md shrink-0" style={{ background: newFolderColor }} />
                  <Input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { createFolderAndAssign(); setShowFolderCreate(false); }
                      if (e.key === "Escape") setShowFolderCreate(false);
                    }}
                    placeholder={T("نام فولدر جدید…", "New folder name…")}
                    className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await createFolderAndAssign(); setShowFolderCreate(false); }} disabled={!newFolderName.trim()}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex gap-1 mb-2 px-1">
                  {TAG_COLORS.map(c => (
                    <button key={c} onClick={() => setNewFolderColor(c)}
                      className={`w-5 h-5 rounded-full border-2 ${newFolderColor === c ? "border-foreground" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </>
            )}
            <button
              disabled={!isOwner}
              onClick={() => save({ folder_id: null })}
              className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${t.folder_id === null ? "bg-accent" : ""}`}
            >{T("بدون فولدر (Inbox)", "No folder (Inbox)")}</button>
            {folders.filter(f => !f.parent_id).map(f => {
              const children = folders.filter(c => c.parent_id === f.id);
              return (
                <div key={f.id}>
                  <button
                    onClick={() => save({ folder_id: f.id })}
                    className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent flex items-center gap-2 ${t.folder_id === f.id ? "bg-accent" : ""}`}
                  >
                    <FolderIcon className="w-3.5 h-3.5" style={{ color: f.color || undefined }} />
                    {f.name}
                  </button>
                  {children.map(c => (
                    <button key={c.id}
                      onClick={() => save({ folder_id: c.id })}
                      className={`w-full text-start p-2 ps-6 rounded-lg text-xs hover:bg-accent flex items-center gap-2 ${t.folder_id === c.id ? "bg-accent" : ""}`}
                    >
                      <FolderIcon className="w-3 h-3" style={{ color: c.color || undefined }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>
        </div>}
        <div className="order-2 min-w-0">
        <Popover open={tagOpen} onOpenChange={setTagOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={!canEdit}
              className={`w-full min-w-0 h-10 rounded-xl text-[11px] font-medium gap-1.5 justify-center px-1.5 sm:px-3 ${taskTagIds.length ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/30 border-border/60"}`}>
              <TagIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{taskTagIds.length ? `${taskTagIds.length} ${T("تگ", "tags")}` : T("تگ", "Tags")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2 max-h-[55vh] overflow-y-auto" align="start" side="bottom">
            {!showTagCreate ? (
              <button onClick={() => setShowTagCreate(true)} className="w-full flex items-center gap-2 p-2 mb-1 rounded-xl bg-muted/40 hover:bg-accent text-sm text-muted-foreground">
                <Plus className="w-4 h-4" /> {T("ساخت تگ جدید", "Create new tag")}
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1.5 mb-2 p-1.5 rounded-xl bg-muted/40">
                  <span className="w-3 h-3 rounded-full shrink-0 ms-1" style={{ background: newTagColor }} />
                  <Input autoFocus value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { void createTagAndAssign(); setShowTagCreate(false); }
                      if (e.key === "Escape") setShowTagCreate(false);
                    }}
                    placeholder={T("نام تگ جدید…", "New tag name…")} className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0" />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await createTagAndAssign(); setShowTagCreate(false); }} disabled={!newTagName.trim()}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex gap-1 mb-2 px-1">
                  {TAG_COLORS.map(c => (
                    <button key={c} onClick={() => setNewTagColor(c)}
                      className={`w-5 h-5 rounded-full border-2 ${newTagColor === c ? "border-foreground" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </>
            )}
            {tags.map(tg => {
              const active = taskTagIds.includes(tg.id);
              return (
                <button key={tg.id} onClick={() => toggleTag(tg.id)}
                  className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent flex items-center justify-between gap-2 ${active ? "bg-accent" : ""}`}>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: tg.color || "hsl(var(--muted-foreground))" }} />
                    {tg.name}
                  </span>
                  {active && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
        </div>
      </div>
    </div>
  );

  // ── Bottom action rail ──────────────────────────────────────────────
  const bottomRail = (
    <div data-task-action-rail="true" className={`mx-auto max-w-3xl px-2 py-2 border border-border/60 bg-card/95 dark:bg-card/95 backdrop-blur-xl shadow-[0_-8px_24px_rgba(0,0,0,0.12)] ${mode === "page" ? "fixed z-30 left-2 right-2 w-auto bottom-[4.5rem] min-[600px]:bottom-[5.5rem] xl:bottom-4 rounded-2xl" : "relative z-10 shrink-0 w-full rounded-b-2xl"}`}>
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <RailButton
                  icon={Zap}
                  label={T("تمرکز", "Focus")}
                  accent
                  onClick={() => setFocusOpen(true)}
                  disabled={!canEdit}
                />
                <RailButton
                  icon={FileText}
                  label={T("نوت‌ها", "Notes")}
                  active={showNotes || taskNotes.length > 0}
                  badge={taskNotes.length || undefined}
                  onClick={() => setShowNotes(true)}
                  disabled={!canEdit}
                />
                {/* Attachments — pick file type first */}
                <Popover>
                  <PopoverTrigger asChild>
                    <span>
                      <RailButton icon={Paperclip} label={T("ضمیمه", "Attach")} active={showAttachments} disabled={!canEdit} />
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start" side="top">
                    <div className="grid grid-cols-2 gap-1.5">
                      <AttachTypeBtn icon={ImageIcon} label={T("تصویر", "Image")} onClick={() => pickFileType("image/*")} />
                      <AttachTypeBtn icon={Music} label={T("صدا", "Audio")} onClick={() => pickFileType("audio/*")} />
                      <AttachTypeBtn icon={FileText} label={T("سند", "Document")} onClick={() => pickFileType("application/pdf,.doc,.docx,.txt")} />
                      <AttachTypeBtn icon={Paperclip} label={T("هر فایلی", "Any file")} onClick={() => pickFileType("*/*")} />
                    </div>
                    <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && attachLink()}
                        placeholder={T("https://…", "https://…")}
                        className="h-8 text-xs"
                        dir="ltr"
                      />
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={attachLink} disabled={!linkUrl.trim()}>
                        {T("افزودن", "Add")}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Link parent task */}
                <Popover open={parentOpen} onOpenChange={setParentOpen}>
                  <PopoverTrigger asChild>
                    <span>
                      <RailButton icon={ListTree} label={T("تسک والد", "Parent")} active={!!t.parent_id} disabled={!canEdit} />
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2 max-h-[55vh] overflow-y-auto" align="start" side="top">
                    <button
                      disabled={!isOwner || t.parent_id === null}
                      onClick={() => { save({ parent_id: null }); setParentOpen(false); }}
                      className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${t.parent_id === null ? "bg-accent" : ""}`}
                    >
                      {T("بدون والد (سطح بالا)", "No parent (top-level)")}
                    </button>
                    {parentCandidates.map((c) => (
                      <button
                        key={c.id}
                        disabled={!canEdit || c.id === t.parent_id}
                        onClick={() => { save({ parent_id: c.id }); setParentOpen(false); }}
                        className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent truncate disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${t.parent_id === c.id ? "bg-accent" : ""}`}
                      >
                        {c.title || T("بدون عنوان", "Untitled")}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* 6. Items: Subtasks, Steps or Branches */}
                <Popover>
                  <PopoverTrigger asChild>
                    <span>
                      <RailButton
                        icon={ListChecks}
                        label={T("آیتم‌ها", "Items")}
                        active={showSubtasks || showSteps || showOutcomes}
                        badge={outcomeCount || undefined}
                        disabled={!(canEdit || canComment)}
                      />
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1.5" align="start" side="top">
                    <button
                      onClick={() => toggleItemSection("show_subtasks", showSubtasks, subtaskCount)}
                      disabled={!canEdit}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm hover:bg-accent ${showSubtasks ? "bg-accent" : ""}`}
                    >
                      <ListTree className="w-4 h-4 text-primary" />
                      <span className="flex-1 text-start">{T("زیرتسک", "Subtask")}</span>
                      {showSubtasks && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => toggleItemSection("show_step_lists", showSteps, stepListCount)}
                      disabled={!canEdit}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm hover:bg-accent ${showSteps ? "bg-accent" : ""}`}
                    >
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                      <span className="flex-1 text-start">{T("مرحله / چک‌لیست", "Step / checklist")}</span>
                      {showSteps && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => toggleItemSection("show_outcomes", showOutcomes, outcomeCount)}
                      disabled={!canEdit}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${showOutcomes ? "bg-accent" : ""}`}
                    >
                      <GitBranch className="w-4 h-4 text-amber-500" />
                      <span className="flex-1 text-start">{T("شاخه‌ها", "Branches")}</span>
                      {outcomeCount > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">{outcomeCount}</span>
                      )}
                      {showOutcomes && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </PopoverContent>
                </Popover>

                {/* AI */}
                <RailButton
                  icon={Sparkles}
                  label="AI"
                  accent
                  onClick={() => setAiOpen(true)}
                  disabled={!canEdit}
                />
                <RailButton
                  icon={MoreHorizontal}
                  label={T("بیشتر", "More")}
                  onClick={() => setActionMenuOpen(true)}
                />
              </div>

              {allowDelete && canEdit && (
                <div className="flex items-center ps-1 border-s border-border/50 shrink-0">
                  <RailButton
                    icon={Trash2}
                    label={T("حذف", "Delete")}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={deleteTask}
                  />
                </div>
              )}
      </div>
    </div>
  );

  // ── Expandable inline blocks (only when toggled) ────────────────────
  const expandables = (
    <div className="space-y-3 px-1">


      {showSubtasks && (
        <section className="rounded-2xl border border-border/50 bg-card/45 p-3 sm:p-4" aria-label={T("زیرتسک‌ها", "Subtasks")}>
          <TaskSubtasksInline
            key={`subtasks-${conversionRevision}`}
            taskId={t.id}
            onProgressChange={handleSubtaskProgress}
            readOnly={!canEdit}
            onOpenSubtask={(id) => {
              void savePendingChanges().then(() => navigate(`/app/tasks/${encodeURIComponent(id)}`))
                .catch(() => toast.error(T("ابتدا تغییرات تسک فعلی را ذخیره کن", "Save the current task before opening a subtask")));
            }}
          />
        </section>
      )}

      {showSteps && <TaskStepLists key={`steps-${conversionRevision}`} taskId={t.id} onCountChange={setStepListCount} />}

      {showOutcomes && <TaskOutcomesInline taskId={t.id} refreshKey={outcomeRefresh} onEdit={() => setOutcomeOpen(true)} />}

      {showAttachments && (
        <section className="rounded-2xl border border-border/50 bg-card/45 p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Paperclip className="h-4 w-4 text-primary" /> {T("پیوست‌ها", "Attachments")}</div>
          <TaskAttachments taskId={t.id} />
        </section>
      )}

      {(showNotes || taskNotes.length > 0) && (
        <section className="rounded-2xl border border-border/50 bg-card/45 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> {T("نوت‌ها", "Notes")} ({taskNotes.length})
            </label>
            <Button size="sm" variant="outline" onClick={addNote} disabled={!canEdit} className="gap-1 rounded-full h-7 text-xs">
              <Plus className="w-3 h-3" /> {T("جدید", "New")}
            </Button>
          </div>
          <div className="space-y-1">
            {taskNotes.map((n) => (
              <Card key={n.id} className="p-1.5 flex items-center gap-2 rounded-lg bg-card/50">
                <button className="flex-1 text-start text-sm truncate px-1" onClick={() => setActiveNote(n)}>
                  <BidiText text={n.title} />
                </button>
                {canEdit && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => askDelNote(n)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const progressPanel = (
    <div className="mx-1 mb-3 rounded-2xl border border-border/50 bg-muted/25 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-foreground/85">
          <ListChecks className="h-3.5 w-3.5 text-primary" />
          {T("پیشرفت تسک", "Task progress")}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {subtaskProgress.total
            ? T(`${subtaskProgress.completed} از ${subtaskProgress.total} زیرتسک`, `${subtaskProgress.completed} of ${subtaskProgress.total} subtasks`)
            : t.completed ? T("تکمیل شد", "Completed") : T("آمادهٔ شروع", "Ready to start")}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={progressPercent} className="h-2 flex-1" />
        <span className="w-9 text-end text-xs font-semibold tabular-nums text-primary">{progressPercent}%</span>
      </div>
    </div>
  );

  const body = (
    <div className="mt-1 task-detail-sections flex flex-col min-h-[40vh]">
      {topControls}
      {hero}
      {quickChips}
      {t.show_progress === true && progressPanel}
      {/* On a wide desktop or unfolded device, keep the writing surface and
          task structure adjacent.  The narrow layout remains a single calm
          reading flow instead of squeezing either section into a tiny column. */}
      <div className={`flex-1 min-w-0 ${mode === "page" && (showSubtasks || showSteps || showOutcomes || showAttachments || showNotes || taskNotes.length > 0) ? "min-[820px]:grid min-[820px]:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)] min-[820px]:items-start min-[820px]:gap-4" : "flex flex-col"}`}>
        <div className="min-w-0">{descriptionSection}</div>
        <div className="min-w-0 mt-3 min-[820px]:mt-0">{expandables}</div>
      </div>
    </div>
  );

  const noteEditorBody = activeNote && (
    <div className="space-y-3 mt-2">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setActiveNote(null)} className="gap-1">
          <ArrowRight className="w-4 h-4" />
          {T("بازگشت به تسک", "Back to task")}
        </Button>
      </div>
      <AutoTextarea
        value={activeNote.title}
        readOnly={!canEdit}
        onChange={(e) => saveNote(activeNote.id, { title: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            (e.currentTarget as HTMLTextAreaElement).blur();
          }
        }}
        className="border-none focus-visible:ring-0 px-0 text-lg font-semibold py-1"
        dir="auto"
        rows={1}
        minHeight={36}
        maxHeight={200}
      />
      <NoteEditorTabs
        noteId={activeNote.id}
        readOnly={!canEdit}
        markdown={activeNote.content || ""}
        onChange={(md) => saveNote(activeNote.id, { content: md })}
      />
    </div>
  );

  const addToAndroidCalendar = async () => {
    try {
      const added = await addTaskToAndroidCalendar(t);
      if (added) toast.success(T("رویداد در تقویم Android آماده شد", "Event prepared in Android Calendar"));
    } catch { toast.error(T("بازکردن تقویم ممکن نشد", "Could not open Android Calendar")); }
  };

  const saveLabel = saveState === "saving"
    ? T("در حال ذخیره…", "Saving…")
    : saveState === "dirty"
      ? T("تغییرات ذخیره‌نشده", "Unsaved changes")
      : saveState === "queued"
        ? T("آفلاین؛ برای همگام‌سازی نگه داشته شد", "Saved offline; waiting to sync")
        : saveState === "error"
          ? T("ذخیره ناموفق", "Save failed")
          : T("ذخیره شد", "Saved");

  const drawerHeader = (snap === 1 && isMobile) ? null : (
    <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
      <div className="flex items-center gap-1.5 ps-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${
          saveState === "saving" ? "bg-amber-500 animate-ping" :
          saveState === "dirty" ? "bg-amber-500" :
          saveState === "error" ? "bg-destructive" : "bg-emerald-500"
        }`} />
        <span className="text-[11px] font-medium text-muted-foreground">{saveLabel}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={hasPendingChanges || saveState === "error" ? "default" : "outline"}
          disabled={!canEdit || saveState === "saving"}
          onClick={() => void savePendingChanges()}
          className="h-8 gap-1.5 rounded-xl text-xs"
        >
          {saveState === "saving" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {T("ذخیره", "Save")}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={requestClose} title={T("بستن", "Close")}>
          <X className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-xl"
          onClick={() => { setSnap(snap === 1 ? 0.5 : 1); }}
          title={snap === 1 ? T("کوچک‌نمایی", "Collapse") : T("فول اسکرین", "Full screen")}
        >
          {snap === 1 ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={addToAndroidCalendar} title={T("افزودن به تقویم Android", "Add to Android Calendar")}>
          <CalendarDays className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => setActionMenuOpen(true)} title={T("گزینه‌های بیشتر", "More actions")}>
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const editorActions = (
    <div className="flex items-center gap-2">
      <span className={`hidden xl:inline text-[11px] ${saveState === "dirty" || saveState === "error" ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">
        {saveLabel}
      </span>
      <Button
        size="sm"
        variant={hasPendingChanges || saveState === "error" ? "default" : "outline"}
        disabled={!canEdit || saveState === "saving"}
        onClick={() => void savePendingChanges()}
        className="gap-1.5 rounded-xl text-xs font-medium"
      >
        {saveState === "saving" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        {T("ذخیره", "Save")}
      </Button>
      {mode !== "page" && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/app/tasks/${t.id}`)}
          className="gap-1.5 rounded-xl text-xs"
          title={T("بازکردن در صفحهٔ کامل", "Open full page")}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">{T("تمام صفحه", "Full page")}</span>
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setActionMenuOpen(true)}
        className="h-8 w-8 rounded-xl"
        title={T("گزینه‌های بیشتر", "More actions")}
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <>
      <AlertDialog open={convertOpen} onOpenChange={(open) => !converting && setConvertOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("تبدیل خط‌های توضیحات", "Convert description lines")}</AlertDialogTitle>
            <AlertDialogDescription>
              {T(`هر خط غیرخالی یک مورد می‌شود (${descriptionLines(t.description || "").length} مورد). پس از ساخت موفق، توضیحات خالی می‌شود و می‌توانی متن تازه بنویسی.`,
                `Each nonempty line becomes one item (${descriptionLines(t.description || "").length} items). After successful creation, the notes clear for new writing.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2" role="radiogroup" aria-label={T("نوع تبدیل", "Conversion type")}>
            {(["checklist", "subtask", "task"] as const).map((modeOption) => (
              <button key={modeOption} type="button" role="radio" aria-checked={convertMode === modeOption}
                onClick={() => setConvertMode(modeOption)}
                className={`rounded-xl border px-4 py-3 text-start text-sm ${convertMode === modeOption ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted/50"}`}>
                {modeOption === "checklist" ? T("چک‌لیست تیک‌دار", "Checklist items")
                  : modeOption === "subtask" ? T("زیرتسک‌های این تسک", "Subtasks of this task")
                    : T("تسک‌های مستقل در همین فولدر", "Separate tasks in this folder")}
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>{T("انصراف", "Cancel")}</AlertDialogCancel>
            <Button disabled={converting || !descriptionLines(t.description || "").length || descriptionLines(t.description || "").length > 50}
              onClick={() => void convertDescription()}>
              {converting && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
              {T("تبدیل", "Convert")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TaskActionSheet
        task={t}
        open={actionMenuOpen}
        onOpenChange={setActionMenuOpen}
        onComplete={toggleCompletion}
        onDelete={deleteTask}
        onMove={() => onRequestFolderPicker ? onRequestFolderPicker() : setFolderOpen(true)}
        onTags={() => setTagOpen(true)}
        onMakeChild={() => setParentOpen(true)}
        onEdit={() => document.querySelector<HTMLTextAreaElement>("[data-task-title]")?.focus()}
        onPin={() => void save({ pinned: !t.pinned })}
        onToggleProgress={() => save({ show_progress: !t.show_progress })}
        onPomodoro={() => setFocusOpen(true)}
        onPatch={(patch) => save(patch)}
        onRefresh={refreshTask}
      />
      <PomodoroSheet task={t} open={focusOpen} onOpenChange={setFocusOpen} />
      {mode === "embedded" ? (
        <div className="w-full h-full flex flex-col bg-card/90 border border-border/70 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between gap-2 bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
              <h3 className="text-sm font-semibold truncate text-foreground" dir="auto">
                {activeNote ? T("ویرایش نوت", "Edit note") : (t.title || T("بدون عنوان", "Untitled"))}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={requestClose}
              title={T("بستن پنل جزئیات", "Close details panel")}
            >
              <X className="w-4 h-4" />
            </Button>
            {editorActions}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-3">
            {activeNote ? noteEditorBody : body}
          </div>
          {bottomRail}
        </div>
      ) : mode === "page" ? (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-2 pb-16 xl:pb-8 min-h-screen flex flex-col">
          {!hidePageToolbar && <div className="sticky top-14 z-10 px-3 sm:px-4 py-2 mb-3 rounded-2xl bg-card/80 dark:bg-card/85 backdrop-blur-xl border border-border/50 shadow-xs flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground" aria-live="polite">
              <span className={`w-2 h-2 rounded-full ${
                saveState === "saving" ? "bg-amber-500 animate-ping" :
                saveState === "dirty" ? "bg-amber-500" :
                saveState === "error" ? "bg-destructive" : "bg-emerald-500"
              }`} />
              {saveLabel}
            </span>
            {editorActions}
          </div>}
          {activeNote ? noteEditorBody : body}
          {bottomRail}
        </div>
      ) : mode === "drawer" && isMobile ? (
        <Drawer open={true} onOpenChange={(v) => !v && requestClose()} snapPoints={[0.5, 1]} activeSnapPoint={snap} setActiveSnapPoint={setSnap} shouldScaleBackground={false} dismissible>
          <DrawerContent className={`h-screen max-h-screen flex flex-col !mt-0 ${snap === 1 ? "!m-0 !rounded-none" : "min-h-[55vh]"}`} aria-describedby="task-drawer-desc">
            <DrawerHeader className="px-4 pt-4 pb-1 text-center">
              <DrawerTitle className="text-base font-semibold truncate" dir="auto">
                {activeNote ? T("ویرایش نوت", "Edit note") : (t.title || T("بدون عنوان", "Untitled"))}
              </DrawerTitle>
            </DrawerHeader>
            {drawerHeader}
            <div className={`flex-1 overflow-y-auto min-h-0 px-3 pb-4 ${snap === 1 ? "" : "max-h-[50vh]"}`}>
              {activeNote ? noteEditorBody : body}
            </div>
            {bottomRail}
            <p id="task-drawer-desc" className="sr-only">{T("جزئیات و ویرایش تسک", "Task details and editing")}</p>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={true} onOpenChange={(v) => !v && requestClose()}>
          <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-hidden p-3 sm:p-4 flex flex-col">
            <SheetHeader className="mb-1 flex-row items-center justify-between gap-3 pe-8">
              <SheetTitle className="text-base font-semibold truncate text-start" dir="auto">
                {activeNote ? T("ویرایش نوت", "Edit note") : (t.title || T("بدون عنوان", "Untitled"))}
              </SheetTitle>
              {editorActions}
            </SheetHeader>
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeNote ? noteEditorBody : body}
            </div>
            {bottomRail}
          </SheetContent>
        </Sheet>
      )}

      <TaskAIPanel
        task={t as any}
        open={aiOpen}
        onOpenChange={setAiOpen}
        onMetaApplied={refreshTask}
      />

      <TaskOutcomeSheet
        task={t}
        open={outcomeOpen}
        onOpenChange={(open) => { setOutcomeOpen(open); if (!open) { refreshTask(); refreshOutcomeCount(); } }}
        folders={folders.map((f) => ({ id: f.id, name: f.name }))}
      />

      <AlertDialog open={closePromptOpen} onOpenChange={(open) => {
        setClosePromptOpen(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("تغییرات ذخیره نشده‌اند", "Changes are not saved")}</AlertDialogTitle>
            <AlertDialogDescription>
              {T("قبل از خروج، توضیحات و تغییرات این تسک ذخیره شوند؟", "Save this task's description and changes before leaving?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>{T("ادامهٔ ویرایش", "Keep editing")}</AlertDialogCancel>
            <Button variant="ghost" onClick={() => {
              clearTaskDraft(t.id);
              setClosePromptOpen(false);
              onClose();
            }}>
              {T("خروج بدون ذخیره", "Leave without saving")}
            </Button>
            <AlertDialogAction onClick={async (event) => {
              event.preventDefault();
              try {
                await savePendingChanges();
                setClosePromptOpen(false);
                onClose();
              } catch {
                toast.error(T("ذخیره انجام نشد؛ تغییرات همچنان باز هستند", "Save failed; your changes are still open"));
              }
            }}>
              <Save />
              {T("ذخیره و خروج", "Save and leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

function AttachTypeBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg bg-muted/40 hover:bg-accent active:scale-95 transition"
    >
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
