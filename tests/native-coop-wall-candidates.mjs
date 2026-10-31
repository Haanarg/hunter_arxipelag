import assert from 'node:assert/strict';
import {createNativeWallCandidateIndex} from '../src/native-coop-wall-candidates.mjs';

// La llista de col·lisió i l'ordre han de ser exactament iguals que quan
// es filtrava el mapa complet a cada subpas de predicció.
const naive=(walls,cx,cz,reach)=>walls.filter(w=>
 w.x0<=cx+reach&&w.x1>=cx-reach&&
 w.z0<=cz+reach&&w.z1>=cz-reach
);
let seed=49021;
function rand(){seed=Math.imul(seed,1664525)+1013904223>>>0;return seed/4294967296;}
const walls=Array.from({length:1350},(_,i)=>{
 const x=rand()*4200-2100,z=rand()*4200-2100,
  width=i%47===0?350:rand()*24,depth=i%31===0?240:rand()*10;
 return {id:i,x0:x,x1:x+width,z0:z,z1:z+depth,open:i%17===0};
});
// Casos gegants que no s'han d'inserir en milers de buckets.
walls.push({id:'very-long',x0:-2500,x1:2500,z0:23,z1:26});
walls.push({id:'huge-wall',x0:-2800,x1:2800,z0:-2800,z1:2800});
const index=createNativeWallCandidateIndex(walls);
let queries=0;
function compare(x,z,reach){
 const expected=naive(walls,x,z,reach).map(w=>w.id),
  actual=index.nearby(x,z,reach).map(w=>w.id);
 assert.deepEqual(actual,expected,'No es poden ometre murs o canviar prioritat '+[x,z,reach]);
 queries++;
}
for(let i=0;i<2200;i++)compare(rand()*5000-2500,rand()*5000-2500,
 i%101===0?1000:(i%11===0?170:rand()*45));
for(const x of [-257,-256,-255,-129,-128,-127,-1,0,1,127,128,129,255,256,257])
 for(const z of [-129,-128,-127,0,127,128,129])
  for(const reach of [0,1,20,80,150])compare(x,z,reach);
const reordered=[...walls].reverse();
assert.deepEqual(createNativeWallCandidateIndex(reordered).nearby(0,25,20).map(w=>w.id),
 naive(reordered,0,25,20).map(w=>w.id),
 'Una reconstrucció de geometria pot reordenar els murs');
assert.deepEqual(createNativeWallCandidateIndex([]).nearby(0,0,20),[]);
console.log('native coop wall broadphase: 1352 walls, long walls, negative cells and '+queries+' queries passed');
