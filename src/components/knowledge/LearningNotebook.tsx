import { forwardRef, lazy, Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, FileQuestion, Redo2, StickyNote, Undo2 } from 'lucide-react';
import { useBilingual } from '@/hooks/useBilingual';
import { useLearningDraft } from '@/hooks/useLearningDraft';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { captureLearningAnchor, learningId, learningSourceUrl, learningVersion, type LearningAnchor, type LearningNote, type LearningQuestion } from '@/lib/learningWorkspace';
import { saveLearningRecord } from '@/lib/learningWorkspaceService';
import { generateQuestionsFromText } from '@/lib/knowledgeQuestionGenerator';
import { sanitizeKnowledgeHtml } from '@/lib/knowledgeHtmlSanitizer';
import type { KnowledgeDocument } from '@/lib/knowledgeTypes';
import { LearningReviewPreview } from './LearningReviewPreview';
const RichEditor = lazy(() => import('@/components/RichEditor').then(module => ({ default: module.RichEditor })));
export interface LearningNotebookHandle { addNote: (text: string) => void; addQuestion: (text: string) => void }
const plain = (html: string) => { const element = window.document.createElement('div'); element.innerHTML = sanitizeKnowledgeHtml(html); return element.textContent || ''; };

export const LearningNotebook = forwardRef<LearningNotebookHandle, { document: KnowledgeDocument; userId: string; onUpdated?: (document: KnowledgeDocument) => void; onGenerateReview: (text: string, anchor?: LearningAnchor) => void; language: 'fa' | 'en'; containerRef: React.RefObject<HTMLDivElement | null> }>(function LearningNotebook({ document, userId, onUpdated, onGenerateReview, language, containerRef }, ref) {
  const { T, isEn } = useBilingual();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('notes');
  const [editor, setEditor] = useState<{ kind: 'notes' | 'questions'; record?: LearningNote | LearningQuestion; anchor: LearningAnchor } | null>(null);
  const [review, setReview] = useState<LearningQuestion | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [message, setMessage] = useState('');
  const notes = document.learning_workspace?.notes || [];
  const questions = document.learning_workspace?.questions || [];
  const eligible = Boolean(userId) && userId !== 'guest' && document.user_id === userId && !document.learning_workspace_unavailable;
  const openNew = (kind: 'notes' | 'questions', text: string, supplied?: LearningAnchor) => {
    const selected = window.getSelection()?.anchorNode?.parentElement?.closest<HTMLElement>('[data-learning-language]')?.dataset.learningLanguage;
    const selectedLanguage = selected === 'fa' || selected === 'en' ? selected : language;
    const anchor = supplied || captureLearningAnchor(document, selectedLanguage, text);
    setTab(kind); setEditor({ kind, anchor }); setOpen(true);
  };
  useImperativeHandle(ref, () => ({ addNote: text => openNew('notes', text), addQuestion: text => openNew('questions', text) }));
  const incoming = searchParams.get('question') || searchParams.get('annotation');
  useEffect(() => { if (incoming && searchParams.get('docId') === document.id) { setTab(searchParams.has('question') ? 'questions' : 'notes'); setOpen(true); } }, [incoming, searchParams, document.id]);
  const source = (anchor: LearningAnchor) => {
    const url = new URL(learningSourceUrl(document.id, anchor.card_id, undefined, anchor.language), window.location.origin);
    if (!anchor.card_id) url.searchParams.set('lessonTab', 'source');
    window.history.pushState({ ...window.history.state, idx: (window.history.state?.idx || 0) + 1 }, '', url);
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    setOpen(false);
    if (anchor.version !== learningVersion(anchor.language === 'fa' ? document.content_html : document.content_en)) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const canonicalId = document.learning_workspace?.cards.find(card => card.id === anchor.card_id || card.aliases.includes(anchor.card_id || ""))?.id || anchor.card_id;
      const root = canonicalId ? Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[data-lesson-card]') || []).find(element => element.dataset.lessonCard === canonicalId)?.querySelector('.lesson-content-card__body') : containerRef.current;
      if (!root || !anchor.quote) return;
      const walker = window.document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = []; let combined = '', node: Node | null;
      while ((node = walker.nextNode())) { nodes.push(node as Text); combined += node.textContent; }
      const start = combined.indexOf(anchor.quote);
      if (start < 0 || combined.indexOf(anchor.quote, start + 1) >= 0) return;
      const range = window.document.createRange(); let offset = 0;
      for (const text of nodes) { if (start >= offset && start < offset + text.length) range.setStart(text, start - offset); if (start + anchor.quote.length > offset && start + anchor.quote.length <= offset + text.length) { range.setEnd(text, start + anchor.quote.length - offset); break; } offset += text.length; }
      range.startContainer.parentElement?.scrollIntoView({ block: 'center' });
      window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(range);
    }));
  };
  const mutateDeleted = async (kind: 'notes' | 'questions', record: LearningNote | LearningQuestion) => {
    try {
      const updated = { ...record, deleted: !record.deleted, updated_at: new Date().toISOString() };
      const result = kind === 'notes' ? await saveLearningRecord(userId, document.id, kind, updated as LearningNote, record.updated_at) : await saveLearningRecord(userId, document.id, kind, updated as LearningQuestion, record.updated_at);
      onUpdated?.(result.document); setMessage(result.persistence === 'queued' ? T('تغییر در صف همگام‌سازی است.', 'Change queued for sync.') : T('ذخیره شد.', 'Saved.'));
    } catch (error) { setMessage(error instanceof Error ? error.message : T('ذخیره نشد.', 'Saving failed.')); }
  };
  return <>
    <button type="button" disabled={!eligible} aria-label={T('یادداشت و سؤال', 'Notes & questions')} title={T('یادداشت و سؤال', 'Notes & questions')} onClick={() => { setOpen(true); setEditor(null); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"><StickyNote className="h-4 w-4" /><span className="learning-tool-label hidden md:inline">{T('یادداشت و سؤال', 'Notes & questions')}</span>{notes.some(note => !note.deleted) || questions.some(question => !question.deleted) ? <span>({notes.filter(note => !note.deleted).length + questions.filter(question => !question.deleted).length})</span> : null}</button>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side={isEn ? 'right' : 'left'} className="w-full sm:max-w-2xl overflow-y-auto" dir={isEn ? 'ltr' : 'rtl'}>
      <SheetHeader><SheetTitle>{T('دفتر درس', 'Lesson notebook')}</SheetTitle><SheetDescription>{T('یادداشت و سؤال به همین درس و متن انتخاب‌شده متصل‌اند. سؤال بدون انتخاب جداگانه به مرور اضافه نمی‌شود.', 'Notes and questions link to this lesson and selected text. Adding to review is a separate choice.')}</SheetDescription></SheetHeader>
      {incoming && !(searchParams.has('question') ? questions : notes).some(record => record.id === incoming && !record.deleted) && <p role="status" className="mt-3 text-sm text-muted-foreground">{T('این یادداشت یا سؤال حذف شده یا در این نسخه موجود نیست. متن منبع حفظ شده؛ حذف‌شده‌ها را هم می‌توانی بررسی کنی.', 'This note or question is deleted or unavailable in this revision. Source text remains available; you can also check deleted records.')}</p>}
      <Tabs value={tab} onValueChange={value => { setTab(value); setEditor(null); }} className="mt-4"><TabsList><TabsTrigger value="notes">{T('یادداشت‌ها', 'Notes')}</TabsTrigger><TabsTrigger value="questions">{T('سؤال‌ها', 'Questions')}</TabsTrigger></TabsList>
        <div className="my-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!eligible} onClick={() => openNew(tab === 'notes' ? 'notes' : 'questions', '')}>{T('افزودن', 'Add')}</Button><Button size="sm" variant="ghost" onClick={() => setShowDeleted(value => !value)}>{showDeleted ? T('موارد فعال', 'Active records') : T('بازیابی حذف‌شده‌ها', 'Recover deleted')}</Button></div>
        {editor && <LearningRecordEditor key={`${userId}:${document.id}:${editor.kind}:${editor.record?.id || 'new'}:${editor.anchor.quote}`} document={document} userId={userId} kind={editor.kind} record={editor.record} anchor={editor.anchor} onUpdated={updated => { onUpdated?.(updated); }} onSaved={() => setEditor(null)} />}
        <TabsContent value="notes" className="space-y-3">{notes.filter(note => Boolean(note.deleted) === showDeleted).map(note => <article key={note.id} className="rounded-xl border p-3 space-y-2" data-learning-record={note.id}>
          <h3 className="font-semibold">{note.title}</h3><div className="knowledge-html-content text-sm" dangerouslySetInnerHTML={{ __html: sanitizeKnowledgeHtml(note.html) }} />
          <AnchorSummary anchor={note.anchor} document={document} onSource={() => source(note.anchor)} />
          <div className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" onClick={() => setEditor({ kind: 'notes', record: note, anchor: note.anchor })}>{T('ویرایش', 'Edit')}</Button><Button size="sm" variant="ghost" onClick={() => openNew('questions', note.anchor.quote || plain(note.html), { ...note.anchor, note_id: note.id })}>{T('ساخت سؤال', 'Create question')}</Button><Button size="sm" variant="ghost" onClick={() => onGenerateReview(plain(note.html), { ...note.anchor, note_id: note.id })}>{T('ساخت کارت مرور', 'Create review card')}</Button><Button size="sm" variant="ghost" onClick={() => void mutateDeleted('notes', note)}>{note.deleted ? T('بازیابی', 'Restore') : T('حذف', 'Delete')}</Button></div>
        </article>)}</TabsContent>
        <TabsContent value="questions" className="space-y-3">{questions.filter(question => Boolean(question.deleted) === showDeleted).map(question => <article key={question.id} className={`rounded-xl border p-3 space-y-2 ${incoming === question.id ? 'ring-2 ring-primary' : ''}`} data-learning-record={question.id}>
          <QuestionPractice key={`${question.id}:${question.updated_at}`} question={question} userId={userId} />
          <AnchorSummary anchor={question.anchor} document={document} onSource={() => source(question.anchor)} />
          <div className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" onClick={() => setEditor({ kind: 'questions', record: question, anchor: question.anchor })}>{T('ویرایش', 'Edit')}</Button><Button size="sm" variant="outline" onClick={() => setReview(question)}>{question.review_card_id ? T('بررسی کارت مرور', 'Review linked card') : T('افزودن به مرور', 'Add to review')}</Button><Button size="sm" variant="ghost" onClick={() => void mutateDeleted('questions', question)}>{question.deleted ? T('بازیابی', 'Restore') : T('حذف', 'Delete')}</Button></div>
        </article>)}</TabsContent>
      </Tabs><p role="status" className="mt-3 text-xs text-muted-foreground">{message || (document._expected_learning_revision !== undefined ? T("دفتر درس در صف همگام‌سازی است؛ هنوز در ابر تأیید نشده.", "Notebook queued for sync; not yet confirmed in cloud.") : "")}</p>
    </SheetContent></Sheet>
    {review && <LearningReviewPreview key={`${userId}:${review.id}`} document={document} userId={userId} question={review} onClose={() => setReview(null)} onUpdated={onUpdated} />}
  </>;
});
function AnchorSummary({ anchor, document, onSource }: { anchor: LearningAnchor; document: KnowledgeDocument; onSource: () => void }) {
  const { T } = useBilingual(); const changed = anchor.version !== learningVersion(anchor.language === 'fa' ? document.content_html : document.content_en);
  return <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">{anchor.quote && <blockquote className="max-h-28 overflow-y-auto border-s-2 ps-2" dir="auto">{anchor.quote}</blockquote>}{changed && <p role="status">{T('نسخهٔ منبع تغییر کرده؛ جای متن باید دوباره بررسی شود.', 'Source revision changed. Recheck this text location.')}</p>}<button type="button" className="inline-flex min-h-11 items-center gap-1 text-primary" onClick={onSource}><BookOpen className="h-3.5 w-3.5" />{T('نمایش منبع', 'Show source')}</button></div>;
}
function QuestionPractice({ question, userId }: { question: LearningQuestion; userId: string }) {
  const { T } = useBilingual(); const key = `learning-answer:${userId}:${question.id}:${question.updated_at}`;
  const [answer, setAnswer] = useState(() => { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } });
  const [shown, setShown] = useState(false);
  const change = (value: string) => { setAnswer(value); try { sessionStorage.setItem(key, value); } catch { /* No grade/progress is persisted by this exercise. */ } };
  return <><h3 className="font-semibold" dir="auto">{question.prompt}</h3>{question.type === 'choice' ? <fieldset className="space-y-1" disabled={shown}><legend className="sr-only">{T('گزینه‌ها', 'Options')}</legend>{question.options.map(option => <label key={option.id} className="flex min-h-11 items-center gap-2 rounded-lg border px-2 text-sm"><input type="radio" name={key} checked={answer === option.id} onChange={() => change(option.id)} />{option.text}</label>)}</fieldset> : <textarea className="w-full rounded-lg border bg-background p-2 text-sm" value={answer} onChange={event => change(event.target.value)} placeholder={T('پاسخ خودت', 'Your answer')} />}
    <Button size="sm" variant="outline" onClick={() => setShown(value => !value)}>{shown ? T('پنهان‌کردن پاسخ', 'Hide answer') : T('دیدن پاسخ ثبت‌شده', 'Show saved answer')}</Button>{shown && <div className="rounded-lg bg-muted p-3 text-sm" dir="auto"><p>{question.type === 'choice' ? `${answer === question.correct_id ? T('گزینهٔ درست', 'Correct option') : T('گزینهٔ ثبت‌شدهٔ درست', 'Saved correct option')}: ${question.options.find(option => option.id === question.correct_id)?.text}` : question.answer}</p><p className="mt-2 text-muted-foreground">{question.explanation}</p><p className="mt-2 text-xs">{T('سؤال تأییدشده توسط کاربر؛ ارزیابی یا توصیهٔ درمانی نیست.', 'User-confirmed question; not clinical assessment or treatment advice.')}</p></div>}</>;
}
function LearningRecordEditor({ document, userId, kind, record, anchor, onUpdated, onSaved }: { document: KnowledgeDocument; userId: string; kind: 'notes' | 'questions'; record?: LearningNote | LearningQuestion; anchor: LearningAnchor; onUpdated: (document: KnowledgeDocument) => void; onSaved: () => void }) {
  const { T } = useBilingual();
  const initial = useMemo<LearningNote | LearningQuestion>(() => record || (kind === 'notes' ? { id: learningId('ln'), title: '', html: '', anchor, updated_at: '' } : { id: learningId('lq'), type: 'short', prompt: '', answer: anchor.quote, explanation: '', options: ['a', 'b', 'c', 'd'].map(id => ({ id, text: '' })), correct_id: '', anchor, updated_at: '' }), []);
  const draft = useLearningDraft(`learning-${kind}:${userId}:${document.id}:${record?.id || 'new'}`, initial, record?.updated_at || `${anchor.version}:${learningVersion(anchor.quote)}`);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const savedRevision = useRef('');
  const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  const change = (patch: Partial<LearningNote & LearningQuestion>, typing = true) => draft.change(previous => ({ ...previous, ...patch }), typing);
  const note = draft.value as LearningNote; const question = draft.value as LearningQuestion;
  const save = async () => {
    if (!draft.ready || draft.conflict) return;
    const snapshot = draft.value;
    if (kind === 'notes' ? !note.title.trim() || !plain(note.html).trim() && !/<(img|audio|video|a)\b/i.test(note.html) : !question.prompt.trim() || (question.type === 'short' ? !question.answer.trim() : question.options.filter(option => option.text.trim()).length < 2 || !question.options.some(option => option.id === question.correct_id && option.text.trim()))) { setMessage(T('نام/متن یا پرسش/پاسخ معتبر را کامل کن.', 'Complete a valid title/body or question/answer.')); return; }
    setBusy(true); setMessage('');
    const saved = { ...snapshot, updated_at: new Date().toISOString(), ...(kind === 'questions' && question.type === 'choice' ? { options: question.options.filter(option => option.text.trim()) } : {}) };
    try {
      const expectedRevision = record ? draft.baseline : savedRevision.current;
      const result = kind === 'notes' ? await saveLearningRecord(userId, document.id, kind, saved as LearningNote, expectedRevision) : await saveLearningRecord(userId, document.id, kind, saved as LearningQuestion, expectedRevision);
      if (!alive.current) return;
      if (!record) savedRevision.current = saved.updated_at;
      onUpdated(result.document);
      if (draft.isCurrent(snapshot)) { if (!record) await draft.clear(); else draft.accept(saved, saved.updated_at); onSaved(); }
      else draft.rebaseline(saved.updated_at);
      setMessage(result.persistence === 'queued' ? T('در صف همگام‌سازی است.', 'Queued for sync.') : T('در ابر ذخیره شد.', 'Saved to cloud.'));
    } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : T('ذخیره نشد؛ پیش‌نویس باقی است.', 'Not saved; draft retained.')); }
    finally { if (alive.current) setBusy(false); }
  };
  const suggest = async () => {
    if (draft.value.anchor.quote.trim().length < 40) { setMessage(T('متن منبع برای پیشنهاد کافی نیست؛ سؤال و پاسخ را خودت وارد کن.', 'Source excerpt is too short. Enter the question and answer manually.')); return; }
    setBusy(true); const snapshot = draft.value;
    request.current?.abort(); request.current = new AbortController();
    try { const results = await generateQuestionsFromText({ signal: request.current.signal, text: snapshot.anchor.quote, documentTitle: document.title, count: 1, mode: 'auto' }); if (!alive.current || !draft.isCurrent(snapshot)) return; if (results[0]) { change({ prompt: (snapshot.anchor.language === 'fa' ? results[0].front_fa : results[0].front_en) || results[0].front, answer: (snapshot.anchor.language === 'fa' ? results[0].back_fa : results[0].back_en) || results[0].back }, false); setMessage(T('پیشنهاد آماده است؛ با منبع مقایسه کن و سپس تأیید کن.', 'Suggestion ready. Compare with the source before confirming.')); } else setMessage(T('از منبع سؤال قابل اتکایی استخراج نشد.', 'No usable source question was extracted.')); }
    catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : T('تولید انجام نشد.', 'Generation failed.')); }
    finally { if (alive.current) setBusy(false); }
  };
  const input = 'w-full rounded-md border bg-background p-2 text-sm';
  return <section className="my-4 rounded-xl border border-primary/30 p-3 space-y-3">
    <div className="flex items-center gap-2"><h3 className="flex-1 font-semibold">{kind === 'notes' ? T('یادداشت', 'Note') : T('پیش‌نمایش سؤال', 'Question preview')}</h3><Button size="sm" variant="ghost" disabled={!draft.canUndo || busy} onClick={draft.undo} aria-label={T('بازگردانی', 'Undo')}><Undo2 className="h-4 w-4" /></Button><Button size="sm" variant="ghost" disabled={!draft.canRedo || busy} onClick={draft.redo} aria-label={T('انجام دوباره', 'Redo')}><Redo2 className="h-4 w-4" /></Button></div>
    {draft.conflict && <div role="alert" className="text-xs"><p>{T('نسخهٔ منبع یا رکورد تغییر کرده؛ پیش‌نویس قدیمی را آگاهانه بازیابی کن.', 'Source or record changed. Restore the older draft only after reviewing it.')}</p><Button size="sm" onClick={draft.restore}>{T('بازیابی', 'Restore')}</Button><Button size="sm" variant="ghost" onClick={draft.dismissConflict}>{T('نسخه فعلی', 'Current version')}</Button></div>}
    <fieldset disabled={!draft.ready || busy || Boolean(draft.conflict)} className="space-y-3">
      {kind === 'notes' ? <><label className="block text-xs">{T('عنوان', 'Title')}<input className={input} value={note.title} onChange={event => change({ title: event.target.value })} /></label><Suspense fallback={<p>{T('در حال بارگذاری ویرایشگر…', 'Loading editor…')}</p>}><RichEditor initialHtml={note.html} controlledHtml={note.html} readOnly={!draft.ready || busy || Boolean(draft.conflict)} attachmentScopeId={`learning:${document.id}:${note.id}`} onChange={html => change({ html })} onAttachmentUploaded={media => draft.change(previous => ({ ...previous, media: [...((previous as LearningNote).media || []), media] }), false)} /></Suspense></> : <>
        <label className="block text-xs">{T('نوع سؤال', 'Question type')}<select className={input} value={question.type} onChange={event => change({ type: event.target.value as LearningQuestion['type'] }, false)}><option value="short">{T('پاسخ کوتاه', 'Short answer')}</option><option value="choice">{T('چندگزینه‌ای', 'Multiple choice')}</option></select></label>
        <label className="block text-xs">{T('صورت سؤال', 'Question')}<textarea className={input} value={question.prompt} onChange={event => change({ prompt: event.target.value })} /></label>
        {question.type === 'short' ? <label className="block text-xs">{T('پاسخ ثبت‌شده', 'Saved answer')}<textarea className={input} value={question.answer} onChange={event => change({ answer: event.target.value })} /></label> : <fieldset className="space-y-2"><legend className="text-xs">{T('گزینه‌ها و کلید پاسخ؛ دست‌کم دو گزینه', 'Options and answer key; at least two options')}</legend>{question.options.map((option, index) => <label key={option.id} className="flex items-center gap-2 text-xs"><input type="radio" name={question.id} checked={question.correct_id === option.id} onChange={() => change({ correct_id: option.id }, false)} /><input className={input} value={option.text} aria-label={T(`گزینه ${index + 1}`, `Option ${index + 1}`)} onChange={event => change({ options: question.options.map(item => item.id === option.id ? { ...item, text: event.target.value } : item) })} /></label>)}</fieldset>}
        <label className="block text-xs">{T('توضیح پاسخ', 'Answer explanation')}<textarea className={input} value={question.explanation} onChange={event => change({ explanation: event.target.value })} /></label>
        <details><summary className="min-h-11 cursor-pointer text-xs text-primary">{T('پیشنهاد با هوش مصنوعی', 'Suggest with AI')}</summary><p className="my-2 text-xs text-muted-foreground">{T('با درخواست تو، متن منبع و عنوان به سرویس AI انتخاب‌شده ارسال می‌شود. خروجی فقط پیش‌نمایش است؛ ممکن است هزینه داشته باشد.', 'On request, the source excerpt and title are sent to your selected AI service. Output is a preview and may incur cost.')}</p><Button size="sm" variant="outline" onClick={() => void suggest()}>{T('پیشنهاد سؤال از منبع', 'Suggest a source question')}</Button></details>
      </>}
      <blockquote className="max-h-28 overflow-y-auto border-s-2 ps-2 text-xs text-muted-foreground" dir="auto">{draft.value.anchor.quote}</blockquote>
      <Button onClick={() => void save()}>{T('تأیید و ذخیره', 'Confirm and save')}</Button>
    </fieldset>
    <p role="status" className="text-xs text-muted-foreground">{message || (draft.status === 'saved' ? T('پیش‌نویس دستگاه ذخیره شده.', 'Device draft saved.') : draft.status === 'saving' ? T('در حال ذخیره پیش‌نویس…', 'Saving device draft…') : T('ذخیره پیش‌نویس دستگاه در دسترس نیست.', 'Device draft storage unavailable.'))}</p>
  </section>;
}
