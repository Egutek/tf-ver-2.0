import type {Area,Detection} from '../types';
export const AREAS:Area[]=['TRANSPORT','OUTBOUND','HOVS/ML','VNA','VNAS','VNAC','PUTAWAY','VAS','OBWI','HAZMAT','OBWF'];
export type ReviewStats={total:number;verified:number;uncertain:number;duplicates:string[];unknownArea:number};
export function reviewStats(rows:Detection[],dups:string[]):ReviewStats{return{total:rows.length,verified:rows.filter(x=>x.matched&&!x.warning&&x.area!=='UNKNOWN').length,uncertain:rows.filter(x=>x.warning||!x.matched).length,duplicates:dups,unknownArea:rows.filter(x=>x.area==='UNKNOWN').length}}
export function canStartShift(s:ReviewStats){return s.total>0&&s.uncertain===0&&s.duplicates.length===0&&s.unknownArea===0}
