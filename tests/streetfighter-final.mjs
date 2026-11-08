// Prova de la moto DEFINITIVA, sense GLB ni motor de simplificació.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {createStreetfighter25,STREETFIGHTER_25_META as M} from '../src/streetfighter-25-geometry.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
assert.equal(M.sourceTriangleCount,4908);
assert.equal(M.ratioSetting,.25);
assert.equal(M.scaleRelativeToPrevious,.75);
assert.equal(M.parts,19);
assert(M.triangles>=M.protectedTriangles,'Radis i direcció no es poden perdre');
assert(M.dimensions.width<=1.1*.75+.002,'La moto ha de fer 75% de l’amplada antiga');
assert(M.dimensions.length<=4.3*.75+.002,'La moto ha de fer 75% del llarg antic');

const paint=(hex,profile)=>new THREE.MeshStandardMaterial({color:hex,roughness:.8,transparent:profile==='glass'});
const red=createStreetfighter25(THREE,{color:0xef35a8,material:paint});
const blue=createStreetfighter25(THREE,{color:0x228fef,material:paint});
const list=model=>{
 const all=[];model.traverse(x=>{if(x.isMesh)all.push(x)});return all
};
for(const bike of [red,blue]){
 const all=list(bike);
 assert.equal(all.length,M.parts);
 assert.equal(all.reduce((n,x)=>n+(x.geometry.index?.count||0)/3,0),M.triangles);
 assert.equal(bike.userData.motorcycleModel,'naked-streetfighter-25');
 assert.equal(bike.userData.wheels.length,2);
 assert.equal(bike.userData.steeringPivots.length,1);
 const [front,rear]=bike.userData.wheels,steer=bike.userData.steeringPivots[0];
 assert.equal(front.parent,steer,'La roda davantera gira amb la forquilla');
 assert.equal(rear.parent,bike,'La roda posterior no gira amb el manillar');
 assert(Math.abs(front.userData.radius-M.wheelRadius)<1e-6);
 assert(list(front).some(x=>x.name.includes('wheel-frontalloy')),'Radis de la roda davantera');
 assert(list(rear).some(x=>x.name.includes('wheel-rearalloy')),'Radis de la roda posterior');
 assert(!all.some(x=>x.name.includes('accent')),'Sense les peces vermelles giratòries');
 assert(all.some(x=>x.name.includes('streetfighter-front-trim')),'Els punys han de ser part del grup del davant');
 assert(all.some(x=>x.name.includes('streetfighter-steering-stem')),'Manillar unit a la forquilla');
}
const paintParts=list(red).filter(x=>x.userData.colorPanel),bluePaint=list(blue).filter(x=>x.userData.colorPanel);
assert(paintParts.length>=2,'Cal repintar totes les peces blaves');
assert.equal(paintParts.length,bluePaint.length);
for(let i=0;i<paintParts.length;i++){
 assert.equal(paintParts[i].material.color.getHex(),0xef35a8);
 assert.equal(bluePaint[i].material.color.getHex(),0x228fef);
 assert.strictEqual(paintParts[i].geometry,bluePaint[i].geometry,'Geometria compartida entre colors');
}
assert(list(red).some(x=>x.material.color.getHex()===0x171b1f),'Els pneumàtics mantenen el color fosc');
const b=box=>box;
const box=(parent,w,h,d,color,x=0,y=0,z=0)=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),paint(color,'paint'));mesh.position.set(x,y,z);parent.add(mesh);return mesh
};
const factory=vehicleModels.createFactory(THREE,{box,material:paint,shadows:false,batching:playerBatching});
for(const color of [0xc94e3f,0xa4ec24,0xffdf18,0xef35a8,0x228fef,0xff7b19,0x181c1e]){
 const model=factory('moto',{color});
 assert.equal(model.userData.motorcycleModel,'naked-streetfighter-25');
 assert.equal(model.userData.motorcycleColor,color);
 assert.equal(model.userData.motorcycleTriangles,M.triangles);
 assert.equal(model.userData.steeringPivots.length,1);
 assert.equal(model.userData.wheels.length,2);
 assert.equal(model.scale.x,vehicleModels.scales.moto,'No duplicar el factor del vehicle');
 const [front,rear]=model.userData.wheels;
 assert.equal(front.parent,model.userData.steeringPivots[0]);
 assert(front.userData.radius>0&&rear.userData.radius>0);
 assert(Math.abs(front.userData.radius-M.wheelRadius*vehicleModels.scales.moto)<1e-6);
 const pivot=model.userData.steeringPivots[0];
 const target=vehicleModels.steeringMax.moto;
 vehicleModels.animateSteering(model,'moto',1,1);
 assert(Math.abs(pivot.rotation.y-target)<.001,'Direcció del joc i rodes a la mateixa velocitat');
 front.rotation.x=.4;
 assert(Math.abs(pivot.rotation.y-target)<.001,'Rodar la roda no gira el manillar');
 assert(list(model).filter(x=>x.userData.colorPanel).every(x=>x.material.color.getHex()===color));
}
console.log('Naked streetfighter definitiva: '+M.triangles+' triangles, 75% escala, 19 peces, 7 pintures vives, radis intactes i direcció animada.');
