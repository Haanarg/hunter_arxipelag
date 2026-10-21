#!/usr/bin/env node
'use strict';
// Portes, murs laterals i llindes: una única obertura destructible.
// Regressió: un tanc no pot quedar bloquejat per un collider residual.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const core=fs.readFileSync(path.resolve(__dirname,'../src/game-core.js'),'utf8');
assert.match(core,/if\(!w\.barbed&&!obbOverlap\(footprint,/,
  'Cal contacte real amb la caixa del vehicle, no només el radi de cerca');
(async()=>{
 const game=await require('./harness.cjs')();
 const result=game.run(`(()=>{
   seed=67;R=mul(seed);islands=[];seedSearchMode=false;
   world=new THREE.Group();scene.add(world);
   B=[];Wl=[];Dr=[];stairs=[];
   const errors=[];
   const check=(condition,message)=>{if(!condition)errors.push(message)};
   for(let side=0;side<4;side++){
     const b=mkB(side*80,0,20,20,8,0xa9bdb0,0x79584e,
       {doorSide:side,noPartitions:true});
     const door=b.door,group=door?.doorAssembly||[],lintel=group.find(w=>w.playerBlock===false);
     check(group.length===4,'conjunt amb quatre peces, costat '+side);
     check(!!lintel,'falta llinda, costat '+side);
     check(group.every(w=>w.owner===b),'col·lisions sense propietari, costat '+side);
     check(group.every(w=>Wl.includes(w)),'col·lisions incompletes, costat '+side);
     check(door.rammable,'el tanc no pot enderrocar la porta, costat '+side);
     check(vehicleCanBreakBarrier({t:'tanc',v:1},false),
       'el tanc ha de travessar una porta a poca velocitat');
     const box={x:door.cx,z:door.cz,hd:0,w:2,d:2};
     check(obbOverlap(box,{x:door.cx,z:door.cz,hd:0,
       w:Math.max(.05,door.x1-door.x0),d:Math.max(.05,door.z1-door.z0)}),
       'no es detecta el contacte físic de la porta');
     const target=group[[0,2,3,1][side]];
     if(side===1){door.open=true;door.m.visible=false}
     dmgW(target,target.hp);
     check(group.every(w=>w.hp===0&&w.destroyedWall&&w.open),
       'queda un component viu després de destruir-ne un, costat '+side);
     check(group.every(w=>!Wl.includes(w)),
       'queda un collider després de la destrucció, costat '+side);
     check(group.every(w=>!w.m.visible),
       'queda una peça visible, inclosa la llinda, costat '+side);
     check(!Dr.includes(door)&&b.door===null,
       'la porta destruïda encara funciona, costat '+side);
     dmgW(target,10);
     check(group.every(w=>!Wl.includes(w)),
       'un segon impacte ha recuperat col·lisions, costat '+side);
   }
   const two=mkB(350,0,20,20,16,0xa9bdb0,0x79584e,
     {doorSide:0,noPartitions:true,floors:2});
   const lintel=two.door.doorAssembly.find(w=>w.playerBlock===false);
   check(Math.abs(lintel.y1-(two.fy+8))<.01,
     'la llinda d’un edifici de dos pisos bloqueja el pis superior');
   return {errors};
 })()`);
 assert.deepEqual(result.errors,[],result.errors.join('; '));
 console.log('OK portes: brancals i llinda junts, tanc, quatre orientacions i edifici de dos pisos');
})().catch(e=>{console.error(e);process.exitCode=1});
