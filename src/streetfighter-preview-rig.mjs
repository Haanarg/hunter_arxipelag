// Naked streetfighter (actiu CC0 15425): preparació visual compartida per
// totes les alternatives del laboratori, sense canviar cap model del joc.
// El GLB no separa la forquilla, els agafadors ni el parafang en nodes.
// Extraiem aquests components de les malles originals, conservant materials,
// normals, radis i forats de les rodes. Un sol pivot dirigeix TOT el frontal.
import {deinterleaveGeometry} from '../vendor/three-addons/utils/BufferGeometryUtils.js';

const SPEC=Object.freeze({
 'naked-streetfighter_8':'steel',
 'naked-streetfighter_9':'alloy',
 'naked-streetfighter_10':'trim',
 'naked-streetfighter_11':'paint'
});
const round=v=>Math.round(v*1e5);
const key=p=>round(p.x)+','+round(p.y)+','+round(p.z);
const ptmp=null;

function splitComponents(THREE,mesh){
 const source=mesh.geometry.clone();
 deinterleaveGeometry(source);
 const pos=source.getAttribute('position'),index=source.getIndex();
 const faces=(index?.count||pos.count)/3;
 if(!Number.isInteger(faces)){source.dispose();throw Error('La malla GLB no és triangular: '+mesh.name)}
 const parent=Array.from({length:faces},(_,i)=>i);
 const find=i=>{let j=i;while(parent[j]!==j)j=parent[j];while(parent[i]!==i){const next=parent[i];parent[i]=j;i=next;}return j};
 const join=(a,b)=>{const x=find(a),y=find(b);if(x!==y)parent[x]=y};
 const first=new Map(),components=new Map(),local=new THREE.Vector3(),world=new THREE.Vector3();
 for(let face=0;face<faces;face++){
   for(let k=0;k<3;k++){
     const ix=index?index.getX(face*3+k):face*3+k;
     local.fromBufferAttribute(pos,ix);
     const signature=key(local);
     if(first.has(signature))join(face,first.get(signature));
     else first.set(signature,face);
   }
 }
 for(let face=0;face<faces;face++){
   const id=find(face);
   let c=components.get(id);
   if(!c){c={faces:[],bounds:new THREE.Box3()};components.set(id,c)}
   c.faces.push(face);
   for(let k=0;k<3;k++){
     const ix=index?index.getX(face*3+k):face*3+k;
     local.fromBufferAttribute(pos,ix);
     world.copy(local).applyMatrix4(mesh.matrixWorld);
     c.bounds.expandByPoint(world);
   }
 }
 return {source,index,components:[...components.values()]};
}
function makeGeometry(THREE,source,index,faces){
 const result=new THREE.BufferGeometry();
 for(const [name,attribute] of Object.entries(source.attributes)){
   const data=new Float32Array(faces.length*3*attribute.itemSize);
   let cursor=0;
   const getters=['getX','getY','getZ','getW'];
   for(const face of faces)for(let k=0;k<3;k++){
     const ix=index?index.getX(face*3+k):face*3+k;
     for(let c=0;c<attribute.itemSize;c++)
       data[cursor++]=attribute[getters[c]](ix);
   }
   result.setAttribute(name,new THREE.Float32BufferAttribute(data,attribute.itemSize));
 }
 if(!result.getAttribute('normal'))result.computeVertexNormals();
 result.userData.candidateSimplified=true; // només geometria pròpia de la vista
 return result;
}
function category(name,b){
 const min=b.min,max=b.max,absX=Math.max(Math.abs(min.x),Math.abs(max.x));
 if(name==='naked-streetfighter_8'){
   // Els dos suports dels miralls són 2 components de 32 triangles.
   if(min.y>.99&&absX>.28&&min.z>.30)return 'discard';
   // Dues barres d'acer de la forquilla (48 triangles cadascuna).
   if(min.z>.35&&max.z<.85&&min.y>.49&&max.y<1.00&&absX<.20)return 'steer';
 }
 if(name==='naked-streetfighter_9'){
   // Dues beines d'aliatge de la forquilla (48 triangles cadascuna).
   if(min.z>.35&&max.z<.80&&min.y>.29&&max.y<.99&&absX<.20)return 'steer';
 }
 if(name==='naked-streetfighter_10'){
   // Els dos punys (40 triangles cadascun), abans dins el carenat.
   if(min.y>.96&&min.z>.30&&absX>.28)return 'steer';
 }
 if(name==='naked-streetfighter_11'){
   // Parafang davanter: 208 triangles; gira amb la roda.
   if(min.z>.30&&max.z>1.05&&max.y<.77)return 'steer';
 }
 return 'keep';
}
export function prepareStreetfighterPreview(THREE,root){
 const existing=root.getObjectByName('streetfighter-steering');
 if(existing)return root.userData.streetfighterRigStats;
 const body=root.getObjectByName('naked-streetfighter'),
       wheel=root.getObjectByName('wheel-front'),
       handle=root.getObjectByName('handlebar');
 if(!body||!wheel||!handle)throw Error('GLB Naked streetfighter: falten peces de direcció');
 // La peça accent és el marcador vermell que rotava enganxat a cada roda.
 for(const name of ['side-stand','naked-streetfighter_13',
                    'wheel-front/accent','wheel-rear/accent']){
   const part=root.getObjectByName(name);part?.parent?.remove(part);
 }
 root.updateMatrixWorld(true);
 const rig=new THREE.Group();rig.name='streetfighter-steering';
 rig.position.copy(handle.position);body.add(rig);
 root.updateMatrixWorld(true);
 const stats={moved:{},removedMirrorStems:0,removedWheelAccents:2,excludedFromReduction:['wheel-front','wheel-rear','streetfighter-front']};
 for(const [name,role] of Object.entries(SPEC)){
   const mesh=root.getObjectByName(name);if(!mesh?.isMesh)throw Error('Malla GLB absent: '+name);
   const {source,index,components}=splitComponents(THREE,mesh);
   const keep=[],steering=[],discard=[];
   for(const component of components){
     const classification=category(name,component.bounds);
     (classification==='steer'?steering:classification==='discard'?discard:keep).push(...component.faces);
   }
   if(!steering.length){source.dispose();throw Error('No s’ha pogut separar la direcció: '+name)}
   const remain=makeGeometry(THREE,source,index,keep);
   mesh.geometry=remain;
   const part=new THREE.Mesh(makeGeometry(THREE,source,index,steering),mesh.material);
   part.name='streetfighter-front-'+role;
   part.position.copy(mesh.position);part.quaternion.copy(mesh.quaternion);part.scale.copy(mesh.scale);
   part.castShadow=mesh.castShadow;part.receiveShadow=mesh.receiveShadow;
   body.add(part);
   root.updateMatrixWorld(true);
   rig.attach(part); // preserva la transformació i la posició en repòs
   stats.moved[role]=steering.length;
   stats.removedMirrorStems+=discard.length;
   source.dispose();
 }
 // La barra original està ALINEADA amb els punys del GLB. Girar-la
 // 180º per separat descol·locava els punys; ara tots comparteixen pivot.
 root.updateMatrixWorld(true);
 rig.attach(handle);
 rig.attach(wheel);
 rig.userData.streetfighterSteering=true;
 rig.rotation.y=0;
 root.userData.streetfighterRigStats=stats;
 root.updateMatrixWorld(true);
 return stats;
}
export function setStreetfighterPreviewSteering(root,angleRadians=0){
 const rig=root.getObjectByName('streetfighter-steering');
 if(!rig)return false;
 rig.rotation.y=Math.max(-.65,Math.min(.65,Number(angleRadians)||0));
 return true;
}
export function isStreetfighterDetailProtected(mesh){
 const name=mesh?.name||'';
 // No simplificar els radis, els buits de les llandes, els pneumàtics,
 // els nuclis de roda, la forquilla ni els punys.
 return name.startsWith('wheel-front/')||name.startsWith('wheel-rear/')||
        name.startsWith('streetfighter-front-')||name==='handlebar';
}
