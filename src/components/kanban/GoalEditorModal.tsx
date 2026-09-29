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
import {
  type GoalKanban,
  type TimeHorizon,
  type GoalPriority,
  TIME_HORIZONS,
  GOAL_PRIORITIES,
} from "@/lib/kanbanGoals";

const COLOR_OPTIONS = [
  { hex: "#3b82f6", label: "آبی" },
  { hex: "#10b981", label: "سبز زمردی" },
  { hex: "#f59e0b", label: "کهربایی" },
  { hex: "#ef4444", label: "قرمز" },
  { hex: "#8b5cf6", label: "بنفش" },
  { hex: "#ec4899", label: "صورتی" },
  { hex: "#06b6d4", label: "فیروزه‌ای" },
  { hex: "#64748b", label: "طوسی" },
];

interface GoalEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalKanban | null;
  allGoals: GoalKanban[];
  onSave: (goalData: Partial<GoalKanban>) => void;
  onDelete?: (goalId: string) => void;
}

export default function GoalEditorModal({
  open,
  onOpenChange,
  goal,
  allGoals,
  onSave,
  onDelete,
}: GoalEditorModalProps) {
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
  }, [goal, open]);

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
    });
    onOpenChange(false);
  };

  const EMOJI_OPTIONS = ["🎯", "📚", "🗣️", "🤖", "💼", "🫀", "🚀", "🌟", "💡", "🎨", "🏃‍♂️", "🌿", "🧘‍♀️", "🔥"];

  const canDelete = Boolean(goal && onDelete && allGoals.length > 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Target className="w-5 h-5 text-primary" />
            {goal ? "ویرایش هدف" : "افزودن هدف جدید"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {goal
              ? "عنوان، آیکون، رنگ، افق زمانی و اولویت هدف را تنظیم کنید."
              : "یک هدف جدید برای دسته‌بندی و مدیریت تسک‌ها ایجاد کنید."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title & Icon */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">عنوان هدف</Label>
            <div className="flex gap-2">
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="w-16 text-lg shrink-0">
                  <SelectValue />
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: آموزش و خودآگاهی، مکالمه زبان..."
                className="flex-1"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">توضیحات و یادداشت</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح اهداف، برنامه اجرایی یا یادداشت‌های مهم این هدف..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Time Horizon & Priority Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Time Horizon */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" /> افق زمانی
              </Label>
              <Select value={timeHorizon} onValueChange={(v) => setTimeHorizon(v as TimeHorizon)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_HORIZONS.map((th) => (
                    <SelectItem key={th.id} value={th.id} className="text-xs">
                      {th.icon} {th.labelFa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1">
                <Flag className="w-3 h-3 text-muted-foreground" /> سطح اهمیت
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as GoalPriority)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_PRIORITIES.map((pr) => (
                    <SelectItem key={pr.id} value={pr.id} className="text-xs">
                      {pr.badge} {pr.labelFa}
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
              رنگ تم و شناسه هدف
            </Label>
            <div className="flex items-center gap-2.5 flex-wrap py-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={c.label}
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
              حذف این هدف
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              انصراف
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={!title.trim()} className="text-xs font-bold">
              {goal ? "ذخیره تغییرات هدف" : "ایجاد هدف"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
