import * as THREE from '../vendor/three-r186.module.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {vehicleModels} from './vehicle-model-core.mjs';
import {playerBatching} from './player-batching-core.mjs';
import {createTruckModel} from './truck-model.mjs';
import {createCivilianCarModel} from './civilian-car-model.mjs';
import {HELICOPTER_LEVELS,simplifyHelicopter,encodeHelicopterGLB,countModelTriangles} from './helicopter-simplification.mjs';

// Referències a models REALS publicats. Les cerques són exactes sobre
// els manifests oficials de packs CC0; mai no es generen URLs GLB inventats.
// Un fallback de cerca pública només s'usa quan no hi ha una coincidència.
import {CATALOG} from './vehicle-candidate-catalog.mjs';
const list=document.querySelector('#vehicleList'),grid=document.querySelector('#grid'),
  warning=document.querySelector('#warning'),nameOut=document.querySelector('#vehicleName');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:true});
renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.32;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setScissorTest(true);
renderer.setClearColor(0x203238,1);
renderer.domElement.id='draw';
renderer.domElement.setAttribute('aria-hidden','true');
document.body.append(renderer.domElement);
const loader=new GLTFLoader();
const helicopterToolbar=document.querySelector('#helicopterToolbar');
const helicopterFile=document.querySelector('#helicopterFile');
const helicopterStatus=document.querySelector('#helicopterStatus');
const helicopterSources=new Map(); // Els originals només viuen a la memòria del navegador.
function helicopterFileName(config,ratio){
 return 'hunter-'+(config.id==='heli'?'huey-duanes-mind':'apache-araon')+'-'+Math.round(ratio*100)+'.glb';
}
async function exportVariant(slot){
 if(!slot.variantRoot||!slot.model)return;
 const button=slot.download;
 button.disabled=true;button.textContent='Exportant…';
 try{
  const buffer=await encodeHelicopterGLB(slot.model,slot.variantAnimations||[]);
  const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'}));
  const a=document.createElement('a');a.href=url;a.download=slot.variantFileName;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
 }catch(error){slot.status.textContent='Error en exportar el GLB: '+(error?.message||String(error))}
 finally{button.disabled=false;button.textContent='Desa GLB'}
}
async function showHelicopterVariants(config,token){
 const source=helicopterSources.get(config.id);
 if(!source)return;
 helicopterStatus.textContent='Generant variants de '+source.filename+'…';
 const total=countModelTriangles(source.root);
 for(let i=0;i<HELICOPTER_LEVELS.length;i++){
  if(token!==generation)return;
  const ratio=HELICOPTER_LEVELS[i],slot=slots[i];
  slot.status.textContent='Simplificant a '+Math.round(ratio*100)+'%…';
  const {root,stats}=await simplifyHelicopter(source.root,source.animations,ratio);
  if(token!==generation){
   root.traverse(node=>{if(node.isMesh&&node.geometry?.userData?.candidateSimplified)node.geometry.dispose()});
   return;
  }
  setModel(slot,root,false,source.animations);
  slot.variantRoot=root;slot.variantAnimations=source.animations;
  slot.variantFileName=helicopterFileName(config,ratio);
  slot.download.hidden=false;
  slot.bold.textContent=config.options[0].title+' · '+Math.round(ratio*100)+'%';
  slot.sub.textContent='GLB local · '+config.options[0].author+' · '+config.options[0].license;
  slot.source.href=config.options[0].url;slot.source.hidden=false;
  slot.status.textContent=stats.triangles.toLocaleString('ca')+' △ / '+total.toLocaleString('ca')+
   ' originals ('+Math.round(100*stats.triangles/Math.max(1,total))+'% real) · '+
   stats.simplified+' malles reduïdes · '+stats.protectedMeshes+' protegides'+
   (stats.failed?' · '+stats.failed+' sense simplificar':'');
 }
 helicopterStatus.textContent='Variants preparades: revisa visualment rotors, materials i animacions abans d’integrar el model al joc.';
}
const matCache=new Map();
function material(color,profile='paint'){
 if(color?.isMaterial)return color;
 const key=String(color)+':'+profile;
 if(!matCache.has(key))matCache.set(key,new THREE.MeshStandardMaterial({
   color,roughness:profile==='metal'?.47:profile==='glass'?.18:.82,
   metalness:profile==='metal'?.48:.02,flatShading:profile!=='glass',
   transparent:profile==='glass',opacity:profile==='glass'?.62:1,
   depthWrite:profile!=='glass',side:THREE.DoubleSide
 }));
 return matCache.get(key);
}
function box(parent,w,h,d,color,x=0,y=0,z=0,profile='paint'){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color,profile));
 m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
const makeOriginal=vehicleModels.createFactory(THREE,{
 box,material,shadows:true,civilianCar:createCivilianCarModel,
 truck:createTruckModel,batching:playerBatching
});
const slots=[];
for(let i=0;i<4;i++){
 const outer=document.createElement('article');outer.className='panel';
 const label=document.createElement('div');label.className='label';
 const bold=document.createElement('strong');bold.textContent=i?'Alternativa '+i:'Model actual del joc';
 const sub=document.createElement('span');sub.textContent=i?'Proposta GLB · CC0':'Codi del motor de Hunter';
 label.append(bold,sub);
 const viewport=document.createElement('div');viewport.className='viewport';
 const meta=document.createElement('div');meta.className='meta';
 const status=document.createElement('span');status.className='status';status.textContent='Preparant…';
 const actions=document.createElement('div');actions.className='actions';
 const source=document.createElement('a');source.textContent='Font / llicència';source.href='#';source.target='_blank';source.rel='noopener noreferrer';source.hidden=!i;
 const fileLabel=document.createElement('label');fileLabel.textContent='Importa GLB';
 const upload=document.createElement('input');upload.type='file';upload.accept='.glb,model/gltf-binary';
 const download=document.createElement('button');download.type='button';download.textContent='Desa GLB';download.hidden=true;
 fileLabel.append(upload);if(i)actions.append(source,fileLabel);actions.append(download);
 meta.append(status,actions);outer.append(label,viewport,meta);grid.append(outer);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x354b4c);
 scene.add(new THREE.HemisphereLight(0xddeefa,0x566152,2.15));
 const sun=new THREE.DirectionalLight(0xffe7c4,2.65);sun.position.set(-20,44,29);
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
 sun.shadow.camera.left=-70;sun.shadow.camera.right=70;
 sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;
 sun.shadow.camera.near=.1;sun.shadow.camera.far=160;
 sun.shadow.bias=-.00025;scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(230,230),new THREE.MeshStandardMaterial({color:0x687461,roughness:1}));
 ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.position.y=-.07;scene.add(ground);
 const lines=new THREE.GridHelper(230,230,0xacc3ab,0x819788);
 lines.position.y=.015;lines.material.transparent=true;lines.material.opacity=.24;scene.add(lines);
 const person=new THREE.Group();
 const human=new THREE.Mesh(new THREE.CapsuleGeometry(.25,1.17,4,8),material(0x243c34));
 human.position.y=.92;human.castShadow=true;person.add(human);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),material(0xf0c7a2));
 head.position.y=1.73;head.castShadow=true;person.add(head);scene.add(person);
 const camera=new THREE.PerspectiveCamera(36,1,.05,1300);
 const slot={outer,viewport,scene,camera,ground,lines,person,status,source,bold,sub,upload,download,model:null,mixer:null,embed:null,kind:null,variantRoot:null,variantAnimations:null};
 download.addEventListener('click',()=>exportVariant(slot));
 slots.push(slot);
 upload.addEventListener('change',async()=>{
   const file=upload.files?.[0];if(!file)return;
   const current=generation;
   status.textContent='Important '+file.name+'…';
   const url=URL.createObjectURL(file);
   try{
     const gltf=await loader.loadAsync(url);
     if(current!==generation)return;
     setModel(slot,gltf.scene,false,gltf.animations);
     slot.bold.textContent=file.name;
     slot.sub.textContent='Fitxer local · llicència no verificada';
     slot.source.hidden=true;
     status.textContent=metrics(slot.model)+' · importat localment';
   }catch(e){status.textContent='Error GLB: '+(e?.message||String(e));}
   finally{URL.revokeObjectURL(url)}
 });
}
let currentType=CATALOG[0],generation=0,originalDims=new THREE.Vector3(3,2,5);
let yaw=.60,elev=.32,zoom=1,lookY=.6;
let prev=performance.now();
const packCache=new Map(),searchCache=new Map();
let savedManifest=null;
const canonical=(x)=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
async function getPack(slug){
 if(!packCache.has(slug))packCache.set(slug,fetch('https://3dassets.dev/api/v1/packs/'+encodeURIComponent(slug))
  .then(r=>{if(!r.ok)throw Error('Pack HTTP '+r.status);return r.json()})
  .then(payload=>payload.data?.assets||payload.assets||[]));
 return packCache.get(slug);
}
async function searchAssets(query){
 if(!searchCache.has(query))searchCache.set(query,fetch('https://3dassets.dev/api/v1/assets?q='+encodeURIComponent(query)+'&category=vehicles&limit=30')
  .then(r=>{if(!r.ok)throw Error('Cerca HTTP '+r.status);return r.json()})
  .then(payload=>Array.isArray(payload.data)?payload.data:
    payload.data?.assets||payload.assets||payload.results||[]));
 return searchCache.get(query);
}
async function candidate(entry,used){
 const target=canonical(entry.match||entry.query),alternates=[];
 if(entry.pack){
   try{
     const arr=await getPack(entry.pack);
     const hits=arr.filter(a=>canonical(a.title).startsWith(target)||
       canonical(a.title).includes(target));
     alternates.push(...hits);
   }catch(e){console.warn('Manifest extern no accessible',entry.pack,e)}
 }
 if(!alternates.length&&entry.query){
   try{
     const results=await searchAssets(entry.query);
     alternates.push(...results.filter(a=>a.category?.slug==='vehicles'||!a.category));
   }catch(e){console.warn('Cerca externa no accessible',entry.query,e)}
 }
 const found=alternates.find(a=>a.cdnUrl&&!used.has(a.id));
 if(found)used.add(found.id);
 return found||null;
}
const dimsOf=obj=>new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
function triangles(root){
 let t=0;root.traverse(o=>{
   if(!o.isMesh||!o.geometry)return;
   const geo=o.geometry;
   if(geo.index)t+=geo.index.count/3;
   else t+=(geo.attributes.position?.count||0)/3;
 });return Math.round(t);
}
function metrics(root){
 const d=dimsOf(root);let meshes=0,materials=new Set();
 root.traverse(o=>{if(o.isMesh){meshes++;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m)}});
 return triangles(root).toLocaleString('ca')+' △ · '+meshes+' malles · '+materials.size+
   ' materials · '+d.x.toFixed(1)+' × '+d.y.toFixed(1)+' × '+d.z.toFixed(1)+' m';
}
function dropPrevious(slot){
 slot.download.hidden=true;slot.variantRoot=null;slot.variantAnimations=null;
 if(slot.embed){slot.embed.remove();slot.embed=null;slot.viewport.classList.remove('has-embed')}
 if(slot.model){
   const freed=new Set();
   slot.model.traverse(node=>{
     if(node.isMesh&&node.geometry?.userData?.candidateSimplified&&!freed.has(node.geometry)){
       freed.add(node.geometry);node.geometry.dispose();
     }
   });
   slot.scene.remove(slot.model);slot.model=null;
 }
 slot.mixer=null;
}
function normalize(obj,original){
 obj.updateMatrixWorld(true);
 let bounds=new THREE.Box3().setFromObject(obj),sz=bounds.getSize(new THREE.Vector3());
 if(!original&&document.querySelector('#fitScale').checked){
   // Escala uniforme segons el millor encaix de les dues dimensions del xassís.
   // Manté les proporcions del fitxer i permet comparar les siluetes amb el joc.
   const ratios=[originalDims.x/Math.max(.01,sz.x),originalDims.z/Math.max(.01,sz.z)];
   const factor=Math.min(...ratios);
   obj.scale.multiplyScalar(Math.max(.08,Math.min(45,factor)));
   obj.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(obj);
 }
 const center=bounds.getCenter(new THREE.Vector3());
 obj.position.x-=center.x;
 obj.position.z-=center.z;
 obj.position.y-=bounds.min.y;
 obj.updateMatrixWorld(true);
 return obj;
}
function setModel(slot,obj,original,animations=[]){
 dropPrevious(slot);
 // Els GLB verificats de 3DAssets apunten el morro cap a +Z;
 // la fàbrica del joc el dibuixa cap a -Z. Orientam sense deformar.
 if(!original)obj.rotation.y+=Math.PI;
 const wrap=new THREE.Group();wrap.add(obj);
 normalize(wrap,original);
 wrap.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 slot.scene.add(wrap);slot.model=wrap;
 if(animations?.length){slot.mixer=new THREE.AnimationMixer(obj);for(const clip of animations)slot.mixer.clipAction(clip).play()}
 return wrap;
}

async function loadExternal(slot,entry,used,token){
 if(entry.provider==='sketchfab'){
   // Referència oficial; no es descarrega cap GLB privat ni es canvia el joc.
   slot.bold.textContent=entry.title;
   slot.sub.textContent=entry.author+' · '+entry.license+' · '+(entry.triangles?entry.triangles.toLocaleString('ca'):'?')+' △';
   slot.source.href=entry.url;slot.source.hidden=false;
   slot.status.textContent=(entry.note||'Helicòpter militar')+' · Visor 3D extern; importa GLB si vols comparar escales.';
   const iframe=document.createElement('iframe');
   iframe.title='Visor 3D de '+entry.title+' · '+entry.author;
   iframe.src='https://sketchfab.com/models/'+encodeURIComponent(entry.modelId)+'/embed?ui_hint=2';
   iframe.loading='lazy';
   iframe.allow='autoplay; fullscreen; xr-spatial-tracking';
   iframe.referrerPolicy='strict-origin-when-cross-origin';
   slot.viewport.classList.add('has-embed');
   slot.viewport.append(iframe);slot.embed=iframe;
   return;
 }
 const slotIndex=slots.indexOf(slot);
 const local=savedManifest?.models?.[currentType.id]?.find(record=>record.slot===slotIndex);
 if(local){
   slot.bold.textContent=local.title.split(' (')[0];
   slot.sub.textContent='GLB desat al repositori · CC0';
   slot.source.href=local.url;
   slot.source.hidden=false;
   slot.status.textContent='Carregant GLB local ('+Math.round(local.bytes/1024)+' KiB)…';
   try{
     const gltf=await loader.loadAsync('./assets/vehicle-candidates/'+local.file);
     if(token!==generation)return;
     setModel(slot,gltf.scene,false,gltf.animations);
     slot.status.textContent=metrics(slot.model)+' · desat';
     return;
   }catch(error){
     slot.status.textContent='La còpia local no ha carregat. Provant el catàleg…';
     console.warn('GLB local absent o incorrecte',local.file,error);
   }
 }
 slot.status.textContent='Consultant catàleg CC0…';
 slot.sub.textContent='Cercant: '+(entry.match||entry.query);
 slot.source.hidden=true;
 const asset=await candidate(entry,used);
 if(token!==generation)return;
 if(!asset){
   slot.status.textContent='No s’ha pogut verificar o consultar el GLB. Obre el catàleg i importa’l manualment.';
   slot.source.href=entry.pack?'https://3dassets.dev/packs/'+entry.pack:
     'https://3dassets.dev/assets?q='+encodeURIComponent(entry.query);
   slot.source.hidden=false;
   return;
 }
 slot.bold.textContent=asset.title.split(' (')[0];
 slot.sub.textContent='CC0 1.0 · '+(asset.stats?.triangles?.toLocaleString('ca')||'?')+' triangles (catàleg)';
 slot.source.href=asset.url||'https://3dassets.dev/';
 slot.source.hidden=false;
 slot.status.textContent='Descarregant GLB…';
 try{
   const gltf=await loader.loadAsync(asset.cdnUrl);
   if(token!==generation)return;
   setModel(slot,gltf.scene,false,gltf.animations);
   slot.status.textContent=metrics(slot.model);
 }catch(e){
   slot.status.textContent='No s’ha pogut carregar el model: '+(e?.message||String(e)).slice(0,120)+'. Pots importar el GLB local.';
 }
}
async function choose(config){
 currentType=config;generation++;
 const token=generation;
 nameOut.textContent=config.name;
 warning.textContent=(config.note?config.note+' ':'')+
   'Comparació visual: la física, les hitboxes i les animacions pròpies dels vehicles no s’han transferit.';
 for(const b of list.querySelectorAll('button'))b.classList.toggle('active',b.dataset.type===config.id);
 const marine=config.kind==='mar';
 grid.classList.remove('featured');
 for(const slot of slots){
   dropPrevious(slot);
   slot.kind=config.kind;
   slot.ground.material.color.setHex(marine?0x285f65:config.kind==='aire'?0x6a7b67:0x69735e);
   slot.ground.material.roughness=marine?.43:1;
   slot.ground.material.needsUpdate=true;
   slot.status.textContent='Carregant…';slot.bold.textContent=slots.indexOf(slot)?'Alternativa '+slots.indexOf(slot):'Actual · '+config.name;
   slot.sub.textContent=slots.indexOf(slot)?'Cercant model CC0':'Model real del joc';
   slot.source.hidden=true;
 }
 try{
   const model=makeOriginal(config.id,{color:0x4b9fd1});
   setModel(slots[0],model,true);
   originalDims=dimsOf(slots[0].model);
   slots[0].status.textContent=metrics(slots[0].model);
   slots[0].person.position.x=originalDims.x*.62+1.0;
   slots[0].sub.textContent='Fàbrica original · Three.js r186';
 }catch(e){
   console.error('Original no disponible',config.id,e);
   slots[0].status.textContent='Error en el model original: '+e.message;
   originalDims.set(3,3,6);
 }
 for(let k=1;k<4;k++)slots[k].person.position.x=originalDims.x*.62+1.0;
 lookY=Math.min(6,Math.max(.55,originalDims.y*.38));
 zoom=1;updateCamera();
 helicopterToolbar.hidden=config.mode!=='heli-lod';
 if(config.mode==='heli-lod'){
  helicopterFile.value='';
  helicopterStatus.textContent='Descarrega el GLB oficial de Sketchfab i importa’l aquí. La llicència CC BY exigeix atribució.';
  if(helicopterSources.has(config.id))return showHelicopterVariants(config,token);
  for(const slot of slots.slice(2)){
   slot.status.textContent='Cal importar el GLB seleccionat per calcular-ne les variants.';
   slot.bold.textContent='Variant LOD pendent';
   slot.sub.textContent='100% / 75% / 50% / 25% després de la importació';
  }
  await loadExternal(slots[1],config.options[0],new Set(),token);
  return;
 }
 const used=new Set();
 await Promise.all(config.options.map((entry,i)=>loadExternal(slots[i+1],entry,used,token)));
}
function updateCamera(){
 const size=Math.max(originalDims.x,originalDims.z,originalDims.y*.85,3);
 const distance=size*1.85*zoom+3;
 for(const slot of slots){
   const rect=slot.viewport.getBoundingClientRect();
   if(rect.height<=0||rect.width<=0)continue;
   slot.camera.aspect=rect.width/rect.height;
   slot.camera.fov=37;
   slot.camera.near=Math.max(.05,distance/1000);
   slot.camera.far=Math.max(800,distance*10);
   slot.camera.position.set(
     Math.sin(yaw)*Math.cos(elev)*distance,
     lookY+Math.sin(elev)*distance,
     Math.cos(yaw)*Math.cos(elev)*distance);
   slot.camera.lookAt(0,lookY,0);slot.camera.updateProjectionMatrix();
 }
}
function resizeRenderer(){
 const pixelRatio=Math.min(1.5,window.devicePixelRatio||1);
 const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
 renderer.setPixelRatio(pixelRatio);
 renderer.setSize(w,h,false);
 updateCamera();
}
function draw(now){
 requestAnimationFrame(draw);
 const dt=Math.min(.07,(now-prev)/1000);prev=now;
 if(document.querySelector('#animate').checked)
   for(const slot of slots)slot.mixer?.update(dt);

 // Les coordenades setViewport i setScissor de WebGLRenderer ja es
 // multipliquen internament pel pixelRatio. Multiplicar-les aquí deixava
 // els models retallats o totalment fora del canvas en pantalles HiDPI.
 renderer.setClearColor(0x203238,1);
 renderer.setScissorTest(true);
 const windowWidth=innerWidth,windowHeight=innerHeight;
 for(const slot of slots){
   if(slot.embed)continue; // El visor Sketchfab té WebGL i càmera propis.
   const r=slot.viewport.getBoundingClientRect();
   const left=Math.round(r.left),bottom=Math.round(windowHeight-r.bottom);
   const width=Math.max(1,Math.round(r.width)),height=Math.max(1,Math.round(r.height));
   const clipX=Math.max(0,left),clipY=Math.max(0,bottom);
   const clipRight=Math.min(windowWidth,left+width);
   const clipTop=Math.min(windowHeight,bottom+height);
   if(clipRight<=clipX||clipTop<=clipY)continue;
   // El viewport conserva les dimensions COMPLETES de la targeta. Només
   // l'scissor queda retallat pel viewport del navegador: així no canvien
   // perspectiva ni zoom mentre es desplaça la pàgina.
   renderer.setViewport(left,bottom,width,height);
   renderer.setScissor(clipX,clipY,clipRight-clipX,clipTop-clipY);
   renderer.setScissorTest(true);
   slot.camera.aspect=width/height;
   slot.camera.updateProjectionMatrix();
   renderer.render(slot.scene,slot.camera);
 }
}
function applyView(id){
 const views={quarter:[.62,.38],front:[Math.PI,.1],side:[Math.PI/2,.1],rear:[0,.1],top:[0,Math.PI/2-.06]};
 [yaw,elev]=views[id]||views.quarter;
 for(const el of document.querySelectorAll('[data-view]'))el.classList.toggle('active',el.dataset.view===id);
 updateCamera();
}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>applyView(btn.dataset.view)));
document.querySelector('#zoom-in').addEventListener('click',()=>{zoom=Math.max(.27,zoom*.78);updateCamera()});
document.querySelector('#zoom-out').addEventListener('click',()=>{zoom=Math.min(7,zoom*1.28);updateCamera()});
document.querySelector('#zoom-reset').addEventListener('click',()=>{zoom=1;updateCamera()});
document.querySelector('#fitScale').addEventListener('change',()=>choose(currentType));
document.querySelector('#showGrid').addEventListener('change',e=>{for(const s of slots){s.lines.visible=e.target.checked;s.person.visible=e.target.checked}});
const drag=new Map();
slots.forEach(slot=>{
 slot.viewport.addEventListener('pointerdown',e=>{slot.viewport.setPointerCapture(e.pointerId);drag.set(e.pointerId,[e.clientX,e.clientY])});
 slot.viewport.addEventListener('pointermove',e=>{
  if(!drag.has(e.pointerId))return;
  const old=drag.get(e.pointerId);drag.set(e.pointerId,[e.clientX,e.clientY]);
  yaw-=(e.clientX-old[0])*.012;
  elev=Math.max(.03,Math.min(1.51,elev+(e.clientY-old[1])*.008));
  updateCamera();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])slot.viewport.addEventListener(event,e=>drag.delete(e.pointerId));
 // La roda del ratolí HA de desplaçar la pàgina. Només Alt + roda
 // modifica el zoom de les quatre càmeres (els botons continuen disponibles).
 slot.viewport.addEventListener('wheel',e=>{
   if(!e.altKey)return;
   e.preventDefault();
   zoom=Math.max(.27,Math.min(7,zoom*(e.deltaY>0?1.12:.89)));
   updateCamera();
 },{passive:false});
});
const kinds={terra:'Terrestre',mar:'Marítim',aire:'Aeri'};
for(const config of CATALOG){
 const button=document.createElement('button');button.dataset.type=config.id;
 button.textContent=config.name;
 const small=document.createElement('small');small.textContent=kinds[config.kind]+' · '+(config.id==='ferry'?'2–3 alternatives':'3 alternatives');
 button.append(small);button.addEventListener('click',()=>choose(config));
 list.append(button);
}
helicopterFile.addEventListener('change',async()=>{
 const f=helicopterFile.files?.[0],config=currentType;
 if(!f||config.mode!=='heli-lod')return;
 if(!/\\.glb$/i.test(f.name)){helicopterStatus.textContent='Selecciona un fitxer .glb (opció GLB de Sketchfab).';return}
 const token=++generation;
 helicopterStatus.textContent='Obrint '+f.name+'…';
 const url=URL.createObjectURL(f);
 try{
  const gltf=await loader.loadAsync(url);
  if(!gltf.scene||countModelTriangles(gltf.scene)===0)throw Error('El fitxer no conté cap malla triangular');
  helicopterSources.set(config.id,{root:gltf.scene,animations:gltf.animations||[],filename:f.name});
  if(currentType.id===config.id&&token===generation)await showHelicopterVariants(config,token);
 }catch(error){
  helicopterStatus.textContent='No s’ha pogut obrir el GLB: '+(error?.message||String(error));
 }finally{URL.revokeObjectURL(url)}
});
addEventListener('resize',resizeRenderer);
resizeRenderer();requestAnimationFrame(draw);
fetch('./assets/vehicle-candidates/manifest.json',{cache:'no-store'})
 .then(response=>response.ok?response.json():null)
 .then(manifest=>{savedManifest=manifest;return choose(CATALOG[0]);})
 .catch(error=>{console.warn('Manifest local no disponible',error);choose(CATALOG[0]);});
