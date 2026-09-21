import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard, SettingRow } from "./SectionCard";
import {
  SUPPORT_REGIONS,
  resolveSupportRegion,
  setStoredSupportRegion,
  type SupportRegion,
} from "@/lib/crisisResources";

export function CrisisSupportSettings() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isEn = (i18n.language || "fa").startsWith("en");
  const [region, setRegion] = useState<SupportRegion>(() =>
    resolveSupportRegion(isEn ? "en" : "fa"),
  );

  const changeRegion = (v: SupportRegion) => {
    setRegion(v);
    setStoredSupportRegion(v);
    toast.success(
      isEn
        ? `Crisis support region set to ${SUPPORT_REGIONS.find((r) => r.code === v)?.label_en}`
        : `منطقه پشتیبانی بحران به ${SUPPORT_REGIONS.find((r) => r.code === v)?.label} تنظیم شد`,
    );
  };

  return (
    <SectionCard
      icon={ShieldAlert}
      title={isEn ? "Crisis Support & Safety (SOS)" : "پشتیبانی بحران و خطوط کمکی اضطراری (SOS)"}
      description={
        isEn
          ? "Configure your manual crisis support region for relevant helplines and emergency numbers (Australia, Iran, etc.). Automatic geolocation is never used."
          : "انتخاب دستی منطقه جغرافیایی برای نمایش خطوط مشاوره و اورژانس مربوطه (استرالیا، ایران و...). مکان‌یابی خودکار انجام نمی‌شود."
      }
    >
      <div className="space-y-3">
        <SettingRow
          label={isEn ? "Support Region" : "منطقه پشتیبانی"}
          help={
            isEn
              ? "Determines which emergency numbers and 24/7 helplines are prioritized on the SOS page."
              : "تعیین خطوط تلفنی امداد و شماره‌های اضطراری در صفحه بحران و غربالگری‌ها."
          }
        >
          <Select value={region} onValueChange={(v) => changeRegion(v as SupportRegion)}>
            <SelectTrigger className="h-9 text-xs" data-testid="crisis-region-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_REGIONS.map((r) => (
                <SelectItem key={r.code} value={r.code} className="text-xs">
                  {r.flag} {isEn ? r.label_en : r.label} ({r.emergencyNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <div className="pt-2 flex items-center justify-between gap-3 border-t border-border/40">
          <span className="text-xs text-muted-foreground">
            {isEn
              ? "Emergency services & 24/7 confidential helplines"
              : "خدمات اورژانس و خطوط مشاوره رایگان ۲۴ ساعته"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/app/crisis")}
            className="text-xs gap-1.5 shrink-0 border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300"
            data-testid="open-crisis-from-settings"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {isEn ? "Open Crisis Page (SOS)" : "مشاهده صفحه بحران (SOS)"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
