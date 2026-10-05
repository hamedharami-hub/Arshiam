import {runTransaction} from 'firebase/firestore';
import {db,doc,getDoc,serverTimestamp} from './firebase';
import {normalizeState,type CaravanState} from '../../public/caravan/state.js';
export class CaravanConflictError extends Error {constructor(public revision:number,public state:CaravanState){super('ذخیرهٔ ابری دیگری وجود دارد؛ ابتدا آن را بازیابی کن یا جایگزینی را انتخاب کن.');}}
function record(raw:Record<string,unknown>,owner:string){if(raw.userId && raw.userId!==owner)throw new Error('مالک ذخیره معتبر نیست.');return {state:normalizeState(raw.state||raw,owner),revision:typeof raw.revision==='number'&&Number.isSafeInteger(raw.revision)&&raw.revision>=0?raw.revision:0};}
export async function loadCaravanCloud(owner:string){const snap=await getDoc(doc(db,'users',owner,'caravan_profile','save_v1'));if(!snap.exists())throw new Error('ذخیرهٔ ابری یافت نشد.');return record(snap.data(),owner);}
export async function saveCaravanCloud(owner:string,input:unknown,base:number|null){
 const state=normalizeState(input,owner),ref=doc(db,'users',owner,'caravan_profile','save_v1');
 return runTransaction(db,async transaction=>{
  const snap=await transaction.get(ref),existing=snap.exists()?record(snap.data(),owner):null;
  if(existing && (base===null||existing.revision!==base))throw new CaravanConflictError(existing.revision,existing.state);
  if(!existing&&base!==null&&base!==0)throw new Error('ذخیرهٔ ابری تغییر کرده است.');
  const revision=(existing?.revision||0)+1;transaction.set(ref,{schemaVersion:2,userId:owner,state,revision,updatedAt:serverTimestamp()});return revision;
 });
}
