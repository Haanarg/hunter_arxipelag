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
const api=new Function('THREE',code+';return {createBtr82HullV3Geometry,createBtr82HullV3AxisSwapGeometry,setBtr82HullV3AxisSwap,makeBtr82HullV3,BTR82_HULL_V3_STATIONS}')(THREE);
const geo=api.createBtr82HullV3Geometry(),positions=geo.attributes.position.array,indices=geo.index.array;
const vertices=Array.from({length:positions.length/3},(_,i)=>positions.slice(i*3,i*3+3));
const edges=new Map();
let minArea=Infinity,signedVolume=0;
for(let i=0;i<indices.length;i+=3){
 const ids=indices.slice(i,i+3);
 for(let k=0;k<3;k++){
  const key=[ids[k],ids[(k+1)%3]].sort((a,b)=>a-b).join(':');
  edges.set(key,(edges.get(key)||0)+1);
 }
 const [a,b,c]=ids.map(i=>vertices[i]);
 const u=b.map((v,j)=>v-a[j]),v=c.map((x,j)=>x-a[j]);
 const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 minArea=Math.min(minArea,Math.hypot(...n)*.5);
 signedVolume+=(a[0]*n[0]+a[1]*n[1]+a[2]*n[2])/6;
}
assert.equal(indices.length/3,284,'Triangles del casc v3');
assert.equal(vertices.length,144,'Vèrtexs del casc v3');
assert([...edges.values()].every(value=>value===2),'Casc amb arestes obertes o no manifold');
assert(minArea>.001,'Triangles degenerats');
assert(signedVolume>40,'Orientació o volum incorregut');
const key=p=>p.map(n=>n.toFixed(5)).join(',');
const points=new Set(vertices.map(key));
for(const [x,y,z] of vertices)assert(points.has(key([-x,y,z])),'X no simètric');
const ys=vertices.map(p=>p[1]);
assert.equal(Math.min(...ys),.15,'La panxa central no arriba prou avall');
assert.equal(Math.max(...ys),1.68,'El sostre no té altura prevista');
assert(api.BTR82_HULL_V3_STATIONS.length>=8,'Massa poques estacions longitudinals');
const switched=api.createBtr82HullV3AxisSwapGeometry(geo);
const extents=geometry=>{
 const positions=geometry.getAttribute('position');
 const bbox={x:[Infinity,-Infinity],y:[Infinity,-Infinity],z:[Infinity,-Infinity]};
 for(let i=0;i<positions.count;i++){
  for(const [axis,value] of [['x',positions.getX(i)],['y',positions.getY(i)],['z',positions.getZ(i)]]){
   bbox[axis][0]=Math.min(bbox[axis][0],value);
   bbox[axis][1]=Math.max(bbox[axis][1],value);
  }
 }
 return Object.fromEntries(Object.entries(bbox).map(([axis,[min,max]])=>[axis,max-min]));
};
const before=extents(geo),after=extents(switched);
for(const axis of ['x','y','z'])assert(Math.abs(before[axis]-after[axis])<1e-8,
 'Gir i reajustament han de conservar dimensions '+axis);
assert.equal(switched.index.count,geo.index.count,'El gir no ha de canviar els triangles');
assert.notDeepEqual(switched.getAttribute('position').array.slice(0,3),
 geo.getAttribute('position').array.slice(0,3),'Cal que el gir afecti de debò les cares');

// Conservar geometria de les rodes — són grups amb diversos fills.
const base=new Group();
for(let i=0;i<8;i++){
 const wheel=new Group();wheel.name='BTR82_truck_A43_wheel_'+i;
 for(let j=0;j<3;j++)wheel.add(new Node(new BufferGeometry(),null));
 base.add(wheel);
}
for(const name of ['BTR82_new_black_barrel','BTR82_new_black_muzzle']){
 const cannon=new Node(new BufferGeometry(),null);cannon.name=name;base.add(cannon);
}
const old=new Node(new BufferGeometry(),null);old.name='hull_material_0';base.add(old);
const rebuilt=api.makeBtr82HullV3(base);
assert.equal(rebuilt.userData.btr82HullV3.retainedWheels,8);
assert.equal(rebuilt.userData.btr82HullV3.retainedGunParts,2);
assert.equal(rebuilt.children.filter(n=>n.name.startsWith('BTR82_truck_A43_wheel_')).reduce((n,w)=>n+w.children.length,0),24);
assert(!rebuilt.children.some(n=>n.name==='hull_material_0'),'No conservar casc trencat');
const hull=rebuilt.getObjectByName('BTR82_v3_lowered_centre_hull');
const intact=hull.geometry;
assert(api.setBtr82HullV3AxisSwap(rebuilt,true),'El control activa el canvi de geometria');
assert.notEqual(hull.geometry,intact,'El casc ha de canviar de forma');
assert.equal(rebuilt.userData.btr82HullV3.retainedGunParts,2,'El canó no es toca');
assert.equal(rebuilt.getObjectByName('BTR82_new_black_barrel').geometry,base.getObjectByName('BTR82_new_black_barrel').geometry);
assert(api.setBtr82HullV3AxisSwap(rebuilt,false),'El control restaura la geometria inicial');
assert.equal(hull.geometry,intact,'Cal poder desfer el gir sense deteriorament');

console.log('PASS BTR-82 v3 closed 284 triangles, mirror symmetry, reversible rotate+rescale and preserved wheels/gun');
