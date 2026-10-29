import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {vehicleGrenadeLaunch,grenadeLaunch} from '../src/weapon-catalog.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const types=Object.keys(vehicleSpecs.radii);
assert.equal(types.length,16,'test every individual vehicle family');
for(const t of types){
 const v={t,x:20,y:6,z:-7,hd:.8,v:12,strafeV:2};
 const flight=vehicleGrenadeLaunch(v,v.y),withoutMotion=vehicleGrenadeLaunch({...v,v:0,strafeV:0},v.y);
 if(t==='heli_combat'){assert.equal(flight,null);continue;}
 assert.ok(flight,t+' must permit grenades');
 assert.ok(Object.values(flight).every(Number.isFinite),t+' finite physics');
 assert.ok(flight.y>v.y+2,t+' spawn above deck/vehicle');
 assert.ok(Math.hypot(flight.x-v.x,flight.z-v.z)>1,t+' launch outside rider');
 assert.ok(Math.hypot(flight.vx-withoutMotion.vx,flight.vz-withoutMotion.vz)>8,
  t+' inherits forward/lateral momentum');
 assert.equal(flight.t,2.4,t+' fuse and existing ballistic time');
}
assert.equal(vehicleGrenadeLaunch(null),null,'no unmounted launch');
assert.deepEqual(vehicleGrenadeLaunch({t:'heli_combat',x:0,y:0,z:0,hd:0}),null);
const base={x:0,y:0,z:0},onFoot=grenadeLaunch(.5,base,0);
assert.equal(onFoot.y,2.05,'the original on-foot grenade simulation stays intact');
const solo=read('src/combat.js'),controls=read('src/game-core.js'),ui=read('src/ui.js'),html=read('index.html');
assert.match(solo,/const minHeight=origin\.y\+2\.2,minimumGap=\.8;/,'arc begins near the head');
assert.match(solo,/window\.HUNTER_SHARED_WEAPONS\.vehicleGrenadeLaunch/,'single player uses shared launch');
assert.match(solo,/function throwVehicleGrenade\(\)/);
assert.match(solo,/if\(!cv\|\|cv\.t==='heli_combat'/,'combat helicopter is excluded');
assert.match(controls,/if\(c==='KeyB'\)\{if\(cv\)throwVehicleGrenade\(\)/,'B is an independent grenade shortcut');
assert.match(controls,/vehicle-grenade-active/,'vehicle grenade control is context-sensitive');
assert.match(html,/id="vehicleGrenadeButton"[^>]+data-k="KeyB"/,'touch button uses the same key');
assert.match(ui,/veh\.t!=='heli_combat'/,'HUD explains mounted grenade availability');
console.log('Grenade trajectories: all 16 vehicle families, helicopter exclusion, momentum, foot head arc and solo controls passed');
