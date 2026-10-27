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
  bunkerSubFloorAt:()=>null,solidRoofAt:()=>null,
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
// Els caps de la T no han de generar rampes: només el peu a terra.
const pierStart=visual.indexOf('const compoundPier=(');
const pierEnd=visual.indexOf('const findPortWater=',pierStart);
assert.ok(pierStart>=0&&pierEnd>pierStart,'No s’ha trobat el generador de molls');
const generator={
  seedSearchMode:true,PIER_DECK_Y:2.4,stairs:[],piers:[],compoundClear:[],
  hAt:(x,z)=>z<0?1:0,Math
};
vm.createContext(generator);
vm.runInContext(visual.slice(pierStart,pierEnd)+'\nthis.pier=compoundPier;',generator);
generator.pier(0,10,0,50,5,true);
assert.equal(generator.stairs.length,1,'El braç longitudinal ha de tenir una rampa');
assert.equal(generator.stairs[0].length,12,'Cal mantenir els 12 m si ja toca terra');
generator.pier(-17,48,17,48,5,false);
generator.pier(0,45.5,0,50.5,34,false);
assert.equal(generator.stairs.length,1,'Ni la travessa ni el cap ample de la T poden crear rampes');
generator.pier(0,45.5,0,50.5,34,true);
assert.equal(generator.stairs.length,1,'La geometria transversal mai ha de generar una rampa ampla');
generator.stairs.length=0;
generator.hAt=(x,z)=>z< -19?.8:0;
generator.pier(0,0,0,40,5,true);
assert.equal(generator.stairs.length,1,'S’ha de trobar la terra encara que sigui a més de 12 m');
assert.ok(generator.stairs[0].length>=20,'La rampa no pot començar submergida');
// Validació tridimensional dels pendents diagonals: sense roll.
(async()=>{
 const THREE=await import(require('node:url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')).href);
 for(const [ux,uz] of [[1,0],[0,1],[Math.SQRT1_2,Math.SQRT1_2],[-Math.SQRT1_2,Math.SQRT1_2]]){
   const world=new THREE.Group(),visualCtx={
     seedSearchMode:false,PIER_DECK_Y:2.4,stairs:[],piers:[],
     compoundClear:[],staticDecorRoots:[],world,THREE,
     M:()=>new THREE.MeshBasicMaterial(),Math,
     hAt:(x,z)=>x*ux+z*uz<-10?.8:0
   };
   vm.createContext(visualCtx);
   vm.runInContext(visual.slice(pierStart,pierEnd)+'\nthis.pier=compoundPier;',visualCtx);
   visualCtx.pier(0,0,ux*34,uz*34,4,true);
   const ramp=visualCtx.stairs[0];
   assert(ramp,'Cal una rampa d’accés per a cada angle');
   const mesh=world.children.find(m=>m.geometry?.type==='BoxGeometry'&&m.geometry.parameters.height===.22);
   assert(mesh,'Cal malla de rampa en el món');
   const lateral=new THREE.Vector3(1,0,0).applyQuaternion(mesh.quaternion);
   assert(Math.abs(lateral.y)<1e-6,'La rampa ha de ser plana lateralment');
   const longitudinal=new THREE.Vector3(0,0,1).applyQuaternion(mesh.quaternion);
   const rise=ramp.top-ramp.bottom;
   assert(Math.abs(longitudinal.y-Math.sin(Math.atan2(rise,ramp.length)))<1e-6,
     'La inclinació de la rampa ha de seguir la diferència d’altura');
 }
 console.log('OK pantalans: rampes alineades, fins i tot en diagonal');
})().catch(e=>{console.error(e);process.exitCode=1});
console.log('OK pantalans: rampa, unió, sortida lliure i sense pujada instantània');
