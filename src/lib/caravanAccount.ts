import {getGardenOwnerId,getGardenState,saveGardenState,type GardenState} from './garden';
import {performTransfer,replayTransfers,hasPendingTransfers} from '../../public/caravan/transactions.js';
export function caravanAccount(owner:string){
 const ensure=()=>{if(getGardenOwnerId()!==owner)throw new Error('حساب باغ هنوز هماهنگ نشده است.');};
 const options={storage:localStorage,owner,readGarden:()=>{ensure();return getGardenState();},writeGarden:(s:Pick<GardenState,'sunEnergy'|'waterDrops'|'focusBlossoms'|'totalHarvests'|'caravanAppliedTransfers'>)=>{ensure();saveGardenState({...getGardenState(),...s});}};
 return {transfer:(id:string,action:string,payload:Record<string,unknown>)=>performTransfer({...options,id,action,payload}),replay:()=>replayTransfers(options),pending:()=>hasPendingTransfers(localStorage,owner)};
}
