'use strict';
// Independent contract checks. This suite neither updates historical fixtures
// nor claims a seed observed by a player. The presence sample stops at the camp
// checkpoint; only one seed proceeds through the full logical world and UI.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const createGame=require('./harness.cjs');
const {captureMissionData,validateMission}=require('../tools/mission-viability.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
const ROOT=require('node:path').resolve(__dirname,'..');
const randomSeeds=(()=>{
  let state=0xc011ab1e;
  return Array.from({length:16},()=>state=(Math.imul(state,1664525)+1013904223)>>>0);
})();
function ambient(game){
  let state=0x61c0ffee;
  game.context.Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
}
async function fresh(){
  const game=await createGame(ROOT);ambient(game);
  game.run(`seedSearchMode=true;seedSearchCategoryEl.value='compound';
    globalThis.independentCampSteps=null;globalThis.independentCampStages=[];
    globalThis.independentCampAdvance=function(stage){
      for(let count=0;count<500000;count++){
        const next=independentCampSteps.next();
        if(next.done)throw new Error('Generation ended before '+stage);
        independentCampStages.push(next.value.stage);
        if(stage==='camp'?next.value.stage==='Camp de presoners':next.value.stage===stage)return next.value;
      }
      throw new Error('Generation failed to reach '+stage);
    };
    globalThis.independentCampBegin=function(input,scale){
      independentCampSteps?.return();independentCampStages=[];
      requestedSeed=input;MAP_SCALE=scale;S=4800*scale;H=S/2;
      independentCampSteps=buildSteps();
    };`);
  return game;
}
const recordSource=`(()=>{
 const camp=world.userData.prisonCamp,all=world.userData.compounds;
 return{seed,requestedSeed,scale:MAP_SCALE,count:all.filter(c=>c.id==='prison-camp').length,
  unavailable:world.userData.prisonCampUnavailable||null,
  camp:camp?{x:camp.x,z:camp.z,r:camp.r,angle:camp.angle,islandIndex:camp.islandIndex,
    placement:camp.placement||null,fallback:camp.fallback||false,fallbackIsland:camp.fallbackIsland||null}:null,
  overlapping:camp?all.filter(c=>c!==camp&&Math.hypot(c.x-camp.x,c.z-camp.z)<=c.r+camp.r+33)
    .map(c=>c.id):[],stages:[...new Set(independentCampStages)]};
})()`;
function assertCamp(game,label){
  const state=plain(game.run(recordSource));
  assert.equal(state.count,1,label+': exactly one real world compound '+JSON.stringify(state));
  assert(state.camp,label+': concrete prisonCamp record');
  assert.equal(state.unavailable,null,label+': success cannot carry an unavailable report');
  assert.deepEqual(state.overlapping,[],label+': protected compound reservations');
  assert.equal(state.camp.angle,0,label+': authored fixed orientation');
  return state;
}
// Check actual movement predicates and swept truck footprints, including every
// farmer lane. A dry centre sample alone cannot prove a usable prison.
const accessSource=`(()=>{
 const c=world.userData.prisonCamp,l=c.layout,issues=[];
 const check=(ok,message)=>{if(!ok&&issues.length<30)issues.push(message)};
 const gate=c.prisonGate;
 check(!!gate&&gate.colliders.length>0,'inner prison gate exists');
 check(gate?.opened===false&&gate.colliders.every(w=>!w.open),'inner gate begins physically closed');
 const gateBefore=gate?{opened:gate.opened,walls:gate.colliders.map(w=>({open:w.open,hp:w.hp})),visible:gate.meshes.map(m=>m.visible)}:null;
 gate?.open();
 const tr=compoundTransform(c,c.angle),point=p=>{const q=tr(p[0],p[1]);return{x:q[0],z:q[1]}};
 const walk=points=>{
  let from={...points[0],y:hAt(points[0].x,points[0].z)};
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12));
   for(let k=1;k<=n;k++){
    const t=k/n,to={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};to.y=hAt(to.x,to.z);
    check(to.y>.2,'route has dry support');
    check(Math.abs(to.y-from.y)<.65,'route has continuous height');
    check(optionalCivilianCanMove(from,to,.94),'production civilian collision predicate rejects route');
    from=to;
   }
  }
 };
 for(const lane of[-2.25,-.75,.75,2.25])walk(l.escapeRoute.map(p=>point([p[0]+lane,p[1]])));
 const route=l.escapeRoute.map(point);
 for(const p of l.prisoners)walk([point([p.x,p.z]),route[0]]);
 const mechanic=l.prisoners.find(p=>p.role==='mechanic');
 walk([[mechanic.x,mechanic.z],...(l.mechanicRoute||[[l.rescuePoint.x,l.rescuePoint.z],[l.mechanicStation.x,l.mechanicStation.z]])].map(point));
 const overlaps=(box,w)=>obbOverlap(box,{x:(w.x0+w.x1)/2,z:(w.z0+w.z1)/2,hd:0,w:w.x1-w.x0,d:w.z1-w.z0});
 const access=[[0,82],[0,36],[33,36],[33,16]].map(point);
 for(let i=1;i<access.length;i++){
  const a=access[i-1],b=access[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.6)),hd=Math.atan2(a.x-b.x,a.z-b.z);
  for(let k=0;k<=n;k++){
   const t=k/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,box=vehicleBox({t:'camio',x,z,hd});
   check(!wallCandidates(x,z,18).some(w=>!w.open&&w.hp>0&&overlaps(box,w)),'truck gate or workshop collision');
   for(const [dx,dz]of[[-box.w/2,-box.d/2],[box.w/2,-box.d/2],[-box.w/2,box.d/2],[box.w/2,box.d/2]]){
    const tx=x+dx*Math.cos(hd)+dz*Math.sin(hd),tz=z-dx*Math.sin(hd)+dz*Math.cos(hd);
    check(hAt(tx,tz)>.2,'truck footprint has dry support');
   }
  }
 }
 if(gateBefore){gate.opened=gateBefore.opened;gate.colliders.forEach((w,i)=>Object.assign(w,gateBefore.walls[i]));gate.meshes.forEach((m,i)=>m.visible=gateBefore.visible[i])}
 return{issues,escapeY:route.map(p=>hAt(p.x,p.z)),layoutNPCs:l.prisoners.map(p=>({id:p.id,role:p.role}))};
})()`;
function assertAccess(game,label){
  const state=plain(game.run(accessSource));
  assert.deepEqual(state.issues,[],label+': camp access '+JSON.stringify(state));
  assert.equal(state.layoutNPCs.length,5,label+': five authored NPCs');
  assert.equal(new Set(state.layoutNPCs.map(p=>p.id)).size,5,label+': unique NPC identities');
  assert.equal(state.layoutNPCs.filter(p=>p.role==='farmer').length,4,label+': four farmers');
  assert.equal(state.layoutNPCs.filter(p=>p.role==='mechanic').length,1,label+': one mechanic');
}
function protectedState(game){
  return plain(game.run(`world.userData.compounds.filter(c=>c.id==='base'||c.id==='hq').map(c=>({
    id:c.id,x:c.x,z:c.z,r:c.r,buildings:c.buildings.map(b=>({x:b.x,z:b.z,fy:b.fy,kind:b.kind})),
    support:[[-30,-30],[0,0],[30,30]].map(([dx,dz])=>hAt(c.x+dx,c.z+dz))}))`));
}
async function presence(){
  const game=await fresh();
  const cases=[...randomSeeds.map(seed=>[seed,1]),[randomSeeds[0],2],[randomSeeds[14],2]];
  for(const [seed,scale]of cases){
    game.run(`independentCampBegin(${seed},${scale});independentCampAdvance('camp')`);
    const state=assertCamp(game,'seed '+seed+' scale '+scale);
    assert(!state.stages.includes('Poblats i costa'),'reserve the mandatory camp before optional settlements');
    assert.equal(state.seed,seed,'do not silently replace requested seed');
    assertAccess(game,'seed '+seed+' scale '+scale);
    console.log('PASS independent camp presence',JSON.stringify({seed,scale,camp:state.camp}));
  }
  game.run('independentCampSteps.return();discardGeneratedWorld()');
}
async function forcedFallback(){
  for(const mode of['no-natural-land','only-occupied-natural-land']){
    const game=await fresh(),seed=0x7139ab;
    game.run(`independentCampBegin(${seed},1);independentCampAdvance('Base i quarter general')`);
    const before=protectedState(game);
    game.run(`globalThis.independentRawHeight=rawHAt;
      globalThis.independentProtected=world.userData.compounds.filter(c=>c.id==='base'||c.id==='hq');
      rawHAt=${mode==='no-natural-land'?'()=>-20':`(x,z)=>independentProtected.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+20)?8:-20`};
      independentCampAdvance('camp');rawHAt=independentRawHeight;`);
    const state=assertCamp(game,mode);
    assert.deepEqual(protectedState(game),before,mode+': camp terrace leaves base and HQ records/support intact');
    assertAccess(game,mode+': restored natural relief');
    game.run(`configureOptionalWorld();globalThis.independentNPCSnapshot=prisonerSystem.snapshot()`);
    const npc=plain(game.run(`({entities:prisonerSystem.entities.map(p=>({id:p.id,role:p.role,state:p.state,o:p.o})),
      discovered:independentNPCSnapshot.discovered,markers:prisonerSystem.markers()})`));
    assert.equal(npc.entities.length,5,mode+': five actual civilian entities');
    assert.equal(npc.entities.filter(p=>p.role==='farmer').length,4);
    assert.equal(npc.entities.filter(p=>p.role==='mechanic').length,1);
    assert.equal(npc.discovered,false,'existence and discovery are distinct');
    assert.deepEqual(npc.markers,[],'undiscovered camp does not pre-reveal a marker');
    const evacuation=plain(game.run(`(()=>{
      const c=world.userData.prisonCamp,p=c.layout.rescuePoint,tr=compoundTransform(c,c.angle),q=tr(p.x,p.z),
        ctx={player:{x:q[0],y:hAt(q[0],q[1]),z:q[1]},vehicle:null,vehicles:[],enemies:E,active:true,canInteract:true};
      prisonerSystem.update(0,ctx);
      const before=prisonerSystem.snapshot().rescue;
      c.prisonGate.open();prisonerSystem.update(0,ctx);
      const alone=prisonerSystem.snapshot().released;
      for(const u of [...c.soldiers,...c.towers])u.hp=0;
      prisonerSystem.update(0,ctx);
      const released=prisonerSystem.snapshot().released;
      for(let tick=0;tick<300;tick++)prisonerSystem.update(.25,ctx);
      return{before,alone,released,entities:prisonerSystem.snapshot().entities.map(p=>({role:p.role,state:p.state,blocked:p.blocked}))};
    })()`));
    assert.equal(evacuation.alone,false,mode+': an opened gate alone is insufficient');
    assert.equal(evacuation.released,true,mode+': all defences neutralised and gate breached free the camp automatically');
    assert(evacuation.entities.filter(p=>p.role==='farmer').every(p=>p.state==='rescued'),mode+': all four farmers traverse real terrace collision/height');
    assert.equal(evacuation.entities.find(p=>p.role==='mechanic').state,'ready',mode+': mechanic reaches real station');
    game.run(`prisonerSystem.configure({world,camp:world.userData.prisonCamp,logicalOnly:false})`);
    assert.equal(game.run('prisonerSystem.entities.length'),5);
    assert(game.run('prisonerSystem.entities.every(p=>p.o&&!p.o.visible)'),
      'real NPC models initially hidden until observer update; hidden does not mean absent');
    if(mode==='no-natural-land')assertRequiredFeatureValidation(game);
    game.run('independentCampSteps.return();discardGeneratedWorld()');
    console.log('PASS independent mandatory terrace',JSON.stringify({mode,seed,camp:state.camp}));
  }
}
function assertRequiredFeatureValidation(game){
  // Reuse one real camp and five lightweight models for all corruptions. No
  // terrain, vehicle or world regeneration is needed per failure injection.
  game.run(`seedSearchMode=false;validateRequiredWorldFeatures()`);
  const validated=plain(game.run('window.HUNTER_REQUIRED_WORLD_FEATURES'));
  assert.deepEqual(validated,{seed:0x7139ab,mapScale:1,prisonCamps:1,farmers:4,mechanics:1,status:'validated'});
  const faults=[
    ['duplicate compound',`world.userData.compounds.push(world.userData.prisonCamp)`,`world.userData.compounds.pop()`],
    ['wrong camp pointer',`globalThis.independentCampPointer=world.userData.prisonCamp;world.userData.prisonCamp={...independentCampPointer}`,
      `world.userData.prisonCamp=independentCampPointer`],
    ['missing farmer',`globalThis.independentMissing=prisonerSystem.entities.splice(0,1)[0]`,`prisonerSystem.entities.unshift(independentMissing)`],
    ['missing mechanic',`globalThis.independentMechanic=prisonerSystem.entities.find(p=>p.role==='mechanic');independentMechanic.role='farmer'`,
      `independentMechanic.role='mechanic'`],
    ['invalid civilian height',`globalThis.independentCivilian=prisonerSystem.entities[0];globalThis.independentY=independentCivilian.y;independentCivilian.y=NaN`,
      `independentCivilian.y=independentY`],
    ['submerged civilian',`independentCivilian.y=-1`,`independentCivilian.y=independentY`],
    ['non-finite civilian health',`globalThis.independentHp=independentCivilian.hp;independentCivilian.hp=NaN`,`independentCivilian.hp=independentHp`],
    ['missing civilian health',`delete independentCivilian.hp`,`independentCivilian.hp=independentHp`],
    ['missing real civilian model',`globalThis.independentModel=independentCivilian.o;independentCivilian.o=null`,`independentCivilian.o=independentModel`],
    ['detached real civilian model',`world.remove(independentCivilian.o)`,`world.add(independentCivilian.o)`]
  ];
  for(const [name,inject,restore]of faults){
    game.run(inject);
    try{assert.throws(()=>game.run('validateRequiredWorldFeatures()'),/camp|presoner|mecànic|NPC|invariant/i,name+' cannot validate')}
    finally{game.run(restore)}
    game.run('validateRequiredWorldFeatures()');
  }
  game.run('seedSearchMode=true');
  console.log('PASS independent activation invariants: duplicate/pointer/count/role/height/health/model failures');
}
async function adversarialPlanner(){
  const game=await fresh();
  const observed=plain(game.run(`(()=>{
    const layout=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.type==='prison-camp'),saved=R;
    R=()=>{throw new Error('Prison planner must not draw from gameplay RNG')};
    try{
      const base={x:-1400,z:-1400,r:600},hq={x:1400,z:1400,r:600},primary={x:0,z:0,r:500},
        common={islandList:[base,hq,primary],baseIsland:base,hqIsland:hq,heightAt:()=>8,halfSize:2400};
      let rejected=0;
      const avoidsCollision=drainBuildSteps(planPrisonCampSteps(layout,{...common,
        siteClear:q=>{const clear=Math.hypot(q.x,q.z)>180;if(!clear)rejected++;return clear},
        createSupportIsland:()=>{throw new Error('Expected another natural candidate')}}));
      const dryTerrace=drainBuildSteps(planPrisonCampSteps(layout,{...common,
        heightAt:x=>41+40*Math.sin(x*.3),siteClear:()=>true,
        createSupportIsland:()=>{throw new Error('A completely dry existing island must be graded before adding support')}}));
      let fallbackCalls=0,created=false,steps=0;
      const iterator=planPrisonCampSteps(layout,{...common,
        siteClear:q=>created&&q.x===0&&q.z===0,
        createSupportIsland:()=>{fallbackCalls++;created=true;return{x:0,z:0,r:320}}});
      let next;while(!(next=iterator.next()).done){steps++;
        if(!next.value.stage)throw new Error('Planner checkpoint has no visible stage');}
      return{rejected,avoidsCollision:{placement:avoidsCollision.placement,site:avoidsCollision.site},
        dryTerrace:{placement:dryTerrace.placement,site:dryTerrace.site,min:dryTerrace.terrain.minHeight,max:dryTerrace.terrain.maxHeight},
        exhausted:{placement:next.value.placement,candidates:next.value.candidates,site:next.value.site},
        fallbackCalls,steps};
    }finally{R=saved}
  })()`));
  assert(observed.rejected>1,'colliding natural candidates are actually rejected');
  assert.equal(observed.avoidsCollision.placement,'natural');
  assert(Math.hypot(observed.avoidsCollision.site.x,observed.avoidsCollision.site.z)>180,'next natural site clears occupied area');
  assert.equal(observed.dryTerrace.placement,'terrace','steep but dry existing terrain is graded before creating an island');
  assert(observed.dryTerrace.min>.5&&observed.dryTerrace.max-observed.dryTerrace.min>28,'exercise actual dry, steep survey results');
  assert(observed.dryTerrace.site.h>=3,'graded existing terrain has finite dry target height');
  assert.equal(observed.exhausted.placement,'support-island','exhausted occupied natural sites require a concrete fallback');
  assert.equal(observed.fallbackCalls,1,'create the deterministic support once');
  assert.equal(observed.exhausted.candidates,3*257,'exhaust the bounded candidate set before structural fallback');
  assert(observed.steps>=observed.exhausted.candidates,'search stays cooperative while collisions reject every candidate');
  console.log('PASS independent planner collision rejection, dry terrace, bounded fallback and zero gameplay RNG');
}
const semanticSource=`(()=>{
 const scalar=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o[k]??null]));
 return{seed,requestedSeed,scale:MAP_SCALE,player:scalar(P,['x','y','z','hd','base']),
  compounds:world.userData.compounds.map(c=>({...scalar(c,['id','layoutId','x','z','r','angle','islandIndex']),
    buildings:c.buildings.map(b=>scalar(b,['kind','x','z','fy','w','d','h','compound','layoutBuilding']))})),
  terrainLevels:terrainLevels.map(m=>scalar(m,['x','z','hw','hd','y','rot','blend'])),
  walls:Wl.map(w=>scalar(w,['x0','x1','z0','z1','y0','y1','hp','open','door','bunkerGate'])),
  items:items.map(i=>scalar(i,['t','x','y','z','compound'])),
  enemies:E.map(e=>scalar(e,['t','x','z','gy','hp','hd'])),
  vehicles:V.map(v=>scalar(v,['t','x','z','hd','life','maxLife','ammo','rockets'])),
  civilians:prisonerSystem.snapshot(),rng:Array.from({length:24},()=>R())};
})()`;
function semantic(game){return crypto.createHash('sha256').update(JSON.stringify(game.run(semanticSource))).digest('hex')}
async function complete(game,promise){
  let done=false,error,turns=0;promise.then(()=>done=true,e=>{done=true;error=e});
  while(!done){
    if(await game.runTask())turns++;else await game.microtasks();
    assert(turns<100000,'generation scheduler eventually settles');
  }
  if(error)throw error;await promise;return turns;
}
async function forcedProgressiveParity(){
  const make=async()=>{
    const game=await fresh();
    game.run(`surveyPrisonCampSiteSteps=function*(){return null};
      independentCampBegin(7420331,1)`);
    return game;
  };
  const sync=await make();sync.run("independentCampAdvance('camp');configureOptionalWorld()");
  assert.equal(assertCamp(sync,'forced fallback synchronous prefix').camp.placement,'support-island');
  const expected=semantic(sync);sync.run('independentCampSteps.return();discardGeneratedWorld()');
  const progressive=await make();
  const work=progressive.run(`buildProgressively({maxSteps:8,iterator:(function*(){
    try{for(;;){const next=independentCampSteps.next();if(next.done)throw new Error('Missing required camp checkpoint');
      yield next.value;if(next.value.stage==='Camp de presoners')break;}}
    finally{independentCampSteps.return()}
  })()})`);
  const turns=await complete(progressive,work);progressive.run('configureOptionalWorld()');
  assert.equal(assertCamp(progressive,'forced fallback progressive prefix').camp.placement,'support-island');
  assert.equal(semantic(progressive),expected,'support island, terrain, NPCs and continuation of R agree across sync/progressive');
  assert(turns>800,'exhausting natural candidates yields through the actual production scheduler');
  progressive.run('discardGeneratedWorld()');
  console.log('PASS independent forced structural fallback sync/progressive/R parity',turns);
}
async function parityAndMission(){
  const sync=await fresh();sync.run("seedSearchCategoryEl.value='vehicle'");sync.start('67',1);
  assertCamp(sync,'complete synchronous logical world');assertAccess(sync,'complete synchronous logical world');
  const report=validateMission(captureMissionData(sync));
  assert.equal(report.ok,true,'base/HQ objective, bunker access, intel and departure remain viable: '+JSON.stringify(report.issues));
  const expected=semantic(sync);sync.run('discardGeneratedWorld()');
  const asyncGame=await fresh();asyncGame.run("seedSearchCategoryEl.value='vehicle'");
  const turns=await complete(asyncGame,asyncGame.startAsync('67',1));
  assertCamp(asyncGame,'complete progressive logical world');assertAccess(asyncGame,'complete progressive logical world');
  assert.equal(semantic(asyncGame),expected,'sync/progressive semantic world and continuation of R agree');
  assert(turns>20,'production UI yields during generation');
  assert.equal(asyncGame.run('window.HUNTER_GENERATION_STATE.status'),'ready');
  asyncGame.run('discardGeneratedWorld()');
  console.log('PASS independent complete logical world: mission viability and sync/progressive/R parity',turns);
}
async function failureRecovery(){
  const game=await fresh();
  const expectedErrors=[],originalConsole=game.context.console;
  game.context.console={...originalConsole,error:(...args)=>expectedErrors.push(args)};
  game.run(`globalThis.independentBuildCompound=buildApprovedCompoundSteps;globalThis.independentFailCamp=true;
    buildApprovedCompoundSteps=function*(layout,...args){
      if(layout.type==='prison-camp'&&independentFailCamp)throw new Error('independent mandatory camp failure');
      return yield* independentBuildCompound(layout,...args);
    };`);
  await assert.rejects(complete(game,game.startAsync('67',1)),/independent mandatory camp failure/);
  assert(expectedErrors.some(args=>args.some(value=>String(value).includes('independent mandatory camp failure'))),
    'the expected production error is logged');
  game.context.console=originalConsole;
  assert.deepEqual(plain(game.run(`({started,world:world===null,generation:window.HUNTER_GENERATION_STATE.status,
    drain:generationDrainActive,pending:generationPromise===null})`)),
  {started:0,world:true,generation:'error',drain:false,pending:true},'failed camp never activates an incomplete world');
  assert.equal(game.el('ini').style.display,'flex','failure restores start menu');
  game.run('independentFailCamp=false');
  await complete(game,game.startAsync('67',1));
  assertCamp(game,'retry after required camp failure');
  assert.equal(game.run('started'),1,'retry activates complete world');
  game.run('discardGeneratedWorld()');
  console.log('PASS independent required-camp generation failure and progressive retry');
}
(async()=>{
  if(process.argv.includes('--planner-only')){await adversarialPlanner();return}
  await adversarialPlanner();
  if(!process.argv.includes('--quick'))await presence();
  await forcedFallback();await forcedProgressiveParity();await parityAndMission();await failureRecovery();
  console.log('PASS prison-camp guarantee independent audit; logical CPU geometry only; Android/GPU remains pending');
})().catch(error=>{console.error(error);process.exitCode=1});
