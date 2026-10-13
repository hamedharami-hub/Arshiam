import { useEffect, useState } from "react";
import { getLocalDateString } from "@/lib/taskDate";
import { readTreasury, treasuryForDate, TREASURY_EVENT } from "@/lib/dailyTreasury";

export function DailyTreasury({ isEn, bilingual }: { isEn: boolean; bilingual: boolean }) {
  const [entries, setEntries] = useState(readTreasury);
  const [date, setDate] = useState(() => getLocalDateString(new Date()));
  useEffect(() => {
    const update = () => { setEntries(readTreasury()); setDate(getLocalDateString(new Date())); };
    const timer = window.setInterval(() => setDate(getLocalDateString(new Date())), 60000);
    window.addEventListener(TREASURY_EVENT, update);
    window.addEventListener("storage", update);
    return () => { window.clearInterval(timer); window.removeEventListener(TREASURY_EVENT, update); window.removeEventListener("storage", update); };
  }, []);
  const entry = treasuryForDate(entries, date);
  return <section className="rounded-xl border bg-card p-3 text-xs" data-testid="daily-treasury">
    <h2 className="text-sm font-medium">{isEn ? "Daily treasury" : "گنجینهٔ روزانه"}</h2>
    {entry ? <>
      <p className="mt-2 whitespace-pre-wrap leading-6" dir={isEn ? "ltr" : "rtl"}>{(isEn ? entry.en : entry.fa).slice(0, 220)}{(isEn ? entry.en : entry.fa).length > 220 ? "…" : ""}</p>
      <details className="mt-1">
        <summary className="min-h-11 cursor-pointer py-3 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">{isEn ? "Read more · source" : "ادامه و منبع"}</summary>
        <p className="whitespace-pre-wrap leading-7" dir={isEn ? "ltr" : "rtl"}>{isEn ? entry.en : entry.fa}</p>
        {bilingual && <p className="mt-3 whitespace-pre-wrap border-t pt-3 leading-7" dir={isEn ? "rtl" : "ltr"}>{isEn ? entry.fa : entry.en}</p>}
        <p className="mt-2 text-muted-foreground" dir="auto">{entry.source}</p>
      </details>
    </> : <p className="mt-2 leading-6 text-muted-foreground">{isEn ? "Import a licensed, human-authored bilingual collection in Settings → General. No AI-generated content is bundled." : "در تنظیمات ← عمومی، مجموعهٔ دوزبانه با نگارش انسانی و مجوز استفاده وارد کن. محتوای تولیدشده توسط AI همراه این بخش نیست."}</p>}
  </section>;
}
