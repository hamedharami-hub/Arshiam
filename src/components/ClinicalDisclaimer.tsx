import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert, Phone } from "lucide-react";
import { toast } from "sonner";

// A5 — Clinical disclaimer onboarding gate.
// Shows once until the user acknowledges; stores `clinical_consent` on profile.
export default function ClinicalDisclaimer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("clinical_consent").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data && !(data as any).clinical_consent) setOpen(true);
      });
  }, [user]);

  const accept = async () => {
    if (!user || !agreed) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      clinical_consent: true, clinical_consent_at: new Date().toISOString(),
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { setOpen(false); toast.success("متشکریم — مراقب خودت باش 💙"); }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* not dismissable */ }}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-end">
            <ShieldAlert className="w-5 h-5 text-amber-500" /> اطلاعیه مهم درباره ابزارهای سلامت روان
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-7 text-end">
          <p>
            این اپلیکیشن یک <strong>ابزار خودیاری و خودشناسی</strong> است و <strong>جایگزین درمان حرفه‌ای، روان‌درمانی، یا تشخیص پزشکی نیست</strong>.
            ابزارهای CBT، ABC، ثبت افکار، و چت سقراطی برای آگاهی شخصی طراحی شده‌اند.
          </p>
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-md p-3 space-y-2">
            <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Phone className="w-4 h-4" /> در شرایط بحرانی فوراً تماس بگیر:
            </div>
            <ul className="text-xs space-y-1 list-disc pe-5">
              <li><strong>اورژانس اجتماعی ایران: ۱۲۳</strong></li>
              <li><strong>صدای مشاور بهزیستی: ۱۴۸۰</strong></li>
              <li><strong>Lifeline استرالیا: 13 11 14</strong></li>
              <li>اگر در خطر فوری هستی: ۱۱۵ (اورژانس)</li>
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">
            هرگاه نیاز به کمک تخصصی داشتی، از بخش «بحران / SOS» در منو هم می‌توانی این شماره‌ها را پیدا کنی.
          </p>
          <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
            <span>این اطلاعیه را خواندم و درک کردم.</span>
          </label>
        </div>
        <DialogFooter>
          <Button onClick={accept} disabled={!agreed || saving}>
            {saving ? "..." : "تأیید و ادامه"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
