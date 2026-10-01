import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PharmacyLessonQuiz } from './PharmacyLessonQuiz';
vi.mock('@/hooks/useBilingual', () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));
const quiz = { questionHtml: '<p>Source question?</p>', options: [{ id: 'a', html: 'First choice' }, { id: 'b', html: 'Second choice' }], correctId: 'b', explanationHtml: '<p>Source explanation.</p>' };
describe('Pharmacy practice workflow', () => {
  it('requires a choice, hides the answer until submission, and supports retry', () => {
    render(<PharmacyLessonQuiz quiz={quiz} sourceHtml="<p>Complete source</p>" dir="ltr" className="prose" />);
    expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
    expect(screen.queryByText('Source explanation.')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /First choice/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText('Source explanation.')).toBeVisible();
    expect(screen.getByText('Correct answer')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('The correct answer is marked');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByText('Source explanation.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Original text & details' }));
    expect(screen.getByText('Complete source')).toBeVisible();
  });
  it('uses an already visible question title once, but preserves custom and rich questions', () => {
    const { rerender } = render(<PharmacyLessonQuiz quiz={quiz} sourceHtml="Source" dir="ltr" className="prose" visibleTitles={['Source question?']} />);
    expect(screen.queryByRole('heading', { name: 'Question' })).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    rerender(<PharmacyLessonQuiz quiz={quiz} sourceHtml="Source" dir="ltr" className="prose" visibleTitles={['A different title']} />);
    expect(screen.getByText('Source question?')).toBeVisible();
    rerender(<PharmacyLessonQuiz quiz={{ ...quiz, questionHtml: '<p>Source question?</p><table><tbody><tr><td>Essential data</td></tr></tbody></table>' }} sourceHtml="Source" dir="ltr" className="prose" visibleTitles={['Source question? Essential data']} />);
    expect(screen.getByText('Essential data')).toBeVisible();
  });
});
