import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {launchProjectile} from '../src/projectile-core.mjs';
const room={id:'palms',revision:1,allReady:true,seed:67,mapScale:1,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]};
const generated=generateRelayMission(room,{mode:'proving'});
generated.geometry.trees=[{x:0,z:0,r:.7,p:true,y:2,s:1,yaw:0}];
const make=record=>restoreRelayMission(record,generated.geometry);
function shot(record,damage){record=structuredClone(record);record.status='running';record.meta.vehicles=[];record.meta.targets=[];record.combat={projectiles:[{...launchProjectile({x:-2,y:4,z:0},[1,0,0],130,{id:'shot',actorId:'a',dmg:damage}),life:2}]};const m=make(record);m.step();return m;}
let m=shot(generated.record,4);assert.deepEqual(m.snapshot().palmHealth,[[0,4]]);
m=shot(m.checkpoint(0),4);assert.deepEqual(m.snapshot().palmHealth,[[0,0]]);
let restored=make(m.checkpoint(0));assert.deepEqual(restored.snapshot().palmHealth,[[0,0]]);
assert.deepEqual(shot(restored.checkpoint(0),4).snapshot().palmHealth,[[0,0]],'dead palm cannot take damage twice');
const adapter=createStaticWorldAdapter(generated.geometry);assert.ok(adapter.vegetationAt(0,4,0));adapter.setPalmHealth([[0,0]]);assert.equal(adapter.vegetationAt(0,4,0),null);
const live=createStaticWorldAdapter(generated.geometry);assert.ok(live.vegetationAt(0,4,0),'damage never mutates another world');
console.log('coop palms: two hits, death, checkpoint, no duplicate damage and independent worlds passed');
const record=structuredClone(generated.record);record.status='running';record.meta.vehicles=[];record.meta.targets=[];record.combat={grenades:[{id:'blast',actorId:'a',weapon:'c4',x:0,y:4,z:0,vx:0,vy:0,vz:0,landed:true,explodeAt:record.checkpoint.tick+1}]};
const blasted=make(record);blasted.step();assert.deepEqual(blasted.snapshot().palmHealth,[[0,0]],'C4 destroys nearby palm');
const point={x:0,z:0,y:2,hd:0},candidate={...point};assert.notEqual(live.resolveBody(point,candidate).x,0,'living palm blocks player');assert.equal(adapter.resolveBody(point,candidate).x,0,'dead palm no longer blocks player');
