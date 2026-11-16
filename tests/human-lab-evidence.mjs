import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {HUMAN_PROFILES,HUMAN_STYLES} from '../src/human-model-catalog.mjs';
import {createCurrentHuman} from '../src/human-current-models.mjs';
import {createHumanProposal,poseHumanProposal} from '../src/human-proposals.mjs';
import {humanSnapshot,humanOBJ,HUMAN_CHECKS} from '../src/human-lab-evidence.mjs';
globalThis.window=globalThis;
assert.equal(HUMAN_CHECKS.length,7);
for(const role of Object.keys(HUMAN_PROFILES)){
 for(const variant of ['actual',...Object.keys(HUMAN_STYLES)]){
  const m=variant==='actual'?await createCurrentHuman(T,role):createHumanProposal(T,role,variant);
  if(variant!=='actual')poseHumanProposal(m,0,'rest');
  const root=new T.Group();root.add(m);root.position.set(1,2,3);
  const hidden=new T.Mesh(new T.BoxGeometry(100,100,100),new T.MeshBasicMaterial());hidden.visible=false;root.add(hidden);
  const s=humanSnapshot(T,root,{role,variant,revision:'test',pose:'rest'});
  assert.equal(s.integrated,variant==='actual');assert.equal(s.source,variant==='actual'?'game-factory':'lab-proposal');
  assert(s.size.every(x=>x>0&&x<10));assert(s.triangles>0);
  if(variant!=='actual')assert.equal(s.joints.length,16);
  const obj=humanOBJ(T,root,s),lines=obj.split('\n'),verts=lines.filter(x=>x.startsWith('v ')),faces=lines.filter(x=>x.startsWith('f '));
  assert.equal(faces.length,s.triangles);assert(verts.every(x=>x.split(' ').slice(1).every(y=>Number.isFinite(Number(y)))));
  for(const f of faces)assert(f.split(' ').slice(1).every(x=>Number(x)>0&&Number(x)<=verts.length));
 }
}
console.log('PASS actual 7 + 14 lab meshes: OBJ, metrics, joints and origin');
