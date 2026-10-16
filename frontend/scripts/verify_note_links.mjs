// Requires Playwright (or NOTES_QA_PLAYWRIGHT pointing to its index.mjs) and Chromium.
// Auth is synthetic; this check makes no production data writes or AI requests.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.NOTES_QA_PLAYWRIGHT || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  root, configFile: false, server: { host: '127.0.0.1', port: 4179, strictPort: true },
  esbuild: { jsx: 'automatic' },
  optimizeDeps: { entries: ['src/test/note-links-browser.html'] },
  resolve: { alias: [{ find: '@/hooks/useAuth', replacement: '/@qa-auth' }, { find: '@', replacement: root + 'src' }] },
  plugins: [{ name: 'synthetic-note-auth', resolveId(id) { if (id === '/@qa-auth') return '\0qa-auth'; }, load(id) {
    if (id === '\0qa-auth') return `const user = { id: 'qa-owner' }; export const useAuth = () => ({ user, loading: false }); export const AuthProvider = ({children}) => children;`;
  } }],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  for (const width of [360, 390, 1280]) for (const lang of ['fa', 'en']) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4179/') || route.request().url().startsWith('data:') ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:4179/src/test/note-links-browser.html?lang=${lang}&theme=${theme}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('body[data-ready="true"]');
    await page.getByRole('button', { name: lang === 'fa' ? 'پیوند به یادداشت' : 'Link to note', exact: true }).click();
    await page.evaluate(() => {
      const input = document.querySelector('[role="combobox"]');
      input.addEventListener('input', () => {
        const start = performance.now();
        const observer = new MutationObserver(() => {
          const options = document.querySelectorAll('[role="option"]');
          if (options.length === 1 && options[0].textContent.includes('Note 999')) {
            document.body.dataset.searchMs = String(performance.now() - start); observer.disconnect();
          }
        });
        observer.observe(document.getElementById('note-link-results'), { subtree: true, childList: true, characterData: true });
      }, { once: true });
    });
    const search = page.getByRole('combobox');
    await search.fill('Note 999');
    await page.waitForSelector('body[data-search-ms]');
    const overflow = await page.evaluate(() => {
      const r = document.querySelector('[role="dialog"]').getBoundingClientRect();
      return document.documentElement.scrollWidth > innerWidth || r.left < 0 || r.right > innerWidth;
    });
    if (overflow) throw new Error(`Overflow at ${width}/${lang}/${theme}`);
    await search.press('Enter');
    await page.getByRole('tab', { name: lang === 'fa' ? 'پیش‌نمایش' : 'Preview', exact: true }).click();
    await page.getByRole('link', { name: 'یادداشت 999 · Note 999' }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="qa-title"]').textContent.includes('Note 999'));
    await page.locator('[data-testid="note-backlinks"] summary').click();
    await page.getByTestId('note-backlinks').getByRole('button', { name: /یادداشت 0 · Note 0/ }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="qa-title"]').textContent.includes('Note 0'));
    if (errors.length) throw new Error(errors.join('\n'));
    results.push({ width, lang, theme, overflow: false, mountAndIndexMs: Number(await page.locator('body').getAttribute('data-index-ms')), searchIncludingDebounceMs: Number(await page.locator('body').getAttribute('data-search-ms')) });
    await page.close();
  }
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4179/src/test/note-links-browser.html?count=10000&lang=en', { waitUntil: 'networkidle' });
  await page.waitForSelector('body[data-ready="true"]');
  await page.getByTestId('qa-incremental').click();
  results.push({ stressCount: 10000, mountAndIndexMs: Number(await page.locator('body').getAttribute('data-index-ms')), unchangedContentUpdateMs: Number(await page.locator('body').getAttribute('data-incremental-ms')) });
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
