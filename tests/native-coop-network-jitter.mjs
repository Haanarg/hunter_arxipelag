import assert from 'node:assert/strict';
import {createNativeCoopInterpolation} from '../src/native-coop-interpolation.mjs';

// Xarxa simulada de 10 Hz, render 60 FPS durant 8 segons.
// No equival a validar dos navegadors reals ni els ticks del Worker.
function snapshot(tick){
 return {missionId:'sim',tick,status:'running',
  players:[{id:'a',x:0,y:1,z:0,hd:0,hp:25},
   {id:'b',x:tick/6,y:1,z:0,hd:0,hp:25}],
  vehicles:[{id:'car',x:tick*16/30,y:1,z:0,hd:0,
   t:'cotxe',v:16,seats:[null,null],destroyed:false}]};
}
function testJitter(multiplier){
 const interpolation=createNativeCoopInterpolation();
 const offsets=[0,.015,-.008,.024,-.014,.006,-.011,.018];
 const arrivals=Array.from({length:81},(_,i)=>({
  at:i*.1+(i?multiplier*offsets[i%offsets.length]:0),tick:i*3
 }));
 let received=0,prevPlayer=null,prevCar=null,maxPlayer=0,maxCar=0,receiptJump=0,reversals=0;
 for(let frame=0;frame<480;frame++){
  const seconds=frame/60;
  while(received<arrivals.length&&arrivals[received].at<=seconds){
   const before=interpolation.actor('b')?.x,beforeCar=interpolation.movingVehicles()[0]?.pose.x;
   interpolation.receive(snapshot(arrivals[received].tick),'a');
   const after=interpolation.actor('b')?.x,afterCar=interpolation.movingVehicles()[0]?.pose.x;
   if(before!==undefined&&after!==undefined)receiptJump=Math.max(receiptJump,Math.abs(after-before));
   if(beforeCar!==undefined&&afterCar!==undefined)receiptJump=Math.max(receiptJump,Math.abs(afterCar-beforeCar));
   received++;
  }
  interpolation.advance(1/60);
  const player=interpolation.actor('b')?.x,car=interpolation.movingVehicles()[0]?.pose.x;
  if(player!==undefined&&prevPlayer!==null){
   maxPlayer=Math.max(maxPlayer,Math.abs(player-prevPlayer));
   if(player<prevPlayer-1e-7)reversals++;
  }
  if(car!==undefined&&prevCar!==null)maxCar=Math.max(maxCar,Math.abs(car-prevCar));
  if(player!==undefined)prevPlayer=player;
  if(car!==undefined)prevCar=car;
 }
 const stats=interpolation.stats;
 assert(received>=78,'S’han rebut els estats simulats');
 assert.equal(receiptJump,0,'Cap salt instantani en rebre estats');
 assert(maxPlayer<=15*1.5/60+1e-6,'Límit de moviment del company');
 assert(maxCar<=80*1.5/60+1e-6,'Límit de moviment del vehicle');
 assert.equal(reversals,0,'Sense retrocessos amb velocitat constant');
 assert(stats.activeFrames>400,'Molts fotogrames amb trajectòries actives');
 assert(stats.interpolatedFrames>400,'Predomina la interpolació de snapshots');
 assert(stats.extrapolatedFrames/stats.activeFrames<.1,'Extrapolació excepcional');
 assert(stats.bufferDelayMs>=150&&stats.bufferDelayMs<=200,'Buffer adaptatiu acotat');
 assert.equal(interpolation.actor('a'),null,'El jugador local queda fora del buffer');
 return {received,maxPlayer,maxCar,bufferDelayMs:stats.bufferDelayMs,
   interpolated:stats.interpolatedFrames,extrapolated:stats.extrapolatedFrames};
}
const normal=testJitter(1);
const irregular=testJitter(3);
console.log('native coop jitter simulation passed',normal,irregular);
