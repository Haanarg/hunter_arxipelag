// Geometria del BTR-82 v3 sense navegador ni WebGL.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/btr82-hull-v3.mjs'),'utf8');
class BufferGeometry {
 constructor(){this.attributes={};this.userData={}}
 setAttribute(name,data){this.attributes[name]=data}
 setIndex(indices){this.index={array:indices,count:indices.length}}
 computeVertexNormals(){}
 computeBoundingBox(){}
 computeBoundingSphere(){}
}
class Node {
 constructor(geometry,material){this.geometry=geometry;this.material=material;this.name='';this.isMesh=true;this.children=[];this.userData={}}
 add(node){node.parent=this;this.children.push(node)}
 remove(node){this.children=this.children.filter(child=>child!==node);node.parent=null}
 traverse(fn){fn(this);for(const child of this.children)child.traverse(fn)}
 clone(){const node=new Node(this.geometry,this.material);node.name=this.name;
  for(const child of this.children)node.add(child.clone());return node}
}
class Group extends Node {
 constructor(){super(null,null);this.isMesh=false}
 clone(){const group=new Group();group.name=this.name;for(const c of this.children)group.add(c.clone());return group}
}
const THREE={
 BufferGeometry,
 Float32BufferAttribute:class {constructor(array,itemSize){this.array=array;this.itemSize=itemSize}},
 Mesh:Node,
 MeshStandardMaterial:class {constructor(values){Object.assign(this,values)}},
 DoubleSide:2
};
const code=source.replace(/^import .*$/gm,'').replace(/^export /gm,'');
const api=new Function('THREE',code+';return {createBtr82HullV3Geometry,makeBtr82HullV3,BTR82_HULL_V3_STATIONS}')(THREE);
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
console.log('PASS BTR-82 v3 closed 284 triangles, mirror symmetry, lowered centre and preserved wheels/gun');
