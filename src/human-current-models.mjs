import {playerModel} from './player-model-core.mjs';
import {palette} from './palette-core.mjs';
import {createLabPlayerReference} from './vehicle-lab-player-reference.mjs';
import {HUMAN_PROFILES} from './human-model-catalog.mjs';
let loading;
async function factories(){
 globalThis.HUNTER_PLAYER_MODEL=playerModel;
 globalThis.HUNTER_PALETTE=palette;
 if(!loading)loading=Promise.all([import('./characters.js'),import('./general-model.js'),import('./prisoners.js')]);
 await loading;
}
// Use the actual game factories. Only discard execution references that
// cannot be serialized by the editor; the original remains a neutral baseline.
export async function createCurrentHuman(T,role){
 if(!HUMAN_PROFILES[role])throw Error('Model humà desconegut: '+role);
 await factories();
 const material=color=>new T.MeshStandardMaterial({color,roughness:.85,flatShading:true});
 const box=(g,w,h,d,c,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);g.add(m);return m};
 let root;
 if(role==='player')root=createLabPlayerReference(T);
 else if(role==='general')root=globalThis.HUNTER_GENERAL_MODEL.create(T);
 else if(role==='farmer'||role==='mechanic'){
  const world=new T.Group(),api=globalThis.HUNTER_PRISONERS.create({THREE:T});
  api.configure({world,camp:{x:0,z:0,angle:0,layout:{prisoners:[{id:'preview-1',role,x:0,z:0,pose:'standing'}]}}});
  root=api.entities[0].o.clone(true);root.visible=true;
  const geos=new Map(),mats=new Map();
  root.traverse(n=>{if(!n.isMesh)return;if(!geos.has(n.geometry))geos.set(n.geometry,n.geometry.clone());if(!mats.has(n.material))mats.set(n.material,n.material.clone());n.geometry=geos.get(n.geometry);n.material=mats.get(n.material)});
  api.reset();
 }else{
  root=globalThis.HUNTER_CHARACTERS.createCommando(T);
  if(role==='rocket')globalThis.HUNTER_CHARACTERS.equipBazooka(T,root,{box});
  if(role==='elite')globalThis.HUNTER_CHARACTERS.equipEliteMachineGun(T,root,{box});
 }
 root.traverse(n=>{n.userData={};if(n.isMesh){n.geometry.userData.labOwned=true;n.material.userData.labOwned=true}});
 root.name='Actual · '+HUMAN_PROFILES[role].name;
 root.userData.humanOriginal=role;return root;
}
