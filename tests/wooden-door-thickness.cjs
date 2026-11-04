#!/usr/bin/env node
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const core=read('src/game-core.js'),shell=read('src/building-shell.mjs'),visual=read('src/buildings.js');
assert.match(core,/thinWoodDoor:!opt\.bunker&&!opt\.hangar&&!opt\.workshop/);
assert.match(core,/lintel=\{x0:x\+lx-sx\/2/);
assert.match(shell,/export const WOODEN_DOOR_THICKNESS=\.16/);
assert.match(visual,/door\.add\(handle\)/);
(async()=>{
 const game=await require('./harness.cjs')();game.start('67');game.frame();
 const check=game.run(`(()=>{
   const result=[];
   for(const side of [0,1,2,3]){
     const b=mkB(P.x+80+side*24,P.z+80,18,18,8,0xaabbaa,0x556644,{doorSide:side,noPartitions:true});
     const d=b.door,box=d.m.geometry.parameters,thin=side<2?box.depth:box.width,
       physical=side<2?d.z1-d.z0:d.x1-d.x0,other=side<2?d.x1-d.x0:d.z1-d.z0,
       group=d.doorAssembly,lintel=group.find(w=>w.playerBlock===false);
     result.push({side,thin,physical,other,center:Math.abs(d.m.position.x-(d.cx-b.x))<1e-6&&Math.abs(d.m.position.z-(d.cz-b.z))<1e-6,
       handles:d.m.children.filter(m=>m.name==='hunter-door-handle').length,
       lintelFull:!!lintel&&(side<2?lintel.z1-lintel.z0:lintel.x1-lintel.x0)>.7});
   }
   const bunker=mkB(P.x+190,P.z+120,40,34,10,0xbababa,0x787878,
     {kind:'enemy_bunker',bunker:true,doorSide:0,doorWidth:4,doorHeight:4.4,lockedDoor:true});
   return {doors:result,bunker:{thickness:bunker.door.m.geometry.parameters.depth,
     physical:bunker.door.z1-bunker.door.z0,handles:bunker.door.m.children.length}};
 })()`);
 for(const d of check.doors){
   assert.ok(Math.abs(d.thin-.16)<1e-6&&Math.abs(d.physical-.16)<1e-6,JSON.stringify(d));
   assert.equal(d.handles,2);assert.equal(d.center,true);assert.equal(d.lintelFull,true);
   assert.ok(d.other>2);
 }
 assert.ok(Math.abs(check.bunker.thickness-.8)<1e-6,JSON.stringify(check.bunker));
 assert.ok(Math.abs(check.bunker.physical-.8)<1e-6);
 assert.equal(check.bunker.handles,0);
 console.log('OK portes primes centrades, dues manetes i búnquer intacte');
})().catch(e=>{console.error(e);process.exitCode=1});
