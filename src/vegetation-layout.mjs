import {fbmAt} from './world-physics.mjs';
import {stairContains} from './walk-surfaces.mjs';
import * as rockFields from './rock-fields.mjs';
// The original placement algorithm, independent of meshes and mutable game state.
export function* vegetationLayoutSteps({halfSize:H,islands,heightAt:hAt,seed,random:R,spawn:pa,buildings:B,stairs,compounds:compoundClear}){
 const pm=[],bu=[],rk=[],trees=[],put=e=>{e.k=Math.floor(e.x/16)+','+Math.floor(e.z/16);trees.push(e);},rr=(a,b)=>a+R()*(b-a),fbm=(x,z)=>fbmAt(x,z,seed),slope=(x,z,h)=>Math.abs(hAt(x+5,z)-h)+Math.abs(hAt(x,z+5)-h);
 const rockSafe=(x,z,r=2)=>Math.abs(x)<H-35&&Math.abs(z)<H-35&&
   !stairs.some(st=>stairContains(st,x,z,r+1))&&
   Math.hypot(x-pa.x,z-pa.z)>16+r&&
   !B.some(b=>Math.abs(x-b.x)<b.w/2+r+4&&Math.abs(z-b.z)<b.d/2+r+4)&&
   !compoundClear.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+r+5);
 const addRock=(x,z,scale,kind)=>{
   if(!rockSafe(x,z,scale*1.45))return false;
   const h=hAt(x,z);if(h<-4.6)return false;
   const tall=kind===1,y=h+(tall?.85:.38)*scale,
     radius=(tall?1.27:1.44)*scale,
     topY=h+(tall?2.3:1.18)*scale;
   rk.push([x,y,z,scale,rockFields.rockNoise(x,z,5)*Math.PI*2,0,
     (rockFields.rockNoise(x,z,6)-.5)*.33,kind]);
   put({x,z,y,r:radius,rock:true,kind,s:scale,topY,bottomY:h-scale*.5});
   return true;
 };
let samples=0;const sampleSide=Math.ceil((2*H-80)/14),sampleTotal=sampleSide*sampleSide;
for(let x=-H+40;x<H-40;x+=14)for(let z=-H+40;z<H-40;z+=14){if(samples++%128===0)yield {stage:'Distribuint vegetació',completed:samples-1,total:sampleTotal,unit:'mostres'};const px=x+rr(-4,4),pz=z+rr(-4,4),h=hAt(px,pz);if(h<1.3||h>42)continue;
const dn=fbm(px/80+7,pz/80+3),q=R(),highPalm=.22+Math.max(0,Math.min(1,(h-28)/14))*.12;let L=null;
if(h<4)L=q<.12?pm:null;else if(dn>.55&&h<28)L=q<.20?pm:null;else if(h>=28&&q<highPalm)L=pm;else if(dn>.4)L=q<.2?bu:null;else if(h>8&&q<.04)L=rk;else if(q<.024)L=pm;
if(!L||slope(px,pz,h)>4.5)continue;
if(stairs.some(s=>stairContains(s,px,pz,2))||Math.hypot(px-pa.x,pz-pa.z)<14||B.some(b=>Math.abs(px-b.x)<b.w/2+5&&Math.abs(pz-b.z)<b.d/2+5)||compoundClear.some(c=>Math.hypot(px-c.x,pz-c.z)<c.r))continue;
const s=1.15*rr(.75,1.25),yaw=rr(0,6.28);
if(L==pm){const leafVar=R()<.33?-1:R()<.66?0:1,tone=rr(-.25,.25),idx=pm.length;pm.push([px,h-.3,pz,s,yaw,leafVar,tone]);const e={x:px,z:pz,y:h-.3,s,yaw,r:.6*Math.max(.75,s),p:true,alive:true,hp:8,i:idx,leafVar,tone};put(e)}
else if(L===rk)rockFields.baseRockCluster(px,pz,s,addRock);
 else L.push([px,h-.3,pz,s,yaw])}
const rockFieldStats=yield* rockFields.generateRockFieldsSteps({
  islands,hAt,canPlace:rockSafe,addRock
});
 return {palms:pm,bushes:bu,rocks:rk,trees,rockFieldStats:{...rockFieldStats,totalRocks:rk.length},randomState:R.getState()};
}
export function vegetationLayout(options){const steps=vegetationLayoutSteps(options);let next;while(!(next=steps.next()).done){}return next.value;}
