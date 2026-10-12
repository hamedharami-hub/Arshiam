import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Target, Calendar, Flag, Sparkles, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  type GoalKanban,
  type TimeHorizon,
  type GoalPriority,
  TIME_HORIZONS,
  GOAL_PRIORITIES,
} from "@/lib/kanbanGoals";

const COLOR_OPTIONS = [
  { hex: "#3b82f6", labelFa: "آبی", labelEn: "Blue" },
  { hex: "#10b981", labelFa: "سبز زمردی", labelEn: "Emerald" },
  { hex: "#f59e0b", labelFa: "کهربایی", labelEn: "Amber" },
  { hex: "#ef4444", labelFa: "قرمز", labelEn: "Red" },
  { hex: "#8b5cf6", labelFa: "بنفش", labelEn: "Violet" },
  { hex: "#ec4899", labelFa: "صورتی", labelEn: "Pink" },
  { hex: "#06b6d4", labelFa: "فیروزه‌ای", labelEn: "Cyan" },
  { hex: "#64748b", labelFa: "طوسی", labelEn: "Slate" },
];

interface GoalEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalKanban | null;
  allGoals: GoalKanban[];
  onSave: (goalData: Partial<GoalKanban>, folderId?: string | null) => void;
  onDelete?: (goalId: string) => void;
  folderOptions?: Array<{ id: string; name: string }>;
  canDelete?: boolean;
}

const NO_FOLDER = "__none";

export default function GoalEditorModal({
  open,
  onOpenChange,
  goal,
  allGoals,
  onSave,
  onDelete,
  folderOptions,
  canDelete: canDeleteProp,
}: GoalEditorModalProps) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [folderId, setFolderId] = useState<string>(NO_FOLDER);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("monthly");
  const [priority, setPriority] = useState<GoalPriority>("medium");
  const [color, setColor] = useState("#3b82f6");
  const [icon, setIcon] = useState("🎯");

  useEffect(() => {
    if (goal) {
      setTitle(goal.title || "");
      setDescription(goal.description || "");
      setTimeHorizon(goal.timeHorizon || "monthly");
      setPriority(goal.priority || "medium");
      setColor(goal.color || "#3b82f6");
      setIcon(goal.icon || "🎯");
    } else {
      setTitle("");
      setDescription("");
      setTimeHorizon("monthly");
      setPriority("medium");
      setColor("#3b82f6");
      setIcon("🎯");
    }
    setFolderId(folderOptions?.[0]?.id || NO_FOLDER);
  }, [goal, open, folderOptions]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      ...(goal ? { id: goal.id } : {}),
      title: title.trim(),
      description: description.trim() || undefined,
      parentId: null,
      timeHorizon,
      priority,
      color,
      icon,
    }, folderId === NO_FOLDER ? null : folderId);
    onOpenChange(false);
  };

  const EMOJI_OPTIONS = ["🎯", "📚", "🗣️", "🤖", "💼", "🫀", "🚀", "🌟", "💡", "🎨", "🏃‍♂️", "🌿", "🧘‍♀️", "🔥"];

  const canDelete = Boolean(goal && onDelete && (canDeleteProp ?? allGoals.length > 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir={isEn ? "ltr" : "rtl"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Target className="w-5 h-5 text-primary" />
            {goal ? T("ویرایش هدف", "Edit goal") : T("افزودن هدف جدید", "Add new goal")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {goal
              ? T("عنوان، آیکون، رنگ، افق زمانی و اولویت هدف را تنظیم کنید.", "Set the goal's title, icon, color, time horizon and priority.")
              : T("یک هدف جدید برای دسته‌بندی و مدیریت تسک‌ها ایجاد کنید.", "Create a new goal to group and manage your tasks.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title & Icon */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">{T("عنوان هدف", "Goal title")}</Label>
            <div className="flex gap-2">
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="w-16 text-lg shrink-0" aria-label={T("آیکون هدف", "Goal icon")} data-testid="goal-editor-icon">
                  <span className="leading-none">{icon}</span>
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <div className="grid grid-cols-4 gap-1 p-1 text-lg">
                    {EMOJI_OPTIONS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setIcon(em)}
                        className={`p-2 text-center rounded-md hover:bg-muted ${
                          icon === em ? "bg-primary/20" : ""
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              <Input
                data-testid="goal-editor-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={T("مثلاً: آموزش و خودآگاهی، مکالمه زبان...", "e.g. Learning & self-awareness, language practice...")}
                className="flex-1"
                autoFocus
              />
            </div>
          </div>

          {folderOptions && !goal && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{T("فولدر", "Folder")}</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger className="text-xs" data-testid="goal-editor-folder-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {folderOptions.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">📁 {f.name}</SelectItem>
                  ))}
                  <SelectItem value={NO_FOLDER} className="text-xs">{T("بدون فولدر", "No folder")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">{T("توضیحات و یادداشت", "Description & notes")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={T("شرح اهداف، برنامه اجرایی یا یادداشت‌های مهم این هدف...", "Goal details, action plan or important notes...")}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Time Horizon & Priority Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Time Horizon */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" /> {T("افق زمانی", "Time horizon")}
              </Label>
              <Select value={timeHorizon} onValueChange={(v) => setTimeHorizon(v as TimeHorizon)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_HORIZONS.map((th) => (
                    <SelectItem key={th.id} value={th.id} className="text-xs">
                      {th.icon} {isEn ? th.labelEn : th.labelFa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1">
                <Flag className="w-3 h-3 text-muted-foreground" /> {T("سطح اهمیت", "Importance")}
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as GoalPriority)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_PRIORITIES.map((pr) => (
                    <SelectItem key={pr.id} value={pr.id} className="text-xs">
                      {pr.badge} {isEn ? pr.labelEn : pr.labelFa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              {T("رنگ تم و شناسه هدف", "Theme color & goal identity")}
            </Label>
            <div className="flex items-center gap-2.5 flex-wrap py-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={isEn ? c.labelEn : c.labelFa}
                  className={`w-7 h-7 rounded-full transition-all flex items-center justify-center border-2 ${
                    color === c.hex
                      ? "scale-110 border-foreground shadow-sm ring-2 ring-primary/40"
                      : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t">
          {canDelete && goal ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete!(goal.id);
                onOpenChange(false);
              }}
              className="text-xs text-destructive hover:bg-destructive/10 gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {T("حذف این هدف", "Delete this goal")}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              {T("انصراف", "Cancel")}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={!title.trim()} className="text-xs font-bold" data-testid="goal-editor-save">
              {goal ? T("ذخیره تغییرات هدف", "Save goal changes") : T("ایجاد هدف", "Create goal")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
