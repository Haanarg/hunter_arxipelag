#!/usr/bin/env node
'use strict';
// Proves estadístiques del model compartit: no depenen del motor ni de WebGL.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync('src/enemy-accuracy.js','utf8'),ctx);
const a=ctx.window.HUNTER_ENEMY_ACCURACY;
const near=(actual,expected,tolerance=.00001)=>
  assert(Math.abs(actual-expected)<tolerance,actual+' != '+expected);
for(const d of [.6,1,1.5]){
  assert(a.spread(d,'rifle',40).horizontal<a.spread(d,'rifle',80).horizontal);
  assert(a.spread(d,'rifle',80).horizontal<a.spread(d,'rifle',160).horizontal);
  assert(a.spread(d,'marineMG',80).horizontal>a.spread(d,'rifle',80).horizontal);
  assert(a.spread(d,'marineRocket',80).horizontal>a.spread(d,'marineMG',80).horizontal);
  for(const weapon of Object.keys(a.profiles)){
    const s=a.spread(d,weapon,80);
    assert(Number.isFinite(s.horizontal)&&s.horizontal>0);
    assert(Number.isFinite(s.vertical)&&s.vertical>0);
  }
}
near(a.estimateHitChance(.6,'rifle',80),5/24);
near(a.estimateHitChance(1,'rifle',80),.5);
near(a.estimateHitChance(1.5,'rifle',80),.75);
assert(a.estimateHitChance(.6,'rifle',40)>a.estimateHitChance(.6,'rifle',160));
let state=1984;
const random=(lo,hi)=>{state=(Math.imul(1664525,state)+1013904223)>>>0;
  return lo+(hi-lo)*state/4294967296};
for(const d of [.6,1,1.5]){
  let hits=0;
  for(let i=0;i<40000;i++){
    const offset=a.sample(d,'rifle',80,0,0,random);
    near(offset.x,0,1e-8);
    if(Math.abs(offset.z)<=.6&&Math.abs(offset.y)<=.9)hits++;
  }
  assert(Math.abs(hits/40000-a.estimateHitChance(d,'rifle',80))<.012,
    'La simulació estadística ha de coincidir amb la probabilitat teòrica');
}
const enemy=fs.readFileSync('src/enemy-ai.js','utf8'),
      marine=fs.readFileSync('src/marine-patrol.js','utf8');
assert(enemy.includes('HUNTER_ENEMY_ACCURACY.sample(DIF,profile'));
assert(enemy.includes("HUNTER_ENEMY_ACCURACY.sample(DIF,'jeep'"));
assert(enemy.includes("u.t==='tanc'?'tank':'tankette'"));
assert(enemy.includes("eyeY-.2,rn,'towerHeavy'"));
assert(marine.includes("heavy?'marineRocket':'marineMG'"));
assert(!marine.includes('DIF<=.6?'),'Les patrulleres no han de tenir una escala pròpia');
console.log('OK: punteria unificada per dificultat, distància, tipus d’arma i enemic');
