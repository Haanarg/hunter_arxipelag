#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three-r186.module.mjs';
import {windowLayout} from '../src/building-shell.mjs';

// Prova sobre el constructor real: la fusió de malles no ha d'ocultar
// triangles coplanaris als quatre cantons de cap finestra.
const scope={HUNTER_BUILDING_SHELL:{windowLayout}};
vm.runInNewContext(readFileSync(new URL('../src/buildings.js',import.meta.url),'utf8'),{window:scope});
const mats=new Map();
const material=(color,profile='masonry')=>{
 const key=color+':'+profile;
 if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color}));
 return mats.get(key);
};
const visual=scope.HUNTER_BUILDINGS.create(THREE,{material,materialProfile:()=>({})});
const trimMat=material(0xd0bf9c,'masonry');

for(const [sx,sz,height] of [[10,.8,8],[.8,10,8],[18,.8,9],[.8,18,9]]){
 const group=new THREE.Group();
 const wallMaterial=material(0x999999);
 const parts=visual.addWindowedWall(group,{lx:0,lz:0,sx,sz,height,material:wallMaterial});
 const paneCount=windowLayout(sx,sz,height).centers.length;
 const glass=parts.filter(mesh=>mesh.userData.windowPane!==undefined);
 assert.equal(glass.length,paneCount,'el vidre continua independent i destructible');
 glass.forEach((pane,index)=>assert.equal(pane.userData.windowPane,index));

 const trim=group.children.find(mesh=>mesh.material===trimMat);
 assert(trim,'marc persistent després de construir la façana');
 const attr=trim.geometry.getAttribute('position');
 assert.equal(attr.count,paneCount*4*36,'quatre peces rectangulars per finestra');
 const collectBoxes=geo=>{
  const points=geo.getAttribute('position'),boxes=[];
  assert.equal(points.count%36,0,'geometria de caixes rectangulars fusionades');
  for(let start=0;start<points.count;start+=36){
   const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
   for(let i=start;i<start+36;i++){
    const xyz=[points.getX(i),points.getY(i),points.getZ(i)];
    for(let axis=0;axis<3;axis++){
     min[axis]=Math.min(min[axis],xyz[axis]);
     max[axis]=Math.max(max[axis],xyz[axis]);
    }
   }
   boxes.push({min,max});
  }
  return boxes;
 };
 const boxes=collectBoxes(trim.geometry);
 const walls=group.children.find(mesh=>mesh.material===wallMaterial);
 assert(walls,'la paret física es manté');
 const wallBoxes=collectBoxes(walls.geometry);
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j];
  const overlap=[0,1,2].map(axis=>Math.min(a.max[axis],b.max[axis])-Math.max(a.min[axis],b.min[axis]));
  assert(!overlap.every(value=>value>1e-5),
   'peces del marc superposades (z-fighting) a '+sx+'x'+sz+': '+i+' i '+j);
 }
 // El defecte original NO estava només a les quatre cantonades:
 // els muntants coincidien amb la cara interior dels pilars de pedra.
 // El marc ha d'estar totalment separat de TOTS els volums de mur.
 for(const frameBox of boxes)for(const wallBox of wallBoxes){
  const separation=[0,1,2].map(axis=>Math.max(
   wallBox.min[axis]-frameBox.max[axis],
   frameBox.min[axis]-wallBox.max[axis]));
  assert(separation.some(distance=>distance>.018),
   'el marc torna a tocar/penetrar una cara del mur a '+sx+'x'+sz);
 }
 // El vidre s'instal·la al darrere del marc: mai no es creuen les
 // superfícies encara que el renderitzador tracti el vidre com transparent.
 const depthAxis=sx>=sz?2:0;
 for(const pane of glass){
  const front=pane.position.getComponent(depthAxis)-
    pane.geometry.parameters[sx>=sz?'depth':'width']/2;
  for(const frameBox of boxes){
   assert(front-frameBox.max[depthAxis]>.019,
    'el vidre penetra el marc a '+sx+'x'+sz);
  }
 }
 // shatterWindow() només amaga el vidre; la geometria del marc no canvia.
 glass.forEach(pane=>{pane.visible=false;});
 assert.equal(trim.visible,true);
 assert.equal(trim.parent,group);
 assert.equal(trim.geometry.getAttribute('position').count,paneCount*4*36);
}

// Les quatre façanes han de posar el marc a la cara EXTERIOR.
// Amb la lògica antiga, els dos costats amb normal positiva (+X/+Z)
// tenien el marc cap a dins, perquè s'aplicava sempre l'offset negatiu.
for(const [lx,lz,sx,sz,height] of [
 [0,-9.6,12,.8,8],[0,9.6,12,.8,8],
 [-9.6,0,.8,12,8],[9.6,0,.8,12,8],
 [0,-9.6,18,.8,9],[0,9.6,18,.8,9],
 [-9.6,0,.8,18,9],[9.6,0,.8,18,9]
]){
 const alongX=sx>=sz,axis=alongX?2:0,center=alongX?lz:lx;
 const exterior=Math.sign(center),T=alongX?sz:sx;
 const group=new THREE.Group();
 const parts=visual.addWindowedWall(group,{lx,lz,sx,sz,height,material:material(0x999999)});
 const glass=parts.filter(mesh=>mesh.userData.windowPane!==undefined);
 const trim=group.children.find(mesh=>mesh.material===trimMat);
 assert(trim,'sense marc al costat '+center);
 const pos=trim.geometry.getAttribute('position');
 let min=Infinity,max=-Infinity;
 for(let i=0;i<pos.count;i++){
  const v=pos.getComponent(i,axis)-center;
  min=Math.min(min,v);max=Math.max(max,v);
 }
 const outwardFace=exterior>0?max:-min;
 const inwardFace=exterior>0?min:-max;
 assert(outwardFace>.34&&outwardFace<T/2,'marc fora del gruix al costat '+center);
 assert(inwardFace>.15,'marc a la cara interior de la façana '+center);
 for(const pane of glass){
  const glassDepth=pane.geometry.parameters[alongX?'depth':'width'];
  const glassFront=exterior*(pane.position.getComponent(axis)-center)+glassDepth/2;
  const frameBack=exterior>0?min:-max;
  assert(frameBack-glassFront>.019,'vidre i marc coincideixen al costat '+center);
  assert(exterior*(pane.position.getComponent(axis)-center)>0,
   'vidre instal·lat a la cara interior en façana '+center);
 }
 // Simula el trencament; el marc ha de seguir on era.
 for(const pane of glass)pane.visible=false;
 assert(trim.visible,'marc absent després de trencar el vidre');
}

console.log('PASS: marcs a la cara exterior de totes les façanes, separats de murs i vidres; intactes després de trencar els vidres');
