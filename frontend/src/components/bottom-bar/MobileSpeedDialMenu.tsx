import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckSquare, FileText, Timer, Brain, X, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface MobileSpeedDialMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSpeedDialMenu({ open, onClose }: MobileSpeedDialMenuProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleAction = (type: "task" | "note" | "focus" | "checkin") => {
    haptic("medium");
    onClose();
    switch (type) {
      case "task":
        window.dispatchEvent(new Event("lov:open-quick-capture"));
        break;
      case "note":
        navigate("/app/notes");
        setTimeout(() => {
          window.dispatchEvent(new Event("lov:open-quick-note"));
        }, 150);
        break;
      case "focus":
        navigate("/app/pomodoro");
        break;
      case "checkin":
        navigate("/app/checkin");
        break;
    }
  };

  const actions = [
    {
      id: "task",
      icon: CheckSquare,
      labelFa: "تسک جدید",
      labelEn: "New Task",
      descFa: "ثبت کار یا سررسید",
      descEn: "Capture todo or event",
      color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      accent: "from-blue-600 to-indigo-600",
    },
    {
      id: "note",
      icon: FileText,
      labelFa: "یادداشت سریع",
      labelEn: "Quick Note",
      descFa: "ثبت فوری ایده یا متن",
      descEn: "Jot idea or draft",
      color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      accent: "from-amber-600 to-orange-600",
    },
    {
      id: "focus",
      icon: Timer,
      labelFa: "تایمر فوکوس",
      labelEn: "Focus Timer",
      descFa: "شروع پومودورو عمیق",
      descEn: "Start Pomodoro session",
      color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      accent: "from-emerald-600 to-teal-600",
    },
    {
      id: "checkin",
      icon: Brain,
      labelFa: "حال امروز",
      labelEn: "Daily Mood",
      descFa: "چک‌این سلامت ذهن",
      descEn: "Check in with feelings",
      color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
      accent: "from-purple-600 to-pink-600",
    },
  ];

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? "Quick Action Menu" : "منوی دسترسی سریع"}
      className="fixed inset-0 z-50 flex flex-col justify-end items-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="w-[92%] max-w-sm mb-[calc(var(--bottom-bar-height)+16px)] p-4 rounded-3xl bg-background/95 dark:bg-card/95 backdrop-blur-2xl border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.35)] animate-in slide-in-from-bottom-6 zoom-in-95 duration-250 ease-out flex flex-col gap-2.5"
        dir={isEn ? "ltr" : "rtl"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isEn ? "Quick Actions" : "دسترسی فوق‌سریع"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isEn ? "Choose what you want to create" : "عملیات مورد نظر را انتخاب کنید"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isEn ? "Close" : "بستن"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => handleAction(act.id as any)}
                className="group relative flex flex-col items-start p-3 rounded-2xl border border-border/70 hover:border-primary/50 bg-card hover:bg-accent/40 active:scale-95 transition-all duration-150 text-right shadow-2xs"
              >
                <div className={`p-2.5 rounded-xl border mb-2 transition-transform duration-200 group-hover:scale-110 ${act.color}`}>
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  {isEn ? act.labelEn : act.labelFa}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">
                  {isEn ? act.descEn : act.descFa}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
