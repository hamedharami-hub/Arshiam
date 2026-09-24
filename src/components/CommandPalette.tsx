import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { cacheGet } from "@/lib/offlineQueue";
import { extractTasksFromCache } from "@/features/tasks/taskCache";
import {
  ListTodo, FileText, Calendar, Target, Heart, Brain, Sparkles,
  Timer, Settings, BarChart3, BookOpen, Folder, Hash, Compass,
  PlusCircle, Database, CheckSquare, Search, ShieldAlert,
} from "lucide-react";

import { useBilingual } from "@/hooks/useBilingual";

type Hit = {
  kind: "task" | "note" | "folder" | "tag" | "action";
  id: string;
  title: string;
  subtitle?: string;
  action?: () => void;
};

const getNavItems = (T: (fa: string, en: string) => string) => [
  { label: T("اینباکس", "Inbox"), to: "/app/inbox", icon: ListTodo, keywords: "inbox اینباکس ورودی" },
  { label: T("امروز", "Today"), to: "/app/today", icon: ListTodo, keywords: "today امروز" },
  { label: T("فردا", "Tomorrow"), to: "/app/tomorrow", icon: Calendar, keywords: "tomorrow فردا" },
  { label: T("هفت روز آینده", "Next 7 Days"), to: "/app/next7", icon: Calendar, keywords: "week 7 آینده" },
  { label: T("تقویم", "Calendar"), to: "/app/calendar", icon: Calendar, keywords: "calendar تقویم" },
  { label: T("نوت‌ها", "Notes"), to: "/app/notes", icon: FileText, keywords: "notes نوت یادداشت" },
  { label: T("عادات", "Habits"), to: "/app/habits", icon: Heart, keywords: "habits عادت" },
  { label: T("پومودورو", "Pomodoro"), to: "/app/pomodoro", icon: Timer, keywords: "pomodoro تمرکز پومودورو" },
  { label: T("آمار و عملکرد", "Stats & Summary"), to: "/app/stats", icon: BarChart3, keywords: "stats summary statistics آمار خلاصه" },
  { label: T("داشبورد ذهن", "Mind Dashboard"), to: "/app/mind", icon: Brain, keywords: "mind ذهن داشبورد" },
  { label: T("خودشناسی", "Self Knowledge"), to: "/app/self", icon: Brain, keywords: "self شخصیت" },
  { label: T("چک‌این روزانه", "Daily Check-in"), to: "/app/checkin", icon: Heart, keywords: "checkin checkin روزانه" },
  { label: T("ثبت افکار CBT", "CBT Thoughts"), to: "/app/thoughts", icon: Brain, keywords: "thought cbt افکار" },
  { label: T("مدل ABC", "ABC Model"), to: "/app/abc", icon: Brain, keywords: "abc الگو" },
  { label: T("چت سقراطی", "Socratic Chat"), to: "/app/socratic", icon: Brain, keywords: "socratic سقراط" },
  { label: T("تمرین تنفس", "Breathing Exercise"), to: "/app/breathing", icon: Heart, keywords: "breath breathing تنفس مدیتیشن" },
  { label: T("پشتیبانی بحران و اضطراری (SOS)", "Crisis Support & Emergency (SOS)"), to: "/app/crisis", icon: ShieldAlert, keywords: "crisis sos help emergency بحران اضطراری کمک اورژانس خودکشی" },
  { label: T("معمار زندگی", "Life Architect"), to: "/app/life-architect", icon: Compass, keywords: "life architect معمار زندگی برنامه ریزی هدف اهداف" },
  { label: T("تنظیمات و پشتیبان‌گیری", "Settings & Backup"), to: "/app/settings", icon: Settings, keywords: "settings تنظیمات بکاپ firestore firebaseStore" },
];

export default function CommandPalette() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  const navItems = useMemo(() => getNavItems(T), [T]);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const customHandler = () => setOpen(true);

    window.addEventListener("keydown", keyHandler);
    window.addEventListener("arshnaz:open-search", customHandler);
    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("arshnaz:open-search", customHandler);
    };
  }, []);

  // Offline-first fast search: caches first, then remote
  useEffect(() => {
    if (!open) return;
    const term = q.trim().toLowerCase();
    if (!term || term.length < 1) {
      setHits([]);
      return;
    }

    let cancelled = false;
    let localHits: Hit[] = [];

    // 1. Instant local search from cache
    async function searchLocal() {
      localHits = [];

      // Local cached tasks
      try {
        let cachedTasks: any[] = [];
        if (user) {
          const userTasks = extractTasksFromCache(await cacheGet<unknown>(`tasks:all:${user.id}`));
          if (userTasks.length > 0) cachedTasks = userTasks;
        }
        if (!cachedTasks.length) {
          const generalTasks = extractTasksFromCache(await cacheGet<unknown>("tasks"));
          if (generalTasks.length > 0) cachedTasks = generalTasks;
        }
        cachedTasks.forEach((t) => {
          if (t?.title?.toLowerCase().includes(term) || t?.description?.toLowerCase().includes(term)) {
            let dueSubtitle: string | undefined;
            if (t.due_date) {
              try {
                const parsedDate = new Date(t.due_date);
                if (!isNaN(parsedDate.getTime())) {
                  dueSubtitle = `${T("موعد", "Due")}: ${parsedDate.toLocaleDateString(isEn ? "en-US" : "fa-IR")}`;
                }
              } catch {}
            }
            localHits.push({
              kind: "task",
              id: t.id,
              title: t.title || T("بدون عنوان", "Untitled"),
              subtitle: dueSubtitle,
            });
          }
        });
      } catch {}

      // Local cached notes
      try {
        let notesList: any[] = [];
        if (user) {
          const userNotes = await cacheGet<any[]>(`notes:all:${user.id}`);
          if (Array.isArray(userNotes)) notesList = userNotes;
        }
        if (!notesList.length) {
          const rawNotes = localStorage.getItem("arshnaz_notes") || localStorage.getItem("notes");
          if (rawNotes) {
            const parsedNotes = JSON.parse(rawNotes);
            if (Array.isArray(parsedNotes)) notesList = parsedNotes;
          }
        }
        notesList.forEach((n: any) => {
          if (n?.title?.toLowerCase().includes(term) || n?.content?.toLowerCase().includes(term)) {
            localHits.push({
              kind: "note",
              id: n.id,
              title: n.title || T("بدون عنوان", "Untitled"),
              subtitle: n.folder_id ? T("درون پوشه", "In folder") : undefined,
            });
          }
        });
      } catch {}

      if (!cancelled) {
        setHits(localHits.slice(0, 20));
      }
    }

    searchLocal();

    // 2. Debounced remote enhancement if logged in
    if (!user) return;
    const t = setTimeout(async () => {
      try {
        const queryTerm = term.trim().toLowerCase();
        if (!queryTerm) return;

        const [tasksRes, notesRes, foldersRes, tagsRes] = await Promise.all([
          firebaseStore.from("tasks").select("id,title,description").eq("user_id", user.id),
          firebaseStore.from("notes").select("id,title,content").eq("user_id", user.id),
          firebaseStore.from("folders").select("id,name").eq("user_id", user.id),
          firebaseStore.from("tags").select("id,name").eq("user_id", user.id),
        ]);

        const remoteMap = new Map<string, Hit>();
        // Add existing local hits
        localHits.forEach((h) => remoteMap.set(`${h.kind}-${h.id}`, h));

        ((tasksRes.data || []) as any[])
          .filter((x) =>
            (x.title && String(x.title).toLowerCase().includes(queryTerm)) ||
            (x.description && String(x.description).toLowerCase().includes(queryTerm))
          )
          .slice(0, 8)
          .forEach((x) => {
            remoteMap.set(`task-${x.id}`, { kind: "task", id: x.id, title: x.title || "" });
          });

        ((notesRes.data || []) as any[])
          .filter((x) =>
            (x.title && String(x.title).toLowerCase().includes(queryTerm)) ||
            (x.content && String(x.content).toLowerCase().includes(queryTerm))
          )
          .slice(0, 6)
          .forEach((x) => {
            remoteMap.set(`note-${x.id}`, { kind: "note", id: x.id, title: x.title || "" });
          });

        ((foldersRes.data || []) as any[])
          .filter((x) => x.name && String(x.name).toLowerCase().includes(queryTerm))
          .slice(0, 4)
          .forEach((x) => {
            remoteMap.set(`folder-${x.id}`, { kind: "folder", id: x.id, title: x.name || "" });
          });

        ((tagsRes.data || []) as any[])
          .filter((x) => x.name && String(x.name).toLowerCase().includes(queryTerm))
          .slice(0, 4)
          .forEach((x) => {
            remoteMap.set(`tag-${x.id}`, { kind: "tag", id: x.id, title: x.name || "" });
          });

        const sorted = Array.from(remoteMap.values()).sort((a, b) => {
          const aTitle = (a.title || "").toLowerCase();
          const bTitle = (b.title || "").toLowerCase();
          const aExact = aTitle === term ? 2 : aTitle.startsWith(term) ? 1 : 0;
          const bExact = bTitle === term ? 2 : bTitle.startsWith(term) ? 1 : 0;
          return bExact - aExact;
        });

        setHits(sorted.slice(0, 25));
      } catch {
        // Fallback to localHits if remote fails
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, user, open, T, isEn]);

  const go = useCallback((to: string) => {
    setOpen(false);
    setQ("");
    navigate(to);
  }, [navigate]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center px-3 border-b border-border/50" dir={isEn ? "ltr" : "rtl"}>
        <Search className="w-4 h-4 text-muted-foreground me-2 shrink-0" />
        <CommandInput
          dir={isEn ? "ltr" : "rtl"}
          placeholder={T("جستجو در تسک‌ها، نوت‌ها، فولدرها، تگ‌ها یا رفتن به صفحه... (Ctrl+K)", "Search tasks, notes, folders, tags, or jump to page... (Ctrl+K)")}
          value={q}
          onValueChange={setQ}
          className="text-sm h-12"
        />
      </div>

      <CommandList className="max-h-[65vh] overflow-y-auto" dir={isEn ? "ltr" : "rtl"}>
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          {T("هیچ موردی منطبق با عبارت مورد نظر پیدا نشد.", "No results found for your query.")}
        </CommandEmpty>

        {/* Quick action shortcuts */}
        <CommandGroup heading={T("اقدامات سریع", "Quick Actions")}>
          <CommandItem
            value={`ایجاد تسک جدید new task add ${T("ایجاد تسک جدید", "New Task")}`}
            onSelect={() => {
              setOpen(false);
              navigate("/app/inbox");
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("arshnaz:quick-add-task"));
              }, 100);
            }}
          >
            <PlusCircle className="w-4 h-4 ms-2 text-primary" />
            <span>{T("ایجاد تسک جدید", "Create New Task")}</span>
            <span className="ms-auto text-[11px] text-muted-foreground font-mono">N</span>
          </CommandItem>

          <CommandItem
            value={`همگام‌سازی ابری فایربیس firebase sync cloud ${T("وضعیت همگام‌سازی و پشتیبان ابری", "Cloud sync and backup status")}`}
            onSelect={() => go("/app/settings")}
          >
            <Database className="w-4 h-4 ms-2 text-amber-500" />
            <span>{T("وضعیت همگام‌سازی و پشتیبان ابری", "Cloud Sync & Backup Status")}</span>
            <span className="ms-auto text-[11px] text-amber-500 font-medium">Firestore</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {hits.length > 0 && (
          <>
            <CommandGroup heading={T("نتایج جستجو", "Search Results")}>
              {hits.map((h) => {
                const Icon = h.kind === "task" ? CheckSquare : h.kind === "note" ? FileText : h.kind === "folder" ? Folder : Hash;
                const to = h.kind === "task" ? `/app/tasks/${h.id}` :
                           h.kind === "note" ? `/app/notes` :
                           h.kind === "folder" ? `/app/folder/${h.id}` : `/app/tag/${h.id}`;
                return (
                  <CommandItem
                    key={`${h.kind}-${h.id}`}
                    value={`${h.kind} ${h.title}`}
                    onSelect={() => go(to)}
                    className="flex items-center justify-between py-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium">{h.title}</span>
                      {h.subtitle && (
                        <span className="text-xs text-muted-foreground/80 truncate">
                          ({h.subtitle})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium shrink-0">
                      {h.kind === "task" ? T("تسک", "Task") : h.kind === "note" ? T("نوت", "Note") : h.kind === "folder" ? T("فولدر", "Folder") : T("تگ", "Tag")}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading={T("بخش‌ها و صفحات اپلیکیشن", "App Sections & Pages")}>
          {navItems.map((n) => {
            const Icon = n.icon;
            return (
              <CommandItem key={n.to} value={`${n.label} ${n.keywords}`} onSelect={() => go(n.to)} className="cursor-pointer">
                <Icon className="w-4 h-4 ms-2 text-muted-foreground" />
                <span>{n.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
