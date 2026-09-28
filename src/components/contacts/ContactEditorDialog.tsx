import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  User,
  Building2,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Globe,
  Share2,
  Plus,
  Trash2,
  Upload,
  AlertTriangle,
  Loader2,
  Save,
  X,
} from "lucide-react";
import type {
  Contact,
  ContactPhone,
  ContactEmail,
  ContactAddress,
  ContactWebsite,
  ContactSocialLink,
  ContactDuplicateSuggestion,
} from "@/lib/contactTypes";
import {
  createContact,
  updateContact,
  uploadContactPhoto,
  findDuplicateSuggestions,
} from "@/lib/contactService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  contact?: Contact | null;
  initialValues?: Partial<Contact>;
  onSaved?: (contact: Contact) => void;
}

export function ContactEditorDialog({
  open,
  onOpenChange,
  userId,
  contact,
  initialValues,
  onSaved,
}: Props) {
  const { prefersDialog } = useDeviceFormFactor();
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [phones, setPhones] = useState<ContactPhone[]>([]);
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [addresses, setAddresses] = useState<ContactAddress[]>([]);
  const [websites, setWebsites] = useState<ContactWebsite[]>([]);
  const [socialLinks, setSocialLinks] = useState<ContactSocialLink[]>([]);
  const [notes, setNotes] = useState("");

  // Duplicate suggestions
  const [duplicateSuggestions, setDuplicateSuggestions] = useState<ContactDuplicateSuggestion[]>([]);

  useEffect(() => {
    if (!open) {
      setDuplicateSuggestions([]);
      return;
    }

    if (contact) {
      setDisplayName(contact.display_name || "");
      setFirstName(contact.first_name || "");
      setLastName(contact.last_name || "");
      setCompany(contact.company || "");
      setJobTitle(contact.job_title || "");
      setPhotoUrl(contact.photo_url || undefined);
      setPhones(contact.phones ? [...contact.phones] : []);
      setEmails(contact.emails ? [...contact.emails] : []);
      setAddresses(contact.addresses ? [...contact.addresses] : []);
      setWebsites(contact.websites ? [...contact.websites] : []);
      setSocialLinks(contact.social_links ? [...contact.social_links] : []);
      setNotes(contact.notes || "");
    } else {
      setDisplayName(initialValues?.display_name || "");
      setFirstName(initialValues?.first_name || "");
      setLastName(initialValues?.last_name || "");
      setCompany(initialValues?.company || "");
      setJobTitle(initialValues?.job_title || "");
      setPhotoUrl(initialValues?.photo_url || undefined);
      setPhones(initialValues?.phones ? [...initialValues.phones] : [{ label: "موبایل", value: "" }]);
      setEmails(initialValues?.emails ? [...initialValues.emails] : []);
      setAddresses(initialValues?.addresses ? [...initialValues.addresses] : []);
      setWebsites(initialValues?.websites ? [...initialValues.websites] : []);
      setSocialLinks(initialValues?.social_links ? [...initialValues.social_links] : []);
      setNotes(initialValues?.notes || "");
    }
  }, [open, contact, initialValues]);

  // Check duplicate suggestion when phone or email changes
  const checkDuplicates = async (currentPhones: ContactPhone[], currentEmails: ContactEmail[]) => {
    if (!userId) return;
    try {
      const suggestions = await findDuplicateSuggestions(
        userId,
        currentPhones.filter((p) => p.value.trim().length >= 6),
        currentEmails.filter((e) => e.value.trim().length >= 4),
        contact?.id
      );
      setDuplicateSuggestions(suggestions);
    } catch {
      // silent
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(T("فقط فایل‌های تصویری مجاز هستند", "Only image files are allowed"));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(T("حجم عکس نباید بیشتر از ۲ مگابایت باشد", "Photo size must not exceed 2MB"));
      return;
    }

    setPhotoUploading(true);
    try {
      const url = await uploadContactPhoto(userId, contact?.id || "temp", file);
      setPhotoUrl(url);
      toast.success(T("عکس بارگذاری شد", "Photo uploaded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : T("خطا در بارگذاری عکس", "Failed to upload photo"));
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    const trimmedDisplay =
      displayName.trim() ||
      [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
      company.trim();

    if (!trimmedDisplay) {
      toast.error(T("لطفاً نام شخص را وارد کنید", "Please enter a display name"));
      return;
    }

    setBusy(true);
    try {
      const validPhones = phones.map((p) => ({ label: p.label.trim() || "تلفن", value: p.value.trim() })).filter((p) => Boolean(p.value));
      const validEmails = emails.map((e) => ({ label: e.label.trim() || "ایمیل", value: e.value.trim() })).filter((e) => Boolean(e.value));
      const validAddresses = addresses.filter((a) => Boolean(a.street || a.city));
      const validWebsites = websites.filter((w) => Boolean(w.url.trim()));
      const validSocial = socialLinks.filter((s) => Boolean(s.url.trim() || s.handle?.trim()));

      const payload = {
        display_name: trimmedDisplay,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        company: company.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        photo_url: photoUrl,
        phones: validPhones,
        emails: validEmails,
        addresses: validAddresses,
        websites: validWebsites,
        social_links: validSocial,
        notes: notes.trim() || undefined,
      };

      let saved: Contact;
      if (contact) {
        saved = await updateContact(contact.id, userId, payload);
        toast.success(T("اطلاعات مخاطب به‌روزرسانی شد", "Contact updated"));
      } else {
        saved = await createContact(userId, {
          ...payload,
          source: initialValues?.source || "manual",
        });
        toast.success(T("شخص جدید ذخیره شد", "Contact created"));
      }

      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : T("خطا در ذخیره‌سازی", "Save error"));
    } finally {
      setBusy(false);
    }
  };

  const formBody = (
    <div className="space-y-4 py-2">
      {/* Photo & Main Identity */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-sm">
            <AvatarImage src={photoUrl} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {displayName.slice(0, 2) || <User className="w-6 h-6" />}
            </AvatarFallback>
          </Avatar>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoUploading}
            aria-label={T("تغییر عکس", "Change photo")}
            className="absolute -bottom-1 -end-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90 active:scale-90 transition"
          >
            {photoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {T("نام و نام خانوادگی / عنوان *", "Display Name *")}
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={T("مثلاً: علی رضایی یا دکتر مهدی", "e.g. John Doe")}
              className="h-9"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Duplicate warning banner */}
      {duplicateSuggestions.length > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{T("مخاطب مشابه یافت شد", "Similar contact found")}:</p>
            <p className="mt-0.5">
              {duplicateSuggestions.map((s) => s.contact.display_name).join("، ")}
            </p>
            <p className="opacity-80 mt-0.5">
              {T("در صورت تمایل می‌توانید اطلاعات را ذخیره کنید؛ ادغام خودکار انجام نمی‌شود.", "You can proceed; contacts will not be auto-merged.")}
            </p>
          </div>
        </div>
      )}

      {/* First & Last name */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {T("نام کوچک", "First Name")}
          </label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={T("نام", "First Name")}
            className="h-9"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {T("نام خانوادگی", "Last Name")}
          </label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={T("نام خانوادگی", "Last Name")}
            className="h-9"
          />
        </div>
      </div>

      {/* Company & Job title */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> {T("شرکت / سازمان", "Company")}
          </label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder={T("نام شرکت", "Company")}
            className="h-9"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> {T("سمت / نقش", "Job Title / Role")}
          </label>
          <Input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder={T("سمت شغلی", "Role / Title")}
            className="h-9"
          />
        </div>
      </div>

      {/* Phone numbers */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold flex items-center gap-1 text-foreground">
            <Phone className="w-3.5 h-3.5 text-primary" /> {T("شماره‌های تماس", "Phone Numbers")}
          </label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 gap-1"
            onClick={() => setPhones([...phones, { label: "موبایل", value: "" }])}
          >
            <Plus className="w-3 h-3" /> {T("افزودن شماره", "Add Phone")}
          </Button>
        </div>
        {phones.map((phone, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <Input
              value={phone.label}
              onChange={(e) => {
                const next = [...phones];
                next[idx].label = e.target.value;
                setPhones(next);
              }}
              placeholder={T("برچسب", "Label")}
              className="w-24 h-8 text-xs shrink-0"
            />
            <Input
              value={phone.value}
              onChange={(e) => {
                const next = [...phones];
                next[idx].value = e.target.value;
                setPhones(next);
              }}
              onBlur={() => checkDuplicates(phones, emails)}
              placeholder={T("۰۹۱۲...", "+1...")}
              dir="ltr"
              className="h-8 text-xs flex-1"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => {
                const next = phones.filter((_, i) => i !== idx);
                setPhones(next);
                checkDuplicates(next, emails);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Email addresses */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold flex items-center gap-1 text-foreground">
            <Mail className="w-3.5 h-3.5 text-blue-500" /> {T("ایمیل‌ها", "Emails")}
          </label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 gap-1"
            onClick={() => setEmails([...emails, { label: "کاری", value: "" }])}
          >
            <Plus className="w-3 h-3" /> {T("افزودن ایمیل", "Add Email")}
          </Button>
        </div>
        {emails.map((email, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <Input
              value={email.label}
              onChange={(e) => {
                const next = [...emails];
                next[idx].label = e.target.value;
                setEmails(next);
              }}
              placeholder={T("برچسب", "Label")}
              className="w-24 h-8 text-xs shrink-0"
            />
            <Input
              value={email.value}
              onChange={(e) => {
                const next = [...emails];
                next[idx].value = e.target.value;
                setEmails(next);
              }}
              onBlur={() => checkDuplicates(phones, emails)}
              placeholder="example@mail.com"
              dir="ltr"
              className="h-8 text-xs flex-1"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => {
                const next = emails.filter((_, i) => i !== idx);
                setEmails(next);
                checkDuplicates(phones, next);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          {T("یادداشت و توضیحات", "Notes")}
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={T("توضیحات در مورد این شخص...", "Additional notes...")}
          rows={3}
          className="text-xs"
        />
      </div>
    </div>
  );

  const titleText = contact
    ? T("ویرایش مخاطب", "Edit Contact")
    : T("مخاطب جدید", "New Contact");

  return (
    <>
      {prefersDialog ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            dir={isEn ? "ltr" : "rtl"}
            className="w-full max-w-md sm:max-w-lg max-h-[75vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl"
          >
            <DialogHeader>
              <DialogTitle className="text-start text-base font-bold">{titleText}</DialogTitle>
              <DialogDescription className="sr-only">Contact editor dialog</DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto min-h-0 flex-1 pe-1">{formBody}</div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {T("انصراف", "Cancel")}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={busy || photoUploading} className="gap-1.5">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {T("ذخیره مخاطب", "Save Contact")}
              </Button>
            </div>
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
              <SheetTitle className="text-start text-base font-bold">{titleText}</SheetTitle>
            </SheetHeader>

            <div className="overflow-y-auto min-h-0 flex-1 pe-1">{formBody}</div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {T("انصراف", "Cancel")}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={busy || photoUploading} className="gap-1.5">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {T("ذخیره مخاطب", "Save Contact")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
