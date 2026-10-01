import type{ShiftState}from'./shifts';
const KEY='zf.shift.v1';
export function saveShift(s:ShiftState|null){if(s)localStorage.setItem(KEY,JSON.stringify(s));else localStorage.removeItem(KEY)}
export function loadShift():ShiftState|null{try{const x=localStorage.getItem(KEY);return x?JSON.parse(x):null}catch{return null}}
export function exportShift(s:ShiftState){const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`shift-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)}
