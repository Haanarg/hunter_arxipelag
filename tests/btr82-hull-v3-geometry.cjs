// Geometria del BTR-82 v3 sense navegador ni WebGL.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/btr82-hull-v3.mjs'),'utf8');
class BufferGeometry {
 constructor(){this.attributes={};this.userData={}}
 setAttribute(name,data){this.attributes[name]=data}
 getAttribute(name){return this.attributes[name]}
 setIndex(indices){this.index={array:indices,count:indices.length}}
 clone(){
  const copy=new BufferGeometry();
  for(const [name,attr] of Object.entries(this.attributes))
   copy.setAttribute(name,new THREE.Float32BufferAttribute([...attr.array],attr.itemSize));
  copy.setIndex([...this.index.array]);
  copy.userData={...this.userData};
  return copy;
 }
 computeVertexNormals(){}
 computeBoundingBox(){
  const attr=this.attributes.position;
  const min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
  for(let i=0;i<attr.count;i++)for(const [key,val] of [['x',attr.getX(i)],['y',attr.getY(i)],['z',attr.getZ(i)]]){
   min[key]=Math.min(min[key],val);max[key]=Math.max(max[key],val);
  }
  this.boundingBox={min,max};
 }
 computeBoundingSphere(){}
}
class Node {
 constructor(geometry,material){this.geometry=geometry;this.material=material;this.name='';this.isMesh=true;this.children=[];this.userData={}}
 add(node){node.parent=this;this.children.push(node)}
 remove(node){this.children=this.children.filter(child=>child!==node);node.parent=null}
 traverse(fn){fn(this);for(const child of this.children)child.traverse(fn)}
 getObjectByName(name){if(this.name===name)return this;for(const child of this.children){const found=child.getObjectByName(name);if(found)return found}return null}
 clone(){const node=new Node(this.geometry,this.material);node.name=this.name;
  for(const child of this.children)node.add(child.clone());return node}
}
class Group extends Node {
 constructor(){super(null,null);this.isMesh=false}
 clone(){const group=new Group();group.name=this.name;for(const c of this.children)group.add(c.clone());return group}
}
const THREE={
 BufferGeometry,
 Float32BufferAttribute:class {
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize}
  getX(i){return this.array[i*this.itemSize]}
  getY(i){return this.array[i*this.itemSize+1]}
  getZ(i){return this.array[i*this.itemSize+2]}
  setXYZ(i,x,y,z){const n=i*this.itemSize;this.array[n]=x;this.array[n+1]=y;this.array[n+2]=z}
 },
 Mesh:Node,
 MeshStandardMaterial:class {constructor(values){Object.assign(this,values)}},
 DoubleSide:2
};
const code=source.replace(/^import .*$/gm,'').replace(/^export /gm,'');
const api=new Function('THREE',code+';return {createBtr82HullV3Geometry,createBtr82HullV3AxisSwapGeometry,makeBtr82HullV3,BTR82_HULL_V3_STATIONS}')(THREE);
const model=api.createBtr82HullV3Geometry();
const hull=api.createBtr82HullV3AxisSwapGeometry(model);
const position=hull.getAttribute('position'),ids=hull.index.array;
assert.equal(ids.length/3,396);
assert.equal(position.count,200);
const coords=Array.from({length:position.count},(_,i)=>[position.getX(i),position.getY(i),position.getZ(i)]);
const edges=new Map();
let minArea=Infinity,signedVolume=0;
for(let i=0;i<ids.length;i+=3){
 const corners=ids.slice(i,i+3);
 for(let j=0;j<3;j++){
  const e=[corners[j],corners[(j+1)%3]].sort((a,b)=>a-b).join(':');
  edges.set(e,(edges.get(e)||0)+1);
 }
 const [a,b,c]=corners.map(j=>coords[j]);
 const u=b.map((v,j)=>v-a[j]),v=c.map((v,j)=>v-a[j]);
 const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 minArea=Math.min(minArea,Math.hypot(...n)/2);
 signedVolume+=(a[0]*n[0]+a[1]*n[1]+a[2]*n[2])/6;
}
assert([...edges.values()].every(n=>n===2),'Casc obert o no manifold');
assert(minArea>.001&&signedVolume>40,'Triangles degenerats o capgirats');
const key=v=>v.map(x=>x.toFixed(5)).join(',');
const mirror=new Set(coords.map(key));
for(const [x,y,z] of coords)assert(mirror.has(key([-x,y,z])),'Només simetria esquerra/dreta X');
const bounds=g=>{
 const p=g.getAttribute('position'),ranges={x:[Infinity,-Infinity],y:[Infinity,-Infinity],z:[Infinity,-Infinity]};
 for(let i=0;i<p.count;i++)for(const [axis,v] of [['x',p.getX(i)],['y',p.getY(i)],['z',p.getZ(i)]]){
  ranges[axis][0]=Math.min(ranges[axis][0],v);
  ranges[axis][1]=Math.max(ranges[axis][1],v);
 }
 return {width:ranges.x[1]-ranges.x[0],length:ranges.z[1]-ranges.z[0],bottom:ranges.y[0],top:ranges.y[1]};
};
const before=bounds(model),after=bounds(hull);
assert(Math.abs(before.width-after.width)<1e-8&&Math.abs(before.length-after.length)<1e-8);
assert(Math.abs(after.width-3.82)<1e-8&&Math.abs(after.length-10.85)<1e-8);
assert.equal(after.bottom,-.28);
assert.equal(after.top,1.65);
const stations=api.BTR82_HULL_V3_STATIONS,front=stations[0],rear=stations.at(-1),middle=stations[5];
assert(front.roof[2]>.6,'Proa insuficientment inclinada');
for(const name of ['roof','brow','shoulder','belt','lip','shelf','wheelWell','stepFoot','belly','keel'])
 assert.equal(rear[name][2],0,'Popa no plana: '+name);
assert(rear.roof[1]>front.roof[1]+.3,'La proa no es distingeix prou de la popa');
assert(middle.wheelWell[0]<1.438&&middle.wheelWell[1]>=.9,'Escaló de les rodes incorrecte');
assert(middle.stepFoot[1]<0&&middle.belly[1]<-.2&&middle.belly[0]>.9,'Ventre massa estret o massa alt');
const base=new Group();
for(let i=0;i<8;i++){
 const wheel=new Group();wheel.name='BTR82_truck_A43_wheel_'+i;
 for(let j=0;j<3;j++)wheel.add(new Node(new BufferGeometry(),null));
 base.add(wheel);
}
for(const name of ['BTR82_new_black_barrel','BTR82_new_black_muzzle']){
 const gun=new Node(new BufferGeometry(),null);gun.name=name;base.add(gun);
}
const old=new Node(new BufferGeometry(),null);old.name='hull_material_0';base.add(old);
const rebuilt=api.makeBtr82HullV3(base),report=rebuilt.userData.btr82HullV3;
assert.equal(report.axisRotationDegrees,90);
assert.equal(report.symmetricalX,true);
assert.equal(report.hullBottom,-.28);
assert.equal(report.wheelStepHeight,.92);
assert.equal(report.retainedWheels,8);
assert.equal(report.retainedGunParts,2);
assert.equal(rebuilt.children.filter(n=>n.name.startsWith('BTR82_truck_A43_wheel_')).reduce((n,w)=>n+w.children.length,0),24);
assert(!rebuilt.children.some(n=>n.name==='hull_material_0'));
assert.deepEqual(rebuilt.getObjectByName('BTR82_v3_lowered_centre_hull').geometry.getAttribute('position').array,position.array);
assert.equal(rebuilt.getObjectByName('BTR82_new_black_barrel').geometry,base.getObjectByName('BTR82_new_black_barrel').geometry);
console.log('PASS BTR v3c: symmetric X, distinct blunt rear, enlarged lowered belly and wheels under ledges');
