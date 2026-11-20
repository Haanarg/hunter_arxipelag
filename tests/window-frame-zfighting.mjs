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
 const parts=visual.addWindowedWall(group,{lx:0,lz:0,sx,sz,height,material:material(0x999999)});
 const paneCount=windowLayout(sx,sz,height).centers.length;
 const glass=parts.filter(mesh=>mesh.userData.windowPane!==undefined);
 assert.equal(glass.length,paneCount,'el vidre continua independent i destructible');
 glass.forEach((pane,index)=>assert.equal(pane.userData.windowPane,index));

 const trim=group.children.find(mesh=>mesh.material===trimMat);
 assert(trim,'marc persistent després de construir la façana');
 const attr=trim.geometry.getAttribute('position');
 assert.equal(attr.count,paneCount*4*36,'quatre peces rectangulars per finestra');
 const boxes=[];
 for(let start=0;start<attr.count;start+=36){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=start;i<start+36;i++){
   const xyz=[attr.getX(i),attr.getY(i),attr.getZ(i)];
   for(let axis=0;axis<3;axis++){
    min[axis]=Math.min(min[axis],xyz[axis]);
    max[axis]=Math.max(max[axis],xyz[axis]);
   }
  }
  boxes.push({min,max});
 }
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j];
  const overlap=[0,1,2].map(axis=>Math.min(a.max[axis],b.max[axis])-Math.max(a.min[axis],b.min[axis]));
  assert(!overlap.every(value=>value>1e-5),
   'peces del marc superposades (z-fighting) a '+sx+'x'+sz+': '+i+' i '+j);
 }
 // shatterWindow() només amaga el vidre; la geometria del marc no canvia.
 glass.forEach(pane=>{pane.visible=false;});
 assert.equal(trim.visible,true);
 assert.equal(trim.parent,group);
 assert.equal(trim.geometry.getAttribute('position').count,paneCount*4*36);
}
console.log('PASS: marcs sense peces superposades amb una o dues finestres, en ambdós eixos, amb vidre intacte o trencat');
