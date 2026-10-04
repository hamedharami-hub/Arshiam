import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ContactOccasion } from "@/lib/contactTypes";

interface Props {
  birthday: string;
  onBirthdayChange: (value: string) => void;
  occasions: ContactOccasion[];
  onChange: (value: ContactOccasion[]) => void;
  T: (fa: string, en: string) => string;
}

export function ContactOccasionsEditor({ birthday, onBirthdayChange, occasions, onChange, T }: Props) {
  const change = (id: string, patch: Partial<ContactOccasion>) => onChange(occasions.map(item => item.id === id ? { ...item, ...patch } : item));
  return <section className="space-y-3 border-t border-border pt-3">
    <label className="block space-y-1 text-xs font-medium">
      <span>{T("تاریخ تولد", "Birthday")}</span>
      <Input type="date" value={birthday} onChange={event => onBirthdayChange(event.target.value)} className="max-w-xs" dir="ltr" />
    </label>
    <details open={occasions.length > 0 || undefined}>
      <summary className="cursor-pointer text-sm font-medium">{T("مناسبت‌های دیگر", "Other occasions")} {occasions.length ? `(${occasions.length})` : ""}</summary>
      <div className="space-y-3 pt-3">
        {occasions.map((item, index) => <div key={item.id} className="grid min-w-0 gap-2 rounded-md border border-border p-2 sm:grid-cols-2">
          <Input aria-label={`${T("عنوان مناسبت", "Occasion title")} ${index + 1}`} placeholder={T("مثلاً سالگرد ازدواج", "For example, wedding anniversary")} value={item.label} onChange={event => change(item.id, { label: event.target.value })} />
          <Input aria-label={`${T("تاریخ مناسبت", "Occasion date")} ${index + 1}`} type="date" dir="ltr" value={item.date} onChange={event => change(item.id, { date: event.target.value })} />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.annual} onChange={event => change(item.id, { annual: event.target.checked })} />{T("تکرار هر سال", "Repeat every year")}</label>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(occasions.filter(value => value.id !== item.id))} aria-label={`${T("حذف مناسبت", "Remove occasion")} ${index + 1}`}>{T("حذف", "Remove")}</Button>
        </div>)}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...occasions, { id: crypto.randomUUID(), label: "", date: "", annual: true }])}>{T("افزودن مناسبت", "Add occasion")}</Button>
      </div>
    </details>
  </section>;
}
