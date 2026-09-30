import { useEffect, useState } from "react";
import { Volume2, VolumeX, Vibrate, Play, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useBilingual } from "@/hooks/useBilingual";
import {
  getCompletionFeedbackSettings,
  setCompletionFeedbackSettings,
  previewCompletionSound,
  COMPLETION_SOUND_OPTIONS,
  COMPLETION_HAPTIC_OPTIONS,
  type CompletionFeedbackSettings,
  type CompletionSoundId,
  type CompletionHapticKind,
} from "@/lib/completionFeedback";

interface Props {
  className?: string;
  compact?: boolean;
}

export function CompletionFeedbackSettingsCard({ className = "", compact = false }: Props) {
  const { T, isEn } = useBilingual();
  const [settings, setSettings] = useState<CompletionFeedbackSettings>(getCompletionFeedbackSettings);

  useEffect(() => {
    const handleChanged = (e: Event) => {
      const detail = (e as CustomEvent<CompletionFeedbackSettings>).detail;
      if (detail) setSettings(detail);
    };
    window.addEventListener("arshnaz:completion-feedback-settings-changed", handleChanged);
    return () => {
      window.removeEventListener("arshnaz:completion-feedback-settings-changed", handleChanged);
    };
  }, []);

  const update = (patch: Partial<CompletionFeedbackSettings>) => {
    const next = setCompletionFeedbackSettings(patch);
    setSettings(next);
  };

  const handleAudition = (soundId?: CompletionSoundId) => {
    previewCompletionSound(soundId || settings.soundId, settings.hapticEnabled);
  };

  return (
    <Card className={`border border-border/70 bg-card/80 shadow-xs ${className}`}>
      <CardHeader className={compact ? "p-3 pb-2" : "p-4 pb-3"}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xs sm:text-sm font-bold text-foreground">
                {T("بازخورد تیک زدن تسک‌ها و ویجت‌ها", "Task & Widget Check Feedback")}
              </CardTitle>
              {!compact && (
                <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                  {T(
                    "پخش صدا و لرزش لمسی هنگام تیک زدن و تکمیل گزینه‌ها در برنامه و ویجت‌ها",
                    "Play sound and vibrate when checking items in app and widgets"
                  )}
                </CardDescription>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAudition()}
            className="h-7 text-[11px] gap-1 px-2.5 rounded-full shrink-0"
            title={T("آزمایش صدای فعلی", "Test current sound")}
          >
            <Play className="h-3 w-3 fill-current text-primary" />
            <span>{T("تست", "Test")}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className={compact ? "p-3 pt-0 space-y-3" : "p-4 pt-1 space-y-4"}>
        {/* Sound Toggle & Picker */}
        <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-2.5 sm:p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label className="text-xs font-semibold cursor-pointer" htmlFor="completion-sound-toggle">
                  {T("صدای تیک زدن", "Completion Sound")}
                </Label>
                <div className="text-[10px] text-muted-foreground">
                  {settings.soundEnabled
                    ? T("پخش صدای گوش‌نواز هنگام تیک خوردن", "Plays audio on item completion")
                    : T("صدا غیرفعال است", "Audio feedback is muted")}
                </div>
              </div>
            </div>
            <Switch
              id="completion-sound-toggle"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => {
                update({ soundEnabled: checked });
                if (checked) handleAudition();
              }}
            />
          </div>

          {settings.soundEnabled && (
            <div className="pt-2 border-t border-border/40">
              <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                {T("انتخاب صدا:", "Select Sound:")}
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={settings.soundId}
                  onValueChange={(val) => {
                    const soundId = val as CompletionSoundId;
                    update({ soundId });
                    handleAudition(soundId);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLETION_SOUND_OPTIONS.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        <span className="me-1.5">{opt.emoji}</span>
                        <span>{isEn ? opt.labelEn : opt.labelFa}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => handleAudition()}
                  className="h-8 w-8 shrink-0 rounded-lg"
                  title={T("پخش این صدا", "Audition sound")}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Haptic / Vibration Toggle & Intensity */}
        <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-2.5 sm:p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate
                className={`h-4 w-4 ${settings.hapticEnabled ? "text-amber-500" : "text-muted-foreground"}`}
              />
              <div>
                <Label className="text-xs font-semibold cursor-pointer" htmlFor="completion-haptic-toggle">
                  {T("لرزش و بازخورد لمسی (ویبره)", "Haptic Vibration")}
                </Label>
                <div className="text-[10px] text-muted-foreground">
                  {settings.hapticEnabled
                    ? T("ویبره هنگام زدن تیک در گوشی", "Vibrates on phone when checked")
                    : T("ویبره غیرفعال است", "Vibration is disabled")}
                </div>
              </div>
            </div>
            <Switch
              id="completion-haptic-toggle"
              checked={settings.hapticEnabled}
              onCheckedChange={(checked) => {
                update({ hapticEnabled: checked });
                if (checked) previewCompletionSound(settings.soundId, true);
              }}
            />
          </div>

          {settings.hapticEnabled && (
            <div className="pt-2 border-t border-border/40">
              <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                {T("شدت لرزش:", "Vibration Intensity:")}
              </Label>
              <Select
                value={settings.hapticKind}
                onValueChange={(val) => {
                  const hapticKind = val as CompletionHapticKind;
                  update({ hapticKind });
                  previewCompletionSound(settings.soundId, true);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLETION_HAPTIC_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs">
                      {isEn ? opt.labelEn : opt.labelFa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
