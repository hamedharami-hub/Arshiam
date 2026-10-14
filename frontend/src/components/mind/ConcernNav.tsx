import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBilingual } from "@/hooks/useBilingual";
import { attachMindTool, readMindSession, updateMindSession } from "@/lib/mind/sessionService";
import { Button } from "@/components/ui/button";

export function ConcernNav({ ownerId, concernId, toolId, slot }: { ownerId?: string; concernId?: string | null; toolId: string; slot: string }) {
  const { T } = useBilingual();
  const [, refresh] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (ownerId && concernId) attachMindTool(ownerId, concernId, toolId, slot); }, [ownerId, concernId, toolId, slot]);
  if (!ownerId || !concernId) return null;
  const result = readMindSession(ownerId, concernId);
  if (!result.ok || !result.value) return <p role="alert" className="text-sm text-destructive">{T("جلسه روی این دستگاه پیدا نشد یا قابل خواندن نیست؛ متن از حساب دیگری دریافت نشده است.", "The session is missing or unreadable on this device; no other account's text was loaded.")}</p>;
  const query = `session=${encodeURIComponent(concernId)}`;
  return <section className="space-y-2"><nav aria-label={T("ابزارهای همین دغدغه", "Tools for this concern")} className="flex flex-wrap gap-2 rounded-lg border p-2 text-xs">
    <span className="flex min-h-11 items-center px-2 text-muted-foreground">{T("همین دغدغه؛ پیش‌نویس ابزارها جدا حفظ می‌شود", "Same concern; each tool keeps its own draft")}</span>
    <Link className="inline-flex min-h-11 items-center rounded px-3 text-primary hover:bg-muted" to={`/app/thoughts?${query}`}>{T("روشن‌تر ببینم", "Clarify")}</Link>
    <Link className="inline-flex min-h-11 items-center rounded px-3 text-primary hover:bg-muted" to={`/app/worry?${query}`}>{T("نگرانی را بررسی کنم", "Explore worry")}</Link>
    <Link className="inline-flex min-h-11 items-center rounded px-3 text-primary hover:bg-muted" to={`/app/mind/session/new?cat=unknown&${query}`}>{T("یک قدم انتخاب کنم", "Choose a step")}</Link>
    <Link className="inline-flex min-h-11 items-center rounded px-3 text-primary hover:bg-muted" to={`/app/calm?${query}`}>{T("آرام‌تر شوم", "Calm down")}</Link>
  </nav>
    <details className="rounded-lg border p-3 text-xs"><summary className="min-h-11 cursor-pointer">{T("فعلاً کافی است؛ پایان اختیاری", "Enough for now; optional ending")}</summary>
      <p className="mb-2 text-muted-foreground">{T("فقط وضعیت همین جلسه روی دستگاه عوض می‌شود؛ نوشته‌ها و تسک‌های مستقل پاک نمی‌شوند و بهبود حال از این انتخاب استنتاج نمی‌شود.", "Only this device session's status changes. Drafts and independent tasks are not deleted; this choice does not imply an improvement in wellbeing.")}</p>
      <div className="flex flex-wrap gap-2">{(["just_wrote", "clearer", "chose_step", "set_aside"] as const).map((outcome, index) => <Button key={outcome} variant="outline" size="sm" className="min-h-11" onClick={() => {
        const latest = readMindSession(ownerId, concernId);
        if (latest.ok === false || !latest.value) { setFailed(true); return; }
        const saved = updateMindSession(ownerId, { ...latest.value, status: "finished", outcome }, latest.value.revision);
        setFailed(saved.ok === false); refresh(n => n + 1);
      }}>{[T("فقط نوشتم", "I just wrote"), T("روشن‌تر شد", "A little clearer"), T("یک قدم انتخاب کردم", "I chose a step"), T("فعلاً کنار می‌گذارم", "Set it aside")][index]}</Button>)}</div>
      {failed && <p role="alert" className="mt-2 text-destructive">{T("پایان ثبت نشد؛ نسخه تغییر کرده یا نگهداری دستگاه ناموفق بوده است.", "Ending was not retained; the version changed or device storage failed.")}</p>}
      {!failed && result.value.status === "finished" && <p role="status" className="mt-2">{T("پایان انتخابی روی این دستگاه حفظ شد؛ همچنان می‌توانی نوشته را مرور کنی.", "Your selected ending is retained on this device; you can still review the writing.")}</p>}
    </details>
  </section>;
}
