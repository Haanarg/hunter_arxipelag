#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DEFAULT,planSuiteRuns}=require('../tools/run-test-suites.cjs');
const pkg=require('../package.json'),root=path.resolve(__dirname,'..');
const plan=planSuiteRuns(pkg.scripts,DEFAULT);
assert(plan.requested>plan.runs.length,'les suites conjuntes tenen repeticions');
assert.equal(plan.requested-plan.runs.length,plan.skipped);
assert.equal(new Set(plan.runs.map(t=>t.command)).size,plan.runs.length);
for(const t of plan.runs)assert(fs.existsSync(path.join(root,t.args[0])),t.command+' no existeix');
const selected=new Set(plan.runs.map(t=>t.group));
for(const group of DEFAULT)assert(selected.has(group),'manca la suite '+group);
const demo=planSuiteRuns({a:'node tests/a.cjs && node tests/b.mjs',
 b:'node tests/b.mjs && node tests/c.cjs'},['a','b']);
assert.deepEqual(demo.runs.map(t=>t.command),
 ['node tests/a.cjs','node tests/b.mjs','node tests/c.cjs']);
assert.equal(demo.skipped,1);
assert.throws(()=>planSuiteRuns({a:'rm -rf .'},['a']),/Ordre no admesa/);
console.log('PASS: '+plan.requested+' ordres; '+plan.runs.length+' úniques; '+
 plan.skipped+' execucions repetides evitades');
