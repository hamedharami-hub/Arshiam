import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Search, UserPlus, Users, Check, X, Loader2 } from "lucide-react";
import type { Contact } from "@/lib/contactTypes";
import { getContacts, linkTaskContact, getTaskContacts } from "@/lib/contactService";
import { ContactEditorDialog } from "./ContactEditorDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  userId: string;
  onLinked?: () => void;
}

export function ContactPickerModal({
  open,
  onOpenChange,
  taskId,
  userId,
  onLinked,
}: Props) {
  const { prefersDialog } = useDeviceFormFactor();
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [alreadyLinkedIds, setAlreadyLinkedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [roleOrContext, setRoleOrContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const loadData = async () => {
    if (!open || !userId || !taskId) return;
    setLoading(true);
    try {
      const [allContacts, existingTaskContacts] = await Promise.all([
        getContacts(userId),
        getTaskContacts(taskId, userId),
      ]);
      setContacts(allContacts);
      setAlreadyLinkedIds(new Set(existingTaskContacts.map((tc) => tc.contact_id)));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setRoleOrContext("");
      setSearch("");
      loadData();
    }
  }, [open, taskId, userId]);

  const filteredContacts = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.display_name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.job_title?.toLowerCase().includes(q) ||
      c.phones?.some((p) => p.value.includes(q)) ||
      c.emails?.some((e) => e.value.toLowerCase().includes(q))
    );
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleLinkSelected = async () => {
    if (selectedIds.size === 0) return;
    setBusy(true);
    try {
      for (const contactId of selectedIds) {
        await linkTaskContact(taskId, contactId, userId, roleOrContext.trim() || undefined);
      }
      toast.success(T("شخص به تسک متصل شد", "Contact linked to task"));
      onLinked?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : T("خطا در اتصال", "Link error"));
    } finally {
      setBusy(false);
    }
  };

  const bodyContent = (
    <div className="space-y-3 py-2 flex flex-col min-h-0 flex-1">
      {/* Search & New Contact Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute start-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={T("جستجوی نام، شماره، ایمیل...", "Search name, phone, email...")}
            className="h-8 ps-8 text-xs"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs px-2.5 gap-1 shrink-0"
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{T("شخص جدید", "New")}</span>
        </Button>
      </div>

      {/* Role / Context input */}
      <div>
        <label className="text-[11px] font-medium text-muted-foreground block mb-1">
          {T("نقش / یادداشت کوتاه برای این تسک (اختیاری)", "Role / context for this task (optional)")}
        </label>
        <Input
          value={roleOrContext}
          onChange={(e) => setRoleOrContext(e.target.value)}
          placeholder={T("مثلاً: مسئول پیگیری، تأییدکننده، مخاطب جلسه", "e.g. Follow-up lead, Approver")}
          className="h-8 text-xs"
        />
      </div>

      {/* Contacts List */}
      <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto pe-1 space-y-1.5 border border-border/40 rounded-xl p-1.5 bg-muted/20">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-3 text-muted-foreground">
            <Users className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-xs">{T("مخاطبی یافت نشد", "No contacts found")}</p>
            <Button
              size="sm"
              variant="link"
              className="text-xs mt-1"
              onClick={() => setCreateOpen(true)}
            >
              {T("افزودن شخص جدید", "Create new contact")}
            </Button>
          </div>
        ) : (
          filteredContacts.map((c) => {
            const isAlreadyLinked = alreadyLinkedIds.has(c.id);
            const isSelected = selectedIds.has(c.id);

            return (
              <div
                key={c.id}
                onClick={() => {
                  if (!isAlreadyLinked) toggleSelect(c.id);
                }}
                className={`flex items-center justify-between gap-2.5 p-2 rounded-lg transition select-none ${
                  isAlreadyLinked
                    ? "opacity-50 cursor-default bg-muted/30"
                    : isSelected
                    ? "bg-primary/10 border border-primary/30 cursor-pointer"
                    : "hover:bg-muted/50 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Checkbox
                    checked={isAlreadyLinked || isSelected}
                    disabled={isAlreadyLinked}
                    onCheckedChange={() => {
                      if (!isAlreadyLinked) toggleSelect(c.id);
                    }}
                  />
                  <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                    <AvatarImage src={c.photo_url} className="object-cover" />
                    <AvatarFallback className="text-[11px] font-bold">
                      {c.display_name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-foreground truncate block">
                      {c.display_name}
                    </span>
                    {(c.job_title || c.company) && (
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {[c.job_title, c.company].filter(Boolean).join(" • ")}
                      </span>
                    )}
                  </div>
                </div>

                {isAlreadyLinked && (
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60 shrink-0">
                    {T("متصل است", "Linked")}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground">
          {selectedIds.size > 0
            ? T(`${selectedIds.size} شخص انتخاب شده`, `${selectedIds.size} selected`)
            : T("شخصی انتخاب نشده", "None selected")}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {T("انصراف", "Cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleLinkSelected}
            disabled={selectedIds.size === 0 || busy}
            className="gap-1.5"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {T("اتصال به تسک", "Link to Task")}
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
              <DialogTitle className="text-start text-base font-bold">
                {T("انتخاب و اتصال افراد به تسک", "Link People to Task")}
              </DialogTitle>
              <DialogDescription className="sr-only">Contact picker modal</DialogDescription>
            </DialogHeader>

            {bodyContent}
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
              <SheetTitle className="text-start text-base font-bold">
                {T("انتخاب و اتصال افراد به تسک", "Link People to Task")}
              </SheetTitle>
            </SheetHeader>

            {bodyContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Nested Create Contact Dialog */}
      <ContactEditorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={userId}
        onSaved={async (newContact) => {
          // Auto link newly created contact directly to task
          try {
            await linkTaskContact(taskId, newContact.id, userId, roleOrContext.trim() || undefined);
            toast.success(T("شخص جدید ساخته و به تسک متصل شد", "Contact created and linked to task"));
            onLinked?.();
            onOpenChange(false);
          } catch {
            await loadData();
          }
        }}
      />
    </>
  );
}
