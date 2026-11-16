import {humanSnapshot,humanOBJ,HUMAN_CHECKS} from './human-lab-evidence.mjs?rev=human-evidence-4';
export function mountHumanEvidence({T,slots,revision,getPose,getAnimated}){
 const el=id=>document.getElementById(id),panel=el('humanEvidence'),model=el('humanEvidenceModel'),status=el('humanEvidenceStatus'),checks=el('humanChecks'),notes=el('humanEvidenceNotes'),info=el('humanEvidenceInfo');
 const storageKey='hunter-human-validation-v1';let records={},role=null;
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');if(saved&&typeof saved==='object')records=saved}catch{}
 const key=()=>revision+':'+role+':'+model.value;
 const states=['unknown','pass','fail','na'];
 const record=()=>records[key()]||{status:'candidate',checks:{},notes:'',history:[]};
 const save=()=>{
  if(!role||model.value==='0')return;
  const prev=record(),next={status:status.value,checks:Object.fromEntries([...checks.querySelectorAll('select')].map(x=>[x.dataset.check,x.value])),notes:notes.value};
  if(JSON.stringify([prev.status,prev.checks,prev.notes])===JSON.stringify([next.status,next.checks,next.notes]))return;
  next.history=[...(prev.history||[]),{at:new Date().toISOString(),status:next.status,checks:next.checks,notes:next.notes}].slice(-50);
  records[key()]=next;try{localStorage.setItem(storageKey,JSON.stringify(records))}catch{info.textContent='No es pot desar localment. Exporta l’informe per conservar els canvis.'}
 };
 const render=()=>{
  const original=model.value==='0',r=record();status.disabled=notes.disabled=original;status.value=r.status;notes.value=r.notes;checks.replaceChildren();
  for(const [id,label] of HUMAN_CHECKS){
   const wrap=document.createElement('label'),input=document.createElement('select');wrap.textContent=label+' ';input.dataset.check=id;input.disabled=original;
   for(const [v,l]of [['unknown','Pendent'],['pass','Correcte (manual)'],['fail','Regressió'],['na','No aplicable']])input.add(new Option(l,v));
   input.value=states.includes(r.checks[id])?r.checks[id]:'unknown';input.addEventListener('change',save);wrap.append(input);checks.append(wrap);
  }
  info.textContent=original?'Referència de la fàbrica real del joc (postura neutra).':'Candidat de laboratori: cap canvi publicat al joc. Les proves manuals són independents de les proves automàtiques.';
 };
 const download=(name,data,type)=>{const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const variant=i=>['actual','a','b'][i];
 const current=i=>slots[i]?.model;
 const snapshot=i=>humanSnapshot(T,current(i),{role,variant:variant(i),revision,pose:i===0?'rest':getPose(),animated:i!==0&&getAnimated()});
 model.addEventListener('change',render);status.addEventListener('change',save);notes.addEventListener('input',save);
 el('humanObj').addEventListener('click',()=>{try{if(!role)return;const i=Number(model.value),s=snapshot(i);download('hunter-'+role+'-'+variant(i)+'.obj',humanOBJ(T,current(i),s),'text/plain');info.textContent='OBJ exportat: '+s.meshes+' malles, '+s.triangles+' triangles.'}catch(e){info.textContent=e.message}});
 el('humanEvidenceExport').addEventListener('click',()=>{try{if(!role)return;save();const variants=[0,1,2].map(i=>({...snapshot(i),review:i===0?null:records[revision+':'+role+':'+i]||null}));download('hunter-'+role+'-validacio.json',JSON.stringify({format:'hunter-human-review-v1',revision,role,exportedAt:new Date().toISOString(),variants,historyScope:'local browser, current lab revision'},null,2),'application/json');info.textContent='Informe de les tres malles exportat.'}catch(e){info.textContent=e.message}});
 return {show(next){role=next;panel.hidden=!role;if(role){model.value='0';render()}}};
}
