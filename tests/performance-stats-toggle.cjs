#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.includes('body:not(.performance-stats-visible) #perfStats{display:none}'),
   'La capa estadística és invisible per defecte');
 const game=await require('./harness.cjs')(),body=game.el('body');
 assert.equal(body.classList.contains('performance-stats-visible'),false);
 game.run("started=1;document.body.classList.add('game-started');panel('pause')");
 assert.doesNotMatch(game.el('panelBody').innerHTML,/showPerfStatsPause/,
   'El menú de pausa principal ja no inclou estadístiques');
 game.run("panel('performance')");
 const options=game.el('showPerfStatsOptions');
 assert.equal(options.checked,false,'Les estadístiques continuen apagades per defecte');
 options.checked=true;options.onchange();
 assert.equal(body.classList.contains('performance-stats-visible'),true,
   'El submenú permet activar les estadístiques');
 assert.equal(game.run('performanceStatsVisible'),true);
 game.run("panel('pause')");
 assert.doesNotMatch(game.el('panelBody').innerHTML,/showPerfStatsPause/);
 game.run('resume()');
 assert.equal(body.classList.contains('performance-stats-visible'),true,
   'Les estadístiques mantenen l’estat en reprendre');
 game.run("panel('performance')");
 const toggle=game.el('showPerfStatsOptions');
 assert.equal(toggle.checked,true);
 toggle.checked=false;toggle.onchange();
 assert.equal(body.classList.contains('performance-stats-visible'),false);
 assert.equal(game.run('performanceStatsVisible'),false);
 console.log('OK: el toggle de rendiment només és al submenú, no a la pausa');
})().catch(e=>{console.error(e);process.exitCode=1});
