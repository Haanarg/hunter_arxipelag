export function createVehicleView(T,scene){
 const meshes=new Map();
 function remove(id){const group=meshes.get(id);scene.remove(group);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});meshes.delete(id);}
 return {update(vehicles=[]){const live=new Set(vehicles.map(v=>v.id));for(const id of meshes.keys())if(!live.has(id))remove(id);
  for(const v of vehicles){let group=meshes.get(v.id);if(!group){group=new T.Group();group.userData.vehicleId=v.id;
   function box(w,h,d,x,y,z,color){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:1}));m.position.set(x,y,z);group.add(m);}
   box(1.8,.65,3.2,0,.75,0,0x62774c);box(1.7,.4,1.05,0,1.18,-1,0x708559);box(1.6,.15,.12,0,1.8,-.4,0xc4d4c5);box(.12,.7,.12,-.75,1.5,-.4,0x62774c);box(.12,.7,.12,.75,1.5,-.4,0x62774c);
   for(const x of [-1,1])for(const z of [-1,1])box(.4,.7,.7,x,.4,z,0x242c28);
   meshes.set(v.id,group);scene.add(group);}
   group.position.set(v.x,v.y,v.z);group.rotation.y=v.hd;
  }
 },destroy(){for(const id of meshes.keys())remove(id);}};
}
