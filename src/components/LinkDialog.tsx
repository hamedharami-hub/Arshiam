import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBilingual } from "@/hooks/useBilingual";

export function normalizeLinkUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function LinkDialog({
  open,
  onOpenChange,
  initialText = "",
  askText = true,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialText?: string;
  askText?: boolean;
  onSubmit: (url: string, text: string) => void;
}) {
  const { T, isEn } = useBilingual();
  const [url, setUrl] = useState("");
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setUrl(""); setText(initialText); setError(""); }
  }, [open, initialText]);

  const submit = () => {
    const normalized = normalizeLinkUrl(url);
    if (!normalized) { setError(T("نشانی لینک معتبر نیست", "That link is not valid")); return; }
    onSubmit(normalized, text.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={isEn ? "ltr" : "rtl"} className="max-w-sm" data-testid="link-dialog">
        <DialogHeader>
          <DialogTitle>{T("افزودن لینک", "Add link")}</DialogTitle>
          <DialogDescription>{T("نشانی وب را وارد کنید.", "Enter the web address.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
          <Input
            autoFocus dir="ltr" inputMode="url" placeholder="https://example.com"
            value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }}
            data-testid="link-dialog-url"
          />
          {askText && (
            <Input
              dir="auto" placeholder={T("متن نمایشی (اختیاری)", "Link text (optional)")}
              value={text} onChange={(e) => setText(e.target.value)} data-testid="link-dialog-text"
            />
          )}
          {error && <p className="text-xs text-destructive" data-testid="link-dialog-error">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{T("انصراف", "Cancel")}</Button>
            <Button type="submit" data-testid="link-dialog-submit">{T("افزودن", "Add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
