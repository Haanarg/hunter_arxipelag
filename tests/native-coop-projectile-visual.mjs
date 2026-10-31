import assert from 'node:assert/strict';
import {createNativeCoopProjectileVisual} from '../src/native-coop-projectile-visual.mjs';
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} vs ${b}`);
const pose=(z)=>({x:0,y:1.5,z});
const row=(id,z,extra={})=>({id,x:0,y:1.5,z,vx:0,vy:0,vz:-130,actorId:'a',weapon:'pistol',...extra});
const shot=(id,extra={})=>({id:100,kind:'shot',tick:3,projectileId:id,weapon:'pistol',actorId:'a',from:pose(-.7),to:pose(-1.7),...extra});
const render=(p,dt=0)=>{
 let last=new Map();
 p.advance(dt,(id,at)=>last.set(id,at));
 return last;
};
// A 10 Hz, la bala ja ha recorregut 13 m quan arriba. El jugador
// ha corregut 2 m addicionals: la bala ha de néixer al canó ACTUAL.
{
 const p=createNativeCoopProjectileVisual(),first=row('bullet',-13.7),s=shot('bullet');
 p.receive([first],'a',()=>pose(-3),[s],3);
 near(render(p).get('bullet').z,-3);
 let before=-3;
 for(let i=0;i<24;i++){
  const next=render(p,1/240).get('bullet').z;
  assert(next<before&&before-next<.56,'Flight at 240 FPS must not jump');
  before=next;
 }
 p.receive([row('bullet',-26.7)],'a',()=>pose(-5),[s],6);
 near(render(p).get('bullet').z,before);
 assert.equal(p.stats.localMuzzleStarts,1);
 assert.equal(p.stats.rejectedCorrections,0);
 near(first.z,-13.7);
}
// Una discrepància de 148 m no pot fer teleportar la bala.
{
 const p=createNativeCoopProjectileVisual();
 p.receive([row('b',-10,{actorId:'b'})],'a',null,[],3);
 const before=render(p,.08).get('b').z;
 p.receive([row('b',-160,{actorId:'b'})],'a',null,[],6);
 near(render(p).get('b').z,before);
 p.receive([row('b',-170,{actorId:'b'})],'a',null,[],9);
 near(render(p).get('b').z,before);
 assert(p.stats.rejectedCorrections>=1);
 assert.equal(p.stats.maxCorrectionM,0);
}
// Un tret que impacta abans del snapshot té una traça efímera
// confirmada per shot, sense inventar projectils de dany.
{
 const p=createNativeCoopProjectileVisual(),e=shot('hit');
 p.receive([],'a',()=>pose(-2),[e],4);
 near(render(p).get('hit').z,-2);
 assert.equal(p.stats.shortLivedShots,1);
 let count=0,removed=0;
 for(let i=0;i<30;i++)p.advance(1/240,()=>count++,()=>removed++);
 assert(count>=16&&removed===1,'Confirmed short shot must be visible then expire');
 p.receive([],'a',()=>pose(-4),[e],7);
 assert.equal(p.stats.shortLivedShots,1);
 assert.equal(p.stats.active,0);
}
// No reproduir esdeveniments antics en reconnectar.
{
 const p=createNativeCoopProjectileVisual(),e=shot('old');
 p.prime([e]);
 p.receive([],'a',()=>pose(-1),[e],4);
 assert.equal(p.stats.active,0);
 p.receive([],'a',()=>pose(-1),[shot('stale',{id:150,tick:-15})],4);
 assert.equal(p.stats.ignoredStaleShots,1);
}
// Les files immutables dels deltes conserven el seu rellotge.
{
 const p=createNativeCoopProjectileVisual(),same=row('same',-4);
 p.receive([same],'a',null,[],3);
 const before=render(p,.08).get('same').z;
 p.receive([same],'a',null,[],6);
 near(render(p).get('same').z,before);
 p.receive([],'a',null,[],9);
 assert.equal(p.stats.active,0);
}
console.log('native coop bullets: moving muzzle, 240 FPS, 148m rejection, short hits, prime and deltas passed');
