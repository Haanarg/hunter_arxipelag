import * as T from '../vendor/three-r186.module.mjs';
import {compoundLayouts} from './compound-layouts.mjs';
import {createCompoundConcept} from './compound-concepts.mjs';
const canvas=document.getElementById('scene'),container=canvas.parentElement;
const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
renderer.shadowMap.enabled=!matchMedia('(pointer:coarse)').matches;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color(0x9cbdbb);scene.add(new T.HemisphereLight(0xf3fff5,0x435544,2));
const sun=new T.DirectionalLight(0xffecc7,3.2);sun.position.set(-70,110,55);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:350});sun.shadow.normalBias=.08;scene.add(sun);
const camera=new T.PerspectiveCamera(38,1,.2,1500);let current,index=0,yaw=.62,pitch=.8,distance=215,auto=false,labels=true;
const target=new T.Vector3(0,0,0),pointers=new Map();let lastPinch=0,dirty=true;
const buttons={};
for(const [i,l] of compoundLayouts.entries()){const b=document.createElement('button');b.textContent=(i+1)+' · '+l.name;b.addEventListener('click',()=>select(i));document.getElementById('tabs').append(b);buttons[l.id]=b}
function dispose(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}
function select(i){if(current){scene.remove(current.root);dispose(current.root)}index=i;current=createCompoundConcept(compoundLayouts[i]);scene.add(current.root);document.getElementById('name').textContent=current.layout.name;document.getElementById('counts').textContent=current.layout.counts;document.getElementById('notes').textContent=current.layout.notes;for(const [id,b]of Object.entries(buttons))b.setAttribute('aria-pressed',id===current.layout.id);document.getElementById('labels').replaceChildren();for(const tag of current.tags){const el=document.createElement('span');el.className='tag';el.textContent=tag.text;document.getElementById('labels').append(el);tag.el=el}current.overlays.visible=document.getElementById('routes').getAttribute('aria-pressed')==='true';current.roofs.forEach(r=>r.visible=document.getElementById('roof').getAttribute('aria-pressed')!=='true');yaw=.62;pitch=.8;fit();dirty=true;window.compoundPreview.current=current}
function fit(){
 distance=160;if(!current)return;
 const bounds=new T.Box3().setFromObject(current.root),corners=[];
 for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z])corners.push(new T.Vector3(x,y,z));
 for(let i=0;i<60;i++){
  camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);camera.updateMatrixWorld();
  if(corners.every(c=>{const p=c.clone().project(camera);return Math.abs(p.x)<.90&&p.y<.76&&p.y>-.89}))break;
  distance*=1.035;
 }
}
function toggle(id,fn){const b=document.getElementById(id);b.onclick=()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);fn(on);dirty=true}}
toggle('routes',on=>{current.overlays.visible=on;document.getElementById('legend').hidden=!on});toggle('roof',on=>current.roofs.forEach(r=>r.visible=!on));toggle('labelsToggle',on=>labels=on);toggle('rotate',on=>auto=on);
document.getElementById('iso').onclick=()=>{yaw=.62;pitch=.8;fit();dirty=true};document.getElementById('top').onclick=()=>{pitch=Math.PI/2-.001;yaw=0;fit();dirty=true};
function zoom(f){distance=Math.max(65,Math.min(440,distance*f));dirty=true}document.getElementById('zoomIn').onclick=()=>zoom(.85);document.getElementById('zoomOut').onclick=()=>zoom(1.18);
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);lastPinch=0});
canvas.addEventListener('pointermove',e=>{const prev=pointers.get(e.pointerId);if(!prev)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(lastPinch>0)zoom(lastPinch/d);lastPinch=d}else{yaw-=dx*.007;pitch=Math.max(.17,Math.min(Math.PI/2-.001,pitch+dy*.006));dirty=true}});
for(const event of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);lastPinch=0});canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001))},{passive:false});
new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fit();dirty=true}).observe(container);
function render(){camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);camera.updateMatrixWorld();for(const tag of current.tags){const p=tag.position.clone().project(camera);tag.el.hidden=!labels||Math.abs(p.x)>.97||Math.abs(p.y)>.95||p.z>1;tag.el.style.left=(p.x*.5+.5)*container.clientWidth+'px';tag.el.style.top=(-p.y*.5+.5)*container.clientHeight+'px'}renderer.render(scene,camera);dirty=false}
window.compoundPreview={scene,camera,renderer,select,render,get index(){return index},layouts:compoundLayouts};
select(0);let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;if(auto){yaw+=dt*.2;dirty=true}if(dirty)render()});
