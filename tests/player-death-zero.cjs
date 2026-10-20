'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('12345');game.frame();
 game.run("hp=.4;ui.renderHUD()");
 assert.match(game.el('hud').innerHTML,/❤️ 1\b/,
   'La vida positiva, encara que sigui inferior a 0,5, mai apareix com a zero al HUD');
 game.run("inv={med:1};panel('inventory')");
 assert.match(game.el('panelBody').innerHTML,/Vida 1 \/ 20/,
   'L’inventari també respecta la vida fraccionària');
 game.run("resume();hurtP(.4,true,{type:'bullet',x:P.x-8,y:P.y+2,z:P.z-10})");
 const state=game.run("({hp,over,active:deathCinematic?.active,cause:deathCinematic?.cause?.kind})");
 assert.equal(state.hp,0,'Un cop terminal deixa la vida exactament a zero');
 assert.equal(state.over,1,'El jugador deixa d’estar actiu');
 assert.equal(state.active,true,'La cinemàtica de mort s’inicia immediatament');
 assert.equal(state.cause,'bullet','La causa es conserva');
 game.run("clearDeathCinematic();over=0;hp=0");
 game.frame();
 const safeguard=game.run("({over,active:deathCinematic?.active,hp})");
 assert.equal(safeguard.hp,0);
 assert.equal(safeguard.over,1,'El bucle detecta la vida zero encara que no hi hagi un nou cop');
 assert.equal(safeguard.active,true,'La comprovació de seguretat inicia la mort');
 const uiSource=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
 assert.doesNotMatch(uiSource,/Math\.round\(s\.hp\)/);
 game.run("clearDeathCinematic()");
 console.log('OK: HUD i inventari sense fals zero; mort immediata i salvaguarda a vida zero');
})().catch(e=>{console.error(e);process.exitCode=1});
