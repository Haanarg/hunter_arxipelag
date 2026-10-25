#!/usr/bin/env node
// Regressió de retícula: trajectòria de canó real, míssils i bazuca.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
 const T=await import(pathToFileURL(path.join(__dirname,'../vendor/three-r186.module.mjs')).href);
 const src=fs.readFileSync(path.join(__dirname,'../src/combat.js'),'utf8');
 const helper=src.slice(src.indexOf('function combatBoatRocketAim('),
    src.indexOf('// Retícula del bazooka:',src.indexOf('function combatBoatRocketAim(')));
 const fn=src.slice(src.indexOf('function updateBazookaReticle(dt){'),
    src.indexOf('// Conservem el punt',src.indexOf('function updateBazookaReticle(dt){')));
 assert.ok(helper.startsWith('function combatBoatRocketAim('));
 assert.ok(fn.startsWith('function updateBazookaReticle(dt){'));
 const ui={style:{display:'none'},classList:{locked:false,toggle(name,val){this.locked=val}}};
 const gun={origin:new T.Vector3(0,2,0),direction:new T.Vector3(0,0,-1)};
 const ctx={
   THREE:T,window:{HUNTER_VEHICLES:{turretShot:()=>gun}},bazookaReticleElement:ui,
   bazookaReticleWorld:new T.Vector3(),bazookaReticleScreen:new T.Vector3(),
   bazookaReticleTimer:0,bazookaReticleHasHit:false,bazookaReticleMode:null,
   started:true,paused:false,over:false,playerFall:null,swimming:false,
   bazookaEquipped:false,inv:{bazooka:2},P:{x:0,y:0,z:0,hd:0},cv:null,
   VS:{heli_combat:1.82},HEAVY_SHOT_SPEED_FACTOR:1,
   BAZOOKA_AIM_RANGE:185,BAZOOKA_AIM_CONE:.82,
   HELI_MISSILE_RANGE:210,HELI_MISSILE_ANGLE:Math.PI*25/180,
   cam:new T.PerspectiveCamera(58,1,0.1,500),
   // L'objectiu simulat està sempre a 25 m i dins del camp de visió.
   bazookaFirstSolidHit:(x,y,z,dx,dy,dz,range)=>({x:0,y:0,z:-25}),
   autoAimWeaponShot:(x,y,z,dx,dy,dz,range,cone,kind,focus)=>{
     ctx.calls.push({x,y,z,dx,dy,dz,range,cone,kind});
     if(focus){focus.target={r:2};focus.point={x:0,y:0,z:-25}}
     return [dx,dy,dz];
   },calls:[]
 };
 ctx.cam.position.set(0,3,10);ctx.cam.lookAt(0,0,-25);
 vm.createContext(ctx);
 vm.runInContext(helper+fn,ctx);
 const refresh=()=>vm.runInContext('updateBazookaReticle(.1)',ctx);
 ctx.cv={t:'tanc',o:new T.Group()};
 refresh();
 assert.equal(ctx.bazookaReticleMode,'tank','Canó del tanc seleccionat');
 assert.equal(ctx.calls.at(-1).range,220,'Abast de la retícula del tanc');
 assert.equal(ctx.calls.at(-1).kind,'heavy','Tanc: projectil pesat');
 assert.equal(ui.style.display,'block','Impacte visible a la pantalla');
 ctx.calls=[];
 ctx.cv={t:'heli_combat',x:0,z:0,hd:0,o:new T.Group(),rockets:3};
 ctx.cv.o.position.y=15;
 refresh();
 assert.equal(ctx.bazookaReticleMode,'missile','Retícula de míssils en combat');
 assert.equal(ctx.calls.at(-1).range,210,'Abast del míssil');
 assert.ok(ctx.calls.at(-1).dy<-.4&&ctx.calls.at(-1).dy>-.5,'Míssils: angle real de 25° cap avall');
 assert.equal(ctx.calls.at(-1).kind,'heavy','Retícula usa foc pesat');
 ctx.calls=[];
 ctx.cv={t:'llanxa_coets',x:0,z:0,hd:0,o:new T.Group(),rockets:Infinity};
 ctx.cv.o.position.y=2;
 refresh();
 assert.equal(ctx.bazookaReticleMode,'boat','Retícula de llanxa llançacoets');
 assert.equal(ctx.calls.at(-1).range,105,'Coets de la llanxa: abast real');
 assert.ok(ctx.calls.at(-1).dy>0&&ctx.calls.at(-1).dy<.02,
   'La llanxa conserva la lleugera elevació real del coet');
 assert.equal(ctx.calls.at(-1).kind,'heavy','Llanxa: armament pesat');
 assert.equal(ui.style.display,'block','La mira de la llanxa és visible');
 ctx.cv={t:'heli_combat',x:0,z:0,hd:0,o:new T.Group(),rockets:0};refresh();
 assert.equal(ui.style.display,'none','Sense míssils la retícula desapareix');
 // Abans el marcador es feia invisible sense un sòlid interceptat.
 ctx.bazookaFirstSolidHit=()=>null;
 ctx.autoAimWeaponShot=(x,y,z,dx,dy,dz,range,cone,kind,focus)=>{
   ctx.calls.push({x,y,z,dx,dy,dz,range,cone,kind});
   return [dx,dy,dz];
 };
 ctx.cv={t:'tanc',o:new T.Group()};refresh();
 assert.equal(ui.style.display,'block','La retícula del tanc és visible en mar obert');
 ctx.cv={t:'heli_combat',x:0,z:0,hd:0,o:new T.Group(),rockets:4};
 ctx.cv.o.position.y=40;refresh();
 assert.equal(ui.style.display,'block','Retícula de míssils sense impacte');
 ctx.cv={t:'llanxa_coets',x:0,z:0,hd:0,o:new T.Group(),rockets:Infinity};
 ctx.cv.o.position.y=1;
 refresh();
 assert.equal(ctx.bazookaReticleMode,'boat');
 assert.equal(ui.style.display,'block','Retícula de la llanxa visible a mar obert');
 assert.ok(Number.parseFloat(ui.style.left)>=0&&Number.parseFloat(ui.style.left)<=100,
   'Una trajectòria fora de càmera mostra la retícula dins pantalla');
 const prefix=src.slice(src.indexOf('function bazookaFirstSolidHit('),
   src.indexOf('function updateBazookaReticle(dt){'));
 const own={t:'tanc',x:0,z:0,o:new T.Group()};
 const sphereCtx={wallCandidates:()=>[],buildingCandidates:()=>[],
   enemyCandidatesAt:()=>[],vehicleCandidatesAt:()=>[own],hAt:()=>-100,
   vehicleRadius:()=>7,segmentSphereT:()=>0,segmentAabbT:()=>null};
 vm.createContext(sphereCtx);
 vm.runInContext(prefix,sphereCtx);
 assert.equal(vm.runInContext(
   'bazookaFirstSolidHit(0,40,0,0,0,-1,30)',sphereCtx)?.z,0,
   'La hitbox pròpia interceptaria falsament sense exclusió');
 sphereCtx.source=own;
 assert.equal(vm.runInContext(
   'bazookaFirstSolidHit(0,40,0,0,0,-1,30,source)',sphereCtx),null,
   'La mira ignora el vehicle des d’on es dispara');
 ctx.cv=null;ctx.bazookaEquipped=true;refresh();
 assert.equal(ctx.bazookaReticleMode,'bazooka','Bazuca conserva la seva retícula');
 assert.equal(ctx.calls.at(-1).range,185,'Bazuca: abast ampliat també a la retícula');
 assert.equal(ctx.calls.at(-1).cone,.82,'Bazuca: con ampliat també a la retícula');
 ctx.bazookaEquipped=false;refresh();
 assert.equal(ui.style.display,'none','Sense armes compatibles la retícula desapareix');
 assert.ok(src.includes('const shot=combatHeliMissileAim(cv),d=shot.direction'),
   'Míssil real i retícula usen el mateix origen i angle');
 assert.ok(src.includes('const shot=combatBoatRocketAim(cv),d=shot.direction'),
   'El coet de llanxa usa el mateix origen i direcció que la retícula');
 // El DOM simulava abans un punt d'impacte sempre visible. Repetim
 // la comprovació amb el context real del joc i models Three.js.
 const game=await require('./harness.cjs')();
 const actual=game.run(`(()=>{
   started=1;paused=false;over=0;
   cv={t:'tanc',x:0,z:0,hd:0,o:mkV('tanc')};
   cv.o.position.set(0,2,0);
   cam.position.set(0,22,35);cam.lookAt(0,5,-40);
   updateBazookaReticle(.2);
   const tank={mode:bazookaReticleMode,
     shown:bazookaReticleElement.style.display,
     x:bazookaReticleElement.style.left,y:bazookaReticleElement.style.top};
   cv={t:'heli_combat',x:0,z:0,hd:0,o:mkV('heli_combat'),rockets:4};
   cv.o.position.set(0,40,0);
   cam.position.set(0,55,65);cam.lookAt(0,40,-20);
   updateBazookaReticle(.2);
   const missile={mode:bazookaReticleMode,
     shown:bazookaReticleElement.style.display,
     x:bazookaReticleElement.style.left,y:bazookaReticleElement.style.top};
   cv={t:'llanxa_coets',x:0,z:0,hd:0,o:mkV('llanxa_coets'),rockets:Infinity};
   cv.o.position.set(0,1,0);
   cam.position.set(0,20,48);cam.lookAt(0,1,-25);
   updateBazookaReticle(.2);
   const boat={mode:bazookaReticleMode,
     shown:bazookaReticleElement.style.display,
     x:bazookaReticleElement.style.left,y:bazookaReticleElement.style.top};
   return{tank,missile,boat};
 })()`);
 assert.equal(actual.tank.mode,'tank');
 assert.equal(actual.tank.shown,'block','Retícula del tanc amb torreta i càmera reals');
 assert.equal(actual.missile.mode,'missile');
 assert.equal(actual.missile.shown,'block','Retícula de míssils amb helicòpter i càmera reals');
 assert.equal(actual.boat.mode,'boat');
 assert.equal(actual.boat.shown,'block',
   'Retícula de coets amb llanxa i càmera reals');
 console.log('OK retícula: tanc, míssils 25°, càrrega, canvi d’arma i bazuca');
})().catch(e=>{console.error(e);process.exitCode=1});
