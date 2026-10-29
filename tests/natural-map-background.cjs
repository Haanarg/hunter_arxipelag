'use strict';
// The map and minimap must use an immutable, pre-levelling height snapshot.
// Test actual minimap renderer and 2D pixels without WebGL or a browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/minimap.js','utf8');
const core=fs.readFileSync('src/game-core.js','utf8');
assert(core.includes('baseHeightAt:rawHAt,colorAt:window.HUNTER_TERRAIN.colorAt'),
  'The game must pass raw, unlevelled terrain to both maps');
assert(!core.includes('heightAt:hAt,colorAt:window.HUNTER_TERRAIN.colorAt'),
  'The full game must not expose compound platforms to the minimap');
const built=[];
function canvas(width=170,height=170){
 const c={width,height,images:[],pixels:null};
 const ctx={
   createImageData(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)}},
   putImageData(image){c.pixels=new Uint8ClampedArray(image.data)},
   drawImage(img){c.images.push(img)},
   clearRect(){},fillRect(){},strokeRect(){},save(){},restore(){},
   beginPath(){},arc(){},fill(){},stroke(){},moveTo(){},lineTo(){},
   fillText(){},strokeText(){},setLineDash(){}
 };
 c.getContext=()=>ctx;
 return c;
}
const document={createElement(tag){
 assert.equal(tag,'canvas');
 const c=canvas();built.push(c);return c;
}};
const context={window:{},document,performance:{now:()=>0},Math};
vm.runInNewContext(src,context);
const main=canvas(170,170),full=canvas(500,500);
let supportIsland=false,flattenHeight=20,samples=0;
const natural=(x,z)=>{
 samples++;
 if(Math.hypot(x,z)<400)return 7;
 if(supportIsland&&Math.hypot(x-950,z+950)<320)return 5;
 return -3;
};
// Final game physics has a bright, unnaturally level rectangle at the HQ.
const leveled=(x,z)=>Math.abs(x)<260&&Math.abs(z)<200?flattenHeight:natural(x,z);
let visibleLevelCalls=0;
const maps=context.window.HUNTER_MINIMAP.create({
 THREE:{},canvas:main,worldSize:4800,halfSize:2400,
 baseHeightAt:natural,
 colorAt:(_three,height)=>({
   r:height>=10?1:0,g:height>=0&&height<10?1:0,b:height<0?1:0,
   convertLinearToSRGB(){return this}
 }),
 getState:()=>({base:{x:0,z:0},hq:{x:0,z:0},mapKnown:false,
   current:{x:0,z:0,hd:0},vehicles:[],enemies:[],log:[],intel:[]})
});
function pixel(image,x,z){
 const n=128,i=Math.floor((x/4800+.5)*n),j=Math.floor((z/4800+.5)*n);
 return Array.from(image.pixels.slice((j*n+i)*4,(j*n+i)*4+4));
}
let steps=0;for(const step of maps.buildBackgroundSteps())steps++;
assert(steps>0,'The precomputed bitmap builds progressively');
assert.equal(maps.stats.backgroundBuilds,1);
const first=built[0];assert.equal(first.width,128);
assert.deepEqual(pixel(first,0,0),[0,255,0,255],
 'Base terrain at the HQ remains natural green, never the flattened bright band');
assert.deepEqual(pixel(first,2100,2100),[0,0,255,255],'Water is unchanged');
// Even if the actual physics height is changed after image creation, it does
// not contaminate the already-created navigational image.
const before=first.pixels.slice();
flattenHeight=35;
assert(leveled(0,0)>20,'The physical world was levelled at HQ');
maps.draw();maps.drawFull(full);
assert.equal(maps.stats.backgroundBuilds,1,'HUD and full map share one bitmap');
assert.deepEqual(first.pixels,before,'Later terrain levelling cannot modify the bitmap');
assert.equal(main.images.at(-1),first,'HUD uses the pristine terrain image');
assert.equal(full.images.at(-1),main,'Full map reuses the same HUD canvas');
assert.equal(visibleLevelCalls,0);
const originalSamples=samples;
for(const x of maps.buildBackgroundSteps())throw new Error('Unexpected duplicate image build');
assert.equal(samples,originalSamples,'Do not resample existing background');
// Late support islands must appear when a new image is built from final raw
// geography, but never from the raised compound pad.
const oldSupport=pixel(first,950,-950);
assert.deepEqual(oldSupport,[0,0,255,255]);
supportIsland=true;maps.reset();
for(const _ of maps.buildBackgroundSteps()){}
assert.equal(maps.stats.backgroundBuilds,2);
assert.deepEqual(pixel(built[1],950,-950),[0,255,0,255],
 'A support island added to canonical raw geography remains visible');
assert.deepEqual(pixel(built[1],0,0),[0,255,0,255],
 'A support-island rebuild still hides the HQ pad');
assert.throws(()=>context.window.HUNTER_MINIMAP.create({
 THREE:{},canvas:main,worldSize:4800,halfSize:2400,
 colorAt:()=>({}),getState:()=>({})
}),error=>error?.name==='TypeError','No fallback to levelled heightAt is allowed');
console.log('PASS: natural map bitmap, no flattened HQ squares, dynamic overlays, support islands and resets');

