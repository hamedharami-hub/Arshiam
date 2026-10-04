import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ChevronDown, LineChart, PenLine, ShieldAlert, Wind, Brain, Check, CloudOff, Loader2 } from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { subscribeDailyCheckins, upsertDailyCheckin } from "@/lib/firestoreDataService";
import { getLocalDateString } from "@/lib/taskDate";
import { toPersianDigits } from "@/lib/jalali";
import { NeedsEntry } from "@/components/needs/NeedsBits";
import { useMindDraft, type MindDraftPath } from "@/lib/mindDraft";

type SaveState = "idle" | "saving" | "saved" | "queued" | "failed";
type TodayRecord = { checkin_date: string; mood: number | null; energy: number | null };

const SAVE_ACK_TIMEOUT_MS = 4000;

function Slider({ label, value, onChange, testId, num }: { label: string; value: number; onChange: (n: number) => void; testId: string; num: (n: number) => string }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{num(value)}/{num(10)}</span>
      </span>
      <input
        type="range" min={1} max={10} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-full cursor-pointer accent-[hsl(var(--primary))]"
        aria-label={label} data-testid={testId}
      />
    </label>
  );
}

export default function MindView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const navigate = useNavigate();
  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));
  const userId = user?.id;
  const today = getLocalDateString(new Date());

  const [record, setRecord] = useState<TodayRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState(6);
  const [touched, setTouched] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const requestRef = useRef(0);

  useEffect(() => {
    setLoaded(false); setRecord(null); setTouched(false); setSaveState("idle");
    requestRef.current += 1;
    if (!userId) return;
    return subscribeDailyCheckins(userId, (items: TodayRecord[]) => {
      setRecord(items.find((c) => c.checkin_date === today) ?? null);
      setLoaded(true);
    });
  }, [userId, today]);

  useEffect(() => {
    if (record && !touched) { setMood(record.mood ?? 6); setEnergy(record.energy ?? 6); }
  }, [record, touched]);

  async function saveMood() {
    if (!userId || saveState === "saving") return;
    const ticket = ++requestRef.current;
    setSaveState("saving");
    const write = upsertDailyCheckin(userId, { checkin_date: today, mood, energy }).then((ok) => (ok ? "saved" : "failed") as SaveState);
    const first = await Promise.race([write, new Promise<SaveState>((r) => setTimeout(() => r("queued"), SAVE_ACK_TIMEOUT_MS))]);
    if (ticket !== requestRef.current) return;
    setSaveState(first);
    if (first === "queued") {
      void write.then((final) => { if (ticket === requestRef.current) setSaveState(final); });
    } else if (first === "saved") {
      setTouched(false);
    }
  }

  const { draft, save: saveDraft } = useMindDraft(userId);
  const [text, setText] = useState(draft?.text ?? "");
  useEffect(() => { if (draft && !text) setText(draft.text); }, [draft, text]);

  function startPath(path: MindDraftPath) {
    saveDraft({ text, path });
    navigate(path === "think" ? "/app/thoughts" : "/app/worry");
  }

  const pathName = (p: MindDraftPath | null) => (p === "worry" ? T("نگرانی", "Worry") : T("بررسی فکر", "Thought check"));
  const draftTime = draft ? new Date(draft.updatedAt).toLocaleString(isEn ? "en-GB" : "fa-IR", { dateStyle: "short", timeStyle: "short" }) : "";

  const statusText: Record<SaveState, string> = {
    idle: "",
    saving: T("در حال ذخیره…", "Saving…"),
    saved: T("ذخیره و همگام شد", "Saved and synced"),
    queued: T("روی دستگاه ذخیره شد؛ منتظر همگام‌سازی", "Saved on this device; waiting to sync"),
    failed: T("ذخیره نشد. دوباره تلاش کنید.", "Could not save. Try again."),
  };

  const cardClass = "surface-card flex flex-col gap-4 p-4 sm:p-5";
  const iconWrap = "grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary";

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--xl space-y-5 pb-28 animate-fade-in" data-testid="mind-home">
      <HeaderTitlePortal title={T("ذهن", "Mind")} />

      {draft && (
        <Link
          to={draft.path === "worry" ? "/app/worry" : draft.path === "think" ? "/app/thoughts" : "/app/mind"}
          className="surface-card flex items-center gap-3 px-4 py-3 text-sm hover:border-primary/50"
          data-testid="mind-continue-draft"
        >
          <PenLine className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">
            {T("ادامهٔ آخرین نوشته", "Continue your last note")}
            {draft.path ? ` · ${pathName(draft.path)}` : ""}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{draftTime}</span>
        </Link>
      )}

      <NeedsEntry />

      <h2 className="pt-1 text-sm font-bold text-muted-foreground">{T("ابزارهای سریع", "Quick tools")}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <section className={cardClass} aria-labelledby="mind-mood-title" data-testid="mind-card-mood">
          <header className="flex items-start gap-3">
            <span className={iconWrap}><Activity className="h-4 w-4" /></span>
            <div>
              <h2 id="mind-mood-title" className="text-base font-bold leading-tight">{T("حال امروز", "Today's mood")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {record ? T("ثبت امروز را ویرایش کنید.", "Edit today's entry.") : T("خلق و انرژی را در چند ثانیه ثبت کنید.", "Log mood and energy in seconds.")}
              </p>
            </div>
          </header>
          <Slider label={T("خلق", "Mood")} value={mood} onChange={(n) => { setMood(n); setTouched(true); }} testId="mind-mood-slider" num={num} />
          <Slider label={T("انرژی", "Energy")} value={energy} onChange={(n) => { setEnergy(n); setTouched(true); }} testId="mind-energy-slider" num={num} />
          <div className="flex items-center gap-3">
            <Button onClick={saveMood} disabled={!loaded || saveState === "saving"} className="h-10 min-w-24" data-testid="mind-mood-save">
              {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : record ? T("به‌روزرسانی", "Update") : T("ثبت", "Save")}
            </Button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status" aria-live="polite" data-testid="mind-mood-status">
              {saveState === "saved" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              {(saveState === "queued" || saveState === "failed") && <CloudOff className="h-3.5 w-3.5 text-amber-600" />}
              {statusText[saveState]}
            </span>
          </div>
          <details className="group text-xs">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-primary">
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />{T("جزئیات بیشتر", "More details")}
            </summary>
            <p className="mt-2 leading-5 text-muted-foreground">{T("تمرکز، استرس و اطلاعات خواب را در فرم کامل ثبت کنید.", "Add focus, stress and sleep in the full form.")}</p>
            <Link to="/app/checkin" className="mt-1 inline-block font-semibold text-primary hover:underline" data-testid="mind-checkin-full">{T("باز کردن فرم کامل", "Open full form")}</Link>
          </details>
        </section>

        <section className={cardClass} aria-labelledby="mind-calm-title" data-testid="mind-card-calm">
          <header className="flex items-start gap-3">
            <span className={iconWrap}><Wind className="h-4 w-4" /></span>
            <div>
              <h2 id="mind-calm-title" className="text-base font-bold leading-tight">{T("آرام‌شدن", "Calm down")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{T("تنفس هدایت‌شده یا صدای آرام برای خواب.", "Guided breathing, or calming sound for sleep.")}</p>
            </div>
          </header>
          <div className="mt-auto flex flex-col gap-2">
            <Button asChild className="h-10"><Link to="/app/calm" data-testid="mind-calm-open">{T("شروع", "Start")}</Link></Button>
          </div>
        </section>

        <section className={cardClass} aria-labelledby="mind-busy-title" data-testid="mind-card-busy">
          <header className="flex items-start gap-3">
            <span className={iconWrap}><Brain className="h-4 w-4" /></span>
            <div>
              <h2 id="mind-busy-title" className="text-base font-bold leading-tight">{T("ذهنم درگیر است", "My mind is busy")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{T("چه چیزی ذهنت را درگیر کرده؟", "What is on your mind?")}</p>
            </div>
          </header>
          <textarea
            value={text} rows={3} dir="auto"
            onChange={(e) => { setText(e.target.value); saveDraft({ text: e.target.value }); }}
            placeholder={T("چند کلمه بنویس…", "Write a few words…")}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={T("چه چیزی ذهنت را درگیر کرده؟", "What is on your mind?")}
            data-testid="mind-busy-input"
          />
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="h-auto min-h-10 justify-start whitespace-normal py-2 text-start" onClick={() => startPath("think")} data-testid="mind-path-think">
              {T("می‌خواهم فکرم را بررسی کنم", "I want to examine my thought")}
            </Button>
            <Button variant="outline" className="h-auto min-h-10 justify-start whitespace-normal py-2 text-start" onClick={() => startPath("worry")} data-testid="mind-path-worry">
              {T("می‌خواهم برای نگرانی‌ام کاری انجام دهم", "I want to do something about my worry")}
            </Button>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between">
        <Link to="/app/mind/trends" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline" data-testid="mind-trends-link">
          <LineChart className="h-4 w-4" />{T("روند و سنجش‌ها", "Trends & check-ups")}
        </Link>
      </div>

      <Link
        to="/app/crisis"
        className="fixed bottom-24 end-4 z-30 inline-flex h-11 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-semibold text-destructive-foreground shadow-lg md:bottom-6"
        data-testid="mind-crisis-link"
        aria-label={T("کمک فوری (SOS)", "Urgent help (SOS)")}
      >
        <ShieldAlert className="h-4 w-4" />{T("کمک فوری", "SOS")}
      </Link>
    </div>
  );
}
