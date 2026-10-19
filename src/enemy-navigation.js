// Local navigation uses the live collision world. No navigation mesh survives a rebuild.
const enemyIsVehicle=u=>u.t==='jeep'||u.t==='tanqueta'||u.t==='tanc'||u.t==='patrulla_marina';
const enemyBodyRadius=u=>u.t==='torre'?2.4:1.05;
const enemyRouteRadius=u=>enemyIsVehicle(u)?Math.hypot(vehicleBox(u).w,vehicleBox(u).d)/2+.3:enemyBodyRadius(u)+.15;
let enemyPathBudget=2,enemyNodeBudget=160;
const enemyGroundAt=(u,x,z)=>u.basement?u.gy:enemyIsVehicle(u)?hAt(x,z):groundAt(x,z,u.walkY??u.o?.position.y??-Infinity);
function enemyWallBox(w){return{x:(w.x0+w.x1)/2,z:(w.z0+w.z1)/2,w:w.x1-w.x0,d:w.z1-w.z0,hd:0}}
function enemySolidAt(u,x,z,hd,route=false){
  const veh=enemyIsVehicle(u),r=route?enemyRouteRadius(u):veh?enemyRouteRadius(u):enemyBodyRadius(u),y=u.gy??enemyGroundAt(u,x,z);
  if(Math.abs(x)>H-r||Math.abs(z)>H-r||!u.basement&&enemyGroundAt(u,x,z)<-.8||treeHit(x,z,r))return false;
  const box=veh&&!route?vehicleBox(u,x,z,hd):null;
  if(box){box.w+=.4;box.d+=.4}
  for(const w of wallCandidates(x,z,r)){
    if(w.open||w.playerBlock===false||w.y1<y+.15||w.y0>y+(veh?4:3.4))continue;
    if(box?obbOverlap(box,enemyWallBox(w)):x>w.x0-r&&x<w.x1+r&&z>w.z0-r&&z<w.z1+r)return false;
  }
  // Els vehicles neutrals aparcats són obstacles també per a l'A*.
  // Abans només s'evitaven en la col·lisió final: la ruta els travessava.
  // La comprovació cara es fa només per calcular rutes d'infanteria.
  if(route&&!veh){
    for(const v of vehicleCandidatesAt(x,z,r+22)){
      if(v===u||v.destroyed||Math.abs(vehicleY(v)-y)>5)continue;
      if(circleVehicleOverlap(x,z,r+.25,v))return false;
    }
  }
  return true;
}
function enemyBodiesClear(u,x,z,hd){
  const veh=enemyIsVehicle(u),r=enemyBodyRadius(u),y=u.gy??enemyGroundAt(u,x,z),box=veh?vehicleBox(u,x,z,hd):null;
  if(box){box.w+=.5;box.d+=.5}
  for(const v of vehicleCandidatesAt(x,z,48)){
    if(v===u||v.destroyed||Math.abs(vehicleY(v)-y)>5)continue;
    if(veh?obbOverlap(box,vehicleBox(v)):circleVehicleOverlap(x,z,r+.3,v))return false;
  }
  for(const v of enemyCandidatesAt(x,z,32)){
    if(v===u||v.destroyed||enemyIsVehicle(v)||Math.abs((v.gy??enemyGroundAt(v,v.x,v.z))-y)>4)continue;
    if(veh?circleVehicleOverlap(v.x,v.z,enemyBodyRadius(v)+.3,{...u,x,z,hd}):Math.hypot(x-v.x,z-v.z)<r+enemyBodyRadius(v)+.3)return false;
  }
  return true;
}
// Sample both translation and rotation; a valid endpoint never permits a jump through a wall.
function enemySweep(u,ax,az,bx,bz,fromHd,toHd,dynamic=true,route=false){
  const angle=enemyIsVehicle(u)?wrapAngle(toHd-fromHd):0;
  const n=Math.max(1,Math.ceil((Math.hypot(bx-ax,bz-az)+Math.abs(angle)*enemyRouteRadius(u))/(route?1.2:.45)));
  for(let i=0;i<=n;i++){
    const t=i/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t,hd=fromHd+angle*t;
    if(!enemySolidAt(u,x,z,hd,route)||(dynamic&&!enemyBodiesClear(u,x,z,hd)))return false;
  }
  return true;
}
function enemyMoveClear(u,x,z,hd){return enemySolidAt(u,x,z,hd)&&enemyBodiesClear(u,x,z,hd)}
function enemyReindex(u,oldX,oldZ){
  const before=vehicleCellKey(Math.floor(oldX/VEHICLE_CELL),Math.floor(oldZ/VEHICLE_CELL)),after=vehicleCellKey(Math.floor(u.x/VEHICLE_CELL),Math.floor(u.z/VEHICLE_CELL));
  if(before===after)return;
  for(const grid of enemyIsVehicle(u)?[enemyGrid,vehicleGrid]:[enemyGrid]){
    const bucket=grid.get(before),i=bucket?.indexOf(u)??-1;if(i>=0)bucket.splice(i,1);addVehicleToGrid(grid,u);
  }
}
// Bounded A*: conservative footprints allow every turn on the route. The direct
// movement test uses the oriented footprint, so aligned vehicles can use narrow gates.
function enemyFindPath(u,tx,tz){
  if(u.navSearch)return u.navSearch();
  const step=Math.max(2,enemyRouteRadius(u)*.7),sx=u.x,sz=u.z,dist=Math.hypot(tx-sx,tz-sz),reach=Math.min(dist,140);
  if(dist<.1)return [];
  const gx=sx+(tx-sx)*reach/dist,gz=sz+(tz-sz)*reach/dist,pad=60,
    minX=Math.min(sx,gx)-pad,maxX=Math.max(sx,gx)+pad,minZ=Math.min(sz,gz)-pad,maxZ=Math.max(sz,gz)+pad;
  const nodes=new Map(),valid=new Map(),heap=[],key=(x,z)=>x+','+z,heur=(x,z)=>Math.hypot(gx-x,gz-z);
  function push(n){heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p}heap[i]=n}
  function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){let j=2*i+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=last.f)break;heap[i]=heap[j];i=j}heap[i]=last}return top}
  const start={ix:0,iz:0,x:sx,z:sz,g:0,f:heur(sx,sz),h:heur(sx,sz)};nodes.set('0,0',start);push(start);let best=start;
  let count=0;
  const advance=()=>{
  while(heap.length&&count<1600){
    if(enemyNodeBudget<=0)return null;
    enemyNodeBudget--;count++;
    const n=pop();if(n.closed||nodes.get(key(n.ix,n.iz))!==n)continue;n.closed=true;if(n.h<best.h)best=n;
    if(n.h<step*1.2){best=n;break}
    for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]]){
      const ix=n.ix+dx,iz=n.iz+dz,k=key(ix,iz),x=sx+ix*step,z=sz+iz*step,old=nodes.get(k),g=n.g+step*Math.hypot(dx,dz);
      if(x<minX||x>maxX||z<minZ||z>maxZ||old?.closed||(old&&old.g<=g))continue;
      const hd=Math.atan2(n.x-x,n.z-z);
      if(!valid.has(k))valid.set(k,enemySolidAt(u,x,z,hd,true));
      if(!valid.get(k))continue;
      const r=enemyRouteRadius(u),mx=(n.x+x)/2,mz=(n.z+z)/2,y=u.gy??enemyGroundAt(u,mx,mz);
      if(treeHit(mx,mz,r)||!u.basement&&enemyGroundAt(u,mx,mz)<-.8||
         (!enemyIsVehicle(u)&&!enemySolidAt(u,mx,mz,hd,true))||
         wallCandidates(mx,mz,r+step).some(w=>!w.open&&w.playerBlock!==false&&w.y1>=y+.15&&w.y0<=y+4&&segmentAabbT(n.x,0,n.z,x,0,z,w.x0-r,w.x1+r,-1,1,w.z0-r,w.z1+r)!=null))continue;
      const h=heur(x,z),next={ix,iz,x,z,g,h,f:g+h,parent:n};nodes.set(k,next);push(next);
    }
  }
  u.navSearch=null;
  if(best===start||start.h-best.h<step*.5)return [];
  const path=[];for(let n=best;n.parent;n=n.parent)path.push({x:n.x,z:n.z});return path.reverse();
  };u.navSearch=advance;return advance();
}
function mvE(u,s,tx=u.tx,tz=u.tz){
  if(!(s>0)||!Number.isFinite(tx)||!Number.isFinite(tz))return;
  const oldHd=u.navHd??u.o.rotation.y,veh=enemyIsVehicle(u),dt=Math.min(.1,s/Math.max(.1,u.sp));
  u.navRetry=Math.max(0,(u.navRetry||0)-dt);
  const goalChanged=!u.navGoal||Math.hypot(tx-u.navGoal.x,tz-u.navGoal.z)>6;
  if(goalChanged){u.navPath=[];u.navSearch=null;u.navGoal={x:tx,z:tz};u.navRetry=0}
  let target={x:tx,z:tz},hd=Math.atan2(u.x-tx,u.z-tz);
  u.navDirectT=(u.navDirectT||0)-dt;
  if(goalChanged||u.navDirectT<=0){u.navDirect=enemySweep(u,u.x,u.z,tx,tz,oldHd,hd,false,!veh);u.navDirectT=.45}
  const direct=u.navDirect;
  if(!direct){
    if(!u.navPath?.length&&u.navRetry<=0&&enemyPathBudget>0){enemyPathBudget--;const path=enemyFindPath(u,tx,tz);if(path!==null){u.navPath=path;u.navRetry=1.2}}
    while(u.navPath?.length&&Math.hypot(u.navPath[0].x-u.x,u.navPath[0].z-u.z)<.6)u.navPath.shift();
    if(u.navPath?.length)target=u.navPath[0];else{u.hd=oldHd;return}
    hd=Math.atan2(u.x-target.x,u.z-target.z);
  }else{u.navPath=[];u.navSearch=null}
  const distance=Math.min(s,Math.hypot(target.x-u.x,target.z-u.z));
  const tryMove=(angle,length=distance,reverse=false)=>{
    // Vehicles turn at a bounded rate; reversing provides room to turn at corners.
    const nextHd=veh?(reverse?oldHd:oldHd+Math.max(-dt*1.5,Math.min(dt*1.5,wrapAngle(angle-oldHd)))):angle;
    const moveHd=veh?nextHd+(reverse?Math.PI:0):angle;
    const travel=veh&&!reverse?length*Math.max(0,1-Math.abs(wrapAngle(angle-nextHd))*2):length;
    const nx=u.x-Math.sin(moveHd)*travel,nz=u.z-Math.cos(moveHd)*travel;
    if(!enemySweep(u,u.x,u.z,nx,nz,oldHd,nextHd))return false;
    const ox=u.x,oz=u.z;u.x=nx;u.z=nz;if(!veh)u.walkY=enemyGroundAt(u,nx,nz);u.hd=nextHd;u.navHd=nextHd;enemyReindex(u,ox,oz);return true;
  };
  if(tryMove(hd)){u.navBlocked=0;return}
  // Keep a consistent passing side rather than alternately pushing into a neighbour.
  const side=u.avoidSide||1;
  for(const angle of [.45,.9,1.35])if(tryMove(hd+side*angle)||tryMove(hd-side*angle))return;
  u.hd=oldHd;u.navBlocked=(u.navBlocked||0)+dt;
  if(u.navBlocked>.6){
    if(tryMove(oldHd+Math.PI,distance*.5,true)){u.navPath=[];u.navSearch=null;u.navRetry=0}
    if(u.navBlocked>1.5){u.navPath=[];u.navRetry=0;u.avoidSide=-side;u.navBlocked=0;
      // Les rutes entre complexos no poden abandonar un tram llarg
      // pel simple fet d'haver trobat un arbre o un vehicle al camí.
      if(!u.interCompoundPatrol)u.wt=0
    }
  }
}
// Resolve invalid generated placements before play, never teleport a moving enemy.
function prepareEnemyNavigation(){
  for(const u of E)if(u.t!=='patrulla_marina')u.o.position.set(u.x,u.gy??enemyGroundAt(u,u.x,u.z),u.z);
  rebuildVehicleGrid();
  for(const u of E){
    if(u.t==='torre'||u.t==='patrulla_marina')continue;
    if(!enemyMoveClear(u,u.x,u.z,u.hd)){
      const ox=u.x,oz=u.z;let found=false;
      for(let radius=2;radius<=48&&!found;radius+=2)for(let i=0;i<24;i++){
        const a=i*Math.PI/12,x=ox+Math.cos(a)*radius,z=oz+Math.sin(a)*radius;
        // A general must remain inside the bunker, on its assigned floor.
        const bunker=u.t==='general'?B.find(b=>b.kind==='enemy_bunker'):null;
        if(bunker&&(Math.abs(x-bunker.x)>bunker.hw-2||Math.abs(z-bunker.z)>bunker.hd-2))continue;
        if(enemyMoveClear(u,x,z,u.hd)){u.x=x;u.z=z;enemyReindex(u,ox,oz);found=true;break}
      }
    }
    u.navHd=u.hd;u.navPath=[];u.navGoal=null;
    u.o.position.set(u.x,u.gy??enemyGroundAt(u,u.x,u.z),u.z);u.o.rotation.y=u.hd;
  }
}
