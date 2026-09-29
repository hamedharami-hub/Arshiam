import { useEffect, useState } from "react";
import { Copy, Loader2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBilingual } from "@/hooks/useBilingual";
import { createModuleCode, listModuleCodes, revokeModuleCode, type ModuleCode } from "@/lib/appModules";

/** Admin-only: create / revoke access codes. Plain codes are shown once, right after creation. */
export function ModuleCodesAdmin() {
  const { T } = useBilingual();
  const [codes, setCodes] = useState<ModuleCode[]>([]);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [days, setDays] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => listModuleCodes().then(setCodes).catch(() => setCodes([]));
  useEffect(() => { void load(); }, []);

  const create = async () => {
    setBusy(true);
    try {
      const c = await createModuleCode({ label: label.trim(), modules: ["*"], max_uses: maxUses ? Number(maxUses) : null, expires_in_days: days ? Number(days) : null });
      setFresh(c.code || null);
      setLabel(""); setMaxUses(""); setDays("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || T("خطا", "Error"));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (c: ModuleCode, withdraw: boolean) => {
    await revokeModuleCode(c.id, withdraw).catch((e) => toast.error(e?.message));
    await load();
  };

  return (
    <div className="space-y-3 border-t pt-4" data-testid="module-codes-admin">
      <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="w-4 h-4 text-primary" />{T("مدیریت کدها", "Manage codes")}</div>
      <div className="grid grid-cols-3 gap-2">
        <Input className="col-span-3" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={T("برچسب (مثلاً نام کاربر)", "Label (e.g. user name)")} data-testid="module-code-label" />
        <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} placeholder={T("سقف استفاده", "Max uses")} inputMode="numeric" data-testid="module-code-max-uses" />
        <Input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} placeholder={T("اعتبار (روز)", "Valid days")} inputMode="numeric" data-testid="module-code-days" />
        <Button onClick={create} disabled={busy || !label.trim()} className="gap-1" data-testid="module-code-create">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{T("ساخت", "Create")}
        </Button>
      </div>
      {fresh && (
        <div className="rounded-xl bg-emerald-500/10 p-3 text-xs space-y-1" data-testid="module-code-fresh">
          <div>{T("این کد فقط همین یک بار نمایش داده می‌شود:", "This code is shown only once:")}</div>
          <button type="button" className="font-mono text-sm font-bold inline-flex items-center gap-1" dir="ltr"
            onClick={() => { void navigator.clipboard?.writeText(fresh); toast.success(T("کپی شد", "Copied")); }}>
            {fresh} <Copy className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="space-y-1.5 max-h-56 overflow-y-auto">
        {codes.map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-xs rounded-lg border border-border/50 px-2 py-1.5" data-testid={`module-code-row-${c.id}`}>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.label}{c.revoked && <span className="text-destructive"> · {T("باطل", "revoked")}</span>}</div>
              <div className="text-muted-foreground">{T("استفاده", "Uses")}: {c.uses}{c.max_uses ? `/${c.max_uses}` : ""}{c.expires_at ? ` · ${T("تا", "until")} ${c.expires_at.slice(0, 10)}` : ""}</div>
            </div>
            {!c.revoked && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => revoke(c, false)} data-testid={`module-code-revoke-${c.id}`}>{T("باطل", "Revoke")}</Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] text-destructive" onClick={() => revoke(c, true)} data-testid={`module-code-withdraw-${c.id}`}>{T("باطل + پس‌گرفتن", "Revoke + withdraw")}</Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
