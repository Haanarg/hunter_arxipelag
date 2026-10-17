#!/usr/bin/env node
// Comprova els pivots independents de la cursa i l'orientació de la pelvis en strafe.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(pathToFileURL(path.join(__dirname,'../vendor/three-r186.module.mjs')).href);
 const palette={player:{},enemy:{
   primary:0x556644,general:0x778855,vest:0x445533,secondary:0x334422,skin:0xe0c0a0,dark:0x101a10,metal:0x444444
 }};
 const ctx={window:{HUNTER_PALETTE:palette,HUNTER_BOLT_CUTTERS:{
   create:()=>new THREE.Group(),pose:()=>{}
 }}};
 vm.createContext(ctx);
 for(const file of ['src/player-model.js','src/characters.js'])
   vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx,{filename:file});
 const box=(g,w,h,d,color,x=0,y=0,z=0)=>{
   const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
     new THREE.MeshStandardMaterial({color:color||0x999999}));
   o.position.set(x,y,z);g.add(o);return o;
 };
 const player=ctx.window.HUNTER_CHARACTERS.createPlayer(THREE,{box,palette});
 const u=player.userData;
 assert.equal(u.upperBody.parent,player);
 assert.equal(u.lowerBody.parent,player);
 assert.equal(u.ll.parent,u.lowerBody);
 assert.equal(u.lr.parent,u.lowerBody);
 assert.equal(u.head.parent,u.upperBody);
 assert.equal(u.al.parent,u.upperBody);
 assert.equal(u.ar.parent,u.upperBody);
 assert.equal(u.gun.parent,u.upperBody);
 assert.equal(u.sniper.parent,u.upperBody);
 assert.equal(u.bazooka.parent,u.upperBody);
 const initialLowerHeight=u.lowerBody.position.y;
 const animate=(forward,strafe,running=false)=>ctx.window.HUNTER_CHARACTERS.animatePlayer(
   player,{forward,strafe,running,dt:.08,swimming:false,inVehicle:false,ammo:16}
 );
 for(let i=0;i<30;i++)animate(1,0,true);
 assert.ok(u.upperBody.rotation.x<-.29,'Només el tronc s’inclina en córrer');
 assert.ok(Math.abs(player.rotation.x)<1e-5,'L’arrel no inclina la pelvis');
 assert.ok(Math.abs(u.lowerBody.rotation.x)<1e-5,'Les cames no s’inclinen');
 assert.equal(u.lowerBody.position.y,initialLowerHeight);
 for(let i=0;i<30;i++)animate(0,1);
 assert.ok(Math.abs(u.lowerBody.rotation.y+Math.PI/4)<.005,'Strafe dret: -45°');
 assert.ok(Math.abs(u.upperBody.rotation.x)<.003,'Tronc dret després de córrer');
 assert.ok(Math.abs(u.upperBody.rotation.y)<1e-5,'El tors no gira amb les cames');
 for(let i=0;i<30;i++)animate(0,-1);
 assert.ok(Math.abs(u.lowerBody.rotation.y-Math.PI/4)<.005,'Strafe esquerre: +45°');
 for(let i=0;i<30;i++)animate(0,0);
 assert.ok(Math.abs(u.lowerBody.rotation.y)<.005,'Pelvis torna al front');
 console.log('OK locomoció: tronc inclinat independent, strafe simètric de 45°');
})().catch(e=>{console.error(e);process.exitCode=1});
