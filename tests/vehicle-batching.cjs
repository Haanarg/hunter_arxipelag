'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 const T=game.context.THREE;
 const countMeshes=root=>{let count=0;root.traverse(o=>{if(o.isMesh)count++});return count};
 const triangles=root=>{let total=0;root.traverse(o=>{
   if(!o.isMesh)return;
   const g=o.geometry;
   total+=(g.index?g.index.count:g.getAttribute('position').count)/3;
 });return total};
 const civil=game.run("mkV('cotxe_civil',{color:0xca3945})");
 const stats=civil.userData.vehicleBatchStats;
 assert(stats,'vehicle factory provides batching stats');
 assert.equal(stats.before-stats.after,stats.groups);
 assert(stats.groups>=52,'4 wheel axles should save at least 52 meshes');
 assert(stats.after<=50,'civilian model should have at most 50 meshes');
 assert.equal(civil.userData.wheels.length,4,'keep four animated wheels');
 assert.equal(civil.userData.steeringPivots.length,2,'keep both front steering pivots');
 assert.equal(countMeshes(civil),stats.after);
 for(const axle of civil.userData.wheels){
   const before=axle.rotation.x;axle.rotation.x+=.6;
   assert(axle.rotation.x>before,'wheel axle can still rotate');
   assert(axle.children.filter(o=>o.isMesh).length<=5,
     'spokes, caps and hubs are batched within the axle');
 }
 game.context.HUNTER_VEHICLES.animateSteering(civil,'cotxe_civil',1,.25);
 assert(civil.userData.steeringPivots.every(p=>p.rotation.y>.1),
   'independent steering remains functional');
 const original=game.context.HUNTER_CIVIL_C1A(T,0xca3945);
 original.scale.setScalar(game.context.HUNTER_VEHICLES.scales.cotxe_civil);
 original.updateMatrixWorld(true);civil.updateMatrixWorld(true);
 const a=new T.Box3().setFromObject(original),b=new T.Box3().setFromObject(civil);
 assert(a.min.distanceTo(b.min)<1e-4&&a.max.distanceTo(b.max)<1e-4,
   'outer dimensions and visible wheel placement unchanged');
 assert.equal(triangles(civil),triangles(original),
   'no triangles removed: graphics fidelity preserved');
 let allSaved=0;
 for(const type of ['bici','moto','ferry','llanxa','barca_rems','windsurf',
                    'camio','tanqueta','tanc','heli','heli_combat']){
   const vehicle=game.run("mkV('"+type+"')");
   const s=vehicle.userData.vehicleBatchStats;
   assert(s&&s.before>=s.after&&s.groups===s.before-s.after,type+' safe optimization');
   assert.equal(countMeshes(vehicle),s.after,type+' stats agree with model');
   allSaved+=s.groups;
   if(vehicle.userData.wheels)
     for(const wheel of vehicle.userData.wheels)
       assert(wheel.parent,'animated wheel pivots preserved in '+type);
   if(vehicle.userData.turretMuzzle)
     assert(vehicle.userData.turretMuzzle.parent,'turret muzzle preserved in '+type);
 }
 assert(allSaved>0,'other vehicles also benefit from rigid-mesh batching');
 const patrol=game.run("(function(){const b=mkV('llanxa');createMarinePatrolVisual(b);return b})()");
 assert(patrol.userData.marineBatchStats?.groups>0,
   'marine patrol crew and mounts must be batched');
 const weapons=patrol.userData.marineWeapons;
 assert(weapons.machineGun.mount.parent===patrol);
 assert(weapons.rockets.mount.parent===patrol);
 assert(weapons.machineGun.muzzle.parent===weapons.machineGun.mount);
 assert(weapons.rockets.muzzle.parent===weapons.rockets.mount);
 patrol.updateMatrixWorld(true);
 assert(weapons.machineGun.muzzle.getWorldPosition(new T.Vector3()).length()>0,
   'weapon firing origin remains valid');
 console.log('PASS vehicles: C1A wheels/body bounds/triangles, movable pivots, all models, marine weapons; C1A saves '+stats.groups+' meshes');
})().catch(error=>{console.error(error);process.exitCode=1});
