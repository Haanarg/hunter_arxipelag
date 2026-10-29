// Lossless state updates: unchanged entities and static world data stay at the client.
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function diffCoopState(before,after){
 if(before===after)return null;
 if(before===null||after===null||typeof before!=='object'||typeof after!=='object'||Array.isArray(before)!==Array.isArray(after))return {v:after};
 if(Array.isArray(after)){
  const key=['id','actorId'].find(k=>after.length&&before.length&&[before,after].every(rows=>rows.every(r=>r&&typeof r==='object'&&typeof r[k]==='string')&&new Set(rows.map(r=>r[k])).size===rows.length));
  if(key){
   const old=new Map(before.map(row=>[row[key],row])),patches=Object.create(null);let changed=false;
   for(const row of after){const patch=diffCoopState(old.get(row[key]),row);if(patch){patches[row[key]]=patch;changed=true;}}
   const order=after.map(row=>row[key]),sameOrder=before.length===after.length&&before.every((row,i)=>row[key]===order[i]);
   return changed||!sameOrder?{k:key,p:patches,...(!sameOrder?{o:order}:{})}:null;
  }
  if(before.length===after.length&&before.every((row,i)=>diffCoopState(row,after[i])===null))return null;
  return {v:after};
 }
 const patch=Object.create(null),removed=[];
 for(const key of Object.keys(after)){if(after[key]===undefined)continue;const next=diffCoopState(before[key],after[key]);if(next)patch[key]=next;}
 for(const key of Object.keys(before))if(before[key]!==undefined&&(!own(after,key)||after[key]===undefined))removed.push(key);
 return Object.keys(patch).length||removed.length?{p:patch,...(removed.length?{r:removed}:{})}:null;
}
export function applyCoopDelta(before,delta){
 if(!delta)return before;if(own(delta,'v'))return delta.v;
 if(delta.k){const old=new Map(before.map(row=>[row[delta.k],row])),order=delta.o||before.map(row=>row[delta.k]);return order.map(id=>applyCoopDelta(old.get(id),delta.p[id]));}
 const result={...before};for(const key of delta.r||[])delete result[key];
 for(const [key,patch] of Object.entries(delta.p))Object.defineProperty(result,key,{value:applyCoopDelta(before?.[key],patch),enumerable:true,writable:true,configurable:true});
 return result;
}
