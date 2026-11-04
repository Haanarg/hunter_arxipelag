function layoutRadius(l){return Math.hypot(...l.size)/2+20}
// Late binding: compound-coast-runtime.js runs before game-core.js defines
// VT/VS/H. Getters retain the active mission size after a restart.
let coastalLayoutPlanner=null;
function getCoastalLayoutPlanner(){
 if(!coastalLayoutPlanner)coastalLayoutPlanner=
   window.HUNTER_COMPOUND_PLANNING.createCoastalLayoutPlanner({
     compoundTransform,rawHAt,getHalfSize:()=>H,getVehicleTypes:()=>VT,
     getVehicleScales:()=>VS,getVehicleHitboxes:()=>window.HUNTER_VEHICLES.hitboxes
   });
 return coastalLayoutPlanner;
}
function coastalLayoutFits(l,q){
 return getCoastalLayoutPlanner().coastalLayoutFits(l,q);
}
function findCoastalLayout(l,anchor,accept=()=>true){return drainBuildSteps(findCoastalLayoutSteps(l,anchor,accept))}
function* findCoastalLayoutSteps(l,anchor,accept=()=>true){
 return yield* getCoastalLayoutPlanner().findCoastalLayoutSteps(l,anchor,accept);
}
// Bounded terrain-aware search. It returns a path before changing the terrain.
function solveCoastRoad(start,goal){return drainBuildSteps(solveCoastRoadSteps(start,goal))}
let coastRoadSolver=null;
function getCoastRoadSolver(){
 if(!coastRoadSolver)coastRoadSolver=
   window.HUNTER_COMPOUND_PLANNING.createCoastRoadSolver({
     heightAt:hAt,getHalfSize:()=>H,getBuildings:()=>B,MapConstructor:Map
   });
 return coastRoadSolver;
}
function* solveCoastRoadSteps(start,goal){
 return yield* getCoastRoadSolver()(start,goal);
}
function buildCoastRoad(points,path){return drainBuildSteps(buildCoastRoadSteps(points,path))}
function* buildCoastRoadSteps(points,path){
 for(let i=1;i<points.length;i++){
  yield {stage:'Camí de la base a la costa',completed:i,total:points.length-1,unit:'trams'};
  const a=points[i-1],b=points[i],len=Math.hypot(a.x-b.x,a.z-b.z),angle=Math.atan2(-(b.x-a.x),b.z-a.z),n=Math.max(1,Math.ceil(len/2));
  for(let k=0;k<=n;k++){const t=k/n;addLevelArea(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,10,3,a.y+(b.y-a.y)*t,angle,7)}
 }
 path(points.map(p=>[p.x,p.z]),8);
 world.userData.baseCoast={width:8,maxGrade:.12,points:points.map(p=>({...p}))};
}
// A terminal bridge follows the moored ferry's ramp and retracts on departure.
function createTerminalRamp(c,f){
 // Les llavors només necessiten saber on està el ferri: cap geometria.
 if(seedSearchMode)return;
 const p=compoundTransform(c,c.angle)(0,30),g=new THREE.Mesh(new THREE.BoxGeometry(10,.18,1),M(0x787d79,'metal'));
 world.add(g);c.loadingRamp={x:p[0],z:p[1],f,homeX:f.x,homeZ:f.z,homeHD:f.hd,mesh:g};
}
function terminalRampState(r){
 const f=r.f;if(f.destroyed||!V.includes(f)||Math.hypot(f.x-r.homeX,f.z-r.homeZ)>1.5||Math.abs(wrapAngle(f.hd-r.homeHD))>.06)return null;
 const endZ=FERRY_DECK.halfL*(VS.ferry||1),end=ferryWorld(f,0,endZ),
   dx=end.x-r.x,dz=end.z-r.z,length=Math.hypot(dx,dz);
 if(length<.1)return null;
 return{x:r.x,z:r.z,ux:dx/length,uz:dz/length,length,startY:PIER_DECK_Y,endY:ferryLocalSurfaceY(f,endZ)+.04};
}
function terminalRampHeight(x,z){
 for(const c of world?.userData.compounds||[]){if(!c.loadingRamp)continue;const s=terminalRampState(c.loadingRamp);if(!s)continue;
  const h=window.HUNTER_WALK_SURFACES.terminalRampSurfaceHeight(s,x,z);if(h!==null)return h;
 }return null;
}
function updateTerminalRamps(){for(const c of world?.userData.compounds||[]){const r=c.loadingRamp;if(!r)continue;const s=terminalRampState(r);r.mesh.visible=!!s;if(!s)continue;
 const rise=s.endY-s.startY;r.mesh.position.set(s.x+s.ux*s.length/2,(s.startY+s.endY)/2-.09,s.z+s.uz*s.length/2);
 r.mesh.rotation.set(-Math.atan2(rise,s.length),Math.atan2(s.ux,s.uz),0,'YXZ');r.mesh.scale.z=Math.hypot(s.length,rise);
}}
function pedestrianFerry(x,z,previous){
 for(const f of V){if(f.t!=='ferry'||f.destroyed)continue;const q=ferryLocal(f,x,z),y=ferryLocalSurfaceY(f,q.z);
  if(ferryWalkable(q.x,q.z,.55)&&previous>=y-.9)return{f,q,y};
 }return null;
}
