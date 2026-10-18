#!/usr/bin/env node
// Regressions de velocitat, so dels passos corrent i projecció d'explosions.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
(async()=>{
 const root=path.join(__dirname,'..');
 const ctx={window:{}};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'src/vehicle-dynamics.js'),'utf8'),ctx);
 const dynamics=ctx.window.HUNTER_VEHICLE_DYNAMICS,vt=dynamics.types;
 for(const type of ['barca_rems','ferry']){
   const c=vt[type],swimCrawl=8.5;
   assert.ok(c.maxF>swimCrawl*1.7,type+' ha de superar clarament el crol');
   // Simular el motor i la resistència de l'aigua com al bucle stepV.
   const v={t:type,v:0,driveInput:0,steerInput:0};
   for(let i=0;i<360;i++){
     const f=dynamics.inputs(v,1,0,1/60).forward;
     v.v=Math.min(c.maxF,(v.v+f*c.a/60)*(1-c.dr*1.08/60));
   }
   assert.ok(v.v>swimCrawl*1.7,
     type+' ha d’assolir prou velocitat, no només tenir un límit alt: '+v.v);
 }
 assert.ok(vt.ferry.maxF>vt.barca_rems.maxF,
   'El ferri manté una velocitat punta superior a la barca');
 const core=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8');
 assert.ok(core.includes("snd('step',.65)")&&core.includes('runStepTimer=.29'),
   'Cada trepitjada corrent produeix el so corresponent');
 assert.ok(core.includes('running&&!swimming&&!playerFall&&!playerEject'),
   'Passes exclusives de córrer a terra, no al nedar o volar');
 const audio=fs.readFileSync(path.join(root,'src/audio.js'),'utf8');
 let frequency=0,played=0;
 const fakeNode=()=>({connect(){},start(){played++},stop(){},
   frequency:{value:0,setValueAtTime(){}},gain:{value:0,setValueAtTime(){},
   exponentialRampToValueAtTime(){}}});
 const AC={currentTime:1,sampleRate:22050,
   createBuffer:(n,length)=>({getChannelData:()=>new Float32Array(length)}),
   createBufferSource:fakeNode,createGain:fakeNode,
   createBiquadFilter:()=>{const n=fakeNode();frequency=n.frequency;return n}};
 const audioCtx={AC,lastS:{}};vm.createContext(audioCtx);
 vm.runInContext(audio,audioCtx);
 vm.runInContext("snd('step',.65)",audioCtx);
 assert.equal(played,1,'Una passa crea un so audible');
 assert.equal(frequency.value,440,'La passa fa un so sord de bota');
 // Prova real del motor de combat, sense visuals del navegador.
 const game=await require('./harness.cjs')();
 const results=game.run(`(()=>{
   world=new THREE.Group();scene.add(world);
   cv=null;playerFall=null;playerEject=null;hp=100;
   P.x=4;P.z=0;P.y=1.5;
   E=[];PL.length=0;
   enemyCandidatesAt=()=>E;
   wallCandidates=()=>[];buildingCandidates=()=>[];
   vehicleCandidatesAt=()=>[];
   const soldier={t:'soldat',x:2,z:0,hp:400,alert:0,
      o:new THREE.Group(),destroyed:false};
   soldier.o.position.set(2,0,0);E.push(soldier);
   const initial=hp;
   boom(0,1.5,0,12,35,'e');
   const hostile={
     soldierFling:!!soldier.blastImpulse&&soldier.blastT>1.5,
     enemyNotDamaged:soldier.hp===400,
     playerFling:playerEject?.kind==='blast'&&playerEject.vy>10,
     playerDamaged:hp<initial,
     impulse:Math.hypot(soldier.blastImpulse?.vx||0,soldier.blastImpulse?.vz||0)
   };
   updEn(.1);
   hostile.enemyAirborne=soldier.blastHeight>0&&soldier.x>2;
   playerEject=null;hp=100;
   soldier.blastT=0;soldier.blastImpulse=null;soldier.blastHeight=0;
   boom(0,1.5,0,12,35,'p');
   const friendly={
     playerFling:playerEject?.kind==='blast'&&playerEject.vy>10,
     playerNotDamaged:hp===100,
     soldierFling:!!soldier.blastImpulse,
     soldierDamaged:soldier.hp<400
   };
   return {hostile,friendly};
 })()`);
 for(const [key,pass] of Object.entries(results.hostile))
   assert.ok(pass, 'Explosió enemiga: '+key+' '+JSON.stringify(results.hostile));
 for(const [key,pass] of Object.entries(results.friendly))
   assert.ok(pass, 'Explosió pròpia: '+key+' '+JSON.stringify(results.friendly));
 console.log('OK: vaixells > crol, passes de bota, explosions enemigues i pròpies amb impuls');
})().catch(e=>{console.error(e);process.exitCode=1});
