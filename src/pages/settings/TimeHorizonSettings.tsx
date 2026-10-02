import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { useBilingual } from "@/hooks/useBilingual";
import { TimeSettingsFields } from "@/components/horizon/TimeSettingsFields";
import { getTimeSettings } from "@/lib/timeHorizon";

export function TimeHorizonSettings() {
  const { isEn } = useBilingual();
  const [settings, setSettings] = useState(getTimeSettings);
  return (
    <SectionCard
      icon={CalendarRange}
      title={isEn ? "Week, calendar & seasons" : "هفته، تقویم و فصل‌ها"}
      description={isEn ? "Used by Time Buckets, overdue detection and postponing." : "برای بازه‌های زمانی، تشخیص عقب‌افتادگی و تعویق استفاده می‌شود."}
    >
      <TimeSettingsFields settings={settings} fa={!isEn} onChanged={() => setSettings(getTimeSettings())} />
    </SectionCard>
  );
}
