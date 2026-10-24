'use strict';
// Reproduce evidence from an untouched v0.5.79 checkout, without updating expected values.
// node tests/phase10-capture-baseline.cjs /path/to/clean-baseline /path/outside/repository
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const source=require('./phase10-snapshot.cjs');
const expected=require('./fixtures/phase10/manifest.json');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
(async()=>{
  assert.ok(process.argv[2]&&process.argv[3],'provide untouched baseline checkout and external diagnostics directory');
  const root=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]),repository=path.resolve(__dirname,'..');
  assert.ok(output!==repository&&!output.startsWith(repository+path.sep),'capture diagnostics outside the repository; never refresh expected values');
  assert.notEqual(process.env.HUNTER_TEST_BUNDLE,'1','baseline capture uses untouched source modules');
  for(const [file,sha] of Object.entries(expected.sourceHashes))
    assert.equal(digest(fs.readFileSync(path.join(root,file))),sha,'untouched baseline source '+file);
  fs.mkdirSync(output,{recursive:true});const results=[];
  for(const testCase of expected.cases){
    if(process.env.PHASE10_CASE&&!`${testCase.seed}/${testCase.scale}/${testCase.physical?'physical':'logical'}`.includes(process.env.PHASE10_CASE))continue;
    const game=await require(path.join(root,'tests/harness.cjs'))(root),math=Object.create(Math);let ambient=0x10c0ffee;
    math.random=()=>{ambient=(Math.imul(ambient,1664525)+1013904223)>>>0;return ambient/4294967296};game.context.Math=math;
    if(!testCase.physical)game.run('seedSearchMode=true');game.start(String(testCase.seed),testCase.scale);
    const data=game.run(source),bytes=Buffer.from(JSON.stringify(data)),sha256=digest(bytes);
    fs.writeFileSync(path.join(output,testCase.file),zlib.gzipSync(bytes,{level:9}));
    const record={seed:testCase.seed,scale:testCase.scale,physical:testCase.physical,sha256,matchesCommitted:sha256===testCase.sha256};
    results.push(record);console.log(JSON.stringify(record));
    if(!record.matchesCommitted)process.exitCode=1;
  }
  fs.writeFileSync(path.join(output,'reproduced.json'),JSON.stringify({sourceHashes:expected.sourceHashes,ambientMathSeed:expected.ambientMathSeed,results},null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1});
