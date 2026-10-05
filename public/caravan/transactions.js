import {normalizeState,storageKey} from './state.js';
export const COSTS={coder_monolith:[5,5,0,0],neural_pyramid:[8,0,0,1],floating_terminal:[4,0,0,0],anjeeran_habitat:[10,0,0,2],resonance_ring:[6,0,10,0],solar_harvester:[5,10,0,0],angel_shrine:[6,0,0,0],gor_totem:[4,0,10,0],grand_haven:[12,0,0,1]};
const journalKey=owner=>`dream-caravan:transfers:v1:${encodeURIComponent(owner)}`;
const readJournal=(storage,owner)=>JSON.parse(storage.getItem(journalKey(owner))||'{}');
export function hasPendingTransfers(storage,owner){return Object.values(readJournal(storage,owner)).some(e=>e.status==='prepared');}
export function prepareAction(input,owner,action,payload={}) {
 const state=normalizeState(input,owner);let cost=[0,0,0,0],bond=0;
 switch(action){
 case 'convert-sun':cost=[-10,10,0,0];break;
 case 'convert-water':cost=[-10,0,20,0];break;
 case 'create-hybrid':{
  const h=payload.hybrid;if(!h || state.synthesizedHybrids.some(x=>x.id===h.id))throw new Error('موجود تکراری یا نامعتبر است.');
  const test=normalizeState({...state,synthesizedHybrids:[{...h,stage:1}]},owner);
  if(test.synthesizedHybrids.length!==1)throw new Error('موجود معتبر نیست.');
  state.synthesizedHybrids.push(test.synthesizedHybrids[0]);state.activeHybridId=h.id;state.activeCompanionId=h.id;cost=[6,0,0,0];bond=10;break;
 }
 case 'evolve-hybrid':{
  const h=state.synthesizedHybrids.find(x=>x.id===payload.id);if(!h || h.stage>=4)throw new Error('مرحلهٔ رشد معتبر نیست.');
  cost=h.stage===1?[5,0,0,0]:h.stage===2?[8,0,0,1]:[12,0,10,0];h.stage++;bond=15;state.powerAngel=Math.min(100,state.powerAngel+15);state.powerCoders=Math.min(100,state.powerCoders+15);break;
 }
 case 'build':if(!Object.hasOwn(COSTS,payload.id)||state.cosmicStructures.includes(payload.id))throw new Error('سازه ناشناخته یا قبلاً ساخته شده است.');cost=COSTS[payload.id];state.cosmicStructures.push(payload.id);bond=15;break;
 case 'charge-anjeeran':cost=[0,0,0,1];state.powerAnjeeran=Math.min(100,state.powerAnjeeran+30);break;
 case 'restore-reward':if(!state.restored)throw new Error('باغ هنوز احیا نشده است.');cost=[0,-25,-50,0];break;
 default:throw new Error('عملیات ناشناخته است.');
 }
 if(state.essence<cost[0])throw new Error('گوهر نور کافی نیست.');
 state.essence-=cost[0];state.soulBond=Math.min(100,state.soulBond+bond);state.powerAngel=Math.min(100,state.powerAngel+Math.round(bond*.4));state.powerGor=Math.min(100,state.powerGor+Math.round(bond*.6));
 return {state,delta:{sunEnergy:-cost[1],waterDrops:-cost[2],focusBlossoms:-cost[3],totalHarvests:action==='restore-reward'?1:0}};
}
export function performTransfer({storage,owner,id,action,payload={},readGarden,writeGarden}) {
 if(typeof id!=='string'||! /^[a-z0-9_:-]{1,100}$/i.test(id)||['__proto__','constructor','prototype'].includes(id))throw new Error('شناسهٔ عملیات نامعتبر است.');
 const key=storageKey(owner),journal=readJournal(storage,owner);
 let entry=Object.hasOwn(journal,id)?journal[id]:null;
 if(entry && (entry.action!==action||JSON.stringify(entry.payload)!==JSON.stringify(payload)))throw new Error('شناسهٔ عملیات قبلاً استفاده شده است.');
 if(entry?.status==='done')return normalizeState(JSON.parse(storage.getItem(key)),owner);
 if(!entry){
  if(Object.values(journal).some(e=>e.status==='prepared'))throw new Error('عملیات قبلی در انتظار تکمیل است.');
  const current=normalizeState(JSON.parse(storage.getItem(key)),owner);
  if(action==='restore-reward' && id!==`restore:${current.worldSeed}`)throw new Error('شناسهٔ پاداش نامعتبر است.');
  if(current.appliedTransfers.includes(id))return current;
  const result=prepareAction(current,owner,action,payload);const garden=readGarden();
  for(const field of Object.keys(result.delta))if(typeof garden[field]!=='number'||!Number.isFinite(garden[field])||garden[field]+result.delta[field]<0)throw new Error('منابع کافی یا معتبر نیستند.');
  entry={action,payload,after:{...result.state,appliedTransfers:[...current.appliedTransfers,id]},delta:result.delta,status:'prepared'};
  journal[id]=entry;storage.setItem(journalKey(owner),JSON.stringify(journal));
 }
 const garden=readGarden();
 if(!(garden.caravanAppliedTransfers||[]).includes(id)){
  const next={...garden,caravanAppliedTransfers:[...(garden.caravanAppliedTransfers||[]),id]};
  for(const field of Object.keys(entry.delta)){next[field]=garden[field]+entry.delta[field];if(!Number.isFinite(next[field])||next[field]<0)throw new Error('منابع کافی نیستند.');}
  writeGarden(next);if(!(readGarden().caravanAppliedTransfers||[]).includes(id))throw new Error('ثبت منابع انجام نشد؛ عملیات در انتظار تکمیل است.');
 }
 const current=normalizeState(JSON.parse(storage.getItem(key)),owner);
 if(!current.appliedTransfers.includes(id))storage.setItem(key,JSON.stringify(entry.after));
 entry.status='done';storage.setItem(journalKey(owner),JSON.stringify(journal));
 return normalizeState(JSON.parse(storage.getItem(key)),owner);
}
export function replayTransfers(options){for(const [id,entry] of Object.entries(readJournal(options.storage,options.owner)))if(entry.status==='prepared')performTransfer({...options,id,action:entry.action,payload:entry.payload});}
