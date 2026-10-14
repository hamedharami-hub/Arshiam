import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { SleepSoundsCard } from "@/components/SleepSoundsCard";
import { useBilingual } from "@/hooks/useBilingual";
export default function SleepView() {
  const { T, isEn } = useBilingual();
  return <main dir={isEn ? "ltr" : "rtl"} className="mx-auto w-full max-w-2xl p-3 sm:p-5 space-y-4">
    <HeaderTitlePortal title={T("خواب و آرامش", "Sleep & Relaxation")} />
    <p className="text-sm text-muted-foreground">{T("صدا را انتخاب کنید و در صورت نیاز زمان خاموشی تدریجی را تنظیم کنید.", "Choose a sound and optionally set a gentle fade-out timer.")}</p>
    <section className="rounded-xl border p-4 space-y-2 text-sm leading-7" aria-label={T("حدود و استفاده ایمن", "Limits and safe use")}>
      <p>{T("این صداها انتخابی برای فضای استراحت‌اند، نه درمان بی‌خوابی. نام‌هایی مانند «دلتا» نوع صدا را توصیف می‌کنند؛ تغییر امواج مغزی، خواب عمیق یا بهترشدن خواب را تضمین نمی‌کنند.", "These optional sounds are for a resting environment, not insomnia treatment. Names such as ‘delta’ describe the sound; they do not guarantee altered brainwaves, deep sleep, or better sleep.")}</p>
      <p>{T("با صدای کم و مدت کوتاه شروع کنید. استفاده از هدفون الزامی نیست؛ اگر صدا، هدفون یا تمرین ناراحت‌کننده است، آن را متوقف کنید. پایان تایمر فقط پایان پخش است، نه نشانهٔ خوابیدن یا بهبود حال.", "Start with low volume and a short duration. Headphones are optional; stop if the sound, headphones, or exercise feels uncomfortable. The timer ending only means playback has ended, not that you slept or felt better.")}</p>
      <p>{T("می‌توانید بدون صدا استراحت کنید یا یک کار آرام و دلخواه پیش از خواب انتخاب کنید. اگر مشکل خواب ادامه دارد یا بر زندگی روزمره اثر می‌گذارد، با پزشک یا متخصص سلامت مشورت کنید.", "You can rest without sound or choose a quiet activity you prefer before bed. If sleep problems persist or affect daily life, consider speaking with a healthcare professional.")}</p>
    </section>
    <SleepSoundsCard isEn={isEn} />
  </main>;
}
