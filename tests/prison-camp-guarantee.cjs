'use strict';
// The guarantee is structural: exercise the planner with no acceptable natural
// terrain, then run the actual world builder through its emergency construction.
// Historical world snapshots remain immutable; parity compares current builds.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const createGame=require('./harness.cjs');
const snapshotSource=require('./phase10-snapshot.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
const hash=game=>crypto.createHash('sha256').update(JSON.stringify(game.run(snapshotSource))).digest('hex');
const ambient=game=>{let state=0x11ca11;game.context.Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}};
const inspect=`(()=>{
 const camp=world.userData.prisonCamp,issues=[],check=(ok,message)=>{if(!ok)issues.push(message)};
 if(!camp)return{issues:['camp missing']};
 check(world.userData.compounds.filter(c=>c.id==='prison-camp').length===1,'exactly one camp');
 check(!world.userData.prisonCampUnavailable,'no successful unavailable branch');
 check(camp.angle===0,'authored orientation');
 check(camp.layout.prisoners.length===5,'five authored prisoners');
 check(camp.layout.prisoners.filter(p=>p.role==='farmer').length===4,'four farmers');
 check(camp.layout.prisoners.filter(p=>p.role==='mechanic').length===1,'one mechanic');
 check(world.userData.compounds.indexOf(camp)===2,'camp reserved immediately after base/HQ');
 for(const other of world.userData.compounds.filter(c=>c!==camp))
  check(Math.hypot(other.x-camp.x,other.z-camp.z)>other.r+camp.r+33,'reserve overlaps '+other.id);
 const transform=compoundTransform(camp,camp.angle),point=p=>{const q=transform(...p);return{x:q[0],z:q[1]}};
 // The cage must really confine the captives until rescue. Route checks below
 // concern evacuation, so open the authored gate before testing their passage.
 const gate=camp.prisonGate;
 check(!!gate&&gate.colliders.length>0&&!gate.opened,'closed prisoner gate exists');
 const approach=point([0,23]),outside=point([0,25]);
 check(!optionalCivilianCanMove({...approach,y:hAt(approach.x,approach.z)},
   {...outside,y:hAt(outside.x,outside.z)},.94),'closed cage blocks escape');
 gate?.open();
 check(!!gate?.opened&&gate.colliders.every(w=>w.open),'rescue gate opens physically');
 const paths=[];
 for(const lane of[-2.25,-.75,.75,2.25])paths.push(camp.layout.escapeRoute.map(p=>point([p[0]+lane,p[1]])));
 const mechanic=camp.layout.prisoners.find(p=>p.role==='mechanic');
 paths.push([[mechanic.x,mechanic.z],...camp.layout.mechanicRoute].map(point));
 for(const prisoner of camp.layout.prisoners){const start=point([prisoner.x,prisoner.z]);
  paths.push([start,point(camp.layout.escapeRoute[0])]);}
 let movementSamples=0,maxRise=0;
 for(const path of paths)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.25));
  let previous={...a,y:hAt(a.x,a.z)};
  for(let k=1;k<=steps;k++){
   const t=k/steps,next={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};next.y=hAt(next.x,next.z);
   check(next.y>.2,'dry NPC access');maxRise=Math.max(maxRise,Math.abs(next.y-previous.y));
   check(optionalCivilianCanMove(previous,next,.94),'production NPC access');movementSamples++;previous=next;
  }
 }
 const road=world.userData.baseCoast?.points||[];
 for(let i=1;i<road.length;i++)check(prisonCampSegmentDistance(camp.x,camp.z,road[i-1],road[i])>camp.r+17,'coast road crosses camp');
 for(const route of world.userData.paths||[]){
  if(route.width!==8)continue;
  for(let i=1;i<route.points.length;i++){
   const a={x:route.points[i-1][0],z:route.points[i-1][1]},b={x:route.points[i][0],z:route.points[i][1]};
   check(prisonCampSegmentDistance(camp.x,camp.z,a,b)>camp.r+11,'external road crosses camp');
  }
 }
 const support=islands.filter(i=>i.prisonCampSupport),npcs=prisonerSystem.snapshot();
 check(npcs.entities.length===5,'five configured NPCs');
 return{issues,seed,requestedSeed,scale:MAP_SCALE,placement:camp.placement,camp:{x:camp.x,z:camp.z,r:camp.r},
  support: support.map(i=>({x:i.x,z:i.z,r:i.r,peakX:i.peakX,peakZ:i.peakZ})),
  movementSamples,maxRise,counts:Object.fromEntries(['polvori','comunicacions','heliport','port'].map(id=>[id,world.userData.compounds.filter(c=>c.id===id).length])),
  candidates:window.HUNTER_BUILD_STATS.portSearch.prisonCampCandidates,npcs:npcs.entities.length};
})()`;
async function finish(game,promise){
 let done=false,error,turns=0;promise.then(()=>done=true,e=>{error=e;done=true});
 while(!done){if(await game.runTask()){turns++;assert(turns<100000,'progressive generation settles')}else await game.microtasks()}
 if(error)throw error;await promise;return turns;
}
async function plannerCases(){
 const game=await createGame();
 const state=plain(game.run(`(()=>{
  const layout=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.id==='prison-camp'),
    a={x:-1500,z:-1500,r:520},b={x:1500,z:1500,r:520},central={x:0,z:0,r:320},list=[a,b,central];
  let calls=0;const previous=R;R=()=>{throw new Error('planner consumed R()')};
  const plan=heightAt=>drainBuildSteps(planPrisonCampSteps(layout,{islandList:list,baseIsland:a,hqIsland:b,
   heightAt,halfSize:2400,siteClear:q=>Math.hypot(q.x,q.z)<500,
   createSupportIsland:()=>{calls++;return{x:0,z:0,r:320,peakX:0,peakZ:0}}}));
  try{
   let rejectedHeightSamples=0;
   const rejected=drainBuildSteps(surveyPrisonCampSiteSteps(layout,0,0,{halfSize:2400,siteClear:()=>false,heightAt:()=>{rejectedHeightSamples++;return 6}}));
   const cancelled=planPrisonCampSteps(layout,{islandList:list,baseIsland:a,hqIsland:b,heightAt:()=>-20,halfSize:2400,siteClear:()=>true,createSupportIsland:()=>{throw new Error('cancelled planner constructed support')}});
   cancelled.next();cancelled.return();
   const flat=plan(()=>6),steep=plan((x,z)=>300+.8*x),wet=plan(()=>-20);
   return{flat:{placement:flat.placement,candidates:flat.candidates,h:flat.site.h},
    steep:{placement:steep.placement,h:steep.site.h,min:steep.terrain.minHeight,max:steep.terrain.maxHeight},
    wet:{placement:wet.placement,candidates:wet.candidates,h:wet.site.h},supportCalls:calls,rejected,rejectedHeightSamples};
  }finally{R=previous}
 })()`));
 assert.equal(state.flat.placement,'natural');assert.equal(state.flat.candidates,1);assert.equal(state.flat.h,6);
 assert.equal(state.steep.placement,'terrace');assert(state.steep.h>=state.steep.min&&state.steep.h<=state.steep.max);
 assert.equal(state.wet.placement,'support-island');assert.equal(state.wet.h,3);
 assert.equal(state.wet.candidates,3*257,'all original island candidates fail before support construction');
 assert.equal(state.supportCalls,1,'support island only when all dry sites fail');
 assert.equal(state.rejected,null);assert.equal(state.rejectedHeightSamples,0,'occupied reservations are never sampled or modified');
 console.log('OK deterministic planner branches, no R()',JSON.stringify(state));
}
async function matrix(){
 const game=await createGame();game.run("seedSearchMode=true;seedSearchCategoryEl.value='compound'");
 for(const scale of[1,2])for(const requested of[0,1,42,67,999,2026,12345,4294967295]){
  game.run('requestedSeed='+requested+';MAP_SCALE='+scale+';S=4800*MAP_SCALE;H=S/2;'+`(()=>{
   const steps=buildSteps();let next;
   while(!(next=steps.next()).done)if(next.value?.stage==='Camp de presoners'){steps.return();return}
   throw new Error('camp checkpoint was never reached');
  })()`);
  const result=plain(game.run(`(()=>{const c=world.userData.prisonCamp;return{seed,requestedSeed,scale:MAP_SCALE,
   camps:world.userData.compounds.filter(o=>o.id==='prison-camp').length,placement:c?.placement,
   compoundCount:world.userData.compounds.length,
   overlap:!c||world.userData.compounds.some(o=>o!==c&&Math.hypot(c.x-o.x,c.z-o.z)<=c.r+o.r+33)}})()`));
  assert.equal(result.seed,requested,'requested seed preserved');assert.equal(result.camps,1,JSON.stringify(result));assert.equal(result.overlap,false,JSON.stringify(result));
  assert.equal(result.compoundCount,3,'camp reserved immediately after base/HQ');
  console.log('OK early camp reservation matrix',JSON.stringify(result));
 }
}
async function stress(){
 const seeds=new Set([0,1,67,12345,4294967295]);let state=0x11ca11;
 while(seeds.size<1024){state=(Math.imul(state,1664525)+1013904223)>>>0;seeds.add(state)}
 const game=await createGame();game.run("seedSearchMode=true;seedSearchCategoryEl.value='compound'");
 const started=Date.now(),counts={natural:0,terrace:0,'support-island':0},fallbackCases=[];
 let completed=0,baseReseeds=0;
 for(const scale of[1,2])for(const requested of seeds){
  const result=plain(game.run('requestedSeed='+requested+';MAP_SCALE='+scale+';S=4800*MAP_SCALE;H=S/2;'+`(()=>{
   try{
    const steps=buildSteps();let next,beforeCampSeed=null,found=false;
    while(!(next=steps.next()).done){
     if(next.value?.stage==='Base i quarter general')beforeCampSeed=seed;
     if(next.value?.stage==='Camp de presoners'){found=true;steps.return();break}
    }
    if(!found)throw new Error('camp checkpoint was never reached');
    const c=world.userData.prisonCamp,b=c&&prisonCampFootprint(c.layout);
    return{seed,requestedSeed,beforeCampSeed,scale:MAP_SCALE,
     camps:world.userData.compounds.filter(o=>o.id==='prison-camp').length,placement:c?.placement,
     third:world.userData.compounds[2]===c,compoundCount:world.userData.compounds.length,
     overlap:!c||world.userData.compounds.some(o=>o!==c&&Math.hypot(c.x-o.x,c.z-o.z)<=c.r+o.r+33),
     inMap:!!c&&Number.isFinite(c.x)&&Number.isFinite(c.z)&&c.x+b.minX>-H+120&&c.x+b.maxX<H-120&&c.z+b.minZ>-H+120&&c.z+b.maxZ<H-120,
     farmers:c?.layout.prisoners.filter(p=>p.role==='farmer').length,
     mechanics:c?.layout.prisoners.filter(p=>p.role==='mechanic').length,
     prisoners:c?.layout.prisoners.length};
   }finally{discardGeneratedWorld()}
  })()`));
  const label=JSON.stringify(result);
  assert.equal(result.requestedSeed,requested,'requested seed changed: '+label);
  assert.equal(result.seed,result.beforeCampSeed,'camp changed effective seed: '+label);
  assert.equal(result.camps,1,label);assert.equal(result.compoundCount,3,label);assert.equal(result.third,true,label);
  assert.equal(result.overlap,false,label);assert.equal(result.inMap,true,label);
  assert.equal(result.farmers,4,label);assert.equal(result.mechanics,1,label);assert.equal(result.prisoners,5,label);
  assert(Object.hasOwn(counts,result.placement),'unknown placement: '+label);counts[result.placement]++;
  if(result.placement!=='natural')fallbackCases.push({requested,seed:result.seed,scale,placement:result.placement});
  if(result.seed!==requested)baseReseeds++;
  completed++;
  if(completed%128===0)console.log('Camp prefix stress',JSON.stringify({completed,total:2048,ms:Date.now()-started,counts,baseReseeds}));
 }
 console.log('OK 1024 unique seeds x 2 scales, real build prefix',JSON.stringify({completed,ms:Date.now()-started,counts,baseReseeds,fallbackCases}));
}
async function actualBuilds(){
 let synchronous;
 for(const scale of[1,2]){
  const game=await createGame();ambient(game);game.run("seedSearchMode=true;seedSearchCategoryEl.value='vehicle';surveyPrisonCampSiteSteps=function*(){return null}");
  game.start('67',scale);
  if(scale===1)synchronous=hash(game);
  const state=plain(game.run(inspect));assert.deepEqual(state.issues,[],JSON.stringify(state));
  assert.equal(state.seed,67);assert.equal(state.requestedSeed,67);assert.equal(state.placement,'support-island');
  assert.deepEqual(state.support,[{x:0,z:0,r:320,peakX:0,peakZ:0}]);assert.equal(state.candidates,(scale===1?26:98)*257);
  assert(state.counts.polvori>=1&&state.counts.comunicacions>=1&&state.counts.heliport>=1+scale&&state.counts.port>=1,JSON.stringify(state));
  game.run('discardGeneratedWorld()');console.log('OK forced emergency full logical world',JSON.stringify({...state,portTarget:2*scale}));
 }
 const game=await createGame();ambient(game);game.run("seedSearchMode=true;seedSearchCategoryEl.value='vehicle';surveyPrisonCampSiteSteps=function*(){return null}");
 const turns=await finish(game,game.startAsync('67',1));assert(turns>20,'search and construction yield');
 assert.equal(hash(game),synchronous,'forced emergency sync/progressive complete state and R continuation');
 assert.deepEqual(plain(game.run(inspect)).issues,[]);game.run('discardGeneratedWorld()');
 console.log('OK forced emergency sync/progressive parity',turns);
}
(async()=>{
 await plannerCases();
 if(process.argv.includes('--stress')){await stress();return}
 if(!process.argv.includes('--fallback'))await matrix();
 await actualBuilds();
})().catch(error=>{console.error(error);process.exitCode=1});
