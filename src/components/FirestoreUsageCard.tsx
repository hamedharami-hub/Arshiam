import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getUsage, nextQuotaReset, quotaPausedUntil, type UsageDay } from "@/lib/firestoreUsage";
import { toPersianDigits } from "@/lib/jalali";

const FREE_READS = 50_000;
const FREE_WRITES = 20_000;

function Meter({ label, value, max, fa }: { label: string; value: number; max: number; fa: boolean }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const n = (x: number) => (fa ? toPersianDigits(x.toLocaleString("en-US")) : x.toLocaleString("en-US"));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span>{label}</span><span className="tabular-nums text-muted-foreground">{n(value)} / {n(max)}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${pct > 80 ? "bg-destructive" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/** Estimated Firestore usage from this device today (Firebase counts per project, so other devices add to it). */
export function FirestoreUsageCard() {
  const { i18n } = useTranslation();
  const fa = !(i18n.language || "fa").startsWith("en");
  const [usage, setUsage] = useState<UsageDay>(getUsage);
  useEffect(() => {
    const on = () => setUsage(getUsage());
    window.addEventListener("arsh:fs-usage", on);
    return () => window.removeEventListener("arsh:fs-usage", on);
  }, []);
  const paused = quotaPausedUntil();
  const reset = new Date(paused || nextQuotaReset()).toLocaleTimeString(fa ? "fa-IR" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  const top = Object.entries(usage.bySource).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return (
    <section className="surface-card space-y-3 p-4" dir={fa ? "rtl" : "ltr"} data-testid="firestore-usage-card">
      <header className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{fa ? "مصرف امروز Firebase (تخمینی، همین دستگاه)" : "Today's Firebase usage (estimate, this device)"}</h3>
      </header>
      <Meter label={fa ? "خواندن" : "Reads"} value={usage.reads} max={FREE_READS} fa={fa} />
      <Meter label={fa ? "نوشتن" : "Writes"} value={usage.writes} max={FREE_WRITES} fa={fa} />
      {top.length > 0 && (
        <p className="text-[11px] leading-5 text-muted-foreground" data-testid="firestore-usage-top">
          {fa ? "بیشترین مصرف: " : "Top sources: "}
          {top.map(([k, v]) => `${k.slice(2)} (${k[0] === "r" ? (fa ? "خواندن" : "read") : (fa ? "نوشتن" : "write")} ${fa ? toPersianDigits(v) : v})`).join("، ")}
        </p>
      )}
      <p className="text-[11px] leading-5 text-muted-foreground">
        {paused
          ? (fa ? `سقف روزانه پر شده؛ همگام‌سازی حدود ساعت ${reset} خودکار ادامه پیدا می‌کند.` : `Daily limit reached; sync resumes automatically around ${reset}.`)
          : (fa ? `سقف رایگان هر روز حدود ساعت ${reset} از نو شروع می‌شود.` : `The free quota resets daily around ${reset}.`)}
      </p>
    </section>
  );
}
