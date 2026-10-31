import assert from 'node:assert/strict';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {createNativeVehicleCandidateIndex} from '../src/native-coop-vehicle-candidates.mjs';

// La comprovació que feia la predicció abans del canvi. És l'oracle:
// mantenim exactament els mateixos vehicles, filtres i ordre.
const naive=(rows,cx,cz,reach)=>rows.filter(v=>
 Math.hypot(v.x-cx,v.z-cz)<=reach+
 Math.hypot(...vehicleSpecs.hitboxes[v.t])*vehicleSpecs.scales[v.t]/2
);
const types=Object.keys(vehicleSpecs.hitboxes);
let seed=1739;
const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const rows=Array.from({length:374},(_,i)=>({
 id:'vehicle-'+i,t:types[i%types.length],
 x:random()*4400-2200,z:random()*4400-2200,
 hd:random()*6-3,destroyed:i%51===0
}));
const index=createNativeVehicleCandidateIndex(rows);
let queries=0;
function compare(cx,cz,reach){
 const desired=naive(rows,cx,cz,reach).map(v=>v.id),
  actual=index.nearby(cx,cz,reach).map(v=>v.id);
 assert.deepEqual(actual,desired,
  'Índex i cerca original difereixen a '+[cx,cz,reach].join('/'));
 queries++;
}
for(let i=0;i<1600;i++){
 const x=random()*4800-2400,z=random()*4800-2400,
  reach=i%101===0?1800:(i%29===0?180:random()*80);
 compare(x,z,reach);
}
// Fer creuar el límit de cel·la de x/z, també en coordenades negatives,
// sense oblidar els ferris (radi del model molt superior a un turisme).
for(const x of [-257,-256,-255,-129,-128,-127,-1,0,1,127,128,129,255,256,257])
 for(const z of [-129,-128,-127,0,127,128,129])
  for(const reach of [0,1,20,80,170])compare(x,z,reach);
// Insercions/destruccions i canvis d'ordre (snapshots immutables).
const reordered=[...rows].reverse();
const second=createNativeVehicleCandidateIndex(reordered);
assert.deepEqual(second.nearby(0,0,230).map(v=>v.id),
 naive(reordered,0,0,230).map(v=>v.id),
 'La reordenació del snapshot preserva la preferència de col·lisió');
const removed=createNativeVehicleCandidateIndex(rows.filter(r=>r.id!=='vehicle-0'));
assert.deepEqual(removed.nearby(rows[0].x,rows[0].z,200).map(v=>v.id),
 naive(rows.filter(r=>r.id!=='vehicle-0'),rows[0].x,rows[0].z,200).map(v=>v.id));
assert.deepEqual(createNativeVehicleCandidateIndex([]).nearby(0,0,300),[]);
console.log('native coop vehicle broadphase: exact candidates/order, 16 types, 374 vehicles and '+queries+' spatial queries passed');
