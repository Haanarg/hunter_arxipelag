#!/usr/bin/env node
'use strict';
// Matrix skipping is RENDER ONLY. Gameplay and deferred LOD wakeups must
// continue using exact transform updates without any stale matrices.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const win={};
vm.runInNewContext(fs.readFileSync('src/hidden-matrix.js','utf8'),{window:win});
const skipper=win.HUNTER_HIDDEN_MATRIX.create();
class Node {
 constructor(name){this.name=name;this.visible=true;this.children=[];this.parent=null;
   this.matrixWorldNeedsUpdate=true;this.updateCount=0;}
 add(child){child.parent=this;this.children.push(child);return this;}
 updateMatrixWorld(force){
   this.updateCount++;
   if(this.matrixWorldNeedsUpdate||force){
     this.matrixWorldNeedsUpdate=false;force=true;
   }
   for(const child of this.children)child.updateMatrixWorld(force);
 }
}
const scene=new Node('scene'),model=new Node('vehicle');
const full=new Node('hunter-vehicle-full-detail'),detail=new Node('wheel');
const proxy=new Node('distant-proxy');
scene.add(model);model.add(full).add(proxy);full.add(detail);
assert(skipper.register(model));assert(skipper.register(full));
assert.equal(skipper.register(full),false,'register once only');
scene.updateMatrixWorld(true);
const fullBefore=full.updateCount,detailBefore=detail.updateCount;
full.visible=false;proxy.visible=true;
skipper.beginRender();
scene.updateMatrixWorld(true);
assert.equal(skipper.skipped,1,'one invisible LOD subtree omitted');
skipper.endRender();
assert.equal(detail.updateCount,detailBefore,'hidden descendant skipped during render');
assert.equal(full.updateCount,fullBefore,'hidden group did not recompute');
assert.equal(full.matrixWorldNeedsUpdate,true,'hidden group marked dirty');
assert.equal(skipper.rendering,false);
// Physical collision / muzzle queries outside render must remain exact.
scene.updateMatrixWorld(true);
assert(detail.updateCount>detailBefore,'hidden rig matrices available to gameplay');
const wokenBefore=detail.updateCount;
full.visible=true;
skipper.beginRender();scene.updateMatrixWorld(false);skipper.endRender();
assert(detail.updateCount>wokenBefore,'LOD wake-up recomputes descendant transforms');
full.visible=false;
const oldProxyCount=proxy.updateCount;
model.visible=false;
skipper.beginRender();scene.updateMatrixWorld(true);skipper.endRender();
assert.equal(skipper.skipped,1,'invisible parent prunes its full hierarchy');
assert.equal(proxy.updateCount,oldProxyCount,'hidden parent prevents all descendant work');
model.visible=true;
skipper.beginRender();scene.updateMatrixWorld(false);skipper.endRender();
assert(proxy.updateCount>oldProxyCount,'revealed parent restores all world matrices');
assert.equal(skipper.rendering,false);
const core=fs.readFileSync('src/game-core.js','utf8');
assert(core.includes('hiddenMatrixCull.beginRender()'));
assert(core.includes('hiddenMatrixCull.endRender()'));
assert(core.includes("mesh.name==='hunter-enemy-full'"));
assert(core.includes("mesh.name==='hunter-vehicle-full-detail'"));
assert(core.includes('renderHiddenGroupsSkipped:hiddenMatrixCull.skipped'));
const manifest=fs.readFileSync('src/runtime-scripts.mjs','utf8');
assert(manifest.includes('"src/hidden-matrix.js"'),
  'matrix culling script must load before game-core');
console.log('PASS: hidden LOD and parent branches skipped only in render; wake and physics exact');
