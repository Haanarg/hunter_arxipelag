import * as THREE from '../vendor/three-r186.module.mjs';

// Peces del BTR-82 3B compartides pel banc de proves i el joc.
// Al joc se'n fa una sola malla amb colors de vèrtex per estalviar draw calls.
const armour=new THREE.MeshStandardMaterial({color:0x59684f,flatShading:true,roughness:.94});
const visionArmour=new THREE.MeshStandardMaterial({color:0x5f6c53,flatShading:true,roughness:.93});
const hatch=new THREE.MeshStandardMaterial({color:0x485741,flatShading:true,roughness:.95});
const trim=new THREE.MeshStandardMaterial({color:0x29342e,roughness:.82,metalness:.20});
const steel=new THREE.MeshStandardMaterial({color:0x747d70,roughness:.78,metalness:.23});
const glass=new THREE.MeshStandardMaterial({color:0x15292c,roughness:.28,metalness:.3});
const lamp=new THREE.MeshStandardMaterial({color:0xf5e2a9,emissive:0x4a3717,roughness:.43});
const red=new THREE.MeshStandardMaterial({color:0xa84631,roughness:.46});

function slab(group,name,w,h,d,x,y,z,mat,rx=0){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 mesh.name=name;
 mesh.position.set(x,y,z);
 mesh.rotation.x=rx;
 mesh.castShadow=true;mesh.receiveShadow=true;
 group.add(mesh);
 return mesh;
}
function rail(group,name,a,b,r=.044){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
 const vec=end.clone().sub(start);
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,vec.length(),7),steel);
 mesh.name=name;
 mesh.position.copy(start).add(end).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec.normalize());
 mesh.castShadow=true;
 group.add(mesh);
 return mesh;
}
function light(group,name,x,y,z,mat,diameter,depth){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(diameter/2,diameter/2,depth,10),mat);
 mesh.name=name;
 mesh.position.set(x,y,z);
 mesh.rotation.x=Math.PI/2;
 mesh.castShadow=true;group.add(mesh);
 return mesh;
}

// El BTR-82 3B porta 4 eixos: el buit entre el segon (-.938) i
// el tercer (+1.7505) queda centrat a Z=.40625. La comporta s'adapta
// als dos pendents del blindatge lateral, sense quedar flotant sobre el casc.
export const BTR82_3B_SIDE_ACCESS=Object.freeze({
 centreZ:(-.938+1.7505)/2,frameHalfLength:.47,leafHalfLength:.405,
 frameBottom:1.025,frameShoulder:1.37,frameTop:1.59
});
function sideAccessProfileX(y){
 // Pla angular fort: falda (1.80), espatlla (1.95), bisell (1.63).
 const profile=[[1.025,1.80],[1.37,1.952],[1.59,1.632]];
 for(let i=1;i<profile.length;i++){
  if(y<=profile[i][0]){
   const [ya,xa]=profile[i-1],[yb,xb]=profile[i];
   return xa+(xb-xa)*(y-ya)/(yb-ya);
  }
 }
 return profile.at(-1)[1];
}
function sideAccessPanel(group,name,side,ys,halfLength,outset,mat){
 const {centreZ}=BTR82_3B_SIDE_ACCESS,positions=[];
 for(const y of ys)for(const z of [centreZ-halfLength,centreZ+halfLength])
  positions.push(side*(sideAccessProfileX(y)+outset),y,z);
 const indices=[];
 for(let band=0;band<ys.length-1;band++){
  const a=band*2;
  // Normals cap a fora del blindatge, també per al costat esquerre.
  if(side>0)indices.push(a,a+2,a+1,a+1,a+2,a+3);
  else indices.push(a,a+1,a+2,a+1,a+3,a+2);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const mesh=new THREE.Mesh(geometry,mat);
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
 group.add(mesh);return mesh;
}
function addSideAccessDoor(group,side){
 const label=side<0?'left':'right',
  z=BTR82_3B_SIDE_ACCESS.centreZ;
 // Borda fosca estreta i placa blindada del mateix verd de la carrosseria.
 sideAccessPanel(group,'BTR82_3B_side_access_'+label+'_outline',side,
  [1.025,1.37,1.59],BTR82_3B_SIDE_ACCESS.frameHalfLength,.048,trim);
 sideAccessPanel(group,'BTR82_3B_side_access_'+label+'_leaf',side,
  [1.067,1.37,1.548],BTR82_3B_SIDE_ACCESS.leafHalfLength,.066,armour);
 // Dues frontisses a la vora davantera (-Z), una nansa a la posterior.
 const hingeZ=z-.424;
 for(const [i,y] of [1.155,1.45].entries()){
  const x=side*(sideAccessProfileX(y)+.094);
  rail(group,'BTR82_3B_side_access_'+label+'_hinge_'+i,
   [x,y-.055,hingeZ],[x,y+.055,hingeZ],.030);
 }
 const handleY=1.255,handleZ=z+.286,
   handleX=side*(sideAccessProfileX(handleY)+.096);
 slab(group,'BTR82_3B_side_access_'+label+'_latch',.060,.15,.15,
  handleX,handleY,handleZ,trim);
 rail(group,'BTR82_3B_side_access_'+label+'_handle',
  [handleX+side*.045,handleY-.048,handleZ],
  [handleX+side*.045,handleY+.048,handleZ],.020);
}

export function applyBtr823BDetails(scene){
 if(scene.getObjectByName('BTR82_3B_hardware'))throw new Error('Detalls 3B duplicats');
 const group=new THREE.Group();
 group.name='BTR82_3B_hardware';
 // La carrosseria del comparador es rebaixa 18 cm respecte a les rodes.
 group.position.y=-.18;
 scene.add(group);

 // Proteccions posteriors visibles de tres quarts i des del darrere.
 for(const side of [-1,1]){
  const label=side<0?'left':'right',x=side*1.34;
  rail(group,'BTR82_3B_rear_guard_'+label+'_lower',[x,.77,5.55],[x,1.31,5.55],.052);
  rail(group,'BTR82_3B_rear_guard_'+label+'_upper',[x,1.31,5.55],[x,1.61,5.09],.052);
  rail(group,'BTR82_3B_rear_guard_'+label+'_side',[x,.92,5.55],[side*1.59,1.05,4.79],.045);
  slab(group,'BTR82_3B_rear_light_case_'+label,.27,.18,.12,
   side*1.13,1.28,5.48,trim);
  slab(group,'BTR82_3B_rear_light_'+label,.19,.11,.04,
   side*1.13,1.28,5.55,red);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.13,.037,5,9),steel);
  ring.name='BTR82_3B_rear_tow_eye_'+label;
  ring.position.set(side*.96,.66,5.55);
  ring.rotation.x=Math.PI/2;
  group.add(ring);
 }
 rail(group,'BTR82_3B_rear_guard_crossbar',[-1.34,1.0,5.60],[1.34,1.0,5.60],.065);
 slab(group,'BTR82_3B_rear_bumper',2.86,.15,.16,0,.63,5.57,armour);

 // Trapes d'accés i reixetes del compartiment superior posterior.
 for(const side of [-1,1]){
  const label=side<0?'left':'right',x=side*.62;
  slab(group,'BTR82_3B_rear_hatch_'+label,1.02,.075,1.10,
   x,1.825,3.43,armour);
  slab(group,'BTR82_3B_rear_hatch_rim_'+label,1.12,.033,1.2,
   x,1.795,3.43,hatch);
  for(const offset of [-.43,.43])
   slab(group,'BTR82_3B_hatch_hinge_'+label+'_'+offset,
    .12,.045,.10,x+offset,1.865,3.94,steel);
  slab(group,'BTR82_3B_rear_vent_frame_'+label,1.02,.045,.66,
   x,1.828,4.56,hatch);
  for(let index=0;index<5;index++)
   slab(group,'BTR82_3B_vent_slit_'+label+'_'+index,
    .88,.024,.049,x,1.862,4.32+index*.112,trim);
  rail(group,'BTR82_3B_rear_deck_rail_'+label,
   [side*1.32,1.91,3.62],[side*1.32,1.91,4.87],.036);
  for(const z of [3.62,4.87])
   rail(group,'BTR82_3B_deck_rail_post_'+label+'_'+z,
    [side*1.32,1.79,z],[side*1.32,1.91,z],.035);
 }
 slab(group,'BTR82_3B_rear_access_latch',.36,.055,.18,0,1.855,4.08,steel);

 // Una comporta d'accés a cada lateral, només entre els eixos 2 i 3.
 for(const side of [-1,1])addSideAccessDoor(group,side);

 // Mirilles horitzontals apuntant endavant, paral·leles al terra.
 // La caixa de blindatge penetra cap endins del xassís fins a Z=-3.66,
 // tapant la separació que deixaven les antigues peces inclinades.
 for(const side of [-1,1]){
  const label=side<0?'left':'right';
  slab(group,'BTR82_3B_front_vision_frame_'+label,.60,.21,.82,
   side*.60,1.62,-4.07,visionArmour);
  // Vidre negre a la cara DAVANTERA (-Z), no a la tapa superior.
  // La lent entra lleugerament dins la carcassa per evitar una junta oberta.
  slab(group,'BTR82_3B_front_vision_glass_'+label,.48,.13,.045,
   side*.60,1.63,-4.495,glass);
 }
 // Dos parells de focus amb carcassa negra i lent clara.
 for(const [index,x] of [-1.35,-.96,.96,1.35].entries()){
  const z=Math.abs(x)>1.2?-4.48:-4.60;
  light(group,'BTR82_3B_front_headlight_'+index+'_housing',
   x,1.18,z,trim,.295,.14);
  light(group,'BTR82_3B_front_headlight_'+index+'_lens',
   x,1.18,z-.10,lamp,.213,.065);
 }
 scene.userData.btr82Details3B={rearGuards:2,roofHatches:2,roofVents:2,
  frontVisors:2,headlights:4,sideAccessDoors:2,visorHorizontal:true};
 return group;
}

// Agrupa tots els detalls en una sola geometria compartida pel joc.
// Cada peça conserva la seva orientació i color; cap GLB ni textura externa.
export function createBtr823BHardwareBatch(THREE){
 const root=new THREE.Group();
 applyBtr823BDetails(root);
 root.updateMatrixWorld(true);
 const positions=[],normals=[],colors=[];let detailCount=0;
 root.traverse(mesh=>{
  if(mesh.isMesh)detailCount++;
  if(!mesh.isMesh)return;
  const transformed=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  const expanded=transformed.index?transformed.toNonIndexed():transformed;
  const xyz=expanded.getAttribute('position'),norm=expanded.getAttribute('normal');
  const color=mesh.material.color;
  for(let i=0;i<xyz.count;i++){
   positions.push(xyz.getX(i),xyz.getY(i),xyz.getZ(i));
   normals.push(norm.getX(i),norm.getY(i),norm.getZ(i));
   colors.push(color.r,color.g,color.b);
  }
  if(expanded!==transformed)expanded.dispose();
  transformed.dispose();
  mesh.geometry.dispose();
 });
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeBoundingSphere();
 geometry.userData.btr82HardwareBatch=true;
 geometry.userData.previewDetailCount=detailCount;
 return geometry;
}
