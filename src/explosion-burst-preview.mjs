// Motor independent de proves: esclats poligonals procedurals low-poly.
// InstancedMesh + geometries compartides, cap motor físic, cap textura.
import * as THREE from '../vendor/three-r186.module.mjs';

export const EXPLOSION_PRESETS=Object.freeze([
 Object.freeze({id:'car',name:'Vehicle petit',radius:10,subtitle:'Cotxe o llanxa · radi 10 m',tone:'metal',seed:101}),
 Object.freeze({id:'grenade',name:'Granada',radius:16,subtitle:'Esclat curt · radi 16 m',tone:'flash',seed:203}),
 Object.freeze({id:'heavy',name:'Vehicle gran',radius:24,subtitle:'Proposta per blindats · radi 24 m',tone:'metal',seed:307}),
 Object.freeze({id:'c4',name:'C4',radius:48,subtitle:'Càrrega pesada · radi 48 m',tone:'flash',seed:409})
]);
// L'últim radi de vehicle gran és una proposta visual per comparar,
// no altera l'explosió efectiva del joc principal.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const pick=(r,array)=>array[Math.min(array.length-1,Math.floor(r()*array.length))];
export function mulberry32(seed){
 let x=(seed>>>0)||0x35acbd43;
 return ()=>{x=(x+0x6d2b79f5)>>>0;let t=x;
 t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
 return ((t^(t>>>14))>>>0)/4294967296};
}
const PALETTE=Object.freeze({
 core:[0xfff7bd,0xfff2a3,0xffe875,0xffffff],
 hot:[0xffe45d,0xffc348,0xffa43b,0xffe77d,0xffb451],
 warm:[0xffa74c,0xff8b36,0xe97e35,0xecb675,0xcf6735],
 dark:[0xa94a27,0x793a2b,0x553633,0x6f443a,0xbe713f],
 smoke:[0x594941,0x423b39,0x514a49,0x2e3338]
});
// Quatre InstancedMesh per explosió, encara que n'augmentem molt la densitat.
const MAX_SHARDS=640;
const TYPES=['spikes','plates','embers','smoke'];
const UP=new THREE.Vector3(0,1,0);
const dummy=new THREE.Object3D(),twistQuaternion=new THREE.Quaternion(),axis=new THREE.Vector3();
const sharedGeometry=Object.freeze({
 spikes:new THREE.CylinderGeometry(.015,.29,1,3,1),
 plates:new THREE.TetrahedronGeometry(.56,0),
 embers:new THREE.BoxGeometry(.20,.95,.16),
 smoke:new THREE.IcosahedronGeometry(.50,0)
});
export function explosionMetrics(radius,density=1){
 const r=clamp(Number(radius)||1,2,90),d=clamp(Number(density)||1,.4,2.6);
 // Densitat base molt superior a la versió inicial: la comparació és
 // visualment llegible a pantalla petita. El topall evita pèrdues de FPS.
 const count=Math.round(clamp((24+r*3.2)*d,20,MAX_SHARDS));
 const size=r*.29;
 return {radius:r,count,size,duration:2.15,
   drawCalls:6,verticesPerShard:24};
}
function sampleDirection(rand){
 const a=rand()*Math.PI*2,up=rand()*1.75-.54,root=Math.sqrt(Math.max(0,1-up*up));
 // L'elevació esbiaixada cap amunt manté una silueta poc esfèrica.
 return new THREE.Vector3(Math.cos(a)*root,up+.17,Math.sin(a)*root).normalize();
}
function allocate({radius,density,seed,tone}){
 const rand=mulberry32(seed),m=explosionMetrics(radius,density),
       count=m.count,shards={spikes:[],plates:[],embers:[],smoke:[]};
 for(let i=0;i<count;i++){
  const roll=rand(),kind=roll<.42?'spikes':roll<.70?'plates':roll<.96?'embers':'smoke';
  const dir=sampleDirection(rand);
  // Els radis més grans creen més peces, amb recorreguts llargs i
  // velocitats escalades; cada reinici genera una altra distribució.
  const r=m.radius,reach=r*(.075+rand()*.17),
        length=r*(kind==='spikes'?.055+rand()*.12:
          kind==='embers'?.048+rand()*.105:.040+rand()*.095),
        width=r*(kind==='plates'?.013+rand()*.030:.009+rand()*.024),
        // Mantenim l'esclat visible prou temps per comparar-lo.
        duration=kind==='smoke'?1.1+rand()*.8:.85+rand()*.70,
        color=kind==='smoke'?pick(rand,PALETTE.smoke):
          kind==='spikes'?pick(rand,PALETTE.core):
          kind==='plates'?pick(rand,tone==='metal'?PALETTE.dark:PALETTE.warm):
          pick(rand,PALETTE.hot);
  shards[kind].push({dir,reach,length,width,duration,color,
    bias:rand()*.4,spin:(rand()-.5)*8,phase:rand()*6.28318,
    initial:new THREE.Vector3((rand()-.5)*r*.028,(rand()-.5)*r*.022,(rand()-.5)*r*.028)});
 }
 return {shards,metrics:m,seed};
}
export function createProceduralExplosion(scene,options={}){
 const cfg={radius:options.radius??16,density:options.density??1,
            tone:options.tone??'flash',seed:options.seed??1};
 const group=new THREE.Group();scene.add(group);
 const meshes={};
 for(const kind of TYPES){
  const mat=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,
    transparent:kind==='smoke'||kind==='spikes',
    opacity:kind==='smoke'?.27:1,
    depthWrite:kind!=='smoke'&&kind!=='spikes',
    blending:kind==='spikes'?THREE.AdditiveBlending:THREE.NormalBlending});
  const inst=new THREE.InstancedMesh(sharedGeometry[kind],mat,MAX_SHARDS);
  inst.frustumCulled=false;inst.count=0;
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.renderOrder=kind==='smoke'?2:kind==='spikes'?4:3;
  group.add(inst);meshes[kind]=inst;
 }
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),
   new THREE.MeshBasicMaterial({color:0xffdf8b,transparent:true,
     depthWrite:false,blending:THREE.AdditiveBlending}));
 core.renderOrder=5;group.add(core);
 const glow=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),
   new THREE.MeshBasicMaterial({color:0xff7834,transparent:true,opacity:.13,
     depthWrite:false,blending:THREE.AdditiveBlending}));
 glow.renderOrder=1;group.add(glow);
 let spawned=null,age=10,playing=false;
 function launch(next={}){
  if(Number.isFinite(next.radius))cfg.radius=next.radius;
  if(Number.isFinite(next.density))cfg.density=next.density;
  if(typeof next.tone==='string')cfg.tone=next.tone;
  if(Number.isFinite(next.seed))cfg.seed=next.seed>>>0;
  spawned=allocate(cfg);age=0;playing=true;
  for(const kind of TYPES){
   const inst=meshes[kind],arr=spawned.shards[kind];
   inst.count=arr.length;
   for(let i=0;i<arr.length;i++)inst.setColorAt(i,new THREE.Color(arr[i].color));
   if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
  }
  renderPose();
  return spawned.metrics;
 }
 function renderPose(){
  if(!spawned)return;
  const r=spawned.metrics.radius,duration=spawned.metrics.duration;
  for(const kind of TYPES){
   const mesh=meshes[kind],shards=spawned.shards[kind];
   for(let i=0;i<shards.length;i++){
    const s=shards[i],delay=kind==='smoke'?.07:0,
      time=Math.max(0,age-delay),life=time/s.duration,
      live=age>=delay&&life<1;
    if(!live){
     dummy.scale.setScalar(.00001);dummy.position.set(0,0,0);
     dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);continue;
    }
    const eased=1-Math.exp(-4.1*life),
       outward=s.reach*(.12+.88*eased),
       fade=kind==='smoke'?Math.sin(Math.PI*clamp(life,0,1)):
         Math.pow(Math.max(0,1-life),.42),
       axial=kind==='spikes'?(1+Math.sin(Math.PI*life)*.28):1,
       yaw=s.spin*time+s.phase;
    dummy.position.copy(s.dir).multiplyScalar(outward).add(s.initial);
    if(kind==='smoke')dummy.position.y+=r*.10*life;
    dummy.quaternion.setFromUnitVectors(UP,s.dir);
    axis.set(0,1,0);
    twistQuaternion.setFromAxisAngle(axis,yaw);
    dummy.quaternion.multiply(twistQuaternion);
    const growth=clamp(age/.085,.24,1),
          w=Math.max(.0001,s.width*fade*growth),
          h=Math.max(.0001,s.length*fade*growth*axial);
    dummy.scale.set(kind==='smoke'?w*1.8:w,h,kind==='smoke'?w*1.5:w);
    dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;
  }
  const f=clamp(age/.34,0,1),flash=(1-f)**1.6;
  core.visible=glow.visible=age<.64;
  core.scale.setScalar(r*(.024+.037*f));
  core.material.opacity=flash;
  core.rotation.set(age*2,age*3,0);
  glow.scale.setScalar(r*(.09+.13*f));
  glow.material.opacity=.20*flash;
  if(age>=duration){playing=false;core.visible=glow.visible=false}
 }
 function tick(dt){
  if(!playing)return false;
  age+=clamp(Number(dt)||0,0,.06);
  renderPose();
  return playing;
 }
 function hide(){age=10;playing=false;group.visible=false}
 function show(){group.visible=true}
 function destroy(){
  scene.remove(group);
  for(const mesh of Object.values(meshes))mesh.material.dispose();
  core.geometry.dispose();core.material.dispose();glow.geometry.dispose();glow.material.dispose();
 }
 return {group,launch,tick,hide,show,destroy,
   get metrics(){return spawned?.metrics??explosionMetrics(cfg.radius,cfg.density)},
   get playing(){return playing},
   get seed(){return cfg.seed}};
}
