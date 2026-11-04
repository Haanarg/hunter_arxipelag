import {inView} from './combat-rules.mjs';
// Extracted from stealth.js and enemy-ai.js. Geometry remains in each world adapter.
export const CONFIG=Object.freeze({sightRange:85,sightHalfAngle:Math.PI*50/180,
 sightVerticalAngle:Math.PI*33/180,searchSeconds:9,investigateSeconds:11,
 closeRecognition:4,crouchVisibility:.58});
export const SOLDIER=Object.freeze({senseSeconds:.1,memorySeconds:9,retreat:9,ideal:17,fireRange:125});
export function soldierView(observer,target,{crouched=false,disguised=false,inVehicle=false,sameBasement=false}={}){
 crouched=!!crouched&&!inVehicle;
 const dx=target.x-observer.x,dz=target.z-observer.z,d=Math.hypot(dx,dz),eyeY=observer.y+2.2,
  targetEye=target.y+(crouched?1.25:1.5),range=inVehicle?115:CONFIG.sightRange*(observer.elite?1.30:1)*(crouched?CONFIG.crouchVisibility:1)*(disguised&&!inVehicle?.35:1),
  facing=(-Math.sin(observer.heading)*dx-Math.cos(observer.heading)*dz)/Math.max(.01,d),
  eliteAwareness=!inVehicle&&observer.elite&&sameBasement&&(d<7||facing>Math.cos(80*Math.PI/180))&&Math.abs(targetEye-eyeY)<8;
 return d<=range&&(eliteAwareness||inView(observer.heading,dx,targetEye-eyeY,dz,range,CONFIG));
}
export function recognizeSoldier(current,raw,distance,crouched=false,dt=SOLDIER.senseSeconds){
 return Math.max(0,Math.min(1.5,(current||0)+(raw?dt*(distance<12?4:crouched?.9:2):-dt*3)));
}
export function soldierAccuracyProfile(unit){return unit.rocketSoldier?'bazooka':unit.elite?'elite':'rifle';}

// L'especial del vehicle comparteix tipus i radi als dos simuladors.
export const VEHICLE_SIGNAL_SOUNDS=Object.freeze({
 cotxe:'hornCar',cotxe_civil:'hornCar',camio:'hornTruck',
 moto:'hornMoto',bici:'bikeBell'
});
export const RADII=Object.freeze({walk:7,run:25,crouch:2,swim:12,knife:3,cutters:3,
    bikeBell:35,hornMoto:105,hornCar:135,hornTruck:185,
    door:10,pistol:140,sniper:220,bazooka:250,rifle:160,explosion:300,
    bicycle:5,motorbike:90,car:70,civilianCar:112,truck:130,tank:130,apc:120,
    rowboat:5,windsurf:5,jetski:100,speedboat:120,ferry:125,
    helicopter:250,collision:100,grenade:7,alert:65});
export function heardPosition(listener,noise){
 const uncertainty=noise.kind==='alert'?0:noise.radius>=100?4:1.5;
 return {x:noise.x+Math.sin(listener.x+noise.id)*uncertainty,
  y:noise.y,z:noise.z+Math.cos(listener.z+noise.id)*uncertainty};
}
