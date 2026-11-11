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
const api=new Function('THREE',code+';return {createBtr82HullV3Geometry,createBtr82TurretV3Geometry,makeBtr82HullV3,BTR82_HULL_V3_STATIONS}')(THREE);
const hull=api.createBtr82HullV3Geometry();
const position=hull.getAttribute('position'),ids=hull.index.array;
assert.equal(ids.length/3,428);
assert.equal(position.count,216);
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
const after=bounds(hull);
assert(Math.abs(after.width-3.82)<1e-8&&Math.abs(after.length-10.85)<1e-8);
assert.equal(after.bottom,-.32);
assert.equal(after.top,1.78);
const stations=api.BTR82_HULL_V3_STATIONS,front=stations[0],rear=stations.at(-1),middle=stations[5];
assert(front.roof[2]>.6,'Proa insuficientment inclinada');
const capStart=9*20*6,capIds=ids.slice(capStart);
assert.equal(capIds.length/3,68,'Tapes fetes amb dues meitats');
for(let i=0;i<16;i++)assert.equal(coords[200+i][0],0,'Eix central del morro fora de X=0');
const caps=[];
for(let i=0;i<capIds.length;i+=3)caps.push(capIds.slice(i,i+3));
for(const face of caps){
 const points=face.map(id=>[-coords[id][0],coords[id][1],coords[id][2]]);
 assert(caps.some(other=>points.every(p=>other.some(id=>
  coords[id].every((v,j)=>Math.abs(v-p[j])<1e-8)))),
  'Hi ha un triangle frontal/posterior sense reflex exacte');
}

assert.equal(rear.belt[2],0,'Popa xata');
assert(rear.keel[2]<-.4,'Popa amb baixos recollits');
assert(rear.keel[1]>.4&&rear.belly[1]>.45,'La quilla posterior no pot penjar massa');
assert(rear.stepFoot[1]>.6,'La part inferior de la popa ha de formar un bisell');
assert(rear.shoulder[0]>rear.roof[0]+.4,'La popa ha de tenir espatlles hexagonals');
assert(stations[stations.length-2].keel[1]>stations[stations.length-3].keel[1]+.2,
 'La quilla ha de començar a pujar abans de la popa');
assert(rear.roof[2]<0,'Popa amb bisell superior');
assert(rear.roof[1]>front.roof[1]+.3,'La proa no es distingeix prou de la popa');
assert(middle.wheelWell[0]<1.438&&middle.wheelWell[1]>=.94,'Escaló de les rodes incorrecte');
assert(middle.stepFoot[1]<0&&middle.belly[1]<-.2&&middle.belly[0]>.9,'Ventre massa estret o massa alt');
for(const station of stations.slice(1,-1))for(const part of ['lip','shelf','wheelWell','stepFoot','belly','keel'])
 assert.equal(station[part][2],0,'Baixos girats en Z al tram '+station.z+' / '+part);
const nose=stations[0];
assert.equal(nose.belt[2],0);
assert(nose.lip[2]>nose.belt[2]);
assert(nose.keel[2]>nose.stepFoot[2]&&nose.stepFoot[2]>nose.wheelWell[2],
 "The lower prow should taper towards the back");
assert(nose.keel[1]>stations[1].keel[1], "The nose underside should rise");
assert(nose.belt[0]<stations[1].belt[0]-.35,'Proa mes estreta');
assert(nose.shoulder[0]<stations[1].shoulder[0]-.35,'Espatlles del morro en cunya');
assert(nose.keel[1]>stations[1].keel[1]+1.0,'El ventre frontal ha de pujar fins a la proa');
assert(Math.abs(nose.belt[1]-nose.keel[1])<.12,'Els baixos no convergeixen amb la punta');
assert(nose.keel[2]<.2&&nose.stepFoot[2]<.2,'La cunya no pot recular darrere la punta');
const turret=api.createBtr82TurretV3Geometry();
const tp=turret.getAttribute('position');
assert.equal(turret.index.count/3,76);
assert.equal(tp.count,40);
const baseX=Math.max(...Array.from({length:8},(_,i)=>tp.getX(i)));
const topX=Math.max(...Array.from({length:8},(_,i)=>tp.getX(32+i)));
const baseZ=Math.min(...Array.from({length:8},(_,i)=>tp.getZ(i)));
const topZ=Math.min(...Array.from({length:8},(_,i)=>tp.getZ(32+i)));
assert(topX<baseX-.3, "Turret shoulders need taper");
assert(topZ>baseZ+.2, "Turret upper prow must slope rearward");
assert(tp.getY(32)<2.85);
assert.equal(tp.getY(0),1.71,'Cal retallar la base inferior de la torreta');
assert.equal(tp.getY(8),1.90,'El segon anell ha de quedar per sobre la coberta');
// La meitat inferior de CADA secció segueix el mateix Z que l'eix del canó.
const vertexCountPerSection=20;
for(let i=1;i<stations.length-1;i++)for(let k=5;k<=10;k++)
 assert(Math.abs(coords[i*vertexCountPerSection+k][2]-stations[i].z)<1e-8,
  'Perfil inferior desalineat al canó a la secció '+i+' vèrtex '+k);
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
assert.equal(report.hullBottom,-.32);
assert.equal(report.noseKeelHeight,.82);
assert.equal(report.rearKeelHeight,.51);
assert.equal(report.rearOutline,'raised-hex-bevel');
assert.equal(report.turretBaseHeight,1.71);
assert.equal(report.gunAxis,'-Z');
assert.equal(report.transverseMirrorAxis,'X');
assert.equal(report.wheelStepHeight,.96);
assert.equal(report.frontClosure,'symmetric-centerline');
assert.equal(report.retainedWheels,8);
assert.equal(report.retainedGunParts,2);
assert.equal(rebuilt.children.filter(n=>n.name.startsWith('BTR82_truck_A43_wheel_')).reduce((n,w)=>n+w.children.length,0),24);
assert(!rebuilt.children.some(n=>n.name==='hull_material_0'));
assert.deepEqual(rebuilt.getObjectByName('BTR82_v3_lowered_centre_hull').geometry.getAttribute('position').array,position.array);
assert.equal(rebuilt.getObjectByName('BTR82_new_black_barrel').geometry,base.getObjectByName('BTR82_new_black_barrel').geometry);
console.log('PASS BTR v3i: raised hexagonal deck, beveled stern and shortened turret foot');
