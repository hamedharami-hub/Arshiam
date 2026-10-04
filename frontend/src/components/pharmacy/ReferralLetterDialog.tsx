import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCopy, Save, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBilingual } from "@/hooks/useBilingual";
import type { PharmacyPracticeScenario, PharmacyReferralLetterTemplate } from "@/lib/pharmacyScenarioPractice";
import { formatReferralLetter, type PharmacyReferralLetterDraft } from "@/lib/pharmacyPracticeStore";
import type { PharmacyPracticeSaveResult } from "@/lib/pharmacyPracticeSync";
import { PHARMACY_DIALOG_CLASS } from "./pharmacyDialogClass";

type LetterField = keyof PharmacyReferralLetterTemplate | "notes";
type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "queued" } | { kind: "remote-newer" } | { kind: "copied" } | { kind: "failed"; message: string };

const emptyDraft = (scenario: PharmacyPracticeScenario): Omit<PharmacyReferralLetterDraft, "updatedAt"> => ({
  to: "",
  reason: "",
  symptomSummary: "",
  currentMeds: (scenario.currentMedications ?? []).join(", "),
  suggestedAction: "",
  notes: "",
});

interface ReferralLetterDialogProps {
  scenario: PharmacyPracticeScenario;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedDraft: PharmacyReferralLetterDraft | undefined;
  onSave: (draft: PharmacyReferralLetterDraft) => Promise<PharmacyPracticeSaveResult>;
}

export function ReferralLetterDialog({ scenario, open, onOpenChange, savedDraft, onSave }: ReferralLetterDialogProps) {
  const { T, lang } = useBilingual();
  const [draft, setDraft] = useState(() => emptyDraft(scenario));
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [showTemplate, setShowTemplate] = useState(false);
  const template = scenario.outcome?.referralLetterTemplate ?? null;

  useEffect(() => {
    if (!open) return;
    const saved = savedDraft;
    setDraft(saved ? { to: saved.to, reason: saved.reason, symptomSummary: saved.symptomSummary, currentMeds: saved.currentMeds, suggestedAction: saved.suggestedAction, notes: saved.notes } : emptyDraft(scenario));
    setStatus({ kind: "idle" });
    setShowTemplate(false);
    // Only reset when the dialog opens or the case changes, not on every background sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scenario]);

  const update = (field: LetterField, value: string) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setStatus({ kind: "idle" });
  };

  const saveDraft = async () => {
    setStatus({ kind: "saving" });
    const result = await onSave({ ...draft, updatedAt: new Date().toISOString() });
    if (result.status === "failed") {
      setStatus({ kind: "failed", message: result.reason === "signed-out" ? T("برای ذخیره وارد حساب شو.", "Sign in to save drafts.") : T("حافظهٔ دستگاه یا صف همگام‌سازی در دسترس نیست.", "Device storage or the sync queue is unavailable.") });
    } else {
      setStatus({ kind: result.status });
    }
  };

  const copyLetter = async () => {
    try {
      await navigator.clipboard.writeText(formatReferralLetter(scenario, draft));
      setStatus({ kind: "copied" });
    } catch {
      setStatus({ kind: "failed", message: T("کپی در این مرورگر ممکن نشد.", "Copy is not available in this browser.") });
    }
  };

  const fields: Array<{ key: LetterField; label: string; multiline?: boolean; placeholder: string }> = [
    { key: "to", label: T("گیرنده", "To"), placeholder: T("مثلاً پزشک عمومی بیمار", "e.g. the patient's GP") },
    { key: "reason", label: T("علت ارجاع", "Reason for referral"), placeholder: T("red flag یا یافتهٔ اصلی", "Main red flag or finding"), multiline: true },
    { key: "symptomSummary", label: T("خلاصهٔ علائم", "Symptom summary"), placeholder: T("شرح کوتاه و عینی", "Short, objective summary"), multiline: true },
    { key: "currentMeds", label: T("داروهای فعلی", "Current medicines"), placeholder: T("داروها و مکمل‌ها", "Medicines and supplements") },
    { key: "suggestedAction", label: T("اقدام پیشنهادی", "Suggested action"), placeholder: T("ارزیابی درخواستی از پزشک", "Assessment requested from the doctor"), multiline: true },
    { key: "notes", label: T("یادداشت داروساز", "Pharmacist notes"), placeholder: T("اختیاری", "Optional"), multiline: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={PHARMACY_DIALOG_CLASS} dir={lang === "en" ? "ltr" : "rtl"} data-testid="referral-letter-dialog">
        <DialogHeader className="text-start">
          <DialogTitle className="pe-6 text-start">{T("نامهٔ ارجاع", "Referral letter")}</DialogTitle>
          <DialogDescription className="text-start">{T("تمرین نوشتن؛ پرونده ساختگی و آموزشی است.", "Writing practice for a fictional, educational case.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3" dir="ltr">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`referral-${field.key}`}>{field.label}</Label>
              {field.multiline ? (
                <Textarea id={`referral-${field.key}`} rows={2} value={draft[field.key]} placeholder={field.placeholder} onChange={(event) => update(field.key, event.target.value)} data-testid={`referral-field-${field.key}`} />
              ) : (
                <Input id={`referral-${field.key}`} value={draft[field.key]} placeholder={field.placeholder} onChange={(event) => update(field.key, event.target.value)} data-testid={`referral-field-${field.key}`} />
              )}
            </div>
          ))}
        </div>

        {template && (
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowTemplate((value) => !value)} aria-expanded={showTemplate} data-testid="referral-template-toggle-btn">
              {showTemplate ? T("پنهان‌کردن الگوی منبع", "Hide source template") : T("مقایسه با الگوی منبع", "Compare with source template")}
            </Button>
            {showTemplate && (
              <dl className="grid gap-2 text-sm" dir="ltr" data-testid="referral-source-template">
                <Badge variant="outline" className="w-fit text-amber-700 dark:text-amber-300">{T("الگوی منبع، بازبینی‌نشده", "Source template, unreviewed")}</Badge>
                {(["to", "reason", "symptomSummary", "currentMeds", "suggestedAction"] as const).map((key) => (
                  <div key={key}><dt className="text-xs font-semibold text-muted-foreground">{fields.find((field) => field.key === key)?.label}</dt><dd className="leading-relaxed">{template[key] || "—"}</dd></div>
                ))}
              </dl>
            )}
          </div>
        )}

        {status.kind === "saved" && <p role="status" data-testid="referral-status-saved" className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{T("پیش‌نویس ذخیره و همگام شد.", "Draft saved and synced.")}</p>}
        {status.kind === "queued" && <p role="status" data-testid="referral-status-queued" className="flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{T("روی دستگاه ذخیره شد؛ پس از اتصال همگام می‌شود.", "Saved on this device; it will sync when you are back online.")}</p>}
        {status.kind === "remote-newer" && <p role="status" data-testid="referral-status-remote-newer" className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300"><TriangleAlert className="h-4 w-4" aria-hidden="true" />{T("نسخهٔ جدیدتری از دستگاه دیگر وجود داشت و نگه داشته شد.", "A newer draft from another device was kept.")}</p>}
        {status.kind === "copied" && <p role="status" data-testid="referral-status-copied" className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{T("متن نامه کپی شد.", "Letter copied.")}</p>}
        {status.kind === "failed" && <p role="alert" data-testid="referral-status-failed" className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="h-4 w-4" aria-hidden="true" />{status.message}</p>}

        {!draft.to.trim() && !draft.reason.trim() && (
          <p className="text-xs text-muted-foreground" data-testid="referral-save-hint">{T("برای ذخیره، دست‌کم گیرنده یا علت ارجاع را بنویس.", "Fill in at least the recipient or the reason to save.")}</p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="gap-1.5" onClick={copyLetter} data-testid="referral-copy-btn"><ClipboardCopy className="h-4 w-4" aria-hidden="true" />{T("کپی متن", "Copy text")}</Button>
          <Button type="button" className="gap-1.5" onClick={saveDraft} disabled={status.kind === "saving" || (!draft.to.trim() && !draft.reason.trim())} data-testid="referral-save-btn"><Save className="h-4 w-4" aria-hidden="true" />{T("ذخیرهٔ پیش‌نویس", "Save draft")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
