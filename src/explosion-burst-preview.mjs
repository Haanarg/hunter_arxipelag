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
// Iteració cromàtica del preview: foc viu, no ocres apagats.
 // Les puntes conserven contrast entre facetes perquè les geometries
 // irregulars B continuïn llegibles de prop i en miniatura.
export const EXPLOSION_PALETTE=Object.freeze({
 core:Object.freeze([0xffffff,0xfff9b1,0xffff61,0xffe928]),
 hot:Object.freeze([0xffef30,0xffd400,0xffb300,0xff9200,0xff6900]),
 warm:Object.freeze([0xffae00,0xff8100,0xff5e16,0xff4132,0xff2874]),
 dark:Object.freeze([0xff5126,0xff293c,0xf31e65,0xe12681,0xc1195c]),
 smoke:Object.freeze([0x9e365d,0x74345d,0x59335a,0x3c314f])
});
const PALETTE=EXPLOSION_PALETTE;
export const FIREBALL_PALETTE=Object.freeze({
 core:Object.freeze([0xffff27,0xfff82a,0xffdf1b]),
 hot:Object.freeze([0xffed23,0xffd21b,0xffb719]),
 warm:Object.freeze([0xffb018,0xff9514,0xff7e1a]),
 dark:Object.freeze([0xff641b,0xf14b21,0xd83c20]),
 smoke:Object.freeze([0x8d4530,0x71412e,0x553d34])
});
// Quatre InstancedMesh per explosió, encara que n'augmentem molt la densitat.
const MAX_SHARDS=640;
const TYPES=['spikes','plates','embers','smoke'];
const UP=new THREE.Vector3(0,1,0);
const dummy=new THREE.Object3D(),twistQuaternion=new THREE.Quaternion(),axis=new THREE.Vector3();
// Tots els volums van de y=0 (base al centre de la deflagració)
 // a y=1 (punta), per poder orientar-los radialment i fer-los créixer
 // sense que flotin allunyats del nucli. Cap polígon pla.
function pyramid(sides){
 const geometry=new THREE.ConeGeometry(1,1,sides,1);
 geometry.translate(0,.5,0);
 return geometry;
}
// Piràmide irregular tancada amb anell intermedi eixamplat i descentrat.
// Triangles independents = facetes amb normals planes i volum visible
// des de qualsevol angle. La malla es crea una sola vegada per variant.
function irregularSpike(sides,spread,skew,twist){
 const points=[],vertices=[];
 const ring=(height,radius,dx,dz,phase)=>Array.from({length:sides},(_,i)=>{
  const a=i*2*Math.PI/sides+phase,dist=radius*(1+.19*Math.sin(i*2.4+twist));
  return [Math.cos(a)*dist+dx,height,Math.sin(a)*dist+dz];
 });
 const base=ring(0,.73,0,0,0),
       shoulder=ring(.33,spread,skew*.32,-skew*.24,twist*.18),
       tip=[skew,1,-skew*.47];
 const tri=(a,b,c)=>vertices.push(...a,...b,...c);
 for(let i=0;i<sides;i++){
  const j=(i+1)%sides;
  tri(base[i],base[j],shoulder[i]);
  tri(base[j],shoulder[j],shoulder[i]);
  tri(shoulder[i],shoulder[j],tip);
  tri([0,0,0],base[j],base[i]);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geo.computeVertexNormals();
 return geo;
}
// Model C: bola de foc low-poly amb closca irregular i llengües
// superposades, inspirat en la referència. La closca té volum real i
// es deforma radialment; no és una col·lecció de làmines planes.
function fireballShell(){
 const g=new THREE.IcosahedronGeometry(1,2),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const wobble=1+.12*Math.sin(x*8+z*5)+.09*Math.cos(y*11-x*3);
  p.setXYZ(i,x*wobble,y*wobble,z*wobble);
 }
 p.needsUpdate=true;g.computeVertexNormals();return g;
}
export const EXPLOSION_VARIANTS=Object.freeze({
 A:Object.freeze({name:'Piràmides',description:'Cons i piràmides 3D de diverses cares'}),
 B:Object.freeze({name:'Estrella irregular',description:'Puntes 3D asimètriques amb facetes i espatlles'}),
 C:Object.freeze({name:'Bola de foc',description:'Volum polièdric irregular amb llengües de flama'})
});
const smokeGeometry=new THREE.IcosahedronGeometry(.5,0);
const sharedGeometry=Object.freeze({
 A:Object.freeze({
  spikes:pyramid(3),plates:pyramid(4),embers:pyramid(5),smoke:smokeGeometry
 }),
 B:Object.freeze({
  spikes:irregularSpike(5,1.16,.18,.65),
  plates:irregularSpike(4,1.26,-.27,1.1),
  embers:irregularSpike(3,.96,.31,.42),
  smoke:smokeGeometry
 }),
 C:Object.freeze({
  spikes:irregularSpike(5,1.34,.26,.8),
  plates:irregularSpike(4,1.55,-.24,1.4),
  embers:irregularSpike(3,1.05,.18,.2),
  smoke:smokeGeometry
 })
});
export function explosionMetrics(radius,density=1){
 const r=clamp(Number(radius)||1,2,120),d=clamp(Number(density)||1,.4,2.6);
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
function allocate({radius,density,seed,tone,variant}){
 const rand=mulberry32(seed),palette=variant==='C'?FIREBALL_PALETTE:PALETTE,
       m=explosionMetrics(radius,density),
       count=m.count,shards={spikes:[],plates:[],embers:[],smoke:[]};
 for(let i=0;i<count;i++){
  const roll=rand(),kind=roll<.46?'spikes':roll<.78?'plates':roll<.97?'embers':'smoke';
  const dir=sampleDirection(rand);
  // Els radis més grans creen més peces, amb recorreguts llargs i
  // velocitats escalades; cada reinici genera una altra distribució.
  const r=m.radius,reach=r*(.075+rand()*.17),
        length=r*(kind==='spikes'?.055+rand()*.12:
          kind==='embers'?.048+rand()*.105:.040+rand()*.095),
        width=r*(kind==='plates'?.013+rand()*.030:.009+rand()*.024),
        // Mantenim l'esclat visible prou temps per comparar-lo.
        duration=kind==='smoke'?1.1+rand()*.8:.85+rand()*.70,
        color=kind==='smoke'?pick(rand,palette.smoke):
          kind==='spikes'?pick(rand,palette.core):
          kind==='plates'?pick(rand,tone==='metal'?PALETTE.dark:PALETTE.warm):
          pick(rand,palette.hot);
  shards[kind].push({dir,reach,length,width,duration,color,
    bias:rand()*.4,spin:(rand()-.5)*8,phase:rand()*6.28318,
    initial:new THREE.Vector3((rand()-.5)*r*.028,(rand()-.5)*r*.022,(rand()-.5)*r*.028)});
 }
 return {shards,metrics:m,seed};
}
export function createProceduralExplosion(scene,options={}){
 const cfg={radius:options.radius??16,density:options.density??1,
            tone:options.tone??'flash',seed:options.seed??1,
            variant:EXPLOSION_VARIANTS[options.variant]?options.variant:'B'};
 const group=new THREE.Group();scene.add(group);
 const shell=new THREE.Mesh(fireballShell(),new THREE.MeshStandardMaterial({
  color:0xffa018,flatShading:true,roughness:1,metalness:0,
  emissive:0xff6500,emissiveIntensity:.22,side:THREE.DoubleSide
 }));
 shell.visible=false;group.add(shell);
 const meshes={};
 for(const kind of TYPES){
  // Els 3 grups incandescents són volums opacs, amb ombreig de facetes.
  // El fum continua transparent, i mai no escriu profunditat.
  const mat=kind==='smoke'?
    new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,
      transparent:true,opacity:.24,depthWrite:false}):
    new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,
      flatShading:true,roughness:.83,metalness:0,
      emissive:kind==='spikes'?0x8c3303:
        kind==='plates'?0x671007:0x821923,
      emissiveIntensity:kind==='spikes'?.52:.29});
  const inst=new THREE.InstancedMesh(sharedGeometry[cfg.variant][kind],mat,MAX_SHARDS);
  inst.frustumCulled=false;inst.count=0;
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.renderOrder=kind==='smoke'?5:2;
  group.add(inst);meshes[kind]=inst;
 }
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),
   new THREE.MeshBasicMaterial({color:0xffffa5,transparent:true,
     depthWrite:false,blending:THREE.AdditiveBlending}));
 core.renderOrder=5;group.add(core);
 const glow=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),
   new THREE.MeshBasicMaterial({color:0xff5d12,transparent:true,opacity:.19,
     depthWrite:false,blending:THREE.AdditiveBlending}));
 glow.renderOrder=1;group.add(glow);
 let spawned=null,age=10,playing=false;
 // Canviar de variant no canvia la llavor ni el recompte. Això permet
 // comparar A/B exactament amb els mateixos fragments i posicions.
 function setVariant(variant){
  if(!EXPLOSION_VARIANTS[variant])return false;
  if(cfg.variant===variant)return true;
  cfg.variant=variant;
  for(const kind of TYPES)meshes[kind].geometry=sharedGeometry[variant][kind];
  shell.visible=variant==='C'&&playing;
  if(spawned)renderPose();
  return true;
 }
 function launch(next={}){
  if(Number.isFinite(next.radius))cfg.radius=next.radius;
  if(Number.isFinite(next.density))cfg.density=next.density;
  if(typeof next.tone==='string')cfg.tone=next.tone;
  if(Number.isFinite(next.seed))cfg.seed=next.seed>>>0;
  if(next.variant)setVariant(next.variant);
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
  shell.visible=cfg.variant==='C'&&age<1.6;
  if(shell.visible){
   const k=clamp(age/.24,.08,1),fade=Math.max(.001,1-age/1.65);
   shell.scale.setScalar(r*.135*k*fade);
   shell.rotation.set(age*.22,age*.33,age*.12);
  }
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
    // Les bases de les puntes continuen gairebé al nucli, mentre que
    // els seus extrems creixen cap enfora com una estrella volumètrica.
    // Només les engrunes i el fum s'escampen amb més llibertat.
    const baseOffset=kind==='smoke'?outward*.85:
        r*.012+outward*(kind==='embers'?.32:.095);
    dummy.position.copy(s.dir).multiplyScalar(baseOffset).add(s.initial);
    if(kind==='smoke')dummy.position.y+=r*.10*life;
    dummy.quaternion.setFromUnitVectors(UP,s.dir);
    axis.set(0,1,0);
    twistQuaternion.setFromAxisAngle(axis,yaw);
    dummy.quaternion.multiply(twistQuaternion);
    const growth=clamp(age/.12,.13,1),
          w=Math.max(.0001,s.width*fade*growth),
          h=Math.max(.0001,s.length*fade*growth*axial);
    dummy.scale.set(kind==='smoke'?w*2.7:w,h,kind==='smoke'?w*2.4:w);
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
  glow.material.opacity=.26*flash;
  if(age>=duration){playing=false;core.visible=glow.visible=false}
 }
 function tick(dt){
  if(!playing)return false;
  age+=clamp(Number(dt)||0,0,.06);
  renderPose();
  return playing;
 }
 function hide(){age=10;playing=false;group.visible=false;shell.visible=false}
 function show(){group.visible=true}
 function destroy(){
  scene.remove(group);
  for(const mesh of Object.values(meshes))mesh.material.dispose();
  core.geometry.dispose();core.material.dispose();glow.geometry.dispose();glow.material.dispose();
  shell.geometry.dispose();shell.material.dispose();
 }
 return {group,launch,setVariant,tick,hide,show,destroy,
   get metrics(){return spawned?.metrics??explosionMetrics(cfg.radius,cfg.density)},
   get playing(){return playing},
   get variant(){return cfg.variant},
   get seed(){return cfg.seed}};
}
