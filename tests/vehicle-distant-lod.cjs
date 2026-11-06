#!/usr/bin/env node
'use strict';
// Tota la flota reutilitza siluetes distants de poques cares.
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const {shouldSimplifyVehicle,hasDistantVehicleLOD}=await import(
   pathToFileURL(path.join(__dirname,'../src/vehicle-distant-lod.mjs')).href);
 const game=await require('./harness.cjs')();
 const T=game.context.THREE;
 const types=['llanxa','llanxa_coets','moto_aquatica','windsurf','hover','ferry',
   'cotxe','cotxe_civil','moto','bici','camio','tanqueta','tanc','heli','heli_combat'];
 for(const type of types){
   assert(hasDistantVehicleLOD(type),'missing '+type+' LOD');
   const model=game.run("mkV('"+type+"')");
   const lod=model.userData.distantVehicleLOD;
   assert(lod,'missing proxy for '+type);
   assert.equal(lod.level,'full');
   assert.equal(lod.proxy.visible,false,'full-detail default');
   assert.equal(lod.full.visible,true,'original model visible');
   assert(lod.proxy.isMesh&&lod.proxy.geometry.getAttribute('color'),
     type+' uses one vertex-coloured mesh');
   const fullCount=(()=>{let n=0;lod.full.traverse(o=>{if(o.isMesh)n++});return n})();
   assert(fullCount>=2,type+' full model should remain intact');
   const meshes=(()=>{let n=0;model.traverse(o=>{if(o.isMesh)n++});return n})();
   assert.equal(model.userData.vehicleBatchStats.after,meshes,type+' stats include distant proxy');
   const far=shouldSimplifyVehicle(type,1e8);
   assert.equal(far,true);
   assert.equal(shouldSimplifyVehicle(type,1e8,false,true),false,'pilot or sniper uses full detail');
   assert.equal(game.context.HUNTER_VEHICLES.setDistantVehicleLOD(model,true),true);
   assert.equal(lod.full.visible,false);assert.equal(lod.proxy.visible,true);
   assert.equal(lod.level,'far');
   assert.equal(game.context.HUNTER_VEHICLES.setDistantVehicleLOD(model,true),false);
   assert.equal(game.context.HUNTER_VEHICLES.setDistantVehicleLOD(model,false),true);
   assert.equal(lod.full.visible,true);assert.equal(lod.proxy.visible,false);
   assert.equal(lod.level,'full');
   const expected=shouldSimplifyVehicle(type,1e8,true);
   assert(expected,'hysteresis remains stable in the far range');
   assert(model.userData.wheels?.every(x=>x.parent)||true,'wheel pivots remain in full model');
   if(model.userData.turretMuzzle)assert(model.userData.turretMuzzle.parent,'original muzzle retained');
 }
 assert.equal(hasDistantVehicleLOD('barca_rems'),false,
   'existing oval rowboat LOD is not duplicated');
 const humvee=game.run("mkV('cotxe')");
 const detail=humvee.userData.distantVehicleLOD.full,
   driver=new T.Group(),gunner=new T.Group();
 driver.visible=true;gunner.visible=true;detail.add(driver,gunner);
 humvee.userData.enemyCarCrew={driver,gunner};
 const normal=humvee.userData.distantVehicleLOD.variants[0];
 game.context.HUNTER_VEHICLES.setDistantVehicleLOD(humvee,true);
 assert.notStrictEqual(humvee.userData.distantVehicleLOD.proxy.geometry,normal,
   'seated crew changes low-poly silhouette');
 assert(driver.visible&&gunner.visible,'crew state survives hidden parent');
 // Amb centenars de vehicles i diversos subpassos, el LOD distant
 // ja establert no ha de tornar a recórrer els accessoris del model.
 const children=humvee.children,originalIterator=children[Symbol.iterator];
 let childTraversals=0;
 children[Symbol.iterator]=function(){childTraversals++;return originalIterator.call(this)};
 assert.equal(game.context.HUNTER_VEHICLES.setDistantVehicleLOD(humvee,true),false);
 assert.equal(childTraversals,0,'unchanged far LOD avoids re-scanning children');
 delete children[Symbol.iterator];
 const late=new T.Group();late.visible=true;humvee.add(late);
 game.context.HUNTER_VEHICLES.setDistantVehicleLOD(humvee,true);
 assert.equal(late.visible,false,'late added visual extras hidden at long distance');
 game.context.HUNTER_VEHICLES.setDistantVehicleLOD(humvee,false);
 assert(late.visible&&driver.visible&&gunner.visible,'crew and extras restored exactly');
 const first=game.run("mkV('moto')"),second=game.run("mkV('moto')");
 assert.notStrictEqual(first.userData.distantVehicleLOD,second.userData.distantVehicleLOD);
 assert.strictEqual(first.userData.distantVehicleLOD.proxy.geometry,
   second.userData.distantVehicleLOD.proxy.geometry,
   'same motorcycle type shares one GPU geometry');
 console.log('PASS single-draw far LOD for 15 vehicles, shared geometries, crews, hysteresis, restored original rigs');
})().catch(e=>{console.error(e);process.exitCode=1});
