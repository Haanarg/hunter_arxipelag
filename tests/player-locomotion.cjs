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
 assert.ok(Math.abs(u.upperBody.rotation.x+u.head.rotation.x)<.003,
   'El cap ha de compensar la inclinació del tors i mirar endavant');
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
 // Pistola: cintura activa i canó orientat endavant sense retorçar el braç.
 const pistol=()=>ctx.window.HUNTER_CHARACTERS.animatePlayer(player,{
   forward:0,strafe:0,running:false,dt:.016,
   swimming:false,inVehicle:false,ammo:16
 });
 for(let i=0;i<32;i++){u.pistolAimTime=.32;u.pistolShotAge=.12;pistol()}
 assert.ok(u.upperBody.rotation.y>.23&&u.upperBody.rotation.y<.36,
   'El tir amb pistola gira la cintura dins un angle humà');
 assert.ok(Math.abs(u.head.rotation.y+u.upperBody.rotation.y)<.04,
   'El cap continua mirant endavant en disparar');
 player.updateMatrixWorld(true);
 const gunForward=new THREE.Vector3(0,0,-1)
   .applyQuaternion(u.gun.getWorldQuaternion(new THREE.Quaternion()));
 const bodyForward=new THREE.Vector3(0,0,-1)
   .applyQuaternion(player.getWorldQuaternion(new THREE.Quaternion()));
 assert.ok(gunForward.dot(bodyForward)>.98,
   'El canó ha de mantenir la direcció del tret');
 for(let i=0;i<40;i++)pistol();
 assert.ok(Math.abs(u.upperBody.rotation.y)<.015,
   'La cintura torna a repòs després del tret');
 // A l'aigua, el crol ha de variar tronc, braços i batement de cames,
 // sense reactivar les armes i tornant a la braça quan se solta.
 const swim=(fast,strafe=0,forward=1)=>ctx.window.HUNTER_CHARACTERS.animatePlayer(
   player,{forward,strafe,running:fast,dt:.08,swimming:true,inVehicle:false,ammo:16}
 );
 for(let i=0;i<30;i++)swim(false);
 const breastLeft=u.al.rotation.x,breastRight=u.ar.rotation.x;
 assert.ok(Math.abs(player.rotation.x)<.005,'La braça ha de conservar la postura actual');
 for(let i=0;i<30;i++)swim(true);
 assert.ok(u.crawlBlend>.99,'La zona de velocitat activa el crol');
 assert.ok(Math.abs(u.upperBody.rotation.y)<.02,
   'El tors no s’ha de girar de cap per avall durant el crol');
 assert.ok(Math.abs(u.lowerBody.rotation.y)<.02,
   'La pelvis i els peus han de mantenir l’orientació normal');
 assert.ok(Math.abs(player.rotation.z)<.02,
   'El crol no ha d’invertir verticalment el cap i els peus');
 player.updateMatrixWorld(true);
 const faceWorld=new THREE.Vector3(0,0,-1)
   .applyQuaternion(u.head.getWorldQuaternion(new THREE.Quaternion()));
 assert.ok(faceWorld.y<-.65,'El nas ha de mirar cap al fons i no cap al cel');
 const headWorld=u.head.getWorldPosition(new THREE.Vector3());
 const pelvisWorld=u.lowerBody.getWorldPosition(new THREE.Vector3());
 assert.ok(headWorld.z<pelvisWorld.z-.5,
   'El cap ha de continuar avançat en la direcció de natació');
 assert.ok(player.rotation.x< -1.16,'El crol ha de ser gairebé horitzontal');
 // Aigües profundes: física del jugador 2,1 m sota l'onatge.
 // El model, en canvi, ha de deixar visibles cap i pit.
 const surface=0,physicalY=surface-2.1;
 const visualLift=ctx.window.HUNTER_CHARACTERS.swimVisualLift(player,surface,physicalY);
 assert.ok(visualLift>1,'La compensació del crol ha de salvar la immersió del cap');
 assert.ok(visualLift<2.5,'La compensació ha de mantenir els peus sota les ones');
 player.position.set(0,physicalY+visualLift,0);
 player.updateMatrixWorld(true);
 const chestCenter=u.upperBody.localToWorld(
   new THREE.Vector3(0,2.31*1.2-u.upperBodyPivotHeight,0));
 const headCenter=u.head.getWorldPosition(new THREE.Vector3());
 const footCenter=u.boots[0].getWorldPosition(new THREE.Vector3());
 assert.ok(headCenter.y>surface+.06,'El cap ha de poder respirar sobre la superfície');
 assert.ok(chestCenter.y>surface+.10,'El pit ha de ser visible per damunt de les ones');
 assert.ok(chestCenter.y<surface+.65,'El tors no ha de sortir completament de l’aigua');
 assert.ok(footCenter.y<surface+.20,'Els peus han de romandre prop de la superfície');
 assert.ok(headCenter.y>footCenter.y+.55,'El cap ha de ser clarament més alt que els peus');
 assert.equal(ctx.window.HUNTER_CHARACTERS.swimVisualLift(player,surface,1),0,
   'En sortir a terra no s’ha d’aixecar artificialment el model');
 assert.ok(Math.abs(u.al.rotation.x-u.ar.rotation.x)>.4,
   'Les braçades de crol s’han d’alternar');
 assert.ok(Math.abs(u.ll.rotation.x-u.lr.rotation.x)>.05,
   'Les cames han de bategar alternadament');
 assert.equal(u.gun.visible,false,'No s’han de mostrar armes nedant');
 for(let i=0;i<30;i++)swim(false,1,0);
 assert.ok(u.crawlBlend<.01,'En deixar córrer es torna a la braça');
 assert.ok(Math.abs(player.rotation.x)<.01,'Es recupera la postura de braça');
 assert.ok(Math.abs(u.upperBody.rotation.y)<.02,
   'En tornar a la braça s’ha de desfer el gir del tors');
 assert.ok(Math.abs(u.lowerBody.rotation.y)<.02,
   'La pelvis recupera l’orientació natural en braça');
 assert.ok(Math.abs(player.rotation.z)<.06,
   'La braça conserva només la lleu oscil·lació normal');
 // El·lipse real de la mà esquerra: les projeccions XZ han de
 // dibuixar superfície, no només anar endavant i enrere en línia.
 const samples=[];
 for(let i=0;i<=32;i++){
   const phase=2*Math.PI*i/32;
   u.ph=phase-.25*(4.2+3.5);
   ctx.window.HUNTER_CHARACTERS.animatePlayer(player,{
     forward:1,strafe:0,running:true,dt:.25,swimming:true,inVehicle:false,ammo:16
   });
   player.updateMatrixWorld(true);
   const hand=u.ael.localToWorld(new THREE.Vector3(0,-.58*1.2,0));
   u.upperBody.worldToLocal(hand);
   samples.push([hand.x,hand.z]);
 }
 let ellipseArea=0;
 for(let i=0;i<32;i++)
   ellipseArea+=samples[i][0]*samples[i+1][1]-samples[i+1][0]*samples[i][1];
 assert.ok(Math.abs(ellipseArea)*.5>.03,
   'Les braçades de crol han de formar una el·lipse, no una línia');
 console.log('OK locomoció: cap frontal, strafe, braça i crol amb animació pròpia');
})().catch(e=>{console.error(e);process.exitCode=1});
