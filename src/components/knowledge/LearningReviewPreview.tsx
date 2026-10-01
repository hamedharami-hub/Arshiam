import { learningQuestionVersion } from "@/lib/learningWorkspace";
import { getPendingOps } from "@/lib/offlineQueue";
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBilingual } from '@/hooks/useBilingual';
import { useLearningDraft } from '@/hooks/useLearningDraft';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { createLeitnerCardWithReceipt, getLeitnerCards, updateLeitnerCard } from '@/lib/leitnerService';
import { saveLearningRecord } from '@/lib/learningWorkspaceService';
import type { KnowledgeDocument } from '@/lib/knowledgeTypes';
import type { LearningQuestion } from '@/lib/learningWorkspace';

export function LearningReviewPreview({ document, question, userId, onUpdated, onClose }: { document: KnowledgeDocument; question: LearningQuestion; userId: string; onUpdated?: (document: KnowledgeDocument) => void; onClose: () => void }) {
  const { T } = useBilingual();
  const draft = useLearningDraft(`learning-review:${userId}:${question.id}`, { front: question.prompt, back: [question.type === 'choice' ? question.options.find(option => option.id === question.correct_id)?.text : question.answer, question.explanation].filter(Boolean).join('\n\n') }, question.updated_at);
  const [linkedId, setLinkedId] = useState(question.review_card_id);
  const expectedRevision = useRef(question.updated_at);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const confirm = async () => {
    if (!draft.ready || draft.conflict || !draft.value.front.trim() || !draft.value.back.trim()) return;
    setBusy(true); const snapshot = draft.value;
    try {
      let receipt;
      if (linkedId) {
        const existing = (await getLeitnerCards(userId)).find(card => card.id === linkedId);
        if (!existing) { setMissing(true); throw new Error(T('کارت مرور حذف شده است؛ سؤال حفظ شده. ارتباط را پس از بررسی دوباره بسازید.', 'Review card is missing. The question is retained; inspect its link before recreating it.')); }
        const card = await updateLeitnerCard(userId, existing.id, { front: snapshot.front, back: snapshot.back, source_question_version: learningQuestionVersion(question), source_anchor: question.anchor });
        const pending = await getPendingOps('leitner_cards');
        receipt = { card, persistence: pending.some(operation => operation.ownerId === userId && (operation.payload as { id?: string })?.id === card.id) ? 'queued' as const : 'synced' as const };
      } else receipt = await createLeitnerCardWithReceipt(userId, { front: snapshot.front, back: snapshot.back, document_id: document.id, folder_id: document.folder_id, idempotency_key: question.id, source_card_id: question.anchor.card_id, source_question_id: question.id, source_question_version: learningQuestionVersion(question), source_anchor: question.anchor });
      const linked = { ...question, review_card_id: receipt.card.id, updated_at: new Date().toISOString() };
      const result = await saveLearningRecord(userId, document.id, 'questions', linked, expectedRevision.current);
      if (!alive.current) return;
      expectedRevision.current = linked.updated_at; setLinkedId(receipt.card.id);
      onUpdated?.(result.document);
      if (draft.isCurrent(snapshot)) draft.accept(snapshot, linked.updated_at); else draft.rebaseline(linked.updated_at);
      setMessage(receipt.persistence === 'queued' || result.persistence === 'queued' ? T('کارت و ارتباط محفوظ‌اند؛ وضعیت همگام‌سازی را در مرور بررسی کنید.', 'Card and link retained. Check sync status in Review.') : T('یک کارت مشترک برای لایتنر و نقشهٔ ذهنی ذخیره شد.', 'One shared card saved for Leitner and Mind Map.'));
    } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : T('ذخیره نشد؛ دوباره تلاش کنید.', 'Not saved. Retry.')); }
    finally { if (alive.current) setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open) { void draft.flush(); onClose(); } }}><DialogContent><DialogHeader><DialogTitle>{T('پیش‌نمایش کارت مرور', 'Review card preview')}</DialogTitle><DialogDescription>{T('سؤال حفظ می‌شود. فقط با تأیید تو، همین کارت در لایتنر و نقشه ذهنی استفاده خواهد شد. ویرایش، برنامهٔ مرور قبلی را تغییر نمی‌دهد.', 'The question is retained. Confirm to use one card in Leitner and Mind Map. Editing retains its existing review schedule.')}</DialogDescription></DialogHeader>
    {draft.conflict && <div role="alert" className="text-xs"><p>{T('سؤال تغییر کرده؛ پیش‌نویس قبلی را بررسی کن.', 'The question changed. Review the previous draft.')}</p><Button size="sm" onClick={draft.restore}>{T('بازیابی', 'Restore')}</Button><Button size="sm" variant="ghost" onClick={draft.dismissConflict}>{T('نسخه فعلی', 'Current version')}</Button></div>}
    {missing && <Button variant="outline" disabled={busy} onClick={() => { setLinkedId(undefined); setMissing(false); setMessage(T('پیش‌نمایش را بررسی و برای ساخت مجدد تأیید کن.', 'Review the preview and confirm recreation.')); }}>{T('آماده‌سازی ساخت مجدد کارت حذف‌شده', 'Prepare to recreate missing card')}</Button>}
    <div className="flex gap-2"><Button size="sm" variant="ghost" disabled={!draft.canUndo || busy} onClick={draft.undo}>{T('بازگردانی', 'Undo')}</Button><Button size="sm" variant="ghost" disabled={!draft.canRedo || busy} onClick={draft.redo}>{T('انجام دوباره', 'Redo')}</Button></div>
    <fieldset disabled={!draft.ready || busy || Boolean(draft.conflict)} className="space-y-3"><label className="block text-xs">{T('روی کارت', 'Front')}<textarea className="w-full rounded-md border bg-background p-2 text-sm" value={draft.value.front} onChange={event => draft.change(previous => ({ ...previous, front: event.target.value }), true)} /></label><label className="block text-xs">{T('پشت کارت', 'Back')}<textarea className="w-full rounded-md border bg-background p-2 text-sm" value={draft.value.back} onChange={event => draft.change(previous => ({ ...previous, back: event.target.value }), true)} /></label><Button onClick={() => void confirm()}>{linkedId ? T('تأیید ویرایش کارت مشترک', 'Confirm shared card edit') : T('تأیید افزودن به مرور', 'Confirm add to review')}</Button></fieldset>
    <p role="status" className="text-xs text-muted-foreground">{message || (draft.status === 'saved' ? T('پیش‌نویس در دستگاه محفوظ است.', 'Device draft retained.') : T('پیش‌نویس هنوز در دستگاه تأیید نشده.', 'Device draft not yet confirmed.'))}</p><Button variant="ghost" asChild><Link to={`/app/review?docId=${encodeURIComponent(document.id)}`}>{T('بازکردن مرور', 'Open review')}</Link></Button>
  </DialogContent></Dialog>;
}
