import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Folder as FolderIcon,
  Tag as TagIcon,
  Flag,
  Ban,
  Plus,
  Check,
  Target,
} from "lucide-react";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import type { Task } from "@/lib/taskTypes";
import { TaskSchedulingSheet } from "./TaskSchedulingSheet";
import { MetaTile } from "./MetaTile";

export interface TaskMetaBarProps {
  t: Task;
  canEdit: boolean;
  isOwner: boolean;
  folders: Array<{ id: string; name: string; color?: string; parent_id?: string | null }>;
  folderOpen: boolean;
  setFolderOpen: (open: boolean) => void;
  folderName: (id: string | null | undefined) => string;
  goalOpen?: boolean;
  setGoalOpen?: (open: boolean) => void;
  currentGoal?: { id: string; title: string; icon?: string; color?: string } | null;
  scheduleOpen: boolean;
  setScheduleOpen: (open: boolean) => void;
  isScheduled: boolean;
  scheduleLabel: string | null;
  hasTimeBlock: boolean;
  priorityMeta: { label: string; labelEn: string; bgClass: string; textClass: string; emoji?: string };
  topTagOpen: boolean;
  setTopTagOpen: (open: boolean) => void;
  taskTagIds: string[];
  tags: Array<{ id: string; name: string; color?: string }>;
  toggleTag: (tagId: string) => void;
  createTagAndAssign: () => Promise<unknown>;
  createFolderAndAssign: () => Promise<unknown>;
  save: (patch: Partial<Task>) => void;
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

export function TaskMetaBar({
  t,
  canEdit,
  isOwner,
  folders,
  folderOpen,
  setFolderOpen,
  folderName,
  goalOpen,
  setGoalOpen,
  currentGoal,
  scheduleOpen,
  setScheduleOpen,
  isScheduled,
  scheduleLabel,
  hasTimeBlock,
  priorityMeta,
  topTagOpen,
  setTopTagOpen,
  taskTagIds,
  tags,
  toggleTag,
  createTagAndAssign,
  createFolderAndAssign,
  save,
  postpone,
  T,
  showFolderCreate,
  setShowFolderCreate,
  newFolderName,
  setNewFolderName,
  newFolderColor,
  setNewFolderColor,
  showTagCreate,
  setShowTagCreate,
  newTagName,
  setNewTagName,
  newTagColor,
  setNewTagColor,
  TAG_COLORS,
}: TaskMetaBarProps) {
  const currentFolder = t.folder_id ? folders.find((f) => f.id === t.folder_id) : undefined;
  const folderColor = currentFolder?.color || "rgb(59 130 246)";
  const selectedTags = tags.filter((tg) => taskTagIds.includes(tg.id));
  const popoverClass = "w-[min(92vw,20rem)] rounded-2xl p-2";
  const optionClass = (active: boolean) =>
    `w-full text-start px-2.5 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors ${active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent"} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`;

  return (
    <div className="mx-auto max-w-3xl w-full px-1 pt-0.5 pb-1.5" data-testid="task-meta-bar">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 rounded-[22px] border border-border/50 bg-card/60 p-1.5 shadow-2xs backdrop-blur-sm dark:bg-card/30">
        {/* 1. Folder / Inbox */}
        <Popover open={folderOpen} onOpenChange={setFolderOpen}>
          <PopoverTrigger asChild>
            <MetaTile
              icon={FolderIcon}
              label={T("پوشه", "Folder")}
              value={t.folder_id ? folderName(t.folder_id) : null}
              active={Boolean(t.folder_id)}
              activeClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              iconStyle={t.folder_id ? { color: folderColor } : undefined}
              dotStyle={{ background: folderColor }}
              disabled={!canEdit}
              title={t.folder_id ? folderName(t.folder_id) : T("صندوق ورودی", "Inbox")}
              aria-label={t.folder_id ? folderName(t.folder_id) : T("صندوق ورودی", "Inbox")}
              data-testid="task-meta-folder"
            />
          </PopoverTrigger>
          <PopoverContent
            className={`${popoverClass} max-h-[55vh] overflow-y-auto`}
            align="start"
            side="top"
            collisionPadding={12}
          >
            <p className="px-2 pb-1.5 text-[11px] font-semibold text-muted-foreground">{T("پوشهٔ تسک", "Task folder")}</p>
              {isOwner && !showFolderCreate && (
                <button
                  onClick={() => setShowFolderCreate(true)}
                  className="w-full flex items-center gap-2 p-2 mb-1 rounded-xl bg-muted/40 hover:bg-accent text-sm text-muted-foreground"
                >
                  <Plus className="w-4 h-4" /> {T("ساخت فولدر جدید", "Create new folder")}
                </button>
              )}
              {isOwner && showFolderCreate && (
                <>
                  <div className="flex items-center gap-1.5 mb-2 p-1.5 rounded-xl bg-muted/40">
                    <span
                      className="w-6 h-6 rounded-md shrink-0"
                      style={{ background: newFolderColor }}
                    />
                    <Input
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void createFolderAndAssign();
                          setShowFolderCreate(false);
                        }
                        if (e.key === "Escape") setShowFolderCreate(false);
                      }}
                      placeholder={T("نام فولدر جدید…", "New folder name…")}
                      className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={async () => {
                        await createFolderAndAssign();
                        setShowFolderCreate(false);
                      }}
                      disabled={!newFolderName.trim()}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-1 mb-2 px-1">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewFolderColor(c)}
                        className={`w-5 h-5 rounded-full border-2 ${
                          newFolderColor === c ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </>
              )}
              <button
                disabled={!isOwner}
                onClick={() => save({ folder_id: null })}
                className={optionClass(t.folder_id === null)}
              >
                {T("بدون فولدر (Inbox)", "No folder (Inbox)")}
              </button>
              {folders
                .filter((f) => !f.parent_id)
                .map((f) => {
                  const children = folders.filter((c) => c.parent_id === f.id);
                  return (
                    <div key={f.id}>
                      <button
                        onClick={() => save({ folder_id: f.id })}
                        className={optionClass(t.folder_id === f.id)}
                      >
                        <FolderIcon className="w-3.5 h-3.5" style={{ color: f.color || undefined }} />
                        {f.name}
                      </button>
                      {children.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => save({ folder_id: c.id })}
                          className={`${optionClass(t.folder_id === c.id)} ps-7 text-xs`}
                        >
                          <FolderIcon className="w-3 h-3" style={{ color: c.color || undefined }} />
                          {c.name}
                        </button>
                      ))}
                    </div>
                  );
                })}
            </PopoverContent>
          </Popover>

        {/* 2. Goal */}
        <MetaTile
          icon={Target}
          label={T("هدف", "Goal")}
          value={currentGoal ? currentGoal.title : null}
          active={Boolean(t.kanban_column_id)}
          activeClassName="bg-primary/10 text-primary"
          iconStyle={currentGoal ? { color: currentGoal.color || "hsl(var(--primary))" } : undefined}
          dotStyle={currentGoal?.color ? { background: currentGoal.color } : undefined}
          disabled={!canEdit}
          onClick={() => setGoalOpen?.(true)}
          title={currentGoal ? `${currentGoal.icon ? currentGoal.icon + " " : ""}${currentGoal.title}` : T("هدف کانبان", "Kanban Goal")}
          aria-label={currentGoal ? currentGoal.title : T("هدف کانبان", "Kanban Goal")}
          data-testid="task-meta-goal"
        />

        {/* 3. Schedule */}
        <TaskSchedulingSheet
          t={t}
          scheduleOpen={scheduleOpen}
          setScheduleOpen={setScheduleOpen}
          canEdit={canEdit}
          isScheduled={isScheduled}
          scheduleLabel={scheduleLabel}
          hasTimeBlock={hasTimeBlock}
          save={save}
          postpone={postpone}
          T={T}
        />

        {/* 3. Priority */}
        <Popover>
          <PopoverTrigger asChild>
            <MetaTile
              icon={Flag}
              label={T("اولویت", "Priority")}
              value={t.priority !== "none" ? T(priorityMeta.label, priorityMeta.labelEn) : null}
              active={t.priority !== "none"}
              activeClassName={`${priorityMeta.bgClass} ${priorityMeta.textClass}`}
              disabled={!canEdit}
              title={t.priority !== "none" ? T(priorityMeta.label, priorityMeta.labelEn) : T("اولویت", "Priority")}
              aria-label={t.priority !== "none" ? T(priorityMeta.label, priorityMeta.labelEn) : T("اولویت", "Priority")}
              data-testid="task-meta-priority"
            />
          </PopoverTrigger>
          <PopoverContent className={popoverClass} align="center" side="top" collisionPadding={12}>
            <p className="px-2 pb-1.5 text-[11px] font-semibold text-muted-foreground">{T("اولویت تسک", "Task priority")}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PRIORITY_ORDER.map((p) => {
                const m = PRIORITY_META[p];
                const active = t.priority === p;
                return (
                  <button
                    key={p}
                    disabled={!canEdit}
                    onClick={() => save({ priority: p })}
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-[12px] font-medium transition disabled:opacity-50 disabled:cursor-default ${
                      active ? `${m.bgClass} ${m.textClass} ring-1 ring-current/30` : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Flag className={`h-3.5 w-3.5 ${m.textClass}`} /> {T(m.label, m.labelEn)}
                  </button>
                );
              })}
            </div>
            {t.priority !== "none" && (
              <button
                disabled={!canEdit}
                onClick={() => save({ priority: "none" as Priority })}
                className="w-full mt-2 h-8 rounded-xl text-xs text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-default"
              >
                {T("حذف اولویت", "Clear priority")}
              </button>
            )}
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Ban className="w-3.5 h-3.5 text-amber-600" /> {T("اجتنابی", "Avoidance")}
              </span>
              <Switch
                checked={!!t.is_avoidance}
                onCheckedChange={(v) => save({ is_avoidance: !!v } as any)}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* 4. Tags */}
        <Popover open={topTagOpen} onOpenChange={setTopTagOpen}>
          <PopoverTrigger asChild>
            <MetaTile
              icon={TagIcon}
              label={T("تگ", "Tags")}
              value={selectedTags.length === 1 ? selectedTags[0].name : selectedTags.length > 1 ? T(`${selectedTags.length} تگ`, `${selectedTags.length} tags`) : null}
              active={taskTagIds.length > 0}
              activeClassName="bg-primary/12 text-primary"
              iconStyle={selectedTags.length === 1 && selectedTags[0].color ? { color: selectedTags[0].color } : undefined}
              dotStyle={selectedTags.length === 1 && selectedTags[0].color ? { background: selectedTags[0].color } : undefined}
              disabled={!canEdit}
              title={taskTagIds.length ? `${taskTagIds.length} ${T("تگ", "tags")}` : T("تگ", "Tags")}
              aria-label={taskTagIds.length ? `${taskTagIds.length} ${T("تگ", "tags")}` : T("تگ", "Tags")}
              data-testid="task-meta-tags"
            />
          </PopoverTrigger>
          <PopoverContent
            className={`${popoverClass} max-h-[55vh] overflow-y-auto`}
            align="end"
            side="top"
            collisionPadding={12}
          >
            <p className="px-2 pb-1.5 text-[11px] font-semibold text-muted-foreground">{T("تگ‌های تسک", "Task tags")}</p>
              {!showTagCreate ? (
                <button
                  onClick={() => setShowTagCreate(true)}
                  className="w-full flex items-center gap-2 p-2 mb-1 rounded-xl bg-muted/40 hover:bg-accent text-sm text-muted-foreground"
                >
                  <Plus className="w-4 h-4" /> {T("ساخت تگ جدید", "Create new tag")}
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-2 p-1.5 rounded-xl bg-muted/40">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 ms-1"
                      style={{ background: newTagColor }}
                    />
                    <Input
                      autoFocus
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void createTagAndAssign();
                          setShowTagCreate(false);
                        }
                        if (e.key === "Escape") setShowTagCreate(false);
                      }}
                      placeholder={T("نام تگ جدید…", "New tag name…")}
                      className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={async () => {
                        await createTagAndAssign();
                        setShowTagCreate(false);
                      }}
                      disabled={!newTagName.trim()}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-1 mb-2 px-1">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewTagColor(c)}
                        className={`w-5 h-5 rounded-full border-2 ${
                          newTagColor === c ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </>
              )}
              {tags.map((tg) => {
                const active = taskTagIds.includes(tg.id);
                return (
                  <button
                    key={tg.id}
                    onClick={() => toggleTag(tg.id)}
                    className={`${optionClass(active)} justify-between`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: tg.color || "hsl(var(--muted-foreground))" }}
                      />
                      {tg.name}
                    </span>
                    {active && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
      </div>
    </div>
  );
}
