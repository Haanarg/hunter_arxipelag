import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
import {wallBlastDamage,roofBlastDamage,countDestroyedSupport} from '../src/combat-rules.mjs';
import {launchProjectile} from '../src/projectile-core.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
const room={id:'demolition',revision:1,seed:67,mapScale:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]};
const g=generateRelayMission(room,{mode:'proving'}),building=g.geometry.buildings[0];
assert.ok(building.upperFloor&&building.rhp===16);assert.ok(g.geometry.walls.some(w=>w.hp===12&&w.buildingId===building.id));
const make=(record=g.record,geometry=g.geometry)=>{record=structuredClone(record);record.status='running';record.meta.vehicles=[];record.meta.targets=[];return restoreRelayMission(record,geometry);};
function blast(m,weapon='grenade',x=building.x,z=building.z){const r=m.checkpoint(0);r.combat.grenades=[{id:'blast',actorId:'a',weapon,x,y:building.fy+1,z,vx:0,vy:0,vz:0,explodeAt:r.checkpoint.tick+1}];const next=make(r);next.step();return next;}
let m=blast(make());assert.ok(m.checkpoint(0).roofHealth[0][1]>0&&m.checkpoint(0).roofHealth[0][1]<16,'grenade accumulates roof damage');
const partial=m.checkpoint(0);assert.deepEqual(make(partial).checkpoint(0).roofHealth,partial.roofHealth,'partial damage survives restore');
m=blast(m,'c4');assert.deepEqual(m.snapshot().removedRoofs,[0]);
let geometry=m.setup('a').geometry;assert.equal(geometry.buildings[0].rb,true);assert.equal(geometry.buildings[0].rhp,0);assert.equal(geometry.stairs.find(s=>s.internal).destroyed,true);
const stairWall=geometry.walls.findIndex(w=>w.internalStair);assert.ok(m.snapshot().removedWalls.includes(stairWall));
let world=createStaticWorldAdapter(geometry);assert.equal(world.roofLanding({x:building.x,y:building.fy+building.h+2,z:building.z},{x:building.x,y:building.fy+building.h-2,z:building.z}),null,'collapsed roof no longer catches falling players');
const restored=make(m.checkpoint(0));assert.deepEqual(restored.snapshot().removedRoofs,[0]);assert.deepEqual(restored.snapshot().removedWalls,m.snapshot().removedWalls);
const door=g.record.meta.doors[0];assert.ok(restored.snapshot().doors.find(d=>d.id===door.id).destroyed);assert.equal(restored.doorCommand('a',{epoch:restored.meta.id,commandId:'rebuild',doorId:door.id,open:false}).code,'DESTROYED','destroyed door cannot restore collision');
// A destroyed jamb removes the entire entrance, including the lintel.
const front=g.geometry.walls.find(w=>w.assemblyIds?.length&&w.supportWeight>0),r=structuredClone(g.record);
const origin={x:(front.x0+front.x1)/2,y:building.fy+1,z:(front.z0+front.z1)/2};
r.combat={projectiles:[{...launchProjectile(origin,[0,0,1],10,{id:'jamb-shell',actorId:'a',dmg:20,splash:.5}),life:2}]};
const breached=make(r);breached.step();for(const id of front.assemblyIds){const index=g.geometry.walls.findIndex(w=>w.id===id);assert.ok(breached.snapshot().removedWalls.includes(index),'small blast removes entire doorway, including distant jamb/lintel');}
const support={};for(let i=0;i<2;i++)assert.equal(countDestroyedSupport(support,{supportWeight:1}),false);const last={supportWeight:1};assert.equal(countDestroyedSupport(support,last),true);countDestroyedSupport(support,last);assert.equal(support.destroyedWallSupport,3,'support counted once');
assert.equal(roofBlastDamage({kind:'enemy_bunker',rhp:100,x:0,z:0,w:10},0,0,10,20),0,'bunker roof is protected');
assert.equal(wallBlastDamage({open:false,hp:12,x0:-1,x1:1,z0:0,z1:1,y1:5},0,8,0,20,20),0,'original height limit');
// Light bullets still cannot damage military structures.
m=make();const before=m.checkpoint(0);m.combatCommand('a',{epoch:m.meta.id,weapon:'pistol',commandId:'light'});for(let i=0;i<15;i++)m.step();assert.deepEqual(m.checkpoint(0).wallHealth,before.wallHealth);assert.deepEqual(m.snapshot().removedRoofs,[]);
console.log('two-storey demolition: cumulative damage, restored health, shared collapse, stair/roof collisions, destroyed door, light immunity and original support/bunker rules passed');
