import * as T from '../vendor/three-r186.module.mjs';
import {compoundLayouts as integratedLayouts} from './compound-layouts.mjs';
import {phase2Layouts} from './compound-phase2-layouts.mjs';
import {phase3Layouts} from './compound-phase3-layouts.mjs';
import {phase4Layouts,newWorldLayouts,compoundVariants,coastConnection} from './compound-phase4-layouts.mjs';
const params=new URLSearchParams(location.search),requested=Number(params.get('fase')),phase=[2,3,4].includes(requested)?requested:1;
let compoundLayouts=phase===4?newWorldLayouts:phase===3?phase3Layouts:phase===2?phase2Layouts:integratedLayouts.filter(l=>!l.phase);
document.querySelector('.badge').textContent='Fase '+phase+(phase===4?' · dissenys per revisar':' · integrats al joc');
for(const n of[1,2,3,4])document.getElementById('phase'+n).setAttribute('aria-current',phase===n?'page':'false');
import {createCompoundConcept} from './compound-concepts.mjs';
const canvas=document.getElementById('scene'),container=canvas.parentElement;
const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
renderer.shadowMap.enabled=!matchMedia('(pointer:coarse)').matches;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color(0x9cbdbb);scene.add(new T.HemisphereLight(0xf3fff5,0x435544,2));
const sun=new T.DirectionalLight(0xffecc7,3.2);sun.position.set(-70,110,55);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:350});sun.shadow.normalBias=.08;scene.add(sun);
const camera=new T.PerspectiveCamera(38,1,.2,1500);let current,index=0,yaw=.62,pitch=.8,distance=215,auto=false,labels=true;
const target=new T.Vector3(0,0,0),pointers=new Map();let lastPinch=0,dirty=true;
let buttons={};
function tabs(){
 buttons={};document.getElementById('tabs').replaceChildren();
 for(const [i,l] of compoundLayouts.entries()){const b=document.createElement('button');b.textContent=phase===4?(l.variant?'V'+l.variant+' · '+l.name.split(' · ').slice(1).join(' · '):l.status==='design'?l.name:'V1 · Actual integrada'):(i+1)+' · '+l.name;b.addEventListener('click',()=>select(i));document.getElementById('tabs').append(b);buttons[l.id]=b}
}
const family=document.getElementById('designFamily');
if(phase===4){
 document.getElementById('designFilters').hidden=false;
 for(const [value,label] of [['new','Llocs nous'],...integratedLayouts.map(l=>[l.id,l.name+' · variants']),['coast','Connexió base–costa']]){const o=document.createElement('option');o.value=value;o.textContent=label;family.append(o)}
 family.value=[...family.options].some(o=>o.value===params.get('tipus'))?params.get('tipus'):'new';
 function chooseFamily(){compoundLayouts=family.value==='new'?newWorldLayouts:family.value==='coast'?[coastConnection]:[integratedLayouts.find(l=>l.id===family.value),...compoundVariants.filter(l=>l.type===family.value)];tabs()}
 chooseFamily();family.onchange=()=>{chooseFamily();select(0)};
}else tabs();
function dispose(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}
function select(i){if(current){scene.remove(current.root);dispose(current.root)}index=i;current=createCompoundConcept(compoundLayouts[i]);scene.add(current.root);document.getElementById('name').textContent=current.layout.name;document.getElementById('counts').textContent=(phase===4?(current.layout.status==='design'?'Disseny · ':'Integrada · '):'')+current.layout.counts;document.getElementById('notes').textContent=current.layout.notes;for(const [id,b]of Object.entries(buttons))b.setAttribute('aria-pressed',id===current.layout.id);document.getElementById('labels').replaceChildren();for(const tag of current.tags){const el=document.createElement('span');el.className='tag';el.textContent=tag.text;document.getElementById('labels').append(el);tag.el=el}current.overlays.visible=document.getElementById('routes').getAttribute('aria-pressed')==='true';current.roofs.forEach(r=>r.visible=document.getElementById('roof').getAttribute('aria-pressed')!=='true');yaw=.62;pitch=.8;fit();dirty=true;window.compoundPreview.current=current;if(phase===4){const url=new URL(location.href);url.searchParams.set('tipus',family.value);url.searchParams.set('model',current.layout.id);history.replaceState(null,'',url)}}
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
function zoom(f){distance=Math.max(65,Math.min(1500,distance*f));dirty=true}document.getElementById('zoomIn').onclick=()=>zoom(.85);document.getElementById('zoomOut').onclick=()=>zoom(1.18);
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);lastPinch=0});
canvas.addEventListener('pointermove',e=>{const prev=pointers.get(e.pointerId);if(!prev)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(lastPinch>0)zoom(lastPinch/d);lastPinch=d}else{yaw-=dx*.007;pitch=Math.max(.17,Math.min(Math.PI/2-.001,pitch+dy*.006));dirty=true}});
for(const event of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);lastPinch=0});canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001))},{passive:false});
new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fit();dirty=true}).observe(container);
function render(){camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);camera.updateMatrixWorld();const labelRects=[];for(const tag of current.tags){const p=tag.position.clone().project(camera);tag.el.hidden=!!(tag.interior&&current.roofs.some(r=>r.visible))||!labels||Math.abs(p.x)>.97||Math.abs(p.y)>.95||p.z>1;tag.el.style.left=(p.x*.5+.5)*container.clientWidth+'px';tag.el.style.top=(-p.y*.5+.5)*container.clientHeight+'px';if(!tag.el.hidden){const r=tag.el.getBoundingClientRect();if(labelRects.some(a=>r.left<a.right+4&&r.right>a.left-4&&r.top<a.bottom+4&&r.bottom>a.top-4))tag.el.hidden=true;else labelRects.push(r)}}renderer.render(scene,camera);dirty=false}
window.compoundPreview={scene,camera,renderer,select,render,get index(){return index},get layouts(){return compoundLayouts},catalog:phase===4?[...phase4Layouts,...integratedLayouts]:compoundLayouts};
select(Math.max(0,compoundLayouts.findIndex(l=>l.id===params.get('model'))));let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;if(auto){yaw+=dt*.2;dirty=true}if(dirty)render()});
