import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPortSiteSurvey,compoundPoint} from '../src/compound-planning.mjs';
const oldFactory=new Function('rawHAt','H','compoundTransform',
 "const portSiteFeasible=function* (q){let checkpointUnits=0;\n  for(let turn=0;turn<4;turn++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n    const angle=turn*Math.PI/2,point=compoundTransform(q,angle);\n    for(let d=16;d<Math.max(180,(q.r||180)*1.4);d+=8){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n      const [x,z]=point(0,d);if(rawHAt(x,z)>.3)continue;\n      for(const offset of[-8,0,8]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n        const [cx,cz]=point(0,d+offset),site={x:cx,z:cz,h:.86,angle,r:q.r},\n              tr=compoundTransform(site,angle);\n        if(Math.abs(cx)>H-100||Math.abs(cz)>H-100)continue;\n        let valid=true;\n        for(const lx of[-52,-26,0,26,52]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n          for(const lz of[-60,-35,-10]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n            const p=tr(lx,lz);\n            if(rawHAt(...p)<.1){valid=false;break}\n          }\n          if(!valid)break\n        }\n        if(!valid)continue;\n        coastTest:for(const [lx,lz] of[[-13,31],[15,26],[35,34]])\n          {if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(const dx of[-7,0,7]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(let dz=-16;dz<=52;dz+=4){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n            const p=tr(lx+dx,lz+dz);\n            if(rawHAt(...p)>-2.2){valid=false;break coastTest}\n          }}}\n        if(valid)return true;\n      }\n      if(rawHAt(x,z)<-15)break;\n    }\n  }\n  return false;\n};"+';return portSiteFeasible;');
const height=(kind,seed,x,z)=>{
 const shift=(seed%29-14)*1.5;
 if(kind===0)return 7;
 if(kind===1)return -4.5;
 if(kind===2)return -19;
 if(kind===3)return z>22+shift?-4:6;
 if(kind===4)return x>20+shift?-4:6;
 if(kind===5)return z< -19+shift?-4:6;
 if(kind===6)return Math.hypot(x-60,z+40)<170?6:-6;
 return Math.sin(x*.05+seed*.001)+Math.cos(z*.04)>.3?7:-6;
};
function trace(kind,seed,scale,position,newVersion){
 const samples=[],turns=[];
 const rawHAt=(x,z)=>{samples.push([x,z]);return height(kind,seed,x,z)};
 const compoundTransform=(q,angle)=>{turns.push([q.x,q.z,angle]);return compoundPoint(q,angle)};
 const f=newVersion?createPortSiteSurvey({rawHAt,halfSize:2400*scale,compoundTransform}):
   oldFactory(rawHAt,2400*scale,compoundTransform);
 const q={...position},unchanged=JSON.stringify(q),generator=f(q);
 assert.equal(samples.length,0,'survey is lazy');
 const checkpoints=[];let event;
 for(let n=0;n<20000;n++){event=generator.next();if(event.done)break;checkpoints.push(event.value)}
 assert(event?.done,'survey finishes');
 assert.equal(JSON.stringify(q),unchanged,'input site unchanged');
 return {checkpoints,returnValue:event.value,samples,turns};
}
let count=0;
for(const scale of [1,2])for(const seed of [0,1,67,148,2407759483,4294967295])
 for(let kind=0;kind<8;kind++)
 for(const q of [{x:0,z:0,r:180},{x:120,z:-110,r:320},
  {x:2400*scale-50,z:0,r:210},{x:80,z:2400*scale-100,r:520}]){
 assert.deepEqual(trace(kind,seed,scale,q,true),trace(kind,seed,scale,q,false),
   'same search and height order '+[scale,seed,kind,q.x,q.z]);
 count++;
}
for(const scale of [1,2])for(const kind of [0,1,3,6]){
 const reads=[],rawHAt=(x,z)=>{reads.push([x,z]);return height(kind,67,x,z)};
 const creator=createPortSiteSurvey({rawHAt,halfSize:2400*scale,compoundTransform:compoundPoint});
 const cancelled=creator({x:0,z:0,r:180}),other=creator({x:0,z:0,r:180});
 assert.deepEqual(cancelled.next(),other.next(),'separate iterator progression');
 const before=reads.length;
 cancelled.return();assert(cancelled.next().done);
 assert.equal(reads.length,before,'no reads after cancel');
 let done;for(let n=0;n<20000;n++){done=other.next();if(done.done)break}
 assert(done.done,'other iterator completes');
 count++;
}
const world=readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8');
assert(world.includes('HUNTER_COMPOUND_PLANNING.createPortSiteSurvey({'));
assert(!world.includes('const portSiteFeasible=function* (q){'));
console.log('PASS phase4 port site survey parity: '+count+' samples, exact yields/read order/cancellation');
