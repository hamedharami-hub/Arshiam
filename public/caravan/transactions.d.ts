import type {CaravanState} from './state.js';
interface GardenResources {sunEnergy:number;waterDrops:number;focusBlossoms:number;totalHarvests:number;caravanAppliedTransfers?:string[];}
interface Options {storage:Storage;owner:string;readGarden:()=>GardenResources;writeGarden:(state:GardenResources)=>void;}
export function performTransfer(options:Options & {id:string;action:string;payload?:Record<string,unknown>}):CaravanState;
export function replayTransfers(options:Options):void;
export function hasPendingTransfers(storage:Storage,owner:string):boolean;
