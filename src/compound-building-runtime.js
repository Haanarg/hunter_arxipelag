// Walkable upper floors use the actor's previous elevation; never teleport a ground-floor actor upstairs.
function buildingLocalPoint(b,x,z){return window.HUNTER_WALK_SURFACES.buildingLocalPoint(b,x,z)}
function buildingWorldPoint(b,x,z){return window.HUNTER_WALK_SURFACES.buildingWorldPoint(b,x,z)}
function upperFloorHeight(b,x,z,previous=-Infinity){return window.HUNTER_WALK_SURFACES.upperFloorHeight(b,x,z,previous)}
function decorateRuntimeBuilding(b,spec){
 const box=(g,w,h,d,c,x=0,y=0,z=0,profile='paint')=>bx(g,w,h,d,c,x,y,z,profile),rod=(g,a,v,r,c)=>{
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...v),delta=end.clone().sub(start),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),6),M(c,'paint'));m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());g.add(m);return m;
 },cylinder=(g,r,h,c,x,y,z)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),M(c,'paint'));m.position.set(x,y,z);g.add(m);return m},shell={group:b.o,roof:b.roof,walls:b.wm},roofs=[];
 b.floors=spec.floors||1;b.localW=b.w;b.localD=b.d;b.wood=!!spec.wood;b.storey=b.h/b.floors;
 const registerStair=(width,run,x,z,visualGroup=null)=>{
   const stair={x,z,nx:0,nz:1,top:b.fy+b.storey+.15,bottom:b.fy+.3,
     length:run,width,ramp:true,internal:true,owner:b,destroyed:false};
   b.interiorStair=stair;stairs.push(stair);
   if(visualGroup)b.interiorStairGroup=visualGroup;
   // Hitbox només per rebre dany: mai no bloqueja el pas per la rampa.
   const parts=visualGroup?.children.filter(o=>o.isMesh)||[];
   const collider={x0:x-width/2,x1:x+width/2,
     z0:z,z1:z+run,y0:b.fy+.2,y1:b.fy+b.storey+.25,
     hp:20,m:parts[0]||new THREE.Object3D(),
     parts:parts.length?parts:null,door:false,open:false,
     rammable:false,playerBlock:false,stairStructure:stair,
     cx:x,cz:z+run/2,owner:b};
   stair.collider=collider;b.interiorStairCollider=collider;Wl.push(collider);
 };
 if(seedSearchMode){
  // Únicament dades navegables: escala física i planta superior, sense Three.js.
  if(b.floors===2){
    b.upperFloor=true;
    const {width,run,x,z}=window.HUNTER_BUILDING_SHELL.upperStair(b);
    registerStair(width,run,x,z);
  }
  return;
 }
 if(spec.wood){
  const timber=window.HUNTER_COMPOUND_ARCHITECTURE.decorateTimber(THREE,{
    b:{...spec,h:b.h},shell,box,rod,cylinder,roofs
  });
  b.extraRoofs=roofs;
  b.porchParts=timber?.porchParts||[];
  // La façana frontal (+Z local) sosté el porxo. El seu centre és
  // a d/2 - gruix/2 (= d/2 - 0,4): el límit antic d/2 - 0,3
  // no la detectava i deixava els pilars flotant en caure la paret.
  // supportSide=0 també funciona quan el barracó està girat 90°.
  for(const w of Wl)if(w.owner===b&&!w.woodenDoor&&
    (w.supportSide===0||w.cz>=b.z+b.d/2-.8)&&w.y1>b.fy+2)
    w.porchSupports=true;
  // The ribs are authored in building-local space, before the compound's
  // quarter-turn. Associate each with its real wall collision segment.
  for(const {mesh,side,z} of timber?.sideRibs||[]){
    const targetX=b.x+side*b.w/2,targetZ=b.z+z;
    const wall=Wl.find(w=>w.owner===b&&!w.door&&
      targetX>=w.x0-.15&&targetX<=w.x1+.15&&
      targetZ>=w.z0-.15&&targetZ<=w.z1+.15);
    if(wall)(wall.timberTrim||(wall.timberTrim=[])).push(mesh);
  }
 }
 if(b.floors===2){
  b.upperFloor=window.HUNTER_COMPOUND_ARCHITECTURE.decorateUpper(THREE,{b:{...spec,h:b.h},storey:b.storey,shell,box,rod,roofs});
  const {width,run,x,z}=window.HUNTER_BUILDING_SHELL.upperStair(b);
  registerStair(width,run,x,z,b.upperFloor.userData.stairGroup);
  for(const z of[-b.d/2,b.d/2])box(b.roof,b.w+.6,1,.35,0x647c72,0,b.h+1.7,z);
  for(const x of[-b.w/2,b.w/2])box(b.roof,.35,1,b.d+.6,0x647c72,x,b.h+1.7,0);
 }
}
function soldierChangeFloor(u,b,dt,targetY=P.y){
 if(!b.upperFloor||b.rb||!b.interiorStair||b.interiorStair.destroyed)return false;
 const floor=b.fy+b.storey+.15,current=u.walkY??u.o.position.y,wantsUp=targetY>floor-1,isUp=current>floor-.7;
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
