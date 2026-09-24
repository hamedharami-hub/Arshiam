import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Plus, Loader2, Calendar as CalendarIcon, Tag, Folder, Flag, Check } from "lucide-react";
import { parseNaturalDate } from "@/lib/nlDate";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DueDatePicker } from "@/components/DueDatePicker";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PRIORITY_META, PRIORITY_SELECTABLE, type Priority } from "@/lib/priority";
import type { Task } from "@/lib/taskTypes";
import { listTaskTemplates, buildTaskFromTemplate } from "@/lib/taskTemplates";
import { uploadMediaFull } from "@/lib/uploadMedia";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { enqueueOp } from "@/lib/offlineQueue";

type Defaults = {
  folder_id?: string | null;
  due_date?: string | null;
  parent_id?: string | null;
  tag_id?: string | null;
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

export function QuickAddTask({
  defaults = {},
  placeholder,
  onCreated,
  className = "",
  chipsTrailing,
}: {
  defaults?: Defaults;
  placeholder?: string;
  onCreated?: (taskId: string) => void;
  className?: string;
  chipsTrailing?: React.ReactNode;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [due, setDue] = useState<string | null>(defaults.due_date ?? null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [folderId, setFolderId] = useState<string | null>(defaults.folder_id ?? null);
  const [tagIds, setTagIds] = useState<string[]>(defaults.tag_id ? [defaults.tag_id] : []);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [templates, setTemplates] = useState<Partial<Task>[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
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
    setDue(defaults.due_date ?? null);
  }, [defaults.due_date]);

  useEffect(() => {
    setFolderId(defaults.folder_id ?? null);
  }, [defaults.folder_id]);

  useEffect(() => {
    setTagIds(defaults.tag_id ? [defaults.tag_id] : []);
  }, [defaults.tag_id]);

  useEffect(() => {
    if (!user) return;
    firebaseStore.from("folders").select("id,name").order("name").then(({ data }) => setFolders((data as any) || []));
    firebaseStore.from("tags").select("id,name,color").order("name").then(({ data }) => setTags((data as any) || []));
    listTaskTemplates(user.id).then((tpls) => {
      setTemplates(tpls.map(t => buildTaskFromTemplate(t)));
    }).catch(() => {});
  }, [user]);

  // Live natural-language parsing: date, #tag, @folder, !priority.
  const parsed = useMemo(() => {
    const tokens = title.trim().split(/\s+/).filter(Boolean);
    const kept: string[] = [];
    const matchedTagIds: string[] = [];
    let matchedFolderId: string | null = null;
    let matchedPriority: Priority | null = null;

    for (const token of tokens) {
      if (token.startsWith("#")) {
        const name = token.slice(1).trim();
        const tag = tags.find(tg => tg.name.toLowerCase() === name.toLowerCase());
        if (tag) matchedTagIds.push(tag.id);
        continue;
      }
      if (token.startsWith("@")) {
        const name = token.slice(1).trim().toLowerCase();
        const folder = folders.find(f => f.name.toLowerCase() === name);
        if (folder) matchedFolderId = folder.id;
        continue;
      }
      if (token.startsWith("!")) {
        const key = token.slice(1).trim().toLowerCase();
        if (priorityKeywords[key]) {
          matchedPriority = priorityKeywords[key];
          continue;
        }
      }
      kept.push(token);
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

  const finalDue = due ?? defaults.due_date ?? parsed.dueDate ?? null;
  const finalTitle = parsed.title;
  const finalPriority = priority ?? parsed.priority ?? "none";
  const finalFolderId = folderId ?? parsed.folderId ?? defaults.folder_id ?? null;
  const finalTagIds = Array.from(new Set([
    ...(defaults.tag_id ? [defaults.tag_id] : []),
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
      due_date: finalDue,
      parent_id: defaults.parent_id ?? null,
      priority: finalPriority,
      completed: false,
      status: "todo" as const,
      created_at: new Date().toISOString(),
      position: 0,
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      // Offline: queue task and tags. Attachments cannot be uploaded offline and are skipped.
      try {
        await enqueueOp({ table: "tasks", op: "insert", payload: baseTask });
        if (finalTagIds.length) {
          await enqueueOp({
            table: "task_tags",
            op: "insert",
            payload: finalTagIds.map(tag_id => ({ task_id: tempId, tag_id, user_id: user.id })),
          });
        }
        if (selectedFiles.length) {
          toast.info(T("پیوست‌ها در حالت آفلاین ذخیره نمی‌شوند", "Attachments are not saved while offline"));
        }
        setTitle("");
        setDue(defaults.due_date ?? null);
        setPriority(null);
        setFolderId(defaults.folder_id ?? null);
        setTagIds(defaults.tag_id ? [defaults.tag_id] : []);
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
      if (finalTagIds.length) {
        try {
          const { error } = await firebaseStore
            .from("task_tags")
            .insert(finalTagIds.map(tag_id => ({ task_id: tempId, tag_id, user_id: user.id })));
          if (error) throw error;
        } catch (tagErr) {
          console.warn("[QuickAddTask] Failed to link tags online, queueing offline:", tagErr);
          await enqueueOp({
            table: "task_tags",
            op: "insert",
            payload: finalTagIds.map(tag_id => ({ task_id: tempId, tag_id, user_id: user.id })),
          });
          toast.info(T("تسک ذخیره شد؛ همگام‌سازی تگ‌ها با اتصال اینترنت کامل می‌شود", "Task saved — tags will sync when online"));
        }
      }

    setTitle("");
    setDue(defaults.due_date ?? null);
    setPriority(null);
    setFolderId(defaults.folder_id ?? null);
    setTagIds(defaults.tag_id ? [defaults.tag_id] : []);
    setSelectedFiles([]);
    setFocused(false);
    window.dispatchEvent(new Event("tasks-changed"));
    onCreated?.(tempId);
    toast.success(T("تسک با موفقیت ذخیره شد", "Task created successfully"));
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
    const clean = title.split(/\s+/).filter(w => !w.startsWith("@")).join(" ");
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
      const tagNameLower = tag.name.toLowerCase();
      setTitle((title || "").split(/\s+/).filter(w => (w || "").toLowerCase() !== `#${tagNameLower}`).join(" "));
    }
  };

  const applyTemplate = (tpl: Partial<Task>) => {
    if (tpl.title) setTitle(tpl.title);
    if (tpl.due_date) setDue(tpl.due_date);
    if (tpl.priority) setPriority(tpl.priority);
    if (tpl.folder_id) setFolderId(tpl.folder_id);
    setTemplateOpen(false);
    setMoreOpen(false);
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

  const saveAsTemplate = async () => {
    if (!user || !title.trim()) return;
    try {
      const payload = {
        id: generateId(),
        user_id: user.id,
        title: finalTitle,
        priority: finalPriority,
        folder_id: finalFolderId,
        due_offset_hours: finalDue ? Math.round((new Date(finalDue).getTime() - Date.now()) / 3600000) : null,
      };
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOp({ table: "task_templates", op: "insert", payload });
        toast.success(T("ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Saved — will sync when online"));
        setMoreOpen(false);
        return;
      }
      await firebaseStore.from("task_templates").insert(payload as never);
      toast.success(T("ذخیره شد در تمپلیت‌ها", "Saved to templates"));
      setMoreOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : T("خطا", "Error"));
    }
  };

  const openFullScreen = () => {
    const qp = new URLSearchParams();
    if (title.trim()) qp.set("title", finalTitle);
    if (finalDue) qp.set("due_date", finalDue);
    if (finalFolderId) qp.set("folder_id", finalFolderId);
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

  const formatDueLabel = (iso: string | null) => {
    if (!iso) return T("تاریخ", "Date");
    const d = new Date(iso);
    if (isNaN(d.getTime())) return T("تاریخ", "Date");
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
      const d = new Date(finalDue);
      if (!isNaN(d.getTime()) && isDateToday(d)) {
        return T("امروز", "Today");
      }
    }
    return T("اینباکس", "Inbox");
  }, [finalFolderId, finalDue, folders, isEn]);

  const defaultPlaceholder = T(`+ افزودن تسک به «${targetScopeName}»`, `+ Add task to "${targetScopeName}"`);
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
            className="flex items-center gap-2 select-none group flex-1 cursor-text min-w-0"
          >
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors truncate">
              {title.trim() ? title : placeholderText}
            </span>
          </div>
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
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
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
                    <span>{formatDueLabel(finalDue)}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-3 p-3" align="start">
                  <DueDatePicker
                    value={due}
                    onChange={(val) => {
                      setDue(val);
                      setDateOpen(false);
                    }}
                    compact
                  />
                </PopoverContent>
              </Popover>

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
                    <Flag className={`w-3.5 h-3.5 ${finalPriority !== "none" ? PRIORITY_META[finalPriority].textClass : ""}`} />
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
                        <Flag className={`w-3 h-3 ${m.textClass}`} /> {T(m.label, m.labelEn)}
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
    </div>
  );
}
