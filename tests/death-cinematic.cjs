'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const cinematic=read('src/death-cinematic.js'),core=read('src/game-core.js'),
      combat=read('src/combat.js'),world=read('src/world-generation.js'),
      audio=read('src/audio.js'),scripts=read('src/runtime-scripts.mjs'),
      html=read('index.html');
const bells=[];
const ctx=vm.createContext({deathBell:volume=>bells.push(volume)});
vm.runInContext(cinematic,ctx);

const causes={
 bullet:'UN DISPAR',explosion:'UNA EXPLOSIÓ',fall:'UNA CAIGUDA',
 shark:'UN TAURÓ',runover:'UN ATROPELLAMENT',
 vehicleExplosion:'EL TEU VEHICLE',impact:'UN IMPACTE'
};
for(const [type,label] of Object.entries(causes)){
 assert.equal(ctx.deathCauseInfo({type}).title,label,'Etiqueta de mort: '+type);
}
assert.equal(ctx.deathCauseInfo(null).kind,'impact');
assert.equal(ctx.deathCauseInfo({type:'unknown'}).kind,'impact');
assert.equal(ctx.deathStageAt(0),'replay');
assert.equal(ctx.deathStageAt(4.49),'replay');
assert.equal(ctx.deathStageAt(4.5),'fade');
assert.equal(ctx.deathStageAt(6.3),'reaper');
assert.equal(ctx.deathStageAt(12.6),'finished');
// La caiguda de càmera lenta no pot aplicar la postura fixa de la Parca.
// Només la figura clonada dins l'escena negra pot adoptar-la.
assert.match(cinematic,/deathPoseProne\(player,\{x:0,y:0,z:\.85\}/);
assert.doesNotMatch(cinematic,/deathPoseProne\(pl[,)]/);
assert.doesNotMatch(cinematic,/deathFaceCamera\(pl[,)]/);
assert.match(cinematic,/v\.motion=deathInitialMotion\(v\)/);
assert.match(cinematic,/m\.velocity\.y-=\(inWater\?7:24\)\*step/);
assert.match(cinematic,/pl\.quaternion\.copy\(m\.orientation\)/);

// El final és repetible, els tres tocs de campana no es dupliquen i
// el botó apareix només quan la Parca ha acabat d'acostar-se.
const position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};
const v={active:true,finished:false,t:6.4,phase:'reaper',
 shade:{style:{}},replayLabel:{style:{}},causeEl:{style:{}},
 finale:{style:{}},button:{style:{display:'none'},focus(){this.focused=true}},
 reaper:{group:{position,rotation:{y:0}}},voidPlayer:{rotation:{y:0}},
 lastBell:-1};
ctx.testCinematic=v;
vm.runInContext('deathCinematic=testCinematic',ctx);
for(let i=0;i<70;i++)ctx.updateDeathCinematic(.1);
assert.equal(v.phase,'finished');
assert.equal(v.active,false);
assert.equal(v.finished,true);
assert.equal(v.button.style.display,'block');
assert.equal(v.button.focused,true);
assert.deepEqual(bells,[.83,.65,.55]);
assert.ok(position.z>-3,'La Parca arriba a prop del jugador');
ctx.updateDeathCinematic(.1);
assert.equal(bells.length,3,'La cinemàtica acabada no repeteix campanes');

assert.match(combat,/fin\('HAS MORT',cause\|\|/);
assert.match(combat,/type:'bullet',x:p\.sx,y:p\.sy,z:p\.sz/);
assert.match(combat,/type:'explosion',x,y,z/);
assert.match(combat,/type:'vehicleExplosion',x:v\.x/);
assert.match(core,/type:'shark',x:f\.x/);
assert.match(core,/type:'fall',x:P\.x/);
assert.match(core,/type:'runover',x:v\.x/);
assert.match(core,/if\(deathCinematic\?\.active\)updateDeathCinematic\(dt\)/);
assert.match(core,/ren\.render\(v\.voidScene,v\.voidCamera\)/);
assert.match(world,/clearVictoryCinematic\(\);clearDeathCinematic\(\)/);
assert.match(audio,/function deathBell\(volume=1\)/);
// Síntesi real dels parcials de campana, amb durada finita i silenci.
let starts=0,stops=0;
const bellCtx=vm.createContext({
 muted:false,AC:{currentTime:4,destination:{},
  createOscillator:()=>({frequency:{setValueAtTime(){}},connect(){},
   start(){starts++},stop(){stops++}}),
  createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}})
 }});
vm.runInContext(audio,bellCtx);
bellCtx.deathBell(.7);
assert.equal(starts,5,'Cinc harmònics metàl·lics per toc');
assert.equal(stops,5,'Tots els oscil·ladors de la campana s’aturen');
bellCtx.muted=true;bellCtx.deathBell(1);
assert.equal(starts,5,'El silenci del jugador és respectat');
assert.match(scripts,/"src\/death-cinematic\.js"/);
assert.match(cinematic,/window\.location\.reload\(\)/);
assert.match(html,/\.death-new-game/);
// Integració amb el model real del jugador, Three.js i el bucle del joc.
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('12345');game.frame();
 const started=game.run("(()=>{const previous=document.getElementById('hud').style.visibility||'';hurtP(999,true,{type:'bullet',x:P.x-8,y:P.y+2,z:P.z-10});return {active:deathCinematic?.active,over,hp,hidden:document.getElementById('hud').style.visibility,hasPlayer:!!deathCinematic?.voidPlayer,hasReaper:!!deathCinematic?.reaper?.group,hasEffect:!!deathCinematic?.replayEffect,previous}})()");
 assert.equal(started.active,true);
 assert.equal(started.over,1);
 assert.equal(started.hp,0);
 assert.equal(started.hidden,'hidden');
 assert.equal(started.hasPlayer,true);
 assert.equal(started.hasReaper,true);
 assert.equal(started.hasEffect,true);
 const natural=game.run("({angle:pl.rotation.x,voidAngle:deathCinematic.voidPlayer.rotation.x,hasMotion:!!deathCinematic.motion})");
 assert.equal(natural.hasMotion,true);
 assert.ok(Math.abs(natural.angle)<.1,
   'A la repetició el jugador conserva la rotació prèvia, no es posa bocaterrosa');
 assert.ok(Math.abs(natural.voidAngle+Math.PI/2)<.01,
   'Després de la fosa la Parca troba el cos bocaterrosa');
 game.run('updateDeathCinematic(.1)');
 const moved=game.run("({delta:deathCinematic.motion.angular.length(),replayAngle:pl.rotation.x,phase:deathCinematic.phase})");
 assert.equal(moved.phase,'replay');
 assert.ok(moved.delta>0,'La caiguda conserva impuls angular físic');
 for(let i=0;i<129;i++)game.run('updateDeathCinematic(.1)');
 const final=game.run("({phase:deathCinematic.phase,active:deathCinematic.active,button:deathCinematic.button.style.display,reaperZ:deathCinematic.reaper.group.position.z})");
 assert.equal(final.phase,'finished');
 assert.equal(final.button,'block');
 assert.equal(final.active,false);
 assert.ok(final.reaperZ>-4);
 game.run('clearDeathCinematic()');
 assert.equal(game.run('deathCinematic'),null);
 assert.equal(game.el('hud').style.visibility||'',started.previous);
 console.log('OK mort cinematogràfica: causes, càmera lenta, fosa, Parca, campanes, model 3D i reinici');
})().catch(e=>{console.error(e);process.exitCode=1});
