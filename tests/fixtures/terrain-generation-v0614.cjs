// Frozen v0.6.14 main 54e87e19b52ec3d9b710262a9285b8b718cf823f; independent generation reference.
const physicalReference=require('./world-physics-v062.cjs');
module.exports=function(requestedSeed,MAP_SCALE,mode='foundation'){
let seed=requestedSeed,R,islands,A,Bi,physics;
const H=2400*MAP_SCALE,B=[],treeHit=()=>false,fr=()=>0,rebuildIslandGrid=()=>{},rr=(a,b)=>a+R()*(b-a),hAt=(x,z)=>physics.heightAt(x,z);
const mul=a=>{const next=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};next.getState=()=>a>>>0;next.setState=value=>{a=value|0};return next};
const hash=(x,y)=>{const h=Math.sin(x*127.1+y*311.7+seed*.001)*43758.5453;return h-Math.floor(h)};
function genIslands(){R=mul(seed);const q=R()<.5?-1:1,q2=R()<.5?-1:1,extent=MAP_SCALE===1?1000:2200,baseMin=MAP_SCALE===1?500:1200,baseMax=MAP_SCALE===1?800:1800;
A={x:-q*rr(baseMin,baseMax)*2,z:-q2*rr(baseMin,baseMax)*2,r:rr(520,680)};
// On a large map, HQ can occupy any of the three sectors other than the start.
const hqSectorChoice=MAP_SCALE===2?Math.floor(R()*3):2;
Bi={x:(hqSectorChoice===0?-q:q)*rr(baseMin,baseMax)*2,z:(hqSectorChoice===1?-q2:q2)*rr(baseMin,baseMax)*2,r:rr(520,680)};
islands=[A,Bi];const regular=22*MAP_SCALE*MAP_SCALE,large=2*MAP_SCALE*MAP_SCALE;
for(let i=0;i<regular;i++)islands.push({x:rr(-extent,extent)*2,z:rr(-extent,extent)*2,r:rr(180,520)});
for(let i=0;i<large;i++)islands.push({x:rr(-extent*.55,extent*.55)*2,z:rr(-extent*.55,extent*.55)*2,r:rr(800,1040)});
// Cim principal desplaçat de manera determinista, sense consumir R() ni alterar la resta de la generació.
for(let n=0;n<islands.length;n++){const i=islands[n],ox=(hash(i.x*.013+n*1.37,i.z*.011-7.1)-.5)*.42*i.r,oz=(hash(i.z*.017-n*.91,i.x*.009+11.3)-.5)*.42*i.r;i.peakX=i.x+ox;i.peakZ=i.z+oz}
rebuildIslandGrid()}
const slope=(x,z,h)=>Math.abs(hAt(x+5,z)-h)+Math.abs(hAt(x,z+5)-h);
function* landSteps(i,n=600,fl){for(let k=0;k<n;k++){if(k%16===0)yield {stage:'Cercant terreny lliure',completed:k,total:n,unit:'intents'};const a=R()*6.283,d=R()*i.r*.75,x=i.x+Math.cos(a)*d,z=i.z+Math.sin(a)*d,h=hAt(x,z);
if(h>3&&h<14&&slope(x,z,h)<2.5&&(!fl||fr(x,z)<2.2)&&!B.some(b=>Math.abs(b.x-x)<b.hw+24&&Math.abs(b.z-z)<b.hd+24)&&!treeHit(x,z,3)&&Math.abs(x)<H-150&&Math.abs(z)<H-150)return{x,z,h}}return null}
function drain(steps){let r;do{r=steps.next();}while(!r.done);return r.value;}
if(mode==='layout'){genIslands();return {islands,base:A,headquarters:Bi,random:R};}
let tries=0,pa,pb;do{seed=(requestedSeed+Math.imul(tries++,0x9e3779b1))>>>0;genIslands();physics=physicalReference({seed,mapScale:MAP_SCALE,islands,levels:[]});pa=drain(landSteps(A,2000));pb=drain(landSteps(Bi,2000));}while((!pa||!pb)&&tries<8);
if(!pa||!pb)throw new Error('No valid initial terrain');
return {seed,requestedSeed,mapScale:MAP_SCALE,attempts:tries,islands,baseCandidate:pa,headquartersCandidate:pb,randomState:R.getState()};
};
