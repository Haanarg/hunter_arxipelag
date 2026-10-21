'use strict';
// La càrrega del Huey cau verticalment per l'obertura lateral i detona
// quan el rellotge arriba a zero, a l'aire o després d'aterrar.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const combat=read('src/combat.js'),core=read('src/game-core.js');
assert.match(combat,/function helicopterBombDoor\(v\)/);
assert.match(combat,/v\.o\.localToWorld\(new THREE\.Vector3\(1\.96,2\.02,\.52\)\)/);
assert.match(combat,/b\.vy=Math\.max\(-65,\(b\.vy\|\|0\)-24\*dt\)/);
assert.match(combat,/boom\(b\.x,b\.y,b\.z,48,COMBAT_BALANCE\.weapons\.c4/);
assert.match(core,/cv&&cv\.t!=='heli'/);
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('12345');game.frame();
 const init=game.run(`(()=>{
   inv.expl=5;cheats.immune=true;
   const g=new THREE.Group();
   g.position.set(P.x+170,125,P.z+140);
   g.scale.setScalar(VS.heli);
   scene.add(g);
   window.__c4TestHelicopter={t:'heli',x:g.position.x,z:g.position.z,
     hd:0,v:35,alt:g.position.y,o:g};
   cv=window.__c4TestHelicopter;
   return {x:g.position.x,y:g.position.y,z:g.position.z,scale:VS.heli};
 })()`);
 assert.equal(game.run("useInvItem('expl')"),true,'El Huey permet programar C4');
 assert.equal(game.run("ui.isBombTimerOpen()"),true);
 assert.equal(game.run('inv.expl'),5,'Obrir el LED no consumeix C4');
 assert.match(game.el('panelBody').innerHTML,/Activar i deixar caure/);
 game.el('bombTimerCancel').onclick();
 assert.equal(game.run('inv.expl'),5,'Cancel·lar des del Huey no consumeix C4');
 game.run("panel('bombtimer')");
 // El model es genera des de la porta lateral, orientada cap a la dreta.
 game.el('bombTimerConfirm').onclick();
 const initial=game.run(`(()=>{
   const b=bombs[bombs.length-1];
   return {x:b.x,y:b.y,z:b.z,t:b.t,vy:b.vy,falling:b.falling,
     rootY:b.o.position.y,landed:b.landed,count:inv.expl};
 })()`);
 assert.equal(initial.count,4);
 assert.equal(initial.t,3);
 assert.equal(initial.falling,true);
 assert.equal(initial.landed,false);
 assert.equal(initial.vy,0,'Caiguda des del repòs, sense impuls');
 assert(Math.abs(initial.x-init.x-1.96*init.scale)<.01);
 assert(Math.abs(initial.z-init.z-.52*init.scale)<.01);
 assert(Math.abs(initial.y-init.y-2.02*init.scale)<.01);
 const midpoint=game.run(`(()=>{
   const b=bombs[bombs.length-1];
   const startX=b.x,startZ=b.z,startY=b.y;
   for(let i=0;i<10;i++)updFx(.05);
   return{x:b.x,z:b.z,y:b.y,vy:b.vy,t:b.t,startX,startY,startZ,landed:b.landed};
 })()`);
 assert.equal(midpoint.x,initial.x,'Sense desplaçament horitzontal');
 assert.equal(midpoint.z,initial.z,'Sense inèrcia horitzontal');
 assert(midpoint.y<initial.y,'La bomba baixa');
 assert(midpoint.vy<0,'La gravetat accelera la caiguda');
 assert(midpoint.t>0,'El rellotge segueix corrent durant la caiguda');
 // Comprovam una detonació AÈRIA: esgota el temps a gran altura.
 const before=game.run('bombs.length');
 game.run(`(()=>{const b=bombs[bombs.length-1];b.t=.025;updFx(.05)})()`);
 assert.equal(game.run('bombs.length'),before-1,'Explota en esgotar-se el temps a l’aire');
 // L'helicòpter de combat mai no pot programar C4, tampoc via plant().
 const denied=game.run(`(()=>{
   const remaining=inv.expl;
   cv.t='heli_combat';
   const used=useInvItem('expl'),direct=plant(8);
   return{used,direct,remaining:inv.expl,previous:remaining};
 })()`);
 assert.equal(denied.used,false);
 assert.equal(denied.direct,false);
 assert.equal(denied.remaining,denied.previous);
 // Aterratge abans de detonar: la bomba es queda al terra amb el temps
 // restant, sense desaparèixer ni esclatar per contacte.
 const landed=game.run(`(()=>{
   cv.t='heli';cv.o.position.y=13;
   const ok=plant(50);const b=bombs[bombs.length-1];
   for(let i=0;i<150&&!b.landed;i++)updFx(.05);
   const y=b.y,remain=b.t;
   for(let i=0;i<10;i++)updFx(.05);
   const result={ok,landed:b.landed,y,after:b.y,remain,afterTimer:b.t};
   return result;
 })()`);
 assert.equal(landed.ok,true);
 assert.equal(landed.landed,true,'La bomba arriba al terra');
 assert.equal(landed.y,landed.after,'Queda quieta quan aterra');
 assert(landed.afterTimer<landed.remain,'El compte enrere segueix a terra');
 game.run("cv=null;scene.remove(window.__c4TestHelicopter.o)");
 console.log('OK C4 Huey: LED, caiguda vertical, detonació aèria, aterratge i combat prohibit');
})().catch(err=>{console.error(err);process.exitCode=1});
