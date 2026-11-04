#!/usr/bin/env node
// Regressió: sortir de cotxes (Humvee i turismes) o camió en marxa
// no pot situar el jugador davant ni dins de la caixa del vehicle.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=fs.readFileSync(path.join(__dirname,'../src/game-core.js'),'utf8');
const start=core.indexOf('function truckExitCandidate(');
const end=core.indexOf('// A deep-water wreck',start);
assert.ok(start>=0&&end>start,'Falta el càlcul de sortida lateral dels vehicles');
const boxes={
  camio:{w:3.6*1.8125,d:7.8*1.8125},
  cotxe:{w:4.1*1.3,d:6.45*1.3},
  cotxe_civil:{w:3.2*1.2,d:5.85*1.2}
};
const ctx={vehicleBox:v=>boxes[v.t],Math};
vm.createContext(ctx);
vm.runInContext(core.slice(start,end)+'\nthis.exit=truckExitCandidate;',ctx);
for(const [t,box] of Object.entries(boxes)){
 for(const hd of [0,Math.PI/2,Math.PI,Math.PI*1.7]){
  for(const v of [-29,29]){
   for(const side of [-1,1]){
    for(let index=0;index<16;index++){
     const vehicle={t,x:100,z:-75,hd,v},p=ctx.exit(vehicle,side,index),
       dx=p.x-vehicle.x,dz=p.z-vehicle.z,
       along=dx*-Math.sin(hd)+dz*-Math.cos(hd),
       lateral=dx*Math.cos(hd)-dz*Math.sin(hd);
     assert.ok(along*Math.sign(v)<0,t+': sortida sempre darrere del moviment');
     assert.ok(Math.abs(lateral)>box.w/2+1.5,t+': sortida fora de la carrosseria');
    }
   }
  }
 }
}
assert.ok(core.includes("safeMovingRoadExit=moving&&['camio','cotxe','cotxe_civil'].includes(leaving.t)"),
  'La lògica segura inclou el Humvee, els turismes i els camions');
assert.ok(core.includes('safeMovingRoadExit?truckExitCandidate(leaving,side,i)'),
  'La sortida en marxa fa servir els punts segurs');
assert.ok(core.includes('outward=safeMovingRoadExit?8:1.4'),
  'L’impuls lateral fort allunya el jugador de les rodes');
assert.ok(core.includes('speed*(safeMovingRoadExit?.3:.72)'),
  'La inèrcia del jugador queda per sota de la velocitat del vehicle');
console.log('OK sortida segura: camió, Humvee i turisme en els dos sentits i tots els rumbs');
