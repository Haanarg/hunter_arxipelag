#!/usr/bin/env node
'use strict';
// El LOD dels objectes només amaga malles. Mai elimina botí, col·lisions,
// murs, edificis ni recursos de la simulació.
const assert=require('node:assert/strict'),fs=require('node:fs');
const core=fs.readFileSync('src/game-core.js','utf8');
const plants=fs.readFileSync('src/vegetation.js','utf8');
const start=core.indexOf('const VISUAL_RANGES=');
const end=core.indexOf('const {visibilityStats,enemyLodStats}',start);
assert(start>0&&end>start);
const ranges=(profile)=>new Function('qualityName',core.slice(start,end)+
 'return VISUAL_RANGES;')(profile);
const desktop=ranges('desktop'),mobile=ranges('mobile'),ultra=ranges('ultra');
assert(desktop.items<=450&&desktop.props<=750,'limit genuinely distant objects');
assert(mobile.items<desktop.items&&ultra.items<mobile.items);
assert(desktop.vehicles===2080&&desktop.enemies===1850,'no enemy/vehicle loss');
assert(desktop.buildings===1650,'building silhouettes stay at original distance');
assert(desktop.items>300,'pickups still visible several hundred metres away');
const a=core.indexOf('  const chunkRadius=113;',end),
 b=core.indexOf('  for(const v of V){',a);
const c=core.indexOf('  for(const item of items){',b),
 d=core.indexOf('  for(const f of fa){',c);
assert(a>0&&b>a&&c>b&&d>c);
const renderProps=new Function('staticVisualBatches','P','max','focus',
  'visibilityStats',core.slice(a,b));
const renderItems=new Function('items','P','max','focus',
  'visibilityStats',core.slice(c,d));
const P={x:0,z:0},counters={props:0,items:0};
const nearProp={position:{x:90,z:0},visible:true},
 farProp={position:{x:1600,z:0},visible:true};
renderProps([nearProp,farProp],P,desktop,null,counters);
assert.equal(nearProp.visible,true);
assert.equal(farProp.visible,false,'distant static decor batch culled');
const renderScope={intersectsXZBox:(x)=>x===1600,contains:(x)=>x===1100};
renderProps([farProp],P,desktop,renderScope,counters);
assert.equal(farProp.visible,true,'sniper focus preserves decorative detail');
const close={x:20,z:0,y:0,o:{visible:false}},
 far={x:1100,z:0,y:0,o:{visible:true}},
 border={x:433,z:0,y:0,o:{visible:true}};
renderItems([close,far,border],P,desktop,null,counters);
assert.equal(close.o.visible,true,'near pickup appears');
assert.equal(far.o.visible,false,'distant pickup culled');
assert.equal(border.o.visible,true,'hysteresis retains already-visible pickup');
border.o.visible=false;
renderItems([border],P,desktop,null,counters);
assert.equal(border.o.visible,false,'hysteresis prevents blinking');
renderItems([far],P,desktop,renderScope,counters);
assert.equal(far.o.visible,true,'sniper can focus distant pickups');
assert.equal(far.x,1100,'pickup remains in collection and is not destroyed');
const vegStart=plants.indexOf('      const extraRanges={'),
 vegEnd=plants.indexOf('      stats.bushSectors=',vegStart);
assert(vegStart>0&&vegEnd>vegStart);
const vegetationFor=profile=>new Function('profile',plants.slice(vegStart,vegEnd)+
 'return extraRanges;')(profile);
const foliage=vegetationFor('desktop');
assert(foliage.bush<1300&&foliage.rock<1900,'distant foliage reduced');
assert(foliage.bush>=900&&foliage.rock>=1300,'nearby vegetation unchanged');
assert(plants.includes('focus?.intersectsXZBox(sec.x,sec.z,CHUNK/2)'),
  'scope preserves distant vegetation');
assert(core.includes('for(let k=items.length-1;k>=0;k--)'),
  'pickup and physics remain independent of visual visibility');
console.log('PASS distant item/decor/vegetation culling, hysteresis, scope and unchanged world');
