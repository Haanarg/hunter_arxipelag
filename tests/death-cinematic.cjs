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
assert.ok(cinematic.includes('player.traverseVisible('),'El cos s\'enquadra pel seu volum visible');
assert.ok(cinematic.includes('voidCamera.lookAt(bodyCentre.x,'),'Cal centrar la càmera en el cos');
assert.ok(cinematic.includes('deathCreateUnderwater(v)'),'Escena submarina');
assert.ok(cinematic.includes('if(v.underwaterActive)scene.add(pl)'),'Restaurar pare del jugador');

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
assert.match(core,/ren\.render\(v\.voidScene,v\.voidCamera\)/);
assert.ok(core.includes('ren.render(deathCinematic.underwaterScene,cam)'),
 'El fons submarí s\'ha de renderitzar realment');
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
assert.ok(html.includes('.death-water-filter'),'Vel blau en CSS');
// Integració amb el model real del jugador, Three.js i el bucle del joc.
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('12345');game.frame();
 game.run("document.getElementById('lightAimReticle').style.visibility='visible';document.getElementById('lightAimReticle').style.display='block';");
 const started=game.run("(()=>{const previous=document.getElementById('hud').style.visibility||'';hurtP(999,true,{type:'bullet',x:P.x-8,y:P.y+2,z:P.z-10});return {active:deathCinematic?.active,over,hp,hidden:document.getElementById('hud').style.visibility,hasPlayer:!!deathCinematic?.voidPlayer,hasReaper:!!deathCinematic?.reaper?.group,hasEffect:!!deathCinematic?.replayEffect,hasDroppedWeapon:!!deathCinematic?.droppedWeapon,detachedWeapon:deathCinematic?.droppedWeapon?.object.parent===scene,previous}})()");
 assert.equal(started.active,true);
 assert.equal(started.over,1);
 assert.equal(started.hp,0);
 assert.equal(started.hidden,'hidden');
 assert.equal(game.el('lightAimReticle').style.visibility,'hidden','La retícula lleugera desapareix durant tota la mort');
 assert.equal(started.hasPlayer,true);
 assert.equal(started.hasReaper,true);
 assert.equal(started.hasEffect,true);
 assert.equal(started.hasDroppedWeapon,true,'La persona deixa anar el seu equipament');
 assert.equal(started.detachedWeapon,true,'El model ja no penja del braç');
 const natural=game.run("({angle:pl.rotation.x,voidAngle:deathCinematic.voidPlayer.rotation.x,hasMotion:!!deathCinematic.motion,bulletSpeed:deathCinematic.motion.velocity.length()})");
 assert.equal(natural.hasMotion,true);
 assert.equal(natural.bulletSpeed,0,'Un tret lleuger no propulsa el cos');
 assert.ok(Math.abs(natural.angle)<.1,
   'A la repetició el jugador conserva la rotació prèvia, no es posa bocaterrosa');
 assert.ok(Math.abs(natural.voidAngle+Math.PI/2)<.01,
   'Després de la fosa la Parca troba el cos bocaterrosa');
 game.frame(100);
 assert.ok(Math.abs(game.run('deathCinematic.t')-.1)<1e-9,
   'El bucle real avança la cinemàtica 100 ms sense perdre temps');
 const moved=game.run("({delta:deathCinematic.motion.angular.length(),replayAngle:pl.rotation.x,phase:deathCinematic.phase})");
 assert.equal(moved.phase,'replay');
 assert.ok(moved.delta>0,'La caiguda conserva impuls angular físic');
 for(let i=0;i<129;i++)game.run('updateDeathCinematic(.1)');
 const final=game.run("({phase:deathCinematic.phase,active:deathCinematic.active,button:deathCinematic.button.style.display,reaperZ:deathCinematic.reaper.group.position.z,weaponGrounded:deathCinematic.droppedWeapon?.grounded})");
 assert.equal(final.phase,'finished');
 assert.equal(final.button,'block');
 assert.equal(final.active,false);
 assert.equal(final.weaponGrounded,true,'L equipament arriba al terra');
 assert.ok(final.reaperZ>-4);
 const restoredWeapon=game.run("(()=>{const d=deathCinematic.droppedWeapon;clearDeathCinematic();return d.object.parent===d.parent&&d.object.visible===d.visible})()");
 assert.equal(restoredWeapon,true,'La neteja restaura el model i el pare original');
 assert.equal(game.run('deathCinematic'),null);
 assert.equal(game.el('hud').style.visibility||'',started.previous);
 assert.equal(game.el('lightAimReticle').style.visibility,'visible','En netejar la mort restaurem la visibilitat anterior');

 const staleBlast=game.run("(()=>{hp=20;over=0;playerEject={kind:'blast',vx:22,vy:14,vz:-13};startDeathCinematic({type:'bullet'});const speed=deathCinematic.motion.velocity.length();clearDeathCinematic();playerEject=null;return speed})()");
 assert.equal(staleBlast,0,'Un tret no hereta la propulsio anterior');
 const explosionSpeed=game.run("(()=>{hp=20;over=0;playerEject={kind:'blast',vx:18,vy:9,vz:0};startDeathCinematic({type:'explosion'});const speed=deathCinematic.motion.velocity.length();clearDeathCinematic();playerEject=null;return speed})()");
 assert.ok(explosionSpeed>10,'Una explosio continua expulsant el personatge');
 const aquatic=game.run("(()=>{\n hp=20;over=0;cv=null;ib=null;swimming=true;\n P.y=wy(P.x,P.z,elapsed)-2.1;\n const originalParent=pl.parent;\n const started=startDeathCinematic({type:'bullet'});\n const v=deathCinematic;\n if(!started||!v?.onWater||!v.underwaterScene)return {started:false};\n // El harness simplifica querySelector; assignam estils independents.\n v.waterFilter={style:{}};v.shade={style:{}};\n v.replayLabel={style:{}};v.causeEl={style:{}};\n const shallow=v.underwaterScene.background.getHex();\n for(let i=0;i<30;i++)updateDeathCinematic(.1);\n const result={\n   started:true,active:v.underwaterActive,\n   parent:pl.parent===v.underwaterScene,\n   darkened:v.underwaterScene.background.getHex()!==shallow,\n   tint:parseFloat(v.waterFilter.style.opacity)>0,\n   cameraBelow:cam.position.y<v.waterLevel,\n   filtered:!!v.waterFilter\n };\n clearDeathCinematic();\n result.restored=pl.parent===originalParent;\n return result;\n})()");
 assert.equal(aquatic.started,true,'Les morts nedant han de tenir escena submarina');
 assert.equal(aquatic.active,true,'El blau comença quan la càmera se submergeix');
 assert.equal(aquatic.parent,true,'El cos ha d’aparèixer davant del blau');
 assert.equal(aquatic.darkened,true,'El fons blau s’enfosqueix');
 assert.equal(aquatic.tint,true,'Hi ha un vel blau translúcid per davant');
 assert.equal(aquatic.cameraBelow,true,'La càmera acompanya el cos cap al fons');
 assert.equal(aquatic.restored,true,'Restauram el jugador al món després de la mort');

 console.log('OK mort cinematogràfica: causes, cos centrat, enfonsament blau, Parca, campanes, model 3D i reinici');
})().catch(e=>{console.error(e);process.exitCode=1});
