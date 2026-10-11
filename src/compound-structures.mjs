// Shared, batched static structures for the game and compound previews.
import * as T from '../vendor/three-r186.module.mjs';
export function createCompoundStructures(){
 const materials=new Map();
 const mat=(color,profile='paint')=>{const key=color+profile;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:profile==='metal'?.57:.92,metalness:profile==='metal'?.25:0,flatShading:true}));return materials.get(key)};
 const box=(g,w,h,d,c,x=0,y=0,z=0,profile='paint')=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c,profile));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m};
 const cylinder=(g,r,h,c,x,y,z)=>{const m=new T.Mesh(new T.CylinderGeometry(r,r,h,10),mat(c,'metal'));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};
 const rod=(g,a,b,r,c)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),6),mat(c,'metal'));m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());g.add(m);return m};

 function batch(source){
   source.updateMatrixWorld(true);const groups=new Map();
   source.traverse(o=>{if(!o.isMesh)return;const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g)});
   const result=new T.Group();result.userData={...source.userData};
   for(const [material,geometries] of groups){const geometry=new T.BufferGeometry();for(const name of ['position','normal']){const arrays=geometries.map(g=>g.getAttribute(name).array),data=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){data.set(a,offset);offset+=a.length}geometry.setAttribute(name,new T.BufferAttribute(data,3))}const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;result.add(mesh);geometries.forEach(g=>g.dispose())}
   const old=new Set();source.traverse(o=>{if(o.geometry)old.add(o.geometry)});old.forEach(g=>g.dispose());return result;
 }
 function antenna(a){
   const g=new T.Group();g.userData.previewAntenna=true;g.scale.setScalar(a.scale||1);
   box(g,8,.55,8,0x92948b,0,.25,0);
   for(let y=0;y<a.height/(a.scale||1);y+=4){const color=y%8?0xd8d8c4:0xa7463b,lower=2.7-y*.065,upper=2.7-(y+4)*.065;
     for(const dx of[-1,1])for(const dz of[-1,1])rod(g,[dx*lower,y,dz*lower],[dx*upper,y+4,dz*upper],.13,color);
     for(const side of[-1,1]){rod(g,[-lower,y,side*lower],[upper,y+4,side*upper],.07,color);rod(g,[lower,y,side*lower],[-upper,y+4,side*upper],.07,color);rod(g,[side*lower,y,-lower],[side*upper,y+4,upper],.07,color);rod(g,[side*lower,y,lower],[side*upper,y+4,-upper],.07,color)}
   }
   const dish=new T.Mesh(new T.SphereGeometry(2.2,16,8,0,Math.PI*2,0,Math.PI*.4),new T.MeshStandardMaterial({color:0xe4e5d8,roughness:.65,side:T.DoubleSide}));dish.rotation.x=Math.PI*.65;dish.position.set(0,18,3);g.add(dish);rod(g,[0,17,0],[0,18,3],.15,0x616b68);rod(g,[0,28,0],[0,31,0],.09,0xddddca);cylinder(g,.22,.4,0xec6545,0,31,0);
return batch(g);
}
function satellite(radius=9){
     // Roof assembly: olive paraboloid, radial ribs, lattice rim and feed tripod.
     const assembly=new T.Group();assembly.userData.previewSatellite=true;
     box(assembly,7,.5,7,0x59634a,0,.25,0);
     const pedestal=new T.Mesh(new T.CylinderGeometry(1.8,3,3.4,8),mat(0x606b4b));pedestal.position.y=2.2;assembly.add(pedestal);
     for(const x of[-2.6,2.6]){rod(assembly,[x,1.2,0],[x,5.5,0],.35,0x374439);rod(assembly,[x,2,-2],[x,5.5,0],.22,0x374439)}
     const dish=new T.Group();dish.position.y=6;dish.rotation.x=-.62;dish.rotation.y=.3;assembly.add(dish);
     const depth=2.7,segments=48,rings=10,vertices=[],indices=[];
     const point=(r,t,offset=0)=>[r*Math.cos(t),r*Math.sin(t),depth*(r/radius)**2+offset];
     for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++)vertices.push(...point(radius*j/rings,i*2*Math.PI/segments));
     for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const k=j*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1)}
     const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
     const bowl=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x7f8c59,side:T.DoubleSide,roughness:.83}));bowl.castShadow=bowl.receiveShadow=true;dish.add(bowl);
     for(let i=0;i<16;i++){const t=i*Math.PI/8,next=t+Math.PI/8;
       for(let j=0;j<10;j++)rod(dish,point(radius*j/10,t,-.16),point(radius*(j+1)/10,t,-.16),.09,0x374439);
       rod(dish,point(radius,t),point(radius,next),.12,0x354237);
       rod(dish,point(radius,t,-.7),point(radius,next,-.7),.10,0x354237);
       rod(dish,point(radius,t),point(radius,next,-.7),.07,0x354237);
     }
     for(const r of[radius*.35,radius*.65])for(let i=0;i<48;i++)rod(dish,point(r,i*Math.PI/24,.025),point(r,(i+1)*Math.PI/24,.025),.025,0x526044);
     for(let i=0;i<3;i++){const t=i*2*Math.PI/3+Math.PI/2;rod(dish,point(radius*.92,t),[0,0,6.3],.14,0x344137)}
     rod(dish,[0,0,5.7],[0,0,7],.48,0x506044);rod(dish,[0,0,7],[0,0,7.8],.12,0x344137);


return batch(assembly);
}
return {antenna,satellite};
}
