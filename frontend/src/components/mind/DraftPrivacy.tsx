import { useBilingual } from "@/hooks/useBilingual";
export function DraftPrivacy({ temporary, setTemporary }: { temporary: boolean; setTemporary: (next: boolean) => boolean }) {
  const { T } = useBilingual();
  return <details className="rounded-lg border p-3 text-xs">
    <summary className="min-h-11 cursor-pointer font-medium">{T("نگهداری پیش‌نویس و حریم خصوصی", "Draft retention & privacy")}</summary>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={temporary} onChange={event => setTemporary(event.target.checked)} />{T("حالت موقت؛ تغییرات بعدی فقط در حافظه", "Temporary mode; subsequent edits stay in memory")}</label>
    <p className="leading-5 text-muted-foreground">{T("پیش‌فرض، حفظ روی همین دستگاه و بدون رمزنگاری است. حالت موقت نسخه‌های قبلاً حفظ‌شده را پاک نمی‌کند؛ برای حذفشان از بخش داده‌های Mind استفاده کن. خروج یا refresh ممکن است تغییر موقت را از بین ببرد. خاموش‌کردن این گزینه، حفظ همین نسخه را درخواست می‌کند. ثبت صریح در حساب، عملی جداست.", "The default is unencrypted retention on this device. Temporary mode does not erase previously retained copies; use Mind data controls to delete them. Leaving or refreshing may lose temporary edits. Turning this option off requests retention of this copy. Explicit account saving is a separate action.")}</p>
  </details>;
}
