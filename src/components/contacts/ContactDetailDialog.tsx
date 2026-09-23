import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
  CheckCircle2,
  Circle,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  ListTodo,
  Unlink,
} from "lucide-react";
import type { Contact, TaskContact } from "@/lib/contactTypes";
import type { Task } from "@/lib/taskTypes";
import { getContactTasks, deleteContact, unlinkTaskContact } from "@/lib/contactService";
import { ContactEditorDialog } from "./ContactEditorDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  contact: Contact | null;
  onDeleted?: (contactId: string) => void;
  onUpdated?: (contact: Contact) => void;
}

export function ContactDetailDialog({
  open,
  onOpenChange,
  userId,
  contact,
  onDeleted,
  onUpdated,
}: Props) {
  const { prefersDialog } = useDeviceFormFactor();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [connectedTasks, setConnectedTasks] = useState<{ taskContact: TaskContact; task?: Task }[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadTasks = async () => {
    if (!contact || !userId) return;
    try {
      const list = await getContactTasks(contact.id, userId);
      setConnectedTasks(list);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (open && contact) {
      loadTasks();
    }
  }, [open, contact]);

  if (!contact) return null;

  const handleDeleteContact = async () => {
    setBusy(true);
    try {
      await deleteContact(contact.id, userId);
      toast.success(T("شخص حذف شد (تسک‌ها دست‌نخورده باقی ماندند)", "Contact deleted (tasks remain intact)"));
      onDeleted?.(contact.id);
      setConfirmDeleteOpen(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : T("خطا در حذف", "Delete error"));
    } finally {
      setBusy(false);
    }
  };

  const handleUnlinkTask = async (taskContactId: string) => {
    try {
      await unlinkTaskContact(taskContactId, userId);
      toast.success(T("ارتباط شخص با تسک حذف شد", "Relation removed from task"));
      setConnectedTasks((prev) => prev.filter((item) => item.taskContact.id !== taskContactId));
    } catch (err) {
      toast.error(T("خطا در حذف ارتباط", "Failed to unlink"));
    }
  };

  const bodyContent = (
    <div className="space-y-4 py-2">
      {/* Profile Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-sm shrink-0">
          <AvatarImage src={contact.photo_url} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
            {contact.display_name.slice(0, 2) || <User className="w-6 h-6" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold truncate text-foreground">{contact.display_name}</h3>
          {(contact.job_title || contact.company) && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              {contact.job_title && <span>{contact.job_title}</span>}
              {contact.job_title && contact.company && <span>•</span>}
              {contact.company && <span>{contact.company}</span>}
            </p>
          )}

          <div className="flex items-center gap-1.5 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2.5 gap-1 rounded-lg"
              onClick={() => setEditorOpen(true)}
            >
              <Pencil className="w-3 h-3" /> {T("ویرایش", "Edit")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 rounded-lg text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons (Call / Email) */}
      {(contact.phones?.length > 0 || contact.emails?.length > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {contact.phones?.[0]?.value && (
            <a
              href={`tel:${contact.phones[0].value}`}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-xs font-semibold transition active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{T("تماس", "Call")}</span>
            </a>
          )}
          {contact.emails?.[0]?.value && (
            <a
              href={`mailto:${contact.emails[0].value}`}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-semibold transition active:scale-95"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{T("ایمیل", "Email")}</span>
            </a>
          )}
        </div>
      )}

      {/* Contact info list */}
      <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-xs">
        {/* Phones */}
        {contact.phones?.map((p, i) => (
          <div key={`p-${i}`} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
            <span className="text-muted-foreground">{p.label || T("تلفن", "Phone")}:</span>
            <a href={`tel:${p.value}`} className="font-mono text-primary hover:underline" dir="ltr">
              {p.value}
            </a>
          </div>
        ))}

        {/* Emails */}
        {contact.emails?.map((e, i) => (
          <div key={`e-${i}`} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
            <span className="text-muted-foreground">{e.label || T("ایمیل", "Email")}:</span>
            <a href={`mailto:${e.value}`} className="font-mono text-blue-500 hover:underline" dir="ltr">
              {e.value}
            </a>
          </div>
        ))}

        {/* Websites */}
        {contact.websites?.map((w, i) => (
          <div key={`w-${i}`} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
            <span className="text-muted-foreground">{w.label || T("وب‌سایت", "Website")}:</span>
            <a
              href={w.url.startsWith("http") ? w.url : `https://${w.url}`}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-primary flex items-center gap-1 hover:underline max-w-[200px] truncate"
              dir="ltr"
            >
              <span>{w.url.replace(/^https?:\/\//, "")}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        ))}

        {/* Notes */}
        {contact.notes && (
          <div className="pt-1.5 border-t border-border/40">
            <span className="text-muted-foreground block mb-0.5">{T("توضیحات", "Notes")}:</span>
            <p className="whitespace-pre-wrap leading-relaxed text-foreground">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Connected Tasks */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <ListTodo className="w-3.5 h-3.5 text-primary" />
            {T("تسک‌های متصل", "Connected Tasks")} ({connectedTasks.length})
          </label>
        </div>

        {connectedTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center rounded-lg bg-muted/20">
            {T("این شخص هنوز به تسکی متصل نشده است", "Not linked to any tasks yet")}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pe-1">
            {connectedTasks.map(({ taskContact, task }) => (
              <div
                key={taskContact.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition group"
              >
                <button
                  type="button"
                  className="flex-1 min-w-0 text-start"
                  onClick={() => {
                    if (task) {
                      navigate(`/app/tasks/${task.id}`);
                      onOpenChange(false);
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    {task?.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={`text-xs font-medium truncate ${task?.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task?.title || T("تسک بدون عنوان", "Untitled task")}
                    </span>
                  </div>
                  {taskContact.role_or_context && (
                    <span className="text-[10px] text-muted-foreground block mt-0.5 ms-5 truncate">
                      {taskContact.role_or_context}
                    </span>
                  )}
                </button>

                <Button
                  size="icon"
                  variant="ghost"
                  title={T("حذف ارتباط با این تسک", "Unlink from task")}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleUnlinkTask(taskContact.id)}
                >
                  <Unlink className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {prefersDialog ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            dir={isEn ? "ltr" : "rtl"}
            className="w-full max-w-md sm:max-w-lg max-h-[75vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{contact.display_name}</DialogTitle>
              <DialogDescription>Contact details</DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto min-h-0 flex-1 pe-1">{bodyContent}</div>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            dir={isEn ? "ltr" : "rtl"}
            className="rounded-t-2xl max-h-[85vh] flex flex-col p-4 pb-6 overflow-hidden"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{contact.display_name}</SheetTitle>
            </SheetHeader>

            <div className="overflow-y-auto min-h-0 flex-1 pe-1">{bodyContent}</div>
          </SheetContent>
        </Sheet>
      )}

      {/* Editor Modal */}
      <ContactEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        userId={userId}
        contact={contact}
        onSaved={(updated) => {
          onUpdated?.(updated);
          loadTasks();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"} className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start font-bold">
              {T("حذف شخص از مخاطبین؟", "Delete contact?")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start text-xs leading-relaxed">
              {T(
                `آیا از حذف «${contact.display_name}» اطمینان دارید؟ با حذف شخص، فقط ارتباط‌های متصل به تسک‌ها پاک می‌شوند و خود تسک‌ها، نوت‌ها و پیوست‌ها بدون تغییر حفظ خواهند شد.`,
                `Are you sure you want to delete "${contact.display_name}"? Only task connections will be removed. All tasks, notes, and files will remain intact.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{T("انصراف", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {T("حذف شخص", "Delete Contact")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
