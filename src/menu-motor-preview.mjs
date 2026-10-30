// Prova aïllada: reutilitza la geometria, el cel, el mar i les palmeres del joc.
import * as THREE from '../vendor/three-r186.module.mjs';
import {generateTerrainFoundation} from './world-generation-core.mjs';
import {prepareMenuBase,drawMenuBase} from './menu-base-scene.mjs';

const scenes=Object.freeze([
  {id:'1',seed:94,yaw:45,name:'Equilibrat'},
  {id:'2',seed:148,yaw:135,name:'Més mar',southShift:90},
  {id:'3',seed:230,yaw:45,name:'Més palmeres'},
  {id:'4',seed:175,yaw:225,name:'Panoràmica d’illes'}
]);
const selectedId=new URLSearchParams(location.search).get('scene');
const selectedScene=scenes.find(v=>v.id===selectedId)||scenes[1];
const scenePicker=document.getElementById('scenePicker');
scenePicker.value=selectedScene.id;
scenePicker.addEventListener('change',()=>{
  const url=new URL(location.href);
  url.searchParams.set('scene',scenePicker.value);
  location.assign(url.toString());
});
const stage=document.getElementById('vista');
const status=document.getElementById('status');
const toggle=document.getElementById('toggleAnimation');
const prefersReducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let active=!prefersReducedMotion,rendering=null,water=null,terrain=null,vegetation=null,baseScene=null,raf=0;
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
  if(!active){cancelAnimationFrame(raf);raf=0;setStatus(selectedScene.name+' · llavor '+selectedScene.seed+' · mar aturat.');}
  else{lastFrame=0;startLoop();setStatus(selectedScene.name+' · llavor '+selectedScene.seed+' · mar animat a 30 FPS.');}
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
      'rendering.js','waves.js','water.js','terrain.js','vegetation.js','buildings.js']){
      await loadClassic('./src/'+path);
    }
    if(!window.WebGLRenderingContext)throw new Error('WebGL no disponible');
    const seed=selectedScene.seed,mapScale=1,size=4800,halfSize=size/2;
    // Mateix emplaçament inicial que tria el generador del joc,
    // no el centre geogràfic de l'illa ni un punt aleatori de la costa.
    const foundation=generateTerrainFoundation({seed,mapScale});
    const base=prepareMenuBase(foundation);
    const heightAt=base.heightAt;
    const homeIsland=foundation.islands[0];
    const targetX=foundation.baseCandidate.x,targetZ=foundation.baseCandidate.z;
    const targetY=base.plan.height+4;
    // La llavor 148 trasllada la càmera cap al sud (+Z).
    // Enquadram també una mica al sud-oest per fer pujar la base a la
    // pantalla sense descentrar-la horitzontalment en mòbils estrets.
    const southShift=selectedScene.southShift||0;
    const cameraTarget=new THREE.Vector3(
      targetX-southShift*.73,targetY,targetZ+southShift);
    const cameraYaw=selectedScene.yaw*Math.PI/180;
    let cameraX,cameraZ,cameraBaseY;
    const chooseMenuCamera=()=>{
      const portrait=innerWidth<innerHeight;
      const distance=portrait?375:520;
      const elevation=portrait?235:300;
      cameraX=targetX+Math.cos(cameraYaw)*distance;
      cameraZ=targetZ+Math.sin(cameraYaw)*distance+southShift;
      cameraBaseY=Math.max(targetY+elevation,
        heightAt(cameraX,cameraZ)+elevation*.85);
    };
    chooseMenuCamera();
    const visual={...window.HUNTER_VISUAL_CONFIG.mobile,
      pixelRatio:Math.min(1,window.devicePixelRatio||1),
      shadows:false,exposure:1.10,viewDistance:9500};
    rendering=window.HUNTER_RENDERING.create(THREE,visual);
    const {scene,camera,renderer}=rendering;
    // Color de reserva equivalent al zenit, per evitar taques fosques
    // si algun píxel no arriba a quedar cobert per la cúpula del cel.
    scene.background=new THREE.Color(0x5147b8);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1));
    renderer.setSize(innerWidth,innerHeight);
    renderer.domElement.setAttribute('aria-hidden','true');
    stage.append(renderer.domElement);
    camera.position.set(cameraX,cameraBaseY,cameraZ);
    camera.lookAt(cameraTarget);
    // La cúpula i el sol són els mateixos de src/rendering.js.
    rendering.sunMesh.position.copy(camera.position).addScaledVector(rendering.sunDir,1800);
    rendering.glow.position.copy(rendering.sunMesh.position);
    const terrainMaterial=new THREE.MeshStandardMaterial({
      vertexColors:true,roughness:.96,metalness:0,side:THREE.FrontSide
    });
    terrain=window.HUNTER_TERRAIN.create(THREE,{
      size,segments:64,heightAt,material:terrainMaterial,
      startX:targetX,startZ:targetZ,quality:'mobile',shadows:false,parent:scene
    });
    water=window.HUNTER_WATER_SYSTEM.create(THREE,{
      scene,sunDir:rendering.sunDir,size,segments:160,initialSegments:160,
      heightAt,config:window.HUNTER_WATER,reflections:true,coastDetail:false
    });
    water.updateSeabed();
    // Edificis i vehicles de la base inicial: geometries originals sense IA.
    baseScene=await drawMenuBase(THREE,scene,base);

    // Model de palmeres instanciades original, amb la mateixa variació per exemplar.
    // Mostres lleugeres en els vessants d'una illa real del generador de llavors.
    const palms=[],bushes=[],rocks=[];
    // Franges més poblades al voltant de la base i del litoral,
    // amb malles instanciades del mateix joc i sense modificar les partides.
    let randomState=(foundation.seed^92638)>>>0;
    const rnd=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296};
    const random=(a,b)=>a+rnd()*(b-a);
    for(let i=0;i<500;i++){
      const nearby=i<350,a=rnd()*Math.PI*2;
      const r=nearby?105+rnd()*360:homeIsland.r*(.32+rnd()*.58);
      const originX=nearby?targetX:homeIsland.x;
      const originZ=nearby?targetZ:homeIsland.z;
      const x=originX+Math.cos(a)*r,z=originZ+Math.sin(a)*r;
      const y=heightAt(x,z);
      if(y<2||y>38||(
        Math.abs(x-targetX)<base.plan.level.hw+25&&
        Math.abs(z-targetZ)<base.plan.level.hd+25))continue;
      palms.push([x,y-.3,z,1.1+rnd()*1.7,rnd()*Math.PI*2,
        Math.floor(rnd()*3)-1,(rnd()-.5)*.2]);
    }
    const plantFactory=window.HUNTER_VEGETATION.create(THREE,{
      materialProfile:p=>window.HUNTER_MATERIALS[p]||window.HUNTER_MATERIALS.organic,
      random
    });
    const plants=plantFactory.build({world:scene,palms,bushes,rocks,
      playerX:targetX,playerZ:targetZ,lowQuality:true,lodProfile:'mobile'});
    vegetation=plants.palms;
    terrain.update(targetX,targetZ,3,camera);
    const resize=()=>{
      // Reenquadra també en girar el telèfon, sense descentrar la base.
      chooseMenuCamera();
      camera.position.set(cameraX,cameraBaseY,cameraZ);
      camera.lookAt(cameraTarget);
      rendering.sunMesh.position.copy(camera.position).addScaledVector(rendering.sunDir,1800);
      rendering.glow.position.copy(rendering.sunMesh.position);
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
    setStatus(selectedScene.name+' · llavor '+seed+' · '+(active?'mar animat a 30 FPS.':'mar aturat.'));
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
      // Oscil·lació molt subtil, sense deriva acumulativa ni perdre el focus.
      c.position.set(cameraX+Math.sin(t*.06)*4,
        cameraBaseY+Math.sin(t*.19)*1.1,cameraZ+Math.cos(t*.06)*4);
      c.lookAt(cameraTarget);
      terrain.update(targetX,targetZ,1,c);
      vegetation?.update(targetX,targetZ);
      rendering.renderer.render(rendering.scene,c);
    }
    raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);
}
init();
