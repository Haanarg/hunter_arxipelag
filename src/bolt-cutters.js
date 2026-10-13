// Cisalla articulada compartida pel personatge i l'objecte del món.
window.HUNTER_BOLT_CUTTERS=Object.freeze({
 create(T){
  const root=new T.Group();root.name='hunter-bolt-cutters';
  const red=new T.MeshStandardMaterial({color:0xb83f38,roughness:.84}),
    steel=new T.MeshStandardMaterial({color:0x98a8ac,roughness:.38,metalness:.68}),
    edge=new T.MeshStandardMaterial({color:0xd2dcdf,roughness:.29,metalness:.78}),
    dark=new T.MeshStandardMaterial({color:0x374247,roughness:.52,metalness:.43});
  const arms=[];
  for(const sign of [-1,1]){
   const arm=new T.Group();root.add(arm);arms.push(arm);
   const rod=(h,r,x,y,mat,angle=0)=>{
    const mesh=new T.Mesh(new T.CylinderGeometry(r*.9,r,h,7),mat);
    mesh.position.set(x,y,0);mesh.rotation.z=angle;arm.add(mesh);
   };
   rod(1.20,.105,sign*.17,-.68,red,sign*.12);
   rod(.55,.068,sign*.074,.18,steel,-sign*.22);
   const blade=new T.Mesh(new T.BoxGeometry(.09,.41,.15),edge);
   blade.position.set(sign*.029,.55,-.02);blade.rotation.z=-sign*.16;arm.add(blade);
   rod(.15,.13,sign*.15,-.21,dark);
   arm.rotation.z=sign*.16;
  }
  for(const [z,r,mat] of [[0,.145,dark],[.11,.062,steel]]){
   const pivot=new T.Mesh(new T.CylinderGeometry(r,r,.20,10),mat);
   pivot.rotation.x=Math.PI/2;pivot.position.set(0,-.025,z);root.add(pivot);
  }
  root.userData.bladeArms=arms;return root;
 },
 pose(root,closing=0){
  if(!root?.userData?.bladeArms)return;
  const k=Math.max(0,Math.min(1,closing));
  root.userData.bladeArms.forEach((a,i)=>{a.rotation.z=(i?1:-1)*(.16-.24*k)});
 }
});