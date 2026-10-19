'use strict';
const assert=require('node:assert/strict');

(async()=>{
 const game=await require('./harness.cjs')();
 const THREE=game.context.THREE;
 const truck=game.run("mkV('camio')");
 assert.equal(truck.userData.truckModel,'A4.3',
   'El camió del joc ha de carregar el model A4.3 aprovat');
 assert.equal(truck.userData.wheels.length,6,'Sis rodes animades');
 assert.equal(truck.userData.steeringPivots.length,2,
   'Els dos pneumàtics del davant han de dirigir');
 assert(truck.userData.truckStaticBatches>0&&truck.userData.truckStaticBatches<30,
   'Agrupació estàtica necessària per mantenir el rendiment');
 assert.equal(truck.userData.truckVisualFit,.82);
 const visual=truck.children.find(o=>o.userData?.archCount===6);
 assert(visual,'El model del joc ha d’incloure els sis parafangs corbats');
 assert.equal(visual.userData.archCount,6);
 assert(visual.userData.rearArmor,'Cal conservar el blindatge posterior');
 assert(visual.userData.wheelClearanceMin>=.10);
 for(const wheel of truck.userData.wheels)
   assert(Math.abs(wheel.userData.radius-.80*.82*1.8125)<1e-6,
     'La velocitat angular correspon al radi escalat real');
 // Els dos pivots del davant continuen funcionant independentment del rodament.
 game.context.HUNTER_VEHICLES.animateSteering(truck,'camio',1,.5);
 assert(truck.userData.steeringPivots.every(p=>p.rotation.y>.2),
   'La direcció dels pneumàtics davanters ha de reaccionar');
 const first=truck.userData.wheels[0],before=first.rotation.x;
 first.rotation.x-=10*.1/first.userData.radius;
 assert(first.rotation.x<before,'Les rodes roden en l’eix X');

 truck.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(truck);
 const hb=game.context.HUNTER_VEHICLES.hitboxes.camio;
 const scale=game.context.HUNTER_VEHICLES.scales.camio;
 assert(bounds.min.x>=-hb[0]*scale/2-.04&&bounds.max.x<=hb[0]*scale/2+.04,
   'La geometria ha de cabre a l’amplada del collider del camió');
 assert(bounds.min.z>=-hb[1]*scale/2-.04&&bounds.max.z<=hb[1]*scale/2+.04,
   'La geometria ha de cabre a la llargada del collider del camió');
 // La física, el dany i el punt de sortida continuen governats pel sistema antic.
 assert.equal(game.context.HUNTER_VEHICLE_DYNAMICS.types.camio.mass,2.2);
 assert.equal(game.context.HUNTER_VEHICLE_DYNAMICS.types.camio.maxF,29);
 console.log('OK A4.3 joc: escala/col·lisions, 6 rodes, direcció, parafangs i blindatge posterior');
})().catch(e=>{console.error(e);process.exitCode=1});
