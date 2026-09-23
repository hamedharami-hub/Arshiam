import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Smartphone,
  ShieldCheck,
  Search,
  Check,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";
import {
  isDeviceContactImportSupported,
  requestDeviceContactPermission,
  checkDeviceContactPermission,
  fetchDeviceContacts,
  type DeviceContactCandidate,
} from "@/lib/deviceContacts";
import { createContact, linkTaskContact } from "@/lib/contactService";
import type { Contact } from "@/lib/contactTypes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  taskId?: string;
  onImported?: (importedContacts: Contact[]) => void;
}

export function DeviceContactImportModal({
  open,
  onOpenChange,
  userId,
  taskId,
  onImported,
}: Props) {
  const { prefersDialog } = useDeviceFormFactor();
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const isSupported = isDeviceContactImportSupported();

  const [hasPermission, setHasPermission] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContactCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Field selection options
  const [importPhones, setImportPhones] = useState(true);
  const [importEmails, setImportEmails] = useState(true);
  const [importOrg, setImportOrg] = useState(true);
  const [importAddresses, setImportAddresses] = useState(true);
  const [importWebsites, setImportWebsites] = useState(true);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setSearch("");
      if (isSupported) {
        checkDeviceContactPermission().then((granted) => {
          setHasPermission(granted);
          if (granted) {
            loadDeviceContacts();
          }
        });
      }
    }
  }, [open, isSupported]);

  const loadDeviceContacts = async () => {
    setLoading(true);
    try {
      const res = await fetchDeviceContacts();
      if (res.error) {
        toast.error(res.error);
      } else {
        setDeviceContacts(res.contacts);
      }
    } catch {
      toast.error(T("خطا در بارگذاری مخاطبین گوشی", "Failed to load device contacts"));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const res = await requestDeviceContactPermission();
      if (res.granted) {
        setHasPermission(true);
        toast.success(T("دسترسی به مخاطبین تأیید شد", "Contacts access granted"));
        await loadDeviceContacts();
      } else {
        toast.error(T("دسترسی داده نشد", "Permission denied"));
      }
    } catch {
      toast.error(T("خطا در درخواست دسترسی", "Permission error"));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleImport = async () => {
    if (selectedIds.size === 0 || !userId) return;

    setBusy(true);
    try {
      const candidates = deviceContacts.filter((c) => selectedIds.has(c.id));
      const createdContacts: Contact[] = [];

      for (const cand of candidates) {
        const created = await createContact(userId, {
          display_name: cand.display_name,
          first_name: cand.first_name,
          last_name: cand.last_name,
          company: importOrg ? cand.company : undefined,
          job_title: importOrg ? cand.job_title : undefined,
          phones: importPhones ? cand.phones : [],
          emails: importEmails ? cand.emails : [],
          addresses: importAddresses ? cand.addresses : [],
          websites: importWebsites ? cand.websites : [],
          source: "device_import",
        });

        createdContacts.push(created);

        // If taskId was provided, also auto-link to task
        if (taskId) {
          await linkTaskContact(taskId, created.id, userId);
        }
      }

      toast.success(
        T(
          `${createdContacts.length} مخاطب با موفقیت وارد شد`,
          `Successfully imported ${createdContacts.length} contacts`
        )
      );

      onImported?.(createdContacts);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : T("خطا در واردسازی مخاطبین", "Import error"));
    } finally {
      setBusy(false);
    }
  };

  const filtered = deviceContacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.display_name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.phones?.some((p) => p.value.includes(q)) ||
      c.emails?.some((e) => e.value.toLowerCase().includes(q))
    );
  });

  const unsupportedContent = (
    <div className="py-8 px-4 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
        <Smartphone className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-foreground">
        {T("فقط در نسخهٔ Android", "Only available on Android")}
      </h4>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {T(
          "ورود مستقیم مخاطبین گوشی فقط در برنامهٔ اندروید ARSHNAZ پشتیبانی می‌شود. در نسخهٔ ویندوز و وب می‌توانید مخاطبین را به‌صورت دستی ایجاد یا مدیریت کنید.",
          "Importing device contacts is only supported on the Android ARSHNAZ app. On Windows and Web, you can create and manage contacts manually."
        )}
      </p>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="mt-2">
        {T("بستن", "Close")}
      </Button>
    </div>
  );

  const permissionRequestContent = (
    <div className="py-6 px-4 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <ShieldCheck className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-foreground">
          {T("درخواست دسترسی به مخاطبین گوشی", "Contacts Permission Request")}
        </h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
          {T(
            "برای انتخاب و کپی مخاطب از گوشی، به دسترسی خواندن مخاطبین نیاز است. ARSHNAZ هیچ‌گونه اسکن پس‌زمینه یا همگام‌سازی دائمی انجام نخواهد داد.",
            "Contacts access is required to choose contacts from your phone. ARSHNAZ performs zero background scanning or continuous syncing."
          )}
        </p>
      </div>

      <Button onClick={handleRequestPermission} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
        {T("تأیید و انتخاب مخاطبین", "Grant & Pick Contacts")}
      </Button>
    </div>
  );

  const importListContent = (
    <div className="space-y-3 py-2 flex flex-col min-h-0 flex-1">
      {/* Field selection checkboxes */}
      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 space-y-1.5 text-xs">
        <span className="font-semibold text-[11px] text-muted-foreground block">
          {T("فیلدهای مورد نظر برای کپی:", "Fields to copy:")}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox checked={importPhones} onCheckedChange={(v) => setImportPhones(Boolean(v))} />
            <span>{T("شماره‌ها", "Phones")}</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox checked={importEmails} onCheckedChange={(v) => setImportEmails(Boolean(v))} />
            <span>{T("ایمیل‌ها", "Emails")}</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox checked={importOrg} onCheckedChange={(v) => setImportOrg(Boolean(v))} />
            <span>{T("شرکت و سمت", "Company & Role")}</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox checked={importAddresses} onCheckedChange={(v) => setImportAddresses(Boolean(v))} />
            <span>{T("آدرس‌ها", "Addresses")}</span>
          </label>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute start-2.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={T("جستجوی مخاطبین گوشی...", "Search phone contacts...")}
          className="h-8 ps-8 text-xs"
        />
      </div>

      {/* Contact List */}
      <div className="flex-1 min-h-[200px] max-h-[280px] overflow-y-auto pe-1 space-y-1 border border-border/40 rounded-xl p-1.5 bg-muted/20">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-3 text-muted-foreground">
            <Users className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-xs">{T("مخاطبی در گوشی یافت نشد", "No contacts found on phone")}</p>
          </div>
        ) : (
          filtered.map((c) => {
            const isSelected = selectedIds.has(c.id);
            return (
              <div
                key={c.id}
                onClick={() => toggleSelect(c.id)}
                className={`flex items-center justify-between gap-2.5 p-2 rounded-lg cursor-pointer transition select-none ${
                  isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(c.id)} />
                  <Avatar className="h-7 w-7 shrink-0 text-[10px]">
                    <AvatarFallback className="font-bold">{c.display_name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-foreground truncate block">
                      {c.display_name}
                    </span>
                    {(c.company || c.phones[0]?.value) && (
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {[c.company, c.phones[0]?.value].filter(Boolean).join(" • ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground">
          {selectedIds.size > 0
            ? T(`${selectedIds.size} مخاطب انتخاب شده`, `${selectedIds.size} selected`)
            : T("مخاطبی انتخاب نشده", "None selected")}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {T("انصراف", "Cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={selectedIds.size === 0 || busy}
            className="gap-1.5"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {T("ورود به برنامه", "Import to ARSHNAZ")}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {prefersDialog ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            dir={isEn ? "ltr" : "rtl"}
            className="w-full max-w-md sm:max-w-lg max-h-[75vh] flex flex-col p-4 sm:p-5 overflow-hidden rounded-2xl"
          >
            <DialogHeader>
              <DialogTitle className="text-start text-base font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                {T("ورود از مخاطبین گوشی", "Import from Phone Contacts")}
              </DialogTitle>
              <DialogDescription className="sr-only">Device contact import</DialogDescription>
            </DialogHeader>

            {!isSupported
              ? unsupportedContent
              : !hasPermission
              ? permissionRequestContent
              : importListContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            dir={isEn ? "ltr" : "rtl"}
            className="rounded-t-2xl max-h-[85vh] flex flex-col p-4 pb-6 overflow-hidden"
          >
            <SheetHeader>
              <SheetTitle className="text-start text-base font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                {T("ورود از مخاطبین گوشی", "Import from Phone Contacts")}
              </SheetTitle>
            </SheetHeader>

            {!isSupported
              ? unsupportedContent
              : !hasPermission
              ? permissionRequestContent
              : importListContent}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
