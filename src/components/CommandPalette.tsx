import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cacheGet } from "@/lib/offlineQueue";
import {
  ListTodo, FileText, Calendar, Target, Heart, Brain, Sparkles,
  Timer, Settings, BarChart3, BookOpen, Folder, Hash, Compass,
  PlusCircle, Database, CheckSquare, Search,
} from "lucide-react";

type Hit = {
  kind: "task" | "note" | "folder" | "tag" | "action";
  id: string;
  title: string;
  subtitle?: string;
  action?: () => void;
};

const NAV = [
  { label: "اینباکس", to: "/app/inbox", icon: ListTodo, keywords: "inbox اینباکس ورودی" },
  { label: "امروز", to: "/app/today", icon: ListTodo, keywords: "today امروز" },
  { label: "فردا", to: "/app/tomorrow", icon: Calendar, keywords: "tomorrow فردا" },
  { label: "هفت روز آینده", to: "/app/next7", icon: Calendar, keywords: "week 7 آینده" },
  { label: "تقویم", to: "/app/calendar", icon: Calendar, keywords: "calendar تقویم" },
  { label: "نوت‌ها", to: "/app/notes", icon: FileText, keywords: "notes نوت یادداشت" },
  { label: "عادات", to: "/app/habits", icon: Heart, keywords: "habits عادت" },
  { label: "Pomodoro", to: "/app/pomodoro", icon: Timer, keywords: "pomodoro تمرکز پومودورو" },
  { label: "آمار و عملکرد", to: "/app/stats", icon: BarChart3, keywords: "stats summary statistics آمار خلاصه" },
  { label: "داشبورد ذهن", to: "/app/mind", icon: Brain, keywords: "mind ذهن داشبورد" },
  { label: "خودشناسی", to: "/app/self", icon: Brain, keywords: "self شخصیت" },
  { label: "چک‌این روزانه", to: "/app/checkin", icon: Heart, keywords: "checkin checkin روزانه" },
  { label: "ثبت افکار CBT", to: "/app/thoughts", icon: Brain, keywords: "thought cbt افکار" },
  { label: "مدل ABC", to: "/app/abc", icon: Brain, keywords: "abc الگو" },
  { label: "چت سقراطی", to: "/app/socratic", icon: Brain, keywords: "socratic سقراط" },
  { label: "تمرین تنفس", to: "/app/breathing", icon: Heart, keywords: "breath breathing تنفس مدیتیشن" },
  { label: "معمار زندگی", to: "/app/life-architect", icon: Compass, keywords: "life architect معمار زندگی برنامه ریزی هدف اهداف" },
  { label: "تنظیمات و پشتیبان‌گیری", to: "/app/settings", icon: Settings, keywords: "settings تنظیمات بکاپ firestore supabase" },
];

export default function CommandPalette() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

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

    // 1. Instant local search from cache
    async function searchLocal() {
      const localHits: Hit[] = [];

      // Local cached tasks
      try {
        let cachedTasks: any[] = [];
        if (user) {
          const userTasks = await cacheGet<any[]>(`tasks:all:${user.id}`);
          if (Array.isArray(userTasks)) cachedTasks = userTasks;
        }
        if (!cachedTasks.length) {
          const generalTasks = await cacheGet<any[]>("tasks");
          if (Array.isArray(generalTasks)) cachedTasks = generalTasks;
        }
        cachedTasks.forEach((t) => {
          if (t?.title?.toLowerCase().includes(term) || t?.description?.toLowerCase().includes(term)) {
            localHits.push({
              kind: "task",
              id: t.id,
              title: t.title || "بدون عنوان",
              subtitle: t.due_date ? `موعد: ${new Date(t.due_date).toLocaleDateString("fa-IR")}` : undefined,
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
              title: n.title || "بدون عنوان",
              subtitle: n.folder_id ? "درون پوشه" : undefined,
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
        const pattern = `%${term}%`;
        const [tasksRes, notesRes, foldersRes, tagsRes] = await Promise.all([
          supabase.from("tasks").select("id,title,description").eq("user_id", user.id).or(`title.ilike.${pattern},description.ilike.${pattern}`).limit(8),
          supabase.from("notes").select("id,title").eq("user_id", user.id).or(`title.ilike.${pattern},content.ilike.${pattern}`).limit(6),
          supabase.from("folders").select("id,name").eq("user_id", user.id).ilike("name", pattern).limit(4),
          supabase.from("tags").select("id,name").eq("user_id", user.id).ilike("name", pattern).limit(4),
        ]);

        const remoteMap = new Map<string, Hit>();
        // Add existing local hits
        localHits.forEach((h) => remoteMap.set(`${h.kind}-${h.id}`, h));

        ((tasksRes.data || []) as any[]).forEach((x) => {
          remoteMap.set(`task-${x.id}`, { kind: "task", id: x.id, title: x.title });
        });
        ((notesRes.data || []) as any[]).forEach((x) => {
          remoteMap.set(`note-${x.id}`, { kind: "note", id: x.id, title: x.title });
        });
        ((foldersRes.data || []) as any[]).forEach((x) => {
          remoteMap.set(`folder-${x.id}`, { kind: "folder", id: x.id, title: x.name });
        });
        ((tagsRes.data || []) as any[]).forEach((x) => {
          remoteMap.set(`tag-${x.id}`, { kind: "tag", id: x.id, title: x.name });
        });

        const sorted = Array.from(remoteMap.values()).sort((a, b) => {
          const aExact = a.title.toLowerCase() === term ? 2 : a.title.toLowerCase().startsWith(term) ? 1 : 0;
          const bExact = b.title.toLowerCase() === term ? 2 : b.title.toLowerCase().startsWith(term) ? 1 : 0;
          return bExact - aExact;
        });

        setHits(sorted.slice(0, 25));
      } catch {
        // Fallback to localHits if remote fails
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, user, open]);

  const go = useCallback((to: string) => {
    setOpen(false);
    setQ("");
    navigate(to);
  }, [navigate]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center px-3 border-b border-border/50" dir="rtl">
        <Search className="w-4 h-4 text-muted-foreground me-2 shrink-0" />
        <CommandInput
          dir="rtl"
          placeholder="جستجو در تسک‌ها، نوت‌ها، فولدرها، تگ‌ها یا رفتن به صفحه... (Ctrl+K)"
          value={q}
          onValueChange={setQ}
          className="text-sm h-12"
        />
      </div>

      <CommandList className="max-h-[65vh] overflow-y-auto" dir="rtl">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          هیچ موردی منطبق با عبارت مورد نظر پیدا نشد.
        </CommandEmpty>

        {/* Quick action shortcuts */}
        <CommandGroup heading="اقدامات سریع">
          <CommandItem
            value="ایجاد تسک جدید new task add"
            onSelect={() => {
              setOpen(false);
              navigate("/app/inbox");
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("arshnaz:quick-add-task"));
              }, 100);
            }}
          >
            <PlusCircle className="w-4 h-4 ms-2 text-primary" />
            <span>ایجاد تسک جدید</span>
            <span className="ms-auto text-[11px] text-muted-foreground font-mono">N</span>
          </CommandItem>

          <CommandItem
            value="همگام‌سازی ابری فایربیس firebase sync cloud"
            onSelect={() => go("/app/settings")}
          >
            <Database className="w-4 h-4 ms-2 text-amber-500" />
            <span>وضعیت همگام‌سازی و پشتیبان ابری</span>
            <span className="ms-auto text-[11px] text-amber-500 font-medium">Firestore</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {hits.length > 0 && (
          <>
            <CommandGroup heading="نتایج جستجو">
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
                      {h.kind === "task" ? "تسک" : h.kind === "note" ? "نوت" : h.kind === "folder" ? "فولدر" : "تگ"}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="بخش‌ها و صفحات اپلیکیشن">
          {NAV.map((n) => {
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
