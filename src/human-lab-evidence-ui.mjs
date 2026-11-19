import {humanSnapshot,humanOBJ,HUMAN_CHECKS} from './human-lab-evidence.mjs?rev=human-evidence-4';
export function mountHumanEvidence({T,slots,revision,getPose,getAnimated}){
 const el=id=>document.getElementById(id),panel=el('humanEvidence'),model=el('humanEvidenceModel'),status=el('humanEvidenceStatus'),checks=el('humanChecks'),notes=el('humanEvidenceNotes'),info=el('humanEvidenceInfo');
 const storageKey='hunter-human-validation-v1';let records={},role=null,options=[],catalogId='';
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');if(saved&&typeof saved==='object')records=saved}catch{}
 const key=()=>revision+':'+catalogId+':'+role+':'+model.value;
 const states=['unknown','pass','fail','na'];
 const record=()=>records[key()]||{status:'candidate',checks:{},notes:'',history:[]};
 const save=()=>{
  if(!role)return;
  const prev=record(),next={status:status.value,checks:Object.fromEntries([...checks.querySelectorAll('select')].map(x=>[x.dataset.check,x.value])),notes:notes.value};
  if(JSON.stringify([prev.status,prev.checks,prev.notes])===JSON.stringify([next.status,next.checks,next.notes]))return;
  next.history=[...(prev.history||[]),{at:new Date().toISOString(),status:next.status,checks:next.checks,notes:next.notes}].slice(-50);
  records[key()]=next;try{localStorage.setItem(storageKey,JSON.stringify(records))}catch{info.textContent='No es pot desar localment. Exporta l’informe per conservar els canvis.'}
 };
 const render=()=>{
  const r=record();status.disabled=notes.disabled=false;status.value=r.status;notes.value=r.notes;checks.replaceChildren();
  for(const [id,label] of HUMAN_CHECKS){
   const wrap=document.createElement('label'),input=document.createElement('select');wrap.textContent=label+' ';input.dataset.check=id;
   for(const [v,l]of [['unknown','Pendent'],['pass','Correcte (manual)'],['fail','Regressió'],['na','No aplicable']])input.add(new Option(l,v));
   input.value=states.includes(r.checks[id])?r.checks[id]:'unknown';input.addEventListener('change',save);wrap.append(input);checks.append(wrap);
  }
  info.textContent='Variant HUMANS V18: la fitxa registra la malla visible; les proves manuals són independents de les proves automàtiques.';
 };
 const download=(name,data,type)=>{const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const variant=i=>options[i]?.style||'a';
 const current=i=>slots[i+1]?.model;
 const snapshot=i=>humanSnapshot(T,current(i),{role,variant:variant(i),swimVariant:options[i]?.swimVariant||null,revision,pose:getPose(),animated:getAnimated()});
 model.addEventListener('change',render);status.addEventListener('change',save);notes.addEventListener('input',save);
 el('humanObj').addEventListener('click',()=>{try{if(!role)return;const i=Number(model.value),s=snapshot(i);download('hunter-'+role+'-'+variant(i)+'.obj',humanOBJ(T,current(i),s),'text/plain');info.textContent='OBJ exportat: '+s.meshes+' malles, '+s.triangles+' triangles.'}catch(e){info.textContent=e.message}});
 el('humanEvidenceExport').addEventListener('click',()=>{try{if(!role)return;save();const variants=options.map((option,i)=>({...snapshot(i),label:option.title,review:records[revision+':'+catalogId+':'+role+':'+i]||null}));download('hunter-'+role+'-validacio.json',JSON.stringify({format:'hunter-human-review-v1',revision,role,exportedAt:new Date().toISOString(),variants,historyScope:'local browser, current lab revision'},null,2),'application/json');info.textContent='Informe de '+variants.length+' malles exportat.'}catch(e){info.textContent=e.message}});
 return {show(next,entries=[],id=''){role=next;options=entries||[];catalogId=id;panel.hidden=!role;if(role){model.replaceChildren(...options.map((option,i)=>new Option(option.title,String(i))));model.value='0';render()}}};
}
