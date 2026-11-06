// Local navigation uses the live collision world. No navigation mesh survives a rebuild.
const enemyIsVehicle=u=>u.t==='jeep'||u.t==='tanqueta'||u.t==='tanc'||u.t==='patrulla_marina';
const enemyBodyRadius=u=>u.t==='torre'?2.4:1.05;
// La planta del vehicle no canvia durant la partida: memoritzar-ne el radi
// evita construir una caixa de col·lisió per cada node de l'A*.
const enemyRouteRadius=u=>{
  if(!enemyIsVehicle(u))return enemyBodyRadius(u)+.15;
  if(u.navRadiusType===u.t&&Number.isFinite(u.navRadius))return u.navRadius;
  const b=vehicleBox(u);
  u.navRadius=Math.hypot(b.w,b.d)/2+.3;u.navRadiusType=u.t;
  return u.navRadius;
};
// Ordre de veïns idèntic, però reutilitzam l'array als milers de nodes A*.
// Un destí llunyà es comprova per trams: no cal mostrejar milers
// de punts abans d'avançar uns centímetres. Cada moviment conserva
// el seu propi sweep complet, i A* s'activa quan arriba l'obstacle.
const ENEMY_DIRECT_LOOKAHEAD=28;
// Costos constants, sense arrels quadrades durant l'expansió de l'A*.
const ENEMY_ASTAR_NEIGHBORS=Object.freeze([[1,0,1],[0,1,1],[-1,0,1],[0,-1,1],
  [1,1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2],
  [1,-1,Math.SQRT2]].map(pair=>Object.freeze(pair)));
// L'A* és incremental; els costos d'obstacles són desiguals per node.
// Reservam capacitat per a les unitats que reaccionen al jugador.
let enemyPathBudget=2,enemyNodeBudget=160;
let enemyPassivePathBudget=1,enemyPassiveNodeBudget=48;
const ENEMY_PATH_SLICE_MS=1.25,ENEMY_PASSIVE_PATH_SLICE_MS=.55;
function resetEnemyPathFrameBudget(){
  enemyPathBudget=2;enemyNodeBudget=160;
  enemyPassivePathBudget=1;enemyPassiveNodeBudget=48;
}
function enemyPassiveRoute(u){
  if(u.t==='general'||u.basement||u.blastT>0||u.canSee||u.alert>0||
    u.entryDoor||(u.pursuitT||0)>0||(u.aiMode&&u.aiMode!=='patrol'))return false;
  const q=cv||P,dx=u.x-q.x,dz=u.z-q.z;
  return dx*dx+dz*dz>620*620;
}
const enemyGroundAt=(u,x,z)=>u.basement?u.gy:enemyIsVehicle(u)?hAt(x,z):groundAt(x,z,u.walkY??u.o?.position.y??-Infinity);
function enemyWallBox(w){return{x:(w.x0+w.x1)/2,z:(w.z0+w.z1)/2,w:w.x1-w.x0,d:w.z1-w.z0,hd:0}}
// La zona de vegetació no canvia durant un sweep. Reutilitzam els
// mateixos nou cubells mentre les mostres continuen dins la cel·la;
// cap radi, palmera ni mostra de col·lisió no queda fora del test.
function enemySweepTreeHit(x,z,r,cache){
  if(!cache||typeof TG==='undefined')return treeHit(x,z,r);
  const cx=Math.floor(x/16),cz=Math.floor(z/16);
  if(cache.cx!==cx||cache.cz!==cz){
    cache.cx=cx;cache.cz=cz;cache.trees.length=0;
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
      const bucket=TG.get((cx+dx)+','+(cz+dz));
      if(bucket)for(const t of bucket)cache.trees.push(t);
    }
  }
  for(const t of cache.trees){
    if(palmsDisabled&&t.p)continue;
    const dx=x-t.x,dz=z-t.z,limit=t.r+r;
    if(dx*dx+dz*dz<limit*limit)return true;
  }
  return false;
}
function enemySolidAt(u,x,z,hd,route=false,staticCandidates=null,sampledGround=undefined){
  const veh=enemyIsVehicle(u),r=route?enemyRouteRadius(u):veh?enemyRouteRadius(u):enemyBodyRadius(u),
    y=u.gy??(sampledGround===undefined?enemyGroundAt(u,x,z):sampledGround);
  const terrainY=u.gy==null?y:!u.basement?
    (sampledGround===undefined?enemyGroundAt(u,x,z):sampledGround):y;
  if(Math.abs(x)>H-r||Math.abs(z)>H-r||
     !u.basement&&(terrainY<-.8||enemySweepTreeHit(x,z,r,staticCandidates?.treeCache)))return false;
  const box=veh&&!route?vehicleBox(u,x,z,hd):null;
  if(box){box.w+=.4;box.d+=.4}
  for(const w of staticCandidates?.walls??wallCandidates(x,z,r)){
    if(w.open||w.playerBlock===false||w.y1<y+.15||w.y0>y+(veh?4:3.4))continue;
    if(box?obbOverlap(box,enemyWallBox(w)):x>w.x0-r&&x<w.x1+r&&z>w.z0-r&&z<w.z1+r)return false;
  }
  // Els vehicles neutrals aparcats són obstacles també per a l'A*.
  // Abans només s'evitaven en la col·lisió final: la ruta els travessava.
  // La comprovació cara es fa només per calcular rutes d'infanteria.
  if(route&&!veh){
    for(const v of staticCandidates?.routeVehicles??vehicleCandidatesAt(x,z,r+22)){
      if(v===u||v.destroyed||Math.abs(vehicleY(v)-y)>5)continue;
      if(circleVehicleOverlap(x,z,r+.25,v))return false;
    }
  }
  return true;
}
function enemyBodiesClear(u,x,z,hd,dynamicCandidates=null,sampledY=undefined){
  const veh=enemyIsVehicle(u),r=enemyBodyRadius(u),
    y=sampledY===undefined?(u.gy??enemyGroundAt(u,x,z)):sampledY,
    box=veh?vehicleBox(u,x,z,hd):null;
  if(box){box.w+=.5;box.d+=.5}
  for(const v of dynamicCandidates?.vehicles??vehicleCandidatesAt(x,z,48)){
    if(v===u||v.destroyed)continue;
    // Prefiltre pla molt conservador (3x radi + 6 m) abans de
    // vehicleY(), que pot mostrejar el terreny i els molls. La prova
    // exacta del vehicle, la cota i el sweep no canvien.
    const outer=veh?Infinity:r+3*vehicleRadius(v.t)+6,
      dx=x-v.x,dz=z-v.z;
    if(Number.isFinite(outer)&&dx*dx+dz*dz>outer*outer){
      if(performanceStatsVisible)perfHotspots.aiSweepVehicleHeightSkipped++;
      continue;
    }
    if(Math.abs(vehicleY(v)-y)>5)continue;
    if(veh?obbOverlap(box,vehicleBox(v)):circleVehicleOverlap(x,z,r+.3,v))return false;
  }
  for(const v of dynamicCandidates?.enemies??enemyCandidatesAt(x,z,32)){
    if(v===u||v.destroyed||enemyIsVehicle(v))continue;
    const dx=x-v.x,dz=z-v.z,otherR=enemyBodyRadius(v);
    // Radi exterior conservador: les col·lisions reals mantenen el test exacte.
    const contact=veh?Math.hypot(box.w,box.d)*.5+otherR+.3:r+otherR+.3;
    if(dx*dx+dz*dz>=contact*contact)continue;
    if(Math.abs((v.gy??enemyGroundAt(v,v.x,v.z))-y)>4)continue;
    if(veh?circleVehicleOverlap(v.x,v.z,otherR+.3,{...u,x,z,hd}):true)return false;
  }
  return true;
}
// El terreny només decideix si la trajectòria cau sota l'aigua. La cota
// completa també és necessària quan hi ha obstacles amb volum 3D.
// Sense obstacles propers, hAt sec és suficient ENCARA QUE u.gy sigui null.
// No aproximem altures si hi ha murs/vehicles/soldats propers, ni sobre
// aigua o edificis amb forjats: en aquests casos fem exactament groundAt.
function enemySweepSampleGround(u,x,z,needsElevation=u.gy==null){
  if(u.basement)return u.gy;
  if(!needsElevation||u.gy!=null){
    const physical=hAt(x,z);
    if(physical>=-.8){
      if(performanceStatsVisible)perfHotspots.aiSweepFastGroundSamples++;
      return physical;
    }
  }
  if(performanceStatsVisible)perfHotspots.aiSweepFullGroundSamples++;
  return enemyGroundAt(u,x,z);
}
// Filtre conservador en 2D: només ens cal altitud cara quan hi ha
// objectes que poden canviar el resultat per la seva cota vertical.
// S'utilitzen marges superiors als hitboxes, mai menors. A* (route)
// sempre segueix el camí exacte.
function enemySweepNeedsElevation(u,x,z,r,route,staticCandidates,dynamicCandidates,expansion=0){
  if(route)return true;
  for(const w of staticCandidates.walls){
    if(!w.open&&w.playerBlock!==false&&
       x>w.x0-r-expansion&&x<w.x1+r+expansion&&
       z>w.z0-r-expansion&&z<w.z1+r+expansion)return true;
  }
  if(!dynamicCandidates)return false;
  for(const v of dynamicCandidates.vehicles){
    if(v!==u&&!v.destroyed&&Math.abs(v.x-x)<48+expansion&&
       Math.abs(v.z-z)<48+expansion)return true;
  }
  const neighborMargin=r+18+expansion;
  for(const v of dynamicCandidates.enemies){
    if(v!==u&&!v.destroyed&&!enemyIsVehicle(v)&&
       Math.abs(v.x-x)<neighborMargin&&Math.abs(v.z-z)<neighborMargin)return true;
  }
  return false;
}
// El radi de cerca espacial és conservador, però pot retornar obstacles
// que estan fora de TOT el trajecte. Filtram una sola vegada per segment,
// mai per mostra. La caixa ampliada inclou el radi real de col·lisió.
function enemySweptSubset(items,ax,az,bx,bz,marginFor){
  const minX=Math.min(ax,bx),maxX=Math.max(ax,bx),
    minZ=Math.min(az,bz),maxZ=Math.max(az,bz);
  return items.filter(item=>{
    const margin=marginFor(item);
    return !Number.isFinite(item.x)||!Number.isFinite(item.z)||
      !Number.isFinite(margin)||
      (item.x+margin>=minX&&item.x-margin<=maxX&&
       item.z+margin>=minZ&&item.z-margin<=maxZ);
  });
}
// Els murs tenen x0/x1/z0/z1, no x/z: el prefiltre genèric els
// mantenia tots. Es descarten només els que queden fora de la caixa
// conservadora del trajecte, sense modificar la col·lisió final.
function enemySweptWallSubset(walls,ax,az,bx,bz,margin){
  const minX=Math.min(ax,bx)-margin,maxX=Math.max(ax,bx)+margin,
    minZ=Math.min(az,bz)-margin,maxZ=Math.max(az,bz)+margin;
  return walls.filter(w=>{
    // Un mur amb límits no disponibles es conserva per seguretat.
    if(!Number.isFinite(w.x0)||!Number.isFinite(w.x1)||
       !Number.isFinite(w.z0)||!Number.isFinite(w.z1))return true;
    return Math.max(w.x0,w.x1)>=minX&&Math.min(w.x0,w.x1)<=maxX&&
      Math.max(w.z0,w.z1)>=minZ&&Math.min(w.z0,w.z1)<=maxZ;
  });
}
// Sample both translation and rotation; a valid endpoint never permits a jump through a wall.
function enemySweep(u,ax,az,bx,bz,fromHd,toHd,dynamic=true,route=false){
  const sweepStamp=performanceStatsVisible?performance.now():0;
  let sweepSamples=0;
  try{
  const veh=enemyIsVehicle(u),angle=veh?wrapAngle(toHd-fromHd):0,
    distance=Math.hypot(bx-ax,bz-az),radius=enemyRouteRadius(u),
    n=Math.max(1,Math.ceil((distance+Math.abs(angle)*radius)/(route?1.2:.45)));
  // Una sola consulta espacial pel tram complet, en lloc de fer-ne
  // fins a sis per mostra. El radi cobreix TOTES les cel·les que
  // consultaria cada punt (centre + mitja longitud + marge original).
  // Les comprovacions exactes, inclosos arbres, murs i altres soldats,
  // continuen funcionant a cada mostra, sense saltar cap col·lisió.
  const cx=(ax+bx)*.5,cz=(az+bz)*.5,half=distance*.5,
    solidRadius=route||veh?radius:enemyBodyRadius(u);
  const staticCandidates={
    walls:enemySweptWallSubset(wallCandidates(cx,cz,half+solidRadius),
      ax,az,bx,bz,solidRadius+2),
    treeCache:{cx:NaN,cz:NaN,trees:[]}
  };
  const vehicleMargin=v=>{
    const radius=vehicleRadius(v.t);
    return solidRadius+(Number.isFinite(radius)?radius:70)+6;
  };
  if(route&&!veh)
    staticCandidates.routeVehicles=enemySweptSubset(
      vehicleCandidatesAt(cx,cz,half+solidRadius+22),
      ax,az,bx,bz,vehicleMargin);
  const dynamicCandidates=dynamic?{
    vehicles:enemySweptSubset(vehicleCandidatesAt(cx,cz,half+48),
      ax,az,bx,bz,vehicleMargin),
    enemies:enemySweptSubset(enemyCandidatesAt(cx,cz,half+32),
      ax,az,bx,bz,v=>solidRadius+enemyBodyRadius(v)+2)
  }:null;
  // Un prefiltre conservador per tot el segment evita tornar a escanejar
  // els mateixos murs/vehicles/soldats a cada mostra d'un tram lliure.
  // El radi inflat inclou qualsevol punt intermedi del recorregut.
  const possiblyElevated=enemySweepNeedsElevation(
    u,cx,cz,solidRadius,route,staticCandidates,dynamicCandidates,half);
  for(let i=0;i<=n;i++){
    const t=i/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t,hd=fromHd+angle*t;
    if(performanceStatsVisible)sweepSamples++;
    // El càlcul de cota de terreny (escales, pisos, ports i LOD) és
    // especialment car: es fa un cop per mostra, no dues vegades.
    const needsElevation=possiblyElevated&&enemySweepNeedsElevation(
      u,x,z,solidRadius,route,staticCandidates,dynamicCandidates);
    const ground=enemySweepSampleGround(u,x,z,needsElevation),
      sampleY=u.gy??ground;
    if(!enemySolidAt(u,x,z,hd,route,staticCandidates,ground)||
       (dynamic&&(dynamicCandidates.vehicles.length||dynamicCandidates.enemies.length)&&
        !enemyBodiesClear(u,x,z,hd,dynamicCandidates,sampleY)))return false;
  }
  return true;
  }finally{
    if(performanceStatsVisible){
      perfHotspots.aiSweepMs+=performance.now()-sweepStamp;
      perfHotspots.aiSweepChecks++;
      perfHotspots.aiSweepSamples+=sweepSamples;
    }
  }
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
  const gx=sx+(tx-sx)*reach/dist,gz=sz+(tz-sz)*reach/dist,
    // La porta del recinte pot quedar lluny de la línia directa.
    pad=u.enemyVehicleClaim?.phase==='approach'?110:60,
    minX=Math.min(sx,gx)-pad,maxX=Math.max(sx,gx)+pad,minZ=Math.min(sz,gz)-pad,maxZ=Math.max(sz,gz)+pad;
  const nodes=new Map(),valid=new Map(),heap=[],key=(x,z)=>x+','+z,heur=(x,z)=>Math.hypot(gx-x,gz-z);
  function push(n){heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p}heap[i]=n}
  function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){let j=2*i+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=last.f)break;heap[i]=heap[j];i=j}heap[i]=last}return top}
  const start={ix:0,iz:0,x:sx,z:sz,g:0,f:heur(sx,sz),h:heur(sx,sz)};nodes.set('0,0',start);push(start);let best=start;
  let count=0;
  const advance=()=>{
  const passive=enemyPassiveRoute(u),sliceStarted=performance.now(),
    sliceLimit=passive?ENEMY_PASSIVE_PATH_SLICE_MS:ENEMY_PATH_SLICE_MS;
  let progressed=0;
  while(heap.length&&count<(u.enemyVehicleClaim?.phase==='approach'?4200:1600)){
    // Una cerca costosa es pausa sense esborrar el heap ni l'objectiu.
    // Després de cada bloc de vuit nodes es comprova el temps gastat.
    if(enemyNodeBudget<=0||(passive&&enemyPassiveNodeBudget<=0)||
      (progressed>0&&(progressed&7)===0&&
       performance.now()-sliceStarted>=sliceLimit)){
      if(performanceStatsVisible)perfHotspots.aiPathDeferred++;
      return null;
    }
    enemyNodeBudget--;
    if(passive)enemyPassiveNodeBudget--;
    if(performanceStatsVisible){
      perfHotspots.aiPathNodes++;
      if(passive)perfHotspots.aiPassivePathNodes++;
    }
    count++;progressed++;
    const n=pop();if(n.closed||nodes.get(key(n.ix,n.iz))!==n)continue;n.closed=true;if(n.h<best.h)best=n;
    if(n.h<step*1.2){best=n;break}
    for(const [dx,dz,cost] of ENEMY_ASTAR_NEIGHBORS){
      const ix=n.ix+dx,iz=n.iz+dz,k=key(ix,iz),x=sx+ix*step,z=sz+iz*step,old=nodes.get(k),g=n.g+step*cost;
      if(x<minX||x>maxX||z<minZ||z>maxZ||old?.closed||(old&&old.g<=g))continue;
      const hd=Math.atan2(n.x-x,n.z-z);
      if(!valid.has(k))valid.set(k,enemySolidAt(u,x,z,hd,true));
      if(!valid.get(k))continue;
      const r=enemyRouteRadius(u),mx=(n.x+x)/2,mz=(n.z+z)/2,
        // Una única consulta del terreny real, també si gy és fix.
        midGround=enemyGroundAt(u,mx,mz),y=u.gy??midGround,
        routeVehicle=enemyIsVehicle(u);
      // L'endpoint d'infanteria ja valida arbres dins enemySolidAt.
      if((routeVehicle&&!u.basement&&treeHit(mx,mz,r))||
         (!u.basement&&midGround<-.8)||
         (!routeVehicle&&!enemySolidAt(u,mx,mz,hd,true,null,midGround))||
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
  const stamp=performanceStatsVisible?performance.now():0;
  try{
  if(!(s>0)||!Number.isFinite(tx)||!Number.isFinite(tz))return;
  const oldHd=u.navHd??u.o.rotation.y,veh=enemyIsVehicle(u),dt=Math.min(.1,s/Math.max(.1,u.sp));
  u.navRetry=Math.max(0,(u.navRetry||0)-dt);
  const goalChanged=!u.navGoal||Math.hypot(tx-u.navGoal.x,tz-u.navGoal.z)>6;
  if(goalChanged){u.navPath=[];u.navSearch=null;u.navGoal={x:tx,z:tz};u.navRetry=0}
  let target={x:tx,z:tz},hd=Math.atan2(u.x-tx,u.z-tz);
  // La decisió anticipada i el moviment físic tenen cadències separades.
  // Els moviments de tota unitat continuen passant pel sweep exacte.
  const passiveRoute=enemyPassiveRoute(u);
  // El dt de la maniobra té topall de 0,1 s. El rellotge de decisions,
  // en canvi, ha de seguir els segons simulats de la patrulla, sense
  // alterar la distància ni la precisió del moviment físic.
  const decisionDt=passiveRoute?
    s/Math.max(.1,u.sp*(u.guard?.35:.5)):dt;
  u.navDirectT=(u.navDirectT||0)-decisionDt;
  if(goalChanged||u.navDirectT<=0){
    const directStarted=performanceStatsVisible?performance.now():0;
    const longDistance=Math.hypot(tx-u.x,tz-u.z),
      decisionLookahead=passiveRoute?10:ENEMY_DIRECT_LOOKAHEAD,
      lookahead=Math.min(1,decisionLookahead/Math.max(.001,longDistance));
    // La comprovació predictiva és curta, però el sweep real de tryMove
    // continua fent servir tota la petjada i les col·lisions dinàmiques.
    // La predicció d'espai lliure tampoc no pot girar el jeep sobre el lloc:
    // usa el primer tram realista de la corba, no una rotació en sec.
    const preview=u.t==='jeep'?window.HUNTER_ENEMY_CAR_STEERING.enemyCarArcStep({
      x:u.x,z:u.z,heading:oldHd,targetHeading:hd,
      distance:Math.min(10,longDistance)
    }):null;
    u.navDirect=enemySweep(u,u.x,u.z,
      preview?.x??u.x+(tx-u.x)*lookahead,
      preview?.z??u.z+(tz-u.z)*lookahead,
      oldHd,preview?.heading??hd,false,!veh);
    u.navDirectT=passiveRoute?.8:.45;
    if(performanceStatsVisible){
      if(passiveRoute)perfHotspots.aiPassiveDirectChecks++;
      perfHotspots.aiDirectMs+=performance.now()-directStarted;
      perfHotspots.aiDirectChecks++;
    }
  }
  const direct=u.navDirect;
  if(!direct){
    if(!u.navPath?.length&&u.navRetry<=0&&enemyPathBudget>0&&
      (!passiveRoute||enemyPassivePathBudget>0)){
      enemyPathBudget--;
      if(passiveRoute)enemyPassivePathBudget--;
      const pathStarted=performanceStatsVisible?performance.now():0;
      const path=enemyFindPath(u,tx,tz);
      if(performanceStatsVisible){
        perfHotspots.aiPathMs+=performance.now()-pathStarted;
        perfHotspots.aiPathChecks++;
      }
      if(path!==null){u.navPath=path;u.navRetry=1.2}
    }
    while(u.navPath?.length&&Math.hypot(u.navPath[0].x-u.x,u.navPath[0].z-u.z)<.6)u.navPath.shift();
    if(u.navPath?.length)target=u.navPath[0];else{u.hd=oldHd;return}
    hd=Math.atan2(u.x-target.x,u.z-target.z);
  }else{u.navPath=[];u.navSearch=null}
  const distance=Math.min(s,Math.hypot(target.x-u.x,target.z-u.z));
  const tryMove=(angle,length=distance,reverse=false)=>{
    // El jeep (amb rodes) ha de recórrer un arc per girar.
    // Les erugues de tancs/tanquetes conserven el gir en espai reduït.
    const car=u.t==='jeep',error=wrapAngle(angle-oldHd);
    const carTravel=car?length*(reverse?1:Math.max(.58,1-Math.abs(error)*.16)):0;
    const arc=car?window.HUNTER_ENEMY_CAR_STEERING.enemyCarArcStep({
      x:u.x,z:u.z,heading:oldHd,targetHeading:angle,distance:carTravel,reverse
    }):null;
    const nextHd=car?arc.heading:veh?(reverse?oldHd:
      oldHd+Math.max(-dt*1.5,Math.min(dt*1.5,error))):angle;
    const moveHd=veh?nextHd+(reverse?Math.PI:0):angle;
    const travel=car?arc.distance:veh&&!reverse?
      length*Math.max(0,1-Math.abs(wrapAngle(angle-nextHd))*2):length;
    const nx=car?arc.x:u.x-Math.sin(moveHd)*travel,
          nz=car?arc.z:u.z-Math.cos(moveHd)*travel;
    // Sweep amb petjada orientada durant tot l'arc. La diferència respecte
    // de la corda és negligible als passos petits i no travessa obstacles.
    if(!enemySweep(u,u.x,u.z,nx,nz,oldHd,nextHd))return false;
    const ox=u.x,oz=u.z;u.x=nx;u.z=nz;if(!veh)u.walkY=enemyGroundAt(u,nx,nz);u.hd=nextHd;u.navHd=nextHd;enemyReindex(u,ox,oz);return true;
  };
  if(tryMove(hd)){u.navBlocked=0;return}
  // Keep a consistent passing side rather than alternately pushing into a neighbour.
  const side=u.avoidSide||1;
  for(const angle of [.45,.9,1.35])if(tryMove(hd+side*angle)||tryMove(hd-side*angle))return;
  u.hd=oldHd;u.navBlocked=(u.navBlocked||0)+dt;
  if(u.navBlocked>.6){
    if(tryMove(u.t==='jeep'?oldHd+side*1.2:oldHd+Math.PI,distance*.5,true)){u.navPath=[];u.navSearch=null;u.navRetry=0}
    if(u.navBlocked>1.5){u.navPath=[];u.navRetry=0;u.avoidSide=-side;u.navBlocked=0;
      // Les rutes entre complexos no poden abandonar un tram llarg
      // pel simple fet d'haver trobat un arbre o un vehicle al camí.
      if(!u.interCompoundPatrol)u.wt=0
    }
  }
  }finally{
    if(performanceStatsVisible)perfHotspots.aiNavMs+=performance.now()-stamp;
  }
}
// Resolve invalid generated placements before play, never teleport a moving enemy.
function prepareEnemyNavigation(){return drainBuildSteps(prepareEnemyNavigationSteps())}
function* prepareEnemyNavigationSteps(){
  for(const u of E)if(u.t!=='patrulla_marina')u.o.position.set(u.x,u.gy??enemyGroundAt(u,u.x,u.z),u.z);
  rebuildVehicleGrid();
  let prepared=0;
  for(const u of E){
    yield {stage:'Navegació enemiga',completed:prepared++,total:E.length,unit:'enemics'};
    if(u.t==='torre'||u.t==='patrulla_marina')continue;
    if(!enemyMoveClear(u,u.x,u.z,u.hd)){
      const ox=u.x,oz=u.z;let found=false;
      for(let radius=2;radius<=48&&!found;radius+=2)for(let i=0;i<24;i++){
        if(i%8===0)yield {stage:'Desbloquejant emplaçaments enemics',completed:prepared,total:E.length,unit:'enemics'};
        const a=i*Math.PI/12,x=ox+Math.cos(a)*radius,z=oz+Math.sin(a)*radius;
        // El general es manté dins del seu despatx subterrani ampliat,
        // no dins l'antic rectangle de la planta superior del búnquer.
        const bunker=u.t==='general'?u.basement:null;
        if(bunker?.basement){
          const q=buildingLocalPoint(bunker,x,z),room=bunker.basement.generalRoom;
          if(room?(q.x<room.xMin||q.x>room.xMax||q.z<room.zMin||q.z>room.zMax):
            (Math.abs(q.x)>bunker.basement.halfX-1.5||
             Math.abs(q.z)>bunker.basement.halfZ-1.5))continue;
        }
        if(enemyMoveClear(u,x,z,u.hd)){u.x=x;u.z=z;enemyReindex(u,ox,oz);found=true;break}
      }
    }
    u.navHd=u.hd;u.navPath=[];u.navGoal=null;
    u.o.position.set(u.x,u.gy??enemyGroundAt(u,u.x,u.z),u.z);u.o.rotation.y=u.hd;
  }
}
