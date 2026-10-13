import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Start fixture server: npx vite --config scripts/design-followup.vite.config.mjs
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3012';
const output = process.env.QA_ARTIFACT_DIR;
if (!output || path.resolve(output).startsWith(path.resolve('.') + path.sep)) throw new Error('Set QA_ARTIFACT_DIR outside the repository.');
await fs.mkdir(output, { recursive: true });
const profile = await fs.mkdtemp(path.join(output, 'chrome-'));
const chrome = spawn(process.env.CHROME_BIN ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=0', '--no-first-run', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
let socket;
const errors = [];
const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceHashes = Object.fromEntries(await Promise.all([
  'src/pages/NotesView.tsx', 'src/components/gestures/SwipeableRow.tsx', 'src/lib/notesList.ts',
  'src/components/HeaderSecondaryActions.tsx', 'src/hooks/useOverlaySlot.ts', 'src/index.css',
].map(async file => [file, createHash('sha256').update(await fs.readFile(path.join(frontend, file))).digest('hex')])));
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!port) throw new Error('Chrome did not publish a DevTools port.');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map();
  let id = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry);
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
  const navigate = async (fixture, query) => {
    const url = `${base}/src/test/${fixture}.html?${new URLSearchParams(query)}`;
    await send('Page.navigate', { url });
    for (let attempt = 0; attempt < 1200; attempt++) {
      try {
        if (await evaluate(`location.href === ${JSON.stringify(url)} && document.body?.dataset.qaReady === 'true'`)) {
          await evaluate('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
          return;
        }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Fixture mount timeout: ${JSON.stringify(await evaluate('({url:location.href,body:document.body.innerText.slice(0,1000),scripts:[...document.scripts].map(s=>s.src)})'))}`);
  };
  const screenshot = async name => {
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await fs.writeFile(path.join(output, name), Buffer.from(result.data, 'base64'));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const notes = [];
  for (const lang of ['en', 'fa']) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    for (let run = 0; run < 3; run++) {
      await navigate('notes-benchmark', { lang, theme: 'light' });
      const sample = await evaluate(`(async()=>{
        const panel=()=>document.querySelector('[data-testid="notes-list-panel"]');
        const rows=()=>[...panel().querySelectorAll('[draggable="true"]')];
        const wait=async(predicate)=>{const start=performance.now();while(!predicate()){if(performance.now()-start>10000)throw new Error('Interaction timeout');await new Promise(r=>setTimeout(r,5));}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
        const measure=async(action,predicate)=>{const start=performance.now();action();await wait(predicate);return performance.now()-start;};
        const input=panel().querySelector('input');
        const search=value=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));};
        const more=()=>[...panel().querySelectorAll('button')].find(b=>/Load 50|۵۰ نوت بعدی/.test(b.textContent));
        const {syntheticNotes}=await import('/src/test/notes-benchmark-adapter.tsx');
        const result={mountMs:Number(document.body.dataset.mountMs),initialRows:rows().length,librarySize:syntheticNotes.length,contentChars:syntheticNotes[0].content.length,timing:'event dispatch to asserted DOM state plus two animation frames; no CPU throttling'};
        result.load50Ms=await measure(()=>more().click(),()=>rows().length===100);
        result.tailSearchMs=await measure(()=>search('unique-library-tail-marker'),()=>rows().length===1&&rows()[0].textContent.includes('4999'));
        result.tailFound=rows()[0].textContent.includes('4999');
        result.openTailMs=await measure(()=>rows()[0].querySelector('button').click(),()=>document.querySelector('[data-testid="note-editor-panel"] .tiptap'));
        result.editorTextChars=document.querySelector('[data-testid="note-editor-panel"] .tiptap').textContent.length;
        result.clearSearchMs=await measure(()=>search(''),()=>rows().length===50);
        const folder=[...panel().querySelectorAll('button')].find(b=>b.textContent.includes('QA Work'));
        result.folderMs=await measure(()=>folder.click(),()=>panel().querySelector('[role="status"]')?.textContent.includes('2500'));
        result.folderRows=rows().length;
        result.clearFolderMs=await measure(()=>folder.click(),()=>panel().querySelector('[role="status"]')?.textContent.includes('5000'));
        result.domNodes=document.querySelectorAll('*').length;
        result.overflow=document.documentElement.scrollWidth>innerWidth+1;
        return result;
      })()`);
      notes.push({ lang, run, ...sample });
      console.log('NotesView DOM benchmark', lang, run, sample);
      if (run === 0) await screenshot(`notes-${lang}.png`);
    }
  }
  const contrast = [];
  for (const theme of ['light', 'dark', 'oled']) for (const accent of ['indigo', 'olive', 'amber', 'steel', 'rose', 'brick']) {
    await send('Emulation.setDeviceMetricsOverride', { width: 600, height: 1400, deviceScaleFactor: 1, mobile: false });
    await navigate('contrast-audit', { theme, accent });
    const pairs = await evaluate(`(()=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const rgba=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v);};
      const over=(fg,bg)=>fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3])).concat(1);
      const split=value=>{let depth=0,start=0;const parts=[];for(let i=0;i<value.length;i++){if(value[i]==='(')depth++;if(value[i]===')')depth--;if(value[i]===','&&!depth){parts.push(value.slice(start,i).trim());start=i+1;}}parts.push(value.slice(start).trim());return parts;};
      const luminance=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
      const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
      return [...document.querySelectorAll('[data-contrast]')].map(element=>{
        const ancestors=[];for(let node=element;node;node=node.parentElement)ancestors.unshift(node);
        let backgrounds=[[255,255,255,1]],images=[],unsupported=[],opacity=1;
        for(const node of ancestors){const css=getComputedStyle(node);opacity*=Number(css.opacity);const base=rgba(css.backgroundColor);backgrounds=backgrounds.map(bg=>over(base,bg));
          if(css.backgroundImage!=='none'){images.push(css.backgroundImage);
            if(!css.backgroundImage.startsWith('linear-gradient(')||split(css.backgroundImage).length!==1){unsupported.push(css.backgroundImage);continue;}
            const stops=split(css.backgroundImage.slice(16,-1)).slice(1).map(stop=>{const match=stop.match(/^(.*\\))\\s*(?:[\\d.]+%|[\\d.]+px)?$/);return rgba(match?match[1]:stop.replace(/\\s+[\\d.]+%$/,''));});
            const samples=[];for(let i=0;i<stops.length-1;i++)for(let step=0;step<=20;step++){const t=step/20,a=stops[i][3]*(1-t)+stops[i+1][3]*t;samples.push(stops[i].slice(0,3).map((v,c)=>a?(v*stops[i][3]*(1-t)+stops[i+1][c]*stops[i+1][3]*t)/a:0).concat(a));}
            backgrounds=backgrounds.flatMap(bg=>samples.map(sample=>over(sample,bg)));
          }
        }
        const css=getComputedStyle(element),fg=rgba(css.color);fg[3]*=opacity;
        const ratios=backgrounds.map(bg=>ratio(over(fg,bg),bg));const minimum=Math.min(...ratios),index=ratios.indexOf(minimum);
        const large=parseFloat(css.fontSize)>=24||(parseFloat(css.fontSize)>=18.66&&Number(css.fontWeight)>=700);const threshold=large?3:4.5;
        return {label:element.dataset.contrast,sourceClasses:element.dataset.sourceClasses??null,foreground:css.color,worstBackground:backgrounds[index],backgroundImages:images,fontSize:css.fontSize,fontWeight:css.fontWeight,minimumRatio:minimum,threshold,pass:minimum>=threshold,unsupported};
      });
    })()`);
    contrast.push({ theme, accent, pairs });
    await screenshot(`contrast-${theme}-${accent}.png`);
    console.log(`Contrast ${theme}/${accent}: ${pairs.filter(pair => pair.pass).length}/${pairs.length}`);
  }
  const failures = contrast.flatMap(config => config.pairs.filter(pair => !pair.pass || pair.unsupported.length).map(pair => ({ theme: config.theme, accent: config.accent, ...pair })));
  const layouts = [];
  for (const lang of ['en', 'fa']) for (const width of [320, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigate('followup-layout', { lang, view: 'header' });
    const before = await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1,hosts:!!document.getElementById('app-header-actions'),portalButtons:document.getElementById('app-header-actions').querySelectorAll('button').length})`);
    await evaluate(`document.querySelector('button[aria-expanded]').click();new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    const opened = await evaluate(`(()=>{const trigger=document.querySelector('button[aria-expanded]');const panel=document.getElementById(trigger.getAttribute('aria-controls'));const r=panel.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,panelInViewport:r.left>=-1&&r.right<=innerWidth+1,focusInside:panel.contains(document.activeElement),hostStillMounted:!!document.getElementById('app-header-actions')};})()`);
    await screenshot(`header-${lang}-${width}-open.png`);
    await send('Page.bringToFront');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    const closed = await evaluate(`({closed:document.querySelector('button[aria-expanded]').getAttribute('aria-expanded')==='false',focusRestored:document.activeElement===document.querySelector('button[aria-expanded]')})`);
    layouts.push({ view: 'header', lang, width, before, opened, closed, pass: !before.overflow&&!opened.overflow&&opened.panelInViewport&&opened.focusInside&&opened.hostStillMounted&&closed.closed&&closed.focusRestored });
    await screenshot(`header-${lang}-${width}.png`);
  }
  for (const [name, width, height] of [['portrait',390,844],['landscape',844,390],['keyboard-sized-visible-viewport',390,300]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    await navigate('followup-layout', { lang: 'fa', view: 'overlays' });
    await evaluate('new Promise(r=>setTimeout(r,100))');
    const metrics = await evaluate(`(()=>{const elements=[...document.querySelectorAll('[data-overlay], [data-bottom-bar="true"]')];const rects=elements.map(e=>{const r=e.getBoundingClientRect();return {label:e.dataset.overlay??'nav',left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height};});const overlap=[];for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(a.left<b.right&&b.left<a.right&&a.top<b.bottom-1&&b.top<a.bottom-1)overlap.push([a.label,b.label]);}return {rects,overlap,inViewport:rects.every(r=>r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight),visualViewportHeight:visualViewport.height};})()`);
    layouts.push({ view: 'overlays', name, width, height, ...metrics, pass: !metrics.overlap.length&&metrics.inViewport });
    await screenshot(`overlays-${name}.png`);
  }
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({
    scope: 'Unchanged production NotesView mounted in React/DOM, 5000 synthetic notes; fixture-only mocked auth/data services. Development Vite build, desktop headless Chrome, reduced motion, warm module cache after first run. Not authenticated/cloud performance or device latency.',
    contrastMethod: 'Real computed foreground/background colors, alpha composited through ancestors. Legacy gradient surface specimens use exact source classes and production Card. Minimum over gradient stops and 20 interpolants per segment (conservative whole-surface envelope, not screenshot pixel/text-position measurement). No images, pseudo-elements, blend modes or complete page coverage.',
    sourceHashes, notes, contrast, failures, layouts, errors,
  }, null, 2));
  console.log(`Contrast failures: ${failures.length}. Artifacts: ${output}`);
  console.log('Layout fixtures:', layouts.map(item=>({view:item.view,name:item.name,lang:item.lang,width:item.width,pass:item.pass})));
  if (failures.length || errors.length || layouts.some(item=>!item.pass) || notes.some(sample => sample.overflow || !sample.tailFound)) process.exitCode = 1;
} catch (error) {
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), errors }, null, 2));
  throw error;
} finally { socket?.close(); chrome.kill(); }
