import { Columns3, Hourglass, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FolderPrefs } from "@/lib/folderPrefs";

type View = FolderPrefs["view"];

/** Compact list / kanban / time-bucket switch shown in every task list header. */
export function ListViewSwitch({ value, onChange, allowKanban, fa }: { value: View; onChange: (v: View) => void; allowKanban: boolean; fa: boolean }) {
  const options: { id: View; icon: typeof List; label: string }[] = [
    { id: "list", icon: List, label: fa ? "لیست" : "List" },
    ...(allowKanban ? [{ id: "kanban-stream" as View, icon: Columns3, label: fa ? "کانبان" : "Kanban" }] : []),
    { id: "buckets", icon: Hourglass, label: fa ? "تایم‌باکت" : "Time buckets" },
  ];
  const active = value === "kanban-columns" ? "kanban-stream" : value;
  return (
    <div role="radiogroup" aria-label={fa ? "نمای لیست" : "List view"} className="flex items-center rounded-xl bg-muted/70 p-0.5" data-testid="list-view-switch">
      {options.map(({ id, icon: Icon, label }) => (
        <button key={id} type="button" role="radio" aria-checked={active === id} title={label} aria-label={label}
          onClick={() => onChange(id === "kanban-stream" && value === "kanban-columns" ? value : id)} data-testid={`list-view-${id}`}
          className={cn("flex h-8 items-center gap-1 rounded-[10px] px-2 text-xs transition-colors duration-150",
            active === id ? "bg-background font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <Icon className="h-4 w-4" />
          <span className="hidden md:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
