import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { firebaseStore } from "@/lib/firebaseStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert, Phone } from "lucide-react";
import { toast } from "sonner";
import { getCrisisResources, resolveSupportRegion, SUPPORT_REGIONS } from "@/lib/crisisResources";

// A5 — Clinical disclaimer onboarding gate.
// Shows once until the user acknowledges; stores `clinical_consent` on profile.
// The crisis route stays reachable even before acknowledgment.
export default function ClinicalDisclaimer() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const region = resolveSupportRegion(isEn ? "en" : "fa");
  const resources = getCrisisResources(region);
  const regionMeta = SUPPORT_REGIONS.find((r) => r.code === region)!;

  // Never force the gate on the crisis route itself — urgent help must be reachable.
  const onCrisisRoute = location.pathname === "/app/crisis";

  useEffect(() => {
    setOpen(false);
    setAgreed(false);
    if (!user || onCrisisRoute) return;
    let active = true;
    firebaseStore.from("profiles").select("clinical_consent").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (active && data && !(data as any).clinical_consent) setOpen(true);
      }).catch(() => { /* Urgent help must not depend on this profile read. */ });
    return () => { active = false; };
  }, [user?.id, onCrisisRoute]);

  // If the user reaches the crisis route while the gate is open, step aside.
  useEffect(() => {
    if (onCrisisRoute) setOpen(false);
  }, [onCrisisRoute]);

  const accept = async () => {
    if (!user || !agreed) return;
    setSaving(true);
    const { error } = await firebaseStore.from("profiles").update({
      clinical_consent: true, clinical_consent_at: new Date().toISOString(),
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { setOpen(false); toast.success(T("متشکریم — مراقب خودت باش 💙", "Thank you — take care of yourself 💙")); }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* not dismissable */ }}>
      <DialogContent
        className="max-w-lg"
        dir={isEn ? "ltr" : "rtl"}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-start">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            {T(
              "اطلاعیه مهم درباره ابزارهای سلامت روان",
              "Important notice about mental-health tools"
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-7 bidi-auto">
          <p>
            {T(
              "این اپلیکیشن یک ابزار خودیاری و خودشناسی است و جایگزین درمان حرفه‌ای، روان‌درمانی، یا تشخیص پزشکی نیست. ابزارهای بررسی فکر، نگرانی و ثبت حال برای آگاهی شخصی طراحی شده‌اند.",
              "This app is a self-help and self-reflection tool and is not a substitute for professional therapy, psychotherapy, or medical diagnosis. Its thought, worry, and mood tools are designed for personal awareness."
            )}
          </p>
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-md p-3 space-y-2">
            <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {T("در خطر فوری با خدمات اضطراری محل خود تماس بگیر.", "In immediate danger, contact your local emergency services.")}
            </div>
            <p className="text-xs">{T("منطقه خطوط کمک: ", "Helpline region: ")}{isEn ? regionMeta.label_en : regionMeta.label}</p>
            <ul className="text-xs space-y-1 list-disc pe-5">
              {resources.map((resource) => (
                <li key={resource.id}>
                  <a href={resource.primaryChannel === "sms" ? `sms:${resource.sms}` : resource.phone ? `tel:${resource.phone}` : resource.url}
                    className="text-rose-700 dark:text-rose-300 underline font-bold">
                    {isEn ? resource.name_en : resource.name} — {resource.displayPhone}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">
            {T(
              "هرگاه نیاز به کمک تخصصی داشتی، از بخش «بحران / SOS» در منو هم می‌توانی این شماره‌ها را پیدا کنی.",
              "Whenever you need professional help, you can also find these numbers in the “Crisis / SOS” section of the menu."
            )}
          </p>
          <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
            <span>{T("این اطلاعیه را خواندم و درک کردم.", "I have read and understood this notice.")}</span>
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/app/crisis" data-testid="disclaimer-crisis-link">
              <ShieldAlert className="w-4 h-4" />
              {T("دریافت کمک فوری (بحران / SOS)", "Get urgent help (Crisis / SOS)")}
            </Link>
          </Button>
          <Button onClick={accept} disabled={!agreed || saving}>
            {saving ? "..." : T("تأیید و ادامه", "Acknowledge & Continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
