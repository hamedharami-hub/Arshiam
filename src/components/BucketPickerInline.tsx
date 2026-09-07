import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, X, Sunrise, Sun, Sunset, Moon } from "lucide-react";
import {
  ALL_BUCKET_KINDS, type BucketKind, getEnabledBuckets,
  currentAnchor, bucketLabel, kindLabel,
} from "@/lib/timeBuckets";
import { getCalendarSystem, type CalendarSystem } from "@/lib/jalali";

type Value = {
  kind: BucketKind | null;
  calendar: CalendarSystem | null;
  anchor: string | null;
};

const TIME_PRESETS: { id: string; label: string; hour: number; icon: any }[] = [
  { id: "morning",   label: "صبح",  hour: 8,  icon: Sunrise },
  { id: "noon",      label: "ظهر",  hour: 12, icon: Sun },
  { id: "afternoon", label: "عصر",  hour: 17, icon: Sunset },
  { id: "night",     label: "شب",   hour: 21, icon: Moon },
];

export function BucketPickerBody({
  value,
  onChange,
  onPickTimeOfDay,
}: {
  value: Value;
  onChange: (v: Value) => void;
  onPickTimeOfDay?: (hour: number) => void;
}) {
  const enabled = getEnabledBuckets();
  const cal = getCalendarSystem();
  return (
    <div className="space-y-0.5">
      {onPickTimeOfDay && (
        <div className="px-1 pb-1.5 mb-1 border-b">
          <p className="text-[10px] text-muted-foreground mb-1">پیش‌فرض‌های امروز</p>
          <div className="grid grid-cols-4 gap-1">
            {TIME_PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => onPickTimeOfDay(p.hour)}
                  className="flex flex-col items-center gap-0.5 p-1.5 rounded-md hover:bg-accent text-[10px]"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {value.kind && (
        <button
          onClick={() => onChange({ kind: null, calendar: null, anchor: null })}
          className="w-full text-start p-2 rounded text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
        >
          <X className="w-3.5 h-3.5" /> پاک‌کردن بازه
        </button>
      )}
      {ALL_BUCKET_KINDS.filter((k) => enabled.includes(k)).map((k) => {
        const anchor = currentAnchor(k, cal);
        const active =
          value.kind === k && value.anchor === anchor && value.calendar === cal;
        return (
          <button
            key={k}
            onClick={() => onChange({ kind: k, calendar: cal, anchor })}
            className={`w-full text-start p-2 rounded text-sm hover:bg-accent flex items-center justify-between gap-2 ${active ? "bg-accent" : ""}`}
          >
            <span>
              <span className="font-medium">{kindLabel(k)}</span>
              <span className="text-[10px] text-muted-foreground ms-1.5">
                {bucketLabel(k, cal, anchor)}
              </span>
            </span>
            {active && <Check className="w-3.5 h-3.5" />}
          </button>
        );
      })}
    </div>
  );
}

// Standalone (button + popover) variant used elsewhere if needed.
export function BucketPickerInline(props: {
  value: Value;
  onChange: (v: Value) => void;
}) {
  const current =
    props.value.kind && props.value.anchor && props.value.calendar
      ? `${kindLabel(props.value.kind)} · ${bucketLabel(props.value.kind, props.value.calendar, props.value.anchor)}`
      : "انتخاب بازه";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          {current}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="end">
        <BucketPickerBody value={props.value} onChange={props.onChange} />
      </PopoverContent>
    </Popover>
  );
}
