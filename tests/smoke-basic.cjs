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
  // El moll és suport sòlid: un cotxe no pot inundar-se simplement
  // perquè sota les taules hi ha mar profunda. Sense moll sí que s'inunda.
  const pierCheck = game.run(`(() => {
    const x=H-120,z=H-120,shore=window.HUNTER_VEHICLE_DYNAMICS.shore,
      sea=wy(x,z,elapsed),bed=hAt(x,z),
      dock={x,z,ux:0,uz:1,px:1,pz:0,length:18,width:12,y:sea+2},
      makeCar=()=>({t:'cotxe',x,z,hd:0,v:0,sideV:0,strafeV:0,
        driveInput:0,steerInput:0,yawRate:0,envCd:0,bump:0,
        life:VT.cotxe.life,o:{position:new THREE.Vector3(x,dock.y+.05,z),userData:{}}});
    const rawDepth=sea-bed;
    piers.push(dock);
    let supportedDepth,dry;
    try {
      const car=makeCar();
      supportedDepth=sea-groundAt(x,z);
      stepV(car,0,0,0,1/60);
      dry=!car.waterIngress?.dead;
    } finally {piers.pop();}
    const inWater=makeCar();
    stepV(inWater,0,0,0,1/60);
    return {rawDepth,supportedDepth,dry,wet:!!inWater.waterIngress?.dead,
      threshold:shore.land.cotxe.stall};
  })()`);
  assert.ok(pierCheck.rawDepth>pierCheck.threshold,
    'l\'aigua sota el moll ha de ser prou profunda per inundar el cotxe');
  assert.ok(pierCheck.supportedDepth<0&&pierCheck.dry,
    'sobre el moll el cotxe conserva el motor sec');
  assert.ok(pierCheck.wet,'fora del moll el cotxe segueix inundant-se');
  console.log('PASS: arrencada, missió, moll sec i inundació a mar oberta');
})().catch(error => { console.error(error); process.exitCode = 1; });
