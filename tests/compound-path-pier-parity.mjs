import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {smoothPath} from '../src/compound-paths.mjs';
import {createPathClearanceRegistrar,planPierSetup} from '../src/compound-planning.mjs';

// Legacy v0.6.150 functions copied, without adopting the new helpers.
// Test independently the original clearance registry and the original ramp
// height sampling / vector math (including negative/distant sites).
const legacyPath="const compoundPath=(points,width=4,color=0x8a795e)=>{\n  pathRoutes.push({points,width,color});\n  const curve=window.HUNTER_COMPOUND_PATHS.smoothPath(points,width);\n  for(let i=1;i<curve.length;i++){const a=curve[i-1],b=curve[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));for(let k=0;k<=n;k++){const t=k/n;compoundClear.push({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,r:width*.8+2})}}\n};";
const legacyPier="const compoundPier=(x1,z1,x2,z2,width=4.2,accessRamp=true)=>{\n  const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz);if(L<2)return;\n  const ux=dx/L,uz=dz/L,px=-uz,pz=ux,n=Math.max(1,Math.ceil(L/5));\n  // Només el tram longitudinal que arrenca de la costa té rampa.\n  // Els caps transversals de les T són plataformes, mai rampes de 34 m d'ample.\n  let ramp=null;\n  if(accessRamp&&L>width){\n    let rampLength=12,rampGround=null;\n    // Allargar la rampa si els primers 12 m encara són dins l'aigua.\n    for(let d=12;d<=40;d+=2){\n      const shoreH=hAt(x1-ux*d,z1-uz*d);\n      if(shoreH>.25){rampLength=d;rampGround=shoreH+.08;break}\n    }\n    if(rampGround!==null){\n      ramp={x:x1,z:z1,nx:-ux,nz:-uz,length:rampLength,\n        width:width-.25,bottom:rampGround,top:PIER_DECK_Y,ramp:true,pierAccess:true};\n      stairs.push(ramp);\n    }\n  }\n";
const oldPath=new Function('pathRoutes','compoundClear','window',
 legacyPath+'\nreturn compoundPath;');
const oldPier=new Function('x1','z1','x2','z2','width','accessRamp','hAt','PIER_DECK_Y','stairs',
 legacyPier.replace('const compoundPier=(x1,z1,x2,z2,width=4.2,accessRamp=true)=>{','')
 .replace(/\n\s*$/, '')+
 '\nreturn {dx,dz,L,ux,uz,px,pz,n,ramp};');
function random(seed){let a=seed>>>0;return()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296}}
function comparePath(points,width,color){
 const before={routes:[],clear:[]},after={routes:[],clear:[]};
 oldPath(before.routes,before.clear,{HUNTER_COMPOUND_PATHS:{smoothPath}})(points,width,color);
 createPathClearanceRegistrar({smoothPath,pathRoutes:after.routes,compoundClear:after.clear})(points,width,color);
 assert.deepEqual(after,before,'exact vegetation/path clearance coordinates and order');
 assert.equal(after.routes[0].points,points,'route references original path coordinates');
 assert.equal(after.routes[0].color,color,'route color remains identical');
}
let pathChecks=0,pierChecks=0,heights=0;
const routes=[
 [[0,0],[30,0],[30,30]],
 [[0,0],[30,15],[70,15],[70,50]],
 [[3,-7],[3,-7],[3.001,-6.999],[60,100]],
 [[-25,8],[140,-30],[230,40],[-55,110]],
 [[30,10],[30,10]],
 [[0,0]],
 [],
 [[0,0],[0,0],[0,0]]
];
for(const scale of [1,2])for(const seed of [0,1,67,148,2407759483,4294967295]){
 const rng=random(seed^scale);
 for(const width of [0,1.5,4,6,12,26]){
  for(const points of routes){comparePath(points.map(q=>[q[0]*scale,q[1]*scale]),width,0x8a795e);pathChecks++}
  for(let caseNo=0;caseNo<40;caseNo++){
   const points=Array.from({length:2+Math.floor(rng()*6)},(_,i)=>[
    Math.floor((rng()-.5)*1600*scale),
    Math.floor((rng()-.5)*1600*scale)
   ]);
   comparePath(points,width,0x8a795e+Math.floor(rng()*8));
   pathChecks++;
  }
 }
}
const ground=(kind,seed,x,z)=>{
 const shift=seed%19-9;
 if(kind===0)return 3;
 if(kind===1)return -3;
 if(kind===2)return x<shift?8:-4;
 if(kind===3)return z<-25+shift?2:-1;
 if(kind===4)return Math.sin(x*.071)+Math.cos(z*.036);
 return x*x+z*z>3000000?-7:6;
};
for(const scale of [1,2])for(const seed of [0,67,148,2407759483,4294967295])
 for(const kind of [0,1,2,3,4,5])for(const accessRamp of [true,false])
 for(const width of [1.2,3.6,4.2,8,34])
 for(const run of [0,1,1.999,2,5,11,21,40,85,190]){
   const a=[],b=[],stairs=[];
   const x1=(seed%57-19)*scale,z1=(seed%47-22)*scale,
    x2=x1+run*Math.cos((kind+1)*Math.PI/7),
    z2=z1+run*Math.sin((kind+1)*Math.PI/7);
   const original=oldPier(x1,z1,x2,z2,width,accessRamp,
      (x,z)=>{a.push([x,z]);return ground(kind,seed,x,z)},.86,stairs);
   const next=planPierSetup(x1,z1,x2,z2,width,accessRamp,
      (x,z)=>{b.push([x,z]);return ground(kind,seed,x,z)},.86);
   if(original===undefined)assert.equal(next,null,'short pier returns without mutations');
   else assert.deepEqual(next,original,'pier ramp plan exact');
   assert.deepEqual(b,a,'pier height sample order and count');
   assert.deepEqual(next?.ramp?[next.ramp]:[],stairs,'pier pushed ramp equals planned ramp');
   heights+=b.length;
   pierChecks++;
 }
const runtime=readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8');
const planner=readFileSync(new URL('../src/compound-planning.mjs',import.meta.url),'utf8');
assert(runtime.includes('HUNTER_COMPOUND_PLANNING.createPathClearanceRegistrar('));
assert(runtime.includes('HUNTER_COMPOUND_PLANNING.planPierSetup('));
assert(planner.includes('export function planPierSetup('));
assert(!runtime.includes('for(let i=1;i<curve.length;i++){const a=curve[i-1]'),'old clearance loop removed');
console.log('PASS phase4 compound paths and piers: '+pathChecks+' clearance sequences, '+
 pierChecks+' pier plans, '+heights+' height samples');
