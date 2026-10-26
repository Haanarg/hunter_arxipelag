'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('src/game-core.js','utf8');
const start=core.indexOf('function readGameStartOptions(difficulty=DIF){'),
  end=core.indexOf('function applyGameStartOptions(',start);
assert(start>=0&&end>start,'stress mode must use real game start helpers');
const section=core.slice(start,end);
assert(core.includes("new URLSearchParams(location.search||'').get('stress')==='1'"));
assert(core.includes('applyStressAuditPosition();'),'teleport after world generation');
const count={resetCamera:0,stream:0,visibility:0,shadows:0,map:0};
const P={x:0,y:0,z:0,hd:0};
const ctx={DIF:3,MAP_SCALE:1,stressAuditRequested:true,
 STRESS_AUDIT_PRESET:{seed:2407759483,x:1208,z:-1594,scale:1},
 seedRandomEl:{checked:true},seedInputEl:{value:'other'},
 currentMapScale:()=>2,seedFromText:s=>s,
 P,cv:{},hAt:()=>38,
 pl:{position:{set(x,y,z){this.x=x;this.y=y;this.z=z}},rotation:{y:0}},
 resetCameraState:()=>count.resetCamera++,
 cam:{position:{set(x,y,z){this.x=x;this.y=y;this.z=z}},
  lookAt(){count.looked=true}},
 terrainStream:{update:(x,z)=>{count.stream++;assert.equal(x,1208);assert.equal(z,-1594)}},
 visualQuality:{shadows:true},
 updateDistanceVisibility:()=>count.visibility++,
 updateShadowCasters:()=>count.shadows++,
 minimap:{reset:()=>{throw Error('Do not clear minimap background on teleport')}},
 mini:()=>count.map++
};
vm.runInNewContext(section+
  ';this.readGameStartOptions=readGameStartOptions;this.applyStressAuditPosition=applyStressAuditPosition',ctx);
const options=ctx.readGameStartOptions(2);
assert.equal(options.seed,2407759483);assert.equal(options.scale,1);
assert.equal(options.difficulty,2);
ctx.applyStressAuditPosition();
assert.equal(P.x,1208);assert.equal(P.z,-1594);assert.equal(P.y,38);
assert(Math.cos(P.hd)<0,'faces inland, toward map centre');
assert.equal(ctx.pl.position.x,1208);
assert.equal(count.stream,1);assert.equal(count.shadows,1);
assert.equal(count.visibility,1);assert.equal(count.map,1);
ctx.stressAuditRequested=false;
P.x=0;ctx.applyStressAuditPosition();assert.equal(P.x,0);
assert.equal(ctx.readGameStartOptions(1).scale,2,'normal game respects map size');
console.log('OK: stress preset uses reproducible seed/location without changing normal starts');
