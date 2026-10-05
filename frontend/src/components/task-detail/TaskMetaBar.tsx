import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Folder as FolderIcon, Tag as TagIcon, Ban, Plus, Check, Pin, CalendarDays, CalendarRange, Target, Flag, X, Inbox } from "lucide-react";
import { PriorityFlag } from "@/components/PriorityFlag";
import { normalizeTaskPriority, PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import { TIME_HORIZONS, type GoalKanban } from "@/lib/kanbanGoals";
import type { Task } from "@/lib/taskTypes";
import { TaskScheduleBody } from "./TaskSchedulingSheet";
import { MetaTile } from "./MetaTile";

export type TaskMetaPanel = "folder" | "goal" | "schedule" | "plan" | "priority" | "tags";

export interface TaskMetaBarProps {
  t: Task;
  canEdit: boolean;
  isOwner: boolean;
  isEn: boolean;
  folders: Array<{ id: string; name: string; color?: string; parent_id?: string | null }>;
  folderName: (id: string | null | undefined) => string;
  goals: GoalKanban[];
  panel: TaskMetaPanel | null;
  setPanel: (panel: TaskMetaPanel | null) => void;
  isScheduled: boolean;
  scheduleLabel: string | null;
  taskTagIds: string[];
  tags: Array<{ id: string; name: string; color?: string }>;
  toggleTag: (tagId: string) => void;
  createTagAndAssign: () => Promise<unknown>;
  createFolderAndAssign: () => Promise<unknown>;
  save: (patch: Partial<Task>) => void | Promise<unknown>;
  postpone: (days: number) => void;
  T: (fa: string, en: string) => string;
  showFolderCreate: boolean;
  setShowFolderCreate: (v: boolean) => void;
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  newFolderColor: string;
  setNewFolderColor: (v: string) => void;
  showTagCreate: boolean;
  setShowTagCreate: (v: boolean) => void;
  newTagName: string;
  setNewTagName: (v: string) => void;
  newTagColor: string;
  setNewTagColor: (v: string) => void;
  TAG_COLORS: string[];
}

const optionClass = (active: boolean) =>
  `flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm transition-colors ${active ? "bg-primary/10 text-primary" : "text-foreground/90 hover:bg-muted"} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent`;

function CreateRow({ value, onChange, onSubmit, onCancel, placeholder, color, colors, onColor, swatch, testid }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; onCancel: () => void; placeholder: string;
  color: string; colors: string[]; onColor: (c: string) => void; swatch: "square" | "dot"; testid: string;
}) {
  return (
    <div className="mb-1.5 space-y-2 rounded-md bg-muted/40 p-1.5" data-testid={testid}>
      <div className="flex items-center gap-1.5">
        <span className={`shrink-0 ${swatch === "square" ? "h-5 w-5 rounded" : "ms-1 h-3 w-3 rounded-full"}`} style={{ background: color }} />
        <Input autoFocus value={value} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSubmit(); } if (e.key === "Escape") { e.stopPropagation(); onCancel(); } }}
          placeholder={placeholder} className="h-8 border-0 bg-transparent text-sm focus-visible:ring-0" data-testid={`${testid}-input`} />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onSubmit} disabled={!value.trim()} data-testid={`${testid}-submit`}>
          <Check className="h-4 w-4" />
        </Button>
      </div>
      {colors.length > 0 && (
        <div className="flex gap-1 px-1">
          {colors.map((c) => (
            <button key={c} type="button" onClick={() => onColor(c)} aria-label={c}
              className={`h-5 w-5 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Task header: one quiet line (icon + real value only) and a single inline panel under it.
 * No popovers/dialogs — the panel pushes content down, closes on choose, re-tap or Escape.
 */
export function TaskMetaBar(props: TaskMetaBarProps) {
  const {
    t, canEdit, isOwner, isEn, folders, folderName, goals, panel, setPanel, isScheduled, scheduleLabel,
    taskTagIds, tags, toggleTag, createTagAndAssign, createFolderAndAssign, save, postpone, T,
    showFolderCreate, setShowFolderCreate, newFolderName, setNewFolderName, newFolderColor, setNewFolderColor,
    showTagCreate, setShowTagCreate, newTagName, setNewTagName, newTagColor, setNewTagColor, TAG_COLORS,
  } = props;
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedTags = tags.filter((tg) => taskTagIds.includes(tg.id));
  const priorityMeta = PRIORITY_META[normalizeTaskPriority(t.priority)];
  const toggle = (p: TaskMetaPanel) => setPanel(panel === p ? null : p);

  // Escape closes the open panel first (captured before dialogs/drawers see it).
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      setPanel(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [panel, setPanel]);

  // Opened from the breadcrumb (far away) → bring it into view.
  useEffect(() => {
    if (panel) panelRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [panel]);

  const titles: Record<TaskMetaPanel, string> = {
    folder: T("پوشه", "Folder"),
    goal: T("هدف", "Goal"),
    schedule: T("زمان", "When"),
    plan: T("زمان", "When"),
    priority: T("اولویت", "Priority"),
    tags: T("برچسب", "Tags"),
  };

  const folderPanel = (
    <div className="max-h-[min(50dvh,22rem)] space-y-0.5 overflow-y-auto overscroll-contain" data-testid="task-folder-panel">
      {isOwner && !showFolderCreate && (
        <button type="button" onClick={() => setShowFolderCreate(true)} className={`${optionClass(false)} text-muted-foreground`} data-testid="task-folder-new">
          <Plus className="h-4 w-4" /> {T("پوشهٔ تازه", "New folder")}
        </button>
      )}
      {isOwner && showFolderCreate && (
        <CreateRow value={newFolderName} onChange={setNewFolderName} placeholder={T("نام پوشه…", "Folder name…")}
          onSubmit={async () => { await createFolderAndAssign(); setShowFolderCreate(false); setPanel(null); }}
          onCancel={() => setShowFolderCreate(false)} color={newFolderColor} colors={TAG_COLORS} onColor={setNewFolderColor} swatch="square" testid="task-folder-create" />
      )}
      <button type="button" disabled={!isOwner} onClick={async () => { await save({ folder_id: null }); setPanel(null); }}
        className={optionClass(t.folder_id == null)} aria-pressed={t.folder_id == null}>
        <Inbox className="h-4 w-4 shrink-0" />
        <span className="flex-1">{T("صندوق ورودی (بدون پوشه)", "Inbox (no folder)")}</span>
        {t.folder_id == null && <Check className="h-4 w-4 shrink-0" />}
      </button>
      {folders.map((folder) => (
        <button key={folder.id} type="button" disabled={!isOwner}
          onClick={async () => { await save({ folder_id: folder.id }); setPanel(null); }}
          className={optionClass(t.folder_id === folder.id)} aria-pressed={t.folder_id === folder.id}>
          <FolderIcon className="h-4 w-4 shrink-0" style={{ color: folder.color || undefined }} />
          <span className="min-w-0 flex-1 truncate text-start"><bdi>{folderName(folder.id)}</bdi></span>
          {t.folder_id === folder.id && <Check className="h-4 w-4 shrink-0" />}
        </button>
      ))}
    </div>
  );

  const goalPanel = (
    <div className="max-h-[min(50dvh,22rem)] space-y-0.5 overflow-y-auto overscroll-contain" data-testid="task-goal-panel">
      <button type="button" disabled={!canEdit} onClick={async () => { await save({ kanban_column_id: null } as Partial<Task>); setPanel(null); }}
        className={optionClass(!t.kanban_column_id)} aria-pressed={!t.kanban_column_id}>
        <Ban className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1">{T("بدون هدف", "No goal")}</span>
        {!t.kanban_column_id && <Check className="h-4 w-4 shrink-0" />}
      </button>
      {goals.length === 0 && (
        <p className="px-2.5 py-2 text-xs text-muted-foreground">{T("هنوز هدفی در کانبان نساخته‌ای.", "No Kanban goals yet.")}</p>
      )}
      {goals.map((g) => {
        const active = t.kanban_column_id === g.id;
        const horizon = TIME_HORIZONS.find((h) => h.id === g.timeHorizon);
        return (
          <button key={g.id} type="button" disabled={!canEdit} onClick={async () => { await save({ kanban_column_id: g.id } as Partial<Task>); setPanel(null); }}
            className={optionClass(active)} aria-pressed={active}>
            <span className="w-4 shrink-0 text-center text-sm leading-none">{g.icon || "🎯"}</span>
            <span className="min-w-0 flex-1 truncate text-start"><bdi>{g.title}</bdi></span>
            {horizon && <span className="shrink-0 text-xs text-muted-foreground">{isEn ? horizon.labelEn : horizon.labelFa}</span>}
            {active && <Check className="h-4 w-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  const priorityPanel = (
    <div data-testid="task-priority-panel">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {PRIORITY_ORDER.map((p) => {
          const m = PRIORITY_META[p];
          const active = t.priority === p;
          return (
            <button key={p} type="button" disabled={!canEdit} onClick={() => { save({ priority: p }); setPanel(null); }}
              className={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm transition-colors disabled:opacity-50 ${active ? "bg-muted text-foreground" : "text-foreground/80 hover:bg-muted/70"}`}
              aria-pressed={active} data-testid={`task-priority-${p}`}>
              <PriorityFlag priority={p} /> {T(m.label, m.labelEn)}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/60 px-1 pt-2">
        <span className="flex items-center gap-1.5 text-sm text-foreground/85">
          <Ban className="h-4 w-4 text-amber-600" /> {T("کار اجتنابی", "Avoided task")}
          <span className="text-xs text-muted-foreground">{T("کاری که عقبش می‌اندازی", "one you keep putting off")}</span>
        </span>
        <Switch checked={!!t.is_avoidance} disabled={!canEdit} onCheckedChange={(v) => save({ is_avoidance: !!v } as Partial<Task>)} data-testid="task-avoidance-switch" />
      </div>
    </div>
  );

  const tagsPanel = (
    <div className="max-h-[min(50dvh,22rem)] space-y-0.5 overflow-y-auto overscroll-contain" data-testid="task-tags-panel">
      {!showTagCreate ? (
        <button type="button" onClick={() => setShowTagCreate(true)} className={`${optionClass(false)} text-muted-foreground`} data-testid="task-tag-new">
          <Plus className="h-4 w-4" /> {T("برچسب تازه", "New tag")}
        </button>
      ) : (
        <CreateRow value={newTagName} onChange={setNewTagName} placeholder={T("نام برچسب…", "Tag name…")}
          onSubmit={async () => { await createTagAndAssign(); setShowTagCreate(false); }}
          onCancel={() => setShowTagCreate(false)} color={newTagColor} colors={TAG_COLORS} onColor={setNewTagColor} swatch="dot" testid="task-tag-create" />
      )}
      {tags.length === 0 && !showTagCreate && (
        <p className="px-2.5 py-1.5 text-xs text-muted-foreground">{T("هنوز برچسبی نساخته‌ای.", "No tags yet.")}</p>
      )}
      {tags.map((tg) => {
        const active = taskTagIds.includes(tg.id);
        return (
          <button key={tg.id} type="button" disabled={!canEdit} onClick={() => toggleTag(tg.id)} className={optionClass(active)} aria-pressed={active} data-testid={`task-tag-option-${tg.id}`}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: tg.color || "hsl(var(--muted-foreground))" }} />
            <span className="min-w-0 flex-1 truncate text-start"><bdi>{tg.name}</bdi></span>
            {active && <Check className="h-4 w-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  // The When panel decides when it is done (choosing a day closes it; time, repeat and
  // reminder edits keep it open until the check button is pressed).
  const schedulePanelSave = (patch: Partial<Task>) => { void save(patch); };
  const postponeAndClose = (days: number) => { postpone(days); setPanel(null); };

  const panelBody = panel === "folder" ? folderPanel
    : panel === "goal" ? goalPanel
    : panel === "priority" ? priorityPanel
    : panel === "tags" ? tagsPanel
    : panel === "plan" ? <TaskScheduleBody t={t} canEdit={canEdit} save={schedulePanelSave} postpone={postponeAndClose} T={T} isEn={isEn} onDone={() => setPanel(null)} />
    : panel === "schedule" ? <TaskScheduleBody t={t} canEdit={canEdit} save={schedulePanelSave} postpone={postponeAndClose} T={T} isEn={isEn} onDone={() => setPanel(null)} />
    : null;

  return (
    <div className="w-full px-1 pb-1" data-testid="task-meta-bar">
      <div className="-mx-0.5 flex items-center gap-0.5 overflow-x-auto no-scrollbar" role="toolbar" aria-label={T("ویژگی‌های تسک", "Task properties")}>
        <MetaTile icon={CalendarDays} label={T("زمان", "When")} value={scheduleLabel} active={isScheduled} open={panel === "schedule"}
          activeClassName="!text-primary" disabled={!canEdit} aria-expanded={panel === "schedule"} onClick={() => toggle("schedule")} data-testid="task-meta-schedule" />
        <MetaTile leading={<PriorityFlag priority={t.priority} />} label={T("اولویت", "Priority")}
          value={t.priority !== "none" ? T(priorityMeta.label, priorityMeta.labelEn) : null} active={t.priority !== "none"} open={panel === "priority"}
          className={t.priority === "none" ? "[&_svg]:opacity-60" : ""}
          disabled={!canEdit} aria-expanded={panel === "priority"} onClick={() => toggle("priority")} data-testid="task-meta-priority" />
        {t.is_avoidance && (
          <MetaTile icon={Ban} label={T("کار اجتنابی", "Avoided task")} value={T("اجتنابی", "Avoided")} active
            iconStyle={{ color: "rgb(217 119 6)" }} disabled={!canEdit} open={panel === "priority"} aria-expanded={panel === "priority"} onClick={() => toggle("priority")} data-testid="task-meta-avoidance" />
        )}
        <MetaTile icon={TagIcon} label={T("برچسب", "Tags")}
          value={selectedTags.length ? selectedTags.map((tg) => tg.name).join(isEn ? ", " : "، ") : null}
          active={selectedTags.length > 0} open={panel === "tags"}
          iconStyle={selectedTags.length === 1 && selectedTags[0].color ? { color: selectedTags[0].color } : undefined}
          disabled={!canEdit} aria-expanded={panel === "tags"} onClick={() => toggle("tags")} data-testid="task-meta-tags" />
        <MetaTile icon={Pin} label={t.pinned ? T("سنجاق‌شده", "Pinned") : T("سنجاق", "Pin")} value={null}
          active={Boolean(t.pinned)} iconStyle={t.pinned ? { color: "hsl(var(--primary))", fill: "hsl(var(--primary) / 0.15)" } : undefined}
          disabled={!canEdit} aria-pressed={Boolean(t.pinned)} onClick={() => save({ pinned: !t.pinned })} data-testid="task-meta-pin" />
      </div>

      {panel && panelBody && (
        <div ref={panelRef} className="task-inline-panel mt-1.5 rounded-lg border border-border/70 bg-card p-2.5 shadow-sm sm:p-3" role="region"
          aria-label={titles[panel]} data-testid="task-inline-panel" data-panel={panel}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {panel === "folder" && <FolderIcon className="h-3.5 w-3.5" />}
              {panel === "goal" && <Target className="h-3.5 w-3.5" />}
              {panel === "schedule" && <CalendarDays className="h-3.5 w-3.5" />}
              {panel === "plan" && <CalendarRange className="h-3.5 w-3.5" />}
              {panel === "priority" && <Flag className="h-3.5 w-3.5" />}
              {panel === "tags" && <TagIcon className="h-3.5 w-3.5" />}
              {titles[panel]}
            </span>
            <button type="button" onClick={() => setPanel(null)} className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={T("بستن", "Close")} data-testid="task-inline-panel-close">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {panelBody}
        </div>
      )}
    </div>
  );
}
