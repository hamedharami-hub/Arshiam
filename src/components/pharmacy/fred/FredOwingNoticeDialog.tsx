import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFredPractice } from "./FredPracticeContext";
export function FredOwingNoticeDialog(){const {previewNotice,setPreviewNotice,T,isEn}=useFredPractice();if(!previewNotice)return null;return (
        <Dialog open={Boolean(previewNotice)} onOpenChange={open => { if (!open) setPreviewNotice(null); }}>
          <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto" dir={isEn ? "ltr" : "rtl"}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm"><Printer className="h-5 w-5" />{T("پیش‌نمایش درون‌برنامه‌ای برگه بدهی", "In-App Owing Notice Preview")}</DialogTitle>
              <DialogDescription>{T("پیش‌نمایش آموزشی", "Educational preview")}</DialogDescription>
            </DialogHeader>

            {/* Banner Inside Preview */}
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-200">
              <strong>{isEn ? previewNotice.noticeStatusTextEn : previewNotice.noticeStatusTextFa}</strong>
              <p className="mt-0.5 text-muted-foreground">
                {T(
                  "این صرفاً یک پیش‌نمایش متنی داخل نرم‌افزار است و هیچ سندی به چاپگر ارسال نمی‌شود.",
                  "This is an in-app simulated view. No data is sent to printers or external services."
                )}
              </p>
            </div>

            {/* Notice Paper Content */}
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/30 font-mono text-xs space-y-2 leading-relaxed" dir="ltr">
              <div className="text-center font-bold text-foreground pb-2 border-b border-border">
                FRED DISPENSE — OWING MEDICATION NOTICE
              </div>
              <div><strong>Notice ID:</strong> {previewNotice.noticeId}</div>
              <div><strong>Medication:</strong> {previewNotice.prescribedDrug}</div>
              <div><strong>Schedule:</strong> {previewNotice.schedule}</div>
              <div><strong>Quantity:</strong> {previewNotice.quantity}</div>
              <div><strong>Original Script Date:</strong> {previewNotice.scriptDate}</div>
              <div><strong>Simulated Issue Date:</strong> {previewNotice.issueDate}</div>
              <div className="pt-2 border-t border-border text-center">
                <strong>Barcode:</strong> {previewNotice.barcode}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPreviewNotice(null)}
                className="cursor-pointer text-xs"
              >
                {T("بستن پیش‌نمایش", "Close Preview")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );}
