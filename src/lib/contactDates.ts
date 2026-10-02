import type { Contact } from "./contactTypes";

export function isContactDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateContactDates(input: Pick<Partial<Contact>, "birthday" | "occasions">): void {
  if (input.birthday && !isContactDate(input.birthday)) {
    throw new Error("تاریخ تولد معتبر نیست / Invalid birthday");
  }
  if (input.occasions?.some(item => !item.id || !item.label.trim() || !isContactDate(item.date))) {
    throw new Error("عنوان و تاریخ معتبر برای هر مناسبت لازم است / Each occasion needs a title and valid date");
  }
}
