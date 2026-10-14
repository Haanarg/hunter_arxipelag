const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('12345',1);
 const report=game.run(`(()=>{
   const u=E.find(e=>e.t==='general'),savedKills=kills,originalVisibility=document.getElementById('hud').style.visibility;
   if(!u)throw Error('Missing final enemy');
   const shot={x:u.x,y:u.o.position.y+1.5,z:u.z,
     sx:u.x+15,sy:u.o.position.y+2,sz:u.z+20,
     vx:-36,vy:-2,vz:-48,spl:0,own:'p'};
   hurtE(u,u.hp+3,shot);
   const v=victoryCinematic,states=new Set([v?.phase]),angles=[],
         first={active:v?.active,over,ended:endEl.style.display,
           title:v?.title?.textContent,hudHidden:document.getElementById('hud').style.visibility,
           kills:kills-savedKills,inDead:DEAD.includes(u),
           start:v?.shot?.from.toArray(),direction:v?.shot?.direction.toArray()};
   if(!v)return{error:'victory not started',first};
   const originalCamera=cam.position.clone();
   for(let i=0;i<322;i++){
     updateVictoryCinematic(.05);
     states.add(v.phase);
     if(i===10||i===57||i===103||i===150||i===230)angles.push(cam.position.toArray());
   }
   const result={first,states:[...states],angles,
     phase:v.phase,finished:v.finished,active:v.active,
     titleOpacity:v.title.style.opacity,
     hint:v.hint.style.display,
     gulls:v.gulls.filter(g=>g.o.visible).length,
     fallen:Math.abs(u.o.quaternion.x)+Math.abs(u.o.quaternion.z),
     deadModelPresent:u.o.parent===world,
     camMoved:cam.position.distanceTo(originalCamera),
     killedOnce:kills-savedKills,
     finalSeaHeight:hAt(v.seaCamera.x,v.seaCamera.z)};
   clearVictoryCinematic();
   result.restored=victoryCinematic===null&&document.getElementById('hud').style.visibility===originalVisibility;
   result.sceneClean=!v.bullet.parent&&!v.impactFlash.parent&&v.gulls.every(g=>!g.o.parent);
   return result;
 })()`);
 if(report.error)throw Error(JSON.stringify(report));
 assert.equal(report.first.active,true);
 assert.equal(report.first.over,1,'stop main simulation');
 assert.equal(report.first.ended,'none','do not show old modal');
 assert.equal(report.first.title,'MISSIÓ COMPLERTA');
 assert.equal(report.first.hudHidden,'hidden');
 assert.equal(report.first.kills,1);
 assert(report.first.inDead);
 for(const phase of ['replay1','replay2','replay3','overhead','sunset','finished'])
   assert(report.states.includes(phase),phase+' missing '+JSON.stringify(report));
 assert.equal(report.phase,'finished');
 assert(report.finished&&!report.active,'final stable ending');
 assert.equal(report.gulls,9,'visible animated seabirds');
 assert(report.fallen>.1,'theatrical fall');
 assert(report.deadModelPresent);
 assert(report.camMoved>20,'camera leaves scene');
 assert.equal(report.titleOpacity,'1');
 assert.equal(report.hint,'block');
 assert(report.restored&&report.sceneClean,'cleanup before new map');
 console.log('PASS: three-angles kill replay, slow fall, aerial, gulls and sunset',
   JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
