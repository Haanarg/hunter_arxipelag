// Regressions: un cotxe amb rodes no pot girar sense trajectòria,
// i el distintiu hostil és tela vermella en un màstil negre, no una barra.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three-r186.module.mjs';
import {enemyCarArcStep,ENEMY_CAR_MIN_TURN_RADIUS} from '../src/enemy-car-steering.mjs';
import {stepLandPatrol} from '../src/patrol-motion-core.mjs';

const nearly=(a,b,e=1e-8)=>Math.abs(a-b)<e;
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
assert.ok(ENEMY_CAR_MIN_TURN_RADIUS>=8,'El radi mínim del cotxe no pot ser nul');
for(const reverse of [false,true]){
  for(const targetHeading of [-Math.PI,-1.6,-.4,0,.4,1.6,Math.PI]){
    const start={x:15,z:25,heading:.12,targetHeading,reverse};
    const idle=enemyCarArcStep({...start,distance:0});
    assert.ok(nearly(idle.x,start.x)&&nearly(idle.z,start.z),
      'No hi ha desplaçament sense avançar o recular');
    assert.ok(nearly(idle.heading,start.heading),
      'Cap gir sobre el lloc encara que el destí sigui a l’esquena');
    let pose={x:start.x,z:start.z,heading:start.heading};
    for(let i=0;i<100;i++){
      const next=enemyCarArcStep({...pose,targetHeading,reverse,distance:.73});
      const yaw=Math.abs(angle(next.heading-pose.heading));
      const travelled=Math.hypot(next.x-pose.x,next.z-pose.z);
      assert.ok(yaw<=.73/ENEMY_CAR_MIN_TURN_RADIUS+1e-8,
        'La guinyada està limitada pel radi de gir mínim');
      assert.ok(travelled>.7,'Per girar s’ha de desplaçar de debò');
      assert.ok(Number.isFinite(next.x)&&Number.isFinite(next.z)&&Number.isFinite(next.heading));
      pose=next;
    }
    assert.ok(Math.hypot(pose.x-start.x,pose.z-start.z)>.05);
  }
}
const turnLeft=enemyCarArcStep({x:0,z:0,heading:0,targetHeading:Math.PI/2,distance:2});
assert.ok(turnLeft.heading>0&&turnLeft.x<0&&turnLeft.z<0);
const backward=enemyCarArcStep({x:0,z:0,heading:0,targetHeading:Math.PI/2,distance:2,reverse:true});
assert.ok(backward.heading<0&&backward.z>0);
const parked=enemyCarArcStep({x:0,z:0,heading:1.2,targetHeading:-1.5,distance:0});
assert.ok(nearly(parked.heading,1.2));

const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const navigation=source('src/enemy-navigation.js');
assert.ok(navigation.includes("car=u.t==='jeep'")&&
  navigation.includes('enemyCarArcStep({')&&
  navigation.includes('if(!enemySweep(u,u.x,u.z,nx,nz,oldHd,nextHd))'),
  'La IA fa un pas en arc, però continua validant la petjada i les col·lisions');
const enemies=source('src/enemy-ai.js');
assert.ok(!enemies.includes('bx(g,.2,2,.2,0xff2020,0,3.4,0)')&&
  !enemies.includes('bx(g,.18,1.7,.18,0xff2020,0,3.2,.4)'),
  'No hi ha barres vermelles sobre cotxes ni tanquetes');
assert.ok(enemies.includes("t==='jeep'?9.5:5"),
  'El jeep anticipa els waypoints per poder seguir una corba');
const runtime=source('src/runtime-scripts.mjs');
assert.ok(runtime.includes('src/enemy-navigation.js')&&runtime.includes('src/enemy-lod.js'),
  'El motor individual i COOP natiu carreguen els mateixos sistemes enemics');
// El Worker del cooperatiu simula les patrulles enemigues: ha de
// compartir aquesta cinemàtica, no només la càmera del client.
const coopPatrol=source('src/patrol-motion-core.mjs');
assert.ok(coopPatrol.includes("import {enemyCarArcStep}")&&
  coopPatrol.includes("const arc=t.t==='jeep'?enemyCarArcStep(")&&
  coopPatrol.includes('t.heading=candidate.hd'),
  'El servidor cooperatiu conserva el gir en arc després de validar el moviment');
const coopVisual=source('src/coop-world-runtime.js');
assert.ok(coopVisual.includes("animateSteering(e.o,'cotxe',steering,dt)")&&
  coopVisual.includes('wheel.rotation.x-=signed/'),
  'Les rodes dels cotxes al COOP han de seguir els girs i recorreguts interpolats');
const coopCombat=source('server/coop-combat.mjs');
assert.ok(coopCombat.includes("if(t.t!=='jeep')t.heading=facePoint(t,position)"),
  'Una alarma no pot fer girar un cotxe enemic estacionari en COOP');
const flatWorld={
  resolveBody:(unit,candidate)=>candidate,
  locomotionAt:()=>({floor:1,terrain:2,interior:false,drop:false})
};
const scout={t:'jeep',x:0,z:0,y:1,heading:0,sp:20,tx:0,tz:-110,
  patrol:[{x:0,z:-110},{x:-110,z:-110}],patrolIndex:0,wt:60};
let moved=0,turned=0;
for(let i=0;i<300;i++){
 const before={x:scout.x,z:scout.z,heading:scout.heading};
 stepLandPatrol(scout,{dt:.1,world:flatWorld,random:()=>.5});
 const distance=Math.hypot(scout.x-before.x,scout.z-before.z);
 const yaw=Math.abs(angle(scout.heading-before.heading));
 assert.ok(yaw<=distance/ENEMY_CAR_MIN_TURN_RADIUS+1e-8,
   'En cooperatiu el cotxe no pot girar sense moure les rodes');
 if(distance>.001)moved++;
 if(yaw>.001)turned++;
}
assert.ok(moved>150&&turned>5,'El jeep COOP avança i pren corbes');
const boot=source('src/bootstrap.mjs');
assert.ok(boot.includes('HUNTER_ENEMY_CAR_STEERING'),
  'El motor comparteix la cinematica a través del bootstrap');

globalThis.window={};
await import('../src/enemy-lod.js');
for(const type of ['jeep','tanqueta']){
  const root=new THREE.Group();
  window.HUNTER_ENEMY_LOD.optimize(THREE,root,type);
  const flag=root.userData.enemyFlag;
  assert.ok(flag?.isGroup,'El vehicle '+type+' porta bandera');
  assert.equal(flag.parent,root,'La bandera no pot desaparèixer amb el LOD');
  const mast=flag.getObjectByName('hunter-enemy-flag-mast');
  const cloth=flag.getObjectByName('hunter-enemy-hanging-red-flag');
  const arm=flag.getObjectByName('hunter-enemy-flag-arm');
  assert.ok(mast?.isMesh&&arm?.isMesh&&cloth?.isMesh);
  assert.ok(mast.geometry.parameters.radiusTop<.04&&
    arm.geometry.parameters.radiusTop<.04,'Màstil i suport negres i prims');
  assert.equal(mast.material.color.getHex(),0x11191b);
  assert.equal(cloth.material.color.getHex(),0xc82a27);
  assert.ok(cloth.geometry.getAttribute('position').count>=12,
    'La bandera té una superfície deformada que penja');
  for(const level of ['mid','far','full']){
    window.HUNTER_ENEMY_LOD.setLevel(root,level);
    assert.equal(flag.visible,true,'El distintiu no desapareix amb '+level);
  }
  root.traverse(o=>{o.geometry?.dispose?.();if(o.material?.dispose)o.material.dispose()});
}
console.log('Cotxes enemics: radi de gir real, cap pivot, sweeps, banderes visibles amb LOD i COOP compartit — OK');
