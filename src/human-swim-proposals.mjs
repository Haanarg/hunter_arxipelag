// Experimentació de natació al laboratori humà, sense canviar les animacions del joc.
// El rig anatòmic original mira -Z i està dret (+Y); el visor el gira en
// decúbit pron (-PI/2) i preserva la seva transformació inicial.
export const HUMAN_SWIM_PROPOSALS=Object.freeze({
 breast:Object.freeze([
  Object.freeze({title:'B1 · Braça equilibrada',note:'Tracció compacta, puntada de granota sincronitzada i lliscament moderat',period:2.35,glide:.22,armWidth:1,legWidth:1,breath:.22,undulation:.045}),
  Object.freeze({title:'B2 · Braça esportiva',note:'Recuperació ràpida, colzes alts, puntada estreta i ondulació del tronc',period:1.72,glide:.12,armWidth:.78,legWidth:.80,breath:.29,undulation:.11}),
  Object.freeze({title:'B3 · Braça oberta',note:'Escombrada de braços ampla, genolls més oberts i ritme de natació recreativa',period:2.62,glide:.18,armWidth:1.40,legWidth:1.34,breath:.24,undulation:.04}),
  Object.freeze({title:'B4 · Braça de lliscament',note:'Tracció curta, puntada propulsiva i fase de fletxa clarament més llarga',period:2.85,glide:.38,armWidth:.77,legWidth:.93,breath:.17,undulation:.035})
 ]),
 crawl:Object.freeze([
  Object.freeze({title:'C1 · Crol de sis batudes',note:'Braços alterns, colze alt, rotació axial i sis batudes per cicle',period:2.05,beats:6,roll:.19,reach:1,recovery:1.42,kick:.20}),
  Object.freeze({title:'C2 · Crol de fons',note:'Dues batudes coordinades, més abast per braçada i rotació controlada',period:2.45,beats:2,roll:.25,reach:1.14,recovery:1.28,kick:.17}),
  Object.freeze({title:'C3 · Crol tècnic',note:'Quatre batudes, colze alt a la recuperació i fase de tracció llarga',period:2.15,beats:4,roll:.22,reach:1.05,recovery:1.68,kick:.20}),
  Object.freeze({title:'C4 · Crol ràpid',note:'Sis batudes enèrgiques, alta cadència i recuperació més recta',period:1.54,beats:6,roll:.15,reach:.94,recovery:.78,kick:.29})
 ])
});
export const isHumanSwimmingMode=mode=>/^swim-(breast|crawl)(?:-[1-4])?$/.test(mode||'');
const TAU=Math.PI*2;
const wrap=x=>((x%1)+1)%1;
const smooth=x=>x*x*(3-2*x);
function track(keys,phase){
 const p=wrap(phase);let i=0;
 while(i<keys.length-2&&p>keys[i+1][0])i++;
 const a=keys[i],b=keys[i+1],t=smooth(Math.max(0,Math.min(1,(p-a[0])/(b[0]-a[0]))));
 return a.slice(1).map((v,k)=>v+(b[k+1]-v)*t);
}
const poses=new WeakMap();
function snapshot(model){
 let state=poses.get(model);
 if(!state){
  state={position:model.position.clone(),rotation:model.rotation.clone(),weapons:new Map()};
  poses.set(model,state);
 }
 return state;
}
export function restoreHumanSwimming(model,weapon){
 const state=poses.get(model);
 if(!state)return;
 model.position.copy(state.position);model.rotation.copy(state.rotation);
 for(const [item,visible]of state.weapons)item.visible=visible;
 poses.delete(model);
 if(weapon&&!state.weapons.has(weapon))weapon.visible=true;
}
export function sampleHumanSwimming(mode,time){
 if(!isHumanSwimmingMode(mode))return null;
 const [,kind,number]=/^swim-(breast|crawl)(?:-([1-4]))?$/.exec(mode);
 const variant=Number(number||1)-1,config=HUMAN_SWIM_PROPOSALS[kind][variant];
 const phase=wrap(Math.max(0,time)/config.period);
 if(kind==='breast'){
  const s=1-config.glide,a=config.armWidth,k=config.legWidth;
  // Braços: fletxa → escombrada → agarre → recollida → extensió.
  // Cames: talons als glutis → peus enfora → fuet → extensió i lliscament.
  const arm=track([[0,1.53,.08,.02],[s*.16,1.35,.16,.35*a],
   [s*.39,.86,1.12,.53*a],[s*.60,.63,1.45,.18*a],
   [s*.82,1.35,.25,.06*a],[s,1.53,.08,.02],[1,1.53,.08,.02]],phase);
  const leg=track([[0,.035,-.08,.015,.02],[s*.32,.10,-.20,.05,.04],
   [s*.54,.49,-1.44,.23*k,.25],[s*.69,.29,-.86,.29*k,.48],
   [s*.84,-.10,-.17,.10*k,.30],[s,.035,-.08,.015,.02],[1,.035,-.08,.015,.02]],phase);
  const inhale=track([[0,0],[s*.2,.20],[s*.42,1],[s*.62,.55],[s*.84,0],[1,0]],phase)[0];
  return {kind,variant,phase,config,arm,leg,inhale,
   bodyPitch:-Math.PI/2+config.undulation*Math.sin(phase*TAU-.6),
   bodyRoll:0,bob:.04+config.undulation*.35*inhale};
 }
 // Braç dret a la fase p; esquerre mig cicle més tard. Fase d'entrada,
 // agarre amb colze flexionat, tracció, empenta i recuperació aèria.
 const armAt=p=>track([[0,1.53,.10,.02],[.16,1.34*config.reach,.85,.08],
  [.38,.35,1.22,.08],[.55,-.80,.24,.08],
  [.70,-.58,config.recovery,.62],[.86,.73,1.08,.55],
  [1,1.53,.10,.02]],p);
 const legs={};
 for(const [i,side]of ['L','R'].entries()){
  // Sis/quatre/dues batudes són 3/2/1 oscil·lacions per cama,
  // alternades exactament en contrafase.
  const v=Math.sin(TAU*phase*(config.beats/2)+i*Math.PI);
  legs[side]={hip:config.kick*v,knee:-.16-.33*Math.max(0,v),ankle:.12+.25*Math.max(0,-v)};
 }
 const breathing=Math.pow(Math.max(0,Math.sin(TAU*phase)),4);
 return {kind,variant,phase,config,arms:{R:armAt(phase),L:armAt(phase+.5)},legs,
  breathing,bodyPitch:-Math.PI/2+.026*Math.sin(TAU*phase*2),
  bodyRoll:config.roll*Math.sin(TAU*phase),bob:.035+.012*Math.sin(TAU*phase*2)};
}
export function poseHumanSwimming(model,joints,weapon,time,mode){
 const p=sampleHumanSwimming(mode,time);
 if(!p)return false;
 const state=snapshot(model);
 if(weapon){
  if(!state.weapons.has(weapon))state.weapons.set(weapon,weapon.visible);
  weapon.visible=false; // No brandar una arma durant la natació al visor.
 }
 model.rotation.copy(state.rotation);
 model.rotation.x+=p.bodyPitch;model.rotation.y+=p.bodyRoll;
 model.position.copy(state.position);
 model.position.y+=.54+p.bob;
 model.position.z+=.92; // Centra longitudinalment el cos horitzontal.
 const set=(id,x=0,y=0,z=0)=>{if(joints[id])joints[id].rotation.set(x,y,z)};
 if(p.kind==='breast'){
  set('spine',-.065*p.inhale);set('neck',-.08*p.inhale);
  set('head',-.16*p.inhale,0,0);
  for(const [i,side]of ['L','R'].entries()){
   const sign=i?1:-1;
   set('shoulder'+side,p.arm[0],0,sign*p.arm[2]);
   set('elbow'+side,p.arm[1]);set('wrist'+side,-p.arm[1]*.18,0,sign*.03);
   set('hip'+side,p.leg[0],sign*.08,sign*p.leg[2]);
   set('knee'+side,p.leg[1]);set('ankle'+side,-.1-p.leg[3],sign*.24);
  }
 }else{
  set('spine',-.03*Math.sin(TAU*p.phase),.06*Math.sin(TAU*p.phase));
  set('neck',0,.08*Math.sin(TAU*p.phase));
  set('head',-.04,p.breathing*.34,0);
  for(const [i,side]of ['L','R'].entries()){
   const sign=i?1:-1,a=p.arms[side],leg=p.legs[side];
   set('shoulder'+side,a[0],0,sign*a[2]);
   set('elbow'+side,a[1]);set('wrist'+side,-.10*a[1],0,sign*.06);
   set('hip'+side,leg.hip,0,sign*.035);
   set('knee'+side,leg.knee);set('ankle'+side,leg.ankle);
  }
 }
 return true;
}
