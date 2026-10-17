#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.includes('body:not(.performance-stats-visible) #perfStats{display:none}'),
   'La capa estadística és invisible per defecte');
 const game=await require('./harness.cjs')(),body=game.el('body');
 assert.equal(body.classList.contains('performance-stats-visible'),false,
   'No s’han activat les estadístiques a l’arrencada');
 game.run("started=1;document.body.classList.add('game-started');panel('pause')");
 const pause=game.el('showPerfStatsPause');
 assert.equal(pause.checked,false,'La pausa mostra el toggle desactivat');
 pause.checked=true;pause.onchange();
 assert.equal(body.classList.contains('performance-stats-visible'),true,
   'El toggle mostra les estadístiques sense reiniciar');
 assert.equal(game.run('performanceStatsVisible'),true,
   'Estat visual i estat intern coincideixen');
 game.run("panel('performance')");
 const options=game.el('showPerfStatsOptions');
 assert.equal(options.checked,true,'El submenú manté l’estat activat');
 options.checked=false;options.onchange();
 assert.equal(body.classList.contains('performance-stats-visible'),false,
   'El submenú també pot ocultar-les');
 game.run("panel('pause')");
 assert.equal(game.el('showPerfStatsPause').checked,false,'La pausa es sincronitza');
 game.el('showPerfStatsPause').checked=true;
 game.el('showPerfStatsPause').onchange();
 game.run('resume()');
 assert.equal(body.classList.contains('performance-stats-visible'),true,
   'El toggle es conserva en reprendre la partida');
 game.run("panel('pause')");
 assert.equal(game.el('showPerfStatsPause').checked,true,
   'El toggle es conserva en tornar al menú');
 game.el('showPerfStatsPause').checked=false;
 game.el('showPerfStatsPause').onchange();
 assert.equal(body.classList.contains('performance-stats-visible'),false);
 console.log('OK: rendiment ocult per defecte, pausa, diagnòstics i represa');
})().catch(e=>{console.error(e);process.exitCode=1});
