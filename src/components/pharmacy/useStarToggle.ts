import { toast } from "sonner";
import { useBilingual } from "@/hooks/useBilingual";
import { getStarredPhraseId, type PharmacyStarredPhrase } from "@/lib/pharmacyPracticeStore";
import type { PharmacyPracticeSaveResult } from "@/lib/pharmacyPracticeSync";
import type { PharmacyPracticeApi } from "./usePharmacyPractice";

export interface StarTarget {
  scenarioId: string;
  textEn: string;
  textFa: string;
}

export function usePracticeSaveFeedback() {
  const { T } = useBilingual();
  return (result: PharmacyPracticeSaveResult) => {
    if (result.status === "queued") toast.info(T("روی دستگاه ذخیره شد؛ پس از اتصال همگام می‌شود.", "Saved on this device; it will sync when you are back online."));
    if (result.status === "remote-newer") toast.info(T("نسخهٔ جدیدتری از دستگاه دیگر نگه داشته شد.", "A newer copy from another device was kept."));
    if (result.status === "failed") {
      toast.error(result.reason === "signed-out"
        ? T("برای ذخیره وارد حساب شو.", "Sign in to save.")
        : T("ذخیره ناموفق بود؛ حافظهٔ دستگاه یا صف همگام‌سازی در دسترس نیست.", "Save failed: device storage or the sync queue is unavailable."));
    }
  };
}

export function useStarToggle(phrases: PharmacyStarredPhrase[], save: PharmacyPracticeApi["save"]) {
  const report = usePracticeSaveFeedback();
  const isStarred = (target: StarTarget) => phrases.some((item) => item.id === getStarredPhraseId(target.scenarioId, target.textEn, target.textFa));
  const toggle = async (target: StarTarget) => {
    const id = getStarredPhraseId(target.scenarioId, target.textEn, target.textFa);
    const data = isStarred(target) ? null : { ...target, id, createdAt: new Date().toISOString() };
    report(await save("starred_phrase", id, data));
  };
  return { isStarred, toggle };
}
