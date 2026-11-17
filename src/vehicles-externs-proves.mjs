import {createMi24Proposal,MI24_MODELS} from './mi24-proposals.mjs?rev=mi24-d-optimized-20261115-3';
import {HUMAN_CATALOG} from './human-model-catalog.mjs?rev=humans-v8';
import {createHumanProposal,setHumanPreviewWeapon,poseHumanProposal,HUMAN_VERSION,measureHumanAnatomy,createHumanGaitClock,advanceHumanGait} from './human-proposals.mjs?rev=humans-v11-boot2';
import {createCurrentHuman} from './human-current-models.mjs?rev=humans-v8';
import {createLabPlayerReference} from './vehicle-lab-player-reference.mjs?rev=player-reference-1';
import {stepKamovRotors} from './kamov-reference-candidates.mjs?rev=kamov-20261115-cockpit-body-panels-13';
import {createVehicleLiveEditor,LAB_REVISION} from './vehicle-live-editor.mjs?rev=live-editor-20261117-humans-v11-ankle-2';
import * as THREE from '../vendor/three-r186.module.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {vehicleModels} from './vehicle-model-core.mjs?rev=mi24-d-approved-1';
import {playerBatching} from './player-batching-core.mjs';
import {createTruckModel} from './truck-model.mjs';
import {createCivilianCarModel} from './civilian-car-model.mjs?rev=c1a-approved-1';
import {createVehicleAnnotationEditor} from './vehicle-annotation-editor.mjs?rev=live-editor-20261112-1';
import {prepareGazTigrRuntime} from './gaz-tigr-runtime.mjs?rev=gaz-final-1';
import {createReferenceVehicle} from './vehicle-reference-candidates.mjs?rev=gaz-door-contours-v4';
import {stepT90MPreview} from './t90m-preview-animation.mjs?rev=t90m-game-1';

// Referències a models REALS publicats. Les cerques són exactes sobre
// els manifests oficials de packs CC0; mai no es generen URLs GLB inventats.
// Un fallback de cerca pública només s'usa quan no hi ha una coincidència.
import {CATALOG} from './vehicle-candidate-catalog.mjs?rev=live-editor-20261117-humans-v11-ankle-2';
const list=document.querySelector('#vehicleList'),grid=document.querySelector('#grid'),
  warning=document.querySelector('#warning'),nameOut=document.querySelector('#vehicleName');
const humanList=document.querySelector('#humanList'),ALL_CATALOG=[...CATALOG,...HUMAN_CATALOG];
let humanTime=0,humanMode='rest',humanGait=createHumanGaitClock();
const isHumanGait=mode=>mode==='walk'||mode==='run';
import {mountHumanEvidence} from './human-lab-evidence-ui.mjs?rev=human-evidence-5';
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
 gaz:prepareGazTigrRuntime(THREE,{vehicleScale:vehicleModels.scales.cotxe}),
 truck:createTruckModel,batching:playerBatching
});
// Work on the real full-detail game model, not the hidden distant proxy.
// Runtime-only Object3D/geometry references are unnecessary in the editor
// and make JSON drafts enormous. Keep serializable animation tags.
function prepareLabRuntimeModel(model){
 const data=model.userData;
 for(const lod of [data.distantVehicleLOD,data.rowboatVisualLod]){
  (lod?.proxy||lod?.far)?.removeFromParent();
 }
 if(data.rotor&&!data.rotor.userData.kamovRotor)
   data.rotor.userData.kamovRotor={axis:'y',speed:9};
 if(data.tailRotor&&!data.tailRotor.userData.kamovRotor)
   data.tailRotor.userData.kamovRotor={axis:'x',speed:19};
 const clean=(v,ancestors=new Set())=>{
  if(v==null||typeof v==='string'||typeof v==='boolean'||typeof v==='number')return v;
  if(typeof v!=='object'||v.isObject3D||v.isBufferGeometry||v.isMaterial||v.isTexture||ancestors.has(v))return undefined;
  if(ArrayBuffer.isView(v))return undefined;
  const seen=new Set(ancestors);seen.add(v);
  if(Array.isArray(v))return v.map(x=>clean(x,seen)).filter(x=>x!==undefined);
  const out={};for(const [k,val] of Object.entries(v)){const c=clean(val,seen);if(c!==undefined)out[k]=c}return out;
 };
 delete data.distantVehicleLOD;delete data.rowboatVisualLod;
 model.traverse(n=>{n.userData=clean(n.userData)});
 return model;
}
async function createCurrentVehicle(type){
 return prepareLabRuntimeModel(makeOriginal(type,{color:0x4b9fd1}));
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
 const person=createLabPlayerReference(THREE);scene.add(person);
 const perspective=new THREE.PerspectiveCamera(36,1,.05,1300),ortho=new THREE.OrthographicCamera(-2,2,2,-2,.05,1300);
 const guide=document.createElement('canvas');guide.className='human-guide';guide.hidden=true;outer.append(guide);
 const versionTag=document.createElement('span');versionTag.className='human-version-tag';versionTag.hidden=true;label.append(versionTag);
 const slot={outer,viewport,scene,camera:perspective,perspective,ortho,guide,versionTag,ground,lines,person,status,source,bold,sub,upload,downloadBtr,model:null,mixer:null,kind:null,sourceFrame:null};
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
let comparisonDims=new THREE.Vector3(3,2,5);
const vehicleEditor=createVehicleAnnotationEditor({slots,getType:()=>currentType.id});
let yaw=.60,elev=.32,zoom=1,lookY=.6,defaultLookY=.6,panScreenX=0;
let resumedView=null;
try{resumedView=JSON.parse(sessionStorage.getItem('hunter-lab-view')||'null');sessionStorage.removeItem('hunter-lab-view')}catch{}
function refreshLab(){
 try{sessionStorage.setItem('hunter-lab-view',JSON.stringify({type:currentType.id,yaw,elev,zoom,lookY,panScreenX,selection:liveEditor.getSelection()}))}catch{}
 location.reload();
}
let suppressDraftRestore=false;
const liveEditor=createVehicleLiveEditor({slots,getType:()=>currentType.id,annotations:vehicleEditor,
 onChange:slot=>{slot.status.textContent=metrics(slot.model)+' · candidat editat';if(currentType.human)document.querySelector('#animate').checked=false},resumeSelection:resumedView?.selection,
 getView:()=>({yaw,elev,zoom,lookY,panScreenX}),
 restoreView:view=>{if(!view)return;({yaw,elev,zoom,lookY,panScreenX}=view);updateCamera()},
 reload:async()=>{
  const published=await fetch('./assets/vehicle-candidates/lab-revision.json',{cache:'no-store'}).then(r=>r.ok?r.json():null);
  if(published&&published.revision!==LAB_REVISION){refreshLab();return}
  const view={yaw,elev,zoom,lookY,panScreenX};
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
     if(node.isMesh&&(node.geometry?.userData?.candidateSimplified||node.geometry?.userData?.labOwned)&&!freed.has(node.geometry)){
       freed.add(node.geometry);node.geometry.dispose();
     }
     for(const m of Array.isArray(node.material)?node.material:[node.material])if(m?.userData.labOwned&&!freed.has(m)){freed.add(m);m.dispose()}
   });
   slot.scene.remove(slot.model);slot.model=null;
 }
 slot.mixer=null;
}
function normalize(obj,original,sizeMultiplier=1){
 obj.updateMatrixWorld(true);
 let bounds=new THREE.Box3().setFromObject(obj),sz=bounds.getSize(new THREE.Vector3());
 if(!original&&!currentType.human&&document.querySelector('#fitScale').checked){
   // Escala uniforme segons el millor encaix de les dues dimensions del xassís.
   // Manté les proporcions del fitxer i permet comparar les siluetes amb el joc.
   // Fit the unscaled geometry, then retain its explicit design scale.
   const ratios=[originalDims.x/Math.max(.01,sz.x/sizeMultiplier),originalDims.z/Math.max(.01,sz.z/sizeMultiplier)];
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
 normalize(wrap,original||obj.userData.labFixedScale===true,obj.userData.labSizeMultiplier||1);
 wrap.traverse(o=>{if(o.isMesh){o.castShadow=!o.material?.transparent;o.receiveShadow=true}});
 slot.scene.add(wrap);slot.model=wrap;
 if(animations?.length){slot.mixer=new THREE.AnimationMixer(obj);for(const clip of animations)slot.mixer.clipAction(clip).play()}
 queueMicrotask(()=>{if(slot.model===wrap)liveEditor.ready(slot,{restore:!suppressDraftRestore})});
 return wrap;
}

function createProceduralModel(variant){
 if(Object.hasOwn(MI24_MODELS,variant)){
   const model=createMi24Proposal(THREE,variant);
   model.scale.setScalar(vehicleModels.scales.heli_combat);
   model.userData.labFixedScale=true;return model;
 }
 return createReferenceVehicle(THREE,variant);
}
async function loadExternal(slot,entry,used,token){
 if(entry.provider==='human'){
   if(token!==generation)return;
   const model=createHumanProposal(THREE,entry.role,entry.style);
   if(entry.role==='player')setHumanPreviewWeapon(THREE,model,document.querySelector('#humanWeapon').value);
   poseHumanProposal(model,0,'rest');setModel(slot,model,false,[],true);
   slot.bold.textContent=entry.title;slot.sub.textContent='Articulat · escala del joc · '+entry.note;
   slot.status.textContent=metrics(slot.model);slot.source.hidden=true;return;
 }
 if(entry.provider==='procedural'){
   if(token!==generation)return;
   const model=createProceduralModel(entry.variant);
   setModel(slot,model,false,[],true);
   slot.bold.textContent=entry.title;
   slot.sub.textContent='Model Three.js propi · '+(model.userData.kamovDetail||model.userData.ka52Assemblies||model.userData.labAssemblies?'malles agrupades per materials i conjunts':'editable per peces')+' · sense GLB extern';
   slot.source.href=currentType.references?.[entry.referenceIndex??0]?.url||'https://commons.wikimedia.org/';
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
let lastHuman=HUMAN_CATALOG[0],lastVehicle=CATALOG[0];
async function choose(config){
 if(config.human)lastHuman=config;else lastVehicle=config;
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
 for(const b of [...list.querySelectorAll('button'),...humanList.querySelectorAll('button')])b.classList.toggle('active',b.dataset.type===config.id);
 const marine=config.kind==='mar';
 grid.classList.remove('featured');
 const btrStudy=config.id==='tanqueta';
 const t90Study=config.id==='tanc';
 const soloStudy=config.validated&&config.options.length===0;
 grid.classList.toggle('btr-study',soloStudy);
 document.querySelector('#fitScale').closest('label').hidden=soloStudy||!!config.human;
 document.querySelector('#t90Motion').hidden=!t90Study;
 document.querySelector('#humanMotion').hidden=!config.human;
 document.querySelector('#humanWeaponControl').hidden=config.human!=='player';
 humanEvidence.show(config.human||null);
 humanTime=0;humanMode='rest';humanGait=createHumanGaitClock();
 if(config.human){document.querySelector('#humanPose').value='rest';document.querySelector('#animate').checked=false;document.querySelector('#humanRevision').textContent='HUMANS V11 · '+HUMAN_VERSION;}
 labTankKeys.clear();labTurretSwitch=false;labTurretYaw=0;labTurretPitch=0;
 syncLabTurretButton();
 for(const slot of slots){
   slot.outer.hidden=slots.indexOf(slot)>(soloStudy?0:config.options.length);
   dropPrevious(slot);
   slot.kind=config.kind;slot.camera=config.human?slot.ortho:slot.perspective;slot.guide.hidden=true;slot.versionTag.hidden=!config.human;
   slot.person.visible=!config.human&&document.querySelector('#showGrid').checked;
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
   const model=config.human?await createCurrentHuman(THREE,config.human):config.base?createProceduralModel(config.base.variant):await createCurrentVehicle(config.id);
   // No reintroduir models antics quan es canvia de pestanya durant la càrrega.
   if(token!==generation)return;
   setModel(slots[0],model,true,[],soloStudy);
   if(config.currentName)slots[0].bold.textContent='Actual · '+config.currentName;
   if(config.base)slots[0].bold.textContent=config.base.title;
   originalDims=dimsOf(slots[0].model);
   slots[0].status.textContent=metrics(slots[0].model);
   slots[0].person.position.x=originalDims.x*.62+1.0;
   slots[0].sub.textContent=config.human?'Model actual del joc · postura neutra':btrStudy?
     'Casc i torreta 3B, defenses i visors · SIpriv · CC BY 4.0':
     t90Study?'Model real del joc · torreta, canó i erugues animables':
     config.id==='heli_combat'?'Mil Mi-24 · D definitiu · cinc pales principals':
     config.base?'Model principal de referència · Three.js propi':
     'Fàbrica original · Three.js r186';
   if(config.base){slots[0].source.href=config.references?.[0]?.url;slots[0].source.hidden=false;slots[0].status.textContent+=' · '+config.base.note;}
   if(config.id==='ferry'||config.id==='heli_combat'){slots[0].source.href=config.references[0].url;slots[0].source.hidden=false;}
   if(t90Study){
     slots[0].bold.textContent='Actual · T-90M · escala del joc';
     slots[0].source.href=config.references?.[0]?.url||'https://commons.wikimedia.org/wiki/Category:T-90M';
     slots[0].source.hidden=false;
     slots[0].status.textContent+=' · 12 rodes · prova de comandaments';
   }
   if(btrStudy){
     slots[0].bold.textContent='Actual · BTR-82 · model 3B · 80 %';
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
 comparisonDims.copy(originalDims);
 lookY=Math.min(6,Math.max(.55,originalDims.y*.38));
 defaultLookY=lookY;
 panScreenX=0;
 zoom=1;
 if(config.human){yaw=Math.PI;elev=0;lookY=originalDims.y*.43;defaultLookY=lookY;zoom=1;}
 if(resumedView?.type===config.id){({yaw,elev,zoom,lookY,panScreenX}=resumedView);resumedView=null}
 updateCamera();
 if(!soloStudy){
   const used=new Set();
   await Promise.all(config.options.map((entry,i)=>loadExternal(slots[i+1],entry,used,token)));
   if(token!==generation)return;
   if(config.kind==='aire'||config.id==='ferry'||config.human){
     for(const slot of slots)if(slot.model&&!slot.outer.hidden)comparisonDims.max(dimsOf(slot.model));
     // Same camera distance in both views: size comparison stays honest.
     const oldLook=defaultLookY;
     defaultLookY=Math.min(12,Math.max(.55,comparisonDims.y*(config.human?.43:.38)));
     if(Math.abs(lookY-oldLook)<1e-8)lookY=defaultLookY;
     updateCamera();
   }
 }
}
function updateCamera(){
 const size=Math.max(comparisonDims.x,comparisonDims.z,comparisonDims.y*.85,3);
 // Zoom de precisió: sense el sòcol fix de +3 m que impedia apropar-se.
  const distance=Math.max(.35,size*1.85*zoom+.35);
 for(const slot of slots){
   const rect=slot.viewport.getBoundingClientRect();
   if(rect.height<=0||rect.width<=0)continue;
   slot.camera.aspect=rect.width/rect.height;
   if(slot.camera.isOrthographicCamera){const half=Math.max(comparisonDims.y*.94,comparisonDims.x*.58/slot.camera.aspect)*zoom;slot.camera.top=half;slot.camera.bottom=-half;slot.camera.left=-half*slot.camera.aspect;slot.camera.right=half*slot.camera.aspect;}else slot.camera.fov=37;
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
// The printed model version comes from the loaded Object3D, not the page title.
function drawHumanGuide(slot,w,h){
 const active=!!currentType.human,show=active&&document.querySelector('#humanGuides').checked&&document.querySelector('#humanPose').value==='rest';
 slot.versionTag.hidden=!active;
 if(!active){slot.guide.hidden=true;return}
 let model=null;slot.model?.traverse(n=>{if(n.userData.humanProposal)model=n.userData.humanProposal});
 const original=slots.indexOf(slot)===0;
 slot.versionTag.textContent=original?'ORIGINAL DEL JOC':model?.version===HUMAN_VERSION?'HUMANS V11 · '+model.style.toUpperCase():model?'VERSIÓ ANTERIOR · '+model.version:'IMPORTAT / VERSIÓ DESCONEGUDA';
 slot.versionTag.classList.toggle('stale',!original&&model?.version!==HUMAN_VERSION);
 const axis=Math.abs(Math.sin(2*yaw))<.025&&Math.abs(elev)<.025;
 const measured=show&&axis&&slot.model&&!original?measureHumanAnatomy(THREE,slot.model):null;
 slot.guide.hidden=!measured;if(!measured)return;
 const cv=slot.guide,dpr=Math.min(2,window.devicePixelRatio||1);
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
 const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const {floor,crown,unit,points,ratios}=measured;
 const x=points.crown.x,z=points.crown.z;
 const screen=v=>{const p=v.clone().project(slot.camera);return {x:(p.x+1)*w/2,y:(1-p.y)*h/2}};
 ctx.font='11px system-ui';ctx.textBaseline='middle';
 for(let i=0;i<=8;i++){
  const y=screen(new THREE.Vector3(x,crown-i*unit,z)).y;
  if(y<0||y>h)continue;
  ctx.strokeStyle='rgba(157,221,236,.83)';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(11,y);ctx.lineTo(w-12,y);ctx.stroke();
  ctx.fillStyle='#d9f7ff';ctx.fillText(String(i),13,y-7);
 }
 ctx.setLineDash([]);const sideView=Math.abs(Math.sin(yaw))>.9;
 for(const [id,label] of [['chin','Mentó'],['shoulderL','Espatlla'],['elbowL','Colze'],['wristL','Canell'],['crotch','Engonal'],['tipL','Dits'],['kneeL','Genoll'],['ankleL','Turmell'],['head','Pivot cap']]){
  if(id==='head'&&!sideView)continue;
  const p=points[id];if(!p)continue;const v=screen(p);if(v.y<0||v.y>h||v.x<0||v.x>w)continue;
  ctx.fillStyle=id==='head'?'#ffb66e':'#dfff80';ctx.beginPath();ctx.arc(v.x,v.y,3.5,0,Math.PI*2);ctx.fill();
  const txt=label+' '+(8-ratios[id]).toFixed(2),right=sideView||v.x<w*.48;
  ctx.textAlign=right?'left':'right';ctx.strokeStyle='#142628';ctx.lineWidth=3;ctx.strokeText(txt,v.x+(right?7:-7),v.y-5);ctx.fillText(txt,v.x+(right?7:-7),v.y-5);ctx.lineWidth=1;ctx.textAlign='left';
 }
}

function draw(now){
 requestAnimationFrame(draw);
 if(document.getElementById('modelWorkshop')?.hidden){prev=now;return;}
 const dt=Math.min(.07,(now-prev)/1000);prev=now;
 if(document.querySelector('#animate').checked){
   for(const slot of slots){slot.mixer?.update(dt);if(slot.model)stepKamovRotors(slot.model,dt);}
   if(currentType.human){const elapsed=dt*Number(document.querySelector('#humanSpeed').value);humanTime+=elapsed;const mode=document.querySelector('#humanPose').value;const gait=isHumanGait(mode);if(gait)humanGait=advanceHumanGait(humanGait,elapsed,mode);for(const slot of slots)if(slot.model)poseHumanProposal(slot.model,humanTime,mode,gait?humanGait:null);const out=document.querySelector('#humanGaitMix');out.textContent=gait?'Cursa '+Math.round(humanGait.blend*100)+' %':'';}
   if(currentType.id==='tanc'&&slots[0].model)
     stepT90MPreview(slots[0].model,t90MotionInput(dt),dt);
 }

 // Les coordenades setViewport i setScissor de WebGLRenderer ja es
 // multipliquen internament pel pixelRatio. Multiplicar-les aquí deixava
 // els models retallats o totalment fora del canvas en pantalles HiDPI.
 // Clear the ENTIRE transparent canvas before drawing clipped card views.
 // Clearing only scissored regions leaves the last section's silhouettes visible.
 renderer.setClearColor(0x203238,0);
 renderer.setScissorTest(false);
 renderer.clear(true,true,true);
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
   drawHumanGuide(slot,width,height);
 }
}
function applyView(id){
 const views={quarter:[.62,.38],front:[Math.PI,.1],side:[Math.PI/2,.1],rear:[0,.1],top:[0,Math.PI/2-.06]};
 [yaw,elev]=views[id]||views.quarter;
 if(currentType.human&&['front','side','rear'].includes(id))elev=0;
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
document.querySelector('#showGrid').addEventListener('change',e=>{for(const s of slots){s.lines.visible=e.target.checked;s.person.visible=e.target.checked&&!currentType.human}});
document.querySelector('#humanPose').addEventListener('change',e=>{
 const mode=e.target.value,continuous=isHumanGait(humanMode)&&isHumanGait(mode);
 humanMode=mode;document.querySelector('#animate').checked=mode!=='rest';
 if(continuous)return; // Retain the current phase AND blend when changing gait.
 humanTime=0;humanGait=createHumanGaitClock(mode);
 document.querySelector('#humanGaitMix').textContent=isHumanGait(mode)?'Cursa '+Math.round(humanGait.blend*100)+' %':'';
 for(const slot of slots)if(slot.model)poseHumanProposal(slot.model,0,mode,isHumanGait(mode)?humanGait:null);
});
document.querySelector('#humanWeapon').addEventListener('change',e=>{
 if(currentType.human!=='player')return;
 for(const slot of slots.slice(1)){
  if(!slot.model)continue;
  if(setHumanPreviewWeapon(THREE,slot.model,e.target.value)){
   const mode=document.querySelector('#humanPose').value;
   poseHumanProposal(slot.model,humanTime,mode,isHumanGait(mode)?humanGait:null);
   slot.status.textContent=metrics(slot.model)+' · '+e.target.selectedOptions[0].textContent;
  }
 }
});
document.querySelector('#humanGuides').addEventListener('change',e=>{if(e.target.checked){document.querySelector('#humanPose').value='rest';document.querySelector('#humanPose').dispatchEvent(new Event('change'));applyView('front')}});
document.querySelector('#humanRest').addEventListener('click',()=>{
 document.querySelector('#humanPose').value='rest';document.querySelector('#humanPose').dispatchEvent(new Event('change'));
});
document.querySelector('#liveEditor').addEventListener('toggle',()=>{if(!document.querySelector('#liveEditor').open){document.querySelector('#livePick').checked=false;}requestAnimationFrame(updateCamera)});
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
   const size=Math.max(comparisonDims.x,comparisonDims.z,comparisonDims.y*.85,3);
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
const humanEvidence=mountHumanEvidence({T:THREE,slots,revision:LAB_REVISION,getPose:()=>document.querySelector('#humanPose').value,getAnimated:()=>document.querySelector('#animate').checked});
const kinds={terra:'Terrestre',mar:'Marítim',aire:'Aeri',huma:'3 propostes'};
for(const config of ALL_CATALOG){
 const button=document.createElement('button');button.dataset.type=config.id;
 button.dataset.validation=config.validated?'validated':'pending';
 button.textContent=config.name;
 const small=document.createElement('small');
 small.textContent=(config.validated?'✓ Validat':'● Pendent')+' · '+(config.experimental?'Experimental':kinds[config.kind]);
 button.append(small);button.addEventListener('click',()=>choose(config));
 (config.human?humanList:list).append(button);
}
window.addEventListener('hunter:proves-section',event=>{
 const wanted=event.detail==='characters'?lastHuman:event.detail==='vehicles'?lastVehicle:null;
 if(wanted&&currentType.id!==wanted.id)choose(wanted);
});
addEventListener('resize',resizeRenderer);
resizeRenderer();requestAnimationFrame(draw);
const params=new URLSearchParams(location.search),requestedType=params.get('model')||params.get('vehicle');
fetch('./assets/vehicle-candidates/manifest.json',{cache:'no-store'})
 .then(response=>response.ok?response.json():null)
 .then(manifest=>{savedManifest=manifest;return choose((()=>{const saved=ALL_CATALOG.find(c=>c.id===(resumedView?.type||requestedType));const kind=document.body.dataset.editorKind;return saved&&((kind==='characters')===!!saved.human)?saved:kind==='characters'?HUMAN_CATALOG[0]:CATALOG[0]})());})
 .catch(error=>{console.warn('Manifest local no disponible',error);choose((()=>{const saved=ALL_CATALOG.find(c=>c.id===(resumedView?.type||requestedType));const kind=document.body.dataset.editorKind;return saved&&((kind==='characters')===!!saved.human)?saved:kind==='characters'?HUMAN_CATALOG[0]:CATALOG[0]})());});

// A tiny manifest is the only periodic request; edited drafts are never discarded.
setInterval(async()=>{
 if(document.hidden||!document.querySelector('#liveAutoReload').checked)return;
 try{const response=await fetch('./assets/vehicle-candidates/lab-revision.json',{cache:'no-store'});
  if(!response.ok)return;const data=await response.json();
  if(data.revision!==LAB_REVISION){if(!liveEditor.dirty())refreshLab();else document.querySelector('#liveStatus').textContent='Nova versió disponible. Prem Recarregar model publicat; conservarem l’esborrany.';}
 }catch{}
},15000);
