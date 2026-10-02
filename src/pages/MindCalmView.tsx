import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Moon, Wind } from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";

export default function MindCalmView() {
  const { T, isEn } = useBilingual();
  const iconWrap = "grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary";
  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-5 pb-24 animate-fade-in" data-testid="mind-calm">
      <HeaderTitlePortal title={T("آرام‌شدن", "Calm down")} />
      <Link to="/app/mind" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        {isEn ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}{T("ذهن", "Mind")}
      </Link>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="surface-card flex flex-col gap-4 p-5" data-testid="calm-breathing">
          <header className="flex items-start gap-3">
            <span className={iconWrap}><Wind className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-bold">{T("تمرین تنفس", "Breathing exercise")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{T("چند دقیقه تنفس هدایت‌شده با راهنمای دیداری.", "A few minutes of guided breathing with a visual guide.")}</p>
            </div>
          </header>
          <div className="mt-auto flex flex-wrap items-center gap-3">
            <Button asChild className="h-10"><Link to="/app/breathing?start=1" data-testid="calm-breathing-quick">{T("شروع سریع", "Quick start")}</Link></Button>
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
      <p className="text-[11px] leading-5 text-muted-foreground">{T("این تمرین‌ها جایگزین درمان نیستند.", "These exercises are not a substitute for care.")}</p>
    </div>
  );
}
