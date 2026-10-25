'use strict';
// Authored prison geometry/access plus new-world synchronous/progressive parity.
// No phase 10 baseline fixture is regenerated: adding a compound changes the world.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const createGame=require('./harness.cjs');
const snapshotSource=require('./phase10-snapshot.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
function ambient(game){let state=0x11ca11;game.context.Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}}
const snapshot=game=>crypto.createHash('sha256').update(JSON.stringify(game.run(snapshotSource))).digest('hex');
const inspect=`(()=>{
 const camp=world.userData.prisonCamp,issues=[];
 if(!camp)return{issues:['Camp unavailable: '+JSON.stringify(world.userData.prisonCampUnavailable)]};
 const check=(test,message)=>{if(!test)issues.push(message)},layout=camp.layout,tr=compoundTransform(camp,camp.angle);
 const point=p=>{const q=tr(...p);return{x:q[0],z:q[1]}};
 check(camp.id==='prison-camp','registered camp');check(camp.angle===0,'fixed authored orientation');
 check(world.userData.compounds.filter(c=>c.id==='prison-camp').length===1,'one camp');
 check(layout.prisoners.filter(p=>p.role==='mechanic').length===1,'one mechanic');
 check(layout.prisoners.filter(p=>p.role==='farmer').length===4,'four farmers');
 check(camp.buildings.length===2&&camp.buildings.every(b=>!b.upperFloor),'one-storey barracks/workshop');
 const other=world.userData.compounds.filter(c=>c!==camp);
 for(const c of other)check(Math.hypot(c.x-camp.x,c.z-camp.z)>c.r+camp.r+33,'safe reservation from '+c.id);
 const solid=(x,z,r=.85)=>wallCandidates(x,z,r).some(w=>!w.open&&w.hp>0&&x>w.x0-r&&x<w.x1+r&&z>w.z0-r&&z<w.z1+r);
 let last=null,maxRise=0,samples=0;
 const route=layout.escapeRoute.map(point);
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(distance/.5);
  for(let n=0;n<=steps;n++){
   const t=n/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=groundAt(x,z,last?.y??hAt(x,z));
   check(y>.2,'dry evacuation route');check(!solid(x,z),'open evacuation route');
   if(last){const rise=Math.abs(y-last.y);maxRise=Math.max(maxRise,rise);check(rise<.8,'continuous evacuation ground '+rise)}
   last={x,z,y};samples++;
  }
 }
 for(const prisoner of layout.prisoners){
  const a=point([prisoner.x,prisoner.z]),b=route[0],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
  for(let n=0;n<=steps;n++){const t=n/(steps||1);check(!solid(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t),'prisoner reaches escape route')}
 }
 // The production movement predicate also checks vegetation, vehicles and height.
 // Test every farmer lane at real walking increments, plus the mechanic's route.
 if(typeof optionalCivilianCanMove==='function'){
  for(const lane of[-2.25,-.75,.75,2.25]){
   const points=layout.escapeRoute.map(p=>point([p[0]+lane,p[1]]));
   for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.1);
    let from={...a,y:hAt(a.x,a.z)};
    for(let n=1;n<=steps;n++){
     const t=n/steps,next={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};next.y=hAt(next.x,next.z);
     check(optionalCivilianCanMove(from,next,.55),'farmer production canMove lane '+lane);from=next;
    }
   }
  }
  const mechanicPath=[[0,3],[layout.rescuePoint.x,layout.rescuePoint.z],[layout.mechanicStation.x,layout.mechanicStation.z]].map(point);
  for(let i=1;i<mechanicPath.length;i++){
   const a=mechanicPath[i-1],b=mechanicPath[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.1);let from={...a,y:hAt(a.x,a.z)};
   for(let n=1;n<=steps;n++){
    const t=n/steps,next={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};next.y=hAt(next.x,next.z);
    check(optionalCivilianCanMove(from,next,.55),'mechanic production canMove');from=next;
   }
  }
 }
 // Check the real truck footprint, not a point or a conveniently small vehicle.
 const bay=point([layout.mechanicStation.x,layout.mechanicStation.z]),truck=vehicleBox({t:'camio',x:bay.x,z:bay.z,hd:0});
 const overlaps=(box,w)=>obbOverlap(box,{x:(w.x0+w.x1)/2,z:(w.z0+w.z1)/2,hd:0,w:w.x1-w.x0,d:w.z1-w.z0});
 check(!wallCandidates(bay.x,bay.z,18).some(w=>!w.open&&w.hp>0&&overlaps(truck,w)),'truck fits mechanic bay');
 const access=[[0,82],[0,36],[33,36],[33,16]].map(point);
 for(let i=1;i<access.length;i++){
  const a=access[i-1],b=access[i],distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(distance),hd=Math.atan2(a.x-b.x,a.z-b.z);
  for(let n=0;n<=steps;n++){
   const t=n/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,box=vehicleBox({t:'camio',x,z,hd});
   check(!wallCandidates(x,z,18).some(w=>!w.open&&w.hp>0&&overlaps(box,w)),'truck access through gate/workshop');
  }
 }
 return{issues,camp:{x:camp.x,z:camp.z,angle:camp.angle},routeSamples:samples,maxRise,truck:{w:truck.w,d:truck.d},candidates:window.HUNTER_BUILD_STATS.portSearch.prisonCampCandidates};
})()`;
async function complete(game,promise){
 let done=false,error,turns=0;promise.then(()=>done=true,e=>{error=e;done=true});
 while(!done){if(await game.runTask()){turns++;assert(turns<100000,'generation settles')}else await game.microtasks()}
 if(error)throw error;await promise;return turns;
}
(async()=>{
 const {runtimeLayouts}=await import('../src/compound-runtime-layouts.mjs');
 const camp=runtimeLayouts.find(l=>l.type==='prison-camp');assert(camp,'layout registered');
 assert.equal(camp.prisoners.length,5);assert.equal(camp.prisoners.filter(p=>p.role==='mechanic').length,1);
 assert.equal(new Set(camp.prisoners.map(p=>p.id)).size,5,'NPC IDs are unique');
 if(process.argv.includes('--presence')){
  // Fast authored-layout audit: same generation through the actual compound
  // search exit, without terrain meshes, NPCs or subsequent vehicle placement.
  const game=await createGame();game.run("seedSearchMode=true;seedSearchCategoryEl.value='compound'");
  for(const requested of[0,1,42,999,2026,4294967295]){
   game.run('requestedSeed='+requested+';build()');
   const state=plain(game.run(`(()=>{const c=world.userData.prisonCamp;
    return{seed,requestedSeed,scale:MAP_SCALE,camp:c?{x:c.x,z:c.z,angle:c.angle,fallbackIsland:c.fallbackIsland,islandIndex:c.islandIndex}:null,
     count:world.userData.compounds.filter(c=>c.id==='prison-camp').length,
     unavailable:world.userData.prisonCampUnavailable||null,
     reservedOverlap:!!c&&world.userData.compounds.some(o=>o!==c&&Math.hypot(o.x-c.x,o.z-c.z)<=o.r+c.r+33)};
   })()`));
   console.log('Camp presence audit',JSON.stringify(state));
   assert.equal(state.count,1,'one camp in requested seed '+requested+': '+JSON.stringify(state.unavailable));
   assert.equal(state.reservedOverlap,false,'no base/HQ/compound overlap in requested seed '+requested);
   assert.equal(state.camp.angle,0);
  }
  return;
 }
 const cases=process.argv.includes('--physical')?[[67,1,true]]:[[67,1,false],[12345,1,false],[67,2,false],[12345,2,false]];
 let sync67;
 for(const [seed,scale,physical]of cases){
  const game=await createGame();ambient(game);if(!physical)game.run('seedSearchMode=true');
  game.start(String(seed),scale);
  const state=plain(game.run(inspect));assert.deepEqual(state.issues,[],JSON.stringify({seed,scale,physical,...state}));
  if(seed===67&&scale===1&&!physical)sync67=snapshot(game);
  console.log('OK camp generation',JSON.stringify({seed,scale,physical,...state}));
  game.run('discardGeneratedWorld()');
 }
 if(sync67){
  const game=await createGame();ambient(game);game.run('seedSearchMode=true');
  const turns=await complete(game,game.startAsync('67',1));
  assert.equal(snapshot(game),sync67,'new-world authored camp and complete logical/RNG state match real progressive UI');
  assert.deepEqual(plain(game.run(inspect)).issues,[]);
  assert(turns>20,'new camp generation yields through production scheduler');
  game.run('discardGeneratedWorld()');
  console.log('OK camp sync/async logical parity and RNG continuation',turns);
 }
})().catch(error=>{console.error(error);process.exitCode=1});
