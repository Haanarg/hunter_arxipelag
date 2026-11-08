import * as THREE from '../vendor/three-r186.module.mjs';
import {prepareHueyDuaneRuntime} from './huey-duane-runtime.mjs';
import {prepareApacheAraonRuntime} from './apache-araon-runtime.mjs';

const display=document.getElementById('notice');
const slots=[...document.querySelectorAll('.card')].map(el=>({
 el,viewport:el.querySelector('.viewport'),stat:el.querySelector('.stat'),
 type:el.dataset.type,kind:el.dataset.kind,name:el.dataset.model,
 scene:new THREE.Scene(),cam:new THREE.PerspectiveCamera(37,1,.1,500),
 root:null,size:1,center:new THREE.Vector3(),rotor:null,tail:null
}));
const fmt=n=>n.toLocaleString('ca');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.domElement.id='draw';document.body.append(renderer.domElement);
renderer.setClearColor(0x283d40,1);
renderer.setScissorTest(true);
let yaw=.67,elev=.30,zoom=1,filtered='all',last=performance.now();
for(const slot of slots){
 slot.scene.background=new THREE.Color(0x30484b);
 slot.scene.add(new THREE.HemisphereLight(0xe8f3f4,0x5b645c,2.15));
 const key=new THREE.DirectionalLight(0xffe4b3,2.4);
 key.position.set(-25,35,30);slot.scene.add(key);
 const fill=new THREE.DirectionalLight(0x9dbbcc,.75);
 fill.position.set(20,15,-25);slot.scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),
  new THREE.MeshStandardMaterial({color:0x64766a,roughness:1}));
 floor.rotation.x=-Math.PI/2;floor.receiveShadow=false;slot.scene.add(floor);
 const grid=new THREE.GridHelper(100,50,0x9eb6a5,0x6e847b);
 grid.position.y=.01;grid.material.transparent=true;grid.material.opacity=.22;
 slot.scene.add(grid);slot.grid=grid;
}
function countMesh(root){
 let n=0,t=0;
 root.traverse(o=>{
  if(!o.isMesh||!o.geometry?.getAttribute('position'))return;
  n++;
  t+=Math.floor((o.geometry.getIndex()?.count??o.geometry.getAttribute('position').count)/3);
 });
 return {meshes:n,triangles:t};
}
function updateCam(slot){
 const r=slot.viewport.getBoundingClientRect();
 const d=slot.size*2.2*zoom+1.5;
 const c=slot.center;
 slot.cam.aspect=Math.max(.3,r.width/Math.max(1,r.height));
 slot.cam.position.set(c.x+d*Math.cos(elev)*Math.sin(yaw),c.y+d*Math.sin(elev),c.z+d*Math.cos(elev)*Math.cos(yaw));
 slot.cam.lookAt(c);slot.cam.updateProjectionMatrix();
}
function refresh(){for(const slot of slots)updateCam(slot);}
async function load(slot){
 const before=performance.now();
 try{
  let root,info='';
  if(slot.type==='huey'){
   const factory=await prepareHueyDuaneRuntime(THREE);
   root=factory.create();
   info='Geometria JS · 2 seients · +10%';
  }else if(slot.type==='apache'){
   const factory=await prepareApacheAraonRuntime(THREE);
   root=factory.create();
   info='Geometria APG2 JS · 3 rodes circulars · +50%';
  }else throw Error('Helicòpter desconegut');
  if(slot.name.endsWith('-native')){
   const wire=new THREE.MeshBasicMaterial({
    color:0xe6ead3,wireframe:true,transparent:true,opacity:.85,
    side:THREE.DoubleSide
   });
   root.traverse(o=>{if(o.isMesh)o.material=wire});
   info+=' · vista en filferro';
  }
  const stats=countMesh(root);
  slot.scene.add(root);
  slot.root=root;slot.rotor=root.userData.rotor;slot.tail=root.userData.tailRotor;
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  const dimensions=bounds.getSize(new THREE.Vector3());
  slot.center.copy(bounds.getCenter(new THREE.Vector3()));
  slot.size=Math.max(dimensions.x,dimensions.y*.95,dimensions.z,3);
  updateCam(slot);
  const elapsed=Math.round(performance.now()-before);
  slot.stat.textContent=fmt(stats.triangles)+' triangles · '+stats.meshes+' malles · '+elapsed+' ms de preparació · '+info;
  slot.stat.title='Dimensions: '+dimensions.toArray().map(n=>n.toFixed(2)).join(' × ')+' unitats. El temps inclou la preparació de la geometria.';
  if(slot.type==='huey'&&stats.triangles!==2119)
   throw Error('Els 1.767 triangles originals i els seients del Huey no coincideixen');
  if(slot.type==='apache'&&!(stats.triangles>2100&&stats.triangles<2800))
   throw Error('La malla Apache i les tres rodes són incompletes');
  return true;
 }catch(error){
  slot.stat.textContent='No carregat: '+String(error.message||error).slice(0,190);
  slot.stat.style.color='#ffbfad';return false;
 }
}
for(const btn of document.querySelectorAll('[data-filter]')){
 btn.addEventListener('click',()=>{
  filtered=btn.dataset.filter;
  for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b===btn));
  for(const slot of slots)slot.el.hidden=filtered!=='all'&&slot.type!==filtered;
  refresh();
 });
}
const angles={quarter:[.67,.30],side:[Math.PI/2,.12],front:[Math.PI,.10],top:[0,Math.PI/2-.06]};
for(const btn of document.querySelectorAll('[data-camera]')){
 btn.addEventListener('click',()=>{
  [yaw,elev]=angles[btn.dataset.camera];
  for(const b of document.querySelectorAll('[data-camera]'))b.setAttribute('aria-pressed',String(b===btn));
  refresh();
 });
}
document.getElementById('zoomOut').addEventListener('click',()=>{zoom=Math.min(7,zoom*1.18);refresh()});
document.getElementById('zoomIn').addEventListener('click',()=>{zoom=Math.max(.28,zoom*.84);refresh()});
document.getElementById('gridToggle').addEventListener('change',e=>{for(const s of slots)s.grid.visible=e.target.checked});
const pointer=new Map();
for(const slot of slots){
 slot.viewport.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  pointer.set(e.pointerId,[e.clientX,e.clientY]);
  slot.viewport.setPointerCapture(e.pointerId);
 });
 slot.viewport.addEventListener('pointermove',e=>{
  const old=pointer.get(e.pointerId);if(!old)return;
  pointer.set(e.pointerId,[e.clientX,e.clientY]);
  yaw-=(e.clientX-old[0])*.012;
  elev=Math.max(.02,Math.min(1.52,elev+(e.clientY-old[1])*.008));
  refresh();
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])
  slot.viewport.addEventListener(name,e=>pointer.delete(e.pointerId));
 slot.viewport.addEventListener('wheel',e=>{
  if(!e.altKey)return;
  e.preventDefault();
  zoom=Math.max(.28,Math.min(7,zoom*(e.deltaY>0?1.12:.89)));
  refresh();
 },{passive:false});
}
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);refresh()});
function frame(now){
 requestAnimationFrame(frame);
 const dt=Math.min(.055,Math.max(0,(now-last)/1000));last=now;
 const spin=document.getElementById('spinning').checked;
 if(spin)for(const slot of slots){
  if(slot.rotor)slot.rotor.rotation.y+=dt*30;
  if(slot.tail)slot.tail.rotation.x+=dt*40;
 }
 if(renderer.domElement.width!==Math.round(innerWidth*renderer.getPixelRatio())||
    renderer.domElement.height!==Math.round(innerHeight*renderer.getPixelRatio()))
  renderer.setSize(innerWidth,innerHeight,false);
 const H=innerHeight,W=innerWidth;
 for(const slot of slots){
  if(slot.el.hidden)continue;
  const r=slot.viewport.getBoundingClientRect(),x=Math.floor(r.left),y=Math.floor(H-r.bottom);
  const w=Math.ceil(r.width),h=Math.ceil(r.height);
  const lx=Math.max(0,x),by=Math.max(0,y),rx=Math.min(W,x+w),ty=Math.min(H,y+h);
  if(w<1||h<1||rx<=lx||ty<=by)continue;
  slot.cam.aspect=w/h;slot.cam.updateProjectionMatrix();
  renderer.setViewport(x,y,w,h);
  renderer.setScissor(lx,by,rx-lx,ty-by);
  renderer.render(slot.scene,slot.cam);
 }
}
refresh();requestAnimationFrame(frame);
const results=await Promise.all(slots.map(load));
const passed=results.filter(Boolean).length;
display.textContent=passed===4?'Quatre models carregats. Gira qualsevol vista per comparar la mateixa orientació en cada parella.':
 'S’han carregat '+passed+' de 4 models. Revisa els missatges de cada panell; no es mostra cap substitut ocult.';
