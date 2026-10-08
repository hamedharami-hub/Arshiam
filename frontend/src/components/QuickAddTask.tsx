import { formatTaskDueDateDisplay, workDatePatch } from "@/lib/taskDate";
import { planningPatch } from "@/lib/taskPlanning";
import type { Period } from "@/lib/timeHorizon";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Plus, Loader2, Calendar as CalendarIcon, Tag, Folder, Check, FileStack, Trash2, RotateCcw } from "lucide-react";
import { PriorityFlag } from "@/components/PriorityFlag";
import { parseNaturalDate } from "@/lib/nlDate";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TaskScheduleBody } from "@/components/task-detail/TaskSchedulingSheet";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PRIORITY_META, PRIORITY_SELECTABLE, type Priority } from "@/lib/priority";
import type { ReminderPlan, Task } from "@/lib/taskTypes";
import type { RecurrenceRule } from "@/lib/recurrence";
import { listTaskTemplates, buildTaskFromTemplate, buildWorkflowTasksFromTemplate, saveTaskTemplate, deleteTaskTemplate, type TaskTemplateRecord, type WorkflowTaskTemplateItem } from "@/lib/taskTemplates";
import { uploadMediaFull } from "@/lib/uploadMedia";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { enqueueOp, enqueueOps } from "@/lib/offlineQueue";
import { fieldsForExact, getTimeSettings, timePatch, type TimeFields } from "@/lib/timeHorizon";
import { parseTaskDueDate } from "@/lib/taskDate";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type WorkflowTaskState = "pending" | "saved" | "queued" | "failed";
type WorkflowRunTask = WorkflowTaskTemplateItem & {
  created_at: string;
  include: boolean;
  attempted: boolean;
  state: WorkflowTaskState;
  error?: string;
};
type WorkflowRun = {
  userId: string;
  templateId: string;
  templateTitle: string;
  tasks: WorkflowRunTask[];
};

const workflowRunKey = (userId: string) => `quick_add_workflow_run_v1:${userId}`;

function readWorkflowRun(userId: string): WorkflowRun | null {
  try {
    const raw = localStorage.getItem(workflowRunKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkflowRun>;
    if (parsed.userId !== userId || typeof parsed.templateId !== "string" || typeof parsed.templateTitle !== "string" || !Array.isArray(parsed.tasks)) return null;
    const tasks = parsed.tasks.slice(0, 100).filter((task): task is WorkflowRunTask => Boolean(
      task && typeof task === "object" && typeof task.id === "string" && task.id &&
      typeof task.title === "string" && typeof task.created_at === "string" &&
      (task.state === "pending" || task.state === "saved" || task.state === "queued" || task.state === "failed")
    ));
    if (!tasks.length) return null;
    return {
      userId,
      templateId: parsed.templateId,
      templateTitle: parsed.templateTitle,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title.slice(0, 500),
        description: typeof task.description === "string" ? task.description.slice(0, 10_000) : null,
        priority: PRIORITY_SELECTABLE.includes(task.priority) ? task.priority : "none",
        folder_id: typeof task.folder_id === "string" ? task.folder_id : null,
        created_at: task.created_at,
        include: task.include !== false,
        attempted: task.attempted === true || task.state === "saved" || task.state === "queued" || task.state === "failed",
        state: task.state,
        ...(typeof task.error === "string" ? { error: task.error.slice(0, 500) } : {}),
      })),
    };
  } catch {
    return null;
  }
}

function storeWorkflowRun(run: WorkflowRun | null, userId?: string): boolean {
  const ownerId = run?.userId ?? userId;
  if (!ownerId) return false;
  try {
    const key = workflowRunKey(ownerId);
    if (!run) {
      localStorage.removeItem(key);
      return localStorage.getItem(key) === null;
    }
    const value = JSON.stringify(run);
    localStorage.setItem(key, value);
    return localStorage.getItem(key) === value;
  } catch {
    return false;
  }
}

type Defaults = {
  folder_id?: string | null;
  due_date?: string | null;
  work_date?: string | null;
  recurrence_rule?: RecurrenceRule | null;
  parent_id?: string | null;
  tag_id?: string | null;
  tag_ids?: string[];
  priority?: Priority;
  status?: Task["status"];
  kanban_column_id?: string | null;
  time?: TimeFields; planning?: Period;
};

const priorityKeywords: Record<string, Priority> = {
  "0": "none", "none": "none", "n": "none", "هیچ": "none", "بدون": "none",
  "1": "urgent", "urgent": "urgent", "u": "urgent", "فوق": "urgent", "فوق‌فوری": "urgent",
  "2": "high", "high": "high", "h": "high", "بالا": "high", "فوری": "high",
  "3": "medium", "medium": "medium", "m": "medium", "متوسط": "medium",
  "4": "low", "low": "low", "l": "low", "پایین": "low",
};

const priorityEngKey: Record<Priority, string> = {
  none: "none",
  urgent: "urgent",
  high: "high",
  medium: "medium",
  low: "low",
};

type NamedEntry = { id: string; name: string };
type ParsedMention = { id: string; start: number; end: number };

/** Match the longest known #tag or @folder name, including names with spaces. */
function matchNamedMention(tokens: Array<{ text: string; start: number; end: number }>, index: number, marker: "#" | "@", entries: NamedEntry[]): ParsedMention | null {
  const first = tokens[index]?.text || "";
  const inlineName = first.startsWith(marker) ? first.slice(1) : "";
  const separatedMarker = first === marker;
  let best: ParsedMention | null = null;
  let bestLastIndex = -1;

  for (const entry of entries) {
    const words = entry.name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const offset = separatedMarker ? 1 : 0;
    if (separatedMarker && !tokens[index + 1]) continue;
    if (!separatedMarker && !first.startsWith(marker)) continue;
    if (!separatedMarker && !inlineName) continue;
    const firstNameWord = separatedMarker ? tokens[index + 1]?.text : inlineName;
    if ((firstNameWord || "").toLocaleLowerCase() !== words[0].toLocaleLowerCase()) continue;
    let matches = true;
    for (let wordIndex = 1; wordIndex < words.length; wordIndex += 1) {
      if ((tokens[index + offset + wordIndex]?.text || "").toLocaleLowerCase() !== words[wordIndex].toLocaleLowerCase()) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;
    const lastIndex = index + offset + words.length - 1;
    if (lastIndex > bestLastIndex) {
      best = { id: entry.id, start: tokens[index].start, end: tokens[lastIndex].end };
      bestLastIndex = lastIndex;
    }
  }
  return best;
}

function mentionTokenRanges(rawTitle: string, marker: "#" | "@", entries: NamedEntry[]): ParsedMention[] {
  const tokens = Array.from(rawTitle.matchAll(/\S+/g), match => ({
    text: match[0], start: match.index ?? 0, end: (match.index ?? 0) + match[0].length,
  }));
  const mentions: ParsedMention[] = [];
  for (let index = 0; index < tokens.length;) {
    const match = matchNamedMention(tokens, index, marker, entries);
    if (!match) { index += 1; continue; }
    mentions.push(match);
    while (index < tokens.length && tokens[index].end <= match.end) index += 1;
  }
  return mentions;
}

function removeKnownMentions(rawTitle: string, marker: "#" | "@", entries: NamedEntry[]): string {
  const matches = mentionTokenRanges(rawTitle, marker, entries);
  if (!matches.length) return rawTitle;
  // Only remove a phrase that the current known-entry list recognizes; unknown
  // #tags and @folders remain part of the user's title.
  let without = rawTitle;
  for (const match of matches.reverse()) {
    without = `${without.slice(0, match.start)}${without.slice(match.end)}`;
  }
  return without.replace(/[ \t]{2,}/g, " ").trim();
}

export function QuickAddTask({
  defaults = {},
  placeholder,
  onCreated,
  className = "",
  chipsTrailing,
  collapsedExtra,
}: {
  defaults?: Defaults;
  placeholder?: string;
  onCreated?: (taskId: string) => void;
  className?: string;
  chipsTrailing?: React.ReactNode;
  /** Extra shrinkable content shown only in the collapsed one-line bar. */
  collapsedExtra?: React.ReactNode;
}) {
  const { user } = useAuth();
  const activeUserIdRef = useRef<string | null>(user?.id ?? null);
  activeUserIdRef.current = user?.id ?? null;
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [due, setDue] = useState<string | null | undefined>(defaults.work_date ?? defaults.due_date ?? undefined);
  const [reminder, setReminder] = useState<{ plan: ReminderPlan | null; at: string | null }>({ plan: null, at: null });
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(defaults.recurrence_rule ?? null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [folderId, setFolderId] = useState<string | null>(defaults.folder_id ?? null);
  const defaultTagKey = JSON.stringify([...new Set([...(defaults.tag_id ? [defaults.tag_id] : []), ...(defaults.tag_ids || [])])]);
  const [tagIds, setTagIds] = useState<string[]>(() => JSON.parse(defaultTagKey));
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [templates, setTemplates] = useState<TaskTemplateRecord[]>([]);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [templateSaveOpen, setTemplateSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateOffsetHours, setTemplateOffsetHours] = useState("");
  const [templateSaveMode, setTemplateSaveMode] = useState<"single" | "workflow">("single");
  const [workflowTemplateText, setWorkflowTemplateText] = useState("");
  const [templateSaveId, setTemplateSaveId] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TaskTemplateRecord | null>(null);
  const [templateDeleting, setTemplateDeleting] = useState(false);
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [workflowPreviewOpen, setWorkflowPreviewOpen] = useState(false);
  const [workflowSaving, setWorkflowSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);

  // Sync state when defaults change dynamically (e.g. switching folders or dates)
  useEffect(() => {
    setDue(defaults.work_date ?? defaults.due_date ?? undefined);
  }, [defaults.work_date, defaults.due_date]);

  useEffect(() => {
    setRecurrence(defaults.recurrence_rule ?? null);
  }, [defaults.recurrence_rule]);

  useEffect(() => {
    setFolderId(defaults.folder_id ?? null);
  }, [defaults.folder_id]);

  useEffect(() => {
    setTagIds(JSON.parse(defaultTagKey));
  }, [defaultTagKey]);

  useEffect(() => {
    if (!user) {
      setTemplates([]);
      setTemplateMenuOpen(false);
      setTemplateSaveOpen(false);
      setTemplateSaveId("");
      setTemplateToDelete(null);
      setWorkflowRun(null);
      setWorkflowPreviewOpen(false);
      return;
    }
    let active = true;
    firebaseStore.from("folders").select("id,name").order("name").then(({ data }) => {
      if (active) setFolders((data as any) || []);
    });
    firebaseStore.from("tags").select("id,name,color").order("name").then(({ data }) => {
      if (active) setTags((data as any) || []);
    });
    setTemplates([]);
    setTemplateMenuOpen(false);
    setTemplateSaveOpen(false);
    setTemplateSaveId("");
    setTemplateToDelete(null);
    setWorkflowPreviewOpen(false);
    const savedWorkflowRun = readWorkflowRun(user.id);
    const savedRunComplete = !!savedWorkflowRun && savedWorkflowRun.tasks.filter(task => task.include).every(task => task.state === "saved" || task.state === "queued");
    if (savedWorkflowRun && !savedRunComplete) setWorkflowRun(savedWorkflowRun);
    else {
      setWorkflowRun(null);
      storeWorkflowRun(null, user.id);
    }
    listTaskTemplates(user.id).then((tpls) => {
      if (active) setTemplates(tpls);
    }).catch(() => {});
    return () => { active = false; };
  }, [user]);

  // Live natural-language parsing: date, #tag, @folder, !priority.
  const parsed = useMemo(() => {
    const tokens = Array.from(title.matchAll(/\S+/g), match => ({
      text: match[0], start: match.index ?? 0, end: (match.index ?? 0) + match[0].length,
    }));
    const kept: string[] = [];
    const matchedTagIds: string[] = [];
    let matchedFolderId: string | null = null;
    let matchedPriority: Priority | null = null;

    for (let index = 0; index < tokens.length;) {
      const token = tokens[index].text;
      const tagMatch = matchNamedMention(tokens, index, "#", tags);
      if (tagMatch) {
        matchedTagIds.push(tagMatch.id);
        while (index < tokens.length && tokens[index].end <= tagMatch.end) index += 1;
        continue;
      }
      const folderMatch = matchNamedMention(tokens, index, "@", folders);
      if (folderMatch) {
        matchedFolderId = folderMatch.id;
        while (index < tokens.length && tokens[index].end <= folderMatch.end) index += 1;
        continue;
      }
      if (token.startsWith("!")) {
        const key = token.slice(1).trim().toLowerCase();
        if (priorityKeywords[key]) {
          matchedPriority = priorityKeywords[key];
          index += 1;
          continue;
        }
      }
      kept.push(token);
      index += 1;
    }

    const tokenClean = kept.join(" ");
    const dateParsed = parseNaturalDate(tokenClean);
    return {
      title: dateParsed.cleanedTitle.trim() || tokenClean.trim(),
      dueDate: dateParsed.dueDate,
      tagIds: matchedTagIds,
      folderId: matchedFolderId,
      priority: matchedPriority,
    };
  }, [title, folders, tags]);

  const finalDue = due === undefined ? parsed.dueDate ?? null : due;
  const finalTitle = parsed.title;
  const finalPriority = priority ?? parsed.priority ?? defaults.priority ?? "none";
  const finalFolderId = folderId ?? parsed.folderId ?? defaults.folder_id ?? null;
  const finalTagIds = Array.from(new Set([
    ...tagIds,
    ...parsed.tagIds,
  ]));

  const generateId = () => {
    try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
  };

  const submit = async () => {
    if (!user) return;
    const taskTitle = (finalTitle || "").trim();
    if (!taskTitle) {
      toast.error(T("لطفاً عنوان تسک را وارد کنید", "Please enter a task title"));
      return;
    }
    setBusy(true);

    const tempId = generateId();
    const baseTask = {
      id: tempId,
      user_id: user.id,
      title: finalTitle,
      folder_id: finalFolderId,
      recurrence_rule: recurrence,
      recurrence: recurrence && recurrence.freq !== "yearly" ? recurrence.freq : "none" as const,
      parent_id: defaults.parent_id ?? null,
      priority: finalPriority,
      completed: defaults.status === "done",
      status: defaults.status ?? "todo" as const,
      completed_at: defaults.status === "done" ? new Date().toISOString() : null,
      kanban_column_id: defaults.kanban_column_id ?? null,
      // One schedule: a chosen day/time wins over the view's default period.
      ...(finalDue ? workDatePatch({}, finalDue)
        : defaults.planning ? planningPatch(defaults.planning, getTimeSettings())
        : defaults.time ? timePatch(defaults.time, getTimeSettings())
        : workDatePatch({}, null)),
      reminder_plan: reminder.plan,
      reminder_at: reminder.at,
      created_at: new Date().toISOString(),
      position: 0,
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      // Offline: queue task and tags. Attachments cannot be uploaded offline and are skipped.
      try {
        const queued = await enqueueOps([
          { table: "tasks", op: "insert", payload: baseTask, ownerId: user.id },
          ...(finalTagIds.length ? [{
            table: "task_tags",
            op: "insert",
            payload: finalTagIds.map(tag_id => ({ task_id: tempId, tag_id, user_id: user.id })),
            ownerId: user.id,
          } satisfies Parameters<typeof enqueueOps>[0][number]] : []),
        ]);
        if (!queued) {
          throw new Error(T("ذخیرهٔ آفلاین ممکن نشد؛ فرم پاک نشده است. دوباره تلاش کنید.", "Could not save offline; your form is still here. Please try again."));
        }
        if (selectedFiles.length) {
          toast.info(T("پیوست‌ها در حالت آفلاین ذخیره نمی‌شوند", "Attachments are not saved while offline"));
        }
        setTitle("");
        setDue(defaults.work_date ?? defaults.due_date ?? undefined);
        setRecurrence(defaults.recurrence_rule ?? null);
        setReminder({ plan: null, at: null });
        setPriority(null);
        setFolderId(defaults.folder_id ?? null);
        setTagIds(JSON.parse(defaultTagKey));
        setSelectedFiles([]);
        setFocused(false);
        window.dispatchEvent(new Event("tasks-changed"));
        onCreated?.(tempId);
        toast.success(T("تسک ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Task saved — will sync when online"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : T("خطا", "Error"));
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      // Firestore is the single source of truth for task creation. Avoid the
      // previous compatibility mirror, which wrote the task a second time.
      const { upsertTask } = await import("@/lib/firestoreDataService");
      const saved = await upsertTask(user.id, baseTask);
      if (!saved) throw new Error(T("ذخیره تسک ناموفق بود", "Task could not be saved"));

      // Tags are a separate relation and can still use the compatibility adapter.
      let tagsPendingSync = false;
      let tagsCouldNotBeSaved = false;
      if (finalTagIds.length) {
        try {
          const { error } = await firebaseStore
            .from("task_tags")
            .insert(finalTagIds.map(tag_id => ({ task_id: tempId, tag_id, user_id: user.id })));
          if (error) throw error;
        } catch (tagErr) {
          console.warn("[QuickAddTask] Failed to link tags online, queueing offline:", tagErr);
          let queued = false;
          try {
            queued = await enqueueOp({
              table: "task_tags",
              op: "insert",
              payload: finalTagIds.map(tag_id => ({ task_id: tempId, tag_id, user_id: user.id })),
              ownerId: user.id,
            });
          } catch (queueErr) {
            console.warn("[QuickAddTask] Failed to queue tag links:", queueErr);
          }
          tagsPendingSync = queued;
          tagsCouldNotBeSaved = !queued;
        }
      }

    setTitle("");
    setDue(defaults.work_date ?? defaults.due_date ?? undefined);
    setReminder({ plan: null, at: null });
    setRecurrence(defaults.recurrence_rule ?? null);
    setPriority(null);
    setFolderId(defaults.folder_id ?? null);
    setTagIds(JSON.parse(defaultTagKey));
    setSelectedFiles([]);
    setFocused(false);
    window.dispatchEvent(new Event("tasks-changed"));
    onCreated?.(tempId);
    if (tagsPendingSync) {
      toast.info(T("تسک ذخیره شد؛ تگ‌ها پس از اتصال همگام می‌شوند", "Task saved — tags will sync when online"));
    } else if (tagsCouldNotBeSaved) {
      toast.error(T("تسک ذخیره شد، اما تگ‌ها ذخیره نشدند؛ تسک را باز کنید و تگ‌ها را دوباره اضافه کنید.", "Task saved, but its tags were not. Reopen the task and add them again."));
    } else {
      toast.success(T("تسک با موفقیت ذخیره شد", "Task created successfully"));
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : T("خطا", "Error"));
  } finally {
    setBusy(false);
  }
};

  const applyPriority = (p: Priority) => {
    setPriority(p);
    // Remove any existing explicit priority token from title and append new one
    const clean = title.split(/\s+/).filter(w => !w.startsWith("!")).join(" ");
    if (p === "none") {
      setTitle(clean);
    } else {
      setTitle(`${clean} !${priorityEngKey[p]}`.trim());
    }
  };

  const applyFolder = (fid: string | null) => {
    setFolderId(fid);
    const currentFolder = folders.find(f => f.id === fid);
    const clean = removeKnownMentions(title, "@", folders);
    if (currentFolder) {
      setTitle(`${clean} @${currentFolder.name}`.trim());
    } else {
      setTitle(clean);
    }
  };

  const applyTag = (tid: string) => {
    const tag = tags.find(t => t.id === tid);
    if (!tag || finalTagIds.includes(tid)) return;
    setTagIds(prev => [...prev, tid]);
    setTitle(`${title} #${tag.name}`.trim());
  };

  const removeTag = (tid: string) => {
    setTagIds(prev => prev.filter(id => id !== tid));
    const tag = tags.find(t => t.id === tid);
    if (tag && tag.name) {
      setTitle(removeKnownMentions(title || "", "#", [tag]));
    }
  };

  const applyTemplate = (tpl: Partial<Task>) => {
    if (tpl.title) setTitle(tpl.title);
    if (tpl.work_date) setDue(tpl.work_date);
    setRecurrence(tpl.recurrence_rule ?? null);
    if (tpl.priority) setPriority(tpl.priority);
    if (tpl.folder_id) setFolderId(tpl.folder_id);
    setTagIds(Array.isArray((tpl as Partial<Task> & { tag_ids?: string[] }).tag_ids)
      ? (tpl as Partial<Task> & { tag_ids?: string[] }).tag_ids!
      : []);
    setTemplateMenuOpen(false);
  };

  const updateWorkflowRun = (next: WorkflowRun | null) => {
    setWorkflowRun(next);
    if (!storeWorkflowRun(next, user?.id)) {
      toast.error(T("پیش‌نویس گردش‌کار در این دستگاه ذخیره نشد.", "The workflow draft could not be saved on this device."));
    }
  };

  const openWorkflowTemplate = (template: TaskTemplateRecord) => {
    setTemplateMenuOpen(false);
    if (!user || (template.user_id && template.user_id !== user.id)) return;
    if (workflowRun) {
      setWorkflowPreviewOpen(true);
      toast.info(T("ابتدا گردش‌کار نیمه‌تمام را ادامه بده.", "Resume the unfinished workflow first."));
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error(T("برای شروع گردش‌کار چندتسکی اتصال اینترنت لازم است.", "An internet connection is required to start a multi-task workflow."));
      return;
    }
    const definitions = buildWorkflowTasksFromTemplate(template);
    if (definitions.length < 2) {
      applyTemplate(buildTaskFromTemplate(template));
      return;
    }
    const run: WorkflowRun = {
      userId: user.id,
      templateId: template.id,
      templateTitle: template.title,
      tasks: definitions.map(item => ({
        ...item,
        id: generateId(),
        created_at: new Date().toISOString(),
        include: true,
        attempted: false,
        state: "pending",
      })),
    };
    if (!storeWorkflowRun(run)) {
      toast.error(T("پیش‌نویس گردش‌کار در این دستگاه ذخیره نشد؛ فضای ذخیره‌سازی را بررسی کن.", "The workflow draft could not be stored on this device. Check local storage and try again."));
      return;
    }
    setWorkflowRun(run);
    setWorkflowPreviewOpen(true);
  };

  const closeWorkflowPreview = (open: boolean) => {
    if (open) {
      setWorkflowPreviewOpen(true);
      return;
    }
    if (workflowSaving) return;
    setWorkflowPreviewOpen(false);
    if (workflowRun?.tasks.every(task => !task.attempted)) {
      // Before the first write, cancel means discard the preview. Once any write
      // was attempted, retain IDs and statuses for a safe resume after closing.
      updateWorkflowRun(null);
    }
  };

  const editWorkflowTask = (taskId: string, change: Partial<Pick<WorkflowRunTask, "title" | "include">>) => {
    if (!workflowRun) return;
    const next = {
      ...workflowRun,
      tasks: workflowRun.tasks.map(task => task.id === taskId && task.state !== "saved" && task.state !== "queued"
        ? { ...task, ...change, ...(change.title !== undefined ? { title: change.title.slice(0, 500) } : {}) }
        : task),
    };
    updateWorkflowRun(next);
  };

  const confirmWorkflowRun = async () => {
    if (!user || !workflowRun || workflowSaving) return;
    if (activeUserIdRef.current !== user.id) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error(T("اتصال اینترنت قطع است؛ پیش‌نویس حفظ شد و پس از اتصال می‌توانی دوباره تلاش کنی.", "You are offline. The draft is preserved; reconnect before retrying."));
      return;
    }
    const selected = workflowRun.tasks.filter(task => task.include);
    if (!selected.length) {
      toast.error(T("حداقل یک کار را برای ساخت انتخاب کن.", "Select at least one task to create."));
      return;
    }
    if (selected.some(task => !task.title.trim())) {
      toast.error(T("عنوان کارهای انتخاب‌شده را کامل کن.", "Enter a title for each selected task."));
      return;
    }

    setWorkflowSaving(true);
    let current = workflowRun;
    let storageFailed = false;
    try {
      const { persistTask } = await import("@/lib/firestoreDataService");
      for (const task of selected) {
        if (activeUserIdRef.current !== user.id) return;
        if (task.state === "saved" || task.state === "queued") continue;
        current = {
          ...current,
          tasks: current.tasks.map(candidate => candidate.id === task.id ? { ...candidate, attempted: true } : candidate),
        };
        setWorkflowRun(current);
        if (!storeWorkflowRun(current)) {
          storageFailed = true;
          current = {
            ...current,
            tasks: current.tasks.map(candidate => candidate.id === task.id
              ? { ...candidate, attempted: false, state: "failed", error: T("وضعیت ادامه ذخیره نشد؛ کار هنوز فرستاده نشده است.", "Progress could not be stored; this task was not sent.") }
              : candidate),
          };
          setWorkflowRun(current);
          continue;
        }
        let state: WorkflowTaskState = "failed";
        let errorMessage: string | undefined;
        try {
          const outcome = await persistTask(user.id, {
            id: task.id,
            user_id: user.id,
            title: task.title.trim(),
            description: task.description ?? null,
            priority: task.priority,
            folder_id: task.folder_id,
            parent_id: null,
            status: "todo",
            completed: false,
            completed_at: null,
            created_at: task.created_at,
            position: current.tasks.findIndex(candidate => candidate.id === task.id),
            ...workDatePatch({}, null),
          });
          state = outcome;
          if (outcome === "failed") errorMessage = T("ذخیره انجام نشد؛ دوباره تلاش کن.", "Save failed; try again.");
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : T("ذخیره انجام نشد؛ دوباره تلاش کن.", "Save failed; try again.");
        }
        current = {
          ...current,
          tasks: current.tasks.map(candidate => candidate.id === task.id
            ? { ...candidate, attempted: true, state, ...(errorMessage ? { error: errorMessage } : { error: undefined }) }
            : candidate),
        };
        setWorkflowRun(current);
        if (!storeWorkflowRun(current)) storageFailed = true;
      }

      if (activeUserIdRef.current !== user.id) return;
      const finalSelected = current.tasks.filter(task => task.include);
      const complete = finalSelected.every(task => task.state === "saved" || task.state === "queued");
      const failedCount = finalSelected.filter(task => task.state === "failed" || task.state === "pending").length;
      const queuedCount = finalSelected.filter(task => task.state === "queued").length;
      if (finalSelected.some(task => task.state === "saved" || task.state === "queued")) {
        window.dispatchEvent(new Event("tasks-changed"));
      }
      if (complete) {
        storeWorkflowRun(null, user.id);
        setWorkflowRun(null);
        setWorkflowPreviewOpen(false);
        toast.success(queuedCount
          ? T("کارها ذخیره شدند؛ بخشی در پس‌زمینه همگام می‌شود.", "Tasks were accepted; some will sync in the background.")
          : T("همهٔ کارهای گردش‌کار ذخیره شدند.", "All workflow tasks were saved."));
      } else {
        toast.error(T(`${failedCount} کار ذخیره نشد. موارد موفق تکرار نمی‌شوند؛ دوباره تلاش کن.`, `${failedCount} task(s) failed. Successful tasks will not be repeated; retry the remaining items.`));
      }
      if (storageFailed) {
        toast.error(T("وضعیت ادامهٔ گردش‌کار در دستگاه ذخیره نشد؛ صفحه را نبند و دوباره تلاش کن.", "Workflow progress could not be stored on this device. Keep this page open and retry."));
      }
    } finally {
      setWorkflowSaving(false);
    }
  };

  const beginSaveTemplate = () => {
    if (!finalTitle.trim()) return;
    setTemplateSaveMode("single");
    setWorkflowTemplateText("");
    setTemplateName(finalTitle.trim());
    setTemplateOffsetHours("");
    setTemplateSaveId(generateId());
    setTemplateMenuOpen(false);
    setTemplateSaveOpen(true);
  };

  const beginSaveWorkflowTemplate = () => {
    setTemplateSaveMode("workflow");
    setWorkflowTemplateText("");
    setTemplateName("");
    setTemplateOffsetHours("");
    setTemplateSaveId(generateId());
    setTemplateMenuOpen(false);
    setTemplateSaveOpen(true);
  };

  const parsedTemplateOffset = templateOffsetHours.trim() === "" ? null : Number(templateOffsetHours);
  const templateOffsetInvalid = parsedTemplateOffset !== null
    && (!Number.isInteger(parsedTemplateOffset) || parsedTemplateOffset < 0 || parsedTemplateOffset > 24 * 365);
  const workflowTemplateTitles = workflowTemplateText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const workflowTemplateTooMany = workflowTemplateTitles.length > 100;

  const confirmSaveTemplate = async () => {
    if (!user || !templateName.trim()) return;
    if (templateSaveMode === "single" && (!finalTitle.trim() || templateOffsetInvalid)) return;
    if (templateSaveMode === "workflow" && (workflowTemplateTitles.length < 2 || workflowTemplateTooMany)) {
      toast.error(workflowTemplateTooMany
        ? T("حداکثر ۱۰۰ کار در هر گردش‌کار می‌توان ذخیره کرد.", "A workflow can contain at most 100 tasks.")
        : T("برای گردش‌کار دست‌کم دو عنوان در خط‌های جدا وارد کن.", "Enter at least two task titles on separate lines."));
      return;
    }
    setTemplateSaving(true);
    try {
      const isWorkflow = templateSaveMode === "workflow";
      const saved = await saveTaskTemplate(user.id, {
        title: isWorkflow ? templateName.trim() : finalTitle.trim(),
        priority: isWorkflow ? "none" : finalPriority,
        folder_id: isWorkflow ? null : finalFolderId,
        recurrence: isWorkflow ? "none" : recurrence && recurrence.freq !== "yearly" ? recurrence.freq : "none",
        recurrence_rule: isWorkflow ? null : recurrence,
      }, {
        title: templateName,
        ...(isWorkflow ? {
          dueOffsetHours: null,
          workflowTasks: workflowTemplateTitles.map(title => ({
            id: generateId(),
            title,
            priority: finalPriority,
            folder_id: finalFolderId,
          })),
        } : {
          dueOffsetHours: parsedTemplateOffset,
          tagIds: finalTagIds,
        }),
        id: templateSaveId,
      });
      if (!saved) throw new Error(T("قالب ذخیره نشد؛ دوباره تلاش کنید.", "Template was not saved. Please try again."));
      if (activeUserIdRef.current !== user.id) return;
      setTemplates(current => [saved, ...current.filter(item => item.id !== saved.id)]);
      setTemplateSaveOpen(false);
      setTemplateSaveId("");
      setWorkflowTemplateText("");
      toast.success(T("قالب ذخیره شد", "Template saved"));
    } catch (error) {
      if (activeUserIdRef.current === user.id) {
        toast.error(error instanceof Error ? error.message : T("ذخیرهٔ قالب ناموفق بود", "Could not save template"));
      }
    } finally {
      setTemplateSaving(false);
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!user || !templateToDelete) return;
    setTemplateDeleting(true);
    try {
      if (templateToDelete.user_id && templateToDelete.user_id !== user.id) {
        setTemplateToDelete(null);
        return;
      }
      await deleteTaskTemplate(user.id, templateToDelete.id);
      if (activeUserIdRef.current !== user.id) return;
      setTemplates(current => current.filter(item => item.id !== templateToDelete.id));
      setTemplateToDelete(null);
      toast.success(T("قالب حذف شد", "Template deleted"));
    } catch (error) {
      if (activeUserIdRef.current === user.id) {
        toast.error(error instanceof Error ? error.message : T("حذف قالب ناموفق بود", "Could not delete template"));
      }
    } finally {
      setTemplateDeleting(false);
    }
  };

  const convertToNote = async () => {
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOp({
          table: "notes",
          op: "insert",
          payload: {
            id: generateId(),
            user_id: user.id,
            title: finalTitle,
            content: "",
            folder_id: finalFolderId,
            pinned: false,
            updated_at: new Date().toISOString(),
          },
        });
        setTitle("");
        toast.success(T("نوت ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Note saved — will sync when online"));
        navigate("/app/notes");
        return;
      }
      const { error } = await firebaseStore.from("notes").insert({
        user_id: user.id,
        title: finalTitle,
        content: "",
        folder_id: finalFolderId,
      });
      if (error) throw error;
      setTitle("");
      toast.success(T("نوت ساخته شد", "Note created"));
      navigate("/app/notes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : T("خطا", "Error"));
    } finally {
      setBusy(false);
    }
  };

  const openFullScreen = () => {
    const qp = new URLSearchParams();
    if (title.trim()) qp.set("title", finalTitle);
    if (finalDue) qp.set("work_date", finalDue);
    if (recurrence) qp.set("recurrence_rule", JSON.stringify(recurrence));
    if (finalFolderId) qp.set("folder_id", finalFolderId);
    if (defaults.kanban_column_id) qp.set("kanban_goal_id", defaults.kanban_column_id);
    if (defaults.status) qp.set("status", defaults.status);
    if (defaults.parent_id) qp.set("parent_id", defaults.parent_id);
    if (finalTagIds[0]) qp.set("tag_id", finalTagIds[0]);
    qp.set("priority", finalPriority);
    if (defaults.planning) {
      qp.set("planning_horizon", defaults.planning.horizon);
      qp.set("planning_start", defaults.planning.start);
    }
    if (defaults.time && !finalDue) {
      qp.set("horizon", defaults.time.horizon);
      qp.set("period_start", defaults.time.period_start);
    }
    navigate(`/app/new/task?${qp.toString()}`);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    setSelectedFiles(prev => [...prev, ...Array.from(files)]);
  };

  const isDateToday = (d: Date) => {
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const isDateTomorrow = (d: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      d.getFullYear() === tomorrow.getFullYear() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getDate() === tomorrow.getDate()
    );
  };

  const formatDueLabel = (iso: string | null, scheduleVersion = 2) => {
    if (!iso) return T("تاریخ", "Date");
    const d = parseTaskDueDate(iso);
    if (!d) return T("تاریخ", "Date");
    if (iso.includes("T")) return formatTaskDueDateDisplay(iso, isEn, scheduleVersion);
    if (isDateToday(d)) return T("امروز", "Today");
    if (isDateTomorrow(d)) return T("فردا", "Tomorrow");
    return d.toLocaleDateString(isEn ? "en-US" : "fa-IR", { month: "short", day: "numeric" });
  };

  const selectedFolder = folders.find(f => f.id === finalFolderId);
  const selectedFolderLabel = selectedFolder ? selectedFolder.name : T("اینباکس", "Inbox");
  const selectedTag = finalTagIds.length === 1 ? tags.find(t => t.id === finalTagIds[0]) : null;

  const targetScopeName = useMemo(() => {
    if (finalFolderId) {
      const found = folders.find(f => f.id === finalFolderId);
      if (found) return found.name;
    }
    if (finalDue) {
      const d = parseTaskDueDate(finalDue);
      if (d && isDateToday(d)) {
        return T("امروز", "Today");
      }
    }
    return T("اینباکس", "Inbox");
  }, [finalFolderId, finalDue, folders, isEn]);

  const defaultPlaceholder = T(`افزودن تسک به «${targetScopeName}»`, `Add task to "${targetScopeName}"`);
  const placeholderText = placeholder || defaultPlaceholder;

  const [focused, setFocused] = useState(false);
  const isAnyPopoverOpen = dateOpen || priorityOpen || folderOpen || tagOpen;
  const showOptions = focused || isAnyPopoverOpen;

  useEffect(() => {
    if (!focused && !isAnyPopoverOpen) return;

    let isScrolling = false;

    const handlePointerDown = (e: PointerEvent) => {
      isScrolling = false;
      const x = e.clientX ?? 0;
      const y = e.clientY ?? 0;
      pointerStartRef.current = { x, y, time: Date.now() };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!pointerStartRef.current) return;
      const x = e.clientX ?? 0;
      const y = e.clientY ?? 0;
      if (Math.hypot(x - pointerStartRef.current.x, y - pointerStartRef.current.y) > 10) {
        isScrolling = true;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerStartRef.current) return;
      const start = pointerStartRef.current;
      pointerStartRef.current = null;

      const x = e.clientX ?? 0;
      const y = e.clientY ?? 0;
      const dist = Math.hypot(x - start.x, y - start.y);

      // If user moved more than 10px or was scrolling, don't close
      if (dist > 10 || isScrolling) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Inside QuickAddTask container? Keep open
      if (containerRef.current?.contains(target)) return;

      // Inside Radix popovers, dialogs, menus, or themes? Keep open
      if (
        target.closest?.("[data-radix-popper-content-wrapper]") ||
        target.closest?.("[role='dialog']") ||
        target.closest?.("[role='menu']") ||
        target.closest?.(".radix-themes")
      ) {
        return;
      }

      // Tap / click was outside: collapse!
      setFocused(false);
      setDateOpen(false);
      setPriorityOpen(false);
      setFolderOpen(false);
      setTagOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, { passive: true });
    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [focused, isAnyPopoverOpen]);

  return (
    <div
      ref={containerRef}
      className={`rounded-xl border transition-all duration-150 ${
        showOptions
          ? "bg-card border-primary/40 shadow-xs p-2.5"
          : "bg-muted/40 hover:bg-muted/60 dark:bg-card/40 border-border/60 hover:border-border/80 px-3 py-2 cursor-text"
      } ${className}`}
      dir={isEn ? "ltr" : "rtl"}
    >
      {!showOptions ? (
        <div className="flex items-center justify-between gap-2">
          <div
            onClick={() => {
              setFocused(true);
              setTimeout(() => inputRef.current?.focus(), 10);
            }}
            className={`flex items-center gap-2 select-none group flex-1 cursor-text ${collapsedExtra ? "min-w-[8rem] basis-40" : "min-w-0"}`}
            data-testid="quick-add-collapsed"
          >
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors truncate">
              {title.trim() ? title : placeholderText}
            </span>
          </div>
          {collapsedExtra && (
            <div className="flex min-w-0 shrink items-center" onClick={(e) => e.stopPropagation()}>
              {collapsedExtra}
            </div>
          )}
          {chipsTrailing && (
            <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {chipsTrailing}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Title input */}
          <div className="flex items-center gap-2">
            <AutoTextarea
              ref={inputRef}
              value={title}
              onFocus={() => setFocused(true)}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                } else if (e.key === "Escape") {
                  setFocused(false);
                }
              }}
              placeholder={placeholderText}
              className="flex-1 text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 min-h-[36px] max-h-[120px] py-1 px-1"
              dir="auto"
              disabled={busy}
              rows={1}
              minHeight={36}
              maxHeight={120}
              autoFocus
            />
            <VoiceInputButton
              onTranscript={(text) => setTitle((prev) => (prev ? prev.trimEnd() + " " + text : text))}
              disabled={busy}
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            />
          </div>

          {/* Compact Options below input */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-2 mt-1.5 border-t border-border/40 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Date Picker Chip */}
              <Sheet open={dateOpen} onOpenChange={setDateOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                      finalDue
                        ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                    }`}
                    title={T("تنظیم تاریخ و زمان", "Set date and time")}
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>{formatDueLabel(finalDue, 2)}</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[88dvh] space-y-3 overflow-y-auto rounded-t-3xl p-5 pt-9 sm:mx-auto sm:max-w-2xl">
                  <SheetTitle>{T("زمان‌بندی تسک", "Schedule task")}</SheetTitle>
                  <TaskScheduleBody
                    t={{ id: "quick-add", title: "", priority: "none", completed: false, status: "todo", work_date: due ?? null,
                      recurrence_rule: recurrence, reminder_plan: reminder.plan, reminder_at: reminder.at } as Task}
                    canEdit
                    T={T}
                    isEn={isEn}
                    onDone={() => setDateOpen(false)}
                    save={(patch) => {
                      if ("work_date" in patch) setDue(patch.work_date ?? null);
                      if ("recurrence_rule" in patch) setRecurrence(patch.recurrence_rule ?? null);
                      if ("reminder_plan" in patch || "reminder_at" in patch) {
                        setReminder((cur) => ({
                          plan: "reminder_plan" in patch ? patch.reminder_plan ?? null : cur.plan,
                          at: "reminder_at" in patch ? patch.reminder_at ?? null : cur.at,
                        }));
                      }
                    }}
                  />
                </SheetContent>
              </Sheet>

              {/* Folder Chip */}
              <Popover open={folderOpen} onOpenChange={setFolderOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                      finalFolderId
                        ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                    }`}
                    title={T("انتخاب فولدر", "Choose folder")}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span className="max-w-[120px] truncate">{selectedFolderLabel}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1.5" align="start">
                  <button
                    type="button"
                    onClick={() => {
                      applyFolder(null);
                      setFolderOpen(false);
                    }}
                    className={`w-full text-start px-2 py-1.5 text-xs rounded-lg cursor-pointer ${
                      finalFolderId === null ? "bg-accent font-semibold" : "hover:bg-accent/50"
                    }`}
                  >
                    {T("اینباکس (بدون فولدر)", "Inbox (no folder)")}
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        applyFolder(f.id);
                        setFolderOpen(false);
                      }}
                      className={`w-full text-start px-2 py-1.5 text-xs rounded-lg truncate cursor-pointer ${
                        finalFolderId === f.id ? "bg-accent font-semibold text-primary" : "hover:bg-accent/50"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Priority Chip */}
              <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                      finalPriority !== "none"
                        ? `${PRIORITY_META[finalPriority].bgClass} ${PRIORITY_META[finalPriority].textClass} border-transparent font-semibold`
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                    }`}
                    title={T("تعیین اولویت", "Set priority")}
                  >
                    <PriorityFlag priority={finalPriority} />
                    <span>{finalPriority !== "none" ? T(PRIORITY_META[finalPriority].label, PRIORITY_META[finalPriority].labelEn) : T("اولویت", "Priority")}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1.5" align="start">
                  {PRIORITY_SELECTABLE.map((p) => {
                    const m = PRIORITY_META[p as Priority];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          applyPriority(p as Priority);
                          setPriorityOpen(false);
                        }}
                        className={`w-full text-start px-2 py-1.5 text-xs rounded-lg flex items-center gap-2 cursor-pointer ${
                          finalPriority === p ? "bg-accent font-semibold" : "hover:bg-accent/50"
                        }`}
                      >
                        <PriorityFlag priority={p} /> {T(m.label, m.labelEn)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      applyPriority("none");
                      setPriorityOpen(false);
                    }}
                    className="w-full text-start px-2 py-1.5 text-xs rounded-lg hover:bg-accent/50 text-muted-foreground border-t mt-1 cursor-pointer"
                  >
                    {T("بدون اولویت", "No priority")}
                  </button>
                </PopoverContent>
              </Popover>

              {/* Tag Chip */}
              <Popover open={tagOpen} onOpenChange={setTagOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                      finalTagIds.length
                        ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                    }`}
                    title={T("افزودن برچسب", "Add tag")}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{finalTagIds.length ? (selectedTag ? selectedTag.name : `+${finalTagIds.length}`) : T("تگ", "Tag")}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1.5" align="start">
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => finalTagIds.includes(t.id) ? removeTag(t.id) : applyTag(t.id)}
                      className={`w-full text-start px-2 py-1.5 text-xs rounded-lg flex items-center gap-2 cursor-pointer ${
                        finalTagIds.includes(t.id) ? "bg-accent font-semibold text-primary" : "hover:bg-accent/50"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color || "#888" }} />
                      {t.name} {finalTagIds.includes(t.id) && <Check className="w-3 h-3 ms-auto" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            {/* Action buttons (Trailing) */}
            <div className="ms-auto flex items-center gap-1.5">
              {chipsTrailing}
              <DropdownMenu open={templateMenuOpen} onOpenChange={setTemplateMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={T("قالب‌های تسک", "Task templates")}
                    aria-label={T("قالب‌های تسک", "Task templates")}
                    disabled={busy || templateSaving}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <FileStack className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-64 max-h-[min(65dvh,24rem)] overflow-y-auto">
                  <DropdownMenuLabel>{T("قالب‌های ذخیره‌شده", "Saved templates")}</DropdownMenuLabel>
                  {workflowRun && (
                    <DropdownMenuItem
                      onSelect={() => {
                        setTemplateMenuOpen(false);
                        setWorkflowPreviewOpen(true);
                      }}
                      className="cursor-pointer font-medium"
                    >
                      <RotateCcw className="me-2 h-3.5 w-3.5" />
                      <span className="min-w-0 truncate">{T("ادامهٔ گردش‌کار", "Resume workflow")}: {workflowRun.templateTitle}</span>
                    </DropdownMenuItem>
                  )}
                  {templates.length ? templates.map(template => (
                    <DropdownMenuItem
                      key={template.id}
                      onSelect={() => buildWorkflowTasksFromTemplate(template).length > 1
                        ? openWorkflowTemplate(template)
                        : applyTemplate(buildTaskFromTemplate(template))}
                      className="cursor-pointer"
                    >
                      <span className="min-w-0 truncate">{template.title}</span>
                      {buildWorkflowTasksFromTemplate(template).length > 1 && (
                        <span className="ms-auto shrink-0 text-[10px] text-muted-foreground">
                          {buildWorkflowTasksFromTemplate(template).length} {T("کار", "tasks")}
                        </span>
                      )}
                    </DropdownMenuItem>
                  )) : (
                    <DropdownMenuItem disabled>{T("هنوز قالبی ذخیره نشده", "No saved templates yet")}</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!finalTitle.trim() || templateSaving}
                    onSelect={beginSaveTemplate}
                    className="cursor-pointer"
                  >
                    <Plus className="me-2 h-3.5 w-3.5" />
                    {T("ذخیرهٔ این تسک به‌عنوان قالب", "Save this task as a template")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={templateSaving}
                    onSelect={beginSaveWorkflowTemplate}
                    className="cursor-pointer"
                  >
                    <FileStack className="me-2 h-3.5 w-3.5" />
                    {T("ذخیرهٔ گردش‌کار چندتسکی", "Save a multi-task workflow")}
                  </DropdownMenuItem>
                  {!!templates.length && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Trash2 className="me-2 h-3.5 w-3.5" />
                        {T("حذف قالب", "Delete a template")}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="max-h-60 w-56 overflow-y-auto">
                        {templates.map(template => (
                          <DropdownMenuItem
                            key={`delete-${template.id}`}
                            onSelect={() => setTemplateToDelete(template)}
                            className="cursor-pointer"
                          >
                            <span className="min-w-0 truncate">{template.title}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTitle("");
                  setFocused(false);
                }}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {T("لغو", "Cancel")}
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={busy || !title.trim()}
                size="sm"
                title={T("افزودن تسک (Enter)", "Add task (Enter)")}
                className="h-7 px-3 rounded-lg bg-primary text-primary-foreground shadow-xs text-xs gap-1 font-medium cursor-pointer"
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>{T("افزودن", "Add")}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={templateSaveOpen}
        onOpenChange={(open) => {
          setTemplateSaveOpen(open);
          if (!open && !templateSaving) {
            setTemplateSaveId("");
            setTemplateSaveMode("single");
            setWorkflowTemplateText("");
          }
        }}
      >
        <DialogContent dir={isEn ? "ltr" : "rtl"} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{templateSaveMode === "workflow" ? T("ذخیرهٔ گردش‌کار", "Save workflow") : T("ذخیرهٔ قالب تسک", "Save task template")}</DialogTitle>
            <DialogDescription>{templateSaveMode === "workflow"
              ? T("برای هر کار یک خط بنویس. زمان‌بندی یا یادآوری به کارها اضافه نمی‌شود.", "Write one task per line. No schedule or reminder is added.")
              : T("عنوان، اولویت، فولدر، تکرار و برچسب‌ها ذخیره می‌شوند. زمان‌بندی دقیق و یادآور ذخیره نمی‌شوند.", "The title, priority, folder, recurrence, and tags are saved. Exact scheduling and reminders are not.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label htmlFor="quick-add-template-name" className="text-sm font-medium">
              {templateSaveMode === "workflow" ? T("نام گردش‌کار", "Workflow name") : T("نام قالب", "Template name")}
            </label>
            <Input
              id="quick-add-template-name"
              value={templateName}
              onChange={event => setTemplateName(event.target.value)}
              maxLength={500}
              autoFocus
            />
            {templateSaveMode === "workflow" ? (
              <div className="space-y-1.5">
                <label htmlFor="quick-add-workflow-tasks" className="text-sm font-medium">
                  {T("کارها، هرکدام در یک خط", "Tasks, one per line")}
                </label>
                <Textarea
                  id="quick-add-workflow-tasks"
                  aria-label={T("کارها، هرکدام در یک خط", "Tasks, one per line")}
                  value={workflowTemplateText}
                  onChange={event => setWorkflowTemplateText(event.target.value)}
                  placeholder={T("برنامه‌ریزی کار\nآماده‌کردن وسایل\nمرور نتیجه", "Plan the work\nPrepare materials\nReview the result")}
                  rows={6}
                  maxLength={20_000}
                />
                <p className="text-xs text-muted-foreground">
                  {T(`${workflowTemplateTitles.length} کار؛ دست‌کم ۲ و حداکثر ۱۰۰ کار.`, `${workflowTemplateTitles.length} tasks; enter 2 to 100.`)}
                </p>
                {workflowTemplateTooMany && <p className="text-xs text-destructive">{T("حداکثر تعداد کارها ۱۰۰ است.", "The maximum is 100 tasks.")}</p>}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="quick-add-template-offset" className="text-sm font-medium">
                  {T("زمان نسبی برحسب ساعت (اختیاری)", "Relative time in hours (optional)")}
              </label>
              <Input
                id="quick-add-template-offset"
                type="number"
                min={0}
                max={24 * 365}
                step={1}
                inputMode="numeric"
                placeholder={T("خالی بماند تا بدون زمان باشد", "Leave blank for no schedule")}
                value={templateOffsetHours}
                onChange={event => setTemplateOffsetHours(event.target.value)}
              />
              {templateOffsetInvalid && (
                <p className="text-xs text-destructive">
                  {T("عدد صحیحی از صفر تا ۸۷۶۰ وارد کنید.", "Enter a whole number from 0 to 8760.")}
                </p>
              )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTemplateSaveOpen(false)} disabled={templateSaving}>
              {T("لغو", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={confirmSaveTemplate}
              disabled={templateSaving || !templateName.trim() || (templateSaveMode === "single" ? templateOffsetInvalid : workflowTemplateTitles.length < 2 || workflowTemplateTooMany)}
            >
              {templateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : T("ذخیره", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={workflowPreviewOpen && !!workflowRun} onOpenChange={closeWorkflowPreview}>
        <DialogContent dir={isEn ? "ltr" : "rtl"} className="sm:max-w-xl max-h-[88dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{T("بازبینی گردش‌کار", "Review workflow")}: {workflowRun?.templateTitle}</DialogTitle>
            <DialogDescription>
              {T("پیش از تأیید چیزی ذخیره نمی‌شود. هر ردیف را ویرایش یا از این نوبت حذف کن. اگر ذخیره بخشی از کارها شکست بخورد، همان شناسه‌ها حفظ می‌شوند و فقط موارد ناموفق دوباره فرستاده می‌شوند.", "Nothing is saved before confirmation. Edit or skip rows for this use. If some saves fail, their IDs are preserved and only failed rows are retried.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {workflowRun?.tasks.map((task, index) => {
              const completed = task.state === "saved" || task.state === "queued";
              const stateLabel = task.state === "saved" ? T("ذخیره شد", "Saved")
                : task.state === "queued" ? T("در صف همگام‌سازی", "Queued for sync")
                  : task.state === "failed" ? T("ناموفق", "Failed") : T("آماده", "Ready");
              return (
                <div key={task.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label={T(`افزودن کار ${index + 1}`, `Include task ${index + 1}`)}
                      checked={task.include}
                      disabled={workflowSaving || completed}
                      onChange={event => editWorkflowTask(task.id, { include: event.target.checked })}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <Input
                      aria-label={T(`عنوان کار ${index + 1}`, `Task ${index + 1} title`)}
                      value={task.title}
                      maxLength={500}
                      disabled={workflowSaving || completed}
                      onChange={event => editWorkflowTask(task.id, { title: event.target.value })}
                    />
                    <span className={`shrink-0 text-[11px] ${task.state === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                      {stateLabel}
                    </span>
                  </div>
                  {task.state === "failed" && task.error && (
                    <p className="ps-6 text-xs text-destructive">{task.error}</p>
                  )}
                </div>
              );
            })}
          </div>
          {!!workflowRun?.tasks.some(task => task.state === "saved" || task.state === "queued") && (
            <p className="text-xs text-muted-foreground">
              {T("کارهای ذخیره‌شده دوباره فرستاده نمی‌شوند. بستن این پنجره، پیش‌نویس و شناسه‌های باقی‌مانده را نگه می‌دارد.", "Saved tasks will not be sent again. Closing this dialog keeps the remaining draft and IDs.")}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => closeWorkflowPreview(false)} disabled={workflowSaving}>
              {workflowRun?.tasks.some(task => task.attempted)
                ? T("بستن و نگه‌داشتن پیشرفت", "Close and keep progress")
                : T("لغو", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void confirmWorkflowRun()}
              disabled={workflowSaving || !workflowRun?.tasks.some(task => task.include && (task.state === "pending" || task.state === "failed"))}
            >
              {workflowSaving ? <Loader2 className="h-4 w-4 animate-spin" />
                : workflowRun?.tasks.some(task => task.include && task.state === "failed")
                  ? T("تلاش دوباره برای ناموفق‌ها", "Retry failed tasks")
                  : T("ساخت کارهای انتخاب‌شده", "Create selected tasks")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!templateToDelete} onOpenChange={open => { if (!open && !templateDeleting) setTemplateToDelete(null); }}>
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("حذف قالب؟", "Delete template?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {T(`قالب «${templateToDelete?.title || ""}» برای این حساب حذف می‌شود.`, `“${templateToDelete?.title || ""}” will be deleted from this account.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={templateDeleting}>{T("لغو", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={event => { event.preventDefault(); void confirmDeleteTemplate(); }} disabled={templateDeleting}>
              {templateDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : T("حذف", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
