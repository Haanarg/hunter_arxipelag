import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
import {firstSupplyContact} from '../server/coop-inventory.mjs';
const g=generateRelayMission({id:'inventory',revision:1,seed:67,mapScale:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]});g.record.status='running';
const spawn=g.record.checkpoint.players[0],bag=(m,id)=>m.snapshot().inventories.find(i=>i.actorId===id),command=(m,id,operation,target)=>({epoch:m.meta.id,operation,target,commandId:id});
function fixture(){const r=structuredClone(g.record);r.meta.supplies=[{id:'ground',item:'bullets',amount:12,x:spawn.x,y:spawn.y,z:spawn.z}];return r;}
let m=restoreRelayMission(fixture(),g.geometry);m.step();assert.equal(bag(m,'a').bullets,36);assert.equal(bag(m,'b').bullets,24);assert.equal(m.snapshot().supplies.length,0);m.step();assert.equal(bag(m,'a').bullets,36,'automatic pickup never duplicates');
m=restoreRelayMission(m.checkpoint(0),g.geometry);assert.equal(m.snapshot().supplies.length,0,'picked object stays absent after restart');
assert.equal(m.inventoryCommand('a',command(m,'manual','pickup','ground')).code,'INVALID','manual pickup command removed');
assert.equal(m.inventoryCommand('outsider',command(m,'outsider','drop','bullets')).code,'INVALID');
const drop=command(m,'drop-1','drop','bullets');assert.equal(m.inventoryCommand('a',drop).code,'DROPPED');assert.equal(bag(m,'a').bullets,24);assert.equal(m.snapshot().supplies[0].amount,12);assert.equal(m.inventoryCommand('a',drop).duplicate,true);assert.equal(m.snapshot().supplies.length,1);
for(let i=0;i<10;i++)m.step();assert.equal(bag(m,'a').bullets,24,'owner does not immediately reclaim own drop');
m=restoreRelayMission(m.checkpoint(0),g.geometry);m.step();assert.equal(bag(m,'a').bullets,24,'owner exclusion survives restart');
const together=m.checkpoint(0);Object.assign(together.checkpoint.players[1],{x:spawn.x,y:spawn.y,z:spawn.z});m=restoreRelayMission(together,g.geometry);m.step();assert.equal(bag(m,'b').bullets,36);assert.equal(m.snapshot().supplies.length,0,'partner collects by touching, no command');assert.equal(bag(m,'a').bullets+bag(m,'b').bullets,60,'transfer conserves quantity');
assert.equal(m.inventoryCommand('a',command(m,'equip','disguise',true)).ok,true);assert.equal(bag(m,'a').disguised,true);
assert.equal(m.inventoryCommand('a',command(m,'drop-disguise','drop','disguise')).ok,true);assert.equal(bag(m,'a').disguised,false);assert.equal(bag(m,'a').disguise,0);m.step();assert.equal(m.snapshot().supplies.length,1,'full partner cannot take a second disguise');
assert.equal(m.inventoryCommand('a',command(m,'empty','drop','disguise')).code,'EMPTY');
// Owner must leave the contact radius before being able to reclaim a drop.
let r=m.checkpoint(0);r.checkpoint.players[0].x+=4;m=restoreRelayMission(r,g.geometry);m.step();r=m.checkpoint(0);Object.assign(r.checkpoint.players[0],{x:spawn.x,y:spawn.y,z:spawn.z});m=restoreRelayMission(r,g.geometry);m.step();assert.equal(bag(m,'a').disguise,1);assert.equal(bag(m,'a').disguised,false);
// Capacity, vertical separation and paused games leave objects on the ground.
r=fixture();r.inventories=[{actorId:'a',bullets:120,grenades:2,disguise:1,disguised:false}];m=restoreRelayMission(r,g.geometry);m.step();assert.equal(m.snapshot().supplies.length,1);assert.equal(bag(m,'a').bullets,120);
r=fixture();r.checkpoint.players[0].y+=6;m=restoreRelayMission(r,g.geometry);m.step();assert.equal(m.snapshot().supplies.length,1);
m=restoreRelayMission(fixture(),g.geometry);m.setStatus('paused');m.step();assert.equal(m.snapshot().supplies.length,1);assert.equal(m.inventoryCommand('a',command(m,'paused','drop','grenades')).code,'NOT_ACTIVE');
// Swept contact catches fast crossings and identifies the earlier actor.
const item={x:0,z:0,y:0};assert.equal(firstSupplyContact({x:-5,z:0,y:0},{x:5,z:0,y:0},item),.38);assert.equal(firstSupplyContact({x:-5,z:3,y:0},{x:5,z:3,y:0},item),null);assert.equal(firstSupplyContact({x:0,z:0,y:6},{x:0,z:0,y:6},item),null);
assert.ok(firstSupplyContact({x:-2,z:0,y:0},{x:2,z:0,y:0},item)<firstSupplyContact({x:-3,z:0,y:0},{x:1,z:0,y:0},item));
r=fixture();Object.assign(r.checkpoint.players[1],spawn,{id:'b',acknowledged:0});m=restoreRelayMission(r,g.geometry);m.step();assert.equal(bag(m,'a').bullets,36);assert.equal(bag(m,'b').bullets,24,'exact same-tick ties deterministically award only one actor');
r=fixture();for(const [i,p] of r.checkpoint.players.entries())Object.assign(p,{x:spawn.x,y:spawn.y,z:spawn.z+(i?1.25:1.38),hd:0});m=restoreRelayMission(r,g.geometry);
for(const id of ['a','b'])m.accept(id,{protocol:1,epoch:m.meta.id,sequence:1,input:{forward:1,turn:0,strafe:0,run:true},interact:false});m.step();assert.equal(bag(m,'b').bullets,36,'earlier physical contact wins even when second in roster');assert.equal(bag(m,'a').bullets,24);
// A thin closed wall between actor and item prevents contact through it.
r=fixture();r.meta.supplies[0].x+=1;const walls=structuredClone(g.geometry);walls.walls.push({x0:spawn.x+.4,x1:spawn.x+.6,z0:spawn.z-2,z1:spawn.z+2,y0:spawn.y-1,y1:spawn.y+5});m=restoreRelayMission(r,walls);m.step();assert.equal(m.snapshot().supplies.length,1,'closed wall prevents pickup through it');
const copy=m.snapshot();copy.inventories[0].bullets=999;assert.equal(bag(m,'a').bullets,24,'snapshots cannot mutate server bags');
console.log('inventory: automatic swept pickup, tie/ownership, capacity/height/walls, drop/partner transfer, conservation, owner exit/re-entry, equipped disguise removal, idempotency, pause and durable state passed');
