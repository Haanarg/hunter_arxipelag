import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planBuildingShell,shellColliders,WOODEN_DOOR_HP,
 REINFORCED_STRUCTURE_HP,WOODEN_STRUCTURE_HP,BUNKER_DOOR_HP,BUNKER_STRUCTURE_HP} from '../src/building-shell.mjs';
import {canLightDamageWall,canLightDamageRoof,wallBlastDamage,roofBlastDamage} from '../src/combat-rules.mjs';
import {traceArena} from '../server/coop-combat.mjs';

const base={doorSide:0,doorWidth:2.4,doorHeight:3.8,noPartitions:true};
const cases=[
 {name:'militar normal',opt:{},wall:10,roof:10},
 {name:'taller',opt:{workshop:true},wall:10,roof:10},
 {name:'hangar',opt:{hangar:true,doorWidth:30,openDoor:true},wall:10,roof:10},
 {name:'búnquer',opt:{bunker:true,lockedDoor:true},wall:30,roof:30},
 {name:'barracó de fusta',opt:{weakWalls:true},wall:4,roof:4},
 {name:'cabana de fusta',opt:{civilianHut:true},wall:4,roof:4},
 {name:'doble planta',opt:{floors:2},wall:10,roof:10}
];
assert.equal(WOODEN_DOOR_HP,4);
assert.equal(BUNKER_DOOR_HP,20);
assert.equal(BUNKER_STRUCTURE_HP,30);
assert.equal(REINFORCED_STRUCTURE_HP,10);
assert.equal(WOODEN_STRUCTURE_HP,4);
for(const c of cases){
 const options={...base,...c.opt},plan=planBuildingShell(40,30,12,options,()=>.1);
 assert.equal(plan.wallHp,c.wall,c.name+' parets');
 assert.equal(plan.roofHp,c.roof,c.name+' sostre');
 const out=shellColliders(0,0,0,40,30,12,options,()=>.1);
 const walls=out.walls.filter(w=>!w.door);
 assert(walls.length>0,c.name+' sense parets');
 assert(walls.every(w=>w.hp===c.wall),c.name+' pared incompleta');
 assert(walls.every(w=>!!w.weakWood===(c.wall===4)),c.name+' classe de material incorrecta');
 const doors=out.walls.filter(w=>w.door);
 if(!c.opt.workshop&&!c.opt.hangar){
  assert(doors.length>0,c.name+' sense porta');
  assert(doors.every(w=>c.opt.bunker
    ?w.hp===20&&w.bunkerGate&&!canLightDamageWall(w)
    :w.hp===4&&canLightDamageWall(w)),c.name+' porta incorrecta');
 }
 const armor=c.wall>=10;
 assert(walls.every(w=>canLightDamageWall({...w,weakWood:!armor})===!armor),
  c.name+' regles arma lleugera');
 assert.equal(canLightDamageRoof({rhp:c.roof,weakWood:!armor}),!armor,
  c.name+' resistència sostre');
}
// L'hangar no tenia paret de fons: ha de ser una sola peça de 10 PV
// i existir amb la mateixa geometria a SOLO i al servidor COOP.
for(const doorSide of [0,1]){
 const opt={hangar:true,doorSide,doorWidth:30,openDoor:true,noPartitions:true};
 const plan=planBuildingShell(40,30,12,opt,()=>.1);
 const rear=plan.segments.filter(s=>s.hangarRearWall);
 assert.equal(rear.length,1,'hangar amb una sola paret posterior');
 assert.equal(rear[0].lx,0);
 assert.equal(rear[0].lz,doorSide===0?-14.6:14.6);
 assert.equal(rear[0].sx,40);
 assert.equal(rear[0].sz,.8);
 const colliders=shellColliders(0,0,0,40,30,12,opt,()=>.1);
 const wall=colliders.walls.find(w=>Math.abs(w.cz-rear[0].lz)<1e-8&&Math.abs(w.cx)<1e-8);
 assert(wall,'la paret posterior ha de col·lisionar al servidor COOP');
 assert.equal(wall.hp,10,'la paret posterior ha de tenir exactament 10 PV');
 assert.equal(wall.door,false);
 assert.equal(wall.weakWood,false);
 assert.equal(canLightDamageWall(wall),false);
 assert.equal(wallBlastDamage(wall,0,0,wall.cz,8,10),10,
  'un impacte pesat directe ha de destruir la paret posterior');
}
const reinforced={hp:10,door:false,weakWood:false},
 wood={hp:4,door:false,weakWood:true},
 door={hp:4,door:true,woodenDoor:false};
assert.equal(canLightDamageWall(reinforced),false);
assert.equal(canLightDamageWall(wood),true);
assert.equal(canLightDamageWall(door),true); // Excepte la porta blindada del búnquer.
assert.equal(canLightDamageWall({hp:20,door:true,bunkerGate:true}),false);
assert.equal(canLightDamageWall({hp:Infinity,door:true}),false);
assert.equal(canLightDamageRoof({rhp:10,wood:false,weakWood:false}),false);
assert.equal(canLightDamageRoof({rhp:4,weakWood:true}),true);
assert.equal(canLightDamageRoof({rhp:4,civilianHut:true}),true);
assert.equal(canLightDamageRoof({rhp:10,wood:true}),true);
assert.equal(roofBlastDamage({kind:'enemy_bunker',rhp:30,rb:false,x:0,z:0,w:20},0,0,15,10),10);
assert.equal(wallBlastDamage({hp:10,open:false,x0:0,x1:1,z0:0,z1:1,y1:8},.5,0,.5,8,10),10);

// La trajectòria del Worker ha de conservar l'índex del sostre impactat,
// per tal que una bala lleugera afecti només fusta, no una altra estructura.
const geometry={walls:[],buildings:[{x:0,z:0,w:20,d:20,fy:0,h:5,rb:false,rhp:4,weakWood:true}]};
const world={heightAt:()=>-100};
const trace=traceArena({x:0,y:10,z:0},{x:0,y:0,z:0},geometry,world);
assert.equal(trace.roofIndex,0);
assert.equal(trace.wallIndex,null);
assert(trace.hit&&trace.fraction>.3&&trace.fraction<.7);
const source=readFileSync(new URL('../src/combat.js',import.meta.url),'utf8');
assert(source.includes("canLightDamageWall(target)")&&source.includes("canLightDamageRoof(target)"));
assert(source.includes("if(!ineffective)dmgW(target,p.dmg,'light')"));
const game=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
assert(game.includes("if(shotClass==='light'&&!window.HUNTER_SHARED_COMBAT.canLightDamageWall(w))return;"));
const server=readFileSync(new URL('../server/coop-mission.mjs',import.meta.url),'utf8');
assert(server.includes('canLightDamageWall(w)')&&server.includes('canLightDamageRoof(building)'));
assert(game.includes('y0:fy-1,y1:fy+sh,hp:10,m,door:false'));
assert(game.includes('BUNKER_STRUCTURE_HP'));
assert(game.includes('BUNKER_DOOR_HP'));
const adapter=readFileSync(new URL('../src/world-adapter.mjs',import.meta.url),'utf8');
assert(adapter.includes('bunkerGate:!!w.bunkerGate'));
console.log('PV estructures: 10 parets/sostres/pilars; 4 portes/fusta; bales només als febles; SOLO+COOP.');
