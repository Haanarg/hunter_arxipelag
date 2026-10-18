#!/usr/bin/env node
// Regressió: sortir d'un camió en marxa no pot projectar el jugador davant.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=fs.readFileSync(path.join(__dirname,'../src/game-core.js'),'utf8');
const start=core.indexOf('function truckExitCandidate('),end=core.indexOf('function toggle()',start);
assert.ok(start>=0&&end>start,'Falta el càlcul de sortida lateral del camió');
const ctx={vehicleBox:()=>({w:3.6*1.8125,d:7.8*1.8125}),Math};
vm.createContext(ctx);
vm.runInContext(core.slice(start,end)+'\nthis.exit=truckExitCandidate;',ctx);
for(const hd of [0,Math.PI/2,Math.PI,Math.PI*1.7]){
  for(const v of [-29,29]){
    for(const side of [-1,1]){
      for(let index=0;index<16;index++){
        const truck={x:100,z:-75,hd,v},p=ctx.exit(truck,side,index),
          dx=p.x-truck.x,dz=p.z-truck.z,
          along=dx*-Math.sin(hd)+dz*-Math.cos(hd),
          lateral=dx*Math.cos(hd)-dz*Math.sin(hd);
        assert.ok(along*Math.sign(v)<0,'La sortida ha de ser darrere el moviment');
        assert.ok(Math.abs(lateral)>3.6*1.8125/2+1.5,'La sortida ha de quedar fora del costat');
      }
    }
  }
}
assert.ok(core.includes('outward=movingTruck?8:1.4'),'L’impuls ha d’allunyar el jugador lateralment');
console.log('OK camió: sortida lateral i posterior, marxa endavant i enrere');
