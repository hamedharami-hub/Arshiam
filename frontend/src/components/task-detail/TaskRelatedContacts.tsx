import { TaskSection, TaskSectionAction } from "./TaskSection";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, X, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { TaskContactWithDetails, Contact } from "@/lib/contactTypes";
import { getTaskContacts, unlinkTaskContact } from "@/lib/contactService";
import { ContactPickerModal } from "@/components/contacts/ContactPickerModal";
import { ContactDetailDialog } from "@/components/contacts/ContactDetailDialog";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";

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

  const loadData = useCallback(async () => {
    if (!taskId || !userId) return;
    try {
      const list = await getTaskContacts(taskId, userId);
      setTaskContacts(list);
      onCountChange?.(list.length);
    } catch {
      // silent
    }
  }, [taskId, userId, onCountChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        {/* Empty: nothing shown — people are added from the bottom bar's "More" menu. */}
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
    <TaskSection icon={Users} title={T("افراد مرتبط", "Related people")} count={taskContacts.length} testid="task-contacts-section"
      actions={canEdit ? <TaskSectionAction icon={UserPlus} onClick={() => setPickerOpen(true)}>{T("افزودن", "Add")}</TaskSectionAction> : null}>
      <div className="flex flex-wrap gap-2 pt-1">
        {taskContacts.map((tc) => {
          const c = tc.contact;
          const name = c?.display_name || T("شخص نامشخص", "Unknown");

          return (
            <div
              key={tc.id}
              onClick={() => handleContactClick(c)}
              className="group flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 cursor-pointer transition hover:bg-muted"
            >
              <ContactAvatar contact={c} name={name} size="xs" />

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
    </TaskSection>
  );
}
