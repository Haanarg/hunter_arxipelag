'use strict';

// Offline contract for a generated world, not a proof that the whole mission is
// completable. The callbacks use the game's actual terrain/floor and loot rules.
// No world state, doors, terrain, random stream or requested seed is changed.
const PLAYER_RADIUS=.6,PLAYER_HEAD=3.1,FOOT_CLEARANCE=.15;
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const point=p=>Array.isArray(p)?{x:p[0],z:p[1]}:p;

function captureMissionData(game){
  return game.run(`({
    requestedSeed,seed:seed>>>0,scale:MAP_SCALE,halfSize:H,seedSearchMode,
    base:P.base,spawn:{x:P.x,z:P.z,y:P.y},
    compounds:world.userData.compounds,buildings:B,walls:Wl,doors:Dr,items,vehicles:V,enemies:E,
    coast:world.userData.baseCoast,
    heightAt:hAt,groundAt,lootAllowed,toLocal:buildingLocalPoint
  })`);
}

function doorUsable(w){
  if(!w.door)return false;
  if(w.bunkerGate)return w.doorWidth>=PLAYER_RADIUS*2&&
    Number.isFinite(w.openDuration)&&w.openDuration>0&&
    Math.hypot(w.nx||0,w.nz||0)>.9;
  return !w.locked||!!w.bunkerInteriorDoor;
}
function createGeometry(data){
  // A local index keeps offline corridor sampling independent of map size.
  const grid=new Map(),cell=16;
  for(const w of data.walls||[]){
    if(w.playerBlock===false||w.open||((data.doors||[]).includes(w)&&doorUsable(w)))continue;
    for(let x=Math.floor((w.x0-PLAYER_RADIUS)/cell);x<=Math.floor((w.x1+PLAYER_RADIUS)/cell);x++)
      for(let z=Math.floor((w.z0-PLAYER_RADIUS)/cell);z<=Math.floor((w.z1+PLAYER_RADIUS)/cell);z++){
        const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(w);
      }
  }
  const blocked=(x,z,y)=>(grid.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]).find(w=>
    w.y0<=y+PLAYER_HEAD&&w.y1>=y+FOOT_CLEARANCE&&
    x>w.x0-PLAYER_RADIUS&&x<w.x1+PLAYER_RADIUS&&
    z>w.z0-PLAYER_RADIUS&&z<w.z1+PLAYER_RADIUS);
  const support=(x,z,y)=>data.groundAt(x,z,y);
  function trace(points,{step=.4,maxRise=.45,minY=.15}={}){
    let previous=null,samples=0,maxStep=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(distance(a,b)/step));
      for(let j=i===1?0:1;j<=n;j++){
        const t=j/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,
          y=support(x,z,previous?.y??a.y??data.heightAt(x,z));
        samples++;
        if(!Number.isFinite(y)||y<minY)return{ok:false,reason:'unsupported',at:{x,z,y},samples};
        const w=blocked(x,z,y);
        if(w)return{ok:false,reason:'wall',at:{x,z,y},wall:{compound:w.owner?.compound,building:w.owner?.layoutBuilding},samples};
        const rise=previous?Math.abs(y-previous.y):0;maxStep=Math.max(maxStep,rise);
        if(rise>maxRise)return{ok:false,reason:'height-jump',at:{x,z,y},rise,samples};
        previous={x,z,y};
      }
    }
    return{ok:!!previous,samples,maxStep,end:previous};
  }
  // Bounded, local two-level search. groundAt(previous) is essential: without
  // the height state, a surface point above the cellar falsely reaches it.
  function bunkerPath(b,start,goal,{step=.8,maxNodes=14000}={}){
    const limit=Math.max(b.basement.halfX,b.basement.halfZ)+5,
      queue=[{...start}],seen=new Set(),key=p=>
        Math.round((p.x-start.x)/step)+','+Math.round((p.z-start.z)/step)+','+(p.y<b.fy-3.9?'lower':'upper');
    seen.add(key(start));let visited=0;
    for(let head=0;head<queue.length&&visited<maxNodes;head++){
      const p=queue[head];visited++;
      if(distance(p,goal)<=step*1.5&&Math.abs(p.y-goal.y)<.5){
        const end=trace([p,goal],{minY:-Infinity});
        if(end.ok){
          const path=[{x:goal.x,z:goal.z,y:goal.y}];
          for(let q=p;q;q=q.parent)path.push({x:q.x,z:q.z,y:q.y});
          path.reverse();return{ok:true,visited,path};
        }
      }
      for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
        const x=p.x+dx*step,z=p.z+dz*step;
        if(Math.abs(x-b.x)>limit||Math.abs(z-b.z)>limit)continue;
        const y=support(x,z,p.y),next={x,z,y},k=key(next);
        if(seen.has(k)||!Number.isFinite(y)||Math.abs(y-p.y)>step*Math.hypot(dx,dz)*1.05)continue;
        if(blocked(x,z,y)||!trace([p,next],{minY:-Infinity}).ok)continue;
        seen.add(k);next.parent=p;queue.push(next);
      }
    }
    return{ok:false,visited,reason:visited>=maxNodes?'search-budget':'no-local-path'};
  }
  return{blocked,trace,bunkerPath};
}

function validateMission(data,{geometry=true}={}){
  const issues=[],checks=[],cs=data.compounds||[],vehicles=data.vehicles||[],items=data.items||[],
    add=(code,severity,message,details={})=>issues.push({code,severity,message,...details}),
    check=(id,ok,details={})=>checks.push({id,status:ok?'pass':'fail',...details}),
    geo=geometry?createGeometry(data):null;
  if(data.requestedSeed!=null&&(data.requestedSeed>>>0)!==(data.seed>>>0))
    add('seed.changed','error','The generated geography uses a different requested seed.');
  const base=cs.find(c=>c.id==='base'),hq=cs.find(c=>c.id==='hq');
  if(!base)add('base.missing','error','No starting base.');
  if(!hq)add('hq.missing','error','No enemy HQ.');
  if(!finitePoint(data.spawn))add('spawn.missing','error','No finite player spawn.');
  else if(geo){
    const y=data.groundAt(data.spawn.x,data.spawn.z,data.spawn.y);
    const ok=Number.isFinite(y)&&y>.15&&!geo.blocked(data.spawn.x,data.spawn.z,y);
    check('spawn.support',ok);if(!ok)add('spawn.blocked','error','The starting point has no clear land support.');
  }
  const general=hq?.general,bunker=(Array.isArray(hq?.buildings)?hq.buildings:[]).find(b=>b.kind==='enemy_bunker'&&b.basement);
  const generalOK=general&&general.t==='general'&&general.hp>0&&
    (data.enemies||[]).includes(general)&&finitePoint(general)&&bunker&&general.basement===bunker&&
    Math.abs(general.gy-bunker.basement.floorY)<.1;
  check('objective.general',!!generalOK);
  if(!generalOK)add('general.invalid','error','The live mission target is missing or unsupported in the HQ basement.');
  if(bunker){
    const gate=bunker.door,gateOK=gate&&(data.walls||[]).includes(gate)&&
      (data.doors||[]).includes(gate)&&doorUsable(gate);
    check('bunker.gate',!!gateOK);
    if(!gateOK)add('bunker.gate-invalid','error','The bunker gate has no usable opening mechanism.');
    if(geo&&gateOK&&generalOK){
      const start={x:gate.cx+gate.nx*3.5,z:gate.cz+gate.nz*3.5,y:bunker.fy+.22},
        goal={x:general.x,z:general.z,y:general.gy},result=geo.bunkerPath(bunker,start,goal);
      check('bunker.local-access',result.ok,result);
      if(!result.ok)add('bunker.access-blocked','error','No sampled local walking route from the gate to the general.',result);
    }
  }
  const coast=data.coast,dock=coast?.dock&&cs.find(c=>c.id==='civil-dock'&&distance(c,coast.dock)<.1);
  if(!coast?.points?.length||coast.unavailable)
    add('coast.unavailable','warning','No generated base-to-dock corridor; alternate departure routes are not proved.');
  else{
    const start=point(base?.entrances?.[0]),end=point(dock?.entrances?.[0]),ps=coast.points,
      attached=start&&end&&distance(start,ps[0])<.5&&distance(end,ps.at(-1))<.5;
    check('coast.endpoints',!!attached);
    if(!attached)add('coast.disconnected','error','The coast route is detached from the base or its dock.');
    if(geo&&attached&&finitePoint(data.spawn)){
      const result=geo.trace([data.spawn,...ps]);check('coast.walking-corridor',result.ok,result);
      if(!result.ok)add('coast.blocked','error','The generated base-to-dock walking corridor is obstructed.',result);
    }
  }
  for(const type of ['mapa','mapa_heli','mapa_tanc']){
    const candidates=items.filter(it=>it.t===type),allowed=candidates.filter(it=>{
      const b=(data.buildings||[]).find(b=>{
        const p=data.toLocal?data.toLocal(b,it.x,it.z):{x:it.x-b.x,z:it.z-b.z};
        return Math.abs(p.x)<(b.localW||b.w)/2&&Math.abs(p.z)<(b.localD||b.d)/2;
      });
      return data.lootAllowed(it.t,b,it.x,it.z,b?.compound||it.compound);
    });
    const supported=allowed.filter(it=>{
      if(!geo)return true;
      const y=data.groundAt(it.x,it.z,it.y-1.3);
      return Number.isFinite(y)&&Math.abs(y-(it.y-1.3))<.55&&!geo.blocked(it.x,it.z,y);
    });
    check('intel.'+type,supported.length>0,{required:type==='mapa',present:candidates.length,permitted:allowed.length,supported:geometry?supported.length:null});
    if(!supported.length)add('intel.unavailable',type==='mapa'?'error':'warning','No permitted, supported '+type+' pickup.',{type});
    if(allowed.length<candidates.length)add('intel.forbidden-location','warning','Some intel is in a forbidden loot location.',{type});
  }
  const neutral=vehicles.filter(v=>!v.destroyed&&['barca_rems','windsurf','moto_aquatica','llanxa','llanxa_coets','ferry','heli','heli_combat'].includes(v.t)),
    usable=neutral.filter(v=>{
      if(!finitePoint(v)||Math.abs(v.x)>=data.halfSize||Math.abs(v.z)>=data.halfSize)return false;
      const y=data.heightAt(v.x,v.z);
      if(v.t==='heli'||v.t==='heli_combat')return y>1.2;
      return y<-1.2;
    });
  check('transport.surface',usable.length>0,{present:neutral.length,surfaceSuitable:usable.length});
  if(!usable.length)add('transport.unavailable','error','No neutral watercraft in water or helicopter on land.');
  for(const id of ['comunicacions','polvori','hangar','outpost','heliport','port','ferry-terminal'])
    if(!cs.some(c=>c.id===id))add('coverage.compound-missing','warning','No '+id+' compound.',{compound:id});
  return{contractVersion:1,scope:geometry?'generated mission prerequisites and sampled local access':'generated mission prerequisites only',
    geometricAccess:geometry?'sampled locally':'not-run',
    seed:data.seed>>>0,requestedSeed:data.requestedSeed,scale:data.scale,
    ok:!issues.some(i=>i.severity==='error'),checks,issues,
    limits:[
      'No proof of an inter-island route, enemy survivability, successful combat or victory.',
      'Coast sampling checks a player-width centre corridor, not the full road width or vehicle driving.',
      'Intel support and loot restrictions do not prove a route from the base to every pickup.',
      'Transport surface checks do not prove boarding access or a navigable departure lane.',
      'Local sampling omits tree and vehicle collisions, moving units and their AI.',
      ...(data.seedSearchMode?['Fast seed mode omits basement furniture, vegetation and final visual terrain.']:[]),
      ...(!geometry?['Geometric access checks were skipped.']:[])
    ]};
}
module.exports={captureMissionData,validateMission,createGeometry};
