import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PriorityFlag } from "@/components/PriorityFlag";
import { TIME_HORIZONS, type GoalKanban } from "@/lib/kanbanGoals";

interface GoalHeaderProps {
  showTitle?: boolean;
  goal: GoalKanban | null | undefined;
  canDelete: boolean;
  onRename: (title: string) => void;
  onEditSettings: () => void;
  onAddGoal: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}

// One row: icon + click-to-edit title, horizon chip, priority flag, trailing tools and ⋯ menu.
export function GoalHeader({ showTitle = true, goal, canDelete, onRename, onEditSettings, onAddGoal, onDelete, children }: GoalHeaderProps) {
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal?.title || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(goal?.title || ""); }, [goal?.title, editing]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== goal?.title) onRename(next);
  };

  const horizon = goal ? TIME_HORIZONS.find((th) => th.id === goal.timeHorizon) : undefined;
  const title = goal?.title || (isEn ? "Main Goal" : "هدف اصلی");

  return (
    <div className="flex min-h-10 items-center gap-2" data-testid="goal-header">
      {showTitle && <span className="text-lg leading-none" aria-hidden>{goal?.icon || "🎯"}</span>}
      {showTitle && (editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(goal?.title || ""); setEditing(false); }
          }}
          dir="auto"
          aria-label={t("ui.editTitleHint")}
          data-testid="goal-header-title-input"
          className="min-w-0 flex-1 rounded-md border border-input bg-transparent px-1.5 py-0.5 text-lg font-semibold outline-none focus-visible:border-primary"
          style={{ unicodeBidi: "plaintext" }}
        />
      ) : (
        <button
          type="button"
          onClick={() => goal && setEditing(true)}
          title={t("ui.editTitleHint")}
          data-testid="goal-header-title"
          dir="auto"
          className="min-w-0 truncate rounded-md px-1 text-start text-lg font-semibold text-foreground hover:bg-muted/60"
          style={{ unicodeBidi: "plaintext" }}
        >
          {title}
        </button>
      ))}
      {horizon && horizon.id !== "none" && (
        <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground" data-testid="goal-header-horizon">
          {isEn ? horizon.labelEn : horizon.labelFa}
        </span>
      )}
      {goal?.priority && goal.priority !== "none" && <PriorityFlag priority={goal.priority} className="shrink-0" />}
      <div className="ms-auto flex shrink-0 items-center gap-1">
        {children}
        <DropdownMenu dir={isEn ? "ltr" : "rtl"}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={t("ui.more")} title={t("ui.more")} data-testid="goal-header-more">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 text-xs">
            <DropdownMenuItem onClick={onEditSettings} disabled={!goal} className="gap-2" data-testid="goal-menu-edit">
              <Pencil className="h-4 w-4 text-muted-foreground" /> {t("ui.editGoal")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddGoal} className="gap-2" data-testid="goal-menu-add">
              <Plus className="h-4 w-4 text-muted-foreground" /> {t("ui.newGoal")}
            </DropdownMenuItem>
            {canDelete && goal && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="gap-2 text-destructive focus:text-destructive" data-testid="goal-menu-delete">
                  <Trash2 className="h-4 w-4" /> {t("ui.deleteGoal")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ui.deleteGoal")}</AlertDialogTitle>
            <AlertDialogDescription dir="auto">{title}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete} data-testid="goal-delete-confirm">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
