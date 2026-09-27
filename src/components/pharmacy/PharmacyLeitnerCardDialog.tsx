import { useEffect, useState } from "react";
import { CheckCircle2, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { createLeitnerCard } from "@/lib/leitnerService";
import { PHARMACY_DIALOG_CLASS } from "./pharmacyDialogClass";

export interface PharmacyCardDraft {
  front: string;
  back: string;
  documentId: string | null;
}

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "queued" } | { kind: "failed"; message: string };

interface PharmacyLeitnerCardDialogProps {
  draft: PharmacyCardDraft | null;
  onClose: () => void;
}

export function PharmacyLeitnerCardDialog({ draft, onClose }: PharmacyLeitnerCardDialogProps) {
  const { T, lang } = useBilingual();
  const { user } = useAuth();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  useEffect(() => {
    setFront(draft?.front ?? "");
    setBack(draft?.back ?? "");
    setState({ kind: "idle" });
  }, [draft]);

  const save = async () => {
    if (!user?.id) {
      setState({ kind: "failed", message: T("برای ذخیرهٔ کارت وارد حساب شو.", "Sign in to save cards.") });
      return;
    }
    setState({ kind: "saving" });
    try {
      await createLeitnerCard(user.id, { front, back, document_id: draft?.documentId ?? null });
      setState({ kind: "saved" });
    } catch (error) {
      setState({ kind: "failed", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const done = state.kind === "saved" || state.kind === "queued";

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => { if (!open && state.kind !== "saving") onClose(); }}>
      <DialogContent className={PHARMACY_DIALOG_CLASS} dir={lang === "en" ? "ltr" : "rtl"} data-testid="pharmacy-leitner-dialog">
        <DialogHeader className="text-start">
          <DialogTitle className="text-start">{T("ساخت کارت Leitner", "Create a Leitner card")}</DialogTitle>
          <DialogDescription className="text-start">{T("متن را قبل از ذخیره ویرایش کن؛ کارت به سند منبع پیوند می‌خورد.", "Edit before saving; the card stays linked to its source document.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="pharmacy-card-front">{T("روی کارت (پرسش)", "Front (question)")}</Label>
          <Textarea id="pharmacy-card-front" value={front} onChange={(event) => setFront(event.target.value)} disabled={state.kind === "saving" || done} rows={3} data-testid="pharmacy-leitner-front-input" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pharmacy-card-back">{T("پشت کارت (پاسخ)", "Back (answer)")}</Label>
          <Textarea id="pharmacy-card-back" value={back} onChange={(event) => setBack(event.target.value)} disabled={state.kind === "saving" || done} rows={4} data-testid="pharmacy-leitner-back-input" />
        </div>
        <SaveStatus state={state} />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={state.kind === "saving"} data-testid="pharmacy-leitner-close-btn">{done ? T("بستن", "Close") : T("انصراف", "Cancel")}</Button>
          {!done && (
            <Button type="button" onClick={save} disabled={state.kind === "saving" || !front.trim() || !back.trim()} data-testid="pharmacy-leitner-save-btn">
              {state.kind === "saving" && <Loader2 className="me-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
              {state.kind === "failed" ? T("تلاش دوباره", "Retry") : T("ذخیرهٔ کارت", "Save card")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  const { T } = useBilingual();
  if (state.kind === "saved") return <p role="status" data-testid="pharmacy-leitner-status-saved" className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{T("ذخیره شد.", "Saved.")}</p>;
  if (state.kind === "queued") return <p role="status" data-testid="pharmacy-leitner-status-queued" className="flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300"><CloudOff className="h-4 w-4" aria-hidden="true" />{T("در صف همگام‌سازی است؛ پس از اتصال ارسال می‌شود.", "Queued; it will sync when you are back online.")}</p>;
  if (state.kind === "failed") return <p role="alert" data-testid="pharmacy-leitner-status-failed" className="flex items-start gap-2 text-sm text-destructive"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{T("ذخیره ناموفق بود: ", "Save failed: ")}{state.message}</p>;
  return null;
}
