import { AlertCircle, ArrowRight, Check, ChevronLeft, CloudOff, Folder as FolderIcon, Inbox, Loader2, Save, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TaskSaveState = "idle" | "saved" | "dirty" | "saving" | "queued" | "error" | string;

interface SaveStatusButtonProps {
  state: TaskSaveState;
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onSave: () => void;
}

// Autosave status (saved / autosaving / offline / failed); tapping forces an immediate save.
export function SaveStatusButton({ state, busy, disabled, label, onSave }: SaveStatusButtonProps) {
  const saving = busy || state === "saving";
  const icon = saving
    ? <Loader2 className="h-4 w-4 animate-spin" />
    : state === "dirty"
      ? <Save className="h-4 w-4 text-primary" />
      : state === "error"
        ? <AlertCircle className="h-4 w-4 text-destructive" />
        : state === "queued"
          ? <CloudOff className="h-4 w-4" />
          : <Check className="h-4 w-4" />;
  const settled = !saving && (state === "saved" || state === "idle");
  return (
    <Button
      variant="ghost"
      disabled={disabled || saving}
      onClick={onSave}
      title={label}
      aria-label={label}
      data-testid="task-detail-save-status"
      data-state={saving ? "saving" : state}
      className={`h-8 gap-1 px-1.5 text-[11px] font-normal ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}
    >
      {icon}
      <span aria-live="polite" className={settled ? "hidden sm:inline" : "inline"} data-testid="task-detail-save-label">{label}</span>
    </Button>
  );
}

interface TaskDetailTopBarProps {
  T: (fa: string, en: string) => string;
  isEn: boolean;
  canEdit: boolean;
  folderLabel: string;
  folderColor?: string;
  hasFolder: boolean;
  goalLabel?: string | null;
  onFolder: () => void;
  onGoal: () => void;
  folderActive?: boolean;
  goalActive?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  save: React.ReactNode;
  /** Kept optional for older callers; task actions now live in the bottom rail. */
  more?: React.ReactNode;
  extra?: React.ReactNode;
}

// One row: [back] folder › goal … save ✕
export function TaskDetailTopBar({
  T, isEn, canEdit, folderLabel, folderColor, hasFolder, goalLabel, onFolder, onGoal, folderActive, goalActive, onBack, onClose, save, extra,
}: TaskDetailTopBarProps) {
  const crumb = (active?: boolean) => `inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-[13px] transition-colors disabled:hover:bg-transparent ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`;
  return (
    <div className="flex min-h-10 items-center gap-1" data-testid="task-detail-topbar">
      {onBack && (
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onBack} title={T("برگشت", "Back")} aria-label={T("برگشت", "Back")} data-testid="task-detail-back">
          <ArrowRight className={`h-4 w-4 ${isEn ? "rotate-180" : ""}`} />
        </Button>
      )}
      <nav className="flex min-w-0 flex-1 items-center" aria-label={T("مسیر تسک", "Task location")}>
        <button type="button" disabled={!canEdit} onClick={onFolder} className={crumb(folderActive)} aria-expanded={!!folderActive} title={`${T("پوشه", "Folder")}: ${folderLabel}`} data-testid="task-breadcrumb-folder">
          {hasFolder
            ? <FolderIcon className="h-4 w-4 shrink-0" style={folderColor ? { color: folderColor } : undefined} />
            : <Inbox className="h-4 w-4 shrink-0" />}
          <span className="truncate" dir="auto">{folderLabel}</span>
        </button>
        <ChevronLeft className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/60 ${isEn ? "rotate-180" : ""}`} aria-hidden />
        <button type="button" disabled={!canEdit} onClick={onGoal} className={crumb(goalActive)} aria-expanded={!!goalActive} title={`${T("هدف", "Goal")}: ${goalLabel || T("بدون هدف", "No goal")}`} data-testid="task-breadcrumb-goal">
          <Target className={`h-4 w-4 shrink-0 ${goalLabel ? "" : "opacity-50"}`} />
          {goalLabel && <span className="truncate" dir="auto">{goalLabel}</span>}
        </button>
      </nav>
      <div className="flex shrink-0 items-center">
        {extra}
        {save}
        {onClose && (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={onClose} title={T("بستن", "Close")} aria-label={T("بستن", "Close")} data-testid="task-detail-close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
