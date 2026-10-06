import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  MapPin,
  Users,
  BookOpen,
  Circle,
  CheckCircle2,
  Copy,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import type { Task } from "@/lib/taskTypes";

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
      className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-md border border-border hover:bg-accent"
    >
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

export function RailButton({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
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
      aria-pressed={active || undefined}
      data-testid={dataTestId}
      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1 rounded-md p-0 text-xs transition-colors disabled:opacity-50 disabled:cursor-default ${
        active ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } ${className || ""}`}
    >
      <Icon className="h-[18px] w-[18px]" />
      {badge != null && badge !== 0 && <span className="tabular-nums text-[11px]">{badge}</span>}
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
  attachLink: () => Promise<unknown>;
  parentOpen: boolean;
  setParentOpen: (open: boolean) => void;
  parentCandidates: Array<{ id: string; title: string; parent_id?: string | null }>;
  isParentLinkValid: (parentId: string | null) => boolean;
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
  isActiveLeitnerReview?: boolean;
  onOpenLeitnerReview?: () => void;
  onToggleCompletion?: () => void;
  onCopyTaskLink?: () => void;
  onDuplicateTask?: () => void;
  onAddToCalendar?: () => void;
  onOpenFullPage?: () => void;
  deleteTask: () => void;
  save: (patch: Partial<Task>) => void;
  T: (fa: string, en: string) => string;
  onAddNote?: () => void;
  onAddLocation?: () => void;
  onPickContact?: () => void;
  onNewContact?: () => void;
  onImportDeviceContact?: () => void;
  onLinkKnowledge?: () => void;
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
  isParentLinkValid,
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
  isActiveLeitnerReview,
  onOpenLeitnerReview,
  onToggleCompletion,
  onCopyTaskLink,
  onDuplicateTask,
  onAddToCalendar,
  onOpenFullPage,
  deleteTask,
  save,
  T,
  onAddNote,
  onAddLocation,
  onPickContact,
  onNewContact,
  onImportDeviceContact,
  onLinkKnowledge,
}: TaskDetailBottomRailProps) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const menuItem = "w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md hover:bg-accent text-start text-[13px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent";
  const run = (fn?: () => void) => () => { setMoreOpen(false); fn?.(); };

  return (
    <div className="mx-auto w-full max-w-3xl px-2 py-0.5" data-testid="task-bottom-rail">
      <div className="flex items-center gap-0.5">
        <Popover>
          <PopoverTrigger asChild>
            <span>
              <RailButton
                dataTestId="task-bottom-rail-attach-btn"
                icon={Paperclip}
                label={T("پیوست", "Attach")}
                active={showAttachments || attachmentCount > 0}
                badge={attachmentCount || undefined}
                disabled={!canEdit}
              />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start" side="top">
            <div className="grid grid-cols-2 gap-1.5">
              <AttachTypeBtn icon={ImageIcon} label={T("تصویر", "Image")} onClick={() => pickFileType("image/*")} />
              <AttachTypeBtn icon={Music} label={T("صدا", "Audio")} onClick={() => pickFileType("audio/*")} />
              <AttachTypeBtn icon={FileText} label={T("سند", "Document")} onClick={() => pickFileType("application/pdf,.doc,.docx,.txt")} />
              <AttachTypeBtn icon={Paperclip} label={T("هر فایلی", "Any file")} onClick={() => pickFileType("*/*")} />
            </div>
            <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void attachLink()}
                placeholder="https://…"
                className="h-8 text-xs"
                dir="ltr"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => void attachLink()} disabled={!linkUrl.trim()}>
                {T("افزودن", "Add")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <RailButton
          dataTestId="task-bottom-rail-subtask-btn"
          icon={ListTree}
          label={T("زیرتسک", "Subtask")}
          active={showSubtasks}
          onClick={() => setShowSubtasks((v) => !v)}
          disabled={!(canEdit || canComment)}
        />

        <RailButton
          dataTestId="task-bottom-rail-focus-btn"
          icon={Timer}
          label={T("تمرکز", "Focus")}
          onClick={() => setFocusOpen(true)}
          disabled={!canEdit}
        />

        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <span className="ms-auto">
              <RailButton dataTestId="task-bottom-rail-add-btn" icon={MoreHorizontal} label={T("بیشتر", "More")} />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-1" align="end" side="top" data-testid="task-bottom-rail-more-menu">
            <div role="menu" aria-label={T("بیشتر", "More")}>
              {isActiveLeitnerReview ? (
                <button type="button" role="menuitem" disabled={!onOpenLeitnerReview} onClick={run(onOpenLeitnerReview)} className={menuItem}>
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("شروع مرور لایتنر", "Open Leitner review")}</span>
                </button>
              ) : onToggleCompletion && (
                <button type="button" role="menuitem" disabled={!canEdit} onClick={run(onToggleCompletion)} className={menuItem}>
                  {t.completed ? <Circle className="w-4 h-4 text-muted-foreground shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span>{t.completed ? T("بازگشایی تسک", "Reopen task") : T("تکمیل تسک", "Complete task")}</span>
                </button>
              )}
              {onCopyTaskLink && (
                <button type="button" role="menuitem" onClick={run(onCopyTaskLink)} className={menuItem}>
                  <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("کپی لینک تسک", "Copy task link")}</span>
                </button>
              )}
              {onDuplicateTask && (
                <button type="button" role="menuitem" disabled={!canEdit} onClick={run(onDuplicateTask)} className={menuItem}>
                  <Copy className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("تکثیر تسک", "Duplicate task")}</span>
                </button>
              )}
              {onAddToCalendar && (
                <button type="button" role="menuitem" onClick={run(onAddToCalendar)} className={menuItem}>
                  <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("افزودن به تقویم Android", "Add to Android Calendar")}</span>
                </button>
              )}
              {onOpenFullPage && (
                <button type="button" role="menuitem" onClick={run(onOpenFullPage)} className={menuItem}>
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("باز کردن در صفحهٔ کامل", "Open full page")}</span>
                </button>
              )}
              {(isActiveLeitnerReview || onToggleCompletion || onCopyTaskLink || onDuplicateTask || onAddToCalendar || onOpenFullPage) && <div className="my-1 border-t border-border" />}
              <button type="button" role="menuitem" disabled={!canEdit} onClick={run(() => setAiOpen(true))} className={menuItem}>
                <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("دستیار هوش مصنوعی", "AI assistant")}</span>
              </button>
              <button type="button" role="menuitem" disabled={!canEdit} onClick={run(() => setParentOpen(true))} className={menuItem}>
                <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("تسک والد", "Parent task")}</span>
              </button>
              <div className="my-1 border-t border-border" />
              <button type="button" role="menuitem" disabled={!canEdit} onClick={run(onAddNote)} className={menuItem}>
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("افزودن نوت", "Add Note")}</span>
              </button>
              {onLinkKnowledge && (
                <button type="button" role="menuitem" disabled={!canEdit} onClick={run(onLinkKnowledge)} className={menuItem}>
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("اتصال سند آموزشی", "Link Knowledge Doc")}</span>
                </button>
              )}
              <button type="button" role="menuitem" disabled={!canEdit} onClick={run(onAddLocation)} className={menuItem}>
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("افزودن موقعیت مکانی", "Add Location")}</span>
              </button>
              <button type="button" role="menuitem" disabled={!canEdit} onClick={run(onPickContact)} className={menuItem}>
                <Users className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("شخص / مخاطب", "Contact")}</span>
              </button>
              <button type="button" role="menuitem" onClick={run(() => setShowSteps((v) => !v))} className={menuItem}>
                <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" /><span className="flex-1">{T("چک‌لیست و مراحل", "Checklist & steps")}</span>
                {showSteps && <Check className="w-4 h-4" />}
              </button>
              <button type="button" role="menuitem" disabled={!canEdit} onClick={run(() => setShowOutcomes((v) => !v))} className={menuItem}>
                <ListChecks className="w-4 h-4 text-muted-foreground shrink-0" /><span className="flex-1">{T("شاخه‌ها", "Branches")}</span>
                {outcomeCount > 0 && <span className="text-[11px] text-muted-foreground tabular-nums">{outcomeCount}</span>}
                {showOutcomes && <Check className="w-4 h-4" />}
              </button>
              <button type="button" role="menuitem" onClick={run(() => setActionMenuOpen(true))} className={menuItem}>
                <MoreHorizontal className="w-4 h-4 text-muted-foreground shrink-0" /><span>{T("تاریخچه و گزینه‌های دیگر…", "History & more options…")}</span>
              </button>
              {allowDelete && canEdit && (
                <>
                  <div className="my-1 border-t border-border" />
                  <button type="button" role="menuitem" onClick={run(deleteTask)} className={`${menuItem} text-destructive hover:bg-destructive/10`} data-testid="task-bottom-rail-delete">
                    <Trash2 className="w-4 h-4 shrink-0" /><span>{T("حذف تسک…", "Delete task…")}</span>
                  </button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Dialog open={parentOpen} onOpenChange={setParentOpen}>
        <DialogContent className="max-w-sm p-3 max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{T("تسک والد", "Parent task")}</DialogTitle>
          </DialogHeader>
          <button
            disabled={!isOwner || t.parent_id === null || !isParentLinkValid(null)}
            onClick={() => { save({ parent_id: null }); setParentOpen(false); }}
            className={`w-full text-start px-2.5 h-9 rounded-md text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${t.parent_id === null ? "bg-accent" : ""}`}
          >
            {T("بدون والد (سطح بالا)", "No parent (top-level)")}
          </button>
          {parentCandidates.map((c) => (
            <button
              key={c.id}
              disabled={!canEdit || c.id === t.parent_id || !isParentLinkValid(c.id)}
              onClick={() => { save({ parent_id: c.id }); setParentOpen(false); }}
              className={`w-full text-start px-2.5 h-9 rounded-md text-sm hover:bg-accent truncate disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${t.parent_id === c.id ? "bg-accent" : ""}`}
              dir="auto"
            >
              {c.title || T("بدون عنوان", "Untitled")}
            </button>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
