import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotesView from '@/pages/NotesView';
import '@/components/RichEditor'; // prewarm lazy editor dependencies before timing
import i18n from '@/i18n';
import '../index.css';

const params = new URLSearchParams(location.search);
document.documentElement.dir = params.get('lang') === 'fa' ? 'rtl' : 'ltr';
document.documentElement.className = params.get('theme') === 'light' ? '' : 'dark';
document.documentElement.dataset.accent = 'olive';
localStorage.removeItem('notes-list-hidden');
await i18n.changeLanguage(params.get('lang') === 'fa' ? 'fa' : 'en');
const start = performance.now();
createRoot(document.getElementById('root')!).render(<BrowserRouter><TooltipProvider>
  <header className="h-12 border-b flex"><div id="app-header-title" /><div id="app-header-actions" /></header>
  <NotesView />
</TooltipProvider></BrowserRouter>);
const mounted = setInterval(() => {
  if (document.querySelectorAll('[data-testid="notes-list-panel"] [draggable="true"]').length === 50
    && document.querySelector('[data-testid="notes-list-panel"] [role="status"]')?.textContent?.includes('5000')) {
    clearInterval(mounted);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.dataset.mountMs = String(performance.now() - start);
      document.body.dataset.qaReady = 'true';
    }));
  }
}, 5);
