import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MARINE_CREW_HP,marineCrewHeadWorld,marineCrewProjectileContact,
 breakMarineWindshield,damageMarineCrew} from '../src/vehicle-occupant-damage-core.mjs';

const boat={t:'patrulla_marina',x:0,y:0,z:0,hd:0,hp:50,
 marineCrewHp:[MARINE_CREW_HP,MARINE_CREW_HP],marineBrokenWindshield:[]};
const head=marineCrewHeadWorld(boat,0);
const from={x:head.x,y:head.y,z:-16},to={x:head.x,y:head.y,z:16};
let hit=marineCrewProjectileContact(from,to,boat);
assert.equal(hit?.kind,'marine-glass','frontal shot breaks a pane first');
assert.equal(hit.pane,0,'left-side soldier lies behind left pane');
assert.equal(breakMarineWindshield(boat,hit.pane),true);
assert.equal(breakMarineWindshield(boat,hit.pane),false);
hit=marineCrewProjectileContact(from,to,boat);
assert.equal(hit?.kind,'marine-crew','same shot line can then hit soldier');
assert.equal(hit?.seat,0);
assert.equal(damageMarineCrew(boat,0,MARINE_CREW_HP),true);
assert.equal(boat.marineCrewHp[0],0,'sniper can kill soldier without exploding boat');
assert.equal(boat.hp,50,'hull integrity is independent');
assert.equal(boat.marineCrewHp[1],MARINE_CREW_HP,'other rider survives');
assert.notEqual(marineCrewProjectileContact(from,to,boat)?.kind,'marine-crew',
 'a dead rider cannot take further bullet hits');
const right=marineCrewHeadWorld(boat,1);
const sideHit=marineCrewProjectileContact(
 {x:15,y:right.y,z:right.z},{x:-15,y:right.y,z:right.z},boat);
assert.equal(sideHit?.kind,'marine-crew','side shot can reach exposed crew directly');
assert.equal(sideHit.seat,1,'side hit reaches remaining rider');
const rotated={...boat,hd:Math.PI/2,marineCrewHp:[10,10],marineBrokenWindshield:[]};
const point=marineCrewHeadWorld(rotated,1);
assert.ok(Math.abs(point.x)>1,'heading rotates the boarding positions');

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const combat=read('src/combat.js'),server=read('server/coop-combat.mjs'),
      visuals=read('src/marine-patrol.js'),model=read('src/vehicle-model-core.mjs'),
      native=read('src/coop-world-runtime.js');
assert.ok(combat.includes("else if(kind==='marine-crew')")&&
 combat.includes("else if(kind==='marine-glass')")&&
 combat.includes('marineCrewHeadWorld('));
assert.ok(server.includes("result.kind==='marine-crew'")&&
 server.includes("result.kind==='marine-glass'")&&
 server.includes('marineCrewHeadWorld('));
assert.ok(model.includes('scr.userData.boatWindshieldPane='));
assert.ok(visuals.includes('syncMarinePatrolCrew(boat,unit)'));
assert.ok(native.includes('marineBrokenWindshield'));
console.log('marine crew / front glass: ballistic and shared runtime regression passed');
