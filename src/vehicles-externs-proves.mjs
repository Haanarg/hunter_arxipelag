import {createVehicleLiveEditor,LAB_REVISION} from './vehicle-live-editor.mjs?rev=live-editor-20261113-glb-cleanup-1';
import * as THREE from '../vendor/three-r186.module.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {vehicleModels} from './vehicle-model-core.mjs';
import {playerBatching} from './player-batching-core.mjs';
import {createTruckModel} from './truck-model.mjs';
import {createCivilianCarModel} from './civilian-car-model.mjs';
import {prepareHueyDuaneRuntime} from './huey-duane-runtime.mjs';
import {prepareApacheAraonRuntime} from './apache-araon-runtime.mjs';
import {createVehicleAnnotationEditor} from './vehicle-annotation-editor.mjs?rev=live-editor-20261112-1';
import {createBtr823BPreview} from './btr82-3b-preview.mjs?rev=btr82-3b-full-nose-restored-v9';
import {createReferenceVehicle} from './vehicle-reference-candidates.mjs?rev=t90m-game-1';
import {stepT90MPreview} from './t90m-preview-animation.mjs?rev=t90m-game-1';
import {prepareGazTigrRuntime} from './gaz-tigr-runtime.mjs';

// Referències a models REALS publicats. Les cerques són exactes sobre
// els manifests oficials de packs CC0; mai no es generen URLs GLB inventats.
// Un fallback de cerca pública només s'usa quan no hi ha una coincidència.
import {CATALOG} from './vehicle-candidate-catalog.mjs?rev=live-editor-20261113-glb-cleanup-1';
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
async function loadUploadedGlb(file){
 const url=URL.createObjectURL(file);
 try{return await loader.loadAsync(url)}
 finally{URL.revokeObjectURL(url)}
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
// El GAZ, Huey i Apache mostren els mateixos models natius del joc.
const finalGazFactory=prepareGazTigrRuntime(THREE);
const makeCurrentGaz=vehicleModels.createFactory(THREE,{
 box,material,shadows:true,civilianCar:createCivilianCarModel,
 truck:createTruckModel,batching:playerBatching,gaz:finalGazFactory
});
let hueyFactoryPromise=null,apacheFactoryPromise=null;
async function createCurrentVehicle(type){
 // El bootstrap del joc prepara aquests models abans de construir vehicles.
 // El laboratori els prepara només quan s'obre una de les dues pestanyes.
 if(type==='heli'){
  if(!hueyFactoryPromise)hueyFactoryPromise=prepareHueyDuaneRuntime(THREE)
    .then(factory=>{globalThis.HUNTER_HUEY_DUANE=factory;return factory})
    .catch(error=>{hueyFactoryPromise=null;throw error});
  await hueyFactoryPromise;
 }else if(type==='heli_combat'){
  if(!apacheFactoryPromise)apacheFactoryPromise=prepareApacheAraonRuntime(THREE)
    .then(factory=>{globalThis.HUNTER_APACHE_ARAON=factory;return factory})
    .catch(error=>{apacheFactoryPromise=null;throw error});
  await apacheFactoryPromise;
 }
 return makeCurrentGaz(type,{color:0x4b9fd1});
}
const slots=[];
for(let i=0;i<5;i++){
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
 const downloadBtr=document.createElement('button');downloadBtr.type='button';downloadBtr.textContent='Desa GLB';downloadBtr.hidden=true;
 const fileLabel=document.createElement('label');fileLabel.textContent='Importa GLB';
 const upload=document.createElement('input');upload.type='file';upload.accept='.glb,model/gltf-binary';
 fileLabel.append(upload);if(i)actions.append(source,fileLabel,downloadBtr);else actions.append(source);
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
 const slot={outer,viewport,scene,camera,ground,lines,person,status,source,bold,sub,upload,downloadBtr,model:null,mixer:null,kind:null,sourceFrame:null};
 slots.push(slot);
 upload.addEventListener('change',async()=>{
   const file=upload.files?.[0];if(!file)return;
   const current=generation;
   status.textContent='Important '+file.name+'…';
   try{
     const gltf=await loadUploadedGlb(file);
     if(current!==generation)return;
     setModel(slot,gltf.scene,false,gltf.animations);
     slot.bold.textContent=file.name;
     slot.sub.textContent='Fitxer local · llicència no verificada';
     slot.source.hidden=true;
     status.textContent=metrics(slot.model)+' · importat localment';
   }catch(e){status.textContent='Error GLB: '+(e?.message||String(e));}
   finally{upload.value='';}
 });
}
let currentType=CATALOG[0],generation=0,originalDims=new THREE.Vector3(3,2,5);
const vehicleEditor=createVehicleAnnotationEditor({slots,getType:()=>currentType.id});
let yaw=.60,elev=.32,zoom=1,lookY=.6,defaultLookY=.6,panScreenX=0;
let resumedView=null;
try{resumedView=JSON.parse(sessionStorage.getItem('hunter-lab-view')||'null');sessionStorage.removeItem('hunter-lab-view')}catch{}
function refreshLab(){
 try{sessionStorage.setItem('hunter-lab-view',JSON.stringify({type:currentType.id,yaw,elev,zoom,lookY,panScreenX,selection:liveEditor.getSelection()}))}catch{}
 location.reload();
}
let suppressDraftRestore=false;
let previewFactory=createBtr823BPreview;
const liveEditor=createVehicleLiveEditor({slots,getType:()=>currentType.id,annotations:vehicleEditor,
 onChange:slot=>{slot.status.textContent=metrics(slot.model)+' · candidat editat'},resumeSelection:resumedView?.selection,
 getView:()=>({yaw,elev,zoom,lookY,panScreenX}),
 restoreView:view=>{if(!view)return;({yaw,elev,zoom,lookY,panScreenX}=view);updateCamera()},
 reload:async()=>{
  const published=await fetch('./assets/vehicle-candidates/lab-revision.json',{cache:'no-store'}).then(r=>r.ok?r.json():null);
  if(published&&published.revision!==LAB_REVISION){refreshLab();return}
  const view={yaw,elev,zoom,lookY,panScreenX};
  const module=await import('./btr82-3b-preview.mjs?live='+Date.now());previewFactory=module.createBtr823BPreview;
  suppressDraftRestore=true;
  try{await choose(currentType)}finally{suppressDraftRestore=false}
  ({yaw,elev,zoom,lookY,panScreenX}=view);updateCamera();
 }
});
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
 if(slot.downloadBtr){slot.downloadBtr.hidden=true;slot.downloadBtr.onclick=null;}
 if(slot.sourceFrame){slot.sourceFrame.remove();slot.sourceFrame=null;slot.viewport.classList.remove('has-embed')}
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
function setModel(slot,obj,original,animations=[],keepNativeOrientation=false){
 dropPrevious(slot);
 // Els GLB verificats de 3DAssets apunten el morro cap a +Z;
 // la fàbrica del joc el dibuixa cap a -Z. Orientam sense deformar.
 if(!original&&!keepNativeOrientation)obj.rotation.y+=Math.PI;
 const wrap=new THREE.Group();wrap.add(obj);
 normalize(wrap,original);
 wrap.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 slot.scene.add(wrap);slot.model=wrap;
 if(animations?.length){slot.mixer=new THREE.AnimationMixer(obj);for(const clip of animations)slot.mixer.clipAction(clip).play()}
 queueMicrotask(()=>{if(slot.model===wrap)liveEditor.ready(slot,{restore:!suppressDraftRestore})});
 return wrap;
}

async function loadExternal(slot,entry,used,token){
 if(entry.provider==='procedural'){
   if(token!==generation)return;
   const model=createReferenceVehicle(THREE,entry.variant);
   setModel(slot,model,false,[],true);
   slot.bold.textContent=entry.title;
   slot.sub.textContent='Model Three.js propi · editable per peces · sense GLB extern';
   slot.source.href=currentType.references?.[0]?.url||'https://commons.wikimedia.org/';
   slot.source.hidden=false;
   slot.status.textContent=metrics(slot.model)+' · '+entry.note;
   return;
 }
 if(entry.provider==='sketchfab'){
   // Font oficial de la malla: sense URL de descàrrega inventada ni
   // pretendre que una vista remota sigui un GLB empaquetat al joc.
   if(token!==generation)return;
   slot.bold.textContent=entry.title;
   slot.sub.textContent=entry.author+' · '+entry.license+' · '+entry.triangles.toLocaleString('ca')+' △';
   slot.source.href=entry.url;slot.source.hidden=false;
   const frame=document.createElement('iframe');
   frame.title=entry.title+' · Sketchfab';
   frame.loading='lazy';
   frame.src='https://sketchfab.com/models/'+entry.modelId+'/embed?ui_hint=2';
   frame.allow='autoplay; fullscreen; xr-spatial-tracking';
   frame.referrerPolicy='strict-origin-when-cross-origin';
   slot.viewport.classList.add('has-embed');
   slot.viewport.append(frame);slot.sourceFrame=frame;
   slot.status.textContent='Visor original · '+entry.note+' Per provar un GLB al motor, importa’l des del seu autor.';
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
 liveEditor.reset();
 vehicleEditor.reset();
  currentType=config;generation++;
  document.querySelector('#btrPartTool').hidden=false;
 const token=generation;
 nameOut.textContent=config.name;
 warning.textContent=config.note||'';
 const refs=document.querySelector('#referenceLinks');
 refs.replaceChildren();
 for(const reference of config.references||[]){
  const a=document.createElement('a');
  a.textContent=reference.label;a.href=reference.url;a.target='_blank';a.rel='noopener noreferrer';
  refs.append(a);
 }
 for(const b of list.querySelectorAll('button'))b.classList.toggle('active',b.dataset.type===config.id);
 const marine=config.kind==='mar';
 grid.classList.remove('featured');
 const btrStudy=config.id==='tanqueta';
 const t90Study=config.id==='tanc';
 const soloStudy=btrStudy||t90Study||config.id==='cotxe'||config.id==='heli'||config.id==='heli_combat';
 grid.classList.toggle('btr-study',soloStudy);
 document.querySelector('#fitScale').closest('label').hidden=soloStudy;
 document.querySelector('#t90Motion').hidden=!t90Study;
 labTankKeys.clear();labTurretSwitch=false;labTurretYaw=0;labTurretPitch=0;
 syncLabTurretButton();
 for(const slot of slots){
   slot.outer.hidden=slots.indexOf(slot)>(soloStudy?0:config.options.length);
   dropPrevious(slot);
   slot.kind=config.kind;
   slot.ground.material.color.setHex(marine?0x285f65:config.kind==='aire'?0x6a7b67:0x69735e);
   slot.ground.material.roughness=marine?.43:1;
   slot.ground.material.needsUpdate=true;
   slot.status.textContent='Carregant…';slot.bold.textContent=slots.indexOf(slot)?'Alternativa '+slots.indexOf(slot):'Actual · '+config.name;
   const isSource=slots.indexOf(slot)===0;
   const fileLabel=slot.upload.parentNode;
   if(fileLabel&&fileLabel.tagName==='LABEL')fileLabel.firstChild.textContent='Importa GLB';
   slot.sub.textContent=slots.indexOf(slot)?'Preparant candidat…':'Model real del joc';
   slot.source.hidden=true;
 }
 try{
   const model=btrStudy?previewFactory():t90Study?createReferenceVehicle(THREE,config.candidate):await createCurrentVehicle(config.id);
   // Canviar de pestanya durant la preparació del GAZ no ha de
   // reintroduir el model anterior damunt el vehicle acabat de seleccionar.
   if(token!==generation)return;
   setModel(slots[0],model,true,[],soloStudy);
   originalDims=dimsOf(slots[0].model);
   slots[0].status.textContent=metrics(slots[0].model);
   slots[0].person.position.x=originalDims.x*.62+1.0;
   slots[0].sub.textContent=btrStudy?
     'Casc i torreta 3B, defenses i visors · SIpriv · CC BY 4.0':
     t90Study?'Model Three.js propi · 150 % · torreta, canó i erugues animables':
     config.id==='cotxe'?'GAZ Tigr-M · model definitiu del joc':
     config.id==='heli'?'Huey UH-1 · model definitiu natiu · portes obertes · dos seients':
     config.id==='heli_combat'?'Apache AH-64 · model definitiu natiu · 3 rodes':
     'Fàbrica original · Three.js r186';
   if(t90Study){
     slots[0].bold.textContent='T-90M · model propi únic · 150 %';
     slots[0].source.href=config.references?.[0]?.url||'https://commons.wikimedia.org/wiki/Category:T-90M';
     slots[0].source.hidden=false;
     slots[0].status.textContent+=' · 12 rodes · prova de comandaments';
   }
   if(btrStudy){
     slots[0].bold.textContent='BTR-82 · model 3B revisat';
     slots[0].source.href='https://sketchfab.com/3d-models/low-poly-btr-82-6226acae68424d99bf03882b245ff7c5';
     slots[0].source.hidden=false;
     slots[0].status.textContent+=' · 8 rodes · detalls de prova';
   }
 }catch(e){
   if(token!==generation)return;
   console.error('Original no disponible',config.id,e);
   slots[0].status.textContent='Error en el model original: '+e.message;
   originalDims.set(3,3,6);
 }
 for(let k=1;k<slots.length;k++)slots[k].person.position.x=originalDims.x*.62+1.0;
 lookY=Math.min(6,Math.max(.55,originalDims.y*.38));
 defaultLookY=lookY;
 panScreenX=0;
 zoom=1;
 if(resumedView?.type===config.id){({yaw,elev,zoom,lookY,panScreenX}=resumedView);resumedView=null}
 updateCamera();
 if(!soloStudy){
   const used=new Set();
   await Promise.all(config.options.map((entry,i)=>loadExternal(slots[i+1],entry,used,token)));
 }
}
function updateCamera(){
 const size=Math.max(originalDims.x,originalDims.z,originalDims.y*.85,3);
 // Zoom de precisió: sense el sòcol fix de +3 m que impedia apropar-se.
  const distance=Math.max(.35,size*1.85*zoom+.35);
 for(const slot of slots){
   const rect=slot.viewport.getBoundingClientRect();
   if(rect.height<=0||rect.width<=0)continue;
   slot.camera.aspect=rect.width/rect.height;
   slot.camera.fov=37;
   slot.camera.near=Math.max(.05,distance/1000);
   slot.camera.far=Math.max(800,distance*10);
   // Panoràmica en l'eix horitzontal de la pantalla, també en
   // vistes frontal, lateral i zenital. No traslladem el model 3D.
   const targetX=Math.cos(yaw)*panScreenX;
   const targetZ=-Math.sin(yaw)*panScreenX;
   slot.camera.position.set(
     targetX+Math.sin(yaw)*Math.cos(elev)*distance,
     lookY+Math.sin(elev)*distance,
     targetZ+Math.cos(yaw)*Math.cos(elev)*distance);
   slot.camera.lookAt(targetX,lookY,targetZ);slot.camera.updateProjectionMatrix();
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
 if(document.querySelector('#animate').checked){
   for(const slot of slots)slot.mixer?.update(dt);
   if(currentType.id==='tanc'&&slots[0].model)
     stepT90MPreview(slots[0].model,t90MotionInput(dt),dt);
 }

 // Les coordenades setViewport i setScissor de WebGLRenderer ja es
 // multipliquen internament pel pixelRatio. Multiplicar-les aquí deixava
 // els models retallats o totalment fora del canvas en pantalles HiDPI.
 renderer.setClearColor(0x203238,1);
 renderer.setScissorTest(true);
 const windowWidth=innerWidth,windowHeight=innerHeight;
 for(const slot of slots){
   if(slot.outer.hidden||slot.sourceFrame)continue;
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
document.querySelector('#zoom-in').addEventListener('click',()=>{zoom=Math.max(.025,zoom*.78);updateCamera()});
document.querySelector('#zoom-out').addEventListener('click',()=>{zoom=Math.min(7,zoom*1.28);updateCamera()});
document.querySelector('#zoom-reset').addEventListener('click',()=>{
 zoom=1;lookY=defaultLookY;panScreenX=0;updateCamera();
});
const panStep=()=>Math.max(.025,zoom*.30);
document.querySelector('#pan-up').addEventListener('click',()=>{lookY+=panStep();updateCamera()});
document.querySelector('#pan-down').addEventListener('click',()=>{lookY-=panStep();updateCamera()});
// Els noms indiquen cap on es desplaça el MODEL a la pantalla:
// moure el punt de mira a la dreta desplaça el model a l'esquerra.
document.querySelector('#pan-left').addEventListener('click',()=>{panScreenX+=panStep();updateCamera()});
document.querySelector('#pan-right').addEventListener('click',()=>{panScreenX-=panStep();updateCamera()});
document.querySelector('#fitScale').addEventListener('change',()=>choose(currentType));
document.querySelector('#showGrid').addEventListener('change',e=>{for(const s of slots){s.lines.visible=e.target.checked;s.person.visible=e.target.checked}});
const drag=new Map(),pointerStarts=new Map(),paintPointers=new Set();
slots.forEach(slot=>{
 slot.viewport.addEventListener('pointerleave',()=>vehicleEditor.hideCursor());
 slot.viewport.addEventListener('pointerdown',e=>{
  slot.viewport.setPointerCapture(e.pointerId);
  drag.set(e.pointerId,[e.clientX,e.clientY]);
  pointerStarts.set(e.pointerId,[e.clientX,e.clientY]);
  if(document.querySelector('#livePick').checked&&!e.altKey&&!e.shiftKey&&e.button===0){
   const rect=slot.viewport.getBoundingClientRect(),ray=new THREE.Raycaster();
   ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),slot.camera);
   const hit=slot.model&&ray.intersectObject(slot.model,true).find(h=>!h.object.userData.vehicleAnnotationOverlay);
   if(hit)liveEditor.select(slot,hit.object);
   drag.delete(e.pointerId);return;
  }
  if(vehicleEditor.active()&&!e.altKey&&!e.shiftKey&&e.button===0){
   paintPointers.add(e.pointerId);
   vehicleEditor.begin(slot,e);
  }
 });
 slot.viewport.addEventListener('pointermove',e=>{
  if(!drag.has(e.pointerId)){
   vehicleEditor.hover(slot,e);
   return;
  }
  if(paintPointers.has(e.pointerId)){vehicleEditor.move(slot,e);return}
  const old=drag.get(e.pointerId);drag.set(e.pointerId,[e.clientX,e.clientY]);
  if(e.shiftKey||(e.buttons&2)){
   // Arrossegament lliure en ambdós eixos: el model segueix el cursor.
   // No es modifica ni la geometria ni la posició del vehicle.
   const size=Math.max(originalDims.x,originalDims.z,originalDims.y*.85,3);
   const distance=Math.max(.35,size*1.85*zoom+.35);
   lookY+=(e.clientY-old[1])*distance*.0017;
   panScreenX-=(e.clientX-old[0])*distance*.0017;
  }else{
   yaw-=(e.clientX-old[0])*.012;
   elev=Math.max(.03,Math.min(1.51,elev+(e.clientY-old[1])*.008));
  }
  updateCamera();
 });
 slot.viewport.addEventListener('pointerup',e=>{
  if(paintPointers.has(e.pointerId))vehicleEditor.end(slot,e);
  paintPointers.delete(e.pointerId);drag.delete(e.pointerId);pointerStarts.delete(e.pointerId);
 });
 for(const event of ['pointercancel','lostpointercapture'])slot.viewport.addEventListener(event,e=>{
  if(paintPointers.has(e.pointerId))vehicleEditor.end(slot,e);
  paintPointers.delete(e.pointerId);drag.delete(e.pointerId);pointerStarts.delete(e.pointerId);
 });
 // La roda del ratolí desplaça la pàgina; Alt + roda fa zoom.
 slot.viewport.addEventListener('wheel',e=>{
  if(!e.altKey)return;
  e.preventDefault();
  zoom=Math.max(.025,Math.min(7,zoom*(e.deltaY>0?1.12:.89)));
  updateCamera();
 },{passive:false});
});
// W/S/A/D condueixen les erugues. SHIFT o TORRETA fan servir les
// mateixes tecles per orientar la torreta i elevar el canó, sense sliders.
const labTankKeys=new Set();
let labTurretSwitch=false,labTurretYaw=0,labTurretPitch=0;
function labTurretActive(){return labTurretSwitch||labTankKeys.has('shift')}
function t90MotionInput(dt=0){
 const has=k=>labTankKeys.has(k);
 const vertical=(has('w')?1:0)-(has('s')?1:0);
 const horizontal=(has('a')?1:0)-(has('d')?1:0);
 const manual=labTurretActive();
 if(manual){
  labTurretYaw=Math.max(-180,Math.min(180,labTurretYaw+horizontal*85*dt));
  labTurretPitch=Math.max(-26,Math.min(26,labTurretPitch+vertical*50*dt));
 }else{labTurretYaw=0;labTurretPitch=0}
 return {throttle:manual?0:vertical,steer:manual?0:horizontal,
  turretYaw:labTurretYaw,elevation:labTurretPitch};
}
const labTurretButton=document.getElementById('t90LabTurret');
function syncLabTurretButton(){
 const active=labTurretActive();
 labTurretButton.setAttribute('aria-pressed',String(active));
 labTurretButton.textContent=active?'TORRETA ●':'TORRETA';
}
labTurretButton.addEventListener('click',()=>{
 labTurretSwitch=!labTurretSwitch;syncLabTurretButton();
});
document.addEventListener('keydown',e=>{
 if(currentType.id!=='tanc')return;
 const tag=e.target?.tagName?.toLowerCase();
 if(['input','textarea','select','button'].includes(tag)||e.target?.isContentEditable)return;
 const key=e.key.toLowerCase();
 if(['w','s','a','d','shift'].includes(key)){
  labTankKeys.add(key);e.preventDefault();syncLabTurretButton();
 }
});
document.addEventListener('keyup',e=>{labTankKeys.delete(e.key.toLowerCase());syncLabTurretButton()});
window.addEventListener('blur',()=>{labTankKeys.clear();syncLabTurretButton()});
syncLabTurretButton();
const kinds={terra:'Terrestre',mar:'Marítim',aire:'Aeri'};
for(const config of CATALOG){
 const button=document.createElement('button');button.dataset.type=config.id;
 button.textContent=config.name;
 const small=document.createElement('small');small.textContent=kinds[config.kind]+' · '+(config.id==='tanqueta'?'3B revisat · únic model':config.id==='tanc'?'Model propi · únic':config.id==='cotxe'?'GAZ definitiu':config.id==='heli'?'Huey definitiu · Three.js':config.id==='heli_combat'?'Apache definitiu · Three.js':config.options.length+' alternatives');
 button.append(small);button.addEventListener('click',()=>choose(config));
 list.append(button);
}
addEventListener('resize',resizeRenderer);
resizeRenderer();requestAnimationFrame(draw);
fetch('./assets/vehicle-candidates/manifest.json',{cache:'no-store'})
 .then(response=>response.ok?response.json():null)
 .then(manifest=>{savedManifest=manifest;return choose(CATALOG.find(c=>c.id===resumedView?.type)||CATALOG[0]);})
 .catch(error=>{console.warn('Manifest local no disponible',error);choose(CATALOG[0]);});

// A tiny manifest is the only periodic request; edited drafts are never discarded.
setInterval(async()=>{
 if(document.hidden||!document.querySelector('#liveAutoReload').checked)return;
 try{const response=await fetch('./assets/vehicle-candidates/lab-revision.json',{cache:'no-store'});
  if(!response.ok)return;const data=await response.json();
  if(data.revision!==LAB_REVISION){if(!liveEditor.dirty())refreshLab();else document.querySelector('#liveStatus').textContent='Nova versió disponible. Prem Recarregar model publicat; conservarem l’esborrany.';}
 }catch{}
},15000);
