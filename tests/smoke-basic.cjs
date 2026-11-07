#!/usr/bin/env node
'use strict';
// Prova mínima de l'arrencada del joc original; no és una validació WebGL.
const assert = require('node:assert/strict');
(async () => {
  const game = await require('./harness.cjs')();
  assert.equal(Boolean(game.run('started')), false, 'el menú no ha de generar la partida');
  game.start('67');
  const state = game.run(`(() => ({
    started,
    enemies: E.length,
    general: E.some(e => e.t === 'general'),
    buildings: B.length,
    vehicles: V.length,
    base: [P.base.x, P.base.z],
    player: [P.x, P.z],
    hq: [HQ.x, HQ.z]
  }))()`);
  assert.ok(Boolean(state.started), 'arrencada de la partida');
  assert.equal(state.general, true, 'el general és l’objectiu de la missió');
  assert.ok(state.enemies > 0 && state.buildings > 0 && state.vehicles > 0,
    'món amb enemics, edificis i vehicles');
  assert.ok([...state.base, ...state.player, ...state.hq].every(Number.isFinite),
    'coordenades de món vàlides');
  game.frame();
  console.log('PASS: arrencada, món, missió i primer fotograma');
})().catch(error => { console.error(error); process.exitCode = 1; });
