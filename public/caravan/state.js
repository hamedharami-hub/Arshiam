// Shared boundary for local, imported and cloud saves. No DOM or Firebase dependency.
export const REGIONS = ['garden','greenhouse','home','village','grove','sanctuary'];
const ids = v => typeof v === 'string' && /^[a-z0-9_:-]{1,100}$/i.test(v) && !['__proto__','prototype','constructor'].includes(v);
const num = (v, fallback = 0, max = Number.MAX_SAFE_INTEGER) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(max,v) : fallback;
const choice = (v, values, fallback) => values.includes(v) ? v : fallback;
const list = (v, valid) => Array.isArray(v) ? [...new Set(v.filter(valid))] : [];
const text = v => typeof v === 'string' ? v.replace(/[<>&"']/g, '').slice(0,200) : '';
export const storageKey = owner => `dream-caravan:save:v2:${encodeURIComponent(owner)}`;
export function defaultState(owner) {
 return {version:2,ownerId:owner,collected:[],invention:null,restored:false,plants:[],plotLevel:1,essence:0,houseLevel:0,aura:0,projects:[],hybrids:false,lastGatherAt:null,worldSeed:crypto.getRandomValues(new Uint32Array(1))[0]%2147483646+1,regionLevels:Object.fromEntries(REGIONS.map(x=>[x,0])),decorations:[],visited:['garden'],gorHair:'white',angelHair:'black',gorOutfit:'classic',angelOutfit:'classic',synthesizedHybrids:[],cosmicStructures:[],activeHybridId:null,activeCompanionId:null,soulBond:15,bondFlameIgnited:false,powerAngel:25,powerGor:25,powerCoders:25,powerAnjeeran:25,appliedTransfers:[]};
}
export function normalizeState(input, owner) {
 if (!input || typeof input !== 'object' || ![1,2].includes(input.version) || !Array.isArray(input.collected)) throw new Error('ذخیرهٔ بازی معتبر نیست.');
 if (input.ownerId && input.ownerId !== owner) throw new Error('این ذخیره متعلق به حساب دیگری است.');
 const s = defaultState(owner);
 s.collected = list(input.collected,x=>['seed','crystal','feather'].includes(x));
 s.invention = s.collected.length===3 ? choice(input.invention,['lantern','sprout'],null):null;
 s.restored = !!input.restored && !!s.invention;
 s.plotLevel = Math.floor(num(input.plotLevel,1,5)) || 1;
 s.plants = (Array.isArray(input.plants)?input.plants:[]).filter(p=>p && ids(p.id) && ['moonflower','sunblossom','spiritfern','starlily','rose','bonsai','orchid','lotus','palm','bamboo','blacklotus','shadoworchid'].includes(p.species) && Number.isInteger(p.col) && Number.isInteger(p.row) && p.col>=3-s.plotLevel && p.col<5+s.plotLevel && p.row>=3-s.plotLevel && p.row<5+s.plotLevel).map(p=>({id:p.id,species:p.species,col:p.col,row:p.row,plantedAt:num(p.plantedAt),boostMs:num(p.boostMs),lastWaterAt:num(p.lastWaterAt),lastHarvestAt:p.lastHarvestAt==null?null:num(p.lastHarvestAt)}));
 for(const k of ['essence','houseLevel','aura','worldSeed']) s[k]=num(input[k],s[k],k==='essence'?100000:k==='worldSeed'?2147483647:3);
 s.worldSeed=Math.max(1,s.worldSeed);
 s.projects=list(input.projects,x=>['bench','pond','greenhouse','lamps','fountain','bridge','butterfly','seedvault','moonlab','library','skyterrace','market','gathering','spiritgate','waterfall','memory','constellation'].includes(x));
 s.hybrids=input.hybrids===true;
 s.lastGatherAt=input.lastGatherAt==null?null:num(input.lastGatherAt);
 s.regionLevels=Object.fromEntries(REGIONS.map(x=>[x,num(input.regionLevels?.[x],0,20)]));
 s.decorations=(Array.isArray(input.decorations)?input.decorations:[]).filter(d=>d && REGIONS.includes(d.district) && Number.isInteger(d.slot) && d.slot>=0 && ['crystal','arbor','pool','pavilion'].includes(d.kind) && d.slot<8+Math.floor(s.regionLevels[d.district])*4).map(d=>({district:d.district,slot:d.slot,kind:text(d.kind)}));
 s.visited=[...new Set(['garden',...list(input.visited,x=>REGIONS.includes(x))])];
 for(const k of ['gorHair','angelHair']) s[k]=choice(input[k],['black','brown','white'],s[k]);
 for(const k of ['gorOutfit','angelOutfit']) s[k]=choice(input[k],['classic','traveler','celestial'],'classic');
 for(const k of ['soulBond','powerAngel','powerGor','powerCoders','powerAnjeeran']) s[k]=num(input[k],s[k],100);
 s.bondFlameIgnited=input.bondFlameIgnited===true;
 const elements=['angel','coder','anjeeran','gorastakh'];
 s.synthesizedHybrids=(Array.isArray(input.synthesizedHybrids)?input.synthesizedHybrids:[]).filter(h=>h && ids(h.id) && elements.includes(h.primary) && elements.includes(h.secondary)).map(h=>({id:h.id,name:text(h.name),stage:Math.max(1,Math.floor(num(h.stage,1,4))),primary:h.primary,secondary:h.secondary,color:/^#[a-f0-9]{6}$/i.test(h.color)?h.color:'#38bdf8',secondaryColor:/^#[a-f0-9]{6}$/i.test(h.secondaryColor)?h.secondaryColor:'#eab308',createdAt:num(h.createdAt),traits:Object.fromEntries(['resonance','buoyancy','essenceYield','darkWard'].map(k=>[k,text(h.traits?.[k])]))}));
 s.cosmicStructures=list(input.cosmicStructures,x=>['coder_monolith','neural_pyramid','floating_terminal','anjeeran_habitat','resonance_ring','solar_harvester','angel_shrine','gor_totem','grand_haven'].includes(x));
 for(const k of ['activeHybridId','activeCompanionId']) s[k]=s.synthesizedHybrids.some(h=>h.id===input[k])?input[k]:null;
 s.appliedTransfers=list(input.appliedTransfers,ids);
 return s;
}
export function loadState(storage,owner) {
 const raw=storage.getItem(storageKey(owner));
 if(!raw)return defaultState(owner);
 try{return normalizeState(JSON.parse(raw),owner);}catch(error){storage.setItem(`${storageKey(owner)}:recovery:${Date.now()}`,raw);error.recoverySaved=true;throw error;}
}
export function restoreState(storage,owner,input) {
 const state=normalizeState(input,owner),key=storageKey(owner),old=storage.getItem(key);
 if(old){storage.setItem(`${key}:backup:${Date.now()}`,old);const previous=normalizeState(JSON.parse(old),owner);state.appliedTransfers=[...new Set([...state.appliedTransfers,...previous.appliedTransfers])];}
 storage.setItem(key,JSON.stringify(state));return state;
}
export function trustedMessage(event, source, origin) {return event.source===source && event.origin===origin && event.data?.bridgeVersion===1;}
