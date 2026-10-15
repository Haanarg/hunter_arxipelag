// Walkable upper floors use the actor's previous elevation; never teleport a ground-floor actor upstairs.
function buildingLocalPoint(b,x,z){const c=Math.cos(b.angle||0),s=Math.sin(b.angle||0),dx=x-b.x,dz=z-b.z;return{x:dx*c+dz*s,z:-dx*s+dz*c}}
function buildingWorldPoint(b,x,z){const c=Math.cos(b.angle||0),s=Math.sin(b.angle||0);return{x:b.x+x*c-z*s,z:b.z+x*s+z*c}}
function upperFloorHeight(b,x,z,previous=-Infinity){
 if(!b.upperFloor||b.rb)return null;
 const p=buildingLocalPoint(b,x,z),a=b.interiorStair,level=b.fy+b.storey+.15;
 if(Math.abs(p.x)>b.localW/2-.35||Math.abs(p.z)>b.localD/2-.35)return null;
 if(stairContains(a,x,z))return null;
 return previous>=level-.75?level:null;
}
function decorateRuntimeBuilding(b,spec){
 const box=(g,w,h,d,c,x=0,y=0,z=0,profile='paint')=>bx(g,w,h,d,c,x,y,z,profile),rod=(g,a,v,r,c)=>{
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...v),delta=end.clone().sub(start),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),6),M(c,'paint'));m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());g.add(m);return m;
 },cylinder=(g,r,h,c,x,y,z)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),M(c,'paint'));m.position.set(x,y,z);g.add(m);return m},shell={group:b.o,roof:b.roof,walls:b.wm},roofs=[];
 b.floors=spec.floors||1;b.localW=b.w;b.localD=b.d;b.wood=!!spec.wood;b.storey=b.h/b.floors;
 if(spec.wood){window.HUNTER_COMPOUND_ARCHITECTURE.decorateTimber(THREE,{b:{...spec,h:b.h},shell,box,rod,cylinder,roofs});b.extraRoofs=roofs;}
 if(b.floors===2){
  b.upperFloor=window.HUNTER_COMPOUND_ARCHITECTURE.decorateUpper(THREE,{b:{...spec,h:b.h},storey:b.storey,shell,box,rod,roofs});
  const width=2.8,run=Math.min(b.d-3,b.storey*1.05),x=b.x+b.w/2-width/2-.7,z=b.z-b.d/2+2.4;
  b.interiorStair={x,z,nx:0,nz:1,top:b.fy+b.storey+.15,bottom:b.fy+.3,length:run,width,ramp:true,internal:true,owner:b};stairs.push(b.interiorStair);
  for(const z of[-b.d/2,b.d/2])box(b.roof,b.w+.6,1,.35,0x647c72,0,b.h+1.7,z);
  for(const x of[-b.w/2,b.w/2])box(b.roof,.35,1,b.d+.6,0x647c72,x,b.h+1.7,0);
 }
}
function soldierChangeFloor(u,b,dt){
 if(!b.upperFloor||b.rb)return false;
 const floor=b.fy+b.storey+.15,current=u.walkY??u.o.position.y,wantsUp=P.y>floor-1,isUp=current>floor-.7;
 if(wantsUp===isUp&&!u.floorRoute)return false;
 const a=b.interiorStair;
 if(!u.floorRoute||u.floorRoute.up!==wantsUp){
  const bottom={x:a.x+a.nx*(a.length+.7),z:a.z+a.nz*(a.length+.7)},top={x:a.x,z:a.z};
  // Exit sideways at the landing before pursuing a target away from the stairwell.
  const side=buildingWorldPoint(b,b.localW/2-5,b.localD/-2+2.4);
  u.floorRoute={up:wantsUp,points:wantsUp?[bottom,top,side]:[side,top,bottom],i:0};
 }
 const r=u.floorRoute,p=r.points[r.i];
 if(Math.hypot(u.x-p.x,u.z-p.z)<.55){u.navDirectT=0;u.navPath=[];u.navSearch=null;u.navRetry=0;if(++r.i>=r.points.length){u.floorRoute=null;return false}}
 const goal=r.points[r.i];if(goal)mvE(u,u.sp*dt,goal.x,goal.z);
 u.walkY=groundAt(u.x,u.z,u.walkY??u.o.position.y);return true;
}
