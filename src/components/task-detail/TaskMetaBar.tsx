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
} from "lucide-react";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import type { Task } from "@/lib/taskTypes";
import { TaskSchedulingSheet } from "./TaskSchedulingSheet";

export interface TaskMetaBarProps {
  t: Task;
  canEdit: boolean;
  isOwner: boolean;
  folders: Array<{ id: string; name: string; color?: string; parent_id?: string | null }>;
  folderOpen: boolean;
  setFolderOpen: (open: boolean) => void;
  folderName: (id: string | null | undefined) => string;
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
  return (
    <div className="mx-auto max-w-3xl w-full px-1 pt-0.5 pb-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {/* 1. Folder / Inbox */}
        <div>
          <Popover open={folderOpen} onOpenChange={setFolderOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={!canEdit}
                title={t.folder_id ? folderName(t.folder_id) : T("صندوق ورودی", "Inbox")}
                aria-label={t.folder_id ? folderName(t.folder_id) : T("صندوق ورودی", "Inbox")}
                className={`w-full min-w-0 h-9 rounded-xl relative flex items-center justify-center px-1 transition-all duration-150 ${
                  t.folder_id
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-2xs font-semibold"
                    : "bg-muted/30 text-foreground/80 hover:bg-muted/60 border-border/60"
                }`}
              >
                <FolderIcon
                  className="w-4 h-4 shrink-0"
                  style={{
                    color: t.folder_id
                      ? folders.find((f) => f.id === t.folder_id)?.color || undefined
                      : undefined,
                  }}
                />
                {t.folder_id && (
                  <span
                    className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full"
                    style={{
                      background:
                        folders.find((f) => f.id === t.folder_id)?.color || "rgb(59 130 246)",
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-2 max-h-[55vh] overflow-y-auto"
              align="start"
              side="top"
            >
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
                className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
                  t.folder_id === null ? "bg-accent" : ""
                }`}
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
                        className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent flex items-center gap-2 ${
                          t.folder_id === f.id ? "bg-accent" : ""
                        }`}
                      >
                        <FolderIcon className="w-3.5 h-3.5" style={{ color: f.color || undefined }} />
                        {f.name}
                      </button>
                      {children.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => save({ folder_id: c.id })}
                          className={`w-full text-start p-2 ps-6 rounded-lg text-xs hover:bg-accent flex items-center gap-2 ${
                            t.folder_id === c.id ? "bg-accent" : ""
                          }`}
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
        </div>

        {/* 2. Schedule */}
        <div>
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
        </div>

        {/* 3. Priority */}
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={!canEdit}
                title={
                  t.priority !== "none"
                    ? T(priorityMeta.label, priorityMeta.labelEn)
                    : T("اولویت", "Priority")
                }
                aria-label={
                  t.priority !== "none"
                    ? T(priorityMeta.label, priorityMeta.labelEn)
                    : T("اولویت", "Priority")
                }
                className={`w-full min-w-0 h-9 rounded-xl relative flex items-center justify-center px-1 transition-all duration-150 ${
                  t.priority !== "none"
                    ? `${priorityMeta.bgClass} ${priorityMeta.textClass} border-border/80 shadow-2xs font-semibold`
                    : "bg-muted/30 text-foreground/80 hover:bg-muted/60 border-border/60"
                }`}
              >
                <Flag
                  className={`w-4 h-4 shrink-0 ${
                    t.priority !== "none" ? priorityMeta.textClass : "text-muted-foreground"
                  }`}
                />
                {t.priority !== "none" && (
                  <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2" align="center" side="top">
              <div className="grid grid-cols-2 gap-1.5">
                {PRIORITY_ORDER.map((p) => {
                  const m = PRIORITY_META[p];
                  const active = t.priority === p;
                  return (
                    <button
                      key={p}
                      disabled={!canEdit}
                      onClick={() => save({ priority: p })}
                      className={`px-2 h-9 rounded-xl text-[12px] font-medium transition disabled:opacity-50 disabled:cursor-default ${
                        active ? `${m.bgClass} ${m.textClass}` : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {m.emoji} {T(m.label, m.labelEn)}
                    </button>
                  );
                })}
              </div>
              {t.priority !== "none" && (
                <button
                  disabled={!canEdit}
                  onClick={() => save({ priority: "none" as Priority })}
                  className="w-full mt-2 h-8 rounded-lg text-xs text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-default"
                >
                  {T("حذف اولویت", "Clear priority")}
                </button>
              )}
              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
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
        </div>

        {/* 4. Tags */}
        <div>
          <Popover open={topTagOpen} onOpenChange={setTopTagOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={!canEdit}
                title={taskTagIds.length ? `${taskTagIds.length} ${T("تگ", "tags")}` : T("تگ", "Tags")}
                aria-label={taskTagIds.length ? `${taskTagIds.length} ${T("تگ", "tags")}` : T("تگ", "Tags")}
                className={`w-full min-w-0 h-9 rounded-xl relative flex items-center justify-center px-1 transition-all duration-150 ${
                  taskTagIds.length
                    ? "bg-primary/10 text-primary border-primary/30 font-semibold shadow-2xs"
                    : "bg-muted/30 text-foreground/80 hover:bg-muted/60 border-border/60"
                }`}
              >
                <TagIcon
                  className={`w-4 h-4 shrink-0 ${
                    taskTagIds.length ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                {taskTagIds.length > 0 && (
                  <span className="text-[10px] font-bold tabular-nums ms-1">
                    {taskTagIds.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-2 max-h-[55vh] overflow-y-auto"
              align="end"
              side="top"
            >
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
                    className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent flex items-center justify-between gap-2 ${
                      active ? "bg-accent" : ""
                    }`}
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
    </div>
  );
}
