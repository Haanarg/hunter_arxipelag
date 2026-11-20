// Numeric actor anchors shared by renderers, SOLO and the authoritative COOP Worker.
// These are *not* mesh dimensions. Enemy crews are mounted AFTER the vehicle's
// historical VS factor has been baked, so no vehicle-scale multiplication here.
export const COMMANDO_HEAD_PIVOT_HEIGHT=3.26; // measured native V18 crew head / baked size
export const TRUCK_CABIN=Object.freeze({
 driverVisual:Object.freeze([-0.6314,1.4514,-1.5826]),
 enemySeat:Object.freeze({x:.6314,y:1.6728,z:-1.5826}),
 gunMount:Object.freeze({x:1.6236,y:2.5174,z:-1.6646})
});
const PROFILE=Object.freeze({
 cotxe:Object.freeze({halfX:.73,y:.94,z:-.43,size:.43}),
 jeep:Object.freeze({halfX:.73,y:.94,z:-.43,size:.43}),
 cotxe_civil:Object.freeze({halfX:.613,y:.94,z:-.60,size:.43}),
 camio:Object.freeze({halfX:TRUCK_CABIN.enemySeat.x,
  y:TRUCK_CABIN.enemySeat.y,z:TRUCK_CABIN.enemySeat.z,size:.31}),
 moto:Object.freeze({halfX:0,y:.87,z:.34,size:.52}),
 llanxa:Object.freeze({halfX:.58,y:.89,z:.88,passengerZ:1.14,size:.43}),
 llanxa_coets:Object.freeze({halfX:.58,y:.89,z:.88,passengerZ:1.14,size:.43}),
 patrulla_marina:Object.freeze({halfX:.58,y:.89,z:.88,passengerZ:1.14,size:.43})
});
export function enemyCrewLocalSeat(type,seat=0){
 const p=PROFILE[type];
 if(!p)return null;
 if(seat!==0&&seat!==1)throw new RangeError('Invalid enemy crew seat');
 return {x:(seat===0?-1:1)*p.halfX,y:p.y,
  z:seat===1&&p.passengerZ!==undefined?p.passengerZ:p.z,
  size:p.size};
}
export function enemyCrewLocalHead(type,seat=0){
 const mount=enemyCrewLocalSeat(type,seat);
 return mount?{x:mount.x,y:mount.y+COMMANDO_HEAD_PIVOT_HEIGHT*mount.size,
  z:mount.z}:null;
}

// Two V18 cockpit pilots already exist in the approved Ka-60 / Mi-24D.
// Their renderer uses the same unscaled seat definition as this pure
// authoritative worker geometry. "worldUnits" is the APPROVED vehicle
// geometry conversion baked before the aircraft is used (not a rider scale).
export const HELICOPTER_CREW_PROFILES=Object.freeze({
 heli:Object.freeze({
  worldUnits:2,pilotHeight:2.6,
  seats:Object.freeze([Object.freeze([-.49,1.34-.27,-2.65]),
    Object.freeze([.49,1.34-.27,-2.65])])
 }),
 heli_combat:Object.freeze({
  worldUnits:1.82,pilotHeight:1.30*1.82,
  seats:Object.freeze([Object.freeze([0,1.98-.27,-3.08]),
    Object.freeze([0,1.32-.27,-4.96])])
 })
});
// Calibrated fraction of the actual V18 soldier head JOINT above the native
// model root, not the top of the cap or a guessed legacy seat coordinate.
// Geometry integration tests verify this against the real pilot Object3D.
// The V18 soldier joint is not exactly on the model's vertical axis.
// Calibrated in the THREE unit integration test from the Ka-60 cockpit's
// real joint after geometry bake: y/height=.8772628800234769,
// z/height=.02873792193180351 in the pilot's own upright coordinates.
export const HELICOPTER_HEAD_JOINT_Y_FRACTION=.8772628800234769;
export const HELICOPTER_HEAD_JOINT_Z_FRACTION=.02873792193180351;
export const HELICOPTER_PILOT_LEAN_X=-.08;
export function helicopterCrewLocalSeat(type,seat=0){
 const p=HELICOPTER_CREW_PROFILES[type];
 if(!p)return null;
 if(seat!==0&&seat!==1)throw new RangeError('Invalid cockpit seat');
 const q=p.seats[seat],sc=p.worldUnits;
 return {x:q[0]*sc,y:q[1]*sc,z:q[2]*sc};
}
export function helicopterCrewLocalHead(type,seat=0){
 const p=HELICOPTER_CREW_PROFILES[type],q=helicopterCrewLocalSeat(type,seat);
 if(!p)return null;
 const localY=p.pilotHeight*HELICOPTER_HEAD_JOINT_Y_FRACTION,
       localZ=p.pilotHeight*HELICOPTER_HEAD_JOINT_Z_FRACTION,
       c=Math.cos(HELICOPTER_PILOT_LEAN_X),
       sn=Math.sin(HELICOPTER_PILOT_LEAN_X);
 return {...q,y:q.y+localY*c-localZ*sn,
   z:q.z+localY*sn+localZ*c};
}
