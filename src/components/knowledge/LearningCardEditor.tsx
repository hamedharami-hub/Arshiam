import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, LayoutGrid, Redo2, Undo2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useBilingual } from '@/hooks/useBilingual';
import { useLearningDraft } from '@/hooks/useLearningDraft';
import { createLearningWorkspace, normalizeLearningWorkspace, learningGroups, sourceCards, type LearningLanguage, type LearningWorkspace } from '@/lib/learningWorkspace';
import { previewLearningMigration, saveLearningLayout } from '@/lib/learningWorkspaceService';
import type { KnowledgeDocument } from '@/lib/knowledgeTypes';

export function LearningCardEditor({ document, userId, onUpdated }: { document: KnowledgeDocument; userId: string; onUpdated?: (document: KnowledgeDocument) => void }) {
  const { T, isEn } = useBilingual();
  const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<LearningLanguage>(isEn ? 'en' : 'fa');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const initial = useMemo(() => createLearningWorkspace(document), [document.id]); // Draft lifetime is owner/document scoped.
  const draft = useLearningDraft(`learning-layout:${userId}:${document.id}`, initial, document.learning_workspace?.revision || '', value => { try { return Boolean(normalizeLearningWorkspace(value)); } catch { return false; } });
  const source = useMemo(() => sourceCards(document, language), [document, language]);
  const sourceMap = new Map(source.map(card => [card.id, card]));
  const visibleCards = draft.value.cards.filter(card => card.sources[language]);
  const other: LearningLanguage = language === 'fa' ? 'en' : 'fa';
  const change = (update: (next: LearningWorkspace) => void, typing = false) => { const next = structuredClone(draft.value); update(next); draft.change(next, typing); setMessage(''); };
  const save = async () => {
    const snapshot = draft.value;
    setBusy(true); setMessage('');
    try {
      const result = await saveLearningLayout(userId, document.id, draft.baseline, snapshot);
      if (!alive.current) return;
      if (draft.isCurrent(snapshot)) draft.accept(result.document.learning_workspace!, result.document.learning_workspace!.revision);
      else draft.rebaseline(result.document.learning_workspace!.revision);
      onUpdated?.(result.document);
      setMessage(result.persistence === 'queued' ? T('در صف همگام‌سازی؛ هنوز در ابر تأیید نشده.', 'Queued for sync; not yet confirmed in cloud.') : T('در فضای ابری ذخیره شد.', 'Saved to cloud.'));
    } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : T('ذخیره انجام نشد؛ پیش‌نویس حفظ شده.', 'Saving failed; draft retained.')); }
    finally { if (alive.current) setBusy(false); }
  };
  return <>
    <button type="button" disabled={!userId || userId === 'guest' || document.user_id !== userId || document.learning_workspace_unavailable} aria-label={T("چیدمان کارت‌ها", "Card layout")} title={T("چیدمان کارت‌ها", "Card layout")} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"><LayoutGrid className="h-4 w-4" /><span className="learning-tool-label hidden md:inline">{T('چیدمان کارت‌ها', 'Card layout')}</span></button>
    <Sheet open={open} onOpenChange={next => { if (!next) void draft.flush(); setOpen(next); }}>
      <SheetContent side={isEn ? 'right' : 'left'} className="w-full sm:max-w-2xl overflow-y-auto" dir={isEn ? 'ltr' : 'rtl'}>
        <SheetHeader><SheetTitle>{T('کارت‌های درس', 'Lesson cards')}</SheetTitle><SheetDescription>{T('پیش‌نمایش تبدیل و ویرایش چیدمان؛ متن علمی اصلی تغییر نمی‌کند. تطبیق دو زبان فقط با انتخاب شما انجام می‌شود.', 'Preview migration and edit layout. Original scientific text stays intact. Pair languages explicitly.')}</SheetDescription></SheetHeader>
        <div className="my-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setLanguage(other)}>{language === 'fa' ? 'English' : 'فارسی'}</Button>
          <Button size="sm" variant="outline" disabled={!draft.ready || busy} onClick={() => { const next = previewLearningMigration(document, draft.value); draft.accept(next, document.learning_workspace?.revision || ''); setMessage(T('پیش‌نمایش تازه آماده است؛ تغییرات را بررسی و سپس ذخیره کنید.', 'Updated preview ready. Review before saving.')); }}>{T('تازه‌سازی پیش‌نمایش', 'Refresh preview')}</Button>
          <Button size="sm" variant="outline" disabled={!draft.canUndo || busy} onClick={draft.undo} aria-label={T('بازگردانی', 'Undo')}><Undo2 className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" disabled={!draft.canRedo || busy} onClick={draft.redo} aria-label={T('انجام دوباره', 'Redo')}><Redo2 className="h-4 w-4" /></Button>
        </div>
        {draft.conflict && <div role="alert" className="mb-4 space-y-2 rounded-lg border p-3 text-sm"><p>{T('یک پیش‌نویس از نسخهٔ دیگر موجود است. پیش از ذخیره دوباره آن را بررسی کنید.', 'A draft from another revision exists. Review it before saving.')}</p><Button size="sm" onClick={draft.restore}>{T('بازیابی پیش‌نویس', 'Restore draft')}</Button><Button size="sm" variant="ghost" onClick={draft.dismissConflict}>{T('استفاده از نسخه فعلی', 'Use current version')}</Button></div>}
        <fieldset disabled={!draft.ready || busy || Boolean(draft.conflict)} className="space-y-3">
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={draft.value.enabled} onChange={event => change(next => { next.enabled = event.target.checked; })} />{T('نمایش کارت‌های جدید؛ خاموش‌کردن، نمای قدیمی را برمی‌گرداند.', 'Use the new cards. Turn off to restore the original presentation.')}</label>
          {visibleCards.map((card, visibleIndex) => {
            const original = sourceMap.get(card.sources[language]!);
            const protectedCard = original?.safetyProtected || original?.kind === 'safety';
            const index = draft.value.cards.findIndex(item => item.id === card.id);
            return <section key={card.id} className="space-y-3 rounded-xl border p-3" aria-label={card.titles[language]}>
              <label className="block text-xs">{T('نام مستقل کارت', 'Card title')}<input className="mt-1 w-full rounded-md border bg-background p-2 text-sm" value={card.titles[language] || ''} onChange={event => change(next => { next.cards[index].titles[language] = event.target.value; }, true)} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">{T('دسته', 'Group')}<select className="mt-1 w-full rounded-md border bg-background p-2" value={card.group} onChange={event => change(next => { next.cards[index].group = event.target.value as typeof card.group; })}>{learningGroups.map(group => <option key={group.id} value={group.id}>{T(group.fa, group.en)}</option>)}</select></label>
                <label className="text-xs">{T('چیدمان دسته', 'Group layout')}<select className="mt-1 w-full rounded-md border bg-background p-2" value={draft.value.groups[card.group] || 'grid'} onChange={event => change(next => { next.groups[card.group] = event.target.value as 'grid' | 'sequence' | 'fullWidth'; })}><option value="grid">{T('کارت‌های کنار هم', 'Grid')}</option><option value="sequence">{T('مراحل پشت سر هم', 'Sequence')}</option><option value="fullWidth">{T('تمام عرض', 'Full width')}</option></select></label>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Button type="button" size="sm" variant="ghost" disabled={visibleIndex === 0} onClick={() => change(next => { const previous = next.cards.findIndex(item => item.id === visibleCards[visibleIndex - 1].id); [next.cards[previous], next.cards[index]] = [next.cards[index], next.cards[previous]]; })} aria-label={T('کارت بالاتر', 'Move card up')}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" size="sm" variant="ghost" disabled={visibleIndex === visibleCards.length - 1} onClick={() => change(next => { const following = next.cards.findIndex(item => item.id === visibleCards[visibleIndex + 1].id); [next.cards[following], next.cards[index]] = [next.cards[index], next.cards[following]]; })} aria-label={T('کارت پایین‌تر', 'Move card down')}><ArrowDown className="h-4 w-4" /></Button>
                <label className="flex min-h-11 items-center gap-1"><input type="checkbox" disabled={Boolean(original?.wide)} checked={card.wide || Boolean(original?.wide)} onChange={event => change(next => { next.cards[index].wide = event.target.checked; })} />{T('کارت عریض', 'Wide card')}</label>
                <label className="flex min-h-11 items-center gap-1"><input type="checkbox" disabled={Boolean(protectedCard)} checked={card.hidden && !protectedCard} onChange={event => change(next => { next.cards[index].hidden = event.target.checked; })} />{T('حذف از نمایش؛ قابل بازیابی', 'Hide; recoverable')}</label>
              </div>
              {!card.sources[other] && <label className="block text-xs">{T('همتای تأییدشده در زبان دیگر (اختیاری)', 'Confirmed matching card in the other language (optional)')}<select className="mt-1 w-full rounded-md border bg-background p-2" value="" onChange={event => change(next => { const partner = next.cards.find(item => item.id === event.target.value); if (!partner) return; const target = next.cards.find(item => item.id === card.id)!; target.sources[other] = partner.sources[other]; target.titles[other] = partner.titles[other]; target.aliases.push(partner.id, ...partner.aliases); next.cards = next.cards.filter(item => item.id !== partner.id); })}><option value="">{T('بدون تطبیق خودکار', 'No automatic pairing')}</option>{draft.value.cards.filter(item => item.sources[other] && !item.sources[language]).map(item => <option key={item.id} value={item.id}>{item.titles[other]}</option>)}</select></label>}
              {original ? <details><summary className="min-h-11 cursor-pointer text-xs text-primary">{T('مقایسه با متن منبع', 'Compare with source')}</summary><div className="knowledge-html-content text-sm" dir={language === 'fa' ? 'rtl' : 'ltr'} dangerouslySetInnerHTML={{ __html: original.sourceHtml }} /></details> : <p role="status" className="text-xs text-muted-foreground">{T('این بخش منبع تغییر کرده؛ تازه‌سازی پیش‌نمایش لازم است. ارجاع قدیمی نگه داشته شده.', 'This source block changed. Refresh the preview. Its old reference is retained.')}</p>}
            </section>;
          })}
          <Button disabled={!draft.value.cards.length} onClick={() => void save()}>{busy ? T('در حال ذخیره…', 'Saving…') : T('تأیید پیش‌نمایش و ذخیره', 'Confirm preview and save')}</Button>
        </fieldset>
        <p role="status" className="mt-3 text-xs text-muted-foreground">{message || (draft.status === 'saved' ? T('پیش‌نویس در این دستگاه محفوظ است.', 'Draft saved on this device.') : draft.status === 'unavailable' ? T('ذخیرهٔ پیش‌نویس دستگاه در دسترس نیست؛ پیش از خروج در ابر ذخیره کنید.', 'Device draft storage unavailable. Save before leaving.') : T('در حال ذخیره پیش‌نویس…', 'Saving device draft…'))}</p>
      </SheetContent>
    </Sheet>
  </>;
}
