// Lossless state updates: unchanged entities and static world data stay at the client.
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
// Valida els identificadors i crea un únic índex de la base antiga.
function indexUniqueRows(before,after,key){
 if(!before.length||!after.length)return null;
 const old=new Map();
 for(const row of before){
  const id=row?.[key];
  if(typeof id!=='string'||old.has(id))return null;
  old.set(id,row);
 }
 const seen=new Set();
 for(const row of after){
  const id=row?.[key];
  if(typeof id!=='string'||seen.has(id))return null;
  seen.add(id);
 }
 return old;
}
export function diffCoopState(before,after){
 if(before===after)return null;
 if(before===null||after===null||typeof before!=='object'||typeof after!=='object'||Array.isArray(before)!==Array.isArray(after))return {v:after};
 if(Array.isArray(after)){
  const byId=indexUniqueRows(before,after,'id');
  const key=byId?'id':'actorId',old=byId||indexUniqueRows(before,after,'actorId');
  if(old){
   const patches=Object.create(null);let changed=false,
     sameOrder=before.length===after.length;
   for(let i=0;i<after.length;i++){
    const row=after[i],id=row[key],patch=diffCoopState(old.get(id),row);
    if(patch){patches[id]=patch;changed=true;}
    if(sameOrder&&before[i][key]!==id)sameOrder=false;
   }
   if(!changed&&sameOrder)return null;
   if(sameOrder)return {k:key,p:patches};
   return {k:key,p:patches,o:after.map(row=>row[key])};
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
 if(delta.k){
  // Cas habitual: l'ordre dels identificadors no ha canviat. Podem
  // aplicar el patch directament per posició, sense Map ni array d'IDs.
  // Les files no modificades conserven la referència original.
  if(!delta.o)return before.map(row=>{
   const id=row[delta.k];
   return applyCoopDelta(row,own(delta.p,id)?delta.p[id]:null);
  });
  // Només els canvis reals d'ordre necessiten indexar la base anterior.
  const old=new Map(before.map(row=>[row[delta.k],row]));
  return delta.o.map(id=>applyCoopDelta(old.get(id),own(delta.p,id)?delta.p[id]:null));
 }
 const result={...before};for(const key of delta.r||[])delete result[key];
 for(const [key,patch] of Object.entries(delta.p))Object.defineProperty(result,key,{value:applyCoopDelta(before?.[key],patch),enumerable:true,writable:true,configurable:true});
 return result;
}
