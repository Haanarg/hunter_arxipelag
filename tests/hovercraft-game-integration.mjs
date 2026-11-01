// Comprova la variant D compartida pels dos modes i les quotes dels mapes.
// Executar: node tests/hovercraft-game-integration.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three-r186.module.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {hovercraftConcepts} from '../src/hovercraft-concepts.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';

const material=(color,profile)=>new THREE.MeshStandardMaterial({
  color,flatShading:true,roughness:.85,transparent:profile==='glass',
  opacity:profile==='glass'?.5:1
});
const box=(parent,w,h,d,color,x,y,z,profile)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color,profile));
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
};
const create=vehicleModels.createFactory(THREE,{
  box,material,shadows:false,batching:playerBatching
});
const vehicle=create('hover'),model=vehicle.children[0],fan=vehicle.userData.fan;
assert.equal(vehicle.userData.hovercraftModel,'D-model-3');
assert.equal(hovercraftConcepts[3].style,'command');
assert.equal(model.userData.concept.style,'command');
assert.equal(model.userData.rotors.length,1);
assert.strictEqual(fan,model.userData.rotors[0]);
assert.equal(model.userData.cockpitSeats.length,2);
assert.equal(model.userData.windowPanes.length,7);
assert.equal(model.userData.skirtFilamentsRemoved,true);
const all=new Set();vehicle.traverse(item=>all.add(item));
assert.ok(all.has(fan),'El batching ha de preservar el rotor animat');
assert.ok(all.has(model.userData.canopyRoof),'El batching no ha de fusionar el sostre desmuntable');
assert.ok(model.userData.windowPanes.every(p=>all.has(p)&&p.material.transparent&&p.material.opacity<.45),'Finestres transparents després del batching');
assert.ok(model.userData.cockpitSeats.every(p=>all.has(p)),'Seients conservats');
const before=fan.rotation.z;fan.rotation.z+=.5;assert.ok(fan.rotation.z>before);
const extent=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
const physicalW=vehicleSpecs.hitboxes.hover[0],physicalL=vehicleSpecs.hitboxes.hover[1];
assert.ok(Math.abs(extent.x-physicalW)<1.5,'Amplada coherent amb el collider');
assert.ok(Math.abs(extent.z-physicalL)<1.5,'Llargada coherent amb el collider');
vehicle.traverse(object=>{object.geometry?.dispose();object.material?.dispose()});

const individual=fs.readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8');
assert.match(individual,/hoverQuotaTargets/);
assert.match(individual,/original=countVehicles\('hover',sector\),target=Math\.max\(2,original\*2\)/);
assert.match(individual,/\(yield\* extraHoverSpot\(sector\)\)/);
const coop=fs.readFileSync(new URL('../server/coop-open-world.mjs',import.meta.url),'utf8');
assert.match(coop,/const hoverSectors=meta\.mapScale===2\?\[0,1,2,3\]:\[null\]/);
assert.match(coop,/const original=hoverCount\(sector\),target=Math\.max\(2,original\*2\)/);
assert.match(coop,/safeHover\(x,z,sector\)/);
const coopView=fs.readFileSync(new URL('../src/coop-vehicle-view.mjs',import.meta.url),'utf8');
assert.match(coopView,/model\.userData\.fan\.rotation\.z\+=dt\*35/);
console.log('Hovercraft D: mode individual i COOP, una hèlix, cabina, mides i quotes per sector — OK');
