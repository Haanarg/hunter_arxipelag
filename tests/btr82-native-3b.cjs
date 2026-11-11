// Integració del 3B natiu al joc, sense WebGL, GLB ni dependències externes.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const strip=s=>s.replace(/^import[\s\S]*?from\s*['"][^'"]+['"];\s*/gm,'').replace(/^export /gm,'');
const source=read('src/btr82-3b-native.mjs');
const dimensions=read('src/vehicle-specs.mjs');
const hb=dimensions.match(/tanqueta:\[([0-9.]+),([0-9.]+)\]/);
assert(hb,'Falta la caixa física de la tanqueta');
const [width,depth]=hb.slice(1).map(Number);
const tanketteWorldScale=1.8125;
const modelWidth=2*(1.688+.25*1.06)*(.65*1.5)*tanketteWorldScale;
const modelLength=2*5.425*(.65*1.5)*tanketteWorldScale;
assert(width*tanketteWorldScale>=modelWidth,
 'La hitbox ha de cobrir els laterals exteriors de les vuit rodes');
assert(depth*tanketteWorldScale>=modelLength,
 'La hitbox ha de cobrir la longitud completa del casc angular');

const factorySource=read('src/vehicle-model-core.mjs');
const specsSource=read('src/vehicle-turret-core.mjs');
assert(factorySource.includes("import {installBtr82Model3B} from './btr82-3b-native.mjs';"));
assert(factorySource.includes("installBtr82Model3B(THREE,g,{resources})"));
assert(factorySource.includes('tanqueta:25*Math.PI/180'),'El gir visual màxim ha de ser de 25 graus');
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
assert.equal(first.userData.btr82VisualScale,1.5,'El model ha de créixer exactament un 50%');
assert.equal(first.userData.btr82FrontSteerCount,2,'Només l’eix davanter gira amb el volant');
assert.equal(first.userData.steeringPivots.length,2);
assert.equal(first.userData.wheels.length,8);
assert.equal(first.userData.btr82BarrelLowering,.33);
assert.equal(first.userData.btr82HullTriangles,240);
assert(first.userData.wheels.every(w=>w.children.length===1));
const frontWheels=first.userData.wheels.slice(0,2);
assert(frontWheels.every(w=>first.userData.steeringPivots.includes(w.parent)),
 'Els dos pneumàtics davanters han de penjar de la mangueta');
assert(first.userData.wheels.slice(2).every(w=>w.parent===first),
 'La resta dels eixos no s’han de girar amb el volant');
for(const pivot of first.userData.steeringPivots)pivot.rotation.y=.18;
frontWheels[0].rotation.x=.31;
assert(first.userData.steeringPivots.every(p=>p.rotation.y===.18));
assert.equal(frontWheels[0].rotation.x,.31,
 'Les rodes han de poder rodar en X al mateix temps que giren en Y');
const yaw=first.userData.turretPivot,pitch=first.userData.turretPitch,shot=first.userData.turretMuzzle;
assert(pitch.parent===yaw&&shot.parent===pitch);
const turretBody=yaw.children.find(child=>child.name==='BTR82_3B_curved_turret');
assert(turretBody&&turretBody.parent===yaw,
 'La malla sencera de la torreta ha de seguir el pivot horitzontal');
assert(!pitch.children.includes(turretBody),
 'El cos blindat no pot pujar o baixar amb el canó');
yaw.rotation.y=.50;pitch.rotation.x=-.21;
assert.equal(turretBody.parent.rotation.y,.50,
 'El gir esquerra/dreta ha d’arrossegar tot el cos de la torreta');
assert.equal(turretBody.rotation.x,0,
 'La torreta blindada no s’ha d’inclinar amb el canó');
assert.equal(shot.parent.rotation.x,-.21,
 'El canó i la boca de foc han de pujar o baixar junts');
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
assert.equal(sceneApi.BTR82_3B_GAME_FIT.sizeMultiplier,1.5);
assert.equal(xFit,yFit,'El model no pot quedar comprimit transversalment');
assert.equal(zFit,xFit,'La longitud ha de mantenir la mateixa escala que les rodes');
const sourceAxles=[-2.938,-.938,1.7505,3.585];
const renderedTireDiameter=2*.8125*yFit*1.5;
for(let index=1;index<sourceAxles.length;index++){
 const gap=(sourceAxles[index]-sourceAxles[index-1])*zFit*1.5-renderedTireDiameter;
 assert(gap>.10,'Els pneumàtics no s’han de tocar entre els eixos '+index+' i '+(index+1));
}
assert(dimensions.includes('tanqueta:6.25'),'Ampliar el radi físic de la tanqueta');
assert(Math.hypot(width/2,depth/2)<6.25,'El radi de col·lisió ha de cobrir la nova hitbox');
assert(Math.abs(first.children[0].geometry.getAttribute('position').getX(0)+xFit*1.5)<1e-8);
assert(Math.abs(first.children[0].geometry.getAttribute('position').getZ(0)+zFit*1.5)<1e-8);
const oldWheelRadius=.8125*yFit*1.8125;
assert(Math.abs(frontWheels[0].userData.radius/oldWheelRadius-1.5)<1e-8,
 'Les rodes també creixen un 50%');
assert.equal(spec.turretYawRate,2.05);
const second=new Group();
sceneApi.installBtr82Model3B(THREE,second);
assert.notEqual(first.userData.wheels[0],second.userData.wheels[0],'Les rodes han de ser independents');
assert.notEqual(first.userData.turretPivot,second.userData.turretPivot,'Les torretes han de girar per separat');
assert.notEqual(first.userData.steeringPivots[0],second.userData.steeringPivots[0],
 'Les manguetes han de ser independents entre vehicles');
assert.equal(first.children[0].geometry,second.children[0].geometry,'Geometria compartida per rendiment');
console.log('PASS BTR-82 3B: +50%, gir de tota la torreta, canó vertical, dues rodes directrius i trets SOLO/COOP');
