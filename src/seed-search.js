// Catàleg i puntuació del cercador de llavors.
// Els vehicles i objectes procedeixen dels catàlegs vius del joc.
window.HUNTER_SEED_SEARCH=Object.freeze((()=>{
  const compounds=Object.freeze({
    base:'Base inicial',
    hq:'HQ enemic',
    avancada:'Avançada',
    garatge:'Garatge / hangar',
    heliport:'Heliport',
    polvori:'Polvorí',
    comunicacions:'Comunicacions',
    port:'Port',
    'prison-camp':'Camp de presoners'
  });
  const groups=Object.freeze({
    vehicle:'Vehicles',
    enemy:'Enemics',
    item:'Objectes',
    compound:'Compounds'
  });
  const categoryOptions=()=>Object.entries(groups).map(([value,label])=>({value,label}));
  function typeOptions(category,vehicleTypes,itemTypes){
    let entries=[];
    if(category==='vehicle')entries=Object.entries(vehicleTypes||{}).map(([value,info])=>({value,label:info.n||value}));
    else if(category==='enemy')entries=[{value:'patrulla_marina',label:'Patrulla marina'}];
    else if(category==='item')entries=Object.entries(itemTypes||{}).map(([value,info])=>({value,label:info.n||value}));
    else if(category==='compound')entries=Object.entries(compounds).map(([value,label])=>({value,label}));
    return [{value:'*',label:category==='vehicle'?'Qualsevol vehicle':category==='enemy'?'Qualsevol enemic':category==='item'?'Qualsevol objecte':'Qualsevol compound'},...entries];
  }
  function findNearest({category,type,base,vehicles=[],enemies=[],items=[],compounds:sites=[]}){
    if(!base||!Number.isFinite(base.x)||!Number.isFinite(base.z))return null;
    const list=category==='vehicle'?vehicles:category==='enemy'?enemies:category==='item'?items:category==='compound'?sites:[];
    let closest=null,count=0;
    for(const entry of list){
      if((type!=='*'&&entry.t!==type&&entry.type!==type)||
         !Number.isFinite(entry.x)||!Number.isFinite(entry.z)||
         entry.destroyed)continue;
      const distance=Math.hypot(entry.x-base.x,entry.z-base.z);
      count++;
      if(!closest||distance<closest.distance){
        closest={distance,x:entry.x,z:entry.z,type:entry.t||entry.type};
      }
    }
    return closest?{...closest,count}:null;
  }
  const compare=(a,b)=>a.distance-b.distance||a.seed-b.seed;
  return {compounds,categoryOptions,typeOptions,findNearest,compare};
})());
