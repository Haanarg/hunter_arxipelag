import assert from 'node:assert/strict';
import {createNativeLocalPresentation} from '../src/native-coop-local-presentation.mjs';
const input=(x,hd=0)=>({x,y:1,z:0,hd,hp:25,swimming:false});
const close=(a,b,err=.000001)=>assert(Math.abs(a-b)<=err,`${a} != ${b}`);
{
 const p=createNativeLocalPresentation();
 p.present(input(10),1/60);
 const before=p.present(input(10.2),1/60);
 p.reconcile(input(9.65),{continuous:true});
 const after=p.present(input(9.65),0);
 close(before.x,after.x,1e-9);
 assert(after.x!==9.65);
 assert.equal(p.stats.smoothedCorrections,1);
}
{
 const p=createNativeLocalPresentation();
 p.present(input(0),1/60);p.present(input(.2),1/60);
 p.reconcile(input(-.4),{continuous:true});
 const a=p.present(input(-.4),0),b=p.present(input(-.2),0);
 close(b.x-a.x,.2,1e-9);
}
for(const fps of [60,144,240]){
 const p=createNativeLocalPresentation(),dt=1/fps;
 let raw=0,previous=null,jump=0,reversals=0,receives=0;
 for(let frame=0;frame<fps*5;frame++){
  raw+=6*dt;
  if(frame>0&&frame%Math.round(fps/10)===0){
   raw-=.35; // Correcció persistent cada estat autoritatiu.
   p.reconcile(input(raw),{continuous:true});
   receives++;
  }
  const visible=p.present(input(raw),dt).x;
  if(previous!==null){
   jump=Math.max(jump,Math.abs(visible-previous));
   if(visible<previous-.00001)reversals++;
  }
  previous=visible;
 }
 assert(receives>=45);
 assert(jump<.14,`Salt gran amb ${fps} FPS: ${jump}`);
 assert.equal(reversals,0,`Retrocessos visibles a ${fps} FPS`);
 assert(p.stats.smoothedCorrections>=40);
 assert.equal(p.stats.hardSnaps,0,'Cap fals teleport per deriva de correcció');
}
{
 const p=createNativeLocalPresentation();
 p.present(input(0,Math.PI-.08),1/60);
 p.reconcile(input(0,-Math.PI+.08),{continuous:true});
 const v=p.present(input(0,-Math.PI+.08),0);
 close(Math.atan2(Math.sin(v.hd-(Math.PI-.08)),Math.cos(v.hd-(Math.PI-.08))),0,1e-9);
 assert(p.stats.maxCorrectionDegrees<10);
}
{
 const p=createNativeLocalPresentation();
 p.present(input(0),1/60);
 p.reconcile(input(40),{continuous:true});
 close(p.present(input(40),1/60).x,40);
 assert.equal(p.stats.hardSnaps,1);
 p.reconcile(input(42),{continuous:false,driving:true});
 close(p.present(input(42),1/60).x,42);
 p.present(input(43),1/60,false);
 close(p.present(input(43),1/60).x,43);
}
{
 const p=createNativeLocalPresentation(),phys=input(8);
 p.present(input(9),1/60);
 p.reconcile(phys,{continuous:true});
 p.present(phys,1/60);
 close(phys.x,8);
}
console.log('native coop local presentation: continuity, immediate controls, 10Hz corrections at 60/144/240 fps, turns, teleports and reset passed');
