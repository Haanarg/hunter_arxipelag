import * as THREE from '../vendor/three-r186.module.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeBtr82LabBaseline} from './btr82-lod-studio.mjs';
import {BTR82_NOSE_CANDIDATES,BTR82_NOSE_ASSET,extractBtr82SourceTriangles,buildBtr82NoseCandidate} from './btr82-nose-candidates.mjs';

const notice=document.querySelector('#notice'),grid=document.querySelector('#grid');
const referenceCard=document.querySelector('#referenceCard');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.34;
renderer.shadowMap.enabled=false; // Six views share one GPU context; keep mobile affordable.
renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
renderer.setClearColor(0x354b4c,1);
renderer.setScissorTest(true);
renderer.domElement.id='draw';
renderer.domElement.setAttribute('aria-hidden','true');
document.body.append(renderer.domElement);
const cameraState={yaw:.72,elev:.32,zoom:1,y:1.35,offset:0};
const slots=[],slotById=new Map(),scratch=new THREE.Vector3();
let selected=null,scheduled=false,baseOffset=null;

function stats(object){
 let tris=0,meshes=0;
 object.traverse(node=>{
  if(!node.isMesh||!node.geometry)return;
  meshes++;
  tris+=(node.geometry.index?.count??node.geometry.getAttribute('position')?.count??0)/3;
 });
 return Math.round(tris).toLocaleString('ca')+' △ · '+meshes+' malles';
}
function createSlot(card,id){
 const viewport=card.querySelector('.viewport'),output=card.querySelector('.stats');
 const scene=new THREE.Scene();
 scene.background=new THREE.Color(0x354b4c);
 scene.add(new THREE.HemisphereLight(0xd8eff2,0x646956,2.25));
 const sun=new THREE.DirectionalLight(0xffefd4,2.5);
 sun.position.set(-15,32,20);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(150,150),
  new THREE.MeshStandardMaterial({color:0x76806e,roughness:1}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.025;scene.add(ground);
 const lines=new THREE.GridHelper(150,75,0xb9cba9,0x84978c);
 lines.position.y=.004;lines.material.transparent=true;lines.material.opacity=.24;
 scene.add(lines);
 const camera=new THREE.PerspectiveCamera(37,1,.05,800);
 const slot={id,card,viewport,output,scene,camera,ground,lines,model:null};
 slots.push(slot);slotById.set(id,slot);
 return slot;
}
createSlot(referenceCard,'reference');
for(const method of BTR82_NOSE_CANDIDATES){
 const card=document.createElement('article');
 card.className='panel';card.dataset.id=method.id;
 const head=document.createElement('header');
 const title=document.createElement('h2');title.textContent=method.title;
 const tag=document.createElement('span');tag.className='tag';tag.textContent=method.tag;
 head.append(title,tag);
 const viewport=document.createElement('div');viewport.className='viewport';
 viewport.setAttribute('aria-label','Model 3D: '+method.title);
 const foot=document.createElement('footer');
 const description=document.createElement('p');description.textContent=method.description;
 const stats=document.createElement('div');stats.className='stats';stats.textContent='Preparant geometria…';
 const actions=document.createElement('div');actions.className='actions';
 const focus=document.createElement('button');focus.textContent='Ampliar';focus.type='button';
 focus.addEventListener('click',()=>{
  if(selected===method.id){selected=null;grid.classList.remove('solo');for(const c of grid.querySelectorAll('.panel'))c.classList.remove('selected');focus.textContent='Ampliar';}
  else{
   selected=method.id;grid.classList.add('solo');
   for(const c of grid.querySelectorAll('.panel'))c.classList.toggle('selected',c===card);
   for(const button of grid.querySelectorAll('.actions button'))button.textContent='Ampliar';
   focus.textContent='Tots sis';
   card.scrollIntoView({behavior:'smooth',block:'start'});
  }
  updateCameras();schedule();
 });
 actions.append(focus);
 foot.append(description,stats,actions);
 card.append(head,viewport,foot);grid.append(card);
 createSlot(card,method.id);
}

function cameraFor(slot){
 const {yaw,elev,zoom,y,offset}=cameraState;
 const rect=slot.viewport.getBoundingClientRect();
 if(rect.width<=0||rect.height<=0)return;
 const dist=Math.max(.35,11.5*1.75*zoom);
 const cx=Math.cos(yaw)*offset,cz=-Math.sin(yaw)*offset;
 slot.camera.fov=37;
 slot.camera.aspect=rect.width/rect.height;
 slot.camera.near=Math.max(.04,dist/1000);slot.camera.far=800;
 slot.camera.position.set(cx+Math.sin(yaw)*Math.cos(elev)*dist,
   y+Math.sin(elev)*dist,cz+Math.cos(yaw)*Math.cos(elev)*dist);
 slot.camera.up.set(0,1,0);
 slot.camera.lookAt(cx,y,cz);
 slot.camera.updateProjectionMatrix();
}
function updateCameras(){for(const slot of slots)cameraFor(slot)}
function schedule(){
 if(scheduled)return;
 scheduled=true;requestAnimationFrame(render);
}
function render(){
 scheduled=false;
 const width=innerWidth,height=innerHeight;
 if(width<1||height<1)return;
 renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
 renderer.setSize(width,height,false);
 renderer.setScissorTest(true);
 for(const slot of slots){
  if(!slot.model||slot.card.hidden||getComputedStyle(slot.card).display==='none')continue;
  const r=slot.viewport.getBoundingClientRect();
  const left=Math.round(r.left),bottom=Math.round(height-r.bottom);
  const w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
  const x=Math.max(0,left),y=Math.max(0,bottom),right=Math.min(width,left+w),top=Math.min(height,bottom+h);
  if(right<=x||top<=y)continue;
  cameraFor(slot);
  renderer.setViewport(left,bottom,w,h);
  renderer.setScissor(x,y,right-x,top-y);
  renderer.render(slot.scene,slot.camera);
 }
}
function applyView(name){
 const angles={quarter:[.72,.32],front:[Math.PI,.08],side:[Math.PI/2,.08],
  rear:[0,.08],top:[0,Math.PI/2-.025],bottom:[0,-Math.PI/2+.05]};
 [cameraState.yaw,cameraState.elev]=angles[name]||angles.quarter;
 for(const button of document.querySelectorAll('[data-view]'))
  button.classList.toggle('active',button.dataset.view===name);
 updateCameras();schedule();
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>applyView(b.dataset.view)));
const step=()=>Math.max(.03,cameraState.zoom*.34);
document.querySelector('#zoomIn').addEventListener('click',()=>{cameraState.zoom=Math.max(.06,cameraState.zoom*.8);schedule()});
document.querySelector('#zoomOut').addEventListener('click',()=>{cameraState.zoom=Math.min(5,cameraState.zoom*1.25);schedule()});
document.querySelector('#panLeft').addEventListener('click',()=>{cameraState.offset+=step();schedule()});
document.querySelector('#panRight').addEventListener('click',()=>{cameraState.offset-=step();schedule()});
document.querySelector('#panUp').addEventListener('click',()=>{cameraState.y+=step();schedule()});
document.querySelector('#panDown').addEventListener('click',()=>{cameraState.y-=step();schedule()});
document.querySelector('#fit').addEventListener('click',()=>{
 cameraState.zoom=1;cameraState.offset=0;cameraState.y=1.35;updateCameras();schedule();
});
document.querySelector('#reference').addEventListener('change',event=>{
 referenceCard.classList.toggle('visible',event.target.checked);
 updateCameras();schedule();
});
document.querySelector('#gridToggle').addEventListener('change',event=>{
 for(const slot of slots){slot.ground.visible=event.target.checked;slot.lines.visible=event.target.checked}
 schedule();
});
const drag=new Map();
for(const slot of slots){
 slot.viewport.addEventListener('pointerdown',e=>{
  if(e.button>1)return;
  slot.viewport.setPointerCapture(e.pointerId);
  drag.set(e.pointerId,[e.clientX,e.clientY]);
 });
 slot.viewport.addEventListener('pointermove',e=>{
  const old=drag.get(e.pointerId);if(!old)return;
  const dx=e.clientX-old[0],dy=e.clientY-old[1];
  drag.set(e.pointerId,[e.clientX,e.clientY]);
  if(e.shiftKey||e.buttons===2){
   const factor=11.5*1.75*cameraState.zoom*.0017;
   cameraState.y+=dy*factor;cameraState.offset-=dx*factor;
  }else{
   cameraState.yaw-=dx*.011;
   cameraState.elev=Math.max(-1.51,Math.min(1.51,cameraState.elev+dy*.008));
  }
  schedule();
 });
 const done=e=>{drag.delete(e.pointerId)};
 slot.viewport.addEventListener('pointerup',done);
 slot.viewport.addEventListener('pointercancel',done);
 slot.viewport.addEventListener('lostpointercapture',done);
 slot.viewport.addEventListener('wheel',e=>{
  if(!e.altKey)return;
  e.preventDefault();
  cameraState.zoom=Math.max(.06,Math.min(5,cameraState.zoom*(e.deltaY>0?1.12:.89)));
  schedule();
 },{passive:false});
}
window.addEventListener('resize',()=>{updateCameras();schedule()});
window.addEventListener('scroll',schedule,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});

function present(slot,model,details={}){
 const wrapped=new THREE.Group();
 wrapped.add(model);
 // Common offset for all candidates, computed from the approved base.
 wrapped.position.copy(baseOffset);
 slot.scene.add(wrapped);
 slot.model=wrapped;
 slot.output.textContent=stats(wrapped)+(details.openSeam?' · unió oberta':' · prototip');
 if(details.openSeam)slot.card.dataset.openSeam='true';
 schedule();
}
async function load(){
 try{
  const loader=new GLTFLoader();
  const gltf=await loader.loadAsync(BTR82_NOSE_ASSET+'?rev=six-noses-1');
  const baseline=makeBtr82LabBaseline(gltf.scene);
  baseline.updateWorldMatrix(true,true);
  const bbox=new THREE.Box3().setFromObject(baseline);
  const center=bbox.getCenter(new THREE.Vector3());
  baseOffset=new THREE.Vector3(-center.x,-bbox.min.y,-center.z);
  const originalTriangles=extractBtr82SourceTriangles(baseline);
  present(slotById.get('reference'),baseline.clone(true));
  let succeeded=0;
  for(const method of BTR82_NOSE_CANDIDATES){
   const slot=slotById.get(method.id);
   try{
    const {scene,details}=buildBtr82NoseCandidate(method.id,baseline,originalTriangles);
    present(slot,scene,details);
    succeeded++;
   }catch(error){
    slot.card.classList.add('error');
    slot.output.textContent='Error en aquest candidat: '+(error?.message||String(error));
    console.error('BTR-82 candidat '+method.id,error);
   }
   // Yield between builds so partial candidates appear immediately.
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  notice.textContent='Carregats '+succeeded+' de 6 candidats, des de la mateixa base GLB amb rodes i canó comuns. '+(succeeded===6?'Compara les proes des de sota, de costat i frontalment.':'Els errors de candidats estan identificats a les seves targetes.');
  if(succeeded!==6)notice.dataset.error='true';
  updateCameras();schedule();
 }catch(error){
  notice.dataset.error='true';
  notice.textContent='No s’ha pogut carregar la comparació: '+(error?.message||String(error));
  console.error('BTR-82 laboratori de sis candidats',error);
 }
}
load();
