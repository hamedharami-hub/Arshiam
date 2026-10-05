import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Sparkles, 
  Droplets, 
  Sun, 
  Cloud, 
  RefreshCw, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Award, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getGardenState, type GardenState } from "@/lib/garden";
import {normalizeState,storageKey,trustedMessage,type CaravanState} from '../../public/caravan/state.js';
import {caravanAccount} from '@/lib/caravanAccount';
import {CaravanConflictError,loadCaravanCloud,saveCaravanCloud} from '@/lib/caravanCloud';

export default function CaravanView() {
  const {user}=useAuth();
  const owner=user?.id||'guest';
  const ownerRef=useRef(owner);ownerRef.current=owner;
  const [garden,setGarden]=useState<GardenState>(getGardenState);
  const [isFullscreen,setIsFullscreen]=useState(false);
  const [syncingCloud,setSyncingCloud]=useState(false);
  const [lastCloudSync,setLastCloudSync]=useState<string|null>(null);
  const [caravanEssence,setCaravanEssence]=useState(0);
  const [gameReady,setGameReady]=useState(false);
  const [bridgeError,setBridgeError]=useState('');
  const [conflict,setConflict]=useState<{owner:string;revision:number}|null>(null);
  const iframeRef=useRef<HTMLIFrameElement>(null);
  const containerRef=useRef<HTMLDivElement>(null);
  const handlersRef=useRef<(msg:Record<string,unknown>)=>void>(()=>{});
  const pendingRpc=useRef(new Map<string,{owner:string;resolve:(state:CaravanState)=>void;reject:(error:Error)=>void}>());
  const cloudBase=useRef<{owner:string;revision:number|null}>({owner,revision:null});
  const cloudBusy=useRef(false);
  const send=useCallback((msg:Record<string,unknown>)=>iframeRef.current?.contentWindow?.postMessage({...msg,bridgeVersion:1,ownerId:ownerRef.current},location.origin),[]);
  const sendStateToGame=useCallback(()=>send({type:'ARSHNAZ_SYNC_STATE',data:{...getGardenState(),userName:user?.displayName||'مسافر کاروان'}}),[send,user?.displayName]);
  useEffect(()=>{
    const onUpdate=()=>{setGarden(getGardenState());sendStateToGame();};
    window.addEventListener('arshnaz-garden-updated',onUpdate);
    return()=>window.removeEventListener('arshnaz-garden-updated',onUpdate);
  },[sendStateToGame]);
  useEffect(()=>{
    setGameReady(false);setBridgeError('');setConflict(null);setLastCloudSync(null);cloudBase.current={owner,revision:null};
    for(const p of pendingRpc.current.values())p.reject(new Error('حساب تغییر کرد.'));pendingRpc.current.clear();
    sendStateToGame();
    const timeout=setTimeout(()=>setBridgeError('اگر بازی آماده نشده است، صفحه را دوباره باز کن.'),15000);
    return()=>clearTimeout(timeout);
  },[owner,sendStateToGame]);
  useEffect(()=>{
    const listener=(event:MessageEvent)=>{if(trustedMessage(event,iframeRef.current?.contentWindow,location.origin))handlersRef.current(event.data);};
    const fullscreen=()=>setIsFullscreen(document.fullscreenElement===containerRef.current);
    window.addEventListener('message',listener);document.addEventListener('fullscreenchange',fullscreen);
    const requests=pendingRpc.current;
    return()=>{window.removeEventListener('message',listener);document.removeEventListener('fullscreenchange',fullscreen);for(const p of requests.values())p.reject(new Error('بازی بسته شد.'));requests.clear();};
  },[]);
  function rpc(type:string,data?:unknown):Promise<CaravanState>{
    const requestId=crypto.randomUUID(),captured=ownerRef.current;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pendingRpc.current.delete(requestId);reject(new Error('بازی پاسخ نداد؛ عملیات تأیید نشده است.'));},10000);
      pendingRpc.current.set(requestId,{owner:captured,resolve:s=>{clearTimeout(timer);resolve(s);},reject:e=>{clearTimeout(timer);reject(e);}});
      send({type,requestId,data});
    });
  }
  function requireCloud(){if(!user?.id||user.app_metadata?.provider==='guest')throw new Error('ابتدا وارد حساب ارشناز شوید.');if(!gameReady)throw new Error('بازی هنوز آماده نیست.');if(!navigator.onLine)throw new Error('آفلاین هستید؛ پیشرفت محلی محفوظ است.');if(caravanAccount(owner).pending())throw new Error('ابتدا انتقال نیمه‌تمام باید تکمیل شود.');}
  const handleSaveToCloud=async(expectedRevision?:number)=>{
    if(cloudBusy.current)return;
    const captured=owner;
    try{
      requireCloud();cloudBusy.current=true;setSyncingCloud(true);
      const snapshot=await rpc('ARSHNAZ_REQUEST_SNAPSHOT');
      if(ownerRef.current!==captured)return;
      const base=expectedRevision??(cloudBase.current.owner===captured?cloudBase.current.revision:null);
      const revision=await saveCaravanCloud(captured,snapshot,base);
      if(ownerRef.current!==captured)return;
      cloudBase.current={owner:captured,revision};setConflict(null);setLastCloudSync(new Date().toLocaleTimeString('fa-IR'));toast.success('پیشرفت در فایربیس ذخیره شد.');
    }catch(error){
      if(ownerRef.current!==captured)return;
      if(error instanceof CaravanConflictError){setConflict({owner:captured,revision:error.revision});toast.info(error.message);}else toast.error(error instanceof Error?error.message:'ذخیره انجام نشد.');
    }finally{cloudBusy.current=false;setSyncingCloud(false);}
  };
  const handleRestoreFromCloud=async()=>{
    if(cloudBusy.current)return;
    const captured=owner;
    try{
      requireCloud();cloudBusy.current=true;setSyncingCloud(true);
      const result=await loadCaravanCloud(captured);
      if(ownerRef.current!==captured)return;
      await rpc('ARSHNAZ_RESTORE_SNAPSHOT',result.state);
      if(ownerRef.current!==captured)return;
      cloudBase.current={owner:captured,revision:result.revision};setConflict(null);setLastCloudSync(new Date().toLocaleTimeString('fa-IR'));toast.success('پیشرفت از فایربیس بازیابی شد.');
    }catch(error){if(ownerRef.current===captured)toast.error(error instanceof Error?error.message:'بازیابی انجام نشد.');}
    finally{cloudBusy.current=false;setSyncingCloud(false);}
  };
  handlersRef.current=msg=>{
    if(msg.type==='CARAVAN_READY'){sendStateToGame();return;}
    if(msg.ownerId!==ownerRef.current)return;
    const data=msg.data as Record<string,unknown>|undefined;
    if(msg.type==='CARAVAN_SYNCED' && data?.ready){
      try{caravanAccount(owner).replay();const raw=localStorage.getItem(storageKey(owner));if(raw)send({type:'ARSHNAZ_RECOVER_STATE',data:normalizeState(JSON.parse(raw),owner)});setGameReady(true);setBridgeError('');}
      catch(error){setGameReady(false);setBridgeError(error instanceof Error?error.message:'ارتباط آماده نشد.');}
    }else if(msg.type==='CARAVAN_STATE_UPDATE'&&typeof data?.essence==='number'){setCaravanEssence(data.essence);}
    else if(msg.type==='CARAVAN_TRANSFER_REQUEST'){
      if(typeof msg.requestId!=='string'||typeof msg.action!=='string')return;
      try{if(!gameReady)throw new Error('ارتباط آماده نیست.');const state=caravanAccount(owner).transfer(msg.requestId,msg.action,(msg.payload||{}) as Record<string,unknown>);send({type:'ARSHNAZ_TRANSFER_RESULT',requestId:msg.requestId,data:state});setGarden(getGardenState());setCaravanEssence(state.essence);}
      catch(error){send({type:'ARSHNAZ_TRANSFER_RESULT',requestId:msg.requestId,error:error instanceof Error?error.message:'عملیات انجام نشد.'});}
    }else if(msg.type==='CARAVAN_RPC_RESULT'){
      const request=pendingRpc.current.get(msg.requestId as string);if(!request||request.owner!==ownerRef.current)return;pendingRpc.current.delete(msg.requestId as string);
      try{if(msg.error)throw new Error(String(msg.error));request.resolve(normalizeState(msg.data,owner));}catch(error){request.reject(error instanceof Error?error:new Error('پاسخ معتبر نیست.'));}
    }else if(msg.type==='CARAVAN_REQUEST_SYNC_CLOUD'){void handleSaveToCloud();}
    else if(msg.type==='CARAVAN_REQUEST_RESTORE_CLOUD'){void handleRestoreFromCloud();}
  };
  const handleConvertSunToEssence=()=>{if(gameReady)send({type:'ARSHNAZ_RUN_ACTION',action:'convert-sun'});};
  const toggleFullscreen=async()=>{try{if(document.fullscreenElement===containerRef.current)await document.exitFullscreen();else await containerRef.current?.requestFullscreen();}catch{toast.error('تمام‌صفحه در این مرورگر فعال نشد.');}};

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col w-full bg-slate-950 text-slate-100 ${
        isFullscreen ? "h-screen fixed inset-0 z-50" : "h-[calc(100vh-4rem)] rounded-2xl overflow-hidden border border-amber-900/30 shadow-2xl"
      }`}
    >
      {/* Top HUD Bridge Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>کاروان رؤیاها</span>
            <span className="text-[10px] text-amber-400/70 font-normal hidden sm:inline">· فصل یک: ریشه‌های نور</span>
          </div>

          <Badge variant="outline" className="bg-amber-950/40 border-amber-600/40 text-amber-300 gap-1 text-[11px] px-2 py-0.5">
            ✧ {caravanEssence} گوهر نور
          </Badge>
        </div>

        {/* Arshnaz Live Points and Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Live Arshnaz Points Badges */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
            <span className="text-slate-400 text-[10px]">امتیازهای ارشناز:</span>
            <span className="flex items-center gap-0.5 text-sky-400 font-semibold" title="قطره‌های آب ارشناز">
              <Droplets className="w-3.5 h-3.5" />
              {garden.waterDrops}
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-0.5 text-amber-400 font-semibold" title="انرژی خورشید ارشناز">
              <Sun className="w-3.5 h-3.5" />
              {garden.sunEnergy}
            </span>
            {garden.focusBlossoms > 0 && (
              <>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-0.5 text-rose-400 font-semibold" title="شکوفه‌های تمرکز پومودورو">
                  <Award className="w-3.5 h-3.5" />
                  {garden.focusBlossoms}
                </span>
              </>
            )}
          </div>

          {/* Quick Convert Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleConvertSunToEssence}
            disabled={!gameReady || garden.sunEnergy < 10}
            className="h-7 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"
            title="تبدیل ۱۰ انرژی خورشید به ۱۰ گوهر نور در کاروان"
          >
            <Sun className="w-3 h-3 text-amber-400" />
            <span>تبدیل ۱۰ انرژی خورشید</span>
          </Button>

          {/* Cosmic Galaxy Navigation Shortcuts */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              send({type: "ARSHNAZ_OPEN_GALAXY"});
            }}
            className="h-7 text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30 gap-1"
            title="نقشه کهکشان و سیارات"
          >
            <span>🌌 کهکشان</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              send({type: "ARSHNAZ_GO_CODERS"});
              toast.info("💻 پرواز به سوی سیارهٔ کدنویس‌ها", {
                description: "کالبدهای تیره و انگشتان نور در حال کامپایل واقعیت هستند."
              });
            }}
            className="h-7 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1"
            title="سیارهٔ کدنویس‌ها · آرتاک"
          >
            <span>💻 کدنویس‌ها</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              send({type: "ARSHNAZ_GO_ANJEERAN"});
              toast.info("⎊ پرواز به سوی سیارهٔ انجیران", {
                description: "مهندسان معلق در حال ساخت قطعات سازهٔ چشم بزرگ هستند."
              });
            }}
            className="h-7 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"
            title="سیارهٔ انجیران · مهراسپند"
          >
            <span>⎊ انجیران</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              send({type: "ARSHNAZ_OPEN_NEXUS"});
              toast.info("👁️ کانون همگرایی کیهانی چشم بزرگ", {
                description: "اتحاد ۴ قدرت (فرشته، گوراستاخ، کدنویس‌ها، انجیران) در برابر انرژی تاریک."
              });
            }}
            className="h-7 text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30 gap-1"
            title="کانون همگرایی کیهانی و چشم بزرگ"
          >
            <span>👁️ چشم بزرگ</span>
          </Button>

          {/* Cloud Sync Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSaveToCloud()}
            disabled={!gameReady || syncingCloud || !user}
            className="h-7 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1"
            title={user ? "ذخیره در سرور ابری فایربیس ارشناز" : "ابتدا وارد حساب شوید"}
          >
            {syncingCloud ? (
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
            ) : (
              <Cloud className="w-3 h-3 text-emerald-400" />
            )}
            <span className="hidden sm:inline">ذخیره در فایربیس</span>
          </Button>

          {/* Fullscreen Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-7 w-7 text-slate-400 hover:text-slate-100"
            title={isFullscreen ? "خروج از تمام‌صفحه" : "حالت تمام‌صفحه"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>

          {/* Open Standalone in New Tab */}
          <a
            href="/caravan/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-100 p-1"
            title="باز کردن در پنجرهٔ مجزا"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {!gameReady && <p role="status" className="px-4 py-2 text-xs text-amber-300">{bridgeError || 'در حال آماده‌سازی بازی…'}</p>}
      {conflict && conflict.owner===owner && <div role="status" className="px-4 py-2 text-xs">ذخیرهٔ ابری دیگری وجود دارد؛ پیشرفت محلی حفظ شده است.
        <Button disabled={syncingCloud} onClick={()=>void handleRestoreFromCloud()}>بازیابی نسخهٔ ابری</Button>
        <Button disabled={syncingCloud} onClick={()=>void handleSaveToCloud(conflict.revision)}>جایگزینی با نسخهٔ محلی</Button>
      </div>}
      {/* Main 3D Game Canvas Iframe */}
      <div className="flex-1 w-full h-full relative bg-black">
        <iframe
          ref={iframeRef}
          src="/caravan/index.html?v=reliability-2"
          className="w-full h-full border-0 block"
          title="کاروان رؤیاها · ریشه‌های نور"
          allow="autoplay; fullscreen"
          onLoad={sendStateToGame}
        />
      </div>
    </div>
  );
}
