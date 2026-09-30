import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { SleepSoundsCard } from "@/components/SleepSoundsCard";
import { useBilingual } from "@/hooks/useBilingual";
export default function SleepView() {
  const { T, isEn } = useBilingual();
  return <main dir={isEn ? "ltr" : "rtl"} className="mx-auto w-full max-w-2xl p-3 sm:p-5 space-y-4">
    <HeaderTitlePortal title={T("خواب و آرامش", "Sleep & Relaxation")} />
    <p className="text-sm text-muted-foreground">{T("صدا را انتخاب کنید و در صورت نیاز زمان خاموشی تدریجی را تنظیم کنید.", "Choose a sound and optionally set a gentle fade-out timer.")}</p>
    <SleepSoundsCard isEn={isEn} />
  </main>;
}
