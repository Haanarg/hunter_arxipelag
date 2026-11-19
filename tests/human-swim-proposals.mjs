import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {HUMAN_SWIM_PROPOSALS,isHumanSwimmingMode,sampleHumanSwimming} from '../src/human-swim-proposals.mjs';
import {HUMAN_CATALOG,HUMAN_SWIM_CATALOG} from '../src/human-model-catalog.mjs';
import {createHumanProposal,poseHumanProposal} from '../src/human-proposals.mjs';

assert.equal(HUMAN_CATALOG.length,7,'Els set models humans originals es conserven');
assert.equal(HUMAN_SWIM_CATALOG.length,2);
assert(HUMAN_SWIM_CATALOG.every(c=>c.options.length===4&&c.options.every(x=>x.style==='a')));
assert(!isHumanSwimmingMode('run'));
assert(isHumanSwimmingMode('swim-breast-1'));
assert(isHumanSwimmingMode('swim-crawl-4'));
assert.equal(sampleHumanSwimming('run',1),null);

const positions=new Set();
for(const [kind,variants] of Object.entries(HUMAN_SWIM_PROPOSALS)){
 assert.equal(variants.length,4);
 for(const [i,variant] of variants.entries()){
  const mode='swim-'+kind+'-'+(i+1);
  // Aquesta prova només necessita un accessori de referència per
  // comprovar que es desa/amaga/restaura durant la natació. Les armes
  // reals requereixen inicialitzar el runtime de joc i no són part
  // de l'animació del laboratori.
  const root=createHumanProposal(THREE,'player','a',{visualOnly:true});
  const mockWeapon=new THREE.Group();
  mockWeapon.userData.humanPreviewWeapon=true;
  mockWeapon.userData.humanWeapon='pistol';
  root.add(mockWeapon);
  const joints={};let weapon=null;
  root.traverse(n=>{
   if(n.userData?.humanMotionJoint)joints[n.userData.humanMotionJoint]=n;
   if(n.userData?.humanPreviewWeapon)weapon=n;
  });
  assert(weapon&&Object.keys(joints).length===16);
  const samples=[];
  for(let j=0;j<=120;j++){
   const time=j/120*variant.period;
   const sample=sampleHumanSwimming(mode,time);
   assert(sample&&Number.isFinite(sample.phase));
   samples.push(sample);
   poseHumanProposal(root,time,mode);
   assert(Math.abs(root.rotation.x+Math.PI/2)<.19,'Eix horitzontal i cara cap a l’aigua');
   assert(root.position.y>.45&&root.position.y<.70);
   assert.equal(weapon.visible,false,'Arma amagada mentre neda');
   for(const joint of Object.values(joints)){
    assert([joint.rotation.x,joint.rotation.y,joint.rotation.z].every(Number.isFinite),'Articulacions finites');
   }
  }
  const first=samples[0],last=samples.at(-1);
  assert(Math.abs(first.bodyPitch-last.bodyPitch)<1e-8,'Cicle de tronc sense salt');
  // El nadador és horitzontal: braços allargats vers el cap (+Y del rig),
  // no pas en la direcció d'apuntar quan el personatge està dret (-Z).
  assert((kind==='breast'?first.arm[0]:first.arms.R[0])>2.8,'Extensió de braços cap al cap');
  if(kind==='crawl'){
   const recovery=sampleHumanSwimming(mode,variant.period*.76);
   assert(recovery.arms.R[0]<-.9,'Recuperació aèria del crol');
   assert(Math.max(...samples.map(s=>s.bodyRoll))>.30,'Rotació axial de crol visible');
  }
  if(kind==='breast'){
   assert(Math.abs(first.arm[0]-last.arm[0])<1e-8,'Braços de braça continus');
   assert(Math.abs(first.leg[1]-last.leg[1])<1e-8,'Puntada de braça contínua');
   assert(Math.max(...samples.map(s=>s.inhale))>.9,'Respiració en tracció');
   assert(Math.min(...samples.map(s=>s.leg[1]))<-1,'Flexió del genoll a la puntada');
   assert(samples.some(s=>s.arm[2]>.25),'Escombrada exterior real');
  }else{
   assert(Math.abs(first.arms.L[0]-last.arms.L[0])<1e-8,'Braç esquerre de crol continu');
   assert(Math.abs(first.arms.R[0]-last.arms.R[0])<1e-8,'Braç dret de crol continu');
   const half=samples[30];
   assert(Math.abs(half.arms.L[0]-half.arms.R[0])>.1,'Braços no es mouen alhora');
   assert(Math.max(...samples.map(s=>s.bodyRoll))>.10,'Rotació axial visible');
  }
  const stance=JSON.stringify({arm:first.arm||first.arms,period:variant.period,beat:variant.beats});
  positions.add(stance);
  poseHumanProposal(root,0,'rest');
  assert(Math.abs(root.rotation.x)<1e-8,'Postura dreta restaurada');
  assert(Math.abs(root.position.y)<1e-8&&Math.abs(root.position.z)<1e-8,'Posició restaurada');
  assert(weapon.visible,'Arma visible després de sortir de natació');
  root.traverse(n=>{if(n.isMesh){n.geometry.dispose();if(Array.isArray(n.material))n.material.forEach(m=>m.dispose());else n.material.dispose()}});
 }
}
// Validacions específiques de les dues propostes refinades: els límits
// s'apliquen a les articulacions reals i a les posicions en món dels canells.
const jointMap=root=>{
 const j={};root.traverse(n=>{if(n.userData?.humanMotionJoint)j[n.userData.humanMotionJoint]=n});
 return j;
};
const point=(T,j,id)=>j[id].getWorldPosition(new T.Vector3());
const rootB=createHumanProposal(THREE,'player','a',{visualOnly:true}),b=jointMap(rootB);
const inspectB=time=>{poseHumanProposal(rootB,time,'swim-breast-3');rootB.updateWorldMatrix(true,true);return {
  armL:point(THREE,b,'wristL'),armR:point(THREE,b,'wristR'),
  elbow:point(THREE,b,'elbowR'),shoulder:point(THREE,b,'shoulderR'),
  head:point(THREE,b,'head'),pelvis:point(THREE,b,'pelvis'),
  kneeL:point(THREE,b,'kneeL'),kneeR:point(THREE,b,'kneeR'),
  hipL:point(THREE,b,'hipL'),hipR:point(THREE,b,'hipR'),anklePitch:b.ankleR.rotation.x
}};
const straight=inspectB(0),catchB=inspectB(.94),loadB=inspectB(1.52),glideB=inspectB(2.2);
assert.equal(HUMAN_SWIM_PROPOSALS.breast[2].glideSeconds,1);
assert(catchB.head.y>straight.head.y+.045,'Braça: el pit eleva el cap per respirar');
assert(catchB.pelvis.y<straight.pelvis.y-.006,'Braça: els malucs cauen una mica en inspirar');
assert(catchB.armL.distanceTo(catchB.armR)<.20,'Braça: les mans s’ajunten sota el pit');
assert(catchB.elbow.y>catchB.armR.y+.12,'Braça: el colze es manté per sobre de la mà');
assert(catchB.armR.z<catchB.shoulder.z,'Braça: la mà no retrocedeix de l’espatlla');
assert(loadB.kneeL.distanceTo(loadB.kneeR)<loadB.hipL.distanceTo(loadB.hipR)*1.5,'Braça: genolls prop de l’amplada dels malucs');
assert(loadB.anklePitch>.2,'Braça: dorsiflexió del peu durant la càrrega');
inspectB(1.52);rootB.updateWorldMatrix(true,true);
const outwardR=new THREE.Vector3(0,0,-1).transformDirection(b.ankleR.matrixWorld);
const outwardL=new THREE.Vector3(0,0,-1).transformDirection(b.ankleL.matrixWorld);
assert(outwardR.x>.10&&outwardL.x<-.10,'Braça: els dits dels peus giren cap enfora als dos costats');
inspectB(2.2);
assert(b.ankleR.rotation.x<-1.15,'Braça: flexió plantar completa durant el lliscament');
for(const t of [2.2,2.45,2.8,3.05,3.1999]){
 const pose=sampleHumanSwimming('swim-breast-3',t);
 assert(pose.glideActive&&pose.bodyRoll===0,'Braça: un segon sense rotació axial');
 assert(Math.abs(pose.arm[0]-3.06)<1e-9&&Math.abs(pose.leg[1]+.02)<1e-9,'Braça: fletxa estable');
 poseHumanProposal(rootB,t,'swim-breast-3');
 for(const joint of ['shoulder','elbow','hip','knee','ankle']){
  const L=b[joint+'L'].rotation,R=b[joint+'R'].rotation;
  assert(Math.abs(L.x-R.x)<1e-10&&Math.abs(L.z+R.z)<1e-10,'Braça: simetria '+joint);
 }
}
for(let i=0;i<321;i++){
 const pose=sampleHumanSwimming('swim-breast-3',i*.01);
 assert(pose.arm[1]>=-Math.PI/2-1e-8&&pose.arm[1]<=.001,'Braça: colze mai >90 graus');
 assert(pose.bodyRoll===0,'Braça sense roll');
}
poseHumanProposal(rootB,0,'rest');

const rootC=createHumanProposal(THREE,'player','a',{visualOnly:true}),c=jointMap(rootC);
const rollMax=37*Math.PI/180,steps=720,kicks=[];
for(let i=0;i<=steps;i++){
 const time=HUMAN_SWIM_PROPOSALS.crawl[3].period*i/steps;
 const pose=sampleHumanSwimming('swim-crawl-4',time);
 poseHumanProposal(rootC,time,'swim-crawl-4');
 assert(Math.abs(pose.bodyRoll)<=rollMax+1e-9,'Crol: roll dins de 37 graus');
 assert(Math.abs(pose.bodyPitch+Math.PI/2)<1e-9,'Crol: tronc horitzontal');
 assert(Math.abs(c.spine.rotation.y)<1e-9,'Crol: zona lumbar sense torsió');
 for(const side of ['L','R']){
  const leg=pose.legs[side];
  assert(leg.knee>=-.70&&leg.knee<=0,'Crol: flexió de genoll per sota dels 40 graus');
  assert(leg.ankle<-1.15,'Crol: peu en flexió plantar gairebé completa');
  assert(Math.abs(c['knee'+side].rotation.x-leg.knee)<1e-9);
 }
 assert(Math.abs(c.neck.rotation.x)<1e-9&&Math.abs(c.head.rotation.x)<1e-9,
  'Crol: respiració no aixeca el cap');
 kicks.push(pose.legs.R.hip);
}
let crossings=0;
for(let i=1;i<kicks.length;i++)if((kicks[i-1]<0&&kicks[i]>=0)||(kicks[i-1]>0&&kicks[i]<=0))crossings++;
assert.equal(crossings,6,'Crol: tres oscil·lacions per cama = sis batuts alterns');
for(const phase of [.24,.79]){
 const time=phase*HUMAN_SWIM_PROPOSALS.crawl[3].period;
 poseHumanProposal(rootC,time,'swim-crawl-4');rootC.updateWorldMatrix(true,true);
 assert(point(THREE,c,'elbowR').y>point(THREE,c,'wristR').y,
  'Crol: colze més alt que la mà en agafada i recuperació');
}
const breathe=sampleHumanSwimming('swim-crawl-4',.69*HUMAN_SWIM_PROPOSALS.crawl[3].period);
assert(breathe.breathing>.95&&breathe.headTurn<-.3,'Crol: respiració lateral dreta');
const neutral=sampleHumanSwimming('swim-crawl-4',.92*HUMAN_SWIM_PROPOSALS.crawl[3].period);
assert(neutral.breathing===0,'Crol: cara neutral abans de l’entrada');
poseHumanProposal(rootC,0,'rest');
assert(Math.abs(rootC.rotation.y)<1e-9&&Math.abs(rootC.rotation.x)<1e-9,'Restauració del rig després de nedar');
// Mostreig a 120 fps: cap quaternion ha de fer salts al retorn del cicle
// ni en travessar un keyframe intermedi (inclou el canvi -PI/+PI del crol).
for(const [mode,period]of [['swim-breast-3',3.2],['swim-crawl-4',1.54]]){
 const swimmer=createHumanProposal(THREE,'player','a',{visualOnly:true});
 const joints=jointMap(swimmer);
 const ids=['shoulderL','shoulderR','elbowL','elbowR','wristL','wristR',
  'hipL','hipR','kneeL','kneeR','ankleL','ankleR','neck','head','spine','pelvis'];
 const prior={};
 const frames=Math.ceil(period*120);
 for(let frame=0;frame<=frames;frame++){
  poseHumanProposal(swimmer,frame*period/frames,mode);
  for(const id of ids){
   const q=joints[id].quaternion;
   if(prior[id])assert(q.angleTo(prior[id])<.23,
    mode+' keyframe continu a '+id+' fotograma '+frame);
   prior[id]=q.clone();
  }
 }
 poseHumanProposal(swimmer,0,'rest');
}
const c4Catch=sampleHumanSwimming('swim-crawl-4',1.54*.29);
const c4Recovery=sampleHumanSwimming('swim-crawl-4',1.54*.78);
assert(c4Catch.arms.R[4]>.08&&c4Catch.arms.R[5]<-.15,
 'Crol: rotació humeral interna i pronació en l’agafada');
assert(c4Recovery.arms.R[4]<-.15,
 'Crol: rotació externa de l’espatlla al recobrament');
console.log('PASS B3 simetria, braços, respiració, peu i lliscament d’1s; C4 37 graus, colze alt, 6 batudes, coll i keyframes');

assert.equal(positions.size,8,'Les vuit propostes tenen paràmetres realment diferents');
console.log('PASS 8 variants de natació, cicles, extremitats, visibilitat i retorn al rig original');
