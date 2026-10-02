import type {Area,Movement}from'../types';
export type Operator={name:string;home:Area;start:Area;current:Area};export type ShiftState={startedAt:string;operators:Operator[];movements:Movement[]};
export function createShift(assignments:{name:string;area:Area}[]):ShiftState{return{startedAt:new Date().toISOString(),operators:assignments.map(x=>({name:x.name,home:x.area,start:x.area,current:x.area})),movements:[]}}
export function addOperatorToShift(state:ShiftState,name:string,area:Area):ShiftState{if(state.operators.some(operator=>operator.name===name))return state;return{...state,operators:[...state.operators,{name,home:area,start:area,current:area}]}}
export function moveOperator(state:ShiftState,name:string,to:Area,at=new Date().toISOString()):ShiftState{const op=state.operators.find(x=>x.name===name);if(!op||op.current===to)return state;const from=op.current;return{...state,operators:state.operators.map(x=>x.name===name?{...x,current:to}:x),movements:[...state.movements,{person:name,from,to,at}]}}
export function movedOnly(s:ShiftState){return s.operators.filter(x=>x.current!==x.start)}
export function areaCounts(s:ShiftState){return s.operators.reduce<Record<string,number>>((a,x)=>(a[x.current]=(a[x.current]||0)+1,a),{})}
export function returnToStart(s:ShiftState,name:string){const op=s.operators.find(x=>x.name===name);return op?moveOperator(s,name,op.start):s}
