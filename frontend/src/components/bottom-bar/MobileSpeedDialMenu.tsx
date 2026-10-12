import { useRef, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CheckSquare, FileText, Timer, Brain, X, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface MobileSpeedDialMenuProps {
  open: boolean;
  onClose: () => void;
  /** The control that opened the menu; focus returns here on close. */
  triggerRef?: RefObject<HTMLElement | null>;
}

export function MobileSpeedDialMenu({ open, onClose, triggerRef }: MobileSpeedDialMenuProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const firstActionRef = useRef<HTMLButtonElement>(null);

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

  // Radix Dialog supplies the modal contract: aria-modal + labelled title,
  // initial focus into the surface, focus containment (background inert),
  // Escape to close, and focus return to the trigger.
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          dir={isEn ? "ltr" : "rtl"}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            firstActionRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            const trigger = triggerRef?.current;
            if (trigger) {
              event.preventDefault();
              trigger.focus();
            }
          }}
          className="fixed z-50 left-1/2 -translate-x-1/2 bottom-[calc(var(--bottom-bar-height)+16px)] w-[92%] max-w-sm p-4 rounded-3xl bg-background/95 dark:bg-card/95 backdrop-blur-2xl border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.35)] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-6 data-[state=open]:zoom-in-95 duration-250 ease-out flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-sm font-bold text-foreground">
                  {isEn ? "Quick Actions" : "دسترسی فوق‌سریع"}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-[11px] text-muted-foreground">
                  {isEn ? "Choose what you want to create" : "عملیات مورد نظر را انتخاب کنید"}
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label={isEn ? "Close" : "بستن"}
            >
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {actions.map((act, index) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  type="button"
                  ref={index === 0 ? firstActionRef : undefined}
                  onClick={() => handleAction(act.id as any)}
                  className="group relative flex flex-col items-start p-3 rounded-2xl border border-border/70 hover:border-primary/50 bg-card hover:bg-accent/40 active:scale-95 transition-all duration-150 text-right shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
