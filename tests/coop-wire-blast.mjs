import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
import {closestFenceBlastPoint} from '../src/combat-rules.mjs';
const room={id:'wire-blast',revision:1,seed:67,mapScale:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]};
const generated=generateRelayMission(room,{mode:'proving'});
function fixture({cover=false,x=0,z=39,running=true,weapon='grenade'}={}){
 const g=structuredClone(generated);g.record.status=running?'running':'paused';g.record.meta.targets=[];g.record.meta.vehicles=[];
 g.record.combat={grenades:[{id:'blast',actorId:'a',weapon,x,y:3,z,vx:0,vy:0,vz:0,explodeAt:1}]};
 if(cover)g.geometry.walls.push({x0:-20,x1:20,z0:39.5,z1:39.7,y0:2,y1:8,hp:100});
 return {g,m:restoreRelayMission(g.record,g.geometry)};
}
for(const weapon of ['grenade','c4']){
 const {g,m}=fixture({x:9,weapon});m.step();assert.deepEqual(m.snapshot().removedWalls,[0],weapon+' breaks wire near the end of its segment');
 assert.equal(m.setup('a').geometry.walls[0].open,true);
 const saved=m.checkpoint(0),r=restoreRelayMission(saved,g.geometry);assert.deepEqual(r.snapshot().removedWalls,[0]);assert.equal(r.setup('b').geometry.walls[0].open,true);r.step();assert.deepEqual(r.snapshot().removedWalls,[0]);
}
for(const options of [{cover:true},{z:10},{running:false}]){const {m}=fixture(options);m.step();assert.deepEqual(m.snapshot().removedWalls,[],JSON.stringify(options));}
const diagonal={ax:0,az:0,bx:10,bz:10,x0:0,x1:10,z0:0,z1:10,y0:0,y1:3};
assert.ok(closestFenceBlastPoint(diagonal,0,1,10).distance>7,'distance follows real segment rather than bounding box');
console.log('shared original fence proximity; grenade/C4 destruction, solid cover, range, pause and restored collision state passed');
