#!/usr/bin/env node
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/shark-ai.js'),'utf8'),ctx);
const sharks=ctx.window.HUNTER_SHARKS,deep=()=>-12;
const create=()=>({k:'s',x:0,z:0,cx:0,cz:0,r:18,a:0,sp:.3,sharkMode:'patrol',biteCd:0});
const f=create(),far={x:200,z:0},near={x:65,z:0};
sharks.update(f,.016,far,deep);
assert.equal(f.sharkMode,'patrol','Un nedador fora del radi no és perseguit');
const initial=Math.hypot(near.x-f.x,near.z-f.z);
let bites=0,minimum=Infinity,maximum=0;
for(let i=0;i<630;i++){
  const a=sharks.update(f,1/60,near,deep);
  if(a.bite)bites++;
  const dist=Math.hypot(f.x-near.x,f.z-near.z);
  minimum=Math.min(minimum,dist);maximum=Math.max(maximum,dist);
}
assert.ok(initial>sharks.BITE_RADIUS&&f.sharkMode!=='patrol',
  'Quan s’acosta un nedador, el tauró surt de l’òrbita');
assert.ok(bites>=2&&bites<=6,'Ataca amb passades separades, no cada fotograma: '+bites);
assert.ok(maximum>minimum+7,'Després de mossegar s’allunya abans de tornar');
assert.ok(sharks.BITE_DAMAGE>=10&&sharks.BITE_DAMAGE<=18,'Mossegada puntual perceptible');
const lastX=f.x,lastZ=f.z;
sharks.update(f,.016,null,deep);
assert.equal(f.sharkMode,'patrol','Sense objectiu torna a patrullar');
assert.ok(Math.hypot(f.x-lastX,f.z-lastZ)<1,'No teletransporta el tauró en perdre la presa');
const coast=create(),shore=(x,z)=>x>14?0:-12;
for(let i=0;i<200;i++)sharks.update(coast,1/60,{x:14,z:0},shore);
assert.ok(coast.x<=14&&shore(coast.x,coast.z)<-.8,
  'El tauró no surt de l’aigua per perseguir');
for(const radius of [2.3,3.25,8.6,19]){
  const hit=create();hit.x=2;hit.z=0;
  assert.equal(sharks.vehicleHit(hit,-18,0,18,0,radius),true,
    'Una embarcació ha d’impactar el tauró tot travessant-lo');
  assert.equal(sharks.vehicleHit(hit,-18,40,18,40,radius),false,
    'No hi ha col·lisió fora de la trajectòria');
}
const dead=create();
assert.equal(sharks.kill(dead),true,'El tauró es pot matar');
assert.equal(sharks.kill(dead),false,'Una mort no es registra dues vegades');
assert.equal(sharks.vehicleHit(dead,-10,0,10,0,3),false,'El cadàver no té col·lisió');
assert.equal(sharks.update(dead,.5,near,deep).remove,false);
assert.equal(sharks.update(dead,.5,near,deep).remove,true,'L’aleta s’enfonsa');
(async()=>{
 const g=await require('./harness.cjs')();
 const live=g.run(`(()=>{
   seedSearchMode=false;world=new THREE.Group();scene.add(world);
   hAt=()=>-12;fa=[];
   const shark={k:'s',x:0,z:0,cx:0,cz:0,r:15,a:0,sp:.3,
     o:window.HUNTER_FAUNA.createShark(THREE,{material:M}),sharkMode:'patrol'};
   fa.push(shark);world.add(shark.o);
   const boat={t:'barca_rems',x:0,z:0,hd:0,v:12,
     o:mkV('barca_rems'),bump:0,envCd:0,ramCd:0};
   boat.o.position.set(0,wy(0,0,elapsed)+.2,0);
   handleVehicleImpacts(boat,.016,-6,0);
   const killed=shark.dead&&shark.sharkMode==='dead';
   const survivedInArray=fa.includes(shark);
   for(let j=0;j<8;j++)updExtra(.16,elapsed+j*.16);
   return {killed,survivedInArray,
     removed:!fa.includes(shark),removedVisual:!world.children.includes(shark.o)};
 })()`);
 assert.ok(live.killed,'Una barca en moviment mata el tauró');
 assert.ok(live.survivedInArray,'L’aleta s’enfonsa abans de retirar el model');
 assert.ok(live.removed&&live.removedVisual,'Desapareix sense deixar col·liders');
 console.log('OK taurons: detecció, persecució, passades, mossegades, costa i atropellament');
})().catch(e=>{console.error(e);process.exitCode=1});
