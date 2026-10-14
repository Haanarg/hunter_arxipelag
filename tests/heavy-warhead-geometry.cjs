const assert=require('node:assert/strict');
(async()=>{
 const g=await require('./harness.cjs')();
 const report=g.run(`(()=>{
   const shots=[],dirs=[
     [0,0,-1],[-1,0,0],[0,1,0],[0,-1,0],[.6,.25,-.75],[0,0,1]
   ];
   const fire=(direction,owner,splash)=>{
     const [dx,dy,dz]=direction;
     const len=Math.hypot(dx,dy,dz),unit=new THREE.Vector3(dx/len,dy/len,dz/len);
     shoot(0,120,0,unit.x,unit.y,unit.z,80,30,splash,owner,mS,2.2);
     const p=Pj[Pj.length-1],o=p.o;
     o.updateMatrixWorld(true);
     const localForward=new THREE.Vector3(0,0,-1),
           axis=localForward.applyQuaternion(o.quaternion),
           nose=o.localToWorld(new THREE.Vector3(0,0,-.48)),
           rear=o.localToWorld(new THREE.Vector3(0,0,.46)),
           geometricAxis=nose.clone().sub(rear).normalize(),
           travel=new THREE.Vector3(p.vx,p.vy,p.vz).normalize();
     const data={owner,splash,shotClass:p.shotClass,
       geometry:o.geometry.type,
       isShared:o.geometry===gHeavy,
       axisError:axis.distanceTo(travel),
       tipError:geometricAxis.distanceTo(travel),
       forwardDot:nose.clone().sub(o.getWorldPosition(new THREE.Vector3())).dot(travel),
       rearDot:rear.clone().sub(o.getWorldPosition(new THREE.Vector3())).dot(travel),
       scale:o.scale.x,dir:direction};
     shots.push(data);
   };
   const original=Pj.length;
   try{
     dirs.forEach((d,i)=>fire(d,i%2?'e':'p',i%2?7:8));
     fire([0,0,-1],'p',0);
     gHeavy.computeBoundingBox();
     return {shots,shape:{minZ:gHeavy.boundingBox.min.z,
       maxZ:gHeavy.boundingBox.max.z,
       rings:gHeavy.parameters.points.length,
       profile:gHeavy.parameters.points.map(p=>[p.x,p.y])}};
   }finally{
     while(Pj.length>original){
       const p=Pj.pop();world.remove(p.o);
     }
   }
 })()`);
 const heavy=Array.from(report.shots).slice(0,-1),light=report.shots.at(-1);
 assert(heavy.length===6);
 for(const p of heavy){
   assert.equal(p.shotClass,'heavy',JSON.stringify(p));
   assert.equal(p.geometry,'LatheGeometry',JSON.stringify(p));
   assert(p.isShared,'heavy geometry not shared');
   assert(p.axisError<1e-8&&p.tipError<1e-8,'nose must follow shot trajectory: '+JSON.stringify(p));
   assert(p.forwardDot>0&&p.rearDot<0,'nose points backwards: '+JSON.stringify(p));
 }
 assert.equal(light.shotClass,'light');
 assert.equal(light.geometry,'BoxGeometry');
 assert(!light.isShared);
 assert(report.shape.minZ<-.45&&report.shape.maxZ>.44,'ojiva axis must be longitudinal -Z');
 assert(report.shape.profile.some(([r,y])=>r>0&&y>0),'ogive has rounded front');
 assert.equal(report.shape.profile.at(-1)[0],0,'nose ends in a point');
 console.log('PASS heavy warheads aligned with flight, including enemy shots and vertical trajectories',JSON.stringify({shape:report.shape,heavy:heavy.length}));
})().catch(error=>{console.error(error);process.exitCode=1});
