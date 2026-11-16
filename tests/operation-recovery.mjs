import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../src/operation-runtime.js',import.meta.url),'utf8'),ctx);
const run=source=>vm.runInContext(source,ctx);
run(`const a={id:'vehicles:0',kind:'vehicles',state:{t:'cotxe',x:10,z:20}},b={id:'vehicles:1',kind:'vehicles',state:{t:'cotxe',x:30,z:40}};
const current=[{...b,id:a.id},{...a,id:b.id},{id:'vehicles:2',kind:'vehicles',state:{t:'cotxe',x:60,z:70}}];
const matches=operationRecoveryPairs([a,b],current);`);
assert.equal(run('matches.get(a.id).id'),'vehicles:1');
assert.equal(run('matches.get(b.id).id'),'vehicles:0');
assert.equal(run('matches.size'),2);
assert.equal(run("operationRecoveryPairs([a,{...a,id:'vehicles:3'}],[a]).size"),0);
assert.equal(run("operationRecoveryPairs([{...a,state:{...a.state,x:99},identity:operationIdentity(a.kind,a.state)}],[a]).get(a.id).state.x"),99);
assert.equal(run("operationRecoveryPairs([{id:'enemies:7',kind:'enemies',state:{t:'soldat',x:99,z:99},nested:{home:{x:5,z:6}}}],[{id:'enemies:0',kind:'enemies',state:{t:'soldat',x:5,z:6}}]).size"),1);
assert.equal(run("operationReleaseSeries('0.6.1')"),run("operationReleaseSeries('0.6.224')"));
assert.notEqual(run("operationReleaseSeries('0.7.0')"),run("operationReleaseSeries('0.6.224')"));
assert.equal(run("operationRecoveryPairs([a],[{...a,state:{...a.state,t:'tanc'}}]).size"),0);
assert.equal(run("operationRecoveryPairs([a],[{...a,state:{...a.state,x:11}}]).size"),0);
console.log('operation recovery: reordered entities, ambiguity, spawn identity, legacy enemy home and release series passed');

// Exercise the actual restore cleanup with the runtime's existing globals only.
// The obsolete hangar-roof array (HR) no longer exists.
run(`let Pj=[{o:'projectile'}],grenades=[{o:'grenade'}],fx=[{m:'effect'}],DEAD=[{}];
const DB=[{m:'debris'}],WA=[{}],removed=[],world={remove:o=>removed.push(o)};
clearOperationTransientEffects();`);
assert.equal(run('JSON.stringify(removed)'),JSON.stringify(['projectile','grenade','effect','debris']));
assert.equal(run('[Pj,grenades,fx,DEAD,DB,WA].reduce((n,a)=>n+a.length,0)'),0);
assert.equal(run('typeof HR'),'undefined');
console.log('operation recovery: existing transient collections cleared without obsolete HR');
