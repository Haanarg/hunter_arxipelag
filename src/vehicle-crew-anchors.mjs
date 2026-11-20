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
