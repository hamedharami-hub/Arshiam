import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isPathAllowed } from "@/lib/appModules";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ListTodo, Heart, Timer, ArrowLeft, ArrowRight, Compass } from "lucide-react";

const KEY = "onboarded_v1";

const ALL_STEPS = [
  { icon: ListTodo, key: "step1", to: "/app/today" },
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="max-w-md" dir={isEn ? "ltr" : "rtl"} data-testid="onboarding-dialog">
        <DialogHeader>
          <DialogTitle className="text-base" data-testid="onboarding-title">{t("onboarding.welcome")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("onboarding.stepOf", { current: i + 1, total: STEPS.length })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-3 text-center">
          <Icon className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
          <h3 className="text-lg font-semibold" data-testid="onboarding-step-title">{t(`onboarding.${step.key}Title`)}</h3>
          <p className="text-sm leading-7 text-muted-foreground">{t(`onboarding.${step.key}Desc`)}</p>
        </div>
        <div className="mb-1 flex items-center justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, idx) => (
            <span key={idx} className={`h-1.5 rounded-full ${idx === i ? "w-5 bg-primary" : "w-1.5 bg-muted"}`} />
          ))}
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 border-t border-border pt-3 text-xs text-primary hover:underline"
          onClick={() => finish("/app/life-architect")}
          data-testid="onboarding-life-architect"
        >
          <Compass className="h-4 w-4" />
          {t("onboarding.lifeArchitect")}
        </button>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => finish()} data-testid="onboarding-skip">{t("onboarding.skip")}</Button>
          {!isLast && (
            <Button variant="outline" className="flex-1 gap-1" onClick={() => setI(i + 1)} data-testid="onboarding-next">
              {t("onboarding.next")} <NextIcon className="h-4 w-4" />
            </Button>
          )}
          <Button className="flex-1" onClick={() => finish(step.to)} data-testid="onboarding-cta">
            {t(`onboarding.${step.key}Cta`)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
