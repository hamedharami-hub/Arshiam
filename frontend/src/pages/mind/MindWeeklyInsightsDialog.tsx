import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Sparkles } from "lucide-react";

export interface MindWeeklyInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payloadPreview: string;
  onConfirm: () => Promise<void> | void;
  loading: boolean;
  T: (fa: string, en: string) => string;
}

export function MindWeeklyInsightsDialog({
  open,
  onOpenChange,
  payloadPreview,
  onConfirm,
  loading,
  T,
}: MindWeeklyInsightsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-primary" />
            {T("پیش‌نمایش داده‌های ارسالی به AI", "Preview AI Request Payload")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {T(
              "همین خلاصهٔ آمار نمایش‌داده‌شده همراه دستور تحلیل به سرویس AI تنظیم‌شده فرستاده می‌شود؛ پروفایل شخصی، یادداشت‌ها و داده‌های دیگر به آن افزوده نمی‌شوند. پس از بررسی ارسال را تأیید کنید:",
              "This exact summary, with analysis instructions, is sent to your configured AI service. No personal profile, notes, or other data are added. Review before confirming:"
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="p-3 bg-muted/60 rounded-xl font-mono text-xs overflow-x-auto max-h-48 text-start" dir="ltr">
          <pre>{payloadPreview}</pre>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {T("انصراف", "Cancel")}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin me-1" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 me-1" />
            )}
            {T("تایید و دریافت تحلیل", "Confirm & Analyze")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
