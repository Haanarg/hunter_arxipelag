#!/usr/bin/env node
'use strict';
// Regressió: efecte glass del servidor natiu sense projectil gràfic local.
// Es prova la funció REAL de combat.js, no una reimplementació.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const combat=fs.readFileSync(path.join(root,'src/combat.js'),'utf8');
const pick=(start,end)=>{
  const a=combat.indexOf(start),b=combat.indexOf(end,a);
  assert.ok(a>=0&&b>a,'Missing function '+start);
  return combat.slice(a,b);
};
const effects=[
  pick('function shatterWindow(','function projectileImpactImmune('),
  pick('function spawnBulletImpact(','function updateBulletImpacts(')
].join('\n');
const meshes=[];
class Mesh{
  constructor(geometry,material){
    this.geometry=geometry;this.material=material;this.visible=true;
    this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};
    this.rotation={set(){}};
    this.scale={setScalar(){}};
  }
}
const ctx={
  Math,THREE:{Mesh},world:{add(mesh){meshes.push(mesh)}},
  bulletImpactMaterials:{glass:[{},{}]},
  bulletRicochetGeometry:{},bulletBloodGeometry:{},bulletSparkGeometry:{},
  bulletImpactFree:[],bulletImpacts:[],BULLET_IMPACT_LIMIT:40,
  rn:(a,b)=>(a+b)/2,snd(){},
};
vm.createContext(ctx);
vm.runInContext(effects,ctx,{filename:'src/combat.js:glass'});
ctx.wall={
  windowPanes:[{axis:'z',x:0,z:-8,y0:10,y1:12,width:2}],
  glassMeshes:[{visible:true}]
};
ctx.hit={x:0,y:11,z:-8};

// El servidor fa exactament shatterWindow(w, paneIndex, effect.at, null).
assert.equal(vm.runInContext('shatterWindow(wall,0,hit,null)',ctx),true);
assert.equal(ctx.wall.glassMeshes[0].visible,false,'the upstairs pane disappears');
assert.equal(ctx.bulletImpacts.length,10,'glass shards render without a local projectile');
assert.ok(ctx.bulletImpacts.every(f=>[f.vx,f.vy,f.vz].every(Number.isFinite)),
  'all fragments have finite velocity');
assert.equal(vm.runInContext('shatterWindow(wall,0,hit,null)',ctx),false,
  'the second client update cannot break the pane again');
assert.equal(ctx.bulletImpacts.length,10,'a replay cannot spawn duplicate fragments');
vm.runInContext('spawnBulletImpact("glass",0,11,-8,{vx:2,vy:1,vz:0})',ctx);
assert.equal(ctx.bulletImpacts.length,20,'solo impact retains its projectile direction');
assert.ok(ctx.bulletImpacts.every(f=>[f.vx,f.vy,f.vz].every(Number.isFinite)));
const manifest=fs.readFileSync(path.join(root,'src/runtime-bundle.mjs'),'utf8');
const bundleFile=manifest.match(/RUNTIME_BUNDLE_PATH\s*=\s*"([^"]+)"/)?.[1];
assert.ok(bundleFile,'runtime manifest must point to a generated bundle');
const bundle=fs.readFileSync(path.join(root,bundleFile),'utf8');
assert.ok(bundle.includes('vx=Number.isFinite(p?.vx)?p.vx:0'),
  'production bundle must include the same null-safe glass impact');
assert.ok(bundle.includes('function shatterWindow(w,index,point,p)'),
  'production bundle retains the real glass break event');
console.log('OK: native coop upstairs glass with null projectile, replay and production bundle');
