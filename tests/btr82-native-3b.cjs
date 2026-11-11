// Integració del 3B natiu al joc, sense WebGL, GLB ni dependències externes.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const strip=s=>s.replace(/^import[\s\S]*?from\s*['"][^'"]+['"];\s*/gm,'').replace(/^export /gm,'');
const source=read('src/btr82-3b-native.mjs');
const factorySource=read('src/vehicle-model-core.mjs');
const specsSource=read('src/vehicle-turret-core.mjs');
assert(factorySource.includes("import {installBtr82Model3B} from './btr82-3b-native.mjs';"));
assert(factorySource.includes("installBtr82Model3B(THREE,g,{resources})"));
assert(!factorySource.includes("for(const x of[-1.42,1.42])for(const z of[-1.55,0,1.55])"));
class Attr {
 constructor(array,size){this.array=array;this.itemSize=size;this.count=array.length/size}
 getX(i){return this.array[3*i]}
 getY(i){return this.array[3*i+1]}
 getZ(i){return this.array[3*i+2]}
 setXYZ(i,x,y,z){this.array.splice(3*i,3,x,y,z)}
}
class Geo {
 constructor(){this.attributes={};this.index={count:720};this.isBufferGeometry=true}
 setAttribute(k,v){this.attributes[k]=v;return this}
 getAttribute(k){return this.attributes[k]}
 scale(x,y,z){const a=this.attributes.position;for(let i=0;i<a.count;i++)a.setXYZ(i,a.getX(i)*x,a.getY(i)*y,a.getZ(i)*z);return this}
 translate(x,y,z){const a=this.attributes.position;for(let i=0;i<a.count;i++)a.setXYZ(i,a.getX(i)+x,a.getY(i)+y,a.getZ(i)+z);return this}
 rotateZ(){return this}
 toNonIndexed(){return this}
 computeVertexNormals(){}
 computeBoundingSphere(){}
 dispose(){}
}
class Cylinder extends Geo {
 constructor(){super();this.index=null;
  this.setAttribute('position',new Attr([0,0,0,1,0,0,0,1,0],3));
  this.setAttribute('normal',new Attr([0,0,1,0,0,1,0,0,1],3))}
}
class Node {
 constructor(){this.children=[];this.userData={};this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};this.rotation={x:0,y:0,z:0};this.isObject3D=true}
 add(child){this.children.push(child);child.parent=this}
}
class Group extends Node{}
class Mesh extends Node{constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true}}
class Material{constructor(props){Object.assign(this,props);this.isMaterial=true}}
class Color{constructor(v){this.r=((v>>16)&255)/255;this.g=((v>>8)&255)/255;this.b=(v&255)/255}}
const THREE={Group,Mesh,Object3D:Node,CylinderGeometry:Cylinder,BufferGeometry:Geo,
 Float32BufferAttribute:Attr,MeshStandardMaterial:Material,Color,DoubleSide:2};
const fakeGeometry=()=>new Geo().setAttribute('position',
 new Attr([-1,1,-1,1,2,1,-1,3,1],3));
const sceneApi=new Function('THREE','createBtr82AngularGeometry','createBtr82TurretV3Geometry',
 'BTR82_3B_TURRET_PIVOT_Z','BTR82_3B_BARREL_LOWERING_Y','BTR82_CABIN_SHIFT_Z','vehicleSpecs',
 strip(source)+';return {installBtr82Model3B,BTR82_3B_GAME_FIT};')
 (THREE,()=>fakeGeometry(),()=>fakeGeometry(),-.31,.33,.38,{scales:{tanqueta:1.8125}});
const specApi=new Function('vehicleSpecs',strip(specsSource)+';return {turretSpecs,vehicleGunPose};')
 ({scales:{tanqueta:1.8125,tanc:2.25}});
const first=new Group();
sceneApi.installBtr82Model3B(THREE,first);
assert.equal(first.userData.btr82Model,'3B');
assert.equal(first.userData.btr82WheelCount,8);
assert.equal(first.userData.wheels.length,8);
assert.equal(first.userData.btr82BarrelLowering,.33);
assert.equal(first.userData.btr82HullTriangles,240);
assert(first.userData.wheels.every(w=>w.children.length===1));
const yaw=first.userData.turretPivot,pitch=first.userData.turretPitch,shot=first.userData.turretMuzzle;
assert(pitch.parent===yaw&&shot.parent===pitch);
const origin={x:yaw.position.x+pitch.position.x+shot.position.x,
 y:yaw.position.y+pitch.position.y+shot.position.y,
 z:yaw.position.z+pitch.position.z+shot.position.z};
const spec=specApi.turretSpecs.tanqueta;
for(const [i,coordinate] of ['x','y','z'].entries()){
 const expected=spec.pivot[i]+spec.pitch[i]+spec.muzzle[i];
 assert(Math.abs(origin[coordinate]-expected)<1e-8,'Sortida del tret desalineada en '+coordinate);
}
const [xFit,yFit,zFit]=[sceneApi.BTR82_3B_GAME_FIT.x,sceneApi.BTR82_3B_GAME_FIT.y,sceneApi.BTR82_3B_GAME_FIT.z];
assert(xFit>0&&yFit>0&&zFit>0);
assert.equal(spec.turretYawRate,2.05);
const second=new Group();
sceneApi.installBtr82Model3B(THREE,second);
assert.notEqual(first.userData.wheels[0],second.userData.wheels[0],'Les rodes han de ser independents');
assert.notEqual(first.userData.turretPivot,second.userData.turretPivot,'Les torretes han de girar per separat');
assert.equal(first.children[0].geometry,second.children[0].geometry,'Geometria compartida per rendiment');
console.log('PASS BTR-82 3B: 8 rodes, torreta articulada, canó i trets alineats SOLO/COOP');
