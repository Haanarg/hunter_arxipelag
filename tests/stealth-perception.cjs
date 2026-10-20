#!/usr/bin/env node
// Prova local lleugera: no genera illes ni consumeix minuts de GitHub Actions.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context=vm.createContext({window:{},Math});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/stealth.js'),'utf8'),context);
const s=context.window.HUNTER_STEALTH;
const near=(a,b,epsilon=.001)=>Math.abs(a-b)<epsilon;

assert(s.inView(0,0,0,-40),'El con veu davant');
assert(!s.inView(0,0,0,40),'El con no veu darrere');
assert(!s.inView(0,70,0,-10),'El con no veu als costats');
assert(!s.inView(0,0,0,-86),'La visió respecta els 85 m');
assert(!s.inView(0,0,55,-40),'La visió respecta la inclinació vertical');
assert(s.inView(Math.PI,0,0,40),'La rotació orienta el con');
assert(s.inView(0,0,0,-40,85*s.CONFIG.crouchVisibility),
  "Ajupir-se redueix la distància màxima de visió, però no l'anul·la");
assert(!s.inView(0,0,0,-60,85*s.CONFIG.crouchVisibility));

assert(s.RADII.crouch<s.RADII.walk&&s.RADII.walk<s.RADII.run,
  'Ajupir-se fa menys soroll que caminar i córrer');
const run=s.emit('run',10,1,-5),crouch=s.emit('crouch',100,1,20);
assert.equal(s.heardAt(25,1,-5)?.id,run.id,'Un soldat sent passes a 15 m');
assert.equal(s.heardAt(105,1,20),null,'No sent passos ajupits a 5 m');
assert.equal(s.heardAt(25,1,-5,run.id),null,'Un soroll ja sentit no es repeteix');
assert.equal(s.heardAt(25,1,-5,0,()=>.4),null,'Una paret amorteeix el so');
assert(near(s.RADII.sniper,220));
s.tick(.9);assert.equal(s.heardAt(10,1,-5),null,'Els sorolls caduquen');
s.clear();assert.equal(s.events().length,0,'Reiniciar partida neteja sorolls');
s.setDebug(true);assert(s.enabled());s.setDebug(false);assert(!s.enabled());
console.log('OK: percepció 3D, sorolls, ajupiment i interruptor de depuració');
