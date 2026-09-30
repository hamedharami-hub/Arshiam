import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const artifactDir = path.resolve('artifacts/design');
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'arsh-design-qa-'));
const chromePath = process.env.CHROME_BIN || '/usr/bin/chromium';
const browser = spawn(chromePath, ['--headless=new','--remote-debugging-port=9333',`--user-data-dir=${profile}`,'--disable-dev-shm-usage','--no-first-run','--disable-background-networking']);
try {
  let target;
  for (let i=0;i<30;i++) {
    try { target=await (await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'})).json(); break; } catch { await new Promise(r=>setTimeout(r,200)); }
  }
  const socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r=>socket.onopen=r);
  let counter=0; const requests=new Map();
  socket.onmessage=({data})=>{const msg=JSON.parse(data);if(requests.has(msg.id)){requests.get(msg.id)(msg.result);requests.delete(msg.id);}};
  const send=(method,params={})=>new Promise(resolve=>{const id=++counter;requests.set(id,resolve);socket.send(JSON.stringify({id,method,params}));});
  await send('Page.enable');
  await fs.mkdir(artifactDir,{recursive:true});
  for (const [width,height] of [[390,844],[853,690],[1440,900]]) {
    for(const [lang,theme,view] of [['fa','oled','reader'],['en','light','reader'],['fa','dark','settings']]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
      await send('Page.navigate',{url:`http://localhost:3000/src/test/design-audit.html?lang=${lang}&theme=${theme}&view=${view}`});
      for(let i=0;i<40;i++) {const ready=await send('Runtime.evaluate',{expression:'Boolean(document.querySelector(".knowledge-reader-shell, main select"))',returnByValue:true});if(ready.result?.value)break;await new Promise(r=>setTimeout(r,300));}
      const result=await send('Runtime.evaluate',{expression:'JSON.stringify({rendered:!!document.querySelector(".knowledge-reader-shell, main select"),overflow:document.documentElement.scrollWidth>innerWidth,headerTitles:document.querySelectorAll("#app-header-title h1").length,bodyHeight:document.documentElement.scrollHeight})',returnByValue:true});
      const status=JSON.parse(result.result?.value || '{}');
      console.log(width,height,lang,theme,view,status);
      if (!status.rendered || status.overflow || status.headerTitles !== 1) process.exitCode = 1;
      const shot=await send('Page.captureScreenshot',{format:'png'});
      await fs.writeFile(path.join(artifactDir,`${width}-${lang}-${theme}-${view}.png`),Buffer.from(shot.data,'base64'));
    }
  }
  socket.close();
} finally { browser.kill(); await fs.rm(profile,{recursive:true,force:true}).catch(() => {}); }
