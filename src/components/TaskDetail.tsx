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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Sparkles, Trash2, FileText, Clock, ArrowRight, Ban,
  Folder as FolderIcon, Tag as TagIcon, Check, Calendar as CalendarIcon,
  Flag, Repeat, ListTree, Paperclip, X, Image as ImageIcon, Music, Link as LinkIcon,
  CheckSquare, ListChecks, CalendarDays, Mic, MicOff, Pin, PinOff, Maximize2, Minimize2,
  GitBranch, Zap, Brain,
  Save, ExternalLink, Loader2, Circle, CheckCircle2, MoreHorizontal,
  Copy, Share2, FolderInput, Timer, Network, Edit,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VoiceInput } from "@/lib/voiceInput";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { TaskAIPanel } from "@/components/TaskAIPanel";
import { TaskNoteEditorDialog } from "@/components/task-detail/TaskNoteEditorDialog";
import { getTaskNotes, createTaskNote, deleteTaskNote } from "@/lib/taskNotesService";
import { TaskStepLists } from "@/components/TaskStepLists";
import { TaskSubtasksInline } from "@/components/TaskSubtasksInline";
import { TaskAttachments } from "@/components/TaskAttachments";
import { TaskDescriptionEditor } from "@/components/TaskDescriptionEditor";
import TaskActionSheet from "@/components/TaskActionSheet";
import PomodoroSheet from "@/components/PomodoroSheet";
import { TaskOutcomeSheet } from "@/components/TaskOutcomeSheet";
import { TaskOutcomesInline } from "@/components/TaskOutcomesInline";
import { listTaskOutcomes } from "@/lib/taskOutcomes";
import { DueDatePicker } from "@/components/DueDatePicker";
import { BucketPickerBody } from "@/components/BucketPickerInline";
import { TaskMetaBar } from "@/components/task-detail/TaskMetaBar";
import { TaskDetailBottomRail } from "@/components/task-detail/TaskDetailBottomRail";
import { TaskCloseDialog } from "@/components/task-detail/TaskCloseDialog";
import { TaskDetailActionsMenu } from "@/components/task-detail/TaskDetailActionsMenu";
import { TaskRelatedContacts } from "@/components/task-detail/TaskRelatedContacts";
import { ContactPickerModal } from "@/components/contacts/ContactPickerModal";
import { ContactEditorDialog } from "@/components/contacts/ContactEditorDialog";
import { DeviceContactImportModal } from "@/components/contacts/DeviceContactImportModal";
import { linkTaskContact } from "@/lib/contactService";
import { TaskRelatedKnowledge } from "@/components/task-detail/TaskRelatedKnowledge";
import { TaskKnowledgeLinkModal } from "@/components/task-detail/TaskKnowledgeLinkModal";
import { getTaskKnowledgeDocs, linkTaskKnowledge, unlinkTaskKnowledge } from "@/lib/taskKnowledgeService";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
import { logTaskActivity } from "@/lib/taskActivity";
import { bucketLabel, kindLabel } from "@/lib/timeBuckets";
import { describeRule } from "@/lib/recurrence";
import { addDays, endOfDay } from "date-fns";
import { addTaskToAndroidCalendar } from "@/lib/androidNative";

import { Switch } from "@/components/ui/switch";
import { pushUndo } from "@/lib/undoStack";
import { enqueueOp, cacheGet, cacheSet } from "@/lib/offlineQueue";
import { persistTask } from "@/lib/firestoreDataService";
import { deleteTaskCascade } from "@/features/tasks/taskService";
import { buildTaskChildrenMap, collectTaskDescendantIds } from "@/features/tasks/taskTree";
import type { Task, TaskNote, ConfirmState } from "@/lib/taskTypes";
import { clearTaskDraft, taskPatch, writeTaskDraft } from "@/lib/taskDraft";
import { extractTasksFromCache } from "@/features/tasks/taskCache";
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
  requestClose: () => void;
  handleBackClick: () => void;
};

export const TaskDetail = forwardRef<TaskDetailHandle, {
  task: Task;
  onClose: () => void;
  onChanged: () => void;
  setConfirm: (c: ConfirmState) => void;
  mode?: "sheet" | "page" | "drawer" | "embedded" | "modal";
  allowDelete?: boolean;
  onSave?: () => Promise<void> | void;
  onOpenParentTask?: (parentId: string) => void;
  onBack?: () => void;
  hasBackHistory?: boolean;
}>(function TaskDetail({
  task, onClose, onChanged, setConfirm, mode = "sheet", allowDelete = false, onSave,
  onOpenParentTask, onBack, hasBackHistory,
}, ref) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const { canEdit, canComment, isOwner } = useShareAccess("task", task.id, task.user_id);
  const isMobile = useIsMobile();

  const [t, setT] = useState(task);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);
  const [editingNote, setEditingNote] = useState<TaskNote | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [snap, setSnap] = useState<number | string>(0.5);
  const [folders, setFolders] = useState<{ id: string; name: string; parent_id: string | null; color: string | null }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [taskTagIds, setTaskTagIds] = useState<string[]>([]);

  // The subtask editor is always visible: a task's hierarchy must never be hidden
  // behind a secondary rail control, including while the app is offline.
  const hasTimeBlock = !!(t.start_at || t.end_at || t.estimated_minutes);
  const isScheduled = !!t.due_date || !!t.reminder_at || !!t.recurrence_rule || !!t.bucket_kind || hasTimeBlock;
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showSteps, setShowSteps] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [subtaskProgress, setSubtaskProgress] = useState({ completed: 0, total: 0 });
  const [loadedSubtasks, setLoadedSubtasks] = useState<Array<{ id: string; title: string; completed: boolean; position: number }>>([]);
  const [tagOpen, setTagOpen] = useState(false);
  const [topTagOpen, setTopTagOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [showTimeBlock, setShowTimeBlock] = useState(hasTimeBlock);
  const [showOutcomes, setShowOutcomes] = useState(false);
  const [stepListCount, setStepListCount] = useState(0);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [linkUrl, setLinkUrl] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceInstance, setVoiceInstance] = useState<VoiceInput | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [parentTitle, setParentTitle] = useState("");
  const [allTasks, setAllTasks] = useState<{ id: string; title: string; parent_id: string | null }[]>([]);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeCount, setOutcomeCount] = useState(0);
  const [outcomeRefresh, setOutcomeRefresh] = useState(0);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "queued" | "error">("saved");
  const [saveBusy, setSaveBusy] = useState(false);
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const latestTaskRef = useRef(task);
  const savedTaskRef = useRef(task);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Add menu & Contacts modal states
  const [addCommentOpen, setAddCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [locationText, setLocationText] = useState(task.location || "");
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [deviceImportOpen, setDeviceImportOpen] = useState(false);
  const [contactsRefreshKey, setContactsRefreshKey] = useState(0);
  const [linkedKnowledgeDocs, setLinkedKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [isKnowledgeLinkModalOpen, setIsKnowledgeLinkModalOpen] = useState(false);


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
    setShowSubtasks(true);
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
      const [loadedNotes, tagsRes, subRes, stepListsRes, attachRes, outcomesRes, loadedKDocs] = await Promise.all([
        getTaskNotes(task.id, user ? user.id : ""),
        firebaseStore.from("task_tags").select("tag_id").eq("task_id", task.id),
        firebaseStore.from("tasks").select("id,title,completed,position").eq("parent_id", task.id),
        firebaseStore.from("task_step_lists").select("id", { count: "exact", head: true }).eq("task_id", task.id),
        firebaseStore.from("task_attachments").select("id", { count: "exact", head: true }).eq("task_id", task.id),
        firebaseStore.from("task_outcomes").select("id", { count: "exact", head: true }).eq("task_id", task.id),
        getTaskKnowledgeDocs(task.id, user ? user.id : ""),
      ]);
      if (cancelled) return;
      setLinkedKnowledgeDocs(loadedKDocs || []);
      setTaskNotes((prev) => {
        const map = new Map<string, TaskNote>();
        for (const n of loadedNotes) map.set(n.id, n);
        for (const p of prev) map.set(p.id, p);
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
        );
      });
      if (loadedNotes.length > 0) setShowNotes(true);
      setTaskTagIds((tagsRes.data || []).map((r: any) => r.tag_id));

      const subs = (subRes.data || []) as Array<{ id: string; title: string; completed: boolean; position: number }>;
      if (subs.length > 0) {
        setLoadedSubtasks(subs);
        setShowSubtasks(true);
        const done = subs.filter((s) => s.completed).length;
        setSubtaskProgress({ completed: done, total: subs.length });
      } else if (user) {
        // Fallback to offline cached tasks
        const cachedRaw = await cacheGet<unknown>(`tasks:all:${user.id}`);
        const cachedTasks = extractTasksFromCache(cachedRaw);
        if (cachedTasks.length > 0 && !cancelled) {
          const cachedSubs = cachedTasks.filter((ct) => ct && ct.parent_id === task.id).map((ct, i) => ({
            id: ct.id,
            title: ct.title || "",
            completed: !!ct.completed,
            position: (ct as any).position ?? i,
          }));
          if (cachedSubs.length > 0) {
            setLoadedSubtasks(cachedSubs);
            setShowSubtasks(true);
            setSubtaskProgress({ completed: cachedSubs.filter((s) => s.completed).length, total: cachedSubs.length });
          }
        }
      }

      if (cancelled) return;

      const stepCount = stepListsRes.count || 0;
      setStepListCount(stepCount);
      if (stepCount > 0) setShowSteps(true);

      const attCount = attachRes.count || 0;
      setAttachmentCount(attCount);
      if (attCount > 0) setShowAttachments(true);

      if (hasTimeBlock) setShowTimeBlock(true);

      const outCount = outcomesRes.count || 0;
      setOutcomeCount(outCount);
      if (outCount > 0) setShowOutcomes(true);
    })();
    return () => { cancelled = true; };
  }, [task.id, hasTimeBlock, user?.id]);

  useEffect(() => {
    if (!user) return;
    const loadCached = async () => {
      const [cf, ct, caRaw] = await Promise.all([
        cacheGet<any[]>(`folders:${user.id}`),
        cacheGet<any[]>(`tags:${user.id}`),
        cacheGet<unknown>(`tasks:all:${user.id}`),
      ]);
      if (Array.isArray(cf)) setFolders(cf);
      if (Array.isArray(ct)) setTags(ct);
      const ca = extractTasksFromCache(caRaw);
      if (ca.length > 0) setAllTasks(ca.map(t => ({ id: t.id, title: t.title, parent_id: t.parent_id ?? null })));
    };
    loadCached();

    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    firebaseStore.from("folders").select("id,name,parent_id,color").order("position").then(({ data }) => {
      setFolders((data || []) as any);
    });
    firebaseStore.from("tags").select("id,name,color").order("name").then(({ data }) => {
      setTags((data || []) as any);
    });
    firebaseStore.from("tasks").select("id,title,parent_id").order("title").then(({ data }) => {
      setAllTasks((data || []) as unknown as typeof allTasks);
    });
  }, [user]);

  useEffect(() => {
    if (!t.parent_id) { setParentTitle(""); return; }
    const cachedParent = allTasks.find(x => x.id === t.parent_id);
    if (cachedParent?.title) {
      setParentTitle(cachedParent.title);
    }
    firebaseStore.from("tasks").select("title").eq("id", t.parent_id).maybeSingle().then(({ data }) => {
      if (data?.title) {
        setParentTitle(data.title as string);
      } else if (!cachedParent?.title) {
        setParentTitle("—");
      }
    });
  }, [t.parent_id, allTasks]);

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

  const currentFolder = useMemo(() => {
    if (!t.folder_id) return null;
    return folders.find((f) => f.id === t.folder_id) || null;
  }, [t.folder_id, folders]);

  const taskFolderLabel = useMemo(() => {
    if (!t.folder_id) return T("اینباکس", "Inbox");
    if (!currentFolder) return T("پوشه…", "Folder…");
    const parent = currentFolder.parent_id ? folders.find((x) => x.id === currentFolder.parent_id) : null;
    return parent ? `${parent.name} / ${currentFolder.name}` : currentFolder.name;
  }, [t.folder_id, currentFolder, folders, T]);

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
      try {
        const { error } = await firebaseStore.from("task_tags").delete().eq("task_id", t.id).eq("tag_id", tagId);
        if (error) throw error;
      } catch (err) {
        console.warn("[TaskDetail] Failed to delete tag link online, queueing:", err);
        await enqueueOp({ table: "task_tags", op: "delete", match: { task_id: t.id, tag_id: tagId } });
      }
    } else {
      setTaskTagIds([...taskTagIds, tagId]);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOp({ table: "task_tags", op: "insert", payload: { task_id: t.id, tag_id: tagId, user_id: user.id } });
        return;
      }
      try {
        const { error } = await firebaseStore.from("task_tags").insert({ task_id: t.id, tag_id: tagId, user_id: user.id });
        if (error) throw error;
      } catch (err) {
        console.warn("[TaskDetail] Failed to insert tag link online, queueing:", err);
        await enqueueOp({ table: "task_tags", op: "insert", payload: { task_id: t.id, tag_id: tagId, user_id: user.id } });
      }
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
    try {
      const outcomes = await listTaskOutcomes(task.id);
      setOutcomeCount(outcomes.length);
      if (outcomes.length > 0) setShowOutcomes(true);
      setOutcomeRefresh(n => n + 1);
    } catch {
      // fallback to store count if needed
      try {
        const { count } = await firebaseStore.from("task_outcomes").select("id", { count: "exact", head: true }).eq("task_id", task.id);
        setOutcomeCount(count || 0);
        if ((count || 0) > 0) setShowOutcomes(true);
      } catch {
        // ignore network errors while offline
      }
    }
  };

  const refreshStepListCount = async () => {
    try {
      const { count } = await firebaseStore.from("task_step_lists").select("id", { count: "exact", head: true }).eq("task_id", task.id);
      setStepListCount(count || 0);
      if ((count || 0) > 0) setShowSteps(true);
    } catch {
      // ignore network errors while offline
    }
  };

  const save = useCallback(async (patch: Partial<Task>, force = false) => {
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

  const pendingPatch = taskPatch(t, savedTaskRef.current);
  const hasPendingChanges = Object.keys(pendingPatch).length > 0;

  const savePendingChanges = useCallback(async (force = false) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const patch = taskPatch(latestTaskRef.current, savedTaskRef.current);
    if (!force && !Object.keys(patch).length) return;
    await save(patch, force);
  }, [save]);

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

  const handleSaveClick = useCallback(async () => {
    if (onSave) {
      try {
        setSaveBusy(true);
        await onSave();
      } finally {
        setSaveBusy(false);
      }
    } else {
      try {
        setSaveBusy(true);
        await savePendingChanges(true);
        toast.success(T("تغییرات ذخیره شد", "Changes saved"));
      } catch {
        // error already handled in savePendingChanges
      } finally {
        setSaveBusy(false);
      }
    }
  }, [onSave, savePendingChanges, T]);

  const handleBackClick = useCallback(() => {
    if (closePromptOpen) { setClosePromptOpen(false); return; }
    if (actionMenuOpen) { setActionMenuOpen(false); return; }
    if (focusOpen) { setFocusOpen(false); return; }
    if (aiOpen) { setAiOpen(false); return; }
    if (outcomeOpen) { setOutcomeOpen(false); return; }
    if (folderOpen) { setFolderOpen(false); return; }
    if (parentOpen) { setParentOpen(false); return; }
    if (scheduleOpen) { setScheduleOpen(false); return; }
    if (tagOpen || topTagOpen) { setTagOpen(false); setTopTagOpen(false); return; }
    if (editingNote) { setEditingNote(null); return; }
    if (isAddingNote) { setIsAddingNote(false); setNewNoteTitle(""); setNewNoteContent(""); return; }

    if (hasPendingChanges || saveState === "saving" || saveState === "error") {
      requestClose();
      return;
    }

    if (onBack) {
      onBack();
    } else if (onSave) {
      onClose();
    } else {
      requestClose();
    }
  }, [
    closePromptOpen, actionMenuOpen, focusOpen, aiOpen, outcomeOpen,
    folderOpen, parentOpen, scheduleOpen, tagOpen, topTagOpen, editingNote, isAddingNote,
    hasPendingChanges, saveState, onBack, onSave, onClose, requestClose,
  ]);

  // A full-page creation screen owns its Back/Save buttons. Giving it one
  // awaited save boundary prevents navigation from racing the editor's debounce.
  useImperativeHandle(ref, () => ({
    savePendingChanges,
    hasPendingChanges: () => Object.keys(taskPatch(latestTaskRef.current, savedTaskRef.current)).length > 0,
    getCurrentTask: () => latestTaskRef.current,
    requestClose,
    handleBackClick,
  }), [savePendingChanges, requestClose, handleBackClick]);

  useEffect(() => {
    const request = (e: Event) => {
      e.preventDefault();
      handleBackClick();
    };
    window.addEventListener("arshnaz:request-task-close", request);
    return () => window.removeEventListener("arshnaz:request-task-close", request);
  }, [handleBackClick]);

  const deleteTask = async () => {
    if (!user) return;
    let allTasks: Task[] = [];
    try {
      const cachedRaw = await cacheGet<unknown>(`tasks:all:${user.id}`);
      allTasks = extractTasksFromCache(cachedRaw);
    } catch {}
    const childrenMap = buildTaskChildrenMap(allTasks);
    const descendants = collectTaskDescendantIds(t.id, childrenMap).filter(id => id !== t.id);
    const childCount = descendants.length;

    setConfirm({
      kind: "task",
      id: t.id,
      title: t.title || T("بدون عنوان", "Untitled"),
      childCount,
      onConfirm: async () => {
        const res = await deleteTaskCascade(user.id, t.id, allTasks);
        if (!res.success) {
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

  const handleCancelNewNote = () => {
    setIsAddingNote(false);
    setNewNoteTitle("");
    setNewNoteContent("");
  };

  const handleSaveNewNote = async () => {
    if (!user || !canEdit || noteSaving) return;
    const trimmedTitle = newNoteTitle.trim();
    const trimmedContent = newNoteContent.trim();
    if (!trimmedTitle && !trimmedContent) {
      toast.error(T("عنوان یا متن نوت نباید خالی باشد", "Title or content cannot be empty"));
      return;
    }
    setNoteSaving(true);
    try {
      const created = await createTaskNote(user.id, t.id, {
        title: trimmedTitle || trimmedContent.slice(0, 40) || T("یادداشت", "Note"),
        content: trimmedContent,
      });
      setTaskNotes(prev => [created, ...prev.filter(n => n.id !== created.id)]);
      toast.success(T("نوت اضافه شد", "Note added"));
      handleCancelNewNote();
      setShowNotes(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : T("خطا در ایجاد نوت", "Error creating note"));
    } finally {
      setNoteSaving(false);
    }
  };

  const askDelNote = (n: TaskNote) => {
    if (!user || !canEdit) return;
    setConfirm({
      kind: "note",
      id: n.id,
      title: n.title || T("بدون عنوان", "Untitled"),
      onConfirm: async () => {
        try {
          const existingNote = taskNotes.find(x => x.id === n.id) || n;
          await deleteTaskNote(user.id, n.id, t.id);
          setTaskNotes(prev => prev.filter(x => x.id !== n.id));
          toast.success(T("نوت حذف شد", "Note deleted"));
          pushUndo({
            label: T(`نوت «${existingNote.title || "بدون عنوان"}» حذف شد`, `Note "${existingNote.title || "Untitled"}" deleted`),
            undo: async () => {
              await firebaseStore.from("notes").insert(existingNote as any);
              const list = await getTaskNotes(t.id, user.id);
              setTaskNotes(list);
            },
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : T("خطا در حذف نوت", "Error deleting note"));
        }
      },
    });
  };

  const handleLinkKnowledge = async (doc: KnowledgeDocument) => {
    if (!user?.id || !t.id) return;
    try {
      await linkTaskKnowledge(user.id, t.id, doc.id);
      setLinkedKnowledgeDocs((prev) => {
        if (prev.some((d) => d.id === doc.id)) return prev;
        return [...prev, doc];
      });
      toast.success(T("سند آموزشی به تسک متصل شد", "Knowledge doc linked to task"));
    } catch (e) {
      toast.error(T("خطا در اتصال سند", "Error linking doc"));
    }
  };

  const handleUnlinkKnowledge = async (docId: string) => {
    if (!user?.id || !t.id) return;
    try {
      await unlinkTaskKnowledge(user.id, t.id, docId);
      setLinkedKnowledgeDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success(T("اتصال سند حذف شد", "Knowledge doc unlinked"));
    } catch (e) {
      toast.error(T("خطا در قطع اتصال سند", "Error unlinking doc"));
    }
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
  const handleSubtaskProgress = useCallback((completed: number, total: number) => {
    setSubtaskProgress((current) => current.completed === completed && current.total === total
      ? current : { completed, total });
  }, []);

  const Chip = ({ icon: Icon, children, onClick, onClear, color, disabled, title }: any) => (
    <span
      onClick={disabled ? undefined : onClick}
      title={title}
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
          ref={titleInputRef}
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
    <section className="mx-1">
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
      {t.parent_id && (
        <Chip
          icon={ListTree}
          color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          onClick={() => {
            void savePendingChanges().then(() => {
              if (onOpenParentTask) {
                onOpenParentTask(t.parent_id!);
              } else {
                navigate(`/app/tasks/${encodeURIComponent(t.parent_id!)}?from=${encodeURIComponent(t.id)}`);
              }
            });
          }}
          onClear={isOwner ? () => save({ parent_id: null }) : undefined}
          disabled={!canEdit}
          title={T("رفتن به تسک مادر", "Go to parent task")}
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
      {t.source_type && (
        <Chip
          icon={Brain}
          color="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
          onClick={() => {
            if (t.source_type === "cbt_thought") navigate("/app/thoughts");
            else if (t.source_type === "abc_model") navigate("/app/abc");
            else if (t.source_type === "worry_tree") navigate("/app/worry");
            else if (t.source_type === "values_goal") navigate("/app/values");
            else navigate("/app/mind");
          }}
          title={T("مشاهده مبدا در ذهن", "View origin in Mind")}
        >
          {t.source_type === "cbt_thought" ? T("ثبت فکر (CBT)", "CBT Thought")
            : t.source_type === "abc_model" ? T("مدل رفتار (ABC)", "ABC Model")
            : t.source_type === "worry_tree" ? T("درخت نگرانی", "Worry Tree")
            : t.source_type === "values_goal" ? T("ارزش‌ها (ACT)", "Values (ACT)")
            : T("ذهن", "Mind")}
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
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(`arshnaz:attach-pick:${t.id}`, { detail: { accept } }));
    }, 50);
  };

  const topControls = (
    <TaskMetaBar
      t={t}
      canEdit={canEdit}
      isOwner={isOwner}
      folders={folders}
      folderOpen={folderOpen}
      setFolderOpen={setFolderOpen}
      folderName={folderName}
      scheduleOpen={scheduleOpen}
      setScheduleOpen={setScheduleOpen}
      isScheduled={isScheduled}
      scheduleLabel={scheduleLabel}
      hasTimeBlock={hasTimeBlock}
      priorityMeta={priorityMeta}
      topTagOpen={topTagOpen}
      setTopTagOpen={setTopTagOpen}
      taskTagIds={taskTagIds}
      tags={tags}
      toggleTag={toggleTag}
      createTagAndAssign={createTagAndAssign}
      createFolderAndAssign={createFolderAndAssign}
      save={save}
      postpone={postpone}
      T={T}
      showFolderCreate={showFolderCreate}
      setShowFolderCreate={setShowFolderCreate}
      newFolderName={newFolderName}
      setNewFolderName={setNewFolderName}
      newFolderColor={newFolderColor}
      setNewFolderColor={setNewFolderColor}
      showTagCreate={showTagCreate}
      setShowTagCreate={setShowTagCreate}
      newTagName={newTagName}
      setNewTagName={setNewTagName}
      newTagColor={newTagColor}
      setNewTagColor={setNewTagColor}
      TAG_COLORS={TAG_COLORS}
    />
  );


  // ── Expandable inline blocks (only when toggled) ────────────────────
  const expandables = (
    <div className="space-y-3 px-1">
      {showSubtasks && (
        <section className="rounded-2xl border border-border/50 bg-card/45 p-3 sm:p-4 transition-all" aria-label={T("زیرتسک‌ها", "Subtasks")}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ListTree className="h-4 w-4 text-primary" />
              {T("زیرتسک‌ها", "Subtasks")}
              {subtaskProgress.total > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {subtaskProgress.completed}/{subtaskProgress.total}
                </span>
              )}
            </h3>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowSubtasks(false)}
              title={T("بستن بخش زیرتسک‌ها", "Collapse subtasks section")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <TaskSubtasksInline
            taskId={t.id}
            initialSubs={loadedSubtasks}
            onProgressChange={handleSubtaskProgress}
            readOnly={!canEdit}
            onOpenSubtask={(id) => {
              void savePendingChanges().then(() => {
                if (onOpenParentTask) {
                  onOpenParentTask(id);
                } else {
                  navigate(`/app/tasks/${encodeURIComponent(id)}?from=${encodeURIComponent(t.id)}`);
                }
              }).catch(() => toast.error(T("ابتدا تغییرات تسک فعلی را ذخیره کن", "Save the current task before opening a subtask")));
            }}
          />
        </section>
      )}

      {showSteps && (
        <section className="rounded-2xl border border-border/50 bg-card/45 p-3 sm:p-4 transition-all" aria-label={T("چک‌لیست و مراحل", "Checklist & Steps")}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CheckSquare className="h-4 w-4 text-emerald-500" />
              {T("چک‌لیست و مراحل", "Checklists & Steps")}
              {stepListCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                  {stepListCount}
                </span>
              )}
            </h3>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowSteps(false)}
              title={T("بستن بخش چک‌لیست", "Collapse checklist section")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <TaskStepLists taskId={t.id} onCountChange={setStepListCount} readOnly={!canEdit} />
        </section>
      )}

      {showOutcomes && (
        <section className="rounded-2xl border border-border/50 bg-card/45 p-3 sm:p-4 transition-all" aria-label={T("شاخه‌ها و سناریوها", "Branches & Outcomes")}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <GitBranch className="h-4 w-4 text-amber-500" />
              {T("شاخه‌ها و سناریوهای تصمیم‌گیری", "Decision Branches & Scenarios")}
              {outcomeCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                  {outcomeCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px] gap-1 rounded-lg"
                  onClick={() => setOutcomeOpen(true)}
                >
                  <Plus className="w-3 h-3" />
                  {T("مدیریت شاخه‌ها", "Manage branches")}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setShowOutcomes(false)}
                title={T("بستن بخش شاخه‌ها", "Collapse branches section")}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <TaskOutcomesInline
            taskId={t.id}
            refreshKey={outcomeRefresh}
            onEdit={() => setOutcomeOpen(true)}
            onCountChange={setOutcomeCount}
          />
        </section>
      )}

      {showAttachments && (
        <section className="rounded-2xl border border-border/50 bg-card/45 p-3 sm:p-4 transition-all">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Paperclip className="h-4 w-4 text-primary" />
              {T("پیوست‌ها", "Attachments")}
              {attachmentCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {attachmentCount}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowAttachments(false)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <TaskAttachments taskId={t.id} onCountChange={setAttachmentCount} />
        </section>
      )}

      {(showNotes || taskNotes.length > 0 || isAddingNote) && (
        <section className="rounded-2xl border border-border/50 bg-card/45 p-3 sm:p-4 transition-all">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>{T("نوت‌ها", "Notes")}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                {taskNotes.length}
              </span>
            </label>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowNotes(true);
                  setIsAddingNote(true);
                }}
                disabled={!canEdit}
                className="gap-1 rounded-full h-7 text-xs font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>{T("جدید", "New")}</span>
              </Button>
              {taskNotes.length === 0 && !isAddingNote && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNotes(false)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Compact in-panel note creation form */}
          {isAddingNote && (
            <div className="p-3 mb-2.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2 animate-in fade-in duration-150">
              <Input
                placeholder={T("عنوان نوت (اختیاری)...", "Note title (optional)...")}
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                disabled={noteSaving}
                className="h-8 text-xs sm:text-sm bg-background/80"
                dir="auto"
                autoFocus
              />
              <AutoTextarea
                placeholder={T("متن نوت را بنویسید...", "Write note content...")}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                disabled={noteSaving}
                className="text-xs sm:text-sm bg-background/80 min-h-[64px] rounded-lg p-2"
                dir="auto"
                minHeight={64}
                maxHeight={160}
              />
              <div className="flex items-center justify-end gap-2 pt-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={noteSaving}
                  onClick={handleCancelNewNote}
                  className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {T("انصراف", "Cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={noteSaving}
                  onClick={() => void handleSaveNewNote()}
                  className="h-7 px-3 text-xs gap-1 font-semibold"
                >
                  {noteSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span>{T("ذخیره نوت", "Save Note")}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Notes Cards List */}
          <div className="space-y-1.5">
            {taskNotes.map((n) => (
              <Card
                key={n.id}
                className="p-2.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card/90 transition-all cursor-pointer group"
                onClick={() => setEditingNote(n)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="flex-1 text-start text-xs sm:text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors" dir="auto">
                    <BidiText text={n.title || T("بدون عنوان", "Untitled")} />
                  </h4>
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-lg"
                          onClick={() => setEditingNote(n)}
                          title={T("ویرایش", "Edit")}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => askDelNote(n)}
                          title={T("حذف", "Delete")}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {n.content && (
                  <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed text-start" dir="auto">
                    <BidiText text={n.content} />
                  </p>
                )}
                {n.updated_at && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                    <Clock className="w-2.5 h-2.5" />
                    <span>
                      {new Date(n.updated_at).toLocaleDateString(isEn ? "en-US" : "fa-IR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {user?.id && (
        <TaskRelatedContacts
          key={`contacts-${contactsRefreshKey}`}
          taskId={t.id}
          userId={user.id}
          canEdit={canEdit}
        />
      )}

      {user?.id && (
        <TaskRelatedKnowledge
          documents={linkedKnowledgeDocs}
          onOpenLinkModal={() => setIsKnowledgeLinkModalOpen(true)}
          onUnlink={handleUnlinkKnowledge}
        />
      )}
    </div>
  );

  const bottomRail = (
    <TaskDetailBottomRail
      t={t}
      canEdit={canEdit}
      canComment={canComment}
      isOwner={isOwner}
      allowDelete={allowDelete}
      showAttachments={showAttachments}
      attachmentCount={attachmentCount}
      pickFileType={pickFileType}
      linkUrl={linkUrl}
      setLinkUrl={setLinkUrl}
      attachLink={attachLink}
      parentOpen={parentOpen}
      setParentOpen={setParentOpen}
      parentCandidates={parentCandidates}
      showSubtasks={showSubtasks}
      setShowSubtasks={setShowSubtasks}
      showSteps={showSteps}
      setShowSteps={setShowSteps}
      showOutcomes={showOutcomes}
      setShowOutcomes={setShowOutcomes}
      outcomeCount={outcomeCount}
      setAiOpen={setAiOpen}
      setFocusOpen={setFocusOpen}
      setActionMenuOpen={setActionMenuOpen}
      deleteTask={deleteTask}
      save={save}
      T={T}
      onAddComment={() => {
        setCommentText("");
        setAddCommentOpen(true);
      }}
      onAddNote={() => {
        setShowNotes(true);
        setIsAddingNote(true);
      }}
      onAddLocation={() => {
        setLocationText(t.location || "");
        setAddLocationOpen(true);
      }}
      onPickContact={() => setContactPickerOpen(true)}
      onNewContact={() => setNewContactOpen(true)}
      onImportDeviceContact={() => setDeviceImportOpen(true)}
      onLinkKnowledge={() => setIsKnowledgeLinkModalOpen(true)}
    />
  );

  const mindOutcomeReviewSection = t.source_type && (
    <Card className="p-3.5 mx-1 rounded-2xl border-purple-500/30 bg-purple-500/5 space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
          <Brain className="w-4 h-4 shrink-0" />
          <span>
            {t.source_type === "cbt_thought" && T("اقدام برخاسته از ثبت فکر (CBT)", "Action from CBT Thought")}
            {t.source_type === "abc_model" && T("اقدام برخاسته از مدل رفتار (ABC)", "Action from ABC Model")}
            {t.source_type === "worry_tree" && T("اقدام حل مسئله (درخت نگرانی)", "Problem-solving Action (Worry Tree)")}
            {t.source_type === "values_goal" && T("اقدام مبتنی بر ارزش‌ها (ACT)", "Values-based Action (ACT)")}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
          onClick={() => {
            if (t.source_type === "cbt_thought") navigate("/app/thoughts");
            else if (t.source_type === "abc_model") navigate("/app/abc");
            else if (t.source_type === "worry_tree") navigate("/app/worry");
            else if (t.source_type === "values_goal") navigate("/app/values");
            else navigate("/app/mind");
          }}
        >
          <span>{T("مشاهده در ذهن", "View in Mind")}</span>
          <ExternalLink className="w-3 h-3 ms-1" />
        </Button>
      </div>

      <div className="pt-2 border-t border-purple-500/20 text-xs">
        <div className="text-muted-foreground mb-1.5 font-medium">
          {T("این اقدام چقدر به آرامش یا شفافیت ذهنت کمک کرد؟", "How much did this action help your clarity or calm?")}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: "helpful", label: T("خیلی مفید بود", "Very helpful"), color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
            { key: "somewhat", label: T("تا حدی", "Somewhat"), color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
            { key: "not_helpful", label: T("کمکی نکرد", "Not helpful"), color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
          ].map((opt) => {
            const isSelected = t.outcome_review?.helpful === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={!canEdit}
                onClick={() => {
                  const nextReview = {
                    helpful: opt.key as any,
                    created_at: t.outcome_review?.created_at || new Date().toISOString(),
                    note: t.outcome_review?.note || "",
                  };
                  void save({ outcome_review: nextReview });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  isSelected
                    ? `${opt.color} ring-1 ring-current shadow-xs font-semibold`
                    : "bg-background/60 hover:bg-background text-muted-foreground border-border/60"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );

  const body = (
    <div className="mt-1 task-detail-sections flex flex-col min-h-[40vh] space-y-4 pb-20">
      {hero}
      {topControls}
      {quickChips}
      {mindOutcomeReviewSection}
      {/* Unified vertical document flow: note description followed directly by subtasks & checklists */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4">
        <div className="min-w-0">{descriptionSection}</div>
        <div className="min-w-0">{expandables}</div>
      </div>
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

  const duplicateTask = async () => {
    if (!user || !canEdit) return;
    const { id: _id, user_id: _uid, ...rest } = t;
    const insert: Partial<Task> = {
      ...rest,
      user_id: user.id,
      title: `${t.title} (${T("کپی", "copy")})`,
      completed: false,
      status: "todo",
    };
    try {
      const { error } = await firebaseStore.from("tasks").insert(insert as never).select().single();
      if (error) throw error;
      toast.success(T("تسک کپی شد", "Task duplicated"));
      onChanged();
    } catch {
      toast.error(T("خطا در کپی تسک", "Failed to duplicate task"));
    }
  };

  const copyTaskLink = async () => {
    try {
      const url = `${window.location.origin}/app/tasks/${t.id}`;
      await navigator.clipboard.writeText(url);
      toast.success(T("لینک تسک کپی شد", "Task link copied"));
    } catch {
      toast.error(T("کپی نشد", "Could not copy"));
    }
  };

  const moreActionsDropdown = (
    <TaskDetailActionsMenu
      task={t}
      canEdit={canEdit}
      allowDelete={allowDelete}
      T={T}
      onTogglePin={() => void save({ pinned: !t.pinned })}
      onToggleCompletion={toggleCompletion}
      onOpenFocus={() => setFocusOpen(true)}
      onOpenFolder={() => setFolderOpen(true)}
      onOpenParent={() => setParentOpen(true)}
      onCopyTaskLink={() => void copyTaskLink()}
      onDuplicateTask={() => void duplicateTask()}
      onOpenAI={() => setAiOpen(true)}
      onShowSteps={() => setShowSteps(true)}
      onAddNote={() => { setShowNotes(true); setIsAddingNote(true); }}
      onShowAttachments={() => setShowAttachments(true)}
      onOpenOutcome={() => setOutcomeOpen(true)}
      onOpenActionMenu={() => setActionMenuOpen(true)}
      onDeleteTask={deleteTask}
    />
  );

  const drawerHeader = (
    <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
      <div className="flex items-center gap-1.5 ps-1">
        {(onBack || hasBackHistory) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 rounded-xl text-xs gap-1 font-medium text-foreground hover:bg-muted me-1"
            onClick={handleBackClick}
            title={T("برگشت به تسک قبلی", "Back to previous task")}
          >
            <ArrowRight className={`w-4 h-4 ${isEn ? "rotate-180" : ""}`} />
            <span>{T("برگشت", "Back")}</span>
          </Button>
        )}
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
          disabled={!canEdit || saveState === "saving" || saveBusy}
          onClick={() => void handleSaveClick()}
          className="h-8 gap-1.5 rounded-xl text-xs"
        >
          {saveBusy || saveState === "saving" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
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
        {moreActionsDropdown}
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
        disabled={!canEdit || saveState === "saving" || saveBusy}
        onClick={() => void handleSaveClick()}
        className="gap-1.5 rounded-xl text-xs font-medium"
      >
        {saveBusy || saveState === "saving" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        {T("ذخیره", "Save")}
      </Button>
      {mode !== "page" && mode !== "modal" && (
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
      {moreActionsDropdown}
    </div>
  );

  return (
    <>
      {actionMenuOpen && (
        <TaskActionSheet
          task={t}
          open={actionMenuOpen}
          onOpenChange={setActionMenuOpen}
          canEdit={canEdit}
          isOwner={isOwner}
          canComment={canComment}
          onComplete={toggleCompletion}
          onDelete={deleteTask}
          onMove={() => setFolderOpen(true)}
          onMakeChild={() => setParentOpen(true)}
          onEdit={() => document.querySelector<HTMLTextAreaElement>("[data-task-title]")?.focus()}
          onPin={() => void save({ pinned: !t.pinned })}
          onPomodoro={() => setFocusOpen(true)}
          onPatch={(patch) => save(patch)}
          onRefresh={refreshTask}
          hideDuplicates={true}
        />
      )}
      {focusOpen && (
        <PomodoroSheet task={t} open={focusOpen} onOpenChange={setFocusOpen} />
      )}
      {mode === "embedded" || mode === "modal" ? (
        <div className="w-full h-full flex flex-col bg-card/95 backdrop-blur-md border border-border/70 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="px-3 sm:px-4 py-2.5 border-b border-border/60 flex items-center justify-between gap-2 bg-muted/30 shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {(onBack || hasBackHistory) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 rounded-xl text-xs gap-1 font-medium text-foreground hover:bg-muted shrink-0"
                  onClick={handleBackClick}
                  title={T("برگشت به تسک قبلی", "Back to previous task")}
                >
                  <ArrowRight className={`w-4 h-4 ${isEn ? "rotate-180" : ""}`} />
                  <span>{T("برگشت", "Back")}</span>
                </Button>
              )}
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setFolderOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:hover:text-muted-foreground max-w-full truncate px-2 py-0.5 rounded-lg hover:bg-muted/50"
                title={T("تغییر فولدر", "Change folder")}
              >
                <FolderIcon className="w-3.5 h-3.5 shrink-0" style={{ color: currentFolder?.color || undefined }} />
                <span className="truncate max-w-[240px]">{taskFolderLabel}</span>
              </button>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {editorActions}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                onClick={requestClose}
                title={T("بستن پنل جزئیات", "Close details panel")}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-3">
            {body}
          </div>
          <div className="shrink-0 p-2 border-t border-border/40 bg-card/95">
            {bottomRail}
          </div>
        </div>
      ) : mode === "page" ? (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 min-h-screen flex flex-col justify-between">
          {/* Unified single-row top header replacing the 3 old stacked rows */}
          <div
            className="sticky top-0 z-30 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 py-2 mb-3 bg-background/95 dark:bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-xs flex items-center justify-between gap-2"
            style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)" }}
          >
            {/* Leading: Back button + Saved status indicator */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackClick}
                className="gap-1 px-2.5 h-8.5 rounded-xl font-medium"
              >
                <ArrowRight className={`w-4 h-4 ${isEn ? "rotate-180" : ""}`} />
                <span className="text-xs">{T("برگشت", "Back")}</span>
              </Button>
              <div className="flex items-center gap-1.5 ps-1 text-xs text-muted-foreground" aria-live="polite">
                <span className={`w-2 h-2 rounded-full ${
                  saveBusy || saveState === "saving" ? "bg-amber-500 animate-ping" :
                  saveState === "dirty" ? "bg-amber-500" :
                  saveState === "error" ? "bg-destructive" : "bg-emerald-500"
                }`} />
                <span className="hidden sm:inline text-[11px] font-medium">{saveLabel}</span>
              </div>
            </div>

            {/* Center: Folder name or Inbox */}
            <div className="flex-1 min-w-0 flex items-center justify-center px-2">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setFolderOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:hover:text-muted-foreground px-2.5 py-1 rounded-lg hover:bg-muted/50"
                title={T("تغییر فولدر", "Change folder")}
              >
                <FolderIcon className="w-3.5 h-3.5 shrink-0" style={{ color: currentFolder?.color || undefined }} />
                <span className="truncate max-w-[220px]">{taskFolderLabel}</span>
              </button>
            </div>

            {/* Trailing: Save button, Calendar button, and More actions dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                disabled={!canEdit || saveBusy || saveState === "saving"}
                onClick={() => void handleSaveClick()}
                className="h-8.5 px-3.5 gap-1.5 rounded-xl text-xs font-medium shadow-xs"
              >
                {saveBusy || saveState === "saving" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{T("ذخیره", "Save")}</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8.5 w-8.5 rounded-xl text-muted-foreground hover:text-foreground"
                onClick={addToAndroidCalendar}
                title={T("افزودن به تقویم Android", "Add to Android Calendar")}
              >
                <CalendarDays className="w-4 h-4" />
              </Button>
              {moreActionsDropdown}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {body}
          </div>
          <div className="sticky bottom-2 z-30 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] bg-gradient-to-t from-background via-background/95 to-transparent">
            {bottomRail}
          </div>
        </div>
      ) : mode === "drawer" && isMobile ? (
        <Drawer open={true} onOpenChange={(v) => !v && requestClose()} snapPoints={[0.5, 1]} activeSnapPoint={snap} setActiveSnapPoint={setSnap} shouldScaleBackground={false} dismissible>
          <DrawerContent className={`h-screen max-h-screen flex flex-col !mt-0 ${snap === 1 ? "!m-0 !rounded-none" : "min-h-[55vh]"}`} aria-describedby="task-drawer-desc">
            <DrawerHeader className="px-4 pt-3 pb-1 text-center">
              <DrawerTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-center gap-1.5 truncate" dir="auto">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setFolderOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:hover:text-muted-foreground max-w-full px-2 py-0.5 rounded-lg hover:bg-muted/50"
                  title={T("تغییر فولدر", "Change folder")}
                >
                  <FolderIcon className="w-3.5 h-3.5 shrink-0" style={{ color: currentFolder?.color || undefined }} />
                  <span className="truncate max-w-[240px]">{taskFolderLabel}</span>
                </button>
              </DrawerTitle>
            </DrawerHeader>
            {drawerHeader}
            <div className={`flex-1 overflow-y-auto min-h-0 px-3 pb-4 ${snap === 1 ? "" : "max-h-[50vh]"}`}>
              {body}
            </div>
            <div className="shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1 border-t border-border/40 bg-card/95">
              {bottomRail}
            </div>
            <p id="task-drawer-desc" className="sr-only">{T("جزئیات و ویرایش تسک", "Task details and editing")}</p>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={true} onOpenChange={(v) => !v && requestClose()}>
          <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] h-[85vh] p-3 sm:p-4 flex flex-col rounded-2xl">
            <DialogHeader className="mb-1 flex-row items-center justify-between gap-3 pe-8">
              <DialogTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate text-start" dir="auto">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setFolderOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:hover:text-muted-foreground px-2 py-0.5 rounded-lg hover:bg-muted/50"
                  title={T("تغییر فولدر", "Change folder")}
                >
                  <FolderIcon className="w-3.5 h-3.5 shrink-0" style={{ color: currentFolder?.color || undefined }} />
                  <span className="truncate max-w-[220px]">{taskFolderLabel}</span>
                </button>
              </DialogTitle>
              {editorActions}
            </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0">
              {body}
            </div>
            <div className="shrink-0 pt-2 border-t border-border/40 bg-card/95">
              {bottomRail}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {aiOpen && (
        <TaskAIPanel
          task={t as any}
          open={aiOpen}
          onOpenChange={setAiOpen}
          onMetaApplied={refreshTask}
        />
      )}

      {outcomeOpen && (
        <TaskOutcomeSheet
          task={t}
          open={outcomeOpen}
          onOpenChange={(open) => { setOutcomeOpen(open); if (!open) { refreshTask(); refreshOutcomeCount(); } }}
          folders={folders.map((f) => ({ id: f.id, name: f.name }))}
        />
      )}

      <TaskCloseDialog
        taskId={t.id}
        open={closePromptOpen}
        onOpenChange={setClosePromptOpen}
        onClose={onClose}
        savePendingChanges={savePendingChanges}
        T={T}
      />

      {/* Add Comment Dialog */}
      <Dialog open={addCommentOpen} onOpenChange={setAddCommentOpen}>
        <DialogContent dir={isEn ? "ltr" : "rtl"} className="max-w-md rounded-2xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-start text-base font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {T("افزودن توضیح / کامنت به تسک", "Add Comment to Task")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <AutoTextarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={T("توضیح یا کامنت خود را اینجا بنویسید…", "Write your comment or note here…")}
              rows={3}
              minHeight={60}
              maxHeight={180}
              autoFocus
              dir="auto"
              className="text-xs"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setAddCommentOpen(false)}>
                {T("انصراف", "Cancel")}
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (!commentText.trim() || !canEdit) return;
                  const trimmed = commentText.trim();
                  const updatedDesc = t.description ? `${t.description}\n\n${trimmed}` : trimmed;
                  await save({ description: updatedDesc });
                  if (user) {
                    void logTaskActivity(user.id, t.id, "updated", { comment_added: true, comment: trimmed });
                  }
                  toast.success(T("توضیحات / کامنت افزوده شد", "Comment added"));
                  setAddCommentOpen(false);
                }}
                disabled={!commentText.trim()}
              >
                {T("ثبت کامنت", "Save Comment")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Location Dialog */}
      <Dialog open={addLocationOpen} onOpenChange={setAddLocationOpen}>
        <DialogContent dir={isEn ? "ltr" : "rtl"} className="max-w-md rounded-2xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-start text-base font-bold flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-rose-500" />
              {T("موقعیت مکانی تسک", "Task Location")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder={T("مثلاً: دفتر کار، منزل، شرکت مشتری...", "e.g. Office, Home...")}
              autoFocus
              dir="auto"
              className="text-xs h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void save({ location: locationText.trim() || null });
                  toast.success(T("موقعیت مکانی ذخیره شد", "Location saved"));
                  setAddLocationOpen(false);
                }
              }}
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setAddLocationOpen(false)}>
                {T("انصراف", "Cancel")}
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (!canEdit) return;
                  await save({ location: locationText.trim() || null });
                  toast.success(T("موقعیت مکانی ذخیره شد", "Location saved"));
                  setAddLocationOpen(false);
                }}
              >
                {T("ذخیره موقعیت", "Save Location")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contacts Integration Modals */}
      {user?.id && (
        <>
          <ContactPickerModal
            open={contactPickerOpen}
            onOpenChange={setContactPickerOpen}
            taskId={t.id}
            userId={user.id}
            onLinked={() => setContactsRefreshKey((k) => k + 1)}
          />

          <ContactEditorDialog
            open={newContactOpen}
            onOpenChange={setNewContactOpen}
            userId={user.id}
            onSaved={async (created) => {
              try {
                await linkTaskContact(t.id, created.id, user.id);
                toast.success(T("شخص جدید ذخیره و به تسک متصل شد", "Contact created and linked to task"));
                setContactsRefreshKey((k) => k + 1);
              } catch {
                // link error
              }
            }}
          />

          <DeviceContactImportModal
            open={deviceImportOpen}
            onOpenChange={setDeviceImportOpen}
            userId={user.id}
            taskId={t.id}
            onImported={() => setContactsRefreshKey((k) => k + 1)}
          />

          <TaskKnowledgeLinkModal
            open={isKnowledgeLinkModalOpen}
            onOpenChange={setIsKnowledgeLinkModalOpen}
            userId={user.id}
            alreadyLinkedDocIds={linkedKnowledgeDocs.map((d) => d.id)}
            onSelectDoc={handleLinkKnowledge}
          />

          {/* Task Note Editor Dialog / Sheet */}
          {editingNote && (
            <TaskNoteEditorDialog
              open={!!editingNote}
              onOpenChange={(open) => {
                if (!open) setEditingNote(null);
              }}
              userId={user.id}
              taskId={t.id}
              note={editingNote}
              canEdit={canEdit}
              onSaved={(updated) => {
                setTaskNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
                setEditingNote(null);
              }}
              onDeleted={(noteId) => {
                setTaskNotes((prev) => prev.filter((n) => n.id !== noteId));
                setEditingNote(null);
              }}
            />
          )}
        </>
      )}
    </>
  );
});

