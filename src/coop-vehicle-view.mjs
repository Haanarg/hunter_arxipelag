import {prepareHumveeD31Runtime} from './humvee-d31-runtime.mjs';
import {vehicleModels} from './vehicle-model-core.mjs';
import {playerBatching} from './player-batching-core.mjs';
import {createTruckModel} from './truck-model.mjs';
import {createCivilianCarModel} from './civilian-car-model.mjs';
export async function createVehicleView(T,scene){
 const humvee=await prepareHumveeD31Runtime(T),meshes=new Map();
 const material=(color,profile)=>new T.MeshStandardMaterial({color,flatShading:true,roughness:.86,metalness:profile==='metal'?.25:0,transparent:profile==='glass',opacity:profile==='glass'?.5:1});
 const box=(g,w,h,d,color,x,y,z,profile)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material(color,profile));mesh.position.set(x,y,z);g.add(mesh);return mesh;};
 const create=vehicleModels.createFactory(T,{box,material,shadows:false,humvee,truck:createTruckModel,civilianCar:createCivilianCarModel,batching:playerBatching});
 function remove(id){const group=meshes.get(id);scene.remove(group);group.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});meshes.delete(id);}
 return {update(vehicles=[],dt=1/30){const live=new Set(vehicles.filter(v=>!v.destroyed).map(v=>v.id));for(const id of meshes.keys())if(!live.has(id))remove(id);
  for(const v of vehicles){if(v.destroyed)continue;let group=meshes.get(v.id);if(!group){group=new T.Group();group.userData.vehicleId=v.id;
    const model=v.modelScale?create(v.t):humvee.create();
    model.traverse(o=>{if(o.geometry)o.geometry=o.geometry.clone();if(o.material)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});
    if(!v.modelScale)model.scale.setScalar(3.2/humvee.dimensions.length);group.add(model);meshes.set(v.id,group);scene.add(group);
   }group.position.set(v.x,v.y,v.z);group.rotation.y=v.hd;
   const model=group.children[0];if(model.userData.turretPivot)model.userData.turretPivot.rotation.y=v.turretYaw||0;if(model.userData.turretPitch)model.userData.turretPitch.rotation.x=v.turretPitch||0;vehicleModels.animateSteering(model,v.t,v.steerInput||0,dt);
   for(const wheel of model.userData.wheels||[])wheel.rotation.x-=(v.v||0)*dt/Math.max(.1,wheel.userData.radius||.5);
   if(model.userData.rotor)model.userData.rotor.rotation.y+=dt*30;
   if(model.userData.fan)model.userData.fan.rotation.z+=dt*35;
  }
 },destroy(){for(const id of [...meshes.keys()])remove(id);}};
}
