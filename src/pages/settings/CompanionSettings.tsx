import { useTranslation } from "react-i18next";
import { setMascotMode, useMascotMode, setMascotLook, useMascotLook, type MascotMode, type MascotLook } from "@/lib/mascot";
import { MascotCharacter } from "@/components/AngelCompanion";
import { SectionCard } from "./SectionCard";

export function CompanionSettings() {
  const { i18n } = useTranslation();
  const en = i18n.language.startsWith("en");
  const mode = useMascotMode();
  const look = useMascotLook();
  return <SectionCard title={en ? "Little angel companion" : "فرشتهٔ کوچولوی همراه"} description={en ? "Gentle moments for tasks, plants and AI. This device only; always silent." : "همراهی کوتاه برای تسک‌ها، گل‌ها و هوش مصنوعی؛ بدون صدا. تنظیم این دستگاه."}>
    <div className="flex items-center gap-4"><MascotCharacter pose="celebrate" size={70} /><div className="flex-1">
      <label className="text-sm" htmlFor="companion-mode">{en ? "Companion animations" : "نمایش و انیمیشن فرشته"}</label>
      <select id="companion-mode" value={mode} onChange={e => setMascotMode(e.target.value as MascotMode)} className="mt-2 block w-full rounded-md border bg-background p-2 text-sm">
        <option value="full">{en ? "Full — gentle animations" : "کامل — حرکت‌های نرم"}</option><option value="calm">{en ? "Calm — brief, minimal motion" : "آرام — کوتاه و کم‌حرکت"}</option><option value="off">{en ? "Off" : "خاموش"}</option>
      </select>
      <label className="mt-4 block text-sm" htmlFor="companion-look">{en ? "Little companion's look" : "ظاهر فرشتهٔ کوچولو"}</label>
      <select id="companion-look" value={look} onChange={e => setMascotLook(e.target.value as MascotLook)} className="mt-2 block w-full rounded-md border bg-background p-2 text-sm">
        <option value="blonde">{en ? "Golden hair" : "موی طلایی"}</option><option value="brown">{en ? "Chestnut curls" : "موی قهوه‌ای فرفری"}</option><option value="black">{en ? "Black curls" : "موی مشکی فرفری"}</option>
      </select>
    </div></div>
  </SectionCard>;
}
