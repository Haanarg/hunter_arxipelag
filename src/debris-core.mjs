// Renderer-free extraction of the original solo debris and palm effects.
export function createDebrisParticle(x,y,z,size,speed,random){
 const s=random(.4,1)*size,sy=s*random(.5,1.2),px=x+random(-1,1),pz=z+random(-1,1),rx0=random(0,3),ry0=random(0,3);
 return {position:{x:px,y,z:pz},rotation:{x:rx0,y:ry0,z:0},scale:{x:s,y:sy,z:s},vx:random(-speed,speed),vy:random(speed*.4,speed*1.3),vz:random(-speed,speed),rx:random(-6,6),life:random(1.2,2)};
}
// Les carrosseries lleugeres es desfan en peces reals del model, però
// no creen una ona expansiva ni afecten els PV del que hi ha a prop.
// Paràmetres independents per a bicicleta, barca de rems i windsurf.
export const FRAGILE_VEHICLE_PROFILES=Object.freeze({
  bici:Object.freeze({maxPieces:17,impulse:17,lift:19,spin:10,
    lifetime:3.2,scatter:7,waterFloat:0,crumbs:5,color:0x546568}),
  barca_rems:Object.freeze({maxPieces:16,impulse:13,lift:14,spin:7,
    lifetime:3.5,scatter:7,waterFloat:1.6,crumbs:7,color:0x956b42}),
  windsurf:Object.freeze({maxPieces:13,impulse:16,lift:17,spin:8,
    lifetime:3.6,scatter:8,waterFloat:1.15,crumbs:5,color:0xb1c3bc})
});
export function fragileVehicleFragmentMotion(type,position,center,heading=0,vehicleSpeed=0,random=(a,b)=>(a+b)/2){
  const profile=FRAGILE_VEHICLE_PROFILES[type];
  if(!profile)throw new RangeError('Tipus de vehicle fràgil desconegut: '+type);
  const dx=position.x-center.x,dz=position.z-center.z,
        distance=Math.max(.25,Math.hypot(dx,dz)),
        forward=-Math.sin(heading)*Math.max(-22,Math.min(22,vehicleSpeed)),
        along=-Math.cos(heading)*Math.max(-22,Math.min(22,vehicleSpeed));
  return {
    vx:dx/distance*random(profile.impulse*.65,profile.impulse)+
      random(-profile.scatter,profile.scatter)+forward*.6,
    vy:random(profile.lift*.6,profile.lift*1.25),
    vz:dz/distance*random(profile.impulse*.65,profile.impulse)+
      random(-profile.scatter,profile.scatter)+along*.6,
    rx:random(-profile.spin,profile.spin),
    ry:random(-profile.spin,profile.spin),
    rz:random(-profile.spin,profile.spin),
    life:random(profile.lifetime*.8,profile.lifetime*1.15),
    vehiclePart:true,fragilePart:true,
    waterFloat:profile.waterFloat,
    waterAge:0,
    waterOffset:random(-.08,.1)
  };
}
export function stepDebrisParticle(d,position,rotation,dt,heightAt,waterHeightAt=null){
 d.vy-=28*dt;position.x+=d.vx*dt;position.y+=d.vy*dt;position.z+=d.vz*dt;
 rotation.x+=d.rx*dt;rotation.y+=(d.ry||0)*dt;rotation.z+=(d.rz||0)*dt;
 const terrain=heightAt(position.x,position.z),ground=Math.max(0,terrain)+.2,
       surface=d.fragilePart&&d.waterFloat&&waterHeightAt?
         waterHeightAt(position.x,position.z):null,
       onWater=surface!==null&&Number.isFinite(surface)&&surface>terrain+.65;
 if(onWater&&position.y<=surface+(d.waterOffset||0)){
   d.waterAge=(d.waterAge||0)+dt;
   // Primer els fragments floten i perden velocitat; després s'enfonsen.
   const sinking=Math.max(0,d.waterAge-d.waterFloat);
   position.y=Math.max(terrain+.12,surface+(d.waterOffset||0)-sinking*.8);
   d.vy=0;const drag=Math.exp(-2.8*dt);
   d.vx*=drag;d.vz*=drag;
   d.rx*=drag;d.ry*=drag;d.rz*=drag;
 }else if(position.y<ground){
   position.y=ground;d.vy*=-.3;d.vx*=.6;d.vz*=.6;
   const spin=d.truckPiece?.38:.82;
   d.rx*=spin;if(d.ry)d.ry*=spin;if(d.rz)d.rz*=spin;
 }
 d.life-=dt;return Math.max(0,Math.min(1,d.life/(d.vehiclePart?.55:.4)));
}
export function dustFrame(life,max,size){return {scale:size*(1+(1-life/max)*1.15),opacity:Math.max(0,life/max)*.8};}
export function palmFallFrame(row,time,heightAt){
 const progress=Math.min(1,time/.9),c=Math.cos(row.yaw),s=Math.sin(row.yaw),x=row.x+c*6.4*row.s,z=row.z-s*6.4*row.s,y=Math.max(heightAt(x,z),0)+.6;
 return {progress,angle:-progress*progress*1.5,
  leaves:{x,y,z,color:0x4fa03a,count:8,size:1,speed:5},
  wood:{x:row.x+c*3*row.s,y,z:row.z-s*3*row.s,color:0x8a6a3a,count:4,size:.7,speed:3},
  dust:{x,y,z,color:0xc9b48a,size:3}};
}
