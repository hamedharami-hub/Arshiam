import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Moon, Wind } from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";
import { getMethod } from "@/lib/needs/methods";
import { useAuth } from "@/hooks/useAuth";
import { ConcernNav } from "@/components/mind/ConcernNav";

export default function MindCalmView() {
  const { T, isEn } = useBilingual();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const concernId = params.get("session");
  const concernQuery = concernId ? `session=${encodeURIComponent(concernId)}` : "";
  const grounding = getMethod("grounding");
  const iconWrap = "grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary";
  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-5 pb-safe-bottom animate-fade-in" data-testid="mind-calm">
      <HeaderTitlePortal title={T("آرام‌شدن", "Calm down")} />
      <ConcernNav ownerId={user?.id} concernId={concernId} toolId="calm" slot={`calm:${concernId || "standalone"}`} />
      <Link to="/app/mind" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        {isEn ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}{T("ذهن", "Mind")}
      </Link>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="surface-card flex flex-col gap-4 p-5" data-testid="calm-breathing">
          <header className="flex items-start gap-3">
            <span className={iconWrap}><Wind className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-bold">{T("تمرین تنفس", "Breathing exercise")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{T("حدود دو دقیقه تنفس ۵-۵ بدون حبس نفس. اثر آن برای افراد متفاوت است.", "About two minutes of 5-5 breathing without breath holds. Effects vary.")}</p>
            </div>
          </header>
          <p className="text-xs leading-5 text-muted-foreground">{T("پیش از شروع سریع: نشسته و در جای امن، نه در آب یا هنگام رانندگی. نفس را به زور عمیق نکن؛ با سرگیجه، تنگی نفس یا ناراحتی توقف کن و عادی نفس بکش. در بیماری قلبی/تنفسی با پزشک مشورت کن.", "Before quick start: sit somewhere safe, never in water or while driving. Do not force deep breaths. Stop and breathe normally if dizzy, breathless, or uncomfortable. Consult a clinician for heart/lung conditions.")}</p>
          <div className="mt-auto flex flex-wrap items-center gap-3">
             <Button asChild className="min-h-11"><Link to={`/app/breathing?start=1${concernQuery ? `&${concernQuery}` : ""}`} data-testid="calm-breathing-quick">{T("شروع سریع", "Quick start")}</Link></Button>
            <Link to="/app/breathing" className="text-xs font-medium text-primary hover:underline" data-testid="calm-breathing-choose">{T("انتخاب روش و تنظیمات", "Choose method & settings")}</Link>
          </div>
        </section>
        <section className="surface-card flex flex-col gap-4 p-5" data-testid="calm-sleep">
          <header className="flex items-start gap-3">
            <span className={iconWrap}><Moon className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-bold">{T("خواب و صداهای آرامش", "Sleep & calming sounds")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{T("صدا را انتخاب کنید و در صورت نیاز تایمر خاموشی بگذارید.", "Pick a sound and set a fade-out timer if you like.")}</p>
            </div>
          </header>
          <div className="mt-auto">
            <Button asChild variant="outline" className="h-10"><Link to="/app/sleep" data-testid="calm-sleep-open">{T("باز کردن", "Open")}</Link></Button>
          </div>
        </section>
      </div>
      {grounding && <section id="grounding" className="surface-card p-5 space-y-3 scroll-mt-20" data-testid="calm-grounding">
        <h2 className="text-base font-bold">{T("بدون تمرکز بر نفس", "Without focusing on breathing")}: {isEn ? grounding.title.en : grounding.title.fa}</h2>
        <p className="text-sm text-muted-foreground">{isEn ? grounding.summary.en : grounding.summary.fa}</p>
        <ol className="list-decimal list-inside space-y-2 text-sm">{grounding.steps.map((step, index) => <li key={index}>{isEn ? step.en : step.fa}</li>)}</ol>
        <p className="text-xs text-muted-foreground">{T("هر مرحله‌ای را که راحت نیستی رد کن؛ نیازی به ساخت تسک یا تمام‌کردن همهٔ مراحل نیست.", "Skip any step that feels uncomfortable; no task or full completion is required.")}</p>
      </section>}
      <p className="text-[11px] leading-5 text-muted-foreground">{T("این تمرین‌ها جایگزین درمان نیستند.", "These exercises are not a substitute for care.")}</p>
    </div>
  );
}
