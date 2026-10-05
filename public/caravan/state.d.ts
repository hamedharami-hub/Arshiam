export interface CaravanState {version:number;ownerId:string;essence:number;worldSeed:number;restored:boolean;appliedTransfers:string[];[key:string]:unknown;}
export function storageKey(owner:string):string;
export function defaultState(owner:string):CaravanState;
export function normalizeState(input:unknown,owner:string):CaravanState;
export function loadState(storage:Storage,owner:string):CaravanState;
export function restoreState(storage:Storage,owner:string,input:unknown):CaravanState;
export function trustedMessage(event:MessageEvent,source:Window|null|undefined,origin:string):boolean;
