import React from 'react';
import { createRoot } from 'react-dom/client';
import { HeaderSecondaryActions } from '@/components/HeaderSecondaryActions';
import { HeaderActionsPortal } from '@/components/HeaderActionsPortal';
import { HeaderTitlePortal } from '@/components/HeaderTitlePortal';
import { Button } from '@/components/ui/button';
import { useOverlaySlot } from '@/hooks/useOverlaySlot';
import '../index.css';

const params = new URLSearchParams(location.search);
const isEn = params.get('lang') !== 'fa';
document.documentElement.dir = isEn ? 'ltr' : 'rtl';
function Panel({ id, order }: { id: string; order: number }) {
  const ref = useOverlaySlot(id, order, true);
  return <div ref={ref} data-overlay={id} className="fixed inset-x-4 rounded-xl border bg-card p-3 z-40">
    <p>{id} · {isEn ? 'Synthetic panel with several lines of long status information.' : 'متن آزمایشی طولانی برای بررسی وضعیت و چیدمان هم‌زمان پنل‌ها.'}</p>
    <Button className="h-11">{isEn ? 'Continue' : 'ادامه'}</Button>
  </div>;
}
function Fixture() {
  React.useEffect(() => { document.body.dataset.qaReady = 'true'; }, []);
  return <>
    <header className="flex h-14 items-center gap-1 border-b px-2">
      <div id="app-header-title" className="min-w-0 flex-1" />
      <Button variant="ghost" className="h-11 w-11 shrink-0" aria-label="Search">⌕</Button>
      <HeaderSecondaryActions isEn={isEn}>
        <div id="app-header-actions" className="flex max-w-full flex-wrap gap-1" />
        <Button>{isEn ? 'Install application' : 'نصب برنامه'}</Button>
        <Button>{isEn ? 'Accent colour' : 'رنگ برنامه'}</Button>
        <Button>{isEn ? 'Theme' : 'پوسته'}</Button>
        <Button>{isEn ? 'AI settings' : 'تنظیمات هوش مصنوعی'}</Button>
      </HeaderSecondaryActions>
    </header>
    <HeaderTitlePortal title={isEn ? 'A very long page title for checking the narrow application header' : 'عنوان بسیار طولانی صفحه برای بررسی نمایش سربرگ برنامه در گوشی کوچک'} />
    <HeaderActionsPortal><Button>{isEn ? 'Primary page action' : 'اقدام اصلی صفحه'}</Button></HeaderActionsPortal>
    {params.get('view') === 'overlays' && <>
      <Panel id="focus" order={1} /><Panel id="sync" order={2} /><Panel id="install" order={3} />
      <nav data-bottom-bar="true" className="fixed inset-x-3 bottom-3 h-14 rounded-xl border bg-card flex items-center justify-around"><button>Home</button><button>Notes</button><button>Settings</button></nav>
    </>}
  </>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
