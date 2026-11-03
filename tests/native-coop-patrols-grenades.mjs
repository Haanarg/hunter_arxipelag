import assert from 'node:assert/strict';
import {createNativeCoopGrenadeVisual} from '../src/native-coop-grenade-visual.mjs';
import {createRelayCombat} from '../server/coop-combat.mjs';
import {stepMarinePatrol,stepLandPatrol,marineSeaClear} from '../src/patrol-motion-core.mjs';

const world={
 heightAt:(x,z)=>x>100?0:-10,
 resolveBody:(old,q)=>({...q}),
 locomotionAt:(x,z,y)=>({floor:x>100?0:-10,terrain:x>100?0:-10,interior:false,basement:false,drop:false}),
};
assert.equal(marineSeaClear(0,-100,500,world.heightAt,10),true);
assert.equal(marineSeaClear(200,-100,500,world.heightAt,10),false);
const ship={id:'mar',t:'patrulla_marina',x:0,y:.2,z:0,heading:0,
 home:{x:0,z:0},tx:0,tz:-250,wt:20,speed:16,sp:20,
 orbitSign:1,ai:true,hp:20,state:'patrol'},
 car={id:'jeep',t:'jeep',x:200,y:.06,z:200,heading:0,sp:22,wt:20,
 tx:200,tz:100,patrol:[{x:200,y:0,z:100}],ai:true,hp:12,state:'patrol'};
const actors=[{id:'host',x:0,y:0,z:-120,hp:25,hd:0},{id:'guest',x:460,y:0,z:460,hp:25,hd:0}];
const combat=createRelayCombat({
 meta:{id:'native-patrols',mode:'native',seed:37,difficulty:1,
   bounds:{x0:-500,x1:500,z0:-500,z1:500},targets:[ship,car]},
 players:()=>actors,visiblePlayers:()=>actors,
 inventory:new Map(actors.map(p=>[p.id,{actorId:p.id,weapon:'pistol',bullets:10}])),
 world:()=>world,geometry:()=>({walls:[],buildings:[]}),
 waterSurface:()=>0,active:()=>true,damagePlayer:()=>true
});
let shots=0;
for(let tick=1;tick<=40;tick++){
 combat.step(tick);
 shots+=combat.snapshot().effects.filter(e=>e.tick===tick&&e.kind==='shot'&&e.actorId==='mar').length;
}
const targets=combat.snapshot().targets;
assert.ok(targets.find(t=>t.id==='mar').z<0,'marine boat must navigate and move');
assert.ok(targets.find(t=>t.id==='jeep').z<200,'terrestrial jeep must follow its patrol route');
assert.ok(shots>0,'marine patrol crew fires its carried rifle and rocket launcher under server authority');
const visual=createNativeCoopGrenadeVisual();
let rendered;
visual.receive([{id:'g',weapon:'grenade',x:0,y:8,z:0,vx:7,vy:5,vz:-12}]);
visual.advance(1/60,(id,pos)=>rendered={...pos});
const first={...rendered};
for(let n=0;n<5;n++)visual.advance(1/60,(id,pos)=>rendered={...pos});
assert.ok(rendered.z<first.z&&rendered.x>first.x,'grenade flies on intermediate animation frames');
const last={...rendered};
visual.receive([{id:'g',weapon:'grenade',x:.7,y:8.38,z:-1.2,vx:7,vy:2.6,vz:-12}]);
visual.advance(1/60,(id,pos)=>rendered={...pos});
assert.ok(rendered.z<last.z&&Math.hypot(rendered.x-last.x,rendered.z-last.z)<1,
 'snapshot arrival must not teleport a flying grenade');
visual.receive([{id:'g',weapon:'grenade',x:2,y:0,z:-5,vx:0,vy:0,vz:0,landed:true}]);
visual.advance(1/60,(id,pos)=>rendered={...pos});
assert.deepEqual(rendered,{x:2,y:0,z:-5},'landing is authoritative and stops drift');
visual.receive([]);
assert.equal(visual.has('g'),false,'detonation removes grenade immediately');
console.log('native coop patrols + smooth grenade presentation: OK');
