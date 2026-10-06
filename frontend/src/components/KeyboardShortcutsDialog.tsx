import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";

const SHORTCUTS: { keys: string; fa: string; en: string }[] = [
  { keys: "⌘ K  /  Ctrl K", fa: "باز کردن جستجو و پیمایش سریع", en: "Open search and quick navigation" },
  { keys: "⌘ N  /  Ctrl N", fa: "ثبت سریع تسک یا نوت", en: "Quick-add a task or note" },
  { keys: "⌘ Z  /  Ctrl Z", fa: "بازگردانی آخرین عملیات", en: "Undo the last action" },
  { keys: "?", fa: "نمایش همین پنل میانبرها", en: "Show this shortcuts panel" },
  { keys: "Enter", fa: "ثبت در فرم‌های ساده", en: "Submit in simple forms" },
  { keys: "Esc", fa: "بستن دیالوگ یا پاپ‌اور باز", en: "Close the open dialog or popover" },
];

export default function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const { T, isEn } = useBilingual();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir={isEn ? "ltr" : "rtl"} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="w-4 h-4" />
            {T("میانبرهای صفحه‌کلید", "Keyboard shortcuts")}
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/40"
            >
              <span className="text-foreground/90">{T(s.fa, s.en)}</span>
              <kbd className="text-[11px] font-mono bg-background border rounded px-2 py-0.5 ltr">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground pt-2">
          {T(
            "روی موبایل میانبرها در دسترس نیستند — از نوار پایین و دکمه‌های صفحه استفاده کنید.",
            "Shortcuts are not available on mobile — use the bottom bar and on-screen buttons."
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
