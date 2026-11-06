// Placement/pad plan only. Instantiation of walls, buildings and entities is a
// separate stage and may consume more random values before the next layout.
const finite=Number.isFinite;
export function compoundPoint(q,angle=0,mirror=1){
  if(![q.x,q.z,angle].every(finite)||![1,-1].includes(mirror))throw new RangeError('Invalid compound transform');
  const c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle));
  return (x,z)=>[q.x+x*mirror*c-z*s,q.z+x*mirror*s+z*c];
}
export function planCompound(layout,q,{random,rawHeightAt}){
  if(!layout||typeof layout.id!=='string'||!Array.isArray(layout.size)||layout.size.length!==2||!layout.size.every(v=>finite(v)&&v>0)||![q.x,q.z].every(finite)||typeof random!=='function'||typeof rawHeightAt!=='function')throw new RangeError('Invalid compound planning input');
  const isPort=layout.id==='port',coastal=isPort||!!layout.waterfront,
    angle=layout.fixedOrientation?(q.angle||0):['base','hq'].includes(layout.id)?0:coastal?q.angle:Math.floor(random()*4)*Math.PI/2,
    mirror=1,tr=compoundPoint(q,angle,mirror),shore=layout.waterfront?.shore??8,
    landDepth=coastal?shore+layout.size[1]/2-5:layout.size[1]+8,
    center=tr(0,coastal?-layout.size[1]/2+landDepth/2:0),height=coastal?.86:q.h??rawHeightAt(q.x,q.z);
  if(!finite(height)||!finite(landDepth)||landDepth<=0)throw new RangeError('Invalid compound pad');
  return {id:layout.id,layoutId:layout.layoutId||layout.id,variant:layout.variant||1,x:q.x,z:q.z,angle,mirror,
    r:Math.hypot(...layout.size)/2+20,isPort,coastal,landDepth,center,height,
    level:{x:center[0],z:center[1],hw:(layout.size[0]+8)/2,hd:landDepth/2,y:height,rot:angle,c:Math.cos(angle),s:Math.sin(angle),blend:coastal?3:18},
    entrances:layout.entrances.map(p=>tr(...p)),patrol:layout.patrol.map(p=>tr(...p)),
    routes:layout.routes.map(r=>({width:r.width,points:r.points.map(p=>tr(...p))})),
    buildings:layout.buildings.map(spec=>{const [x,z]=tr(spec.x,spec.z);return {...structuredClone(spec),x,z,angle:angle-(spec.rotationY||0)};})};
}

// Registre de reserves d'espai, sense escenes ni generador de nombres aleatoris.
// Manté les referències mutables, el cache de radis i l'ordre d'acceptació.
export function createSiteRegistry({
  layouts,layoutRadius,initialCenters,MapConstructor=Map,corridorClear=()=>true
}){
const COMPOUND_RADII=Object.freeze({
  avancada:84,
  garatge:95,
  heliport:102,
  polvori:98,
  comunicacions:95,
  port:90
});
const COMPOUND_GAP=34;
// Reserva explícita de la base i de l'HQ: encara que dues illes generades se solapin
// físicament, cap compound podrà entrar dins aquests perímetres.
const compoundCenters=initialCenters;
const typeId=t=>({avancada:'outpost',garatge:'hangar'}[t]||t);
const compoundRadiusCache=new MapConstructor();
const compoundRadius=type=>{
  if(!compoundRadiusCache.has(type))compoundRadiusCache.set(type,
    Math.max(COMPOUND_RADII[type]||58,...layouts.filter(l=>l.type===typeId(type)).map(layoutRadius)));
  return compoundRadiusCache.get(type);
};
const compoundSiteClear=(type,q,minCenter=0)=>{
  const r=compoundRadius(type);
  return compoundCenters.every(c=>{
    const d=Math.hypot(q.x-c.x,q.z-c.z);
    return d>Math.max(minCenter,r+c.r+COMPOUND_GAP)
  })&&corridorClear(type,q,r)
};
const registerCompound=(type,q)=>compoundCenters.push({x:q.x,z:q.z,r:compoundRadius(type),type});

return {centers:compoundCenters,gap:COMPOUND_GAP,
  radius:compoundRadius,isClear:compoundSiteClear,register:registerCompound};
}

// Reserva progressiva d'emplaçaments, sense construir geometria.
// landSteps i compound són generadors injectats: es preserven
// literalment l'ordre dels yields, la prioritat d'illes i els intents.
export function createReservationPlanner({
  candidateIslands,usedSpecialIslands,sectorMatches,landSteps,
  compoundSiteClear,compound
}){
const reserveCompound=function* (type,min=180,sector=null){let checkpointUnits=0;for(const i of candidateIslands.filter(i=>sectorMatches(i.x,i.z,sector))){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};if(usedSpecialIslands.has(i))continue;for(let n=0;n<18;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const q=(yield* landSteps(i,850,1));if(q&&sectorMatches(q.x,q.z,sector)&&compoundSiteClear(type,q,min)){q.r=i.r;if((yield* compound(type,q))){usedSpecialIslands.add(i);return q}}}}return null};
const forceReserve=function* (type,min,sector=null){let checkpointUnits=0;
  let q=(yield* reserveCompound(type,min,sector))||(yield* reserveCompound(type,110,sector));if(q)return q;
  // Fallback exhaustiu, però mai saltant-se la zona de seguretat.
  for(const i of candidateIslands.filter(i=>sectorMatches(i.x,i.z,sector))){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    if(usedSpecialIslands.has(i))continue;
    for(let n=0;n<48;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const c=(yield* landSteps(i,1800,1));if(!c||!sectorMatches(c.x,c.z,sector)||!compoundSiteClear(type,c,95))continue;
      c.r=i.r;if((yield* compound(type,c))){usedSpecialIslands.add(i);return c}
    }
  }
  return null
};

return {reserveCompound,forceReserve};
}

// Valida només el sòl i els carrils nàutics; cap geometria, RNG ni desament.
// S'injecta la mida de mapa activa i es mantenen les pauses originals.
export function createPortSiteSurvey({rawHAt,halfSize,compoundTransform}){
const H=halfSize;
const portSiteFeasible=function* (q){let checkpointUnits=0;
  for(let turn=0;turn<4;turn++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const angle=turn*Math.PI/2,point=compoundTransform(q,angle);
    for(let d=16;d<Math.max(180,(q.r||180)*1.4);d+=8){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const [x,z]=point(0,d);if(rawHAt(x,z)>.3)continue;
      for(const offset of[-8,0,8]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
        const [cx,cz]=point(0,d+offset),site={x:cx,z:cz,h:.86,angle,r:q.r},
              tr=compoundTransform(site,angle);
        if(Math.abs(cx)>H-100||Math.abs(cz)>H-100)continue;
        let valid=true;
        for(const lx of[-52,-26,0,26,52]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
          for(const lz of[-60,-35,-10]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
            const p=tr(lx,lz);
            if(rawHAt(...p)<.1){valid=false;break}
          }
          if(!valid)break
        }
        if(!valid)continue;
        coastTest:for(const [lx,lz] of[[-13,31],[15,26],[35,34]])
          {if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(const dx of[-7,0,7]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(let dz=-16;dz<=52;dz+=4){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
            const p=tr(lx+dx,lz+dz);
            if(rawHAt(...p)>-2.2){valid=false;break coastTest}
          }}}
        if(valid)return true;
      }
      if(rawHAt(x,z)<-15)break;
    }
  }
  return false;
};
return portSiteFeasible;
}

// Planificador costaner sense escena/Three.js: comprovació d'espai i
// exploració incremental de molls i terminals (inclòs el ferri).
// Les dependències actives es llegeixen amb getters perquè la mida del
// mapa pot canviar entre partides sense reconstruir el runtime.
// Preserve exactament l'ordre de mostreig, el yield i els callbacks
// síncrons o generadors de verificació de camins.
export function createCoastalLayoutPlanner({
 compoundTransform,rawHAt,getHalfSize,getVehicleTypes,
 getVehicleScales,getVehicleHitboxes
}){
function coastalLayoutFits(l,q){
 const H=getHalfSize(),VT=getVehicleTypes(),VS=getVehicleScales();
 const tr=compoundTransform(q,q.angle),shore=l.waterfront?.shore??8;
 for(const x of[-l.size[0]/2,0,l.size[0]/2])for(const z of[-l.size[1]/2,-l.size[1]/4,shore-8]){const p=tr(x,z);if(Math.abs(p[0])>H-15||Math.abs(p[1])>H-15||rawHAt(...p)<(z===shore-8?-2:.12))return false}
 for(const b of l.buildings)for(const dx of[-b.w/2,0,b.w/2])for(const dz of[-b.d/2,0,b.d/2])if(rawHAt(...tr(b.x+dx,b.z+dz))<.2)return false;
 for(const v of l.vehicles.filter(v=>['w','wl'].includes(VT[v.t]?.m))){
  const hb=getVehicleHitboxes()[v.t],sc=VS[v.t]||1,hw=hb[0]*sc/2+1,hd=hb[1]*sc/2+1;
  for(const dx of[-hw,0,hw])for(let dz=-hd;dz<=hd+(v.t==='ferry'?45:16);dz+=5)if(rawHAt(...tr(v.x+dx,v.z+dz))>-2)return false;
 }
 return true;
}

function* findCoastalLayoutSteps(l,anchor,accept=()=>true){
 const shore=l.waterfront?.shore??8;
 for(const offset of[0,60,-60,120,-120,180,-180,240,-240,300,-300,360,-360])for(let turn=0;turn<4;turn++){
  yield {stage:'Emplaçaments de costa',completed:null,total:null};
  const angle=turn*Math.PI/2,tr=compoundTransform(anchor,angle);
  let landSeen=false;
  for(let d=0;d<Math.min(900,(anchor.r||400)*1.6);d+=12){
   const p=tr(offset,d),h=rawHAt(...p);if(h>.2){landSeen=true;continue}if(!landSeen)continue;
   for(const shift of[-18,-12,-6,0,6,12,18,24]){
    const center=tr(offset,d-shore+shift),q={x:center[0],z:center[1],angle,h:.86,r:anchor.r};
    if(coastalLayoutFits(l,q)){
      const accepted=accept(q);
      if(accepted&&typeof accepted.next==='function'){if(yield* accepted)return q}
      else if(accepted)return q;
    }
   }
   break;
  }
 }
 return null;
}
 return {coastalLayoutFits,findCoastalLayoutSteps};
}

// Cerca de la carretera a la costa, separada del moviment de terres i
// de la malla visual. Els edificis i els marges del món són consultats
// durant el mostreig: així un reinici no deixa referències obsoletes.
// L'ordre d'A*, el cost, la projecció dels pendents i els checkpoints
// cooperatius es mantenen iguals que en el generador anterior.
export function createCoastRoadSolver({
 heightAt:hAt,getHalfSize,getBuildings,MapConstructor=Map
}){
function* solveCoastRoadSteps(start,goal){
 const step=12,nodes=new MapConstructor(),open=[],cache=new MapConstructor(),key=(x,z)=>x+','+z;
 const sample=(x,z)=>{const k=key(x,z);if(cache.has(k))return cache.get(k);let y=hAt(x,z),ok=y>.15&&Math.abs(x)<getHalfSize()-20&&Math.abs(z)<getHalfSize()-20;
  for(const b of getBuildings())if(Math.abs(x-b.x)<b.w/2+7&&Math.abs(z-b.z)<b.d/2+7)ok=false;
  for(const [dx,dz]of[[-5,0],[5,0],[0,-5],[0,5]])if(hAt(x+dx,z+dz)<.1)ok=false;
  const value={y,ok};cache.set(k,value);return value;
 };
 const first={x:start.x,z:start.z,ix:0,iz:0,g:0,h:Math.hypot(goal.x-start.x,goal.z-start.z)};first.f=first.h;open.push(first);nodes.set('0,0',first);let found=null,count=0;
 while(open.length&&count++<14000){if(count%8===0)yield {stage:'Camí de la base a la costa',completed:count,total:null,unit:'nodes'};open.sort((a,b)=>b.f-a.f);const n=open.pop();if(n.closed)continue;n.closed=true;
  if(Math.hypot(n.x-goal.x,n.z-goal.z)<step*1.3){found=n;break}
  for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const ix=n.ix+dx,iz=n.iz+dz,x=start.x+ix*step,z=start.z+iz*step,k=key(ix,iz),old=nodes.get(k);if(old?.closed||Math.hypot(x-start.x,z-start.z)>1600)continue;
   const a=sample(n.x,n.z),b=sample(x,z),mid=sample((x+n.x)/2,(z+n.z)/2),dist=step*Math.hypot(dx,dz);if(!b.ok||!mid.ok||Math.abs(b.y-a.y)>dist*.38)continue;
   const g=n.g+dist+Math.abs(b.y-a.y)*8;if(old&&g>=old.g)continue;
   const next={ix,iz,x,z,g,f:g+Math.hypot(x-goal.x,z-goal.z),parent:n};nodes.set(k,next);open.push(next);
  }
 }
 if(!found)return null;
 const points=[{...goal,y:.86}];for(let n=found;n;n=n.parent)points.push({x:n.x,z:n.z,y:hAt(n.x,n.z)});points.reverse();
 // Forward/backward slope projection fixes both endpoints and limits the road to 12%.
 for(let pass=0;pass<6;pass++){
  points[0].y=hAt(start.x,start.z);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],rise=Math.hypot(a.x-b.x,a.z-b.z)*.12;b.y=Math.max(a.y-rise,Math.min(a.y+rise,b.y))}
  points.at(-1).y=.86;for(let i=points.length-2;i>=0;i--){const a=points[i+1],b=points[i],rise=Math.hypot(a.x-b.x,a.z-b.z)*.12;b.y=Math.max(a.y-rise,Math.min(a.y+rise,b.y))}
 }
 if(Math.abs(points[0].y-hAt(start.x,start.z))>.2||points.some(p=>Math.abs(p.y-hAt(p.x,p.z))>7))return null;
 return points;
}
 return solveCoastRoadSteps;
}

// Geometria plana de la ruta d'escapada del camp de presoners.
// No altera el terreny; només calcula els arguments de l'anivellament.
export function planPrisonEscapeGrade(prisonCamp,prisonBounds,height){
 return [prisonCamp.x,prisonCamp.z+(prisonBounds.padHalfDepth+prisonBounds.escapeEnd)/2,
   28,prisonBounds.escapeEnd-prisonBounds.padHalfDepth,height,0,18];
}

// Registre de camins físics dels complexos separat de les malles/LOD.
// Es preserven l'ordre, l'identitat dels punts originals i la densitat de
// mostreig (3 m) perquè ni la vegetació ni el spawn canviïn amb la llavor.
export function createPathClearanceRegistrar({smoothPath,pathRoutes,compoundClear}){
const compoundPath=(points,width=4,color=0x8a795e)=>{
  pathRoutes.push({points,width,color});
  const curve=smoothPath(points,width);
  for(let i=1;i<curve.length;i++){const a=curve[i-1],b=curve[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));for(let k=0;k<=n;k++){const t=k/n;compoundClear.push({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,r:width*.8+2})}}
};
 return compoundPath;
}

// Planifica la rampa costanera i la geometria escalar d'un pantalà.
// La construcció de cobertes, pilons, col·lisions i escales continua
// a world-generation.js. Les consultes a hAt mantenen l'ordre original.
export function planPierSetup(x1,z1,x2,z2,width=4.2,accessRamp=true,hAt,pierDeckY){
 const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz);if(L<2)return null;
 const ux=dx/L,uz=dz/L,px=-uz,pz=ux,n=Math.max(1,Math.ceil(L/5));
 let ramp=null;
 if(accessRamp&&L>width){
   let rampLength=12,rampGround=null;
   for(let d=12;d<=40;d+=2){
     const shoreH=hAt(x1-ux*d,z1-uz*d);
     if(shoreH>.25){rampLength=d;rampGround=shoreH+.08;break}
   }
   if(rampGround!==null){
     ramp={x:x1,z:z1,nx:-ux,nz:-uz,length:rampLength,
       width:width-.25,bottom:rampGround,top:pierDeckY,ramp:true,pierAccess:true};
   }
 }
 return {dx,dz,L,ux,uz,px,pz,n,ramp};
}

// Costa de ports independents: cerca de profunditat i de parcel·la sense
// crear geometria ni consumir cap número aleatori addicional.
// landSteps fa servir la mateixa RNG externa de la partida.
export function createStandalonePortPlanner({rawHAt,landSteps}){
 function* findPortWater(q){let checkpointUnits=0;for(let a=0;a<32;a++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const aa=a*Math.PI/16;for(let d=28;d<Math.max(100,q.r||180);d+=8){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const wx=q.x+Math.cos(aa)*d,wz=q.z+Math.sin(aa)*d;if(rawHAt(wx,wz)<-3&&rawHAt(wx+Math.cos(aa)*12,wz+Math.sin(aa)*12)<-3)return{x:wx,z:wz,hd:Math.atan2(-Math.cos(aa),-Math.sin(aa)),aa}}}return null}
 function* findPortSite(island,tries=18){let checkpointUnits=0;for(let n=0;n<tries;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const q=(yield* landSteps(island,700,1));if(!q)continue;q.r=island.r;const portBest=(yield* findPortWater(q));if(portBest)return{...q,portBest}}return null}
 function* surveyStandalonePierShore(q,best){
   let checkpointUnits=0;
   const dx=best.x-q.x,dz=best.z-q.z,L=Math.hypot(dx,dz),
     ux=dx/L,uz=dz/L;
   let shore=null;
   for(let d=3;d<L;d+=2.5){
     if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
     const sx=q.x+ux*d,sz=q.z+uz*d;
     if(rawHAt(sx,sz)<.35){shore={x:sx-ux*1.8,z:sz-uz*1.8};break}
   }
   if(!shore)return null;
   const pierLen=Math.min(34,Math.max(14,L-5)),
     end={x:shore.x+ux*pierLen,z:shore.z+uz*pierLen};
   return {shore,end,ux,uz,checkpointUnits};
 }
 // Una direcció que troba aigües profundes pot ser gairebé tangent a
 // la platja: abans de construir, comprovam els DOS costats del moll.
 // Només llegim el relleu immutable; ni RNG, ni geometria, ni physics.
 function standalonePierFootprintSafe(site){
   if(!site)return false;
   const {shore,end,ux,uz}=site,
     length=Math.hypot(end.x-shore.x,end.z-shore.z),
     px=-uz,pz=ux;
   if(!(length>=14)||rawHAt(shore.x-ux*7,shore.z-uz*7)<=.25)return false;
   // Una rampa amb terra darrere i aigua a banda i banda al davant.
   // Dues seccions descarten diagonals gairebé paral·leles a la costa.
   for(const [distance,maxHeight] of [
     [Math.min(13,length*.60),.25],
     [Math.min(24,length-1.5),-.25]
   ]){
     for(const side of[-5,0,5]){
       const x=shore.x+ux*distance+px*side,
         z=shore.z+uz*distance+pz*side;
       if(rawHAt(x,z)>=maxHeight)return false;
     }
   }
   return rawHAt(end.x,end.z)<=-1;
 }
 // Reutilitza el primer emplaçament si és bo. Si no, prova altres
 // radials de costa abans d'abandonar el moll, sense consumir RNG.
 function* findSafeStandalonePier(q,initial=null){
   if(initial){
     const site=yield* surveyStandalonePierShore(q,initial);
     if(standalonePierFootprintSafe(site))return site;
   }
   let checkpointUnits=0;
   for(let a=0;a<32;a++){
     const aa=a*Math.PI/16,ux=Math.cos(aa),uz=Math.sin(aa);
     for(let d=28;d<Math.max(100,q.r||180);d+=8){
       if((++checkpointUnits%64)===0)
         yield {stage:'Cercant i construint el món',completed:null,total:null};
       const wx=q.x+ux*d,wz=q.z+uz*d;
       if(rawHAt(wx,wz)>=-3||rawHAt(wx+ux*12,wz+uz*12)>=-3)continue;
       if(initial&&Math.hypot(initial.x-wx,initial.z-wz)<.1)break;
       const site=yield* surveyStandalonePierShore(q,{x:wx,z:wz,aa});
       if(standalonePierFootprintSafe(site))return site;
       // Una mateixa radial comparteix la mateixa travessa de costa.
       break;
     }
   }
   return null;
 }
 return {findPortWater,findPortSite,surveyStandalonePierShore,
   standalonePierFootprintSafe,findSafeStandalonePier};
}


// Protect the entire base-to-coast road before later compounds are sited.
// The radius includes the compound footprint and an additional safe margin.
export function roadCorridorClear(points,q,clearance){
 if(!points||points.length<2)return true;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,
    t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.z-a.z)*dz)/(dx*dx+dz*dz||1)));
  if(Math.hypot(q.x-a.x-dx*t,q.z-a.z-dz*t)<=clearance)return false;
 }
 return true;
}
