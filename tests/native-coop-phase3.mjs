import assert from 'node:assert/strict';
import {towerExplosionAim,explosionDamage,combatBalance} from '../src/combat-rules.mjs';
import {weaponCatalog} from '../src/weapon-catalog.mjs';
import {stepAirborne,fallLandingDamage} from '../src/player-vertical.mjs';
import {SHARED_SHARKS} from '../src/shark-motion-core.mjs';
import {createNativeFauna} from '../server/coop-fauna.mjs';
import {createCoopIntel} from '../src/coop-intel-core.mjs';
import {createRelayCombat} from '../server/coop-combat.mjs';

// Abast 3-D real, no un cilindre: la torre rep dany als suports,
// però el C4 no travessa muntanyes ni augmenta la distància horitzontal.
assert.equal(weaponCatalog.c4.damage,combatBalance.weapons.c4);
assert.equal(weaponCatalog.c4.splash,48);
const tower={id:'tower',t:'torre',x:0,y:0,z:0,hp:8},
  source={x:0,y:.32,z:1},aim=towerExplosionAim(tower,source);
assert.equal(aim.y,2.2);
assert(explosionDamage(weaponCatalog.c4.damage,
 Math.hypot(source.x-aim.x,source.y-aim.y,source.z-aim.z),
 weaponCatalog.c4.splash)>=tower.hp);
assert.equal(towerExplosionAim(tower,{x:15,y:.32,z:0}).y,9.4,
 'El tret llunyà continua fent servir la caseta superior');

// Regressió de combat real: el pilar és el primer obstacle, no un mur
// de cobertura. L'ona no ha de morir abans de destruir la torre.
{
 const players=[{id:'host',x:100,y:0,z:0,hp:25,hd:0},
  {id:'guest',x:110,y:0,z:0,hp:25,hd:0}],
  inventory=new Map(players.map(p=>[p.id,{bullets:20,c4:1,weapon:'pistol'}])),
  geometry={walls:[{x0:-1,x1:1,z0:0,z1:.25,y0:0,y1:7,
    open:false,hp:8,towerLegOwner:true}],buildings:[]},
  world={heightAt:()=>0,locomotionAt:()=>({floor:0,terrain:0,basement:false}),
    resolveBody:(a,b)=>b},
  combat=createRelayCombat({meta:{id:'tower-phase3',mode:'native',seed:14,
    targets:[tower]},record:{grenades:[{id:'c4',actorId:'host',weapon:'c4',
       x:0,y:.24,z:1,vx:0,vy:0,vz:0,landed:true,explodeAt:1}]},
    inventory,players:()=>players,visiblePlayers:()=>[],
    vehicles:{live:()=>[],mounted:()=>null,blastDistance:()=>0},
    geometry:()=>geometry,world:()=>world,active:()=>true,
    damagePlayer:()=>false});
 combat.step(1);
 assert.equal(combat.snapshot().targets[0].hp,0,
   'El C4 col·locat sota una torre destrueix la caseta tot i els propis pilars');
 assert.equal(combat.snapshot().effects.find(e=>e.kind==='explosion')?.weapon,'c4',
   'La detonació autoritativa identifica el model visual C4 als dos clients');
}

// La física compartida ja limita la velocitat de descens a -4.8 m/s.
let fall={kind:'air',y:40,vy:0,vx:0,vz:0,t:0,
 leanF:0,leanS:0,startHeight:40,parachute:true};
for(let i=0;i<60;i++)fall=stepAirborne({x:0,z:0,hd:0},fall,
  {forward:0,strafe:0},1/30,200).fall;
assert(fall.vy>=-4.8);
assert.equal(fallLandingDamage(fall,{water:false,maxHealth:25}),0);

{
 const player={id:'host',x:0,y:-2,z:-2,hp:25,swimming:true,fall:null},
  secondary={id:'guest',x:500,y:0,z:500,hp:25,swimming:false,fall:null},
  school=[{id:'shark-0',x:0,z:0,cx:0,cz:0,r:15,a:0,sp:.3,
    phase:0,sharkMode:'chase',biteCd:0}],
  meta={mode:'native',sharks:school},world={heightAt:()=>-10},hits=[];
 const fauna=createNativeFauna({meta,players:()=>[player,secondary],
  world:()=>world,vehicles:{mounted:()=>null},
  damagePlayer:(id,d)=>{hits.push({id,d});return true;}});
 for(let tick=1;tick<=50;tick++)fauna.step(tick);
 assert(hits.some(hit=>hit.id==='host'&&hit.d===SHARED_SHARKS.BITE_DAMAGE),
  'Els mateixos taurons que a solo mosseguen el nedador proper');
 assert.equal(fauna.snapshot().sharks.length,1);
 const restored=createNativeFauna({meta,record:fauna.checkpoint(),
    players:()=>[player,secondary],world:()=>world,
    vehicles:{mounted:()=>null},damagePlayer:()=>true});
 assert.deepEqual(restored.snapshot(),fauna.snapshot(),
  'La fauna es restaura igual per als dos navegadors');
}

{
 const sites=[{x:50,z:40,real:true},
  ...Array.from({length:8},(_,i)=>({x:-500+i*100,z:-200+i*20,real:false}))],
  meta={mode:'native',mapScale:2,intel:{sites,eliminationOrder:[1,2,3,4,5,6,7,8]},
   vehicles:[{id:'heli',t:'heli',x:-100,z:-100}],
   targets:[{id:'tank',t:'tanc',x:200,z:-100}]},
  intel=createCoopIntel({meta});
 intel.pickup('mapa',-300,-300);assert.equal(intel.snapshot().stage,1);
 intel.pickup('mapa',-300,-200);assert.equal(intel.snapshot().stage,1,
   'Un quadrant no pot comptar dues vegades');
 intel.pickup('mapa',300,-300);assert.equal(intel.snapshot().discarded.length,3);
 intel.pickup('mapa',-300,300);assert.equal(intel.snapshot().discarded.length,6);
 intel.pickup('mapa',300,300);assert.equal(intel.snapshot().confirmed,true);
 intel.pickup('mapa_heli',-100,-100);
 intel.pickup('mapa_tanc',200,-100);
 assert.deepEqual(new Set(intel.snapshot().knownVehicles.map(v=>v.id)),
   new Set(['heli','tank']));
 assert.deepEqual(createCoopIntel({meta,record:intel.checkpoint()}).snapshot(),
   intel.snapshot(),'Mapes compartits persistits al checkpoint');
}
console.log('COOP fase 3: C4 / torre, paracaigudes, taurons i mapes compartits OK');
