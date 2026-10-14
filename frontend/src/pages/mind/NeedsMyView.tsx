import { useEffect, useRef, useState } from "react";
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
  return <NeedsMyList key={user?.id || "guest"} ownerId={user?.id} />;
}

function NeedsMyList({ ownerId }: { ownerId?: string }) {
  const { T, isEn } = useBilingual();
  const [items, setItems] = useState<NeedsSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setError(null);
    if (!ownerId) { setItems([]); return; }
    const unsubscribe = subscribeSessions(ownerId, (next) => { if (live) { setItems(next); setError(null); } }, () => { if (live) setError("load"); });
    return () => { live = false; unsubscribe(); };
  }, [ownerId, retry]);
  const alive = useRef(true);
  const deleteLock = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, [alive]);
  const remove = async (id: string) => {
    if (!ownerId || deleteLock.current || !window.confirm(T("این جلسه از حساب حذف شود؟ تسک، یادداشت یا عادت مستقل حذف نمی‌شود. نسخه‌های محلی در تب‌های دیگر ممکن است باقی بمانند.", "Delete this account session? Independent tasks, notes and habits will remain. Local copies in other tabs may remain."))) return;
    deleteLock.current = true;
    setDeleting(id);
    const ok = await deleteSession(ownerId, id);
    deleteLock.current = false;
    if (!alive.current) return;
    setDeleting(null);
    if (!ok) setError("delete");
    else { setError(null); setItems((current) => current?.filter((s) => s.id !== id) ?? null); }
  };
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(isEn ? "en-US" : "fa-IR", { month: "short", day: "numeric" });

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-4 pb-28 animate-fade-in" data-testid="needs-my">
      <HeaderTitlePortal title={T("نیازهای من", "My needs")} />
      <Back to="/app/mind" label={T("ذهن", "Mind")} />
      <h1 className="text-lg font-bold">{T("نیازهای من", "My needs")}</h1>
      {error && <div role="alert" className="surface-card p-3 text-sm" data-testid="needs-my-error">{error === "delete" ? T("حذف انجام نشد؛ جلسه نگه داشته شده است.", "Deletion failed. Your session was retained.") : T("جلسه‌ها بارگذاری نشدند؛ این وضعیت به معنی خالی بودن حساب نیست.", "Sessions failed to load. This does not mean your account is empty.")}<button type="button" onClick={() => setRetry((n) => n + 1)} className="min-h-11 px-3">{T("تلاش دوباره", "Retry")}</button></div>}
      {items === null && !error && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {items && items.length === 0 && !error && (
        <p className="surface-card p-5 text-sm text-muted-foreground" data-testid="needs-my-empty">{T("هنوز جلسه‌ای در حساب ذخیره نشده. می‌توانی بدون انتخاب دسته بنویسی.", "No account sessions yet. You can write without picking a category.")} <Link to="/app/mind/session/new">{T("نوشتن", "Write")}</Link></p>
      )}
      <div className="space-y-2">
        {(items ?? []).map((s) => (
          <div key={s.id} className="surface-card flex items-center gap-3 p-3.5" data-testid={`needs-my-item-${s.id}`}>
            <Link to={`/app/mind/session/${s.id}`} className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">{getCategory(s.category)?.title[isEn ? "en" : "fa"]} · {fmt(s.updated_at)}</span>
              <span className="block truncate text-sm font-bold">{getTopic(s.category, s.topic)?.title[isEn ? "en" : "fa"] ?? s.text.slice(0, 40)}</span>
              <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{s.result?.summary ?? s.text}</span>
              {!s.result && <span className="text-[11px] font-medium text-[hsl(var(--rose-gold))]">{s.finished ? T("فعلاً پایان یافته", "Finished for now") : T("نیمه‌تمام — ادامه", "In progress — continue")}</span>}
            </Link>
            <button type="button" disabled={deleting !== null} aria-label={T("حذف", "Delete")} onClick={() => remove(s.id)} className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50" data-testid={`needs-my-delete-${s.id}`}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
