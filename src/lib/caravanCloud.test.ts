import {beforeEach,describe,expect,it,vi} from 'vitest';
import {defaultState} from '../../public/caravan/state.js';
const cloud=vi.hoisted(()=>({value:null as Record<string,unknown>|null}));
vi.mock('./firebase',()=>({db:{},doc:()=>({}),serverTimestamp:()=>({server:true}),getDoc:async()=>({exists:()=>cloud.value!==null,data:()=>cloud.value})}));
vi.mock('firebase/firestore',()=>({runTransaction:async(_db:unknown,fn:(transaction:unknown)=>Promise<unknown>)=>fn({get:async()=>({exists:()=>cloud.value!==null,data:()=>cloud.value}),set:(_ref:unknown,value:Record<string,unknown>)=>{cloud.value=value;}})}));
import {CaravanConflictError,loadCaravanCloud,saveCaravanCloud} from './caravanCloud';
describe('Caravan cloud revision boundary (mock, no live Firebase writes)',()=>{
 beforeEach(()=>{cloud.value=null;});
 it('saves and restores complete normalized snapshot',async()=>{const state={...defaultState('alice'),essence:17,powerAngel:0};expect(await saveCaravanCloud('alice',state,null)).toBe(1);const result=await loadCaravanCloud('alice');expect(result.revision).toBe(1);expect(result.state).toEqual(state);});
 it('blocks unknown or stale base revision without overwriting cloud',async()=>{await saveCaravanCloud('alice',defaultState('alice'),null);const original=structuredClone(cloud.value);await expect(saveCaravanCloud('alice',{...defaultState('alice'),essence:99},null)).rejects.toBeInstanceOf(CaravanConflictError);await expect(saveCaravanCloud('alice',defaultState('alice'),0)).rejects.toBeInstanceOf(CaravanConflictError);expect(cloud.value).toEqual(original);});
 it('explicit replacement still checks server revision',async()=>{await saveCaravanCloud('alice',defaultState('alice'),null);expect(await saveCaravanCloud('alice',{...defaultState('alice'),essence:42},1)).toBe(2);await expect(saveCaravanCloud('alice',defaultState('alice'),1)).rejects.toBeInstanceOf(CaravanConflictError);expect((await loadCaravanCloud('alice')).state.essence).toBe(42);});
 it('rejects owner mismatch and malformed remote data',async()=>{cloud.value={userId:'bob',state:defaultState('bob')};await expect(loadCaravanCloud('alice')).rejects.toThrow();cloud.value={userId:'alice',state:{version:99}};await expect(loadCaravanCloud('alice')).rejects.toThrow();});
});
