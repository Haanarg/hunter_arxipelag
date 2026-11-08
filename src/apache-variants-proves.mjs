import * as THREE from '../vendor/three-r186.module.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const ROOT='./assets/vehicle-candidates/helicopter-lods/';
const PREFIX='apache-50-rodes75-';
const VARIANTS=['oliva-clara','salvia-mat','sorra-verda'];
const files=VARIANTS.map(slug=>PREFIX+slug+'.glb');
const slots=[...document.querySelectorAll('.card')].map((card,i)=>({
 card,box:card.querySelector('.viewport'),status:card.querySelector('.status'),
 download:card.querySelector('.download'),name:VARIANTS[i],file:files[i],
 scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(36,1,.05,300),
 model:null,blob:null,mixer:null,grid:null
}));
const notice=document.querySelector('#notice');
const loader=new GLTFLoader();
const saved=new Map();
let dbPromise,serial=0,yaw=.65,elev=.34,distance=31,lookY=2.1;
let renderer;
try{
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:true});
 renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.42;
 renderer.setClearColor(0x253a3e,1);
 renderer.setScissorTest(true);renderer.domElement.id='draw';document.body.append(renderer.domElement);
}catch(error){notice.textContent='No es pot inicialitzar WebGL: '+String(error);throw error}
const humanColor=new THREE.MeshStandardMaterial({color:0x183329,roughness:1});
for(const slot of slots){
 const scene=slot.scene;scene.background=new THREE.Color(0x30474a);
 scene.add(new THREE.HemisphereLight(0xf0f5ff,0x7b9275,2.4));
 const sun=new THREE.DirectionalLight(0xffefd5,2.9);sun.position.set(-16,27,23);scene.add(sun);
 const fill=new THREE.DirectionalLight(0xd1e2ff,1.25);fill.position.set(18,15,-18);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(85,85),
  new THREE.MeshStandardMaterial({color:0x75826f,roughness:1}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.07;scene.add(floor);
 const grid=new THREE.GridHelper(85,85,0x9caf9a,0x778a7b);
 grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);slot.grid=grid;
 const human=new THREE.Group();
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.24,.9,4,8),humanColor);
 torso.position.y=1.05;human.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),new THREE.MeshStandardMaterial({color:0xecc6a4}));
 head.position.y=1.72;human.add(head);
 human.position.set(9,0,0);scene.add(human);
 slot.download.addEventListener('click',()=>{
  if(!slot.blob)return;
  const url=URL.createObjectURL(slot.blob);
  const a=document.createElement('a');a.href=url;a.download=slot.file;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
 });
}
const key=name=>name;
function openDB(){
 if(dbPromise)return dbPromise;
 if(!('indexedDB' in window))return dbPromise=Promise.resolve(null);
 return dbPromise=new Promise(resolve=>{
  try{
   const q=indexedDB.open('hunter-apache-50-wheels-75',1);
   q.onupgradeneeded=()=>q.result.createObjectStore('models');
   q.onsuccess=()=>resolve(q.result);
   q.onerror=()=>resolve(null);q.onblocked=()=>resolve(null);
  }catch{resolve(null)}
 });
}
async function localGet(name){
 const db=await openDB();if(!db)return null;
 return new Promise(resolve=>{
  const q=db.transaction('models','readonly').objectStore('models').get(key(name));
  q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null);
 });
}
async function localPut(name,blob){
 const db=await openDB();if(!db)return;
 await new Promise(resolve=>{
  try{
   const tx=db.transaction('models','readwrite');
   tx.objectStore('models').put(blob,key(name));
   tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();
  }catch{resolve()}
 });
}
async function fetchModel(slot){
 let b=saved.get(slot.file)||await localGet(slot.file);
 if(b)return b;
 try{
  const r=await fetch(ROOT+slot.file,{cache:'no-store'});
  if(r.ok){
   b=await r.blob();
   if(b.size>20&&b.size<50000000)return b;
  }
 }catch{}
 return null;
}
function triangulateCount(root){
 let n=0;root.traverse(o=>{if(o.isMesh&&o.geometry){
  const a=o.geometry.index?.count??o.geometry.attributes.position?.count??0;
  n+=Math.floor(a/3);
 }});return n;
}
function dispose(slot){
 if(slot.model){
  slot.scene.remove(slot.model);
  const geometries=new Set(),materials=new Set(),textures=new Set();
  slot.model.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);
   for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(!m)continue;materials.add(m);
    for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
   }
  });
  for(const x of geometries)x?.dispose();
  for(const x of materials)x.dispose();
  for(const x of textures)x.dispose();
 }
 slot.model=null;slot.mixer=null;slot.blob=null;slot.download.hidden=true;
}
function cameraUpdate(){
 for(const s of slots){
  const r=s.box.getBoundingClientRect();s.camera.aspect=Math.max(.1,r.width/Math.max(1,r.height));
  s.camera.position.set(Math.sin(yaw)*Math.cos(elev)*distance,lookY+Math.sin(elev)*distance,Math.cos(yaw)*Math.cos(elev)*distance);
  s.camera.lookAt(0,lookY,0);s.camera.updateProjectionMatrix();
 }
}
async function renderBlob(slot,blob,request){
 slot.status.textContent='Carregant '+slot.file+'…';
 const url=URL.createObjectURL(blob);
 try{
  const gltf=await loader.loadAsync(url);
  if(request!==serial)return;
  const count=triangulateCount(gltf.scene);
  if(!count)throw Error('GLB sense triangles');
  const ext=gltf.parser?.json?.extras?.hunterApacheCandidate;
  if(ext?.variant && ext.variant!==slot.name)throw Error('Variant incorrecta al GLB: '+ext.variant);
  dispose(slot);
  const wrapper=new THREE.Group();wrapper.add(gltf.scene);wrapper.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(wrapper);
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  wrapper.position.set(-center.x,-bounds.min.y+.02,-center.z);
  slot.scene.add(wrapper);slot.model=wrapper;slot.blob=blob;slot.download.hidden=false;
  if(gltf.animations.length){
   slot.mixer=new THREE.AnimationMixer(gltf.scene);
   for(const clip of gltf.animations)slot.mixer.clipAction(clip).play();
  }
  const rough=ext?.roughness;
  slot.status.textContent=count.toLocaleString('ca')+' triangles · '+(blob.size/1048576).toFixed(2)+' MiB · '+
   size.x.toFixed(1)+' × '+size.y.toFixed(1)+' × '+size.z.toFixed(1)+' m'+
   (rough?' · rugositat '+String(rough).replace('.',','):'');
 }catch(error){
  slot.status.textContent='Error GLB: '+String(error?.message||error).slice(0,180);
 }finally{URL.revokeObjectURL(url)}
}
async function reload(){
 const request=++serial;
 const results=await Promise.all(slots.map(async slot=>{
  const blob=await fetchModel(slot);
  if(request!==serial)return false;
  if(!blob){dispose(slot);slot.status.textContent='No publicat al servidor. Importa el ZIP amb els tres GLB.';return false}
  await renderBlob(slot,blob,request);return !!slot.model;
 }));
 if(request!==serial)return;
 const count=results.filter(Boolean).length;
 notice.textContent=count===3?
  'Tres variants carregades. Gira qualsevol panell per comparar les tres amb la mateixa càmera.':
  count?count+'/3 variants carregades. Importa les que falten per completar la comparació.':
  'Encara no hi ha binaris publicats al servidor. Importa el ZIP apache-50-rodes75-tres-variants.zip o els tres GLB; es conservaran en aquest navegador.';
 cameraUpdate();
}
function getFilename(name){
 const short=String(name).split('/').pop().toLowerCase();
 return files.find(file=>short===file)||null;
}
async function unzip(file){
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length<22)throw Error('ZIP incomplet');
 const view=new DataView(bytes.buffer);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65558);i--){
  if(view.getUint32(i,true)===0x06054b50){end=i;break}
 }
 if(end<0)throw Error('No es reconeix el ZIP');
 const offset=view.getUint32(end+16,true),size=view.getUint32(end+12,true);
 if(offset+size>bytes.length)throw Error('Directori ZIP incomplet');
 const entries=[];let p=offset;
 while(p<offset+size){
  if(view.getUint32(p,true)!==0x02014b50)throw Error('Directori ZIP invàlid');
  const method=view.getUint16(p+10,true),compressed=view.getUint32(p+20,true),uncompressed=view.getUint32(p+24,true);
  const namelen=view.getUint16(p+28,true),exlen=view.getUint16(p+30,true),commentlen=view.getUint16(p+32,true),local=view.getUint32(p+42,true);
  const name=new TextDecoder().decode(bytes.subarray(p+46,p+46+namelen));
  p+=46+namelen+exlen+commentlen;
  const matched=getFilename(name);
  if(!matched)continue;
  if(uncompressed>50000000||local+30>bytes.length||view.getUint32(local,true)!==0x04034b50)throw Error('Entrada ZIP massa gran o invàlida');
  const dataStart=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
  if(dataStart+compressed>bytes.length)throw Error('Dades ZIP incompletes');
  const packed=bytes.slice(dataStart,dataStart+compressed);
  let raw;
  if(method===0)raw=packed.buffer;
  else if(method===8){
   if(typeof DecompressionStream==='undefined')throw Error('Aquest navegador no admet ZIP: descomprimeix-lo i importa els tres GLB');
   raw=await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
  }else throw Error('Compressió no admesa: '+method);
  if(raw.byteLength!==uncompressed||new DataView(raw).getUint32(0,true)!==0x46546c67)throw Error('GLB incorrecte al ZIP');
  entries.push({name:matched,blob:new Blob([raw],{type:'model/gltf-binary'})});
 }
 return entries;
}
async function importModels(fileList){
 const inputs=[...fileList];if(!inputs.length)return;
 notice.textContent='Importació de les variants…';
 let count=0;const problems=[];
 for(const file of inputs){
  try{
   const entries=file.name.toLowerCase().endsWith('.zip')?await unzip(file):
    (getFilename(file.name)?[{name:getFilename(file.name),blob:file}]:[]);
   if(!entries.length)throw Error('Nom desconegut: cal un ZIP o un GLB del paquet Apache híbrid');
   for(const entry of entries){
    saved.set(entry.name,entry.blob);await localPut(entry.name,entry.blob);count++;
   }
  }catch(err){problems.push(file.name+': '+String(err?.message||err))}
 }
 if(count)await reload();
 if(problems.length)notice.textContent+=' Incidències: '+problems.join(' · ');
 if(!count&&!problems.length)notice.textContent='No s’ha reconegut cap GLB.';
}
document.querySelector('#models').addEventListener('change',async e=>{
 try{await importModels(e.target.files||[])}finally{e.target.value=''}
});
for(const slot of slots){
 slot.box.addEventListener('dragover',e=>{e.preventDefault();slot.card.classList.add('dragging')});
 slot.box.addEventListener('dragleave',()=>slot.card.classList.remove('dragging'));
 slot.box.addEventListener('drop',async e=>{
  e.preventDefault();slot.card.classList.remove('dragging');
  await importModels(e.dataTransfer.files||[]);
 });
}
const views={quarter:[.65,.34],front:[Math.PI,.08],side:[Math.PI/2,.10],rear:[0,.08],top:[0,Math.PI/2-.06]};
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{
 [yaw,elev]=views[b.dataset.view]||views.quarter;
 for(const t of document.querySelectorAll('[data-view]'))t.setAttribute('aria-pressed',String(t===b));
 cameraUpdate();
});
document.querySelector('#zoomIn').addEventListener('click',()=>{distance=Math.max(10,distance*.85);cameraUpdate()});
document.querySelector('#zoomOut').addEventListener('click',()=>{distance=Math.min(100,distance*1.17);cameraUpdate()});
document.querySelector('#gridToggle').addEventListener('change',e=>{for(const s of slots)s.grid.visible=e.target.checked});
const drag=new Map();
for(const s of slots){
 s.box.addEventListener('pointerdown',e=>{s.box.setPointerCapture(e.pointerId);drag.set(e.pointerId,[e.clientX,e.clientY])});
 s.box.addEventListener('pointermove',e=>{
  const old=drag.get(e.pointerId);if(!old)return;
  drag.set(e.pointerId,[e.clientX,e.clientY]);
  yaw-=(e.clientX-old[0])*.012;
  elev=Math.max(.02,Math.min(1.5,elev+(e.clientY-old[1])*.008));cameraUpdate();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])s.box.addEventListener(type,e=>drag.delete(e.pointerId));
 s.box.addEventListener('wheel',e=>{
  if(!e.altKey)return;e.preventDefault();
  distance=Math.max(10,Math.min(100,distance*(e.deltaY>0?1.1:.9)));cameraUpdate();
 },{passive:false});
}
let last=performance.now();
function draw(time){
 requestAnimationFrame(draw);
 const dt=Math.min(.06,Math.max(0,(time-last)/1000));last=time;
 const width=innerWidth,height=innerHeight,pixelRatio=renderer.getPixelRatio();
 if(renderer.domElement.width!==Math.round(width*pixelRatio)||renderer.domElement.height!==Math.round(height*pixelRatio))renderer.setSize(width,height,false);
 for(const s of slots){
  s.mixer?.update(dt);
  if(!s.model)continue;
  const r=s.box.getBoundingClientRect();
  const x=Math.max(0,Math.round(r.left)),y=Math.max(0,Math.round(height-r.bottom));
  const rw=Math.round(r.width),rh=Math.round(r.height);
  const right=Math.min(width,Math.round(r.right)),top=Math.min(height,Math.round(height-r.top));
  if(rw<=0||rh<=0||right<=x||top<=y)continue;
  renderer.setViewport(r.left,height-r.bottom,rw,rh);
  renderer.setScissor(x,y,right-x,top-y);
  s.camera.aspect=rw/rh;s.camera.updateProjectionMatrix();
  renderer.render(s.scene,s.camera);
 }
}
window.addEventListener('resize',cameraUpdate);
cameraUpdate();requestAnimationFrame(draw);reload();
