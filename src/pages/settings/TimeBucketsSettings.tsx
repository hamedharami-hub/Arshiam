import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "./SectionCard";
import {
  ALL_BUCKET_KINDS,
  getEnabledBuckets,
  setEnabledBuckets,
  kindLabel,
  type BucketKind,
} from "@/lib/timeBuckets";
import { getCalendarSystem, setCalendarSystem, type CalendarSystem } from "@/lib/jalali";

export function TimeBucketsSettings() {
  const [enabled, setEnabled] = useState<BucketKind[]>(() => getEnabledBuckets());
  const [cal, setCal] = useState<CalendarSystem>(() => getCalendarSystem());
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");

  const toggle = (k: BucketKind) => {
    const next = enabled.includes(k) ? enabled.filter((x) => x !== k) : [...enabled, k];
    setEnabled(next);
    setEnabledBuckets(next);
  };

  const changeCal = (v: CalendarSystem) => {
    setCal(v);
    setCalendarSystem(v);
  };

  return (
    <SectionCard
      icon={LayoutGrid}
      title={t("settings.timeBucketsTitle")}
      description={t("settings.timeBucketsDesc")}
    >
      <div className="space-y-2">
        {ALL_BUCKET_KINDS.map((k) => (
          <div
            key={k}
            className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/40"
          >
            <span className="text-sm">{kindLabel(k, isEn ? "en" : "fa")}</span>
            <Switch checked={enabled.includes(k)} onCheckedChange={() => toggle(k)} />
          </div>
        ))}
      </div>
      <div className="pt-2 border-t space-y-2">
        <Label className="text-xs">{t("settings.calendarSystem")}</Label>
        <Select value={cal} onValueChange={(v) => changeCal(v as CalendarSystem)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jalali">{t("settings.jalali")}</SelectItem>
            <SelectItem value="gregorian">{t("settings.gregorian")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </SectionCard>
  );
}
