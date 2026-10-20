'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.run("started=1;panel('pause')");
 const text=game.el('panelBody').innerHTML;
 for(const id of ['chetosMenu','restartMenu','performanceMenu'])
   assert(text.includes('id="'+id+'"'),'Cal mantenir el botó '+id);
 for(const id of ['inventoryMenu','zoomOut','zoomIn','showPerfStatsPause'])
   assert(!text.includes('id="'+id+'"'),'Cal eliminar el control '+id);
 assert(!text.includes('<b>I</b>'),'No s’ha de mostrar la tecla I');
 assert(text.includes('Desplaçament lateral, també nedant'),
   'La pausa conserva les instruccions de desplaçament lateral nedant');
 assert(text.includes('Córrer o nedar a crol'));
 assert(text.length<1600,'El text de pausa és massa llarg');
 assert.equal(typeof game.el('chetosMenu').onclick,'function');
 assert.equal(typeof game.el('restartMenu').onclick,'function');
 assert.equal(typeof game.el('performanceMenu').onclick,'function');
 game.el('performanceMenu').onclick();
 assert.match(game.el('panelBody').innerHTML,/id="showPerfStatsOptions"/,
   'El toggle ha d’aparèixer al submenú tècnic');
 game.el('performanceBack').onclick();
 assert(!game.el('panelBody').innerHTML.includes('showPerfStatsPause'));
 console.log('OK: menú de pausa compacte, sense els quatre controls retirats');
})().catch(e=>{console.error(e);process.exitCode=1});
