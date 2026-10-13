import React from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import '../index.css';

const params = new URLSearchParams(location.search);
document.documentElement.className = params.get('theme') === 'light' ? '' : params.get('theme') === 'oled' ? 'dark theme-oled' : 'dark';
document.documentElement.dataset.accent = params.get('accent') || 'olive';
// Exact legacy surface classes, not rewritten theme tokens. These are surface
// specimens, not full page mounts; source references are reported with each pair.
const specimens = [
  { source: 'pages/AboutMeView.tsx', classes: 'from-primary/5 via-card to-card' },
  { source: 'pages/AssessmentResult.tsx', classes: 'from-primary/10 via-card to-card' },
  { source: 'pages/AssessmentResult.tsx', classes: 'from-amber-500/10 via-card to-card' },
  { source: 'pages/AssessmentResult.tsx', classes: 'from-rose-500/10 via-card to-card' },
  { source: 'pages/CycleView.tsx', classes: 'from-rose-50 via-white to-pink-100/70 dark:from-rose-950/50 dark:via-card dark:to-pink-950/30' },
  { source: 'pages/ValuesGoalsView.tsx', classes: 'from-emerald-500 via-teal-500 to-cyan-500 text-white', white: true },
  { source: 'pages/BreathingView.tsx (Box selector)', classes: 'from-sky-500 via-blue-500 to-indigo-500 text-white', white: true },
  { source: 'pages/BreathingView.tsx (Energizing selector)', classes: 'from-amber-500 via-orange-500 to-red-500 text-white', white: true },
];
function Fixture() {
  React.useEffect(() => { document.body.dataset.qaReady = 'true'; }, []);
  return <main className="p-4 space-y-4 max-w-xl mx-auto">
    <p data-contrast="body">Body text · متن نمونه</p>
    <Card className="p-4 space-y-2"><p data-contrast="card">Card text</p><CardDescription data-contrast="card-muted">Secondary card text</CardDescription>
      <p className="text-primary" data-contrast="card-primary">Primary link text</p>
      <Button data-contrast="primary-button">Primary action</Button><Button variant="destructive" data-contrast="destructive-button">Destructive action</Button>
    </Card>
    <div className="bg-sidebar text-sidebar-foreground p-4"><p data-contrast="sidebar">Sidebar text</p></div>
    {specimens.map(specimen => <Card key={specimen.source + specimen.classes} className={`p-5 bg-gradient-to-br ${specimen.classes}`}>
      <p data-contrast={specimen.source} data-source-classes={specimen.classes}>Legacy card title · عنوان</p>
      {!specimen.white && <CardDescription data-contrast={`${specimen.source} muted`} data-source-classes={specimen.classes}>Legacy secondary text</CardDescription>}
    </Card>)}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
