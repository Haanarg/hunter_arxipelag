import * as THREE from '../vendor/three-r186.module.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {recoverApacheAppearance,apacheAppearanceDescription} from './helicopter-texture-recovery.mjs';

const LEVELS=[100,75,50,25];
const TYPES={
 huey:{name:"Huey — Duane's Mind",triangles:[2014,1649,1286,922],bytes:[1025276,1067068,1054488,1041968]},
 apache:{name:"Apache — Araon",triangles:[3808,2990,2173,1355],bytes:[2970256,3147200,3093544,3036368]}
};
const ROOT='./assets/vehicle-candidates/helicopter-lods/';
const canvases=[...document.querySelectorAll('.card')].map(el=>({
 element:el,box:el.querySelector('.canvas-box'),status:el.querySelector('.status'),
 scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(36,1,.1,1000),model:null,mixer:null,appearance:null
}));
let renderer;
try{
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.4;
 renderer.setClearColor(0x233d41,1);
 renderer.setScissorTest(true);
 renderer.domElement.id='draw';document.body.append(renderer.domElement);
}catch(error){
 document.querySelector('#notice').textContent='No s’ha pogut inicialitzar WebGL: '+String(error);
 throw error;
}
const loader=new GLTFLoader();
let current='huey',token=0,yaw=.64,elev=.30,distance=26,lookY=1.5;
let lastTime=performance.now();
let dbPromise;
const memory=new Map();
const notice=document.querySelector('#notice');
const makeKey=(type,level)=>type+'_'+level;
const fmt=n=>n.toLocaleString('ca');
function errorText(error){return String(error?.message||error||'Error desconegut').slice(0,160)}
for(const slot of canvases){
 slot.scene.background=new THREE.Color(0x30484b);
 slot.scene.add(new THREE.HemisphereLight(0xe4f1ff,0x6c7767,2.1));
 const key=new THREE.DirectionalLight(0xffe8c5,2.3);key.position.set(-25,32,24);slot.scene.add(key);
 const grid=new THREE.GridHelper(100,50,0x8aa8a2,0x6c847f);
 grid.position.y=.03;grid.material.transparent=true;grid.material.opacity=.26;
 grid.userData.isGrid=true;slot.scene.add(grid);slot.grid=grid;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),
  new THREE.MeshStandardMaterial({color:0x697b69,roughness:1}));
 floor.rotation.x=-Math.PI/2;slot.scene.add(floor);
}
function openDB(){
 if(dbPromise!==undefined)return dbPromise;
 if(!('indexedDB' in window))return dbPromise=Promise.resolve(null);
 dbPromise=new Promise(resolve=>{
  try{
   const req=indexedDB.open('hunter-helicopter-lods',1);
   req.onupgradeneeded=()=>req.result.createObjectStore('glbs');
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>resolve(null);
   req.onblocked=()=>resolve(null);
  }catch{resolve(null)}
 });
 return dbPromise;
}
async function cacheGet(key){
 const db=await openDB();if(!db)return null;
 return new Promise(resolve=>{
  const req=db.transaction('glbs','readonly').objectStore('glbs').get(key);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>resolve(null);
 });
}
async function cachePut(key,blob){
 const db=await openDB();if(!db)return;
 return new Promise(resolve=>{
  try{
   const tx=db.transaction('glbs','readwrite');
   tx.objectStore('glbs').put(blob,key);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>resolve();
  }catch{resolve()}
 });
}
async function getBlob(type,level){
 const key=makeKey(type,level);
 if(memory.has(key))return memory.get(key);
 let blob=await cacheGet(key);
 if(blob){memory.set(key,blob);return blob}
 try{
  const response=await fetch(ROOT+key+'.glb',{cache:'no-store'});
  if(response.ok){
   blob=await response.blob();
   if(blob.size>20&&blob.size<80000000){memory.set(key,blob);return blob}
  }
 }catch{}
 return null;
}
function countTriangles(root){
 let triangles=0;
 root.traverse(node=>{
  if(!node.isMesh || !node.geometry?.attributes?.position)return;
  triangles+=Math.floor((node.geometry.index?.count||node.geometry.attributes.position.count)/3);
 });
 return triangles;
}
function disposeSlot(slot){
 if(slot.model){
  slot.scene.remove(slot.model);
  const geos=new Set(),mats=new Set(),textures=new Set();
  slot.model.traverse(node=>{
   if(node.isMesh){
    geos.add(node.geometry);
    for(const mat of Array.isArray(node.material)?node.material:[node.material]){
     if(!mat)continue;mats.add(mat);
     for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);
    }
   }
  });
  for(const geom of geos)geom?.dispose();
  for(const mat of mats)mat.dispose();
  for(const tex of textures)tex.dispose();
 }
 slot.model=null;slot.mixer=null;slot.appearance=null;
}
function updateCamera(){
 const d=distance;
 for(const slot of canvases){
  const rect=slot.box.getBoundingClientRect();
  slot.camera.aspect=Math.max(.1,rect.width/Math.max(1,rect.height));
  slot.camera.position.set(Math.sin(yaw)*Math.cos(elev)*d,
   lookY+Math.sin(elev)*d,Math.cos(yaw)*Math.cos(elev)*d);
  slot.camera.lookAt(0,lookY,0);
  slot.camera.updateProjectionMatrix();
 }
}
async function loadVariant(slot,type,level,serial){
 slot.status.textContent='Carregant GLB '+level+'%…';
 const blob=await getBlob(type,level);
 if(serial!==token)return false;
 if(!blob){
  disposeSlot(slot);
  slot.status.textContent='Encara no està al servidor. Carrega el ZIP amb les 8 variants.';
  return false;
 }
 const url=URL.createObjectURL(blob);
 try{
  const gltf=await loader.loadAsync(url);
  if(serial!==token){disposeNew(gltf.scene);return false}
  // El GLB de l'Apache pot arribar amb un atles desvinculat o sense
  // mapes de color. No el deixem blanc: recuperam les imatges si hi són
  // i identifiquem clarament la pintura de substitució en cas contrari.
  const appearance=type==='apache'?await recoverApacheAppearance(THREE,gltf):null;
  if(serial!==token){disposeNew(gltf.scene);return false}
  disposeSlot(slot);
  slot.appearance=appearance;
  const group=new THREE.Group();group.add(gltf.scene);
  group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group);
  const dimensions=bounds.getSize(new THREE.Vector3());
  const center=bounds.getCenter(new THREE.Vector3());
  group.position.set(-center.x,-bounds.min.y+.04,-center.z);
  group.updateMatrixWorld(true);
  group.traverse(obj=>{if(obj.isMesh){obj.castShadow=false;obj.receiveShadow=true}});
  slot.scene.add(group);slot.model=group;
  if(gltf.animations.length){
   slot.mixer=new THREE.AnimationMixer(gltf.scene);
   for(const clip of gltf.animations)slot.mixer.clipAction(clip).play();
  }
  if(level===100){
   const refSize=Math.max(dimensions.x,dimensions.z,dimensions.y*.8,3);
   distance=refSize*2+5;lookY=Math.max(.8,dimensions.y*.34);
   updateCamera();
  }
  const triangles=countTriangles(group),expected=TYPES[type].triangles[LEVELS.indexOf(level)];
  const percent=100*triangles/TYPES[type].triangles[0];
  slot.status.textContent=fmt(triangles)+' triangles ('+percent.toFixed(1)+'% de l’original) · '+
   (blob.size/1048576).toFixed(2)+' MiB · '+gltf.animations.length+' animacions'+
   (triangles===expected?'':' · recompte diferent del previst: '+fmt(expected))+
   (appearance?' · '+apacheAppearanceDescription(appearance):'');
  return true;
 }catch(error){
  slot.status.textContent='Error GLB: '+errorText(error);
  return false;
 }finally{URL.revokeObjectURL(url)}
}
function disposeNew(root){
 const geos=new Set(),materials=new Set();
 root.traverse(node=>{
  if(node.isMesh){geos.add(node.geometry);
   for(const mat of Array.isArray(node.material)?node.material:[node.material])if(mat)materials.add(mat);
  }
 });
 for(const geo of geos)geo.dispose();
 for(const mat of materials)mat.dispose();
}
async function choose(type){
 if(!TYPES[type])return;
 current=type;const serial=++token;
 for(const b of document.querySelectorAll('[data-type]'))b.setAttribute('aria-pressed',String(b.dataset.type===type));
 notice.textContent='Preparant '+TYPES[type].name+'…';
 // L'original defineix la mateixa escala i càmera per a les quatre variants.
 let count=0;
 if(await loadVariant(canvases[0],type,100,serial))count++;
 if(serial!==token)return;
 const vals=await Promise.all(LEVELS.slice(1).map((level,i)=>loadVariant(canvases[i+1],type,level,serial)));
 if(serial!==token)return;
 count+=vals.filter(Boolean).length;
 notice.textContent=count===4?
  'Quatre variants carregades. Arrossega una vista per girar simultàniament les quatre càmeres.':
  (count>0?'Carregades '+count+'/4 variants.':'Els GLB no estan publicats en aquest servidor.')+
   ' Importa el ZIP de les vuit variants o els fitxers GLB amb «Carrega ZIP/GLB»; quedaran guardats en aquest navegador.';
 if(type==='apache'){
  const reports=canvases.map(slot=>slot.appearance).filter(Boolean);
  const bad=reports.filter(r=>r.recolored);
  if(bad.length)
   notice.textContent+=' ⚠ L’Apache no inclou textures de color vàlides a '+bad.length+
    '/4 variants. S’han aplicat colors militars de substitució, però per veure la textura AUTÈNTICA cal un GLB amb les imatges incrustades.';
 }
 updateCamera();
}
async function unzipSelected(file){
 const bytes=new Uint8Array(await file.arrayBuffer());
 const view=new DataView(bytes.buffer);
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65558);i--){
  if(view.getUint32(i,true)===0x06054b50){end=i;break}
 }
 if(end<0)throw new Error('No es reconeix el format ZIP');
 const centralOffset=view.getUint32(end+16,true);
 const centralSize=view.getUint32(end+12,true);
 if(centralOffset+centralSize>bytes.length)throw Error('ZIP incomplet');
 let p=centralOffset,matched=0;
 while(p<centralOffset+centralSize){
  if(view.getUint32(p,true)!==0x02014b50)throw Error('Directori ZIP no vàlid');
  const method=view.getUint16(p+10,true);
  const compSize=view.getUint32(p+20,true);
  const uncompSize=view.getUint32(p+24,true);
  const nameLength=view.getUint16(p+28,true);
  const extraLength=view.getUint16(p+30,true);
  const commentLength=view.getUint16(p+32,true);
  const localOffset=view.getUint32(p+42,true);
  const fileName=new TextDecoder().decode(bytes.subarray(p+46,p+46+nameLength)).split('/').pop().toLowerCase();
  p+=46+nameLength+extraLength+commentLength;
  if(!/^(huey|apache)_(100|75|50|25)\.glb$/.test(fileName))continue;
  if(uncompSize>80000000 || localOffset+30>bytes.length)throw Error('Fitxer ZIP massa gran o incomplet');
  if(view.getUint32(localOffset,true)!==0x04034b50)throw Error('Capçalera GLB incorrecta al ZIP');
  const start=localOffset+30+view.getUint16(localOffset+26,true)+view.getUint16(localOffset+28,true);
  if(start+compSize>bytes.length)throw Error('Dades ZIP incompletes');
  const compressed=bytes.slice(start,start+compSize);
  let buffer;
  if(method===0)buffer=compressed.buffer;
  else if(method===8){
   if(typeof DecompressionStream==='undefined')throw Error('El navegador no permet descomprimir ZIP; descomprimeix-lo i tria els 8 GLB');
   const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   buffer=await new Response(stream).arrayBuffer();
  }else throw Error('Mètode de compressió ZIP no admès: '+method);
  if(buffer.byteLength!==uncompSize)throw Error('Mida incorrecta: '+fileName);
  const magic=new DataView(buffer).getUint32(0,true);
  if(magic!==0x46546c67)throw Error('No és un GLB vàlid: '+fileName);
  const key=fileName.replace(/\.glb$/,'');
  const blob=new Blob([buffer],{type:'model/gltf-binary'});
  memory.set(key,blob);await cachePut(key,blob);matched++;
 }
 return matched;
}
document.querySelector('#assetFile').addEventListener('change',async e=>{
 const files=[...e.target.files||[]];if(!files.length)return;
 notice.textContent='Importació de variants en curs…';
 let count=0,errors=[];
 for(const file of files){
  try{
   if(file.name.toLowerCase().endsWith('.zip'))count+=await unzipSelected(file);
   else if(file.name.toLowerCase().endsWith('.glb')){
    const name=file.name.toLowerCase().replace(/\.glb$/,'');
    if(!/^(huey|apache)_(100|75|50|25)$/.test(name))throw Error('El nom ha de ser huey_100.glb, apache_75.glb, etc.');
    const blob=new Blob([await file.arrayBuffer()],{type:'model/gltf-binary'});
    memory.set(name,blob);await cachePut(name,blob);count++;
   }
  }catch(error){errors.push(file.name+': '+errorText(error))}
 }
 if(!count){
  notice.textContent='No s’ha importat cap model. '+(errors.join(' · ')||'Revisa els noms dels fitxers.');
  return;
 }
 await choose(current);
 if(errors.length)notice.textContent+=' Incidències: '+errors.join(' · ');
 e.target.value='';
});
const views={quarter:[.64,.31],front:[Math.PI, .10],side:[Math.PI/2,.08],rear:[0,.08],top:[0,Math.PI/2-.06]};
for(const button of document.querySelectorAll('[data-type]'))button.addEventListener('click',()=>choose(button.dataset.type));
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{
 [yaw,elev]=views[button.dataset.view]||views.quarter;
 for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(button===b));
 updateCamera();
});
document.querySelector('#zoomOut').addEventListener('click',()=>{distance=Math.min(220,distance*1.22);updateCamera()});
document.querySelector('#zoomIn').addEventListener('click',()=>{distance=Math.max(3,distance*.82);updateCamera()});
document.querySelector('#showGrid').addEventListener('change',e=>{
 for(const s of canvases)s.grid.visible=e.target.checked;
});
const drag=new Map();
for(const slot of canvases){
 slot.box.addEventListener('pointerdown',e=>{
  slot.box.setPointerCapture(e.pointerId);
  drag.set(e.pointerId,[e.clientX,e.clientY]);
 });
 slot.box.addEventListener('pointermove',e=>{
  const old=drag.get(e.pointerId);if(!old)return;
  drag.set(e.pointerId,[e.clientX,e.clientY]);
  yaw-=(e.clientX-old[0])*.012;
  elev=Math.min(1.5,Math.max(.03,elev+(e.clientY-old[1])*.008));
  updateCamera();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture']){
  slot.box.addEventListener(type,e=>drag.delete(e.pointerId));
 }
 slot.box.addEventListener('wheel',e=>{
  if(!e.altKey)return;
  e.preventDefault();
  distance=Math.min(220,Math.max(3,distance*(e.deltaY>0?1.1:.9)));
  updateCamera();
 },{passive:false});
}
function draw(time){
 requestAnimationFrame(draw);
 const dt=Math.min(.07,Math.max(0,(time-lastTime)/1000));
 lastTime=time;
 if(document.querySelector('#animate').checked)for(const slot of canvases)slot.mixer?.update(dt);
 const width=window.innerWidth,height=window.innerHeight;
 if(renderer.domElement.width!==Math.round(width*renderer.getPixelRatio()) || renderer.domElement.height!==Math.round(height*renderer.getPixelRatio()))renderer.setSize(width,height,false);
 renderer.setClearColor(0x233d41,1);
 renderer.setScissorTest(true);
 for(const slot of canvases){
  const r=slot.box.getBoundingClientRect();
  const left=Math.round(r.left),bottom=Math.round(height-r.bottom),w=Math.round(r.width),h=Math.round(r.height);
  const x=Math.max(0,left),y=Math.max(0,bottom),right=Math.min(width,left+w),top=Math.min(height,bottom+h);
  if(w<=0||h<=0||right<=x||top<=y)continue;
  renderer.setViewport(left,bottom,w,h);
  renderer.setScissor(x,y,right-x,top-y);
  slot.camera.aspect=w/h;slot.camera.updateProjectionMatrix();
  renderer.render(slot.scene,slot.camera);
 }
}
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);updateCamera()});
updateCamera();
requestAnimationFrame(draw);
choose('huey');
