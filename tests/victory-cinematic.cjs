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
   const right=new THREE.Vector3(-sunDir.z,0,sunDir.x).normalize();
   let visibleBirdFrames=0,birdMin=Infinity,birdMax=-Infinity,
       wingMin=Infinity,wingMax=-Infinity;
   const overheadSamples=[];
   let sunsetEntry=null;
   for(let i=0;i<465;i++){
     updateVictoryCinematic(.05);
     states.add(v.phase);
     if(i===10||i===57||i===103||i===150||i===230)angles.push(cam.position.toArray());
     if(v.phase==='overhead')overheadSamples.push({
       x:cam.position.x,z:cam.position.z,y:cam.position.y,
       q:cam.quaternion.clone(),
       down:cam.getWorldDirection(new THREE.Vector3()).y
     });
     if(v.phase==='sunset'&&!sunsetEntry)sunsetEntry=cam.quaternion.clone();
     for(const gull of v.gulls){
       if(!gull.o.visible)continue;
       visibleBirdFrames++;
       const side=gull.o.position.clone().sub(v.seaCamera).dot(right);
       birdMin=Math.min(birdMin,side);birdMax=Math.max(birdMax,side);
       wingMin=Math.min(wingMin,gull.wl.rotation.z);
       wingMax=Math.max(wingMax,gull.wl.rotation.z);
     }
   }
   const result={first,states:[...states],angles,
     phase:v.phase,finished:v.finished,active:v.active,
     titleOpacity:v.title.style.opacity,
     hint:v.hint.style.display,
     gulls:v.gulls.filter(g=>g.o.visible).length,
     visibleBirdFrames,birdMin,birdMax,wingRange:wingMax-wingMin,
     sunAlignment:cam.getWorldDirection(new THREE.Vector3()).dot(sunDir),
     raisedArms:u.o.userData.arms.map(a=>Math.abs(a.rotation.z)),
     overheadFrames:overheadSamples.length,
     overheadHeadingError:overheadSamples.reduce((m,p)=>Math.max(m,
       1-Math.abs(p.q.dot(v.overheadOrientation))),0),
     overheadPositionError:overheadSamples.reduce((m,p)=>Math.max(m,
       Math.abs(p.x-v.base.x)+Math.abs(p.z-v.base.z)),0),
     overheadDown:Math.min(...overheadSamples.map(p=>-p.down)),
     overheadClimbs:overheadSamples.every((p,i)=>!i||p.y>=overheadSamples[i-1].y),
     sunsetEntryAlignment:sunsetEntry?Math.abs(sunsetEntry.dot(v.overheadOrientation)):0,
     fallen:Math.abs(u.o.quaternion.x)+Math.abs(u.o.quaternion.z),
     deadModelPresent:u.o.parent===world,
     camMoved:cam.position.distanceTo(originalCamera),
     killedOnce:kills-savedKills,
     finalSeaHeight:hAt(v.seaCamera.x,v.seaCamera.z)};
   clearVictoryCinematic();
   result.restored=victoryCinematic===null&&(document.getElementById('hud').style.visibility||'')===(originalVisibility||'');
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
 assert(report.visibleBirdFrames>20,'gulls cross the existing level');
 assert(report.birdMin<0&&report.birdMax>0,'gulls enter from one side and exit the other');
 assert(report.wingRange>.2,'gulls flap wings while crossing');
 assert.equal(report.gulls,0,'gulls have disappeared toward the horizon');
 assert(report.sunAlignment>.995,'last camera looks straight toward the actual game sun');
 assert(report.overheadFrames>30,'enough vertical ascent frames');
 assert(report.overheadPositionError<.001,'no horizontal orbit during ascent');
 assert(report.overheadHeadingError<.000001,'no camera rotation while rising');
 assert(report.overheadDown>.9999,'camera looks straight down during ascent');
 assert(report.overheadClimbs,'zenith camera height rises monotonically');
 assert(report.sunsetEntryAlignment>.999,'sunset turn starts from zenith without a snap');
 assert(report.raisedArms.every(a=>a>1.5),'both general arms rise clear of the coat');
 assert(report.fallen>.1,'theatrical fall');
 assert(report.deadModelPresent);
 assert(report.camMoved>20,'camera leaves scene');
 assert.equal(report.titleOpacity,'1');
 assert.equal(report.hint,'block');
 assert(report.restored&&report.sceneClean,'cleanup before new map');
 console.log('PASS: three-angles kill replay, raised-arm fall, existing sun and crossing gulls',
   JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
