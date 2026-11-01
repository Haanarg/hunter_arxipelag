#!/usr/bin/env node
'use strict';
// Regressió gràfica del rider original: els seients de dos jugadors
// no poden coincidir als vehicles amb cabina doble.
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('67');
 const positions=game.run(`(()=>{
   const make=t=>({t,v:0,hd:0,x:0,y:0,z:0,
     o:{position:new THREE.Vector3(0,0,0),
       quaternion:new THREE.Quaternion(),userData:{}}});
   const inspect=t=>{
     const vehicle=make(t);
     if(t==='hover')vehicle.o=mkV('hover');
     const capture=(seat)=>{
       riderSystem.update(vehicle,.016,seat);
       const root=riderSystem.object,torso=root.userData.torso,
         hip=torso.position.clone().multiply(root.scale);
       return {x:hip.x,y:hip.y,z:hip.z,visible:root.visible,
         hands:root.userData.limbs.slice(0,4)
           .map(l=>({x:l.position.x*root.scale.x,y:l.position.y*root.scale.y}))};
     };
     const solo=capture(null),driver=capture(0),passenger=capture(1);
     return {solo,driver,passenger};
   };
   const result=Object.fromEntries(['llanxa','llanxa_coets',
     'cotxe_civil','cotxe','hover'].map(t=>[t,inspect(t)]));
   riderSystem.reset();
   return result;
 })()`);
 for(const [type,seats] of Object.entries(positions)){
   const {solo,driver,passenger}=seats;
   assert(driver.visible&&passenger.visible,type+': tots dos riders visibles');
   assert(driver.x<0&&passenger.x>0,
     type+': el pilot seu a l\'esquerra i el passatger a la dreta');
   assert(passenger.x-driver.x>(type==='hover'?.65:1.25),
     type+': les figures no es poden superposar');
   assert(Math.abs(driver.y-passenger.y)<.001&&
     Math.abs(driver.z-passenger.z)<.001,
     type+': els dos seients han de compartir fila i altura');
   assert(Math.abs(solo.x)<.01||Math.abs(solo.x-driver.x)<.01,
     type+': la postura individual es manté');
   assert(passenger.hands.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)),
     type+': els braços del passatger tenen una postura vàlida');
 }
 assert(positions.hover.solo.visible&&positions.hover.solo.x<0,
   'L’hovercraft individual mostra el pilot al seient esquerre');
 assert(positions.hover.driver.x<0&&positions.hover.passenger.x>0,
   'L’hovercraft COOP mostra pilot i passatger costat a costat');
 assert(Math.abs(positions.llanxa.solo.x)<.01&&
   Math.abs(positions.llanxa_coets.solo.x)<.01,
   'El pilot individual de la llanxa conserva el seient central');
 console.log('Riders COOP: llanxes + cotxes + hovercraft D, pilot i passatger en seients paral·lels OK');
})().catch(e=>{console.error(e);process.exitCode=1});
