import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Users } from "lucide-react";
import { BidiText } from "@/components/BidiText";
import { getFeatureCapability } from "@/lib/capabilities";

export type ShareResourceType = "task" | "note" | "folder";
export type SharePermission = "view" | "comment" | "edit";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  resourceType: ShareResourceType;
  resourceId: string;
  resourceTitle?: string;
}

export default function ShareDialog({ open, onOpenChange, resourceType, resourceTitle }: Props) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const cap = getFeatureCapability("sharing");

  const resourceLabel = T(
    resourceType === "task" ? "تسک" : resourceType === "note" ? "نوت" : "فولدر",
    resourceType === "task" ? "task" : resourceType === "note" ? "note" : "folder",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {T(`اشتراک‌گذاری ${resourceLabel}`, `Share ${resourceLabel}`)}
          </DialogTitle>
          {resourceTitle && (
            <DialogDescription className="truncate">
              <BidiText text={resourceTitle} />
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">{isEn ? cap.name_en : cap.name}</p>
              <p>{isEn ? cap.reason_en : cap.reason}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {T(
              "تمام داده‌ها، تسک‌ها و یادداشت‌های شما به صورت اختصاصی در حساب کاربری شما ذخیره می‌شوند و به دلیل حفظ کامل حریم خصوصی و تفکیک داده‌ها در فایربیس، اشتراک متقابل فعال نیست.",
              "All your tasks and notes are strictly isolated within your private user storage. Cross-tenant sharing is disabled to maintain user privacy."
            )}
          </p>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {T("بستن", "Close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
