import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { Button } from "@/components/ui/button";
import { GitBranch, Check } from "lucide-react";
import type { TaskOutcome } from "@/lib/taskTypes";

export function OutcomePicker({
  outcomes,
  open,
  onOpenChange,
  onSelect,
}: {
  outcomes: TaskOutcome[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (outcome: TaskOutcome | null) => void;
}) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const { prefersDialog } = useDeviceFormFactor();

  const titleContent = (
    <div className="flex items-center gap-2">
      <GitBranch className="w-4 h-4" />
      {T("نتیجه این تسک چه شد؟", "What was the outcome?")}
    </div>
  );

  const listContent = (
    <div className="space-y-2">
      {outcomes.map((outcome) => (
        <Button
          key={outcome.id}
          variant="outline"
          className="w-full justify-start text-start h-auto py-3 px-3 gap-3"
          onClick={() => onSelect(outcome)}
        >
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: outcome.color || "hsl(var(--primary))", color: "#fff" }}>
            {outcome.icon || <GitBranch className="w-4 h-4" />}
          </span>
          <div className="flex-1">
            <div className="font-medium text-sm">{outcome.label}</div>
            {outcome.actions.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {outcome.actions.length} {T("تسک بعدی", "follow-up tasks")}
              </div>
            )}
          </div>
        </Button>
      ))}

      <Button
        variant="ghost"
        className="w-full justify-start text-start h-auto py-3 px-3 gap-3 text-muted-foreground"
        onClick={() => onSelect(null)}
      >
        <span className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground shrink-0">
          <Check className="w-4 h-4" />
        </span>
        <div className="font-medium text-sm">{T("فقط تکمیل شود", "Just mark done")}</div>
      </Button>
    </div>
  );

  if (prefersDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir={isEn ? "ltr" : "rtl"}
          className="w-full max-w-md max-h-[75vh] flex flex-col p-4 sm:p-5 overflow-hidden rounded-2xl"
        >
          <DialogHeader className="mb-2 px-0 text-start">
            <DialogTitle className="text-base flex items-center gap-2">
              {titleContent}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {T("انتخاب نتیجه تسک", "Select task outcome")}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto min-h-0 flex-1 pe-1">
            {listContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-6 px-4 pt-4 max-h-[70vh] overflow-y-auto" dir={isEn ? "ltr" : "rtl"}>
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base flex items-center gap-2">
            {titleContent}
          </SheetTitle>
        </SheetHeader>
        {listContent}
      </SheetContent>
    </Sheet>
  );
}
