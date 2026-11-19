// Experimentació de natació al laboratori humà, sense canviar les animacions del joc.
// El rig anatòmic original mira -Z i està dret (+Y); el visor el gira en
// decúbit pron (-PI/2) i preserva la seva transformació inicial.
export const HUMAN_SWIM_PROPOSALS=Object.freeze({
 breast:Object.freeze([
  Object.freeze({title:'B1 · Braça equilibrada',note:'Tracció compacta, puntada de granota sincronitzada i lliscament moderat',period:2.35,glide:.22,armWidth:1,legWidth:1,breath:.22,undulation:.045}),
  Object.freeze({title:'B2 · Braça esportiva',note:'Recuperació ràpida, colzes alts, puntada estreta i ondulació del tronc',period:1.72,glide:.12,armWidth:.78,legWidth:.80,breath:.29,undulation:.11}),
  Object.freeze({title:'B3 · Braça biomecànica revisada',note:'Simetria bilateral, colzes alts, puntada compacta i lliscament real d’un segon',period:3.20,glide:1/3.20,glideSeconds:1,armWidth:1.13,legWidth:.55,breath:.20,undulation:.065,refined:true}),
  Object.freeze({title:'B4 · Braça de lliscament',note:'Tracció curta, puntada propulsiva i fase de fletxa clarament més llarga',period:2.85,glide:.38,armWidth:.77,legWidth:.93,breath:.17,undulation:.035})
 ]),
 crawl:Object.freeze([
  Object.freeze({title:'C1 · Crol de sis batudes',note:'Braços alterns, colze alt, rotació axial i sis batudes per cicle',period:2.05,beats:6,roll:.44,reach:1,recovery:1.42,kick:.20}),
  Object.freeze({title:'C2 · Crol de fons',note:'Dues batudes coordinades, més abast per braçada i rotació controlada',period:2.45,beats:2,roll:.57,reach:1.08,recovery:1.28,kick:.17}),
  Object.freeze({title:'C3 · Crol tècnic',note:'Quatre batudes, colze alt a la recuperació i fase de tracció llarga',period:2.15,beats:4,roll:.52,reach:1.04,recovery:1.68,kick:.20}),
  Object.freeze({title:'C4 · Crol biomecànic revisat',note:'Roll ±37°, colze alt a l’agafada i recuperació, sis batudes i respiració lateral',period:1.54,beats:6,roll:37*Math.PI/180,reach:.99,recovery:1.41,kick:.205,refined:true})
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
// Interpolació Hermite cíclica C1: tangents compartides entre keyframes
// amb temps irregulars. A diferència de smoothstep, no frena el moviment
// artificialment a cada articulació en cada fotograma clau.
// L'índex 0 de l'espatlla del crol es desenvolupa en -2PI per tancar el gir.
export function samplePeriodicHumanTrack(keys,phase,{angularIndex=-1,tension=.76}={}){
 const p=wrap(phase),last=keys.length-1;
 let seg=0;while(seg<last-1&&p>=keys[seg+1][0])seg++;
 const a=keys[seg],b=keys[seg+1],h=b[0]-a[0],t=(p-a[0])/h;
 const prev=i=>i===0?[keys[last-1][0]-1,...keys[last-1].slice(1).map((v,k)=>v+(k+1===angularIndex?TAU:0))]:keys[i-1];
 const next=i=>i===last?[keys[1][0]+1,...keys[1].slice(1).map((v,k)=>v-(k+1===angularIndex?TAU:0))]:keys[i+1];
 const grad=(left,right,k)=>(right[k]-left[k])/(right[0]-left[0]);
 return a.slice(1).map((v,index)=>{
  const k=index+1,d=(b[k]-a[k])/h;
  const slope=(center,back,forward)=>{
   const l=grad(back,center,k),r=grad(center,forward,k);
   if(l*r<=0)return 0; // sense rebot ni sobreelongació quan canvia el signe
   const mid=(l+r)*.5*tension;
   return Math.sign(d||l)*Math.min(Math.abs(mid),3*Math.min(Math.abs(l),Math.abs(r)));
  };
  const before=prev(seg),after=next(seg+1);
  const m0=slope(a,before,b),m1=slope(b,a,after);
  const t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*v+(t3-2*t2+t)*h*m0
       +(-2*t3+3*t2)*b[k]+(t3-t2)*h*m1;
 });
}
const b3Seconds=3.20;
const normalizeSeconds=rows=>rows.map(([sec,...values])=>[sec/b3Seconds,...values]);
// L'últim segon queda en fletxa perfecta. Les mans no passen darrere la
// línia de l'espatlla: braç elevat >= 2.02 rad i colze en flexió <= PI/2.
const B3_ARM=normalizeSeconds([
 // t, elevació espatlla, flexió colze, obertura espatlla,
 // rotació humeral, adducció de l'avantbraç.
 [0,3.06,-.04,-.29,0,0],
 [.29,2.92,-.16,.15,.015,.04],
 [.58,2.83,-.46,.43,.040,.10],
 [.94,2.80,-Math.PI/2,.18,.030,.90], // colze alt, mans juntes sota el pit
 [1.18,2.83,-1.37,.12,.015,.77],
 [1.48,2.94,-.70,-.12,0,.30],
 [1.75,3.06,-.04,-.29,0,0], // braços estirats mentre entra la puntada
 [2.20,3.06,-.04,-.29,0,0],
 [3.20,3.06,-.04,-.29,0,0]
]);
const B3_LEG=normalizeSeconds([
 [0,.0,-.02,0,-1.27,0,0],
 [.65,.035,-.06,.015,-.90,0,0],
 [1.23,.25,-.86,.055,-.24,.06,.015],
 [1.52,.40,-1.64,.075,.30,.24,.035], // càrrega, peus en martell
 [1.70,.32,-1.24,.085,.26,.30,.040], // puntada circular
 [1.96,.14,-.54,.045,-.12,.15,.015],
 [2.20,.0,-.02,0,-1.27,0,0], // cames juntes, peus en punta
 [3.20,.0,-.02,0,-1.27,0,0]
]);
const B3_BREATH=normalizeSeconds([
 [0,0],[.36,.06],[.66,.48],[.94,1],[1.17,.78],
 [1.43,.26],[1.72,0],[2.20,0],[3.20,0]
]);
// C4: 0 extensió, .16 agafada, .37 estrebada, .55 empenta,
// .66 extracció, .81 colze alt aeri, .95 entrada. L'angle d'espatlla
// acaba 2PI més baix, amb rotació idèntica i tangent periòdica contínua.
// Darrer valor = primer - 2PI; el signe negatiu de x en recobrament
// allunya la mà de l'aigua i la torna cap endavant.
const C4_ARM=[
 [0,3.045,-.055,.025,-.025],
 [.12,2.86,-.14,.06,-.04],
 [.24,2.62,-1.57,.10,-.08], // entrada i agarre: canell sota el colze
 [.40,1.85,-1.68,.09,-.11], // colze 96° durant la tracció
 [.55,.28,-.15,.04,.08], // extén i finalitza l'empenta a la cuixa
 [.65,-1.20,-1.67,.21,.07], // extracció i inici recobrament aeri
 [.79,-1.72,-1.70,.51,0], // colze lidera, mà relaxada per sota
 [.91,-2.61,-.66,.37,-.035],
 [1,3.045-TAU,-.055,.025,-.025]
];
const bell=(x,start,peak,end)=>{
 if(x<=start||x>=end)return 0;
 if(x<peak){const t=(x-start)/(peak-start);return smooth(t)}
 const t=(end-x)/(end-peak);return smooth(t);
};
function sampleBreast3(phase,config){
 const arm=samplePeriodicHumanTrack(B3_ARM,phase);
 const leg=samplePeriodicHumanTrack(B3_LEG,phase);
 const inhale=samplePeriodicHumanTrack(B3_BREATH,phase)[0];
 return {kind:'breast',variant:2,refined:true,phase,config,arm,leg,inhale,
  bodyPitch:-Math.PI/2 + .018*inhale,bodyRoll:0,bob:-.020*inhale,
  phaseName:phase<.19?'Obertura':phase<.38?'Estrebada i respiració':phase<.55?'Recobrament':
    phase<.69?'Puntada':'Lliscament (1 s)',
  glideActive:phase>=2.2/3.2};
}
function sampleCrawl4(phase,config){
 const arms={R:samplePeriodicHumanTrack(C4_ARM,phase,{angularIndex:1}),
  L:samplePeriodicHumanTrack(C4_ARM,wrap(phase+.5),{angularIndex:1})};
 // Petita rotació interna durant l'agafada i externa durant el recobrament.
 // El canell prona l'avantbraç subaquàtic i es relaxa fora de l'aigua.
 for(const [side,offset]of [['R',0],['L',.5]]){
  const p=wrap(phase+offset);
  const catchPower=bell(p,.11,.29,.53),recoverPower=bell(p,.60,.78,.95);
  arms[side].push(.10*catchPower-.16*recoverPower,
   -.20*catchPower+.045*recoverPower);
 }
 const legs={};
 for(const [i,side]of ['L','R'].entries()){
  // 3 oscil·lacions/cama x 2 cames = 6 batuts alterns per braçada doble.
  const a=TAU*(3*phase-.07)+i*Math.PI;
  legs[side]={hip:config.kick*Math.sin(a),
   knee:-.08-.48*(.5+.5*Math.sin(a-.8)), // 4.6°...32.1° flexió
   ankle:-1.28+.055*Math.sin(a-1.05), // flexió plantar, mai dorsiflexió
   toeIn:.075};
 }
 // Quan la dreta acaba d'empènyer i es recupera, acompanya el roll
 // del cos sense elevar la barbeta. Torna a neutral abans de la seva entrada.
 const breathing=bell(phase,.52,.69,.89);
 const roll=config.roll*Math.sin(TAU*phase);
 return {kind:'crawl',variant:3,refined:true,phase,config,arms,legs,breathing,
  bodyPitch:-Math.PI/2,bodyRoll:roll,bob:0,headTurn:-.35*breathing,
  phaseName:phase<.24?'Entrada i agafada':phase<.55?'Estrebada i empenta':
   phase<.90?'Recobrament i respiració':'Entrada'};
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
 if(kind==='breast'&&variant===2)return sampleBreast3(phase,config);
 if(kind==='crawl'&&variant===3)return sampleCrawl4(phase,config);
 if(kind==='breast'){
  const s=1-config.glide,a=config.armWidth,k=config.legWidth;
  // Braços: fletxa → escombrada → agarre → recollida → extensió.
  // Cames: talons als glutis → peus enfora → fuet → extensió i lliscament.
  const arm=track([[0,3.06,.08,.02],[s*.16,2.77,.16,.35*a],
   [s*.39,2.07,1.12,.53*a],[s*.60,1.25,1.45,.18*a],
   [s*.82,2.66,.25,.06*a],[s,3.06,.08,.02],[1,3.06,.08,.02]],phase);
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
 // Les articulacions de l'espatlla tenen el braç caigut (-Y) en repòs:
 // +PI l'estén cap al cap (+Y), +PI/2 el submergeix i -PI/2 l'alça
 // fora de l'aigua. La recuperació crol passa pels angles negatius.
 const armAt=p=>track([[0,3.03,.10,.02],[.16,2.74*config.reach,.85,.08],
  [.38,1.57,1.22,.08],[.55,.12,.24,.08],
  [.70,-.86,config.recovery,.62],[.86,-2.46,1.08,.55],
  [1,3.03-TAU,.10,.02]],p);
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
 if(p.kind==='breast'&&p.refined){
  // Sense rotació axial del tronc (ni del coll). El pivot superior
  // s'estén en el pla sagital quan inspira; la pelvis cau lleument.
  set('pelvis',-.012*p.inhale);
  if(joints.pelvis)joints.pelvis.position.z=-.013*p.inhale;
  set('spine',.125*p.inhale);
  set('neck',-.030*p.inhale);
  set('head',-.018*p.inhale);
  for(const [i,side]of ['L','R'].entries()){
   const sign=i?1:-1;
   set('shoulder'+side,p.arm[0],sign*p.arm[3],sign*p.arm[2]);
   set('elbow'+side,p.arm[1],0,-sign*p.arm[4]);
   set('wrist'+side,-.095*p.arm[1],sign*(.22*Math.max(0,p.arm[2])/.43-.095*p.arm[4]),sign*.018);
   set('hip'+side,p.leg[0],0,sign*p.leg[2]);
   set('knee'+side,p.leg[1]);
   // Martell durant la càrrega / puntada; punta i cames juntes al lliscament.
   set('ankle'+side,p.leg[3],-sign*p.leg[4],sign*p.leg[5]); // rotació externa: dits cap enfora
  }
 }else if(p.kind==='crawl'&&p.refined){
  // El roll és del cos sencer, no es força la zona lumbar a torsionar-se.
  // En repòs visual el coll contrarota i mira al fons; quan la dreta
  // acaba l'empenta, el cap gira lateralment sense aixecar-se.
  set('spine',0,0,0);
  set('neck',0,-.45*p.bodyRoll+.45*p.headTurn,0);
  set('head',0,-.55*p.bodyRoll+.55*p.headTurn,0);
  for(const [i,side]of ['L','R'].entries()){
   const sign=i?1:-1,a=p.arms[side],leg=p.legs[side];
   set('shoulder'+side,a[0],sign*a[4],sign*a[2]);
   set('elbow'+side,a[1]);
   set('wrist'+side,a[3],sign*a[5],sign*.015);
   set('hip'+side,leg.hip,0,sign*.02);
   set('knee'+side,leg.knee);
   set('ankle'+side,leg.ankle,sign*leg.toeIn,0);
  }
 }else if(p.kind==='breast'){
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
