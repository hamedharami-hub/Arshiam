import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  CalendarRange,
  CalendarDays,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  SUB_DAY_BUCKET_KINDS,
  MULTI_DAY_BUCKET_KINDS,
  type BucketKind,
  type SubDayBucketKind,
  type MultiDayBucketKind,
  getEnabledBuckets,
  currentAnchor,
  bucketLabel,
  kindLabel,
  isSubDayBucket,
} from "@/lib/timeBuckets";
import { getCalendarSystem, type CalendarSystem } from "@/lib/jalali";
import { useBilingual } from "@/hooks/useBilingual";

type Value = {
  kind: BucketKind | null;
  calendar: CalendarSystem | null;
  anchor: string | null;
};

const SUB_DAY_ICONS: Record<SubDayBucketKind, any> = {
  morning: Sunrise,
  noon: Sun,
  afternoon: Sunset,
  night: Moon,
};

const MULTI_DAY_ICONS: Record<MultiDayBucketKind, any> = {
  day: CalendarDays,
  week: CalendarRange,
  month: Calendar,
  quarter: Sparkles,
  year: Calendar,
};

export function BucketPickerBody({
  value,
  onChange,
  onPickTimeOfDay,
}: {
  value: Value;
  onChange: (v: Value) => void;
  onPickTimeOfDay?: (hour: number) => void;
}) {
  const { isEn, T } = useBilingual();
  const enabled = getEnabledBuckets();
  const cal = getCalendarSystem();

  // Active category: if currently selected is sub-day, open sub-day tab by default
  const [category, setCategory] = useState<"sub_day" | "multi_day">(() => {
    if (value.kind && isSubDayBucket(value.kind)) return "sub_day";
    return "multi_day";
  });

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="space-y-2 p-1">
      {/* Category Switcher: Sub-day vs Multi-day */}
      <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-muted/60 border border-border text-xs">
        <button
          type="button"
          onClick={() => setCategory("multi_day")}
          className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
            category === "multi_day"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {T("بالای یک روز", "Over 1 Day")}
        </button>
        <button
          type="button"
          onClick={() => setCategory("sub_day")}
          className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
            category === "sub_day"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {T("زیر یک روز", "Under 1 Day")}
        </button>
      </div>

      {/* Clear Button */}
      {value.kind && (
        <button
          type="button"
          onClick={() => onChange({ kind: null, calendar: null, anchor: null })}
          className="w-full text-start p-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 flex items-center gap-1.5 transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>{T("پاک‌کردن بازه زمانی", "Clear Time Bucket")}</span>
        </button>
      )}

      {/* Bucket Options List */}
      <div className="space-y-1">
        {category === "sub_day" && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground px-1 pb-0.5">
              {T("بازه درون‌روزی بدون ساعت دقیق (مانند Tag):", "Fuzzy sub-day window (Acts as Tag):")}
            </p>
            {SUB_DAY_BUCKET_KINDS.filter((k) => enabled.includes(k)).map((k) => {
              const anchor = currentAnchor(k, cal);
              const active = value.kind === k && value.anchor === anchor;
              const Icon = SUB_DAY_ICONS[k];

              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onChange({ kind: k, calendar: cal, anchor })}
                  className={`w-full text-start p-2 rounded-xl text-xs hover:bg-accent/80 flex items-center justify-between gap-2 transition cursor-pointer border border-transparent ${
                    active ? "bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200 font-bold" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{kindLabel(k, isEn ? "en" : "fa")}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({bucketLabel(k, cal, anchor, isEn ? "en" : "fa")})
                    </span>
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                </button>
              );
            })}
          </div>
        )}

        {category === "multi_day" && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground px-1 pb-0.5">
              {T("بازه افق زمانی بالای ۱ روز:", "Multi-day time horizon:")}
            </p>
            {MULTI_DAY_BUCKET_KINDS.filter((k) => enabled.includes(k)).map((k) => {
              const anchor = currentAnchor(k, cal);
              const active = value.kind === k && value.anchor === anchor;
              const Icon = MULTI_DAY_ICONS[k];

              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onChange({ kind: k, calendar: cal, anchor })}
                  className={`w-full text-start p-2 rounded-xl text-xs hover:bg-accent/80 flex items-center justify-between gap-2 transition cursor-pointer border border-transparent ${
                    active ? "bg-primary/15 border-primary/30 text-primary font-bold" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>{kindLabel(k, isEn ? "en" : "fa")}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({bucketLabel(k, cal, anchor, isEn ? "en" : "fa")})
                    </span>
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Standalone (button + popover) variant
export function BucketPickerInline(props: {
  value: Value;
  onChange: (v: Value) => void;
}) {
  const { isEn } = useBilingual();
  const current =
    props.value.kind && props.value.anchor && props.value.calendar
      ? `${kindLabel(props.value.kind, isEn ? "en" : "fa")} · ${bucketLabel(
          props.value.kind,
          props.value.calendar,
          props.value.anchor,
          isEn ? "en" : "fa"
        )}`
      : isEn
      ? "Select Time Bucket"
      : "انتخاب بازه زمانی";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium rounded-xl">
          {current}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 rounded-2xl shadow-xl border-border bg-card" align="end">
        <BucketPickerBody value={props.value} onChange={props.onChange} />
      </PopoverContent>
    </Popover>
  );
}
