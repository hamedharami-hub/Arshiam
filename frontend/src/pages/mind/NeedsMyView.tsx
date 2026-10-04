import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Back } from "@/components/needs/NeedsBits";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { getCategory, getTopic } from "@/lib/needs/tree";
import { deleteSession, subscribeSessions } from "@/lib/needs/service";
import type { NeedsSession } from "@/lib/needs/types";

export default function NeedsMyView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [items, setItems] = useState<NeedsSession[] | null>(null);
  useEffect(() => (user?.id ? subscribeSessions(user.id, setItems) : undefined), [user?.id]);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(isEn ? "en-US" : "fa-IR", { month: "short", day: "numeric" });

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-4 pb-28 animate-fade-in" data-testid="needs-my">
      <HeaderTitlePortal title={T("نیازهای من", "My needs")} />
      <Back to="/app/mind" label={T("ذهن", "Mind")} />
      <h1 className="text-lg font-bold">{T("نیازهای من", "My needs")}</h1>
      {items === null && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {items && items.length === 0 && (
        <p className="surface-card p-5 text-sm text-muted-foreground" data-testid="needs-my-empty">{T("هنوز جلسه‌ای ذخیره نشده. از صفحهٔ «ذهن» یک دسته را انتخاب کن.", "No sessions yet. Pick a category on the Mind page.")}</p>
      )}
      <div className="space-y-2">
        {(items ?? []).map((s) => (
          <div key={s.id} className="surface-card flex items-center gap-3 p-3.5" data-testid={`needs-my-item-${s.id}`}>
            <Link to={`/app/mind/session/${s.id}`} className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">{getCategory(s.category)?.title[isEn ? "en" : "fa"]} · {fmt(s.updated_at)}</span>
              <span className="block truncate text-sm font-bold">{getTopic(s.category, s.topic)?.title[isEn ? "en" : "fa"] ?? s.text.slice(0, 40)}</span>
              <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{s.result?.summary ?? s.text}</span>
              {!s.result && <span className="text-[11px] font-medium text-[hsl(var(--rose-gold))]">{T("نیمه‌تمام — ادامه", "In progress — continue")}</span>}
            </Link>
            <button type="button" aria-label={T("حذف", "Delete")} onClick={() => user?.id && void deleteSession(user.id, s.id)} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted" data-testid={`needs-my-delete-${s.id}`}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
