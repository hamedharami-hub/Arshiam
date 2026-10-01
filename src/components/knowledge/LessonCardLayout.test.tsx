import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { KnowledgeSectionContent } from './KnowledgeSectionContent';
vi.mock('@/hooks/useBilingual', () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));
const html = '<div class="knowledge-card"><section><h2>Mechanism</h2><p>Preserved scientific text.</p></section><section><h2>Warning</h2><p>Essential warning.</p></section><section><h2>Example</h2><p>Worked example.</p></section><dl><div><dt>ID</dt><dd>source-id</dd></div></dl></div>';
describe('multi-card lesson workflow', () => {
  beforeEach(() => window.history.replaceState(null, '', '/app/knowledge?docId=d1'));
  it('groups named cards, keeps safety visible when filtering and offers the exact original document', () => {
    render(<KnowledgeSectionContent multiCard html={html} dir="ltr" className="knowledge-html-content" />);
    expect(screen.getByTestId('lesson-card-layout')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Practice & connections' }));
    expect(screen.getByText('Worked example.')).toBeVisible();
    expect(screen.getByText('Essential warning.')).toBeVisible();
    expect(screen.queryByText('Preserved scientific text.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Original text' }));
    expect(screen.getByTestId('lesson-original-text').innerHTML).toBe(html);
    expect(screen.getByText('source-id')).toBeVisible();
  });
  it('keeps ordinary Knowledge documents on their existing presentation', () => {
    render(<KnowledgeSectionContent html={html} dir="ltr" className="knowledge-html-content" />);
    expect(screen.queryByTestId('lesson-card-layout')).toBeNull();
  });
  it('links to a named card without dropping the document or other URL parameters', () => {
    render(<KnowledgeSectionContent multiCard html={html} dir="ltr" className="knowledge-html-content" />);
    fireEvent.click(screen.getByRole('link', { name: 'Mechanism' }));
    const params = new URLSearchParams(window.location.search);
    expect(params.get('docId')).toBe('d1');
    expect(params.get('card')).toMatch(/^card-/);
  });
});
