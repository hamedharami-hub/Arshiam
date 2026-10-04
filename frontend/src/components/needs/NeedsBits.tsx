import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowLeft, ArrowRight, Briefcase, Check, ChevronDown, ClipboardList, CloudRain, HelpCircle, Home, ListChecks,
  Puzzle, ShieldCheck, Sprout, Users, Wrench, BookMarked, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { CATEGORIES, TOOLS } from "@/lib/needs/tree";
import { getMethod } from "@/lib/needs/methods";
import { getSelfCheck } from "@/lib/needs/selfChecks";
import { convertSuggestion } from "@/lib/needs/service";
import type { NeedsIconKey } from "@/lib/needs/types";

export const NEEDS_ICONS: Record<NeedsIconKey, typeof Puzzle> = {
  puzzle: Puzzle, listChecks: ListChecks, cloudRain: CloudRain, users: Users, briefcase: Briefcase,
  activity: Activity, sprout: Sprout, home: Home, helpCircle: HelpCircle,
};

const SCREENER_TITLES: Record<string, { fa: string; en: string }> = {
  phq9: { fa: "پرسشنامهٔ حال (PHQ-9)", en: "Mood questionnaire (PHQ-9)" },
  gad7: { fa: "پرسشنامهٔ اضطراب (GAD-7)", en: "Anxiety questionnaire (GAD-7)" },
  who5: { fa: "بهزیستی (WHO-5)", en: "Wellbeing (WHO-5)" },
  burnout: { fa: "خستگی و فرسودگی", en: "Fatigue & exhaustion" },
};

export function checkInfo(id: string, isEn: boolean) {
  const sc = SCREENER_TITLES[id];
  if (sc) return { title: isEn ? sc.en : sc.fa, route: `/app/screener/${id}` };
  const c = getSelfCheck(id);
  return c ? { title: isEn ? c.title.en : c.title.fa, route: `/app/mind/check/${id}` } : null;
}

export function Back({ to, label }: { to: string; label: string }) {
  const { isEn } = useBilingual();
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid="needs-back">
      {isEn ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}{label}
    </Link>
  );
}

/** Fixed (never AI-written) safety message. Deliberately contains no phone numbers. */
export function SafetyNotice() {
  const { T } = useBilingual();
  return (
    <aside className="flex gap-3 rounded-2xl border border-[hsl(var(--rose-gold)/0.5)] bg-[hsl(var(--rose-gold)/0.08)] p-3.5 text-sm leading-6" role="note" data-testid="needs-safety-notice">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--rose-gold))]" strokeWidth={1.6} />
      <div>
        <p>{T("این ابزار جایگزین متخصص نیست. اگر وضعیت جدی است، بهتر است همین الان با یک فرد مورد اعتماد یا یک متخصص صحبت کنی.", "This tool is not a substitute for a professional. If things feel serious, it is best to talk to someone you trust or a professional right now.")}</p>
        <Link to="/app/crisis" className="mt-1 inline-block font-semibold text-primary hover:underline" data-testid="needs-safety-link">{T("صفحهٔ کمک فوری", "Open the urgent-help page")}</Link>
      </div>
    </aside>
  );
}

export function NeedsEntry() {
  const { T, isEn } = useBilingual();
  return (
    <section className="space-y-3" data-testid="needs-entry" aria-labelledby="needs-entry-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="needs-entry-title" className="text-base font-bold">{T("امروز چه کمکی لازم داری؟", "What do you need help with?")}</h2>
          <p className="text-xs text-muted-foreground">{T("یک دسته را انتخاب کن، بعد موضوع، و بنویس مشکلت چیست.", "Pick a category, then a topic, and write what's going on.")}</p>
        </div>
        <Link to="/app/mind/my-needs" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline" data-testid="needs-my-link">
          <BookMarked className="h-4 w-4" />{T("نیازهای من", "My needs")}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {CATEGORIES.map((c) => {
          const Icon = NEEDS_ICONS[c.icon];
          const to = c.id === "unknown" ? "/app/mind/session/new?cat=unknown" : `/app/mind/needs/${c.id}`;
          return (
            <Link key={c.id} to={to} data-testid={`needs-cat-${c.id}`}
              className="group surface-card flex min-h-[7.5rem] flex-col items-start gap-2 p-3.5 transition hover:border-[hsl(var(--rose-gold)/0.6)]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--rose-gold)/0.12)] text-[hsl(var(--rose-gold))]"><Icon className="h-[22px] w-[22px]" strokeWidth={1.5} /></span>
              <span className="text-sm font-bold leading-5">{isEn ? c.title.en : c.title.fa}</span>
              <span className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">{isEn ? c.desc.en : c.desc.fa}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function MethodCard({ id, sessionId }: { id: string; sessionId?: string }) {
  const { T, isEn } = useBilingual();
  const { user } = useAuth();
  const m = getMethod(id);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  if (!m) return null;
  const addTask = async () => {
    if (!user?.id) return;
    setBusy(true);
    const ok = await convertSuggestion(user.id, { text: `${isEn ? m.title.en : m.title.fa}: ${isEn ? m.steps[0].en : m.steps[0].fa}`, kind: "task" }, sessionId || "method");
    setBusy(false);
    toast[ok ? "success" : "error"](ok ? T("به تسک‌ها اضافه شد", "Added to tasks") : T("ذخیره نشد", "Could not save"));
  };
  return (
    <div className="surface-card overflow-hidden" data-testid={`method-${id}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 p-3.5 text-start" data-testid={`method-toggle-${id}`}>
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Wrench className="h-4 w-4" strokeWidth={1.6} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{isEn ? m.title.en : m.title.fa}</span>
          <span className="block text-xs leading-5 text-muted-foreground">{isEn ? m.summary.en : m.summary.fa}</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground/80">{isEn ? `~${m.minutes} min` : `حدود ${m.minutes.toLocaleString("fa-IR")} دقیقه`}</span>
        </span>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border/60 p-3.5" data-testid={`method-steps-${id}`}>
          <ol className="space-y-2">
            {m.steps.map((s, i) => (
              <li key={i}>
                <button type="button" onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))} className="flex w-full items-start gap-2.5 text-start text-sm leading-6" aria-pressed={!!done[i]}>
                  <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${done[i] ? "when-day-selected border-transparent" : "border-border text-muted-foreground"}`}>{done[i] ? <Check className="h-3 w-3" /> : (isEn ? i + 1 : (i + 1).toLocaleString("fa-IR"))}</span>
                  <span className={done[i] ? "text-muted-foreground line-through" : ""}>{isEn ? s.en : s.fa}</span>
                </button>
              </li>
            ))}
          </ol>
          <button type="button" onClick={addTask} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-muted px-3 text-xs font-medium hover:bg-muted/70" data-testid={`method-add-task-${id}`}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}{T("قدم اول را به تسک تبدیل کن", "Turn step 1 into a task")}
          </button>
        </div>
      )}
    </div>
  );
}

export function PackSection({ methods, checks, tools, sessionId }: { methods: string[]; checks: string[]; tools: string[]; sessionId?: string }) {
  const { T, isEn } = useBilingual();
  const checkItems = checks.map((id) => ({ id, info: checkInfo(id, isEn) })).filter((x) => x.info);
  return (
    <div className="space-y-5" data-testid="needs-pack">
      {methods.length > 0 && (
        <section className="space-y-2"><h3 className="text-sm font-bold">{T("روش‌های حل", "Methods")}</h3>
          {methods.map((id) => <MethodCard key={id} id={id} sessionId={sessionId} />)}
        </section>
      )}
      {checkItems.length > 0 && (
        <section className="space-y-2"><h3 className="text-sm font-bold">{T("خودسنجی‌ها و تست‌ها", "Self-checks & tests")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {checkItems.map(({ id, info }) => (
              <Link key={id} to={info!.route} className="surface-card flex items-center gap-2.5 p-3 text-sm font-medium hover:border-primary/50" data-testid={`check-link-${id}`}>
                <ClipboardList className="h-4 w-4 shrink-0 text-[hsl(var(--rose-gold))]" strokeWidth={1.6} /><span className="min-w-0 flex-1">{info!.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {tools.length > 0 && (
        <section className="space-y-2"><h3 className="text-sm font-bold">{T("ابزارهای مرتبط ارشناز", "Related ARSHNAZ tools")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {tools.map((id) => { const t = TOOLS[id]; return t ? (
              <Link key={id} to={t.route} className="surface-card p-3 hover:border-primary/50" data-testid={`tool-link-${id}`}>
                <span className="block text-sm font-semibold">{isEn ? t.title.en : t.title.fa}</span>
                <span className="block text-[11px] text-muted-foreground">{isEn ? t.desc.en : t.desc.fa}</span>
              </Link>) : null; })}
          </div>
        </section>
      )}
    </div>
  );
}
