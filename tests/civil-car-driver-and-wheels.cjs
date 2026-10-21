'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
assert.match(read('src/action-icons.js'),/cotxe_civil:svg\(/,
  'El cotxe familiar ha de tenir icona pròpia al botó d’acció');
assert.match(read('src/civilian-car-c1-iterations.mjs'),/steering.add\(axle\)/,
  'Rodes de direcció i rodatge en grups diferents');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('12345');game.frame();
 const r=game.run(`(()=>{
   const o=mkV('cotxe_civil'),W=o.userData.wheels,
         steering=o.userData.steeringPivots;
   const front=W.filter(w=>steering.includes(w.parent));
   const rear=W.filter(w=>!steering.includes(w.parent));
   o.updateMatrixWorld(true);
   const centres=W.map(w=>w.getWorldPosition(new THREE.Vector3()));
   window.HUNTER_VEHICLES.animateSteering(o,'cotxe_civil',1,.25);
   const yaw=steering.map(p=>p.rotation.y);
   front.forEach(w=>w.rotation.x+=1.3);
   rear.forEach(w=>w.rotation.x+=1.3);
   o.updateMatrixWorld(true);
   const after=W.map(w=>w.getWorldPosition(new THREE.Vector3()));
   const stable=centres.every((p,i)=>p.distanceTo(after[i])<1e-5);
   const directionUnaffected=yaw.every((val,i)=>Math.abs(val-steering[i].rotation.y)<1e-8);
   const parentPitch=steering.every(p=>Math.abs(p.rotation.x)<1e-8);
   const geometry=o.children.find(ch=>ch.userData?.civilianVariant)?.userData?.civilianVariant;
   // La mateixa tecla E i la icona del botó detecten el cotxe familiar.
   const oldV=V,oldCV=cv;const pos={x:P.x,z:P.z,y:P.y};
   const v={t:'cotxe_civil',x:pos.x+1.7,z:pos.z,hd:0,v:0,
     o,destroyed:false,life:4,maxLife:4};
   o.position.set(v.x,groundAt(v.x,v.z)+.05,v.z);
   V=[v];rebuildVehicleGrid();
   const near=nearV();
   updateActionButton(near);
   const btn=document.getElementById('mainActionButton');
   const icon=btn.dataset.vehicle;
   const iconSvg=btn.innerHTML.includes('<svg');
   cv=v;poseRider(cv,.016);
   const riderObj=riderSystem.object,
         driver=!!riderObj.visible,
         hip=riderObj.userData.torso.position.clone(),
         head=riderObj.userData.head.getWorldPosition(new THREE.Vector3());
   const headingAligned=riderObj.quaternion.angleTo(o.quaternion)<1e-5;
   const expectedX=(-.613*VS.cotxe_civil);
   const hipX=hip.x*riderObj.scale.x;
   const seatCorrect=Math.abs(hipX-expectedX)<.02;
   cv=null;poseRider(cv,.016);
   const hidden=!riderObj.visible;
   // L'altre cotxe utilitari també ha de mostrar el conductor.
   const util=mkV('cotxe');
   const uv={t:'cotxe',v:0,o:util,hd:0};
   poseRider(uv,.016);
   const utilityDriver=riderObj.visible,
         utilityHip=riderObj.userData.torso.position.x*riderObj.scale.x;
   poseRider(null,.016);
   V=oldV;cv=oldCV;rebuildVehicleGrid();
   return {
     count:W.length,steerCount:steering.length,front:front.length,rear:rear.length,
     yaw,stable,directionUnaffected,parentPitch,geometry,
     icon,iconSvg,near:near===v,driver,hidden,headingAligned,
     seatCorrect,hipX,headY:head.y,utilityDriver,utilityHip
   };
 })()`);
 assert.equal(r.count,4,'Quatre rodes');
 assert.equal(r.steerCount,2,'Dues rodes direccionals');
 assert.equal(r.front,2);assert.equal(r.rear,2);
 assert(r.yaw.every(y=>y>.15),'Les rodes davanteres dirigeixen');
 assert.equal(r.stable,true,'Cap centre de roda oscil·la durant el rodatge i gir');
 assert.equal(r.directionUnaffected,true,'El rodament no afecta el pivot de direcció');
 assert.equal(r.parentPitch,true,'Els pivots de direcció no roden en X');
 assert.equal(r.near,true,'El cotxe civil es pot detectar per pujar');
 assert.equal(r.icon,'cotxe_civil','Icona identificadora del vehicle');
 assert.equal(r.iconSvg,true);
 assert.equal(r.driver,true,'El pilot es mostra dins el cotxe civil');
 assert.equal(r.hidden,true,'El pilot s’amaga en sortir');
 assert.equal(r.headingAligned,true);
 assert.equal(r.seatCorrect,true,'El pilot ocupa el seient esquerre');
 assert(r.headY>0);
 assert.equal(r.utilityDriver,true,'El pilot també apareix al cotxe utilitari');
 assert(r.utilityHip<0,'El conductor de l’utilitari seu a l’esquerra');
 console.log('OK cotxes: icona, detecció per pujar, conductor i eixos de les rodes separats');
})().catch(e=>{console.error(e);process.exitCode=1});
