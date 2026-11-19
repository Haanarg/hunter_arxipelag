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
  const root=createHumanProposal(THREE,'player','a');
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
assert.equal(positions.size,8,'Les vuit propostes tenen paràmetres realment diferents');
console.log('PASS 8 variants de natació, cicles, extremitats, visibilitat i retorn al rig original');
