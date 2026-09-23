import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Paperclip,
  Image as ImageIcon,
  Music,
  FileText,
  Link as LinkIcon,
  ListTree,
  ListChecks,
  CheckSquare,
  GitBranch,
  Check,
  Sparkles,
  Timer,
  MoreHorizontal,
  Trash2,
  Plus,
  MessageSquare,
  MapPin,
  Users,
  UserPlus,
  Smartphone,
} from "lucide-react";
import type { Task } from "@/lib/taskTypes";
import { isDeviceContactImportSupported } from "@/lib/deviceContacts";

export function AttachTypeBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg bg-muted/40 hover:bg-accent active:scale-95 transition"
    >
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export function RailButton({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
  accent,
  className,
  disabled,
  dataTestId,
}: {
  icon: any;
  label: string;
  active?: boolean;
  badge?: number | string;
  onClick?: () => void;
  accent?: boolean;
  className?: string;
  disabled?: boolean;
  dataTestId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      data-testid={dataTestId}
      className={`relative flex flex-col items-center justify-center gap-0 min-w-[48px] sm:min-w-[54px] h-11 rounded-xl transition active:scale-95 disabled:opacity-50 disabled:cursor-default ${
        active
          ? accent
            ? "bg-primary/15 text-primary font-semibold"
            : "bg-secondary text-secondary-foreground font-semibold"
          : "text-muted-foreground hover:bg-muted/60"
      } ${className || ""}`}
    >
      <Icon className="w-4 h-4" />
      {badge != null && badge !== 0 && (
        <span className="absolute top-0.5 end-0.5 min-w-[13px] h-[13px] px-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-medium flex items-center justify-center">
          {badge}
        </span>
      )}
      <span className="text-[9px] mt-0.5 leading-none line-clamp-1 px-1 text-center">{label}</span>
    </button>
  );
}

export interface TaskDetailBottomRailProps {
  t: Task;
  canEdit: boolean;
  canComment: boolean;
  isOwner: boolean;
  allowDelete?: boolean;
  showAttachments: boolean;
  attachmentCount: number;
  pickFileType: (accept: string) => void;
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  attachLink: () => Promise<void>;
  parentOpen: boolean;
  setParentOpen: (open: boolean) => void;
  parentCandidates: Task[];
  showSubtasks: boolean;
  setShowSubtasks: React.Dispatch<React.SetStateAction<boolean>>;
  showSteps: boolean;
  setShowSteps: React.Dispatch<React.SetStateAction<boolean>>;
  showOutcomes: boolean;
  setShowOutcomes: React.Dispatch<React.SetStateAction<boolean>>;
  outcomeCount: number;
  setAiOpen: (open: boolean) => void;
  setFocusOpen: (open: boolean) => void;
  setActionMenuOpen: (open: boolean) => void;
  deleteTask: () => void;
  save: (patch: Partial<Task>) => void;
  T: (fa: string, en: string) => string;
  onAddComment?: () => void;
  onAddNote?: () => void;
  onAddLocation?: () => void;
  onPickContact?: () => void;
  onNewContact?: () => void;
  onImportDeviceContact?: () => void;
}

export function TaskDetailBottomRail({
  t,
  canEdit,
  canComment,
  isOwner,
  allowDelete,
  showAttachments,
  attachmentCount,
  pickFileType,
  linkUrl,
  setLinkUrl,
  attachLink,
  parentOpen,
  setParentOpen,
  parentCandidates,
  showSubtasks,
  setShowSubtasks,
  showSteps,
  setShowSteps,
  showOutcomes,
  setShowOutcomes,
  outcomeCount,
  setAiOpen,
  setFocusOpen,
  setActionMenuOpen,
  deleteTask,
  save,
  T,
  onAddComment,
  onAddNote,
  onAddLocation,
  onPickContact,
  onNewContact,
  onImportDeviceContact,
}: TaskDetailBottomRailProps) {
  const [addPopoverOpen, setAddPopoverOpen] = React.useState(false);

  return (
    <div className="mx-auto max-w-2xl w-full px-2 py-1 border border-border/60 bg-card/95 dark:bg-card/90 backdrop-blur-xl rounded-2xl shadow-lg">
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-0.5">
          {/* 1. Attachments */}
          <Popover>
            <PopoverTrigger asChild>
              <span>
                <RailButton
                  dataTestId="task-bottom-rail-attach-btn"
                  icon={Paperclip}
                  label={T("ضمیمه", "Attach")}
                  active={showAttachments || attachmentCount > 0}
                  badge={attachmentCount || undefined}
                  disabled={!canEdit}
                />
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start" side="top">
              <div className="grid grid-cols-2 gap-1.5">
                <AttachTypeBtn
                  icon={ImageIcon}
                  label={T("تصویر", "Image")}
                  onClick={() => pickFileType("image/*")}
                />
                <AttachTypeBtn
                  icon={Music}
                  label={T("صدا", "Audio")}
                  onClick={() => pickFileType("audio/*")}
                />
                <AttachTypeBtn
                  icon={FileText}
                  label={T("سند", "Document")}
                  onClick={() => pickFileType("application/pdf,.doc,.docx,.txt")}
                />
                <AttachTypeBtn
                  icon={Paperclip}
                  label={T("هر فایلی", "Any file")}
                  onClick={() => pickFileType("*/*")}
                />
              </div>
              <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void attachLink()}
                  placeholder={T("https://…", "https://…")}
                  className="h-8 text-xs"
                  dir="ltr"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => void attachLink()}
                  disabled={!linkUrl.trim()}
                >
                  {T("افزودن", "Add")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Add Menu (Comment, Note, Location, Contact, New Contact, Device Contacts) */}
          <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
            <PopoverTrigger asChild>
              <span>
                <RailButton
                  dataTestId="task-bottom-rail-add-btn"
                  icon={Plus}
                  label={T("افزودن", "Add")}
                  disabled={!canEdit}
                />
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1.5" align="start" side="top">
              <div className="space-y-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAddPopoverOpen(false);
                    onAddComment?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-accent text-start transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{T("افزودن کامنت / توضیح", "Add Comment")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddPopoverOpen(false);
                    onAddNote?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-accent text-start transition"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{T("افزودن نوت", "Add Note")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddPopoverOpen(false);
                    onAddLocation?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-accent text-start transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{T("افزودن موقعیت مکانی", "Add Location")}</span>
                </button>

                <div className="my-1 border-t border-border/40" />

                <button
                  type="button"
                  onClick={() => {
                    setAddPopoverOpen(false);
                    onPickContact?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-accent text-start transition"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{T("انتخاب شخص موجود", "Select Contact")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddPopoverOpen(false);
                    onNewContact?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-accent text-start transition"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{T("ساخت شخص جدید", "Create New Contact")}</span>
                </button>

                <button
                  type="button"
                  disabled={!isDeviceContactImportSupported()}
                  onClick={() => {
                    setAddPopoverOpen(false);
                    onImportDeviceContact?.();
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-start transition ${
                    isDeviceContactImportSupported()
                      ? "hover:bg-accent text-foreground"
                      : "opacity-50 cursor-not-allowed text-muted-foreground"
                  }`}
                  title={
                    !isDeviceContactImportSupported()
                      ? T("فقط در Android", "Only available on Android")
                      : undefined
                  }
                >
                  <Smartphone className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{T("ورود از مخاطبین گوشی", "Import from Phone")}</span>
                    {!isDeviceContactImportSupported() && (
                      <span className="text-[10px] text-muted-foreground block">
                        {T("(فقط در Android)", "(Only on Android)")}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* 2. Link parent task */}
          <Popover open={parentOpen} onOpenChange={setParentOpen}>
            <PopoverTrigger asChild>
              <span>
                <RailButton
                  icon={ListTree}
                  label={T("تسک والد", "Parent")}
                  active={!!t.parent_id}
                  disabled={!canEdit}
                />
              </span>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-2 max-h-[55vh] overflow-y-auto"
              align="start"
              side="top"
            >
              <button
                disabled={!isOwner || t.parent_id === null}
                onClick={() => {
                  save({ parent_id: null });
                  setParentOpen(false);
                }}
                className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
                  t.parent_id === null ? "bg-accent" : ""
                }`}
              >
                {T("بدون والد (سطح بالا)", "No parent (top-level)")}
              </button>
              {parentCandidates.map((c) => (
                <button
                  key={c.id}
                  disabled={!canEdit || c.id === t.parent_id}
                  onClick={() => {
                    save({ parent_id: c.id });
                    setParentOpen(false);
                  }}
                  className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent truncate disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
                    t.parent_id === c.id ? "bg-accent" : ""
                  }`}
                >
                  {c.title || T("بدون عنوان", "Untitled")}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* 3. Items: Subtasks, Steps or Branches */}
          <Popover>
            <PopoverTrigger asChild>
              <span>
                <RailButton
                  icon={ListChecks}
                  label={T("آیتم‌ها", "Items")}
                  active={showSubtasks || showSteps || showOutcomes}
                  badge={outcomeCount || undefined}
                  disabled={!(canEdit || canComment)}
                />
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1.5" align="start" side="top">
              <button
                onClick={() => setShowSubtasks((s) => !s)}
                className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm hover:bg-accent ${
                  showSubtasks ? "bg-accent" : ""
                }`}
              >
                <ListTree className="w-4 h-4 text-primary" />
                <span className="flex-1 text-start">{T("زیرتسک", "Subtask")}</span>
                {showSubtasks && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowSteps((s) => !s)}
                className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm hover:bg-accent ${
                  showSteps ? "bg-accent" : ""
                }`}
              >
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <span className="flex-1 text-start">{T("مرحله / چک‌لیست", "Step / checklist")}</span>
                {showSteps && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowOutcomes((s) => !s)}
                disabled={!canEdit}
                className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
                  showOutcomes ? "bg-accent" : ""
                }`}
              >
                <GitBranch className="w-4 h-4 text-amber-500" />
                <span className="flex-1 text-start">{T("شاخه‌ها", "Branches")}</span>
                {outcomeCount > 0 && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {outcomeCount}
                  </span>
                )}
                {showOutcomes && <Check className="w-3.5 h-3.5" />}
              </button>
            </PopoverContent>
          </Popover>

          {/* 4. AI */}
          <RailButton
            icon={Sparkles}
            label="AI"
            accent
            onClick={() => setAiOpen(true)}
            disabled={!canEdit}
          />

          {/* 5. Pomodoro */}
          <RailButton
            icon={Timer}
            label={T("پومودورو", "Focus")}
            onClick={() => setFocusOpen(true)}
            disabled={!canEdit}
          />

          {/* 6. More Actions */}
          <RailButton
            icon={MoreHorizontal}
            label={T("بیشتر", "More")}
            onClick={() => setActionMenuOpen(true)}
          />
        </div>

        {/* 6. Delete Action */}
        {allowDelete && canEdit && (
          <div className="flex items-center ps-1 border-s border-border/50 shrink-0">
            <RailButton
              icon={Trash2}
              label={T("حذف", "Delete")}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={deleteTask}
            />
          </div>
        )}
      </div>
    </div>
  );
}
