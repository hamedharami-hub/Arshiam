import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  Building2,
  ListTodo,
  Smartphone,
  Loader2,
  User,
} from "lucide-react";
import type { Contact } from "@/lib/contactTypes";
import { getContacts, getAllTaskContacts } from "@/lib/contactService";
import { isDeviceContactImportSupported } from "@/lib/deviceContacts";
import { ContactEditorDialog } from "@/components/contacts/ContactEditorDialog";
import { ContactDetailDialog } from "@/components/contacts/ContactDetailDialog";
import { DeviceContactImportModal } from "@/components/contacts/DeviceContactImportModal";

export default function ContactsView() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const isAndroid = isDeviceContactImportSupported();

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [list, relations] = await Promise.all([
        getContacts(user.id),
        getAllTaskContacts(user.id),
      ]);

      setContacts(list);

      const counts: Record<string, number> = {};
      for (const r of relations) {
        counts[r.contact_id] = (counts[r.contact_id] || 0) + 1;
      }
      setTaskCounts(counts);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const filteredContacts = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.display_name?.toLowerCase().includes(q) ||
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.job_title?.toLowerCase().includes(q) ||
      c.phones?.some((p) => p.value.includes(q)) ||
      c.emails?.some((e) => e.value.toLowerCase().includes(q))
    );
  });

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {T("افراد و مخاطبین", "People & Contacts")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {T("مدیریت و اتصال مخاطبین به تسک‌ها", "Manage and link contacts to tasks")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAndroid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="gap-1.5 rounded-xl h-9 text-xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span>{T("ورود از گوشی", "Import from Phone")}</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 rounded-xl h-9 text-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>{T("شخص جدید", "New Contact")}</span>
          </Button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={T("جستجوی نام، شماره، ایمیل، شرکت...", "Search name, phone, email, company...")}
            className="h-10 ps-9 rounded-xl text-xs bg-card/60"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {T(`${filteredContacts.length} نفر`, `${filteredContacts.length} people`)}
        </span>
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/30">
          <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-bold text-foreground">
            {search.trim() ? T("مخاطبی یافت نشد", "No contacts match search") : T("هنوز شخصی ثبت نشده است", "No contacts yet")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {search.trim()
              ? T("عبارت جستجو را تغییر دهید یا شخص جدیدی بسازید.", "Try a different search or create a new contact.")
              : T("افراد را به سیستم اضافه کنید تا بتوانید آن‌ها را به تسک‌ها متصل نمایید.", "Add people to link them to your tasks and stay organized.")}
          </p>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="mt-4 gap-1.5 rounded-xl text-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{T("ایجاد اولین شخص", "Create First Contact")}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredContacts.map((c) => {
            const count = taskCounts[c.id] || 0;
            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedContact(c);
                  setDetailOpen(true);
                }}
                className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 border border-border/50 shrink-0">
                    <AvatarImage src={c.photo_url} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {c.display_name.slice(0, 2) || <User className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition">
                      {c.display_name}
                    </h3>
                    {(c.job_title || c.company) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span>{[c.job_title, c.company].filter(Boolean).join(" • ")}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Badges / Contact Info */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    {c.phones?.[0]?.value && (
                      <span className="flex items-center gap-1 font-mono" dir="ltr">
                        <Phone className="w-3 h-3 text-primary" />
                        {c.phones[0].value}
                      </span>
                    )}
                    {c.emails?.[0]?.value && !c.phones?.[0]?.value && (
                      <span className="flex items-center gap-1 font-mono truncate" dir="ltr">
                        <Mail className="w-3 h-3 text-blue-500" />
                        {c.emails[0].value}
                      </span>
                    )}
                  </div>

                  {count > 0 ? (
                    <Badge variant="secondary" className="gap-1 text-[10px] shrink-0 font-medium">
                      <ListTodo className="w-3 h-3 text-primary" />
                      <span>{T(`${count} تسک`, `${count} tasks`)}</span>
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">
                      {T("بدون تسک", "No tasks")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {user?.id && (
        <>
          <ContactEditorDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            userId={user.id}
            onSaved={loadData}
          />

          <ContactDetailDialog
            open={detailOpen}
            onOpenChange={setDetailOpen}
            userId={user.id}
            contact={selectedContact}
            onDeleted={loadData}
            onUpdated={(updated) => {
              setSelectedContact(updated);
              loadData();
            }}
          />

          <DeviceContactImportModal
            open={importOpen}
            onOpenChange={setImportOpen}
            userId={user.id}
            onImported={loadData}
          />
        </>
      )}
    </div>
  );
}
