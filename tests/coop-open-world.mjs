import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {runtimeLayouts} from '../src/compound-runtime-layouts.mjs';
import {bunkerBasementPlan,generateTerrainFoundation} from '../src/world-generation-core.mjs';
import {traceArena} from '../server/coop-combat.mjs';
const room=(seed,mapScale)=>({id:'open',revision:1,seed,mapScale,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]});
let cases=0;
for(const scale of [1,2])for(const seed of [0,1,3,4,67,4294967295,2407759483]){
 const g=generateRelayMission(room(seed,scale),{mode:'world'}),meta=g.record.meta,geometry=g.geometry,world=createStaticWorldAdapter(geometry),types=new Set(meta.compounds.map(c=>c.type));
 assert.deepEqual(geometry.islands,generateTerrainFoundation({seed,mapScale:scale}).islands,'original terrain generation');
 for(const type of new Set(runtimeLayouts.map(l=>l.id)))assert.ok(types.has(type),seed+' includes '+type);
 assert.equal(meta.bounds.x1,2400*scale-3);assert.ok(meta.compounds.length>=17);assert.ok(meta.vehicles.length>=31);assert.ok(meta.vehicles.some(v=>v.t==='ferry'));assert.ok(meta.vehicles.some(v=>v.t.startsWith('heli')));
 assert.ok(geometry.piers.length);assert.ok(geometry.bunker?.basement);assert.ok(meta.compounds.find(c=>c.type==='prison-camp').landmarks.filter(l=>l.kind==='tower').length===4);
 assert.ok(meta.supplies.some(s=>s.item==='bazooka'));assert.ok(meta.supplies.some(s=>s.item==='sniperAmmo'));
 for(const v of meta.vehicles)for(const k of ['x','y','z','hd','v'])assert.ok(Number.isFinite(v[k]));
 const ids=[...geometry.buildings,...geometry.walls.filter(w=>w.id),...meta.vehicles,...meta.supplies].map(r=>r.id);assert.equal(new Set(ids).size,ids.length,'world instance IDs unique');
 for(const p of g.record.checkpoint.players){const q=world.resolveBody(p,p);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<1e-5);assert.equal(p.hp,25);}
 assert.ok(Buffer.byteLength(JSON.stringify(g.record))<1_000_000);assert.ok(Buffer.byteLength(JSON.stringify(geometry))<1_000_000);assert.ok(JSON.stringify(restoreRelayMission(g.record,geometry).setup('a')).length<1_000_000,'within current socket envelope');
 const plan=bunkerBasementPlan(geometry.seed,geometry.bunker);assert.equal(plan.variant,geometry.bunker.basement.variant);assert.equal(plan.stairX,geometry.bunker.basement.stair.x);
 const b=geometry.bunker,eye={x:b.x,y:b.basement.floorY+1,z:b.z},target={...eye,z:eye.z+1};assert.equal(traceArena(eye,target,geometry,world).hit,false,'basement shot is not stopped by surface terrain');
 const m=restoreRelayMission(g.record,geometry);m.setStatus('running');for(let i=1;i<=10;i++){assert.ok(m.accept('a',{protocol:1,epoch:m.meta.id,sequence:i,input:{forward:1,turn:0,strafe:0,run:false},interact:true}));m.step();}
 assert.equal(m.snapshot().phase,'relay','exploration does not require relay terminals');const restored=restoreRelayMission(m.checkpoint(0),geometry);assert.deepEqual(restored.snapshot(),m.snapshot());m.setStatus('paused');const before=m.snapshot();m.step();assert.deepEqual(m.snapshot(),before);cases++;
}
const first=generateRelayMission(room(67,1),{mode:'world'}),again=generateRelayMission(room(67,1),{mode:'world'});assert.deepEqual(first.geometry,again.geometry);assert.deepEqual(first.record.meta.compounds,again.record.meta.compounds,'world placement is deterministic');
// The trusted simulation must actually leave the old relay area and fly in world mode.
const ground=createStaticWorldAdapter(first.geometry),base=first.record.meta.compounds[0];let outside=null;
for(let turn=0;turn<32&&!outside;turn++){const x=base.x+Math.cos(turn*Math.PI/16)*220,z=base.z+Math.sin(turn*Math.PI/16)*220,y=ground.heightAt(x,z)+.06,p={x,y,z,hd:0},q=ground.resolveBody(p,p);if(y>1&&Math.hypot(q.x-x,q.z-z)<1e-5&&!ground.locomotionAt(x,z,y).interior)outside=p;}
assert.ok(outside);let saved=structuredClone(first.record);saved.status='running';Object.assign(saved.checkpoint.players[0],outside);let moving=restoreRelayMission(saved,first.geometry);moving.accept('a',{protocol:1,epoch:moving.meta.id,sequence:1,input:{forward:1,turn:0,strafe:0,run:false},interact:false});moving.step();assert.ok(Math.hypot(moving.snapshot().players[0].x-base.x,moving.snapshot().players[0].z-base.z)>200,'world actor is not clamped to relay bounds');
saved=structuredClone(first.record);saved.status='running';const helicopter=saved.meta.vehicles.find(v=>v.t.startsWith('heli'));helicopter.seats[0]='a';Object.assign(saved.checkpoint.players[0],{x:helicopter.x,y:helicopter.y,z:helicopter.z});moving=restoreRelayMission(saved,first.geometry);for(let i=1;i<=10;i++){moving.accept('a',{protocol:1,epoch:moving.meta.id,sequence:i,input:{forward:0,turn:0,strafe:0,run:false,climb:1},interact:false});moving.step();}assert.ok(moving.snapshot().vehicles.find(v=>v.id===helicopter.id).y>helicopter.y+.5,'world uses shared helicopter lift');
console.log('open world: '+cases+' seed/scale cases, original islands, all compound families, unique IDs, boats/heli, supplies, spawn, full bounds, bunker layout/trace, socket size, exploration, deterministic generation, pause/checkpoint passed');
