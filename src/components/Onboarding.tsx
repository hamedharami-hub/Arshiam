import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isPathAllowed } from "@/lib/appModules";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ListTodo, Heart, Timer, ArrowLeft, ArrowRight, Compass, Hourglass } from "lucide-react";
import { AngelLineArt } from "@/components/auth/AngelLineArt";

const KEY = "onboarded_v1";

const ALL_STEPS = [
  { icon: ListTodo, key: "step1", to: "/app/today" },
  { icon: Hourglass, key: "stepPlan", to: "/app/planning" },
  { icon: Heart, key: "step2", to: "/app/checkin" },
  { icon: Timer, key: "step3", to: "/app/pomodoro" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch { void 0; }
  }, []);

  const finish = (to?: string) => {
    try { localStorage.setItem(KEY, "1"); } catch { void 0; }
    setOpen(false);
    if (to) navigate(to);
  };

  const STEPS = ALL_STEPS.filter((st) => isPathAllowed(st.to));
  if (!STEPS.length) return null;
  const step = STEPS[Math.min(i, STEPS.length - 1)];
  const Icon = step.icon;
  const isLast = i === STEPS.length - 1;
  const NextIcon = isEn ? ArrowRight : ArrowLeft;

  const pill = "h-11 flex-1 rounded-full text-sm transition-[transform,background-color,opacity] duration-300";
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="auth-theme auth-grain max-w-md overflow-hidden rounded-[28px] border border-[hsl(var(--auth-rule))] p-7 shadow-[0_30px_80px_-30px_hsl(var(--auth-ink)/0.45)]" dir={isEn ? "ltr" : "rtl"} data-testid="onboarding-dialog">
        <DialogHeader className="relative items-center space-y-3 text-center sm:text-center">
          <AngelLineArt className="h-24 w-auto" />
          <DialogTitle className="text-xl font-light" data-testid="onboarding-title">{t("onboarding.welcome")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("onboarding.stepOf", { current: i + 1, total: STEPS.length })}
          </DialogDescription>
        </DialogHeader>
        <div key={step.key} className="auth-rise relative space-y-2 py-2 text-center">
          <Icon className="mx-auto h-5 w-5" style={{ color: "hsl(var(--auth-line))" }} aria-hidden />
          <h3 className="text-lg font-medium" data-testid="onboarding-step-title">{t(`onboarding.${step.key}Title`)}</h3>
          <p className="text-sm font-light leading-7" style={{ color: "hsl(var(--auth-muted))" }}>{t(`onboarding.${step.key}Desc`)}</p>
        </div>
        <div className="relative flex items-center justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, idx) => (
            <span key={idx} className="h-1.5 rounded-full transition-[width] duration-300" style={{ width: idx === i ? 20 : 6, background: idx === i ? "hsl(var(--auth-line))" : "hsl(var(--auth-rule))" }} />
          ))}
        </div>
        <button
          type="button"
          className="relative flex w-full items-center justify-center gap-2 border-t border-[hsl(var(--auth-rule))] pt-3 text-xs underline-offset-4 hover:underline"
          style={{ color: "hsl(var(--auth-line))" }}
          onClick={() => finish("/app/life-architect")}
          data-testid="onboarding-life-architect"
        >
          <Compass className="h-4 w-4" />
          {t("onboarding.lifeArchitect")}
        </button>
        <div className="relative flex gap-2">
          <button type="button" className={`${pill} opacity-70 hover:opacity-100`} onClick={() => finish()} data-testid="onboarding-skip">{t("onboarding.skip")}</button>
          {!isLast && (
            <button type="button" className={`${pill} flex items-center justify-center gap-1 border border-[hsl(var(--auth-rule))] hover:bg-[hsl(var(--auth-paper))]`} onClick={() => setI(i + 1)} data-testid="onboarding-next">
              {t("onboarding.next")} <NextIcon className="h-4 w-4" />
            </button>
          )}
          <button type="button" className={`${pill} bg-[hsl(var(--auth-ink))] font-medium text-[hsl(var(--auth-bg))] hover:-translate-y-0.5`} onClick={() => finish(step.to)} data-testid="onboarding-cta">
            {t(`onboarding.${step.key}Cta`)}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
