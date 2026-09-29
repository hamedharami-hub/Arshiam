import { useEffect, useState } from "react";
import { KeyRound, Loader2, Puzzle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBilingual } from "@/hooks/useBilingual";
import { APP_MODULES, MODULE_IDS, redeemModuleCode, setModuleInstalled, useModules, type ModuleId } from "@/lib/appModules";
import { OPEN_MODULES_PANEL_EVENT } from "./VersionTapTarget";
import { ModuleCodesAdmin } from "./ModuleCodesAdmin";

export function AdvancedModulesPanel() {
  const { T, isEn } = useBilingual();
  const modules = useModules();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_MODULES_PANEL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MODULES_PANEL_EVENT, onOpen);
  }, []);

  const redeem = async () => {
    setBusy("redeem");
    try {
      const added = await redeemModuleCode(code.trim());
      setCode("");
      toast.success(added.length
        ? T(`${added.length} بخش نصب شد`, `${added.length} section(s) installed`)
        : T("این کد چیز تازه‌ای باز نکرد", "Nothing new was unlocked"));
    } catch (e: any) {
      const message = e?.status === 429
        ? T("تلاش‌های اشتباه زیاد بود؛ ۱۵ دقیقه بعد دوباره امتحان کن", "Too many wrong codes, try again in 15 minutes")
        : e?.status === 400
          ? T("کد درست نیست یا اعتبار آن تمام شده است", "Invalid or expired code")
          : e?.status === 401
            ? T("دوباره وارد حساب شوید و تلاش کنید", "Sign in again and retry")
            : T("سرویس فعال‌سازی در دسترس نیست؛ این خطا به معنی نادرست بودن کد نیست", "Unlock service is unavailable; this does not mean your code is wrong");
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (id: ModuleId, on: boolean) => {
    setBusy(id);
    try {
      await setModuleInstalled(id, on);
      toast.success(on ? T("نصب شد", "Installed") : T("حذف شد؛ داده‌هایت سر جایش می‌ماند", "Removed — your data is kept"));
    } catch (e: any) {
      toast.error(e?.message || T("خطا", "Error"));
    } finally {
      setBusy(null);
    }
  };

  const unlocked = MODULE_IDS.filter((id) => modules.unlocked.includes(id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="modules-panel">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Puzzle className="w-4 h-4 text-primary" />{T("بخش‌های پیشرفته", "Advanced sections")}</DialogTitle>
          <DialogDescription>{T("بخش‌های سنگین فقط برای این حساب و بعد از واردکردن کد نصب می‌شوند.", "Heavy sections are installed for this account only, after entering a code.")}</DialogDescription>
        </DialogHeader>

        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim().length >= 4) void redeem(); }}>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={T("کد فعال‌سازی", "Access code")} dir="ltr"
            autoComplete="off" className="font-mono" data-testid="modules-code-input" />
          <Button type="submit" disabled={busy === "redeem" || code.trim().length < 4} className="gap-1" data-testid="modules-code-submit">
            {busy === "redeem" ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}{T("فعال‌سازی", "Unlock")}
          </Button>
        </form>

        {unlocked.length > 0 && (
          <div className="space-y-2" data-testid="modules-list">
            {unlocked.map((id) => {
              const m = APP_MODULES[id];
              return (
                <div key={id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3" data-testid={`module-row-${id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{isEn ? m.titleEn : m.titleFa}</div>
                    <div className="text-[11px] text-muted-foreground leading-5">{isEn ? m.descEn : m.descFa}</div>
                  </div>
                  {busy === id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <Switch checked={modules.installed.includes(id)} onCheckedChange={(v) => toggle(id, v)} data-testid={`module-toggle-${id}`}
                      aria-label={isEn ? `Install ${m.titleEn}` : `نصب ${m.titleFa}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {modules.isAdmin && <ModuleCodesAdmin />}
      </DialogContent>
    </Dialog>
  );
}
