import assert from 'node:assert/strict';
import {bunkerGateDuration,advanceBunkerGate} from '../src/building-shell.mjs';
for(const [difficulty,seconds] of [[.6,3],[1,5],[1.5,10]]){
 assert.equal(bunkerGateDuration(difficulty),seconds);
 for(const hz of [30,60]){
  let progress=0;
  for(let i=0;i<seconds*hz;i++){
   assert.ok(progress<1);
   progress=advanceBunkerGate(progress,true,1/hz,difficulty);
  }
  assert.equal(progress,1);
  for(let i=0;i<seconds*hz;i++)progress=advanceBunkerGate(progress,false,1/hz,difficulty);
  assert.equal(progress,0);
 }
}
console.log('bunker gate timing OK');
