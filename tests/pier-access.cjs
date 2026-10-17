#!/usr/bin/env node
// Regressió del moll: rampa, cruïlla, sortida cap a l'aigua, entrada des de sota.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const core=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8');
const visual=fs.readFileSync(path.join(root,'src/world-generation.js'),'utf8');
assert.ok(!core.includes('pierSidePush('),'No hi pot haver barrera lateral');
assert.ok(!visual.includes('const rail=wireRod([rampStartX'),'Rampa lliure de baranes');
const start=core.indexOf('function groundAt(x,z,previous=-Infinity){');
const end=core.indexOf('function addRampAccess(',start);
assert.ok(start>=0&&end>start,'No s’ha trobat groundAt');
const ramp={x:0,z:0,nx:0,nz:-1,length:12,width:3.75,top:2.4,bottom:.1,ramp:true,pierAccess:true};
const dock={x:0,z:5,ux:0,uz:1,px:-1,pz:0,length:10.12,width:4,y:2.4};
const cross={x:0,z:10,ux:1,uz:0,px:0,pz:1,length:10,width:4,y:2.4};
const ctx={
  stairs:[ramp],piers:[dock,cross],hAt:()=>0,terrainStream:null,
  stairContains:(s,x,z)=>{
    const along=(x-s.x)*s.nx+(z-s.z)*s.nz,
      side=(x-s.x)*s.nz-(z-s.z)*s.nx;
    return along>=0&&along<=s.length&&Math.abs(side)<=s.width/2;
  },
  stairLocal:(s,x,z)=>({along:(x-s.x)*s.nx+(z-s.z)*s.nz}),
  buildingCandidates:()=>[],upperFloorHeight:()=>null,
  terminalRampHeight:()=>null,pedestrianFerry:()=>null,Math,Number
};
vm.createContext(ctx);
vm.runInContext(core.slice(start,end),ctx);
let y=.1;
for(let z=-12;z<=10;z+=.2){
  y=ctx.groundAt(0,z,y);
  assert.ok(y>=0&&y<=2.401,'La rampa i el moll han de ser transitables: '+z);
}
assert.ok(y>2.39,'Ha de completar la rampa fins a la coberta');
assert.equal(ctx.groundAt(0,10,y),2.4,'Travessar una unió en T és possible');
assert.equal(ctx.groundAt(3.2,5,2.4),0,'Es pot baixar del lateral a l’aigua');
assert.equal(ctx.groundAt(0,5,.1),0,'No pujar directament des de l’aigua');
assert.equal(ctx.groundAt(0,10,.1),0,'No pujar a la unió en T des de l’aigua');
assert.equal(ctx.groundAt(0,5,2.4),2.4,'El moll manté el suport de qui ja hi és');
console.log('OK pantalans: rampa, unió, sortida lliure i sense pujada instantània');
