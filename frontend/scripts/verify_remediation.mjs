import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

// Synthetic, unauthenticated production-component fixtures; not a device/user study.
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3001';
const output = process.env.QA_ARTIFACT_DIR;
if (!output) throw new Error('Set QA_ARTIFACT_DIR to an external artifact directory.');
await fs.mkdir(output, { recursive: true });
const profile = await fs.mkdtemp(path.join(output, 'chrome-'));
const chrome = spawn(process.env.CHROME_BIN ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=0', '--no-first-run', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
let socket;
const browserErrors = [];
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!port) throw new Error('Chrome did not publish its DevTools port.');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') browserErrors.push(message.params.entry);
    const waiter = pending.get(message.id);
    if (waiter) { pending.delete(message.id); clearTimeout(waiter.timeout); message.error ? waiter.reject(message.error) : waiter.resolve(message.result); }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id;
    const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`CDP timeout: ${method}`)); }, 180000);
    pending.set(key, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id: key, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  const results = [];
  const configurations = [
    ...['fa', 'en'].flatMap(lang => [320, 390, 820].map(width => ({ lang, width, theme: 'light', accent: 'olive', view: 'editor' }))),
    ...['indigo', 'olive', 'amber', 'steel', 'rose', 'brick'].flatMap(accent => ['light', 'dark', 'oled'].map(theme => ({ lang: 'fa', width: 390, theme, accent, view: 'editor' }))),
    { lang: 'fa', width: 390, theme: 'dark', accent: 'olive', view: 'editor', long: '1' },
    { lang: 'en', width: 820, theme: 'light', accent: 'olive', view: 'settings' },
  ];
  for (const config of configurations) {
    await send('Emulation.setDeviceMetricsOverride', { width: config.width, height: 844, deviceScaleFactor: 1, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const query = new URLSearchParams(config).toString();
    await send('Page.navigate', { url: `${base}/src/test/design-audit.html?${query}` });
    await evaluate(`new Promise((resolve, reject) => { let count=0; const timer=setInterval(() => { if(document.body.dataset.qaKey === ${JSON.stringify(query)} && (${JSON.stringify(config.view)} !== 'editor' || document.querySelector('.tiptap'))) {clearInterval(timer);requestAnimationFrame(()=>requestAnimationFrame(resolve));} else if(++count>1200){clearInterval(timer);reject(new Error('Fixture mount timeout'));}},100); })`);
    const metrics = await evaluate(`(() => { const html=document.documentElement;const editor=document.querySelector('.tiptap');return {width:innerWidth,scrollWidth:html.scrollWidth,overflow:html.scrollWidth>innerWidth+1,editorNodes:editor?.querySelectorAll('*').length??0,focusable:document.querySelectorAll('button,a[href],input,textarea,[tabindex="0"]').length,dir:html.dir,theme:html.className,accent:html.dataset.accent};})()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    metrics.keyboardFocus = await evaluate(`({tag:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label'),outline:getComputedStyle(document.activeElement).outlineStyle})`);
    const filename = `${config.view}-${config.lang}-${config.width}-${config.theme}-${config.accent}${config.long ? '-long' : ''}.png`;
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path.join(output, filename), Buffer.from(screenshot.data, 'base64'));
    results.push({ config, metrics, screenshot: filename });
    console.log(`${metrics.overflow ? 'OVERFLOW' : 'PASS'} ${filename} nodes=${metrics.editorNodes}`);
  }
  const markdownBenchmark = await evaluate(`(async()=>{const {markdownToHtml}=await import('/src/lib/markdown.ts');const samples=[];for(const paragraphs of [50,500,5000]){const source=Array.from({length:paragraphs},(_,i)=>'## Section '+i+'\\n\\nمتن مصنوعی **bold** and [reference](https://example.com).\\n').join('\\n');markdownToHtml(source);const durations=[];for(let i=0;i<7;i++){const start=performance.now();markdownToHtml(source);durations.push(performance.now()-start);}durations.sort((a,b)=>a-b);samples.push({paragraphs,bytes:new TextEncoder().encode(source).length,medianMs:durations[3],maxMs:durations[6]});}return samples;})()`);
  const notesListBenchmark = await evaluate(`(async()=>{const {filterNotesForList,noteListPreview}=await import('/src/lib/notesList.ts');const samples=[];for(const count of [500,5000]){const notes=Array.from({length:count},(_,i)=>({title:'Note '+i,content:('## Synthetic note\\nمتن مصنوعی **bold** [link](https://example.com).\\n').repeat(20),folder_id:i%2?'work':null,tag_ids:['one']}));const durations=[];for(let i=0;i<8;i++){const start=performance.now();const found=filterNotesForList(notes,'synthetic',null,null);found.map(note=>noteListPreview(note.content));const duration=performance.now()-start;if(i)durations.push(duration);}durations.sort((a,b)=>a-b);samples.push({count,contentChars:notes[0].content.length,operation:'filter + preview every matching row; no React/DOM rendering',medianMs:durations[3],maxMs:durations[6]});}return samples;})()`);
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ scope: 'Headless Chrome, synthetic component fixtures. No real IME, screen reader, authenticated account, or complete NotesView list rendering.', results, markdownBenchmark, notesListBenchmark }, null, 2));
  console.log('Markdown conversion benchmark:', markdownBenchmark);
  console.log('Production notes list operations:', notesListBenchmark);
  if (results.some(result => result.metrics.overflow)) process.exitCode = 1;
} catch (error) {
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), browserErrors }, null, 2));
  throw error;
} finally {
  socket?.close();
  chrome.kill();
}
