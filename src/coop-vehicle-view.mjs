import {prepareHumveeD31Runtime} from './humvee-d31-runtime.mjs';
// The individual game's approved Humvee, adapted only to the relay's small footprint.
export async function createVehicleView(T,scene){
 const factory=await prepareHumveeD31Runtime(T,{vehicleScale:1}),meshes=new Map();
 function remove(id){const group=meshes.get(id);scene.remove(group);group.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});meshes.delete(id);}
 return {update(vehicles=[]){const live=new Set(vehicles.map(v=>v.id));for(const id of meshes.keys())if(!live.has(id))remove(id);
  for(const v of vehicles){let group=meshes.get(v.id);if(!group){group=new T.Group();group.userData.vehicleId=v.id;const model=factory.create();
    // Own disposable instances; the individual factory's cached buffers stay intact.
    model.traverse(o=>{if(o.geometry)o.geometry=o.geometry.clone();if(o.material)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});
    model.scale.setScalar(3.2/factory.dimensions.length);group.add(model);meshes.set(v.id,group);scene.add(group);
   }group.position.set(v.x,v.y,v.z);group.rotation.y=v.hd;
  }
 },destroy(){for(const id of meshes.keys())remove(id);}};
}
