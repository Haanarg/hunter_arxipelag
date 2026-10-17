#!/usr/bin/env node
// Verificació del comportament acústic, càmera i espatlla del rider.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const root=path.join(__dirname,'..'),T=await import(pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')).href);
 const core=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8');
 assert.ok(core.includes("cv.t==='windsurf'||cv.t==='barca_rems'"),'Rema amb el so del windsurf');
 assert.ok(core.includes("'bici','windsurf','barca_rems'"),'La barca no activa el motor');
 const ctx={window:{}};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'src/vehicle-dynamics.js'),'utf8'),ctx);
 const v=ctx.window.HUNTER_VEHICLE_DYNAMICS.types;
 assert.ok(v.barca_rems.cd>=24&&v.barca_rems.ch>=9,
   'Càmera de rems encara més allunyada');
 const rider=fs.readFileSync(path.join(root,'src/rider.js'),'utf8');
 assert.ok(rider.includes('oars[1-i]'),
   'La mà dreta del remador ha de subjectar el rem de babord');
 assert.ok(rider.includes('torso.rotation.y=Math.PI-Math.PI/2*u.shotBlend'),
   'La cintura gira 90 graus a la dreta, no 180');
 // Exercim l'animació completa, el canó i la tornada a la remada.
 const palette={player:{},enemy:{primary:0x556644,general:0x778855,
   vest:0x445533,secondary:0x334422,skin:0xe0c0a0,dark:0x101a10,metal:0x444444}};
 const ctxRig={window:{HUNTER_PALETTE:palette,HUNTER_BOLT_CUTTERS:{
   create:()=>new T.Group(),pose:()=>{}
 }}};
 vm.createContext(ctxRig);
 for(const file of ['src/player-model.js','src/characters.js','src/rider.js'])
   vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctxRig,{filename:file});
 const scene=new T.Scene(),box=(g,w,h,d,c,x=0,y=0,z=0)=>{
   const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),
     new T.MeshStandardMaterial({color:c||0x999999}));
   mesh.position.set(x,y,z);g.add(mesh);return mesh;
 };
 const ride=ctxRig.window.HUNTER_RIDER.create(T,{
   scene,box,material:color=>new T.MeshStandardMaterial({color}),
   scales:{barca_rems:.98},heightAt:()=>0,shadows:false
 });
 const boat=new T.Group();boat.userData.rowingSeat={y:.855,z:-1.12};
 boat.userData.oars=[-1,1].map(side=>{
   const oar=new T.Group();oar.position.set(side*1.27,1.08,-.18);
   oar.userData.grip=new T.Vector3(-side*.77,0,0);
   boat.add(oar);return oar;
 });
 scene.add(boat);
 const state={t:'barca_rems',o:boat,v:3,pedalPhase:0};
 ride.update(state,.016);
 const u=ride.object.userData;
 assert.ok(Math.abs(u.torso.rotation.y-Math.PI)<.01,
   'En remar el tors està orientat cap a popa');
 assert.ok(u.limbs[2].position.x<0&&u.limbs[0].position.x>0,
   'En remar el braç dret queda a babord i l’esquerre a estribord');
 const shot=ride.firePistol(state,(origin,direction)=>[0,0,-1]);
 assert.ok(shot,'Es pot disparar des de la barca');
 assert.ok(Math.abs(u.pistol.scale.x-.56)<1e-8,
   'La pistola a la barca ha de ser proporcional al remador');
 assert.ok(u.torso.rotation.y>Math.PI/2&&u.torso.rotation.y<Math.PI,
   'El tors gira cap a la dreta sense superar els 90 graus');
 const rightShoulder=new T.Vector3(.57,1.17,0)
   .applyQuaternion(u.torso.quaternion).add(u.torso.position);
 assert.ok(u.limbs[2].position.distanceTo(rightShoulder)<.001,
   'L’espatlla del braç dret segueix el tors també girat a 90 graus');
 assert.ok(shot.direction.dot(new T.Vector3(0,0,-1))>.98,
   'La pistola i el tret han d’apuntar a proa');
 assert.ok(shot.origin.z<u.torso.position.z-.25,
   'La pistola surt cap a proa des de la mà dreta amb el tors de perfil');
 for(let i=0;i<3;i++)ride.update(state,.05);
 assert.ok(Math.abs(u.torso.rotation.y-Math.PI/2)<.10,
   'En disparar el tors queda de perfil a 90 graus');
 for(let i=0;i<35;i++)ride.update(state,.05);
 assert.ok(Math.abs(u.torso.rotation.y-Math.PI)<.03,
   'En acabar el tret el tors torna a mirar cap a popa per remar');
 console.log('OK barca: so, càmera, rems anatòmics i tir dret cap a proa');
})().catch(e=>{console.error(e);process.exitCode=1});
