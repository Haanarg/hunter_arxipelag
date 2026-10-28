const assert=require('node:assert/strict');
(async()=>{
 const physics=await import('../src/world-physics.mjs'),{createStaticWorldAdapter,normalizeWorldGeometry}=await import('../src/world-adapter.mjs'),{createPlayerSimulation}=await import('../src/player-simulation.mjs');
 const g=await require('./harness.cjs')();g.start('67');g.run('paused=true');
 const original=g.run('({...P})'),data=g.run('captureCoopWorldGeometry()'),reference=require('./fixtures/world-physics-v062.cjs')(data),adapter=createStaticWorldAdapter(data);
 assert.ok(data.walls.length>0&&data.trees.length>0&&data.levels.length>0);
 assert.equal(JSON.stringify(data).includes('matrixWorld'),false,'no meshes in geometry DTO');
 const restored=createStaticWorldAdapter(JSON.parse(JSON.stringify(data)));
 let checked=0;
 for(let x=-2400;x<=2400;x+=160)for(let z=-2400;z<=2400;z+=160){
  const expected=reference.heightAt(x,z),actual=adapter.heightAt(x,z);
  assert.equal(actual,expected,'legacy terrain parity '+x+','+z);assert.equal(restored.heightAt(x,z),actual);checked++;
 }
 for(const m of data.levels.slice(0,80))for(const [x,z] of [[m.x,m.z],[m.x+m.hw,m.z],[m.x+m.hw+m.blend/2,m.z]]){
  assert.equal(adapter.heightAt(x,z),reference.heightAt(x,z),'platform blending parity');
 }
 for(const wall of data.walls.slice(0,150)){
  const p={x:(wall.x0+wall.x1)/2,z:(wall.z0+wall.z1)/2,y:wall.y0+.2,hd:.7};
  g.context.casePoint=p;const walls=g.run('wallCandidates(casePoint.x,casePoint.z,.6)');const expected=reference.walls({...p},walls),actual={...p};physics.pushWalls(actual,walls);assert.deepEqual(actual,expected,'wall collision parity');
  g.run('Object.assign(P,casePoint);wallPush()');assert.equal(g.run('P.x'),expected.x);assert.equal(g.run('P.z'),expected.z);
 }
 const trees=new Map();for(const t of data.trees){const key=Math.floor(t.x/16)+','+Math.floor(t.z/16);if(!trees.has(key))trees.set(key,[]);trees.get(key).push(t);}
 for(const t of data.trees.slice(0,200)){
  const p={x:t.x+.15,z:t.z+.15,y:t.y??t.bottomY??adapter.heightAt(t.x,t.z),hd:.7};
  const expected=reference.trees({...p},trees),actual=adapter.resolveBody(p,p);
  // Reference wall resolution precedes vegetation, as it does in the runtime.
  g.context.casePoint=p;const wallList=g.run('wallCandidates(casePoint.x,casePoint.z,.6)');const withWalls=reference.walls({...p},wallList);reference.trees(withWalls,trees);
  assert.deepEqual(actual,withWalls,'terrain collider snapshot parity');
  if(t.p){const palm={...p};physics.pushPalm(palm,t);assert.deepEqual(palm,reference.palm({...p},t),'curved palm parity');}
 }
 const surfaceReference=require('./fixtures/walk-surfaces-v062.cjs')({...data,heightAt:adapter.heightAt,buildingCandidates:(x,z)=>{g.context.probe={x,z};return g.run('buildingCandidates(probe.x,probe.z)');}});
 const probes=[];
 for(const s of data.stairs.slice(0,100))for(const t of [0,.5,1])probes.push([s.x+s.nx*s.length*t,s.z+s.nz*s.length*t,s.top]);
 for(const p of data.piers.slice(0,60))for(const previous of [p.y,p.y-1,-Infinity])probes.push([p.x,p.z,previous]);
 for(const b of data.buildings.slice(0,80))for(const previous of [b.fy,b.fy+b.h+2])probes.push([b.x,b.z,previous]);
 if(data.bunker){const b=data.bunker;for(const previous of [b.fy,b.basement.floorY])probes.push([b.x,b.z,previous],[b.x+5,b.z+5,previous]);}
 for(const [x,z,previous] of probes)assert.equal(adapter.groundAt(x,z,previous),surfaceReference.groundAt(x,z,previous),'actual world surface parity');
 const locomotionProbes=probes.filter(p=>Number.isFinite(p[2]));
 const locomotionReference=require('./fixtures/locomotion-v0613.cjs')({activeBunker:data.bunker,
  buildingCandidates:(x,z)=>{g.context.probe={x,z};return g.run('buildingCandidates(probe.x,probe.z)');},
  buildingLocalPoint:(b,x,z)=>{const c=Math.cos(b.angle||0),s=Math.sin(b.angle||0),dx=x-b.x,dz=z-b.z;return {x:dx*c+dz*s,z:-dx*s+dz*c};},
  solidRoofAt:surfaceReference.solidRoofAt,stairContains:surfaceReference.stairContains,
  groundAt:surfaceReference.groundAt,bunkerSubFloorAt:surfaceReference.bunkerSubFloorAt,hAt:adapter.heightAt});
 if(data.bunker){const b=data.bunker;for(const y of [b.fy+.22,b.fy-4,b.basement.floorY+.06])for(const dx of [0,5,b.basement.halfX-1])locomotionProbes.push([b.x+dx,b.z,y]);}
 for(const [x,z,y] of locomotionProbes){
  const expected=locomotionReference(x,z,y);
  assert.deepEqual(adapter.locomotionAt(x,z,y),expected,'real world interior, basement, shaft and floor match original runtime');
 }
 const verticalReference=require('./fixtures/player-vertical-v0612.cjs'),roofWorld={solidRoofAt:surfaceReference.solidRoofAt,
   buildingCandidates:(x,z)=>{g.context.probe={x,z};return g.run('buildingCandidates(probe.x,probe.z)');}};
 const roofSweeps=data.buildings.slice(0,40).flatMap(b=>[0,b.w/2].map(dx=>({from:{x:b.x+dx,z:b.z,y:b.fy+b.h+30},to:{x:b.x+dx+2,z:b.z,y:b.fy-2}})));
 for(const {from,to} of roofSweeps)assert.equal(adapter.roofLanding(from,to),verticalReference.roof(from,to,roofWorld),'real roof landing against independent legacy functions');
 const legacy={...data,format:1};const legacyAdapter=createStaticWorldAdapter(legacy);assert.equal(legacyAdapter.snapshot().format,2);assert.equal(legacyAdapter.snapshot().stairs.length,0,'format 1 retains terrain-only meaning');
 const roundtrip=adapter.snapshot();roundtrip.walls[0].open=!roundtrip.walls[0].open;assert.notEqual(roundtrip.walls[0].open,adapter.snapshot().walls[0].open,'snapshot isolation');
 assert.throws(()=>normalizeWorldGeometry({...data,stairs:[{...data.stairs[0],length:0}]}));
 assert.throws(()=>normalizeWorldGeometry({...data,seed:NaN}));assert.throws(()=>normalizeWorldGeometry({...data,walls:[{x0:2,x1:1,z0:0,z1:1,y0:0,y1:2}]}));
 const huge={...data,levels:[{x:0,z:0,hw:1000000,hd:1000000,y:0,c:1,s:0,blend:1}]};assert.throws(()=>createStaticWorldAdapter(huge),/index exceeds/,'bounded index work');
 const actors=[{id:'first',...original,hp:20},{id:'second',x:original.x+2,z:original.z,hd:original.hd,y:adapter.heightAt(original.x+2,original.z),hp:20}];
 const engine=createPlayerSimulation({epoch:'real-world:67',actors,limit:adapter.limit,world:adapter});
 for(let sequence=1;sequence<=30;sequence++){
  for(const actor of actors)assert.equal(engine.accept(actor.id,{protocol:1,epoch:'real-world:67',sequence,input:{forward:1,turn:0,strafe:0,run:false}}),true);
  const state=engine.step();for(const p of state.players)assert.equal(p.y,adapter.groundAt(p.x,p.z,p.y),'two actors use physical walking height');
 }
 const verticalActors=actors.map((a,i)=>{const y=adapter.groundAt(a.x,a.z,a.y)+40;return {...a,y,fall:{kind:'air',y,vy:0,vx:0,vz:0,t:0,leanF:0,leanS:0,startHeight:40,parachute:!!i}};});
 const verticalEngine=createPlayerSimulation({epoch:'vertical-native',actors:verticalActors,limit:adapter.limit,world:adapter,vertical:{surfaceAt:()=>0}});
 for(let k=0;k<420;k++)verticalEngine.step();
 const verticalState=verticalEngine.snapshot();for(const p of verticalState.players)assert.equal(p.fall,null,'real geometry descents land');
 assert.equal(verticalState.players[1].hp,20,'real geometry parachute protects second actor');
 const {build}=await import('esbuild'),{Miniflare}=await import('miniflare');
 const compiled=await build({stdin:{contents:`import {createStaticWorldAdapter} from './src/world-adapter.mjs';
 import {createPlayerSimulation} from './src/player-simulation.mjs';
 export default {async fetch(request){const body=await request.json(),world=createStaticWorldAdapter(body.geometry),sim=createPlayerSimulation({epoch:'native',actors:body.actors,limit:world.limit,world});
 for(const p of body.actors)sim.accept(p.id,{protocol:1,epoch:'native',sequence:1,input:{forward:1,turn:0,strafe:0,run:false}});
 const vertical=createPlayerSimulation({epoch:'vertical-native',actors:body.verticalActors,limit:world.limit,world,vertical:{surfaceAt:()=>0}});
 for(let k=0;k<420;k++)vertical.step();
 const swimmers=createPlayerSimulation({epoch:'sea',actors:[{id:'a',x:0,z:0,y:-2.1,hd:0,hp:20},{id:'b',x:10,z:0,y:-2.1,hd:0,hp:20}],limit:100,
  world:{locomotionAt:()=>({floor:-30,terrain:-30,interior:false,basement:false,drop:false}),resolveBody:(p,c)=>({...c,y:p.y}),roofLanding:()=>null},vertical:{surfaceAt:()=>0}});
 for(let k=1;k<=60;k++){for(const id of ['a','b'])swimmers.accept(id,{protocol:1,epoch:'sea',sequence:k,input:{forward:1,turn:0,strafe:0,run:id==='a'}});swimmers.step();}
 return Response.json({heights:body.points.map(([x,z])=>world.heightAt(x,z)),roofs:body.roofSweeps.map(({from,to})=>world.roofLanding(from,to)),vertical:vertical.snapshot(),swimmers:swimmers.snapshot(),state:sim.step()});}};`,resolveDir:require('node:path').resolve(__dirname,'..')},bundle:true,write:false,format:'esm',platform:'browser'});
 const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-08-06'});
 try{const points=[[original.x,original.z],[0,0],[-2400,2400]],response=await mf.dispatchFetch('http://localhost/',{method:'POST',body:JSON.stringify({geometry:data,actors,points,roofSweeps,verticalActors})});
 assert.equal(response.status,200,await response.clone().text());const native=await response.json();
 for(let i=0;i<points.length;i++)assert.ok(Math.abs(native.heights[i]-adapter.heightAt(...points[i]))<1e-9,'workerd physical terrain parity');
 for(let i=0;i<roofSweeps.length;i++){const expected=adapter.roofLanding(roofSweeps[i].from,roofSweeps[i].to);if(expected===null)assert.equal(native.roofs[i],null);else assert.ok(Math.abs(native.roofs[i]-expected)<1e-9,'workerd roof sweep parity');}
 assert.equal(native.vertical.tick,420);
 for(let i=0;i<2;i++){const p=native.vertical.players[i],expected=verticalState.players[i];for(const k of ['x','z','y','hd','hp'])assert.ok(Math.abs(p[k]-expected[k])<1e-9,'native vertical actor '+k);assert.equal(p.fall,null);assert.equal(p.swimming,expected.swimming);}
 for(let i=0;i<2;i++){const p=native.swimmers.players[i];assert.equal(p.swimming,true);assert.equal(p.y,-2.1);assert.equal(p.hp,20);assert.ok(Math.abs(p.z-[-17,-10][i])<1e-9,'native swimming/crawl speed');assert.equal(p.acknowledged,60);}
 assert.equal(native.state.players.length,2);for(const p of native.state.players)assert.ok(Math.abs(p.y-adapter.groundAt(p.x,p.z,p.y))<1e-9);
 }finally{await mf.dispose();}
 console.log('world adapter: actual seed 67, '+checked+' terrain points, legacy platforms/walls/trees/palms, ' + probes.length + ' walking-surface and '+locomotionProbes.length+' locomotion probes, DTO roundtrip, validation/index limits, two-actor horizontal/vertical real-geometry simulation in Node and native workerd passed');
})().catch(e=>{console.error(e);process.exitCode=1});
