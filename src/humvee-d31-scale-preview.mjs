// Shared approved Humvee D3.1 geometry factory for preview AND gameplay.
// The preview compares scales; the actual military car is fixed at 175%
// by src/humvee-d31-runtime.mjs. Retain this single door/UV pipeline.
import {createTruckConcept} from './truck-concepts.mjs';
import {deriveSymmetricD3} from './humvee-d3-geometry.mjs';
import {HUMVEE_WHEEL_SPEC,removeOriginalTires} from './humvee-d31-refinements.mjs';
import {flattenSelectedDoorPatchOnAllDoors,SELECTED_D31_FRONT_PLUS_Z} from './humvee-d31-selected-patch.mjs';
let THREE=null;
const glassMode=true,meshMode=false;

function quad(points, material){
 const geometry=new THREE.BufferGeometry();
 const positions=new Float32Array(points.flat());
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
 return new THREE.Mesh(geometry,material);
}

function block(parent,material,x,y,z,sx,sy,sz){
 const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);
 m.position.set(x,y,z);parent.add(m);return m;
}
function seam(parent,material,a,b,r=.008){
 const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),6),material);
 mesh.position.copy(p).add(q).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
 parent.add(mesh);
}
function windowPanes(v){
 const g=new THREE.Group();g.name='fittedTransparentWindowPanes';
 const mat=new THREE.MeshPhysicalMaterial({color:v.tint,roughness:.12,metalness:0,
   transparent:true,opacity:.34,side:THREE.DoubleSide,depthWrite:false,
   polygonOffset:true,polygonOffsetFactor:-1});
 // Vehicle axis: front -X, up +Y, doors on +/-Z.
 // Glass is placed just inside the open frames, rather than as short central panes.
 for(const side of [-1,1]){
  g.add(quad([[-.790,1.242,side*1.093],[-.065,1.242,side*1.093],
     [-.106,1.714,side*.985],[-.748,1.714,side*.985]],mat));
  g.add(quad([[.076,1.242,side*1.093],[.772,1.242,side*1.093],
     [.727,1.708,side*.985],[.112,1.708,side*.985]],mat));
 }
 // Fill both the sloped windscreen and the rear glass opening.
 g.add(quad([[-.941,1.254,-.977],[-.941,1.254,.977],
   [-.810,1.713,.913],[-.810,1.713,-.913]],mat));
 g.add(quad([[.851,1.255,-.964],[.851,1.255,.964],
   [.796,1.703,.911],[.796,1.703,-.911]],mat));
 g.visible=glassMode&&!meshMode;return g;
}
function upgradeDetails(v){
 const g=new THREE.Group();g.name='D_'+v.id+'_details';
 const dark=new THREE.MeshStandardMaterial({color:0x202824,roughness:.87});
 const shadow=new THREE.MeshStandardMaterial({color:0x343c32,roughness:.91});
 const olive=new THREE.MeshStandardMaterial({color:0x707957,roughness:.90});
 const metal=new THREE.MeshStandardMaterial({color:0x979889,roughness:.75,metalness:.18});
 // Front fascia on the actual original front plane (-X).
 const x=-2.295;
 const grille=new THREE.Group();grille.name='visibleRadiatorGrille';g.add(grille);
 block(grille,dark,x+.020,.965,0,.024,.267,.89);
 if(v.grille==='deep'||v.grille==='faithful')block(grille,shadow,x-.007,.964,0,.018,.234,.79);
 const slots=v.grille==='slim'?9:7;
 const bw=v.grille==='deep'?.040:v.grille==='slim'?.019:.027;
 const barMat=v.grille==='slim'?metal:olive;
 for(let i=0;i<slots;i++){
  const z=-.351+i*.702/(slots-1);
  block(grille,barMat,x-.028,.966,z,.033,.213,bw);
 }
 block(grille,metal,x-.016,1.100,0,.036,.021,.89);
 block(grille,dark,x-.020,.828,0,.039,.022,.89);
 for(const z of [-.453,.453])block(grille,dark,x-.016,.964,z,.038,.263,.029);
 if(v.grille==='faithful')for(const z of [-.59,.59])block(grille,metal,x-.030,.977,z,.020,.105,.065);
 if(v.grille==='deep')for(const z of [-.58,.58])block(grille,shadow,x-.014,.956,z,.030,.196,.058);
 // A-inspired door edges, handles, waist strips and hinges.
 const doors=new THREE.Group();doors.name='doorMouldings';g.add(doors);
 if(!v.clean)for(const side of [-1,1]){
  const z=side*1.134;
  for(const cx of [-.446,.426]){
   const half=cx<0?.342:.333;
   seam(doors,shadow,[cx-half,1.280,z],[cx+half,1.280,z],.008);
   seam(doors,shadow,[cx-half,1.280,z],[cx-half,1.052,z],.007);
   seam(doors,shadow,[cx+half,1.280,z],[cx+half,1.052,z],.007);
   const dz=z+side*.015;
   block(doors,dark,cx+.147,1.266,dz,.126,.036,.024);
   if(v.doors==='faithful')block(doors,metal,cx+.145,1.273,dz+side*.018,.100,.011,.015);
   if(v.doors==='reinforced')block(doors,olive,cx,1.107,z+side*.011,.020,.090,.50);
  }
  if(v.doors!=='fine')seam(doors,shadow,[-.796,1.060,z],[.768,1.060,z],v.doors==='reinforced'?.018:.011);
  if(v.doors==='reinforced'){
   for(const x of [-.80,.78])block(doors,olive,x,1.09,z,.065,.19,.060);
  }
  if(v.doors==='classic'||v.doors==='faithful'){
   for(const x of [-.774,-.108,.096,.751]){
    for(const y of [1.144,1.225])block(doors,dark,x,y,z+side*.014,.027,.046,.019);
   }
  }
  if(v.doors==='faithful')for(const x of [-.755,.742]){
   seam(doors,metal,[x,1.074,z+side*.01],[x,1.239,z+side*.01],.012);
  }
 }
 return g;
}
function collectTriangleVertices(scene){
 scene.updateMatrixWorld(true);
 const triangles=[];
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry,attr=geometry.getAttribute('position'),uv=geometry.getAttribute('uv'),normal=geometry.getAttribute('normal'),index=geometry.index;
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const total=index?index.count:attr.count;
  const material=mesh.material;
  for(let i=0;i+2<total;i+=3){
   const face=[];
   for(let j=0;j<3;j++){
    const k=index?index.getX(i+j):i+j;
    const p=new THREE.Vector3().fromBufferAttribute(attr,k).applyMatrix4(mesh.matrixWorld);
    const n=normal?new THREE.Vector3().fromBufferAttribute(normal,k).applyNormalMatrix(normalMatrix):new THREE.Vector3(0,1,0);
    face.push({p:p.toArray(),uv:uv?[uv.getX(k),uv.getY(k)]:[0,0],n:n.toArray()});
   }
   triangles.push(face);
  }
 });
 return triangles;
}
function trianglesToGeometry(triangles){
 const p=[],uv=[],n=[];
 for(const face of triangles)for(const v of face){
  p.push(...v.p);uv.push(...v.uv);n.push(...v.n);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));
 g.computeBoundingSphere();
 return g;
}

function antennaPosterior(axis){
 const g=new THREE.Group();g.name='rearAntennaRestored';
 const housing=new THREE.MeshStandardMaterial({color:0x343b30,roughness:.83});
 const metal=new THREE.MeshStandardMaterial({color:0x7c8179,roughness:.62,metalness:.36});
 const x=1.87,z=axis+.79;
 block(g,housing,x,1.58,z,.16,.16,.14);
 seam(g,housing,[x,1.63,z],[x,1.89,z],.040);
 seam(g,metal,[x,1.88,z],[x+.026,2.37,z-.012],.014);
 const tip=new THREE.Mesh(new THREE.SphereGeometry(.032,7,5),metal);
 tip.position.set(x+.026,2.37,z-.012);g.add(tip);
 return g;
}
let truckWheelTemplate=null;
function truckA43Wheels(axis){
 if(!truckWheelTemplate){
  // Clone the genuine A4.3 wheel (tire, rim, centre), not a generic cylinder.
  const prototypeTruck=createTruckConcept(THREE,2);
  if(!prototypeTruck.userData.wheels?.length)throw Error('No es troben les rodes A4.3');
  truckWheelTemplate=prototypeTruck.userData.wheels[0].clone(true);
 }
 const g=new THREE.Group();g.name='humveeAxlesAndA43Wheels';
 const mountMaterial=new THREE.MeshStandardMaterial({color:0x333b31,roughness:.89});
 const {axles,centerY,offsetZ,truckScale}=HUMVEE_WHEEL_SPEC;
 for(const x of axles){
  // Both ends are connected to the same chassis axle, inside the body.
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.078,.078,offsetZ*1.97,8),mountMaterial);
  axle.rotation.x=Math.PI/2;
  axle.position.set(x,centerY,axis);
  axle.name='humveeAxle_'+x;g.add(axle);
  for(const side of [-1,1]){
   const w=truckWheelTemplate.clone(true);
   w.name='humvee-truck-wheel-'+x+'-'+side;
   w.position.set(x,centerY,axis+side*offsetZ);
   w.rotation.set(0,Math.PI/2,0); // Truck axle X -> Humvee axle Z
   w.scale.setScalar(truckScale); // .80 * .625 = 0.50 radius, like original Humvee
   w.userData.radius=HUMVEE_WHEEL_SPEC.radius;
   w.userData.axleX=x;
   w.userData.side=side;
   g.add(w);
  }
 }
 return g;
}
function meshTriangleCount(object){
 let faces=0;
 object.traverse(o=>{
  if(!o.isMesh)return;
  const g=o.geometry,draw=g.index?g.index.count:g.getAttribute('position').count;
  faces+=Math.floor(draw/3);
 });
 return faces;
}


// Exact same transformation pipeline as the approved D3.1 web preview.
export async function loadApprovedHumveeD31(T,GLTFLoader){
 THREE=T;
 const gltf=await new GLTFLoader().loadAsync('assets/humvee/humvee_D.glb');
 const source=gltf.scene;
 source.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(source);
 const center=bounds.getCenter(new T.Vector3());
 const meshes=[];source.traverse(o=>{if(o.isMesh)meshes.push(o);});
 if(!meshes.length)throw new Error('El GLB D del Humvee no conté cap malla');
 const referenceMaterial=Array.isArray(meshes[0].material)?meshes[0].material[0]:meshes[0].material;
 const triangles=collectTriangleVertices(source);
 const zValues=triangles.flatMap(t=>t.map(v=>v.p[2])).sort((a,b)=>a-b);
 const axis=(zValues[Math.floor(.05*(zValues.length-1))]+zValues[Math.floor(.95*(zValues.length-1))])*.5;
 const reduced=deriveSymmetricD3(triangles,axis,[2200],{dropDoorFacets:false})[0];
 const withoutOldTires=removeOriginalTires(reduced.triangles,axis);
 const approved=flattenSelectedDoorPatchOnAllDoors(withoutOldTires.triangles,axis,SELECTED_D31_FRONT_PLUS_Z);
 return {center,axis,material:referenceMaterial,triangles:approved.triangles,sourceFaces:reduced.faces,stats:approved.stats};
}
// The render rig faces -Z, like the current HUNTER_VEHICLES factory.
// The original GLB itself faced -X. Both are grounded at Y=0.
export function createApprovedHumveeD31(prepared,scale=1){
 if(!THREE)throw new Error('Carrega primer el GLB del Humvee');
 const root=new THREE.Group();
 root.name='Humvee D3.1 · quatre portes aplanades';
 const oriented=new THREE.Group();
 oriented.rotation.y=-Math.PI/2;root.add(oriented);
 const model=new THREE.Group();
 model.position.set(-prepared.center.x,0,-prepared.axis);
 oriented.add(model);
 const material=prepared.material.clone();
 const hull=new THREE.Mesh(trianglesToGeometry(prepared.triangles),material);
 hull.castShadow=hull.receiveShadow=true;
 hull.name='D31_flattened_body';model.add(hull);
 // Wheels from the game truck A4.3 (same components, same scaling).
 const wheels=truckA43Wheels(prepared.axis);
 model.add(wheels);
 const antenna=antennaPosterior(prepared.axis);
 model.add(antenna);
 const v={id:'D31-game-scale',tint:0xa3bfc0,grille:'slim',doors:'fine'};
 const windows=windowPanes(v);windows.position.z=prepared.axis;model.add(windows);
 const details=upgradeDetails(v);details.position.z=prepared.axis;model.add(details);
 root.scale.setScalar(scale);
 root.updateMatrixWorld(true);
 const floorBox=new THREE.Box3().setFromObject(root);
 root.position.y-=floorBox.min.y;
 root.userData.scaleFactor=scale;
 root.userData.source='Original humvee_D.glb → D3.1 symmetrical → new tyres → four flattened door patches';
 root.userData.bodyTriangles=prepared.triangles.length;
 return root;
}
