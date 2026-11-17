// A single root laboratory. Preview pages are loaded only when selected.
export const SECTIONS=Object.freeze([
 {id:'characters',title:'Personatges'},
 {id:'vehicles',title:'Vehicles'},
 {id:'nature',title:'Natura'},
 {id:'animations',title:'Animacions'},
 {id:'compounds',title:'Complexos'}
]);
export const SECTION_TOOLS=Object.freeze({
 nature:[
  {id:'rocks',title:'Roques i taurons',url:'roques-taurons-proves.html'},
  {id:'explosions',title:'Explosions',url:'explosions-proves.html'},
  {id:'arcade',title:'Explosions arcade',url:'explosions-arcade-proves.html'},
  {id:'explosives',title:'Explosius',url:'explosius-proves.html'}
 ],
 animations:[
  {id:'gait',title:'Caminar, córrer i postures',editor:'characters'},
  {id:'shoot',title:'Dispar',url:'dispar-proves.html'},
  {id:'finale',title:'Seqüència final',url:'final-proves.html'}
 ],
 compounds:[
  {id:'phase1',title:'Fase 1',url:'compounds-preview.html'},
  {id:'phase2',title:'Fase 2',url:'compounds-preview.html?fase=2'},
  {id:'phase3',title:'Fase 3',url:'compounds-preview.html?fase=3'},
  {id:'phase4',title:'Fase 4',url:'compounds-preview.html?fase=4'}
 ]
});
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id);
 const root=$('modelWorkshop'),editorNav=$('modelViewNav'),preview=$('sectionPreview');
 const subnav=$('sectionTools'),frame=$('sectionFrame'),open=$('sectionOpen');
 const pills=[...document.querySelectorAll('#sectionTabs button[data-section]')];
 const params=new URLSearchParams(location.search);
 const requestedModel=params.get('model')||params.get('vehicle')||'';
 const inferred=requestedModel.startsWith('human-')?'characters':requestedModel?'vehicles':'characters';
 const valid=id=>SECTIONS.some(s=>s.id===id);
 const savedTool={},initialSection=params.get('seccio')||inferred;
 let section=null;
 const currentTool=()=>SECTION_TOOLS[section]?.find(t=>t.id===savedTool[section])||SECTION_TOOLS[section]?.[0]||null;
 function updateUrl(){
  const next=new URL(location.href);
  next.searchParams.set('seccio',section);
  next.searchParams.delete('model');next.searchParams.delete('vehicle');
  const tool=currentTool();
  if(tool)next.searchParams.set('prova',tool.id);
  else next.searchParams.delete('prova');
  history.replaceState(null,'',next);
 }
 function present(updateHistory=true){
  const tool=currentTool();
  const editorKind=section==='characters'?'characters':section==='vehicles'?'vehicles':tool?.editor||null;
  const showEditor=!!editorKind;
  document.body.dataset.section=section;
  document.body.dataset.editorKind=editorKind||'';
  root.hidden=!showEditor;editorNav.hidden=!showEditor;preview.hidden=showEditor;
  pills.forEach(button=>{
   const active=button.dataset.section===section;
   button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));
  });
  subnav.replaceChildren();
  for(const item of SECTION_TOOLS[section]||[]){
   const button=document.createElement('button');button.type='button';
   button.textContent=item.title;button.dataset.tool=item.id;
   button.classList.toggle('active',item.id===tool.id);
   button.setAttribute('aria-pressed',String(item.id===tool.id));
   button.addEventListener('click',()=>{savedTool[section]=item.id;present()});
   subnav.append(button);
  }
  // Destroy the previous WebGL preview when returning to the actual editor.
  if(showEditor){
   if(frame.getAttribute('src'))frame.removeAttribute('src');
   frame.hidden=true;open.hidden=true;
   dispatchEvent(new CustomEvent('hunter:proves-section',{detail:editorKind}));
  }else{
   frame.hidden=false;open.hidden=false;
   const href='./'+tool.url;
   if(frame.getAttribute('src')!==href)frame.setAttribute('src',href);
   frame.title='Prova 3D · '+tool.title;
   open.href=href;open.textContent='Obrir '+tool.title+' en una pestanya';
  }
  if(updateHistory)updateUrl();
 }
 function activate(id,updateHistory=true){
  if(!valid(id))id='characters';
  section=id;
  present(updateHistory);
 }
 for(const pill of pills)pill.addEventListener('click',()=>activate(pill.dataset.section));
 if(params.has('prova')){
  const candidate=params.get('prova');
  if(SECTION_TOOLS[initialSection]?.some(x=>x.id===candidate))savedTool[initialSection]=candidate;
 }
 frame.addEventListener('load',()=>{
  // Stand-alone preview pages link back to proves.html; avoid nesting a hub in the frame.
  try{for(const link of frame.contentDocument.querySelectorAll('a[href="proves.html"]'))link.target='_top'}catch{}
 });
 addEventListener('popstate',()=>{
  const current=new URLSearchParams(location.search);
  const target=current.get('seccio')||'characters',item=current.get('prova');
  if(item&&SECTION_TOOLS[target]?.some(x=>x.id===item))savedTool[target]=item;
  activate(target,false);
 });
 activate(initialSection,false);
}
