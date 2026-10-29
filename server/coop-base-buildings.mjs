import {shellColliders,exteriorStair,upperStair} from '../src/building-shell.mjs';

// Base building shells only. This is not the remainder of compound generation
// and never claims to advance the RNG past full base construction.
export function buildBaseShells(basePlan,world,random){
  const walls=[],stairs=[],buildings=[];
  for(const spec of basePlan.buildings){
    if(spec.bunker||spec.hangar||spec.workshop||spec.wood)throw new Error('Unsupported base building');
    const h=spec.h*(spec.floors||1),fy=world.heightAt(spec.x,spec.z),opt={floors:spec.floors,doorSide:0,doorWidth:4,doorHeight:4.4,noPartitions:true,solidWalls:!!spec.warehouse},
      shell=shellColliders(spec.x,spec.z,fy,spec.w,spec.d,h,opt,random),
      b={x:spec.x,z:spec.z,w:spec.w,d:spec.d,h,fy,rhp:shell.plan.roofHp,rb:false,angle:spec.angle,localW:spec.w,localD:spec.d,storey:h/(spec.floors||1),upperFloor:spec.floors===2},
      ownedStairs=[],ownedWalls=shell.walls,c=Math.round(Math.cos(spec.angle)),s=Math.round(Math.sin(spec.angle)),
      point=(x,z)=>[b.x+(x-b.x)*c-(z-b.z)*s,b.z+(x-b.x)*s+(z-b.z)*c];
    const exterior=exteriorStair(b,0,world.heightAt);if(exterior)ownedStairs.push(exterior);
    if(b.upperFloor){
      const a=upperStair(b),stair={x:a.x,z:a.z,nx:0,nz:1,top:fy+b.storey+.15,bottom:fy+.3,length:a.run,width:a.width,ramp:true,internal:true,owner:{rb:false},destroyed:false};
      b.interiorStair=stair;ownedStairs.push(stair);
      ownedWalls.push({x0:a.x-a.width/2,x1:a.x+a.width/2,z0:a.z,z1:a.z+a.run,y0:fy+.2,y1:fy+b.storey+.25,open:false,playerBlock:false,internalStair:true});
    }
    for(const w of ownedWalls){
      const corners=[[w.x0,w.z0],[w.x0,w.z1],[w.x1,w.z0],[w.x1,w.z1]].map(p=>point(...p));
      w.x0=Math.min(...corners.map(p=>p[0]));w.x1=Math.max(...corners.map(p=>p[0]));w.z0=Math.min(...corners.map(p=>p[1]));w.z1=Math.max(...corners.map(p=>p[1]));
      if(w.cx!==undefined)[w.cx,w.cz]=point(w.cx,w.cz);if(w.nx!==undefined)[w.nx,w.nz]=[w.nx*c-w.nz*s,w.nx*s+w.nz*c];
    }
    for(const a of ownedStairs){[a.x,a.z]=point(a.x,a.z);[a.nx,a.nz]=[a.nx*c-a.nz*s,a.nx*s+a.nz*c];}
    if(s)[b.w,b.d]=[b.d,b.w];
    b.id='base/'+basePlan.layoutId+'/'+spec.id;
    ownedWalls.forEach((w,i)=>{w.id=b.id+'/wall/'+i;w.buildingId=b.id;if(w.assemblyIndices)w.assemblyIds=w.assemblyIndices.map(j=>b.id+'/wall/'+j);});
    ownedStairs.forEach((a,i)=>{a.id=b.id+'/stair/'+i;a.buildingId=b.id;});
    walls.push(...ownedWalls);stairs.push(...ownedStairs);buildings.push(b);
  }
  return {walls,stairs,buildings};
}
