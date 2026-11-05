'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.context.HUNTER_VEHICLE_OCCUPANT_DAMAGE=await import('../src/vehicle-occupant-damage-core.mjs');
 game.start('148');
 const result=game.run(`(()=>{
   // Two isolated fully modeled vehicles. The mounted player is killed by
   // the real tank-crush branch, not an artificial call to hurtP.
   V=[];
   const x=P.x,z=P.z,make=(t,dx,dz)=>{
     const o=mkV(t),v={t,x:x+dx,z:z+dz,hd:0,v:0,alt:Math.max(0,hAt(x+dx,z+dz))+.8,
       o,maxLife:VT[t].life,life:VT[t].life,smokeT:0,bump:0,envCd:0,sideV:0,strafeV:0};
     world.add(o);V.push(v);place(v,elapsed,0,0);return v;
   };
   const bike=make('moto',0,0),tank=make('tanc',0,5);
   tank.v=25;cv=bike;hp=2;over=0;P.x=bike.x;P.z=bike.z;P.y=groundAt(P.x,P.z);
   // A failing optional WebGL explosion must never kill the RAF loop.
   window.HUNTER_CREATE_ARCADE_BLAST_FX=()=>{throw Error('simulated WebGL effect failure')};
   rebuildVehicleGrid();
   let failure=null;
   try{
     // Force the tank into the occupied motorcycle using the production
     // collision and damage path. No mock explosion / death cinematic.
     stepV(tank,0,0,0,.2);
   }catch(error){failure=String(error?.stack||error);}
   return {failure,bikeDestroyed:bike.destroyed===true,life:bike.life,
     hp,over,cinematic:!!deathCinematic,active:deathCinematic?.active,
     cause:deathCinematic?.cause?.kind,hasVoid:!!deathCinematic?.voidScene,
     ejectVy:playerEject?.vy,fxDisabled:failedArcadeBlastWorld===world};
 })()`);
 console.log('tank motorcycle immediate:',result);
 assert.equal(result.failure,null,'tank -> motorcycle collision must not throw');
 assert.equal(result.bikeDestroyed,true,'tank should crush the occupied motorcycle');
 assert.equal(result.hp,0,'occupant should die');
 assert.equal(result.active,true,'death cinematic starts from vehicle collision');
 assert.equal(result.hasVoid,true,'complete death scene is initialized');
 assert.equal(result.fxDisabled,true,'failed optional WebGL effect is disabled for this world');
 assert(Number.isFinite(result.ejectVy),'motorcycle ejection has a finite vertical velocity');
 game.frame(100);
 const tick=game.run('({t:deathCinematic?.t,active:deathCinematic?.active,cause:deathCinematic?.cause?.kind})');
 assert(tick.t>0,'death cinematic must advance after tank crush');
 for(let i=0;i<135;i++)game.run('updateDeathCinematic(.1)');
 const final=game.run('({phase:deathCinematic?.phase,visible:deathCinematic?.button?.style?.display})');
 assert.equal(final.phase,'finished','death cinematic reaches final scene');
 assert.equal(final.visible,'block','restart remains reachable');
 console.log('tank motorcycle death: collision and cinematic progression passed');
})().catch(error=>{console.error(error);process.exitCode=1});
