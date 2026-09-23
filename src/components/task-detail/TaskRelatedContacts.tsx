import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, X, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { TaskContactWithDetails, Contact } from "@/lib/contactTypes";
import { getTaskContacts, unlinkTaskContact } from "@/lib/contactService";
import { ContactPickerModal } from "@/components/contacts/ContactPickerModal";
import { ContactDetailDialog } from "@/components/contacts/ContactDetailDialog";

interface Props {
  taskId: string;
  userId: string;
  canEdit: boolean;
  onCountChange?: (count: number) => void;
}

export function TaskRelatedContacts({
  taskId,
  userId,
  canEdit,
  onCountChange,
}: Props) {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [taskContacts, setTaskContacts] = useState<TaskContactWithDetails[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = async () => {
    if (!taskId || !userId) return;
    try {
      const list = await getTaskContacts(taskId, userId);
      setTaskContacts(list);
      onCountChange?.(list.length);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadData();
  }, [taskId, userId]);

  const handleUnlink = async (e: React.MouseEvent, taskContactId: string) => {
    e.stopPropagation();
    try {
      await unlinkTaskContact(taskContactId, userId);
      toast.success(T("شخص از این تسک جدا شد", "Contact unlinked from task"));
      setTaskContacts((prev) => {
        const next = prev.filter((tc) => tc.id !== taskContactId);
        onCountChange?.(next.length);
        return next;
      });
    } catch {
      toast.error(T("خطا در جدا کردن شخص", "Failed to unlink"));
    }
  };

  const handleContactClick = (contact?: Contact) => {
    if (!contact) return;
    setSelectedContact(contact);
    setDetailOpen(true);
  };

  if (taskContacts.length === 0) {
    return (
      <>
        <div className="flex items-center justify-between py-1 px-2 rounded-xl bg-muted/20 border border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{T("افراد مرتبط", "Related people")}</span>
          </div>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="h-6 text-xs px-2 gap-1 text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
            >
              <UserPlus className="w-3 h-3" />
              <span>{T("افزودن شخص", "Add person")}</span>
            </Button>
          )}
        </div>

        <ContactPickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          taskId={taskId}
          userId={userId}
          onLinked={loadData}
        />
      </>
    );
  }

  return (
    <section className="rounded-2xl border border-border/50 bg-card/45 p-3 sm:p-4 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Users className="h-4 w-4 text-primary" />
          <span>{T("افراد مرتبط", "Related people")}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {taskContacts.length}
          </span>
        </div>

        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            className="h-7 text-xs px-2.5 gap-1 rounded-full"
          >
            <UserPlus className="w-3 h-3" />
            <span>{T("افزودن", "Add")}</span>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {taskContacts.map((tc) => {
          const c = tc.contact;
          const name = c?.display_name || T("شخص نامشخص", "Unknown");

          return (
            <div
              key={tc.id}
              onClick={() => handleContactClick(c)}
              className="group flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-card border border-border/60 hover:border-primary/40 hover:bg-accent/40 cursor-pointer transition shadow-xs"
            >
              <Avatar className="h-6 w-6 border border-border/50 shrink-0">
                <AvatarImage src={c?.photo_url} className="object-cover" />
                <AvatarFallback className="text-[10px] font-bold">
                  {name.slice(0, 2) || <User className="w-3 h-3" />}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-medium text-foreground truncate max-w-[130px]">
                  {name}
                </span>
                {tc.role_or_context && (
                  <span className="text-[9px] text-muted-foreground truncate max-w-[130px]">
                    {tc.role_or_context}
                  </span>
                )}
              </div>

              {canEdit && (
                <button
                  type="button"
                  title={T("حذف از تسک", "Remove from task")}
                  onClick={(e) => handleUnlink(e, tc.id)}
                  className="ms-1 p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-70 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Picker Modal */}
      <ContactPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        taskId={taskId}
        userId={userId}
        onLinked={loadData}
      />

      {/* Detail Dialog */}
      <ContactDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        userId={userId}
        contact={selectedContact}
        onDeleted={() => {
          setSelectedContact(null);
          loadData();
        }}
        onUpdated={(updated) => {
          setSelectedContact(updated);
          loadData();
        }}
      />
    </section>
  );
}
