import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";

export function DraftConflictNotice({ conflict, acceptRemote, keepLocal }: {
  conflict: boolean; acceptRemote: () => void; keepLocal: () => boolean;
}) {
  const { T } = useBilingual();
  if (!conflict) return null;
  return <aside role="alert" className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
    <p>{T("نسخهٔ دیگری از این پیش‌نویس در تب دیگری تغییر کرده است. نوشتهٔ فعلی جایگزین نشده؛ نسخهٔ دلخواه را انتخاب کنید.", "Another tab changed this draft. Your working copy was not replaced; choose which version to keep.")}</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={acceptRemote}>{T("خواندن نسخهٔ دیگر", "Use other version")}</Button>
      <Button variant="outline" size="sm" onClick={() => keepLocal()}>{T("حفظ همین نسخه", "Keep this version")}</Button>
    </div>
  </aside>;
}
