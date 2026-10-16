import { useEffect, useMemo, useState } from "react";
import { History, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { diffHtmlLines } from "@/lib/miniAppsDiff";
import { MAX_MINI_APP_VERSIONS, type MiniAppVersion, type VersionKind } from "@/lib/miniAppsHistory";
import type { MiniApp } from "@/lib/miniAppsStore";

interface Props {
  versions: MiniAppVersion[];
  draft: MiniApp;
  isEn: boolean;
  t: (fa: string, en: string) => string;
  onClose: () => void;
  onCheckpoint: () => void;
  onRestore: (version: MiniAppVersion) => void;
  canCheckpoint: boolean;
  warning?: string;
}
const PAGE_SIZE = 150;

export function MiniAppHistoryDialog({ versions, draft, isEn, t, onClose, onCheckpoint, onRestore, canCheckpoint, warning }: Props) {
  const [selectedId, setSelectedId] = useState(versions[0]?.id ?? "");
  const [page, setPage] = useState(0);
  const [changesOnly, setChangesOnly] = useState(false);
  const selected = versions.find(version => version.id === selectedId) ?? versions[0];
  useEffect(() => {
    if (!versions.some(version => version.id === selectedId)) setSelectedId(versions[0]?.id ?? "");
  }, [selectedId, versions]);
  const diff = useMemo(() => selected ? diffHtmlLines(selected.app.html, draft.html) : null, [selected, draft.html]);
  const lines = useMemo(() => diff ? changesOnly ? diff.lines.filter(line => line.kind !== "same") : diff.lines : [], [diff, changesOnly]);
  const pageCount = Math.max(1, Math.ceil(lines.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount - 1);
  const kindLabel = (kind: VersionKind) => ({ initial: t("نسخه اولیه", "Initial version"), save: t("ذخیره", "Saved version"), checkpoint: t("نسخه دستی", "Checkpoint"), restore: t("بازگردانی", "Restored version") })[kind];
  const formattedTime = (time: number) => new Intl.DateTimeFormat(isEn ? "en" : "fa", { dateStyle: "short", timeStyle: "medium" }).format(time);
  const metadata = selected ? [
    [t("نام", "Name"), selected.app.name, draft.name],
    [t("نشانه", "Emoji"), selected.app.emoji, draft.emoji],
    [t("توضیح", "Description"), selected.app.description, draft.description],
    [t("درخواست هوش مصنوعی", "AI request"), selected.app.aiRequest, draft.aiRequest],
  ].filter(([, before, after]) => before !== after) : [];

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent dir={isEn ? "ltr" : "rtl"} className="max-h-[90dvh] max-w-5xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><History className="size-5" />{t("تاریخچه و مقایسه نسخه‌ها", "Version history and comparison")}</DialogTitle>
        <DialogDescription>{t("نسخه‌ها روی این دستگاه نگهداری و در پس‌زمینه با حساب همگام می‌شوند؛ ذخیره محلی، تأیید همگام‌سازی ابری نیست. بازگردانی فقط پیش‌نویس را تغییر می‌دهد و کد را ذخیره یا اجرا نمی‌کند.", "Versions are retained on this device and synced to your account in the background; local storage is not a cloud acknowledgement. Restoring changes only the draft, without saving or running it.")}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{versions.length} / {MAX_MINI_APP_VERSIONS} {t("نسخه برای این ابزارک؛ سقف کل ۵۵۰ کیلوبایت. نسخه‌های قدیمی با پرشدن ظرفیت حذف می‌شوند.", "versions for this tool; 550 KB total history budget. Oldest versions are pruned when full.")}</span>
        <Button size="sm" variant="outline" onClick={onCheckpoint} disabled={!canCheckpoint}><Save className="me-1 size-4" />{t("ثبت نسخه", "Capture version")}</Button>
      </div>
      {warning && <p role="alert" className="text-sm text-destructive">{warning}</p>}
      {selected ? <>
        <label className="space-y-1 text-sm">
          <span>{t("نسخه برای مقایسه", "Version to compare")}</span>
          <select value={selected.id} onChange={event => { setSelectedId(event.target.value); setPage(0); }} className="h-10 w-full rounded-md border bg-background px-3">
            {versions.map(version => <option key={version.id} value={version.id}>{kindLabel(version.kind)} · {version.app.name} · {formattedTime(version.savedAt)}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 p-3 text-sm">
          <span>{t("نسخه منتخب ← پیش‌نویس فعلی", "Selected version → current draft")}</span>
          <span><span className="text-emerald-700 dark:text-emerald-300">+{diff?.added} {t("خط افزوده", "added")}</span> · <span className="text-destructive">−{diff?.removed} {t("خط حذف‌شده", "removed")}</span></span>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={changesOnly} onChange={event => { setChangesOnly(event.target.checked); setPage(0); }} />{t("فقط تغییرات", "Changes only")}</label>
        </div>
        {metadata.length > 0 && <div className="space-y-2 rounded-md border p-3 text-sm">{metadata.map(([label, before, after]) => <div key={label} className="space-y-1">
          <p className="font-medium">{label}</p><p className="whitespace-pre-wrap break-words text-destructive">− {before || t("خالی", "Empty")}</p><p className="whitespace-pre-wrap break-words text-emerald-700 dark:text-emerald-300">+ {after || t("خالی", "Empty")}</p>
        </div>)}</div>}
        {diff?.blockComparison && <p className="text-xs text-muted-foreground">{t("برای تغییرات بسیار بزرگ، مقایسه بلوکی استفاده می‌شود؛ متن کامل با صفحه‌بندی قابل مشاهده است.", "Very large changes use block comparison; full text is available through pagination.")}</p>}
        <div className="max-h-[45vh] overflow-auto rounded-md border font-mono text-xs" dir="ltr" data-testid="html-version-diff">
          <div className="grid grid-cols-[3rem_3rem_1.5rem_minmax(0,1fr)] border-b bg-muted/50 p-2 text-muted-foreground"><span>{t("قبل", "Old")}</span><span>{t("بعد", "New")}</span><span /><span>HTML</span></div>
          {lines.length ? lines.slice(visiblePage * PAGE_SIZE, (visiblePage + 1) * PAGE_SIZE).map((line, index) => <div key={visiblePage * PAGE_SIZE + index} className={`grid grid-cols-[3rem_3rem_1.5rem_minmax(0,1fr)] px-2 py-1 ${line.kind === "added" ? "bg-emerald-500/10" : line.kind === "removed" ? "bg-destructive/10" : ""}`}>
            <span className="select-none text-muted-foreground">{line.beforeLine ?? ""}</span><span className="select-none text-muted-foreground">{line.afterLine ?? ""}</span><span>{line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}</span><code className="whitespace-pre-wrap break-all">{line.text || " "}</code>
          </div>) : <p className="p-4" dir="auto">{t("تغییری در کد نیست.", "No code changes.")}</p>}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <Button size="sm" variant="outline" disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}>{t("صفحه قبلی مقایسه", "Previous diff page")}</Button>
          <span>{t("صفحه", "Page")} {visiblePage + 1} / {pageCount} · {lines.length} {t("خط", "lines")}</span>
          <Button size="sm" variant="outline" disabled={visiblePage >= pageCount - 1} onClick={() => setPage(visiblePage + 1)}>{t("صفحه بعدی مقایسه", "Next diff page")}</Button>
        </div>
      </> : <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("هنوز نسخه‌ای ثبت نشده است. با ثبت نسخه یا ذخیره تغییرات، تاریخچه ساخته می‌شود.", "No versions yet. Capture a version or save edits to begin history.")}</div>}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t("بستن تاریخچه", "Close history")}</Button>
        <Button disabled={!selected} onClick={() => { if (selected) onRestore(selected); }}><RotateCcw className="me-1 size-4" />{t("بازگردانی به پیش‌نویس", "Restore to draft")}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
