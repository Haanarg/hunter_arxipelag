import {createHash} from 'node:crypto';
import * as T from '../../vendor/three-r186.module.mjs';
import {playerBatching} from '../../src/player-batching-core.mjs';
export function turretTraces(models){
 const material=c=>new T.MeshStandardMaterial({color:c}),box=(g,w,h,d,c,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);g.add(m);return m;},
 create=models.createFactory(T,{box,material,shadows:false,batching:playerBatching}),traces={};
 for(const type of ['tanc','tanqueta']){
  const model=create(type),rows=[];model.position.set(17,2,-29);
  for(let i=0;i<600;i++){
   model.rotation.y=i*.037;const direction=new T.Vector3(Math.sin(i*.13),Math.sin(i*.19)*2,-Math.cos(i*.13)).normalize();
   const aligned=models.aimTurret(T,model,direction,[1/30,1/60,.12,0][i%4]),u=model.userData,gun=models.turretShot(T,model);
   rows.push([u.turretPivot.rotation.y,u.turretPitch.rotation.x,u.turretYawSpeed,u.turretPitchSpeed,...gun.origin.toArray(),...gun.direction.toArray()].map(n=>Math.round(n*1e9)).concat(aligned));
  }
  traces[type]=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
 }return traces;
}
