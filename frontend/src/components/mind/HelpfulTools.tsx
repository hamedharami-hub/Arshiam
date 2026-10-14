import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useBilingual } from "@/hooks/useBilingual";
import { clearMindFeedback, readMindFeedback, type MindFeedback } from "@/lib/mind/feedback";
import { Button } from "@/components/ui/button";

const routes: Record<string, { route: string; fa: string; en: string }> = {
  breathing: { route: "/app/breathing", fa: "تمرین تنفس", en: "Breathing exercise" },
  thoughts: { route: "/app/thoughts", fa: "بررسی فکر", en: "Thought check" },
  worry: { route: "/app/worry", fa: "بررسی نگرانی", en: "Worry reflection" },
};

/** Show self-reported usefulness with its denominator, never inferred efficacy. */
export function HelpfulTools({ ownerId }: { ownerId?: string }) {
  const { T, isEn } = useBilingual();
  const [items, setItems] = useState<MindFeedback[]>([]);
  useEffect(() => {
    const sync = () => setItems(ownerId ? readMindFeedback(ownerId) : []);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("arshiam:mind-feedback", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("arshiam:mind-feedback", sync); };
  }, [ownerId]);
  const groups = Object.keys(routes).map(toolId => ({ toolId, entries: items.filter(item => item.toolId === toolId) }))
    .filter(group => group.entries.some(item => item.response === "helpful"));
  if (!groups.length) return null;
  const number = (n: number) => new Intl.NumberFormat(isEn ? "en" : "fa").format(n);
  return <details className="surface-card p-4">
    <summary className="min-h-11 cursor-pointer text-sm font-semibold">{T("چیزهایی که مفید دانستی", "Things you found helpful")}</summary>
    <div className="mt-3 space-y-3">
      <p className="text-xs leading-5 text-muted-foreground">{T("این فقط بازخورد خودت روی این دستگاه است؛ تعداد کم پاسخ یا تمام‌کردن تمرین، اثربخشی آن را ثابت نمی‌کند.", "These are your reports on this device. A few responses or completing an exercise do not establish its efficacy.")}</p>
      {groups.map(({ toolId, entries }) => {
        const tool = routes[toolId];
        const count = (response: MindFeedback["response"]) => number(entries.filter(item => item.response === response).length);
        return <div key={toolId} className="space-y-1 border-b border-border/40 pb-3 last:border-0">
          <Link to={tool.route} className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">{isEn ? tool.en : tool.fa}</Link>
          <p className="text-xs">{T(`${count("helpful")} از ${number(entries.length)} پاسخ: مفید`, `${count("helpful")} of ${number(entries.length)} reports: helpful`)}</p>
          <p className="text-xs text-muted-foreground">{T(`بدون تغییر: ${count("no_change")} · ناراحتی: ${count("uncomfortable")} · نامطمئن: ${count("unsure")}`, `No change: ${count("no_change")} · Uncomfortable: ${count("uncomfortable")} · Unsure: ${count("unsure")}`)}</p>
          <p className="text-[11px] text-muted-foreground">{T("بازخورد نسخه‌های مختلف تمرین با هم نمایش داده شده است.", "Reports for different exercise versions are shown together.")}</p>
        </div>;
      })}
      <Button variant="ghost" size="sm" onClick={() => {
        if (!ownerId || !window.confirm(T("همهٔ بازخوردهای Mind روی این دستگاه پاک شوند؟ نوشته‌ها و تسک‌ها حذف نمی‌شوند.", "Delete all Mind feedback on this device? Notes and tasks will not be deleted."))) return;
        if (!clearMindFeedback(ownerId)) toast.error(T("بازخورد پاک نشد؛ دوباره تلاش کنید.", "Feedback could not be deleted. Try again."));
      }}>{T("پاک‌کردن بازخورد این دستگاه", "Delete device feedback")}</Button>
    </div>
  </details>;
}
