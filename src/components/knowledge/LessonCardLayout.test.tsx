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
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Practice & connections' }), { button: 0, ctrlKey: false });
    expect(screen.getByText('Worked example.')).toBeVisible();
    expect(screen.queryByText('Essential warning.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Read warnings' }));
    expect(screen.getByText('Essential warning.')).toBeVisible();
    expect(screen.queryByText('Preserved scientific text.')).toBeNull();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Original text' }), { button: 0, ctrlKey: false });
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
  it('keeps embedded safety and interaction cards visible when another group is selected', () => {
    const source = '<div class="knowledge-card"><section><h2>Milestones</h2><dl><div><dt>Safety</dt><dd>Essential step warning.</dd></div></dl></section><section><h2>Interactions</h2><p>Essential interaction.</p></section><section><h2>Overview</h2><p>General reading.</p></section></div>';
    render(<KnowledgeSectionContent multiCard documentId="doc-study-track-example" html={source} dir="ltr" className="knowledge-html-content" />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Overview' }), { button: 0, ctrlKey: false });
    expect(screen.getByText('General reading.')).toBeVisible();
    expect(screen.queryByText('Essential step warning.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Read warnings' }));
    expect(screen.getByText('Essential step warning.')).toBeVisible();
    expect(screen.getByText('Essential interaction.')).toBeVisible();
  });
  it('makes source document references usable by keyboard', () => {
    const source = '<div class="knowledge-card"><section><h2>Milestones</h2><div data-doc-link="doc-existing">A linked lesson</div></section><section><h2>Overview</h2><p>General reading.</p></section></div>';
    const onClick = vi.fn();
    render(<div onClick={onClick}><KnowledgeSectionContent multiCard documentId="doc-study-track-example" html={source} dir="ltr" className="knowledge-html-content" /></div>);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Learning milestones' }), { button: 0, ctrlKey: false });
    const link = screen.getByRole('link', { name: 'A linked lesson' });
    onClick.mockClear();
    expect(link).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(link, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledOnce();
  });
});
