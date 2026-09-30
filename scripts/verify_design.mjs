import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const artifactDir = path.resolve('artifacts/design');
const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3000';
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'arsh-design-qa-'));
const chromePath = process.env.CHROME_BIN || '/usr/bin/chromium';
const browser = spawn(chromePath, ['--headless=new','--remote-debugging-port=9333',`--user-data-dir=${profile}`,'--disable-dev-shm-usage','--no-first-run','--disable-background-networking']);
try {
  let target;
  for (let i=0;i<30;i++) {
    try { target=await (await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'})).json(); break; } catch { await new Promise(r=>setTimeout(r,200)); }
  }
  if (!target) throw new Error("Chromium debug endpoint did not start");
  const socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=()=>reject(new Error("Browser connection failed"));});
  let counter=0; const requests=new Map();
  socket.onmessage=({data})=>{const msg=JSON.parse(data);if(msg.method === "Runtime.exceptionThrown") console.error("Browser runtime exception",JSON.stringify(msg.params));if(requests.has(msg.id)){const request=requests.get(msg.id);clearTimeout(request.timer);msg.error ? request.reject(new Error(msg.error.message)) : request.resolve(msg.result);requests.delete(msg.id);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++counter;const timer=setTimeout(()=>{requests.delete(id);reject(new Error(`Browser request timed out: ${method}`));},15000);requests.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__qaAudioSources=[]; const OriginalAudioContext=window.AudioContext; if(OriginalAudioContext) window.AudioContext=class extends OriginalAudioContext { createBufferSource() { const source=super.createBufferSource(); window.__qaAudioSources.push(source); return source; } };` });
  await fs.mkdir(artifactDir,{recursive:true});
  for (const [width,height] of [[390,844],[853,690],[1440,900]]) {
    for(const [lang,theme,view] of [['fa','oled','reader'],['en','light','reader'],['fa','dark','settings'],['fa','oled','editor'],['en','light','editor'],['fa','oled','sleep'],['fa','oled','pharmacy'],['en','light','products'],['fa','oled','scenarios'],['en','light','fred'],['fa','oled','cyp']]) {
      if(process.env.QA_VIEWS && !process.env.QA_VIEWS.split(',').includes(view)) continue;
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
      await send('Page.navigate',{url:'about:blank'});
      await new Promise(resolve=>setTimeout(resolve,100));
      const navigation=await send('Page.navigate',{url:`${baseUrl}/src/test/design-audit.html?lang=${lang}&theme=${theme}&view=${view}`});
      if(navigation.errorText) throw new Error(`Navigation failed: ${navigation.errorText}`);
      const readyExpression = view === 'pharmacy' ? 'Boolean(document.querySelector(".pharmacy-category-nav button"))' : 'Boolean(document.querySelector(".knowledge-reader-shell, main select, .tiptap, [data-testid=sleep-sounds-card], [data-testid=pharmacy-qa] main"))';
      for(let i=0;i<100;i++) {const ready=await send('Runtime.evaluate',{expression:`document.readyState === "complete" && document.body?.dataset.qaKey === ${JSON.stringify(new URLSearchParams({lang,theme,view}).toString())} && (${readyExpression})`,returnByValue:true});if(ready.result?.value)break;await new Promise(r=>setTimeout(r,300));}
      const result=await send('Runtime.evaluate',{expression:'JSON.stringify({rendered:!!document.querySelector(".knowledge-reader-shell, main select, .tiptap, [data-testid=sleep-sounds-card], [data-testid=pharmacy-qa] main"),overflow:document.documentElement.scrollWidth>innerWidth,headerTitles:document.querySelectorAll("#app-header-title h1").length,bodyHeight:document.documentElement.scrollHeight})',returnByValue:true});
      const status=JSON.parse(result.result?.value || '{}');
      console.log(width,height,lang,theme,view,status);
      if (!status.rendered || status.overflow || status.headerTitles !== 1) process.exitCode = 1;
      if (view === 'fred') {
        const count=await send('Runtime.evaluate',{expression:'document.querySelectorAll("main nav button").length',returnByValue:true});
        for(let index=0;index<(count.result?.value ?? 0);index++) {
          await send('Runtime.evaluate',{expression:`document.querySelectorAll('main nav button')[${index}].click()`});
          await new Promise(resolve=>setTimeout(resolve,100));
          const overflow=await send('Runtime.evaluate',{expression:'document.documentElement.scrollWidth>innerWidth',returnByValue:true});
          if(overflow.result?.value) { console.error('FRED module overflow',width,index);process.exitCode=1; }
        }
      }
      if (view === 'pharmacy') {
        await send('Runtime.evaluate',{expression:'document.querySelector(".pharmacy-category-nav button").click()'});
        await new Promise(resolve=>setTimeout(resolve,150));
        const opened=await send('Runtime.evaluate',{expression:'Boolean(document.querySelector(".pharmacy-category-content .pharmacy-folder"))',returnByValue:true});
        if(!opened.result?.value) { console.error('Pharmacy category did not open',width);process.exitCode=1; }
      }
      if (view === 'editor') {
        await send('Runtime.evaluate', {expression: `(() => { const node=document.querySelector('.tiptap p').firstChild; const range=document.createRange(); range.setStart(node,0); range.setEnd(node,Math.min(6,node.textContent.length)); const selection=window.getSelection(); selection.removeAllRanges(); selection.addRange(range); document.dispatchEvent(new Event('selectionchange')); })()`});
        await new Promise(resolve=>setTimeout(resolve,250));
        await send('Runtime.evaluate', {expression: `document.querySelector('[data-testid="rich-editor-toolbar"] [data-mark="underline"]').click()`});
        await new Promise(resolve=>setTimeout(resolve,250));
        const formatted=await send('Runtime.evaluate', {expression: `Boolean(document.querySelector('.tiptap p > u')) && (document.body.dataset.savedMarkdown || '').includes('<u>')`, returnByValue:true});
        console.log('underline saves semantic formatting:', formatted.result?.value);
        if (!formatted.result?.value) process.exitCode=1;
      }
      if (view === 'sleep') {
        const button=await send('Runtime.evaluate',{expression:`JSON.stringify((()=>{const rect=document.querySelector('[data-testid="sleep-play-toggle"]').getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};})())`,returnByValue:true});
        const point=JSON.parse(button.result.value);
        await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
        let loopReady=false;
        for(let attempt=0;attempt<60;attempt++) {
          const loop=await send('Runtime.evaluate',{expression:'window.__qaAudioSources.some(source=>source.loop && Math.abs((source.buffer?.duration || 0)-32)<0.01)',returnByValue:true});
          if(loop.result?.value){loopReady=true;break;} await new Promise(resolve=>setTimeout(resolve,200));
        }
        console.log('sleep uses a continuous audio-thread loop:',loopReady);
        if(!loopReady)process.exitCode=1;
        await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
      }
      const shot=await send('Page.captureScreenshot',{format:'png'});
      await fs.writeFile(path.join(artifactDir,`${width}-${lang}-${theme}-${view}.png`),Buffer.from(shot.data,'base64'));
    }
  }
  socket.close();
} finally { browser.kill(); await fs.rm(profile,{recursive:true,force:true}).catch(() => {}); }
