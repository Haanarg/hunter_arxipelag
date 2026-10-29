import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
import {personalWeapons,mountedWeapons,weaponCatalog} from '../src/weapon-catalog.mjs';
const room={id:'arsenal',revision:1,seed:67,mapScale:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},g=generateRelayMission(room,{mode:'proving'});
function fixture(weapon){const r=structuredClone(g.record);r.status='running';r.meta.vehicles=[];r.meta.targets=[{id:'dummy',t:'soldat',x:0,y:2.06,z:weapon==='knife'?-1.5:-8,hp:40}];r.checkpoint.players[1].x=100;return restoreRelayMission(r,g.geometry);}
for(const weapon of personalWeapons.filter(w=>w!=='cutters')){
 const m=fixture(weapon),epoch=m.meta.id,profile=weaponCatalog[weapon];assert.equal(m.inventoryCommand('a',{epoch,operation:'weapon',target:weapon,commandId:'select'}).code,'SELECTED');
 const before=m.snapshot().inventories[0][profile.ammo],message={epoch,weapon,commandId:'shot'};
 assert.equal(m.combatCommand('a',message).ok,true,weapon+' fire');assert.equal(m.combatCommand('a',message).duplicate,true);
 for(let i=0;i<(weapon==='c4'?155:12);i++)m.step();
 assert.ok(m.snapshot().combat.targets[0].hp<40,weapon+' hits');if(profile.ammo)assert.equal(m.snapshot().inventories[0][profile.ammo],before-(weapon==='assault'?3:1),weapon+' owns ammo');
 assert.equal(m.snapshot().inventories[1][profile.ammo],g.record.inventories[1][profile.ammo],weapon+' partner keeps ammo');
 const saved=m.checkpoint(0),restored=restoreRelayMission(saved,g.geometry);assert.deepEqual(restored.snapshot().combat,m.snapshot().combat,weapon+' restore');
}
let m=fixture('grenade'),epoch=m.meta.id;assert.equal(m.combatCommand('a',{epoch,weapon:'grenade',commandId:'throw'}).code,'THROWN');for(let i=0;i<80;i++)m.step();assert.equal(m.snapshot().inventories[0].grenades,7);assert.ok(m.snapshot().combat.effects.some(e=>e.kind==='explosion'));
const cut=structuredClone(g.record);cut.status='running';cut.meta.targets=[];cut.meta.vehicles=[];Object.assign(cut.checkpoint.players[0],{x:0,z:38,hd:Math.PI});m=restoreRelayMission(cut,g.geometry);epoch=m.meta.id;m.inventoryCommand('a',{epoch,operation:'weapon',target:'cutters',commandId:'equip'});assert.equal(m.combatCommand('a',{epoch,weapon:'cutters',commandId:'cut'}).code,'CUT');assert.deepEqual(m.snapshot().removedWalls,[0]);m=restoreRelayMission(m.checkpoint(0),g.geometry);assert.deepEqual(m.snapshot().removedWalls,[0]);assert.equal(m.setup('a').geometry.walls[0].open,true);
for(const [type,weapon] of Object.entries(mountedWeapons)){
 const r=structuredClone(g.record),v=r.meta.vehicles.find(v=>v.t===type);r.status='running';r.meta.vehicles=[v];v.seats[0]='a';Object.assign(r.checkpoint.players[0],{x:v.x,y:v.y,z:v.z});r.meta.targets=[];m=restoreRelayMission(r,g.geometry);epoch=m.meta.id;
 const before=m.snapshot().inventories[0].bullets;assert.equal(m.combatCommand('a',{epoch,weapon:'pistol',commandId:'mounted'}).code,'FIRED',type+' gun');assert.equal(m.snapshot().combat.projectiles[0].weapon,weapon);assert.equal(m.snapshot().inventories[0].bullets,before-(weapon==='pistol'?1:0));
 if(type==='heli_combat'){assert.equal(m.combatCommand('a',{epoch,weapon:'secondary',commandId:'missile'}).code,'FIRED');assert.equal(m.snapshot().vehicles[0].rockets,11);}
}
console.log('all personal weapons/tools and all mounted weapon families: equip, independent ammo, damage, burst, C4 fuse, wire cutting, restore, heavy shells and helicopter missile passed');

const wireShot=structuredClone(g.record);wireShot.status='running';wireShot.meta.vehicles=[];wireShot.meta.targets=[{id:'behind-wire',t:'soldat',x:0,y:2.06,z:50,hp:40}];Object.assign(wireShot.checkpoint.players[0],{x:0,z:38,hd:Math.PI});m=restoreRelayMission(wireShot,g.geometry);m.combatCommand('a',{epoch:m.meta.id,weapon:'pistol',commandId:'through-wire'});for(let i=0;i<5;i++)m.step();assert.equal(m.snapshot().combat.targets[0].hp,38,'individual light bullets cross barbed wire');
