import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw } from 'lucide-react';
import { useBilingual } from '@/hooks/useBilingual';
import { isTechnicalLessonField, normalizeLessonLabel } from '@/lib/lessonTemplates';
import type { LessonQuiz } from '@/lib/lessonQuiz';
import './LessonCardLayout.css';

export function PharmacyLessonQuiz({ quiz, sourceHtml, dir, className, visibleTitles = [], documentId, userId }: {
  quiz: LessonQuiz; sourceHtml: string; dir: 'rtl' | 'ltr'; className: string; visibleTitles?: (string | undefined)[]; documentId?: string; userId?: string;
}) {
  const { T } = useBilingual();
  const id = useId();
  const questionRoot = document.createElement('div'); questionRoot.innerHTML = quiz.questionHtml;
  const plainQuestion = !questionRoot.querySelector('img,table,a,ul,ol,pre,blockquote,video,audio');
  const questionInTitle = plainQuestion && visibleTitles.some(title => title && normalizeLessonLabel(title) === normalizeLessonLabel(questionRoot.textContent));
  const storageKey = userId && userId !== 'guest' && documentId ? `arshiam:lesson-practice:${userId}:${documentId}` : null;
  const [restored] = useState(() => {
    try {
      const value = storageKey ? JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') : null;
      return value && value.correctId === quiz.correctId && value.options === quiz.options.map(option => option.id).sort().join('|') && quiz.options.some(option => option.id === value.selected) ? value : null;
    } catch { return null; }
  });
  const [selected, setSelected] = useState<string | null>(restored?.selected ?? null);
  const [submitted, setSubmitted] = useState(restored?.submitted === true);
  useEffect(() => {
    if (!storageKey) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ selected, submitted, correctId: quiz.correctId, options: quiz.options.map(option => option.id).sort().join('|') })); }
    catch { /* Practice remains usable when browser storage is unavailable. */ }
  }, [storageKey, selected, submitted, quiz]);
  const sourceRoot = document.createElement('div'); sourceRoot.innerHTML = sourceHtml;
  const metadataHtml = Array.from(sourceRoot.querySelectorAll('.knowledge-card > dl > div')).filter(field => {
    const label = normalizeLessonLabel(field.querySelector(':scope > dt')?.textContent || '');
    return isTechnicalLessonField(label) && (submitted || !['correct option id', 'شناسه گزینه درست'].includes(label));
  }).map(field => field.outerHTML).join('');
  const feedbackRef = useRef<HTMLElement>(null);
  useEffect(() => { if (submitted) feedbackRef.current?.focus(); }, [submitted]);
  const correct = selected === quiz.correctId;
  return <div className="lesson-card-layout lesson-quiz" dir={dir} data-testid="pharmacy-lesson-quiz">
    <div className="lesson-card-layout__toolbar">
      <span className="lesson-card-layout__summary"><CircleHelp aria-hidden="true" />{T('تمرین از محتوای همین درس', 'Practice from this lesson')}</span>

    </div>
    <>
      <div className={`lesson-quiz__grid ${questionInTitle ? "lesson-quiz__grid--title-question" : ""}`}>
        {!questionInTitle && <section className="lesson-content-card" aria-labelledby={`${id}-question`}>
          <h2 id={`${id}-question`} className="lesson-quiz__heading">{T('پرسش', 'Question')}</h2>
          <div className={className} dangerouslySetInnerHTML={{ __html: quiz.questionHtml }} />
        </section>}
        <form className="lesson-content-card" onSubmit={event => { event.preventDefault(); if (selected) setSubmitted(true); }}>
          <fieldset disabled={submitted} className="lesson-quiz__options">
            <legend className="lesson-quiz__heading">{T('یک پاسخ انتخاب کن', 'Choose one answer')}</legend>
            <div className="lesson-quiz__option-grid">{quiz.options.map((option, index) => <label key={option.id} className={`lesson-quiz__option ${submitted && option.id === quiz.correctId ? 'lesson-quiz__option--correct' : ''}`}>
              <input type="radio" name={`${id}-answer`} value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} />
              <span className="lesson-quiz__option-number" aria-hidden="true">{index + 1}</span>
              <span dir="auto" className={className} dangerouslySetInnerHTML={{ __html: option.html }} />
              {submitted && option.id === quiz.correctId && <span className="lesson-quiz__correct-label"><CheckCircle2 aria-hidden="true" />{T('پاسخ درست', 'Correct answer')}</span>}
            </label>)}</div>
          </fieldset>
          {!submitted && <button type="submit" className="lesson-quiz__submit" disabled={!selected}>{T('بررسی پاسخ', 'Check answer')}</button>}
          {submitted && <button type="button" className="lesson-quiz__source" onClick={() => { setSubmitted(false); setSelected(null); }}><RotateCcw aria-hidden="true" />{T('تمرین دوباره', 'Try again')}</button>}
        </form>
      </div>
      {submitted && <section ref={feedbackRef} tabIndex={-1} className="lesson-content-card lesson-quiz__feedback" aria-labelledby={`${id}-feedback`}>
        <h2 id={`${id}-feedback`} className="lesson-quiz__heading" role="status">{correct ? T('پاسخت درست است', 'Your answer is correct') : T('پاسخ درست مشخص شده است؛ توضیح را بخوان', 'The correct answer is marked; read the explanation')}</h2>
        <div className={className} dangerouslySetInnerHTML={{ __html: quiz.explanationHtml }} />
      </section>}
    </>
    {metadataHtml && <details className="lesson-card-layout__metadata"><summary>{T('مشخصات مبدأ', 'Source metadata')}</summary><dl className={className} dangerouslySetInnerHTML={{ __html: metadataHtml }} /></details>}
  </div>;
}
