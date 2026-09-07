import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "⌘ K  /  Ctrl K", label: "باز کردن جستجو و پیمایش سریع" },
  { keys: "⌘ N  /  Ctrl N", label: "ثبت سریع تسک یا نوت" },
  { keys: "⌘ Z  /  Ctrl Z", label: "بازگردانی آخرین عملیات" },
  { keys: "?", label: "نمایش همین پنل میانبرها" },
  { keys: "Enter", label: "ثبت در فرم‌های ساده" },
  { keys: "Esc", label: "بستن دیالوگ یا پاپ‌اور باز" },
];

export default function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

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
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="w-4 h-4" />
            میانبرهای صفحه‌کلید
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/40"
            >
              <span className="text-foreground/90">{s.label}</span>
              <kbd className="text-[11px] font-mono bg-background border rounded px-2 py-0.5 ltr">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground pt-2">
          روی موبایل میانبرها در دسترس نیستند — از نوار پایین و دکمه‌های صفحه استفاده کنید.
        </p>
      </DialogContent>
    </Dialog>
  );
}
