import { isPathAllowed, useModules } from "@/lib/appModules";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { cacheGet } from "@/lib/offlineQueue";
import { extractTasksFromCache } from "@/features/tasks/taskCache";
import { FileText, Folder, Hash, PlusCircle, Database, CheckSquare, Search } from "lucide-react";
import { FEATURES, featureSearchText, getFeatureLabel } from "@/lib/featureRegistry";

import { useBilingual } from "@/hooks/useBilingual";
import { parseTaskDueDate, taskWorkDate } from "@/lib/taskDate";

type Hit = {
  kind: "task" | "note" | "folder" | "tag" | "action";
  id: string;
  title: string;
  subtitle?: string;
  searchText: string;
  snippet?: string;
  action?: () => void;
};

// Retrieval and cmdk use the same literal, case-insensitive matching policy.
function matchesSearch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function commandFilter(value: string, search: string, keywords?: string[]): number {
  return matchesSearch(keywords?.length ? keywords.join(" ") : value, search) ? 1 : 0;
}

function contentHit(kind: "task" | "note", row: any, term: string, untitled: string): Hit | undefined {
  const title = String(row.title || untitled);
  const body = String((kind === "task" ? row.description : row.content) || "").replace(/<[^>]*>/g, " ");
  const searchText = `${title} ${body}`;
  if (!matchesSearch(searchText, term)) return undefined;
  const matchIndex = body.toLowerCase().indexOf(term);
  const start = Math.max(0, matchIndex - 45);
  const end = Math.min(body.length, matchIndex + term.length + 75);
  return {
    kind, id: row.id, title, searchText,
    snippet: matchIndex < 0 ? undefined : `${start ? "…" : ""}${body.slice(start, end)}${end < body.length ? "…" : ""}`,
  };
}

type SearchResult = {
  owner: string | null;
  term: string;
  hits: Hit[];
  status: "pending" | "ready" | "error";
};

export default function CommandPalette() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const owner = user?.id || null;
  const term = q.trim().toLowerCase();
  const generation = useRef(0);
  const context = useRef({ owner, term, open });
  context.current = { owner, term, open };
  const currentResult = open && result?.owner === owner && result.term === term ? result : null;
  const hits = currentResult?.hits || [];
  const status = currentResult?.status || (open && term ? "pending" : "ready");

  const modules = useModules();
  const features = useMemo(
    () => FEATURES.filter((f) => isPathAllowed(f.to, modules)).sort((a, b) => a.order - b.order),
    [modules],
  );

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
    const request = ++generation.current;
    let cancelled = false;
    let localHits: Hit[] = [];
    const isCurrent = () => !cancelled && generation.current === request &&
      context.current.open && context.current.owner === owner && context.current.term === term;
    const publish = (nextHits: Hit[], nextStatus: SearchResult["status"]) => {
      if (isCurrent()) setResult({ owner, term, hits: nextHits, status: nextStatus });
    };
    if (!open || !term) {
      setResult(null);
      return () => { cancelled = true; };
    }
    publish([], "pending");

    // 1. Instant local search from cache
    async function searchLocal() {
      localHits = [];

      // Local cached tasks
      try {
        let cachedTasks: any[] = [];
        if (owner) {
          const userTasks = extractTasksFromCache(await cacheGet<unknown>(`tasks:all:${owner}`));
          if (userTasks.length > 0) cachedTasks = userTasks;
        }
        if (!cachedTasks.length) {
          const generalTasks = extractTasksFromCache(await cacheGet<unknown>("tasks"));
          // Legacy caches are not owner-keyed; never borrow another account's rows.
          cachedTasks = generalTasks.filter((task) => owner && task.user_id === owner);
        }
        cachedTasks.forEach((t) => {
          const hit = contentHit("task", t, term, T("بدون عنوان", "Untitled"));
          if (hit) {
            let dueSubtitle: string | undefined;
            if (taskWorkDate(t)) {
              try {
                const parsedDate = parseTaskDueDate(taskWorkDate(t));
                if (parsedDate) {
                  dueSubtitle = `${T("زمان", "When")}: ${parsedDate.toLocaleDateString(isEn ? "en-US" : "fa-IR")}`;
                }
              } catch {}
            }
            localHits.push({ ...hit, subtitle: dueSubtitle });
          }
        });
      } catch {}

      // Local cached notes
      try {
        let notesList: any[] = [];
        if (owner) {
          const userNotes = await cacheGet<any[]>(`notes:all:${owner}`);
          if (Array.isArray(userNotes)) notesList = userNotes;
        }
        if (!notesList.length) {
          const rawNotes = localStorage.getItem("arshnaz_notes") || localStorage.getItem("notes");
          if (rawNotes) {
            const parsedNotes = JSON.parse(rawNotes);
            if (Array.isArray(parsedNotes)) notesList = parsedNotes.filter((note) => owner && note.user_id === owner);
          }
        }
        notesList.forEach((n: any) => {
          const hit = contentHit("note", n, term, T("بدون عنوان", "Untitled"));
          if (hit) {
            localHits.push({ ...hit, subtitle: n.folder_id ? T("درون پوشه", "In folder") : undefined });
          }
        });
      } catch {}

      publish(localHits.slice(0, 20), owner ? "pending" : "ready");
    }

    const localSearch = searchLocal();

    // 2. Debounced remote enhancement if logged in
    if (!owner) return () => { cancelled = true; };
    const t = setTimeout(async () => {
      try {
        if (!isCurrent()) return;

        const [tasksRes, notesRes, foldersRes, tagsRes] = await Promise.all([
          firebaseStore.from("tasks").select("id,title,description").eq("user_id", owner),
          firebaseStore.from("notes").select("id,title,content").eq("user_id", owner),
          firebaseStore.from("folders").select("id,name").eq("user_id", owner),
          firebaseStore.from("tags").select("id,name").eq("user_id", owner),
        ]);
        // Local reads may be slower than the network; they must not overwrite it later.
        await localSearch;
        if (!isCurrent()) return;

        const remoteMap = new Map<string, Hit>();
        // Add existing local hits
        localHits.forEach((h) => remoteMap.set(`${h.kind}-${h.id}`, h));

        ((tasksRes.data || []) as any[])
          .map((x) => contentHit("task", x, term, T("بدون عنوان", "Untitled")))
          .filter((hit): hit is Hit => Boolean(hit))
          .slice(0, 8)
          .forEach((hit) => {
            remoteMap.set(`task-${hit.id}`, { ...remoteMap.get(`task-${hit.id}`), ...hit });
          });

        ((notesRes.data || []) as any[])
          .map((x) => contentHit("note", x, term, T("بدون عنوان", "Untitled")))
          .filter((hit): hit is Hit => Boolean(hit))
          .slice(0, 6)
          .forEach((hit) => {
            remoteMap.set(`note-${hit.id}`, { ...remoteMap.get(`note-${hit.id}`), ...hit });
          });

        ((foldersRes.data || []) as any[])
          .filter((x) => x.name && matchesSearch(String(x.name), term))
          .slice(0, 4)
          .forEach((x) => {
            remoteMap.set(`folder-${x.id}`, { kind: "folder", id: x.id, title: x.name || "", searchText: x.name || "" });
          });

        ((tagsRes.data || []) as any[])
          .filter((x) => x.name && matchesSearch(String(x.name), term))
          .slice(0, 4)
          .forEach((x) => {
            remoteMap.set(`tag-${x.id}`, { kind: "tag", id: x.id, title: x.name || "", searchText: x.name || "" });
          });

        const sorted = Array.from(remoteMap.values()).sort((a, b) => {
          const aTitle = (a.title || "").toLowerCase();
          const bTitle = (b.title || "").toLowerCase();
          const aExact = aTitle === term ? 2 : aTitle.startsWith(term) ? 1 : 0;
          const bExact = bTitle === term ? 2 : bTitle.startsWith(term) ? 1 : 0;
          return bExact - aExact;
        });

        const failed = [tasksRes, notesRes, foldersRes, tagsRes].some((response) => response.error);
        publish(sorted.slice(0, 25), failed ? "error" : "ready");
      } catch {
        await localSearch;
        publish(localHits.slice(0, 20), "error");
      }
    }, 250);

    return () => { cancelled = true; clearTimeout(t); };
  }, [term, owner, open, T, isEn]);

  const go = useCallback((to: string) => {
    setOpen(false);
    setQ("");
    navigate(to);
  }, [navigate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
      <Command filter={commandFilter} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
      <div className="flex items-center px-3 border-b border-border/50" dir={isEn ? "ltr" : "rtl"}>
        <Search className="w-4 h-4 text-muted-foreground me-2 shrink-0" />
        <CommandInput
          dir={isEn ? "ltr" : "rtl"}
          placeholder={T("جستجو در تسک‌ها، نوت‌ها یا رفتن به صفحه... (Ctrl+K)", "Search tasks, notes, or jump to page... (Ctrl+K)")}
          value={q}
          onValueChange={setQ}
          className="text-sm h-12"
        />
      </div>

      <CommandList className="max-h-[65vh] overflow-y-auto" dir={isEn ? "ltr" : "rtl"}>
        {term && status === "pending" && <div role="status" className="px-4 py-3 text-sm text-muted-foreground">{T("در حال جستجو…", "Searching…")}</div>}
        {term && status === "error" && <div role="status" className="px-4 py-3 text-sm text-muted-foreground">{T("جستجوی ابری انجام نشد؛ نتایج ذخیره‌شده همچنان در دسترس‌اند.", "Cloud search failed; cached results are still available.")}</div>}
        {status === "ready" && <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          {T("هیچ موردی منطبق با عبارت مورد نظر پیدا نشد.", "No results found for your query.")}
        </CommandEmpty>}

        {/* Quick action shortcuts */}
        <CommandGroup heading={T("اقدامات سریع", "Quick Actions")}>
          <CommandItem
            value={`ایجاد تسک جدید new task add ${T("ایجاد تسک جدید", "New Task")}`}
            onSelect={() => {
              setOpen(false);
              navigate("/app/inbox");
              setTimeout(() => {
                // QuickCaptureDialog listens for lov:open-quick-capture; the old
                // "arshnaz:quick-add-task" event had no listener anywhere, so this
                // command landed the user on Inbox and did nothing else.
                window.dispatchEvent(new Event("lov:open-quick-capture"));
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
                           h.kind === "note" ? `/app/notes?select=${h.id}` :
                           h.kind === "folder" ? `/app/folder/${h.id}` : `/app/tag/${h.id}`;
                return (
                  <CommandItem
                    key={`${h.kind}-${h.id}`}
                    value={`${h.kind}-${h.id}`}
                    keywords={[h.searchText]}
                    onSelect={() => go(to)}
                    className="flex items-center justify-between py-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{h.title}</div>
                        {h.snippet && <div className="truncate text-xs text-muted-foreground">{h.snippet}</div>}
                      </div>
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
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <CommandItem key={f.to} value={featureSearchText(f)} onSelect={() => go(f.to)} className="cursor-pointer">
                <Icon className="w-4 h-4 ms-2 text-muted-foreground" />
                <span>{getFeatureLabel(f, isEn)}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
      </Command>
      </DialogContent>
    </Dialog>
  );
}
