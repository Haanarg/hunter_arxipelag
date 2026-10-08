// Prova de regressió del minimapa: canvas 2D, marcadors, cache i mides.
(async()=>{
  const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
  const root=path.resolve(__dirname,'..');
  const THREE=await import(require('url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
  const calls=[];
  function canvas(w=170,h=170){
    const el={width:w,height:h};
    const context={
      createImageData:(a,b)=>({data:new Uint8ClampedArray(a*b*4)}),
      putImageData:im=>calls.push(['pixels',im.data.length,im.data.some(v=>v>0)]),
      drawImage:(...args)=>calls.push(['image',args.length]),
      clearRect:()=>{},fillRect:()=>calls.push(['rect']),
      beginPath:()=>{},arc:()=>calls.push(['arc']),fill:()=>{},
      stroke:()=>{},moveTo:()=>{},lineTo:()=>{},save:()=>{},restore:()=>{},
      fillText:()=>calls.push(['text']),strokeRect:()=>{}
    };
    el.getContext=()=>context;
    return el;
  }
  const main=canvas(),document={createElement:()=>canvas()};
  const context=vm.createContext({document,console,performance:{now:()=>0}});
  context.window=context;
  vm.runInContext(fs.readFileSync(path.join(root,'src/minimap.js'),'utf8'),context);
  let state={
    base:{x:0,z:0},hq:{x:800,z:650},mapKnown:true,
    current:{x:60,z:20,hd:1},currentVehicle:null,
    vehicles:[{x:90,z:20}],enemies:[{x:80,z:50}],
    log:[{x:30,z:10}],intel:[{kind:'heli',x:100,z:150}]
  };
  const minimap=context.HUNTER_MINIMAP.create({
    THREE,canvas:main,worldSize:4800,halfSize:2400,
    heightAt:(x,z)=>25-Math.hypot(x,z)/50,
    colorAt:(T,h)=>new T.Color(h>0?0x55dd44:0x0b486d),
    getState:()=>state
  });
  minimap.draw();
  assert.equal(minimap.stats.backgroundBuilds,1);
  assert(minimap.stats.lastLandPixels>0,'raster contains land');
  assert(calls.some(x=>x[0]==='pixels'&&x[2]),'raster pixel buffer was uploaded');
  const firstArcs=calls.filter(x=>x[0]==='arc').length;
  assert(firstArcs>=3,'player, nearby vehicles and enemies are drawn');
  const images=calls.filter(x=>x[0]==='image').length;
  state.current={x:120,z:45,hd:0};
  minimap.draw();
  assert.equal(minimap.stats.backgroundBuilds,1,'moving does not rebuild terrain');
  assert.equal(calls.filter(x=>x[0]==='image').length,images+1);
  minimap.setWorldSize(9600,4800);
  minimap.draw();
  assert.equal(minimap.stats.backgroundBuilds,2,'map size invalidates cache');
  minimap.reset();minimap.draw();
  assert.equal(minimap.stats.backgroundBuilds,3,'new world seed invalidates cache');
  const full=canvas(510,510);
  minimap.drawFull(full,{x:120,z:300});
  assert(calls.filter(x=>x[0]==='text').length>=2,'full map draws scale/compass');
  console.log(JSON.stringify({passed:true,draws:minimap.stats.draws,
    rebuilt:minimap.stats.backgroundBuilds,
    landPixels:minimap.stats.lastLandPixels,
    checks:['land/sea','player markers','movement','world-size reset','seed reset','full map']}));
})().catch(e=>{console.error(e);process.exitCode=1});
