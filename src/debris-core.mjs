// Renderer-free extraction of the original solo debris and palm effects.
export function createDebrisParticle(x,y,z,size,speed,random){
 const s=random(.4,1)*size,sy=s*random(.5,1.2),px=x+random(-1,1),pz=z+random(-1,1),rx0=random(0,3),ry0=random(0,3);
 return {position:{x:px,y,z:pz},rotation:{x:rx0,y:ry0,z:0},scale:{x:s,y:sy,z:s},vx:random(-speed,speed),vy:random(speed*.4,speed*1.3),vz:random(-speed,speed),rx:random(-6,6),life:random(1.2,2)};
}
export function stepDebrisParticle(d,position,rotation,dt,heightAt){
 d.vy-=28*dt;position.x+=d.vx*dt;position.y+=d.vy*dt;position.z+=d.vz*dt;rotation.x+=d.rx*dt;rotation.y+=(d.ry||0)*dt;rotation.z+=(d.rz||0)*dt;
 const ground=Math.max(0,heightAt(position.x,position.z))+.2;
 if(position.y<ground){position.y=ground;d.vy*=-.3;d.vx*=.6;d.vz*=.6;const spin=d.truckPiece?.38:.82;d.rx*=spin;if(d.ry)d.ry*=spin;if(d.rz)d.rz*=spin;}
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
