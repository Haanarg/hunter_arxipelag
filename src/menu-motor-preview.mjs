// Prova aïllada: reutilitza la geometria, el cel, el mar i les palmeres del joc.
import * as THREE from '../vendor/three-r186.module.mjs';
import {createIslandLayout} from './world-generation-core.mjs';
import {rawTerrainAt} from './world-physics.mjs';

const stage=document.getElementById('vista');
const status=document.getElementById('status');
const toggle=document.getElementById('toggleAnimation');
const prefersReducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let active=!prefersReducedMotion,rendering=null,water=null,terrain=null,vegetation=null,raf=0;
let lastFrame=0,startTime=0,visible=!document.hidden;
toggle.setAttribute('aria-pressed',String(active));
toggle.textContent=active?'Mar animat':'Mar aturat';

document.getElementById('newGame').addEventListener('click',()=>{
  document.getElementById('home').hidden=true;
  document.getElementById('setup').hidden=false;
});
document.getElementById('back').addEventListener('click',()=>{
  document.getElementById('setup').hidden=true;
  document.getElementById('home').hidden=false;
});
document.getElementById('seed').addEventListener('input',e=>{
  e.currentTarget.value=e.currentTarget.value.replace(/[^0-9]/g,'').slice(0,10);
});
const loadClassic=(path)=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=path;script.onload=resolve;
  script.onerror=()=>reject(new Error('No s\'ha pogut carregar '+path));
  document.head.append(script);
});
function paused(){return !active||!visible;}
function setStatus(message,error=false){status.textContent=message;status.classList.toggle('error',error);}
toggle.addEventListener('click',()=>{
  active=!active;toggle.setAttribute('aria-pressed',String(active));
  toggle.textContent=active?'Mar animat':'Mar aturat';
  if(!active){cancelAnimationFrame(raf);raf=0;setStatus('Aigua congelada · prova amb el motor del joc.');}
  else{lastFrame=0;startLoop();setStatus('Paisatge del motor · mar animat a 30 FPS.');}
});
document.addEventListener('visibilitychange',()=>{
  visible=!document.hidden;
  if(!visible){cancelAnimationFrame(raf);raf=0;}
  else{lastFrame=0;startLoop();}
});
window.addEventListener('pagehide',()=>{
  cancelAnimationFrame(raf);raf=0;
  water?.dispose();terrain?.dispose();
  rendering?.renderer?.dispose();
},{once:true});

async function init(){
  try{
    // Només els mateixos sistemes visuals que consumeix el runtime original;
    // no es crea cap partida, IA, vehicle, inventari ni servei en xarxa.
    for(const path of ['visual-config.js','materials-config.js','water-config.js',
      'rendering.js','waves.js','water.js','terrain.js','vegetation.js']){
      await loadClassic('./src/'+path);
    }
    if(!window.WebGLRenderingContext)throw new Error('WebGL no disponible');
    const seed=67,mapScale=1,size=4800,halfSize=size/2;
    const layout=createIslandLayout(seed,mapScale);
    const heightAt=(x,z)=>rawTerrainAt(x,z,layout.islands,seed,halfSize);
    const focus=layout.base;
    // Situa la càmera davant de la costa real, no sobre una imatge pre-renderitzada.
    const choices=Array.from({length:24},(_,i)=>{
      const a=i*Math.PI*2/24,r=focus.r*.98;
      const x=focus.x+Math.cos(a)*r,z=focus.z+Math.sin(a)*r;
      const h=heightAt(x,z);
      return {x,z,a,score:h+Math.max(0,heightAt(x+Math.cos(a)*75,z+Math.sin(a)*75))*.15+
        (Math.max(Math.abs(x),Math.abs(z))>halfSize-80?150:0)};
    });
    choices.sort((a,b)=>a.score-b.score);
    const coast=choices[0];
    const cameraX=coast.x,cameraZ=coast.z;
    const visual={...window.HUNTER_VISUAL_CONFIG.mobile,
      pixelRatio:Math.min(1,window.devicePixelRatio||1),
      shadows:false,exposure:1.06,viewDistance:9500};
    rendering=window.HUNTER_RENDERING.create(THREE,visual);
    const {scene,camera,renderer}=rendering;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1));
    renderer.setSize(innerWidth,innerHeight);
    renderer.domElement.setAttribute('aria-hidden','true');
    stage.append(renderer.domElement);
    camera.position.set(cameraX,Math.max(26,heightAt(cameraX,cameraZ)+18),cameraZ);
    const lookAt=new THREE.Vector3(focus.peakX,27,focus.peakZ);
    camera.lookAt(lookAt);
    // La cúpula i el sol són els mateixos de src/rendering.js.
    rendering.sunMesh.position.copy(camera.position).addScaledVector(rendering.sunDir,1800);
    rendering.glow.position.copy(rendering.sunMesh.position);
    const terrainMaterial=new THREE.MeshStandardMaterial({
      vertexColors:true,roughness:.96,metalness:0,side:THREE.FrontSide
    });
    terrain=window.HUNTER_TERRAIN.create(THREE,{
      size,segments:64,heightAt,material:terrainMaterial,
      startX:cameraX,startZ:cameraZ,quality:'mobile',shadows:false,parent:scene
    });
    water=window.HUNTER_WATER_SYSTEM.create(THREE,{
      scene,sunDir:rendering.sunDir,size,segments:160,initialSegments:160,
      heightAt,config:window.HUNTER_WATER,reflections:true,coastDetail:false
    });
    water.updateSeabed();

    // Model de palmeres instanciades original, amb la mateixa variació per exemplar.
    // Mostres lleugeres en els vessants d'una illa real del generador de llavors.
    const palms=[],bushes=[],rocks=[];
    let randomState=92638;
    const rnd=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296};
    const random=(a,b)=>a+rnd()*(b-a);
    for(let i=0;i<185;i++){
      const a=rnd()*Math.PI*2,r=focus.r*(.38+rnd()*.43);
      const x=focus.x+Math.cos(a)*r,z=focus.z+Math.sin(a)*r,y=heightAt(x,z);
      if(y<3||y>24)continue;
      palms.push([x,y,z,1.1+rnd()*1.9,rnd()*Math.PI*2,Math.floor(rnd()*3)-1,(rnd()-.5)*.2]);
    }
    const plantFactory=window.HUNTER_VEGETATION.create(THREE,{
      materialProfile:p=>window.HUNTER_MATERIALS[p]||window.HUNTER_MATERIALS.organic,
      random
    });
    const plants=plantFactory.build({world:scene,palms,bushes,rocks,
      playerX:cameraX,playerZ:cameraZ,lowQuality:true,lodProfile:'mobile'});
    vegetation=plants.palms;
    terrain.update(cameraX,cameraZ,3,camera);
    const resize=()=>{
      renderer.setSize(innerWidth,innerHeight);
      camera.aspect=Math.max(.15,innerWidth/Math.max(1,innerHeight));
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize',resize,{passive:true});
    resize();
    startTime=performance.now();
    water.update(0);
    renderer.render(scene,camera);
    stage.classList.add('ready');
    setStatus(active?'Motor del joc · mar animat a 30 FPS.':'Motor del joc · fons estàtic.');
    startLoop();
  }catch(error){
    console.error('Prova del fons 3D',error);
    setStatus('No s’ha pogut activar el motor 3D. Es manté el fons estàtic.',true);
    toggle.disabled=true;
    water?.dispose();terrain?.dispose();rendering?.renderer?.dispose();
  }
}
function startLoop(){
  if(raf||!rendering||paused())return;
  const frame=now=>{
    raf=0;
    if(paused()||!rendering)return;
    // 30 FPS màxim; seguim el fotograma del navegador en lloc d'un timer.
    if(now-lastFrame>=1000/30){
      lastFrame=now;
      const t=(now-startTime)/1000;
      water.update(t);
      const c=rendering.camera;
      c.position.y+=Math.sin(t*.19)*.009;
      terrain.update(c.position.x,c.position.z,1,c);
      vegetation?.update(c.position.x,c.position.z);
      rendering.renderer.render(rendering.scene,c);
    }
    raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);
}
init();
