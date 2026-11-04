import {turretSpecs,stepVehicleTurret,vehicleGunPose} from '../src/vehicle-turret-core.mjs';
import {towerGuardInView,towerTurnHeading,towerParapetBlocksShot,TOWER_GUARD_SCAN_SPEED,TOWER_GUARD_RANGE} from '../src/tower-model.mjs';
import {SOLDIER,RADII,VEHICLE_SIGNAL_SOUNDS,soldierAccuracyProfile} from '../src/enemy-perception-core.mjs';
import {senseNativeSoldier,hearNativeSoldier} from './native-soldier-perception.mjs';
import {vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
import {stepLandPatrol,stepMarinePatrol} from '../src/patrol-motion-core.mjs';
import {stepNativeSoldierNavigation} from '../src/native-soldier-navigation.mjs';
import {createEnemyVehicleController} from './enemy-vehicle-controller.mjs';
import {passengerMuzzle,boatCrewMuzzle,requisitionBoat} from '../src/enemy-vehicle-requisition.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {vehicleSeatProjectileContact,breakVehicleSeatWindow,vehicleSeatWorld,vehicleOccupantHeadWorld,
 marineCrewHeadWorld,marineCrewProjectileContact,breakMarineWindshield,damageMarineCrew,MARINE_CREW_HP} from '../src/vehicle-occupant-damage-core.mjs';
import {windowCrossing,wallShotHit,knifeWindowHit} from '../src/building-shell.mjs';
import {weaponCatalog,combatCommands,mountedWeapons,grenadeLaunch,vehicleGrenadeLaunch,canThrowGrenadeFromVehicle,meleeTarget} from '../src/weapon-catalog.mjs';
import {limitBazookaHorizontalAim} from '../src/aiming-core.mjs';
import {enemyAccuracy} from '../src/enemy-accuracy-core.mjs';
import {createWorldRandom} from '../src/world-generation-core.mjs';
import {launchProjectile,projectileStep,SMALL_ARMS_PROJECTILE_SPEED} from '../src/projectile-core.mjs';
import {createAimSelector,weaponTargetPriority,SMALL_ARMS_AIM_CONE,SMALL_ARMS_AIM_VERTICAL,SMALL_ARMS_RANGE} from '../src/aiming-core.mjs';
import {damageHealth} from '../src/player-simulation.mjs';
import {runoverDamage,runoverSweepHit,VEHICLE_DESTRUCTION,beginBurst,stepBurst,relayCombatBalance as combatBalance,explosionDamage,towerExplosionAim,segmentAabbT,segmentSphereT,inView,ballisticStep,friendlyVehicleBlocksLine} from '../src/combat-rules.mjs';
// Índex immutable per posició: les portes poden obrir-se i destruir-se,
// però els seus volums no canvien de cel·la. Els índexs de les parets continuen
// essent els originals per als vidres i els efectes sincronitzats.
export function createTraceWallIndex(walls,cell=96){
 const grid=new Map(),large=[],key=(x,z)=>x+','+z;
 for(let i=0;i<walls.length;i++){
  const w=walls[i],xa=Math.floor(w.x0/cell),xb=Math.floor(w.x1/cell),
   za=Math.floor(w.z0/cell),zb=Math.floor(w.z1/cell);
  if((xb-xa+1)*(zb-za+1)>64){large.push(i);continue;}
  for(let x=xa;x<=xb;x++)for(let z=za;z<=zb;z++){
   const k=key(x,z),bucket=grid.get(k);
   if(bucket)bucket.push(i);else grid.set(k,[i]);
  }
 }
 return (from,to)=>{
  const xa=Math.floor(Math.min(from.x,to.x)/cell),xb=Math.floor(Math.max(from.x,to.x)/cell),
   za=Math.floor(Math.min(from.z,to.z)/cell),zb=Math.floor(Math.max(from.z,to.z)/cell);
  if(!Number.isFinite(xa+xb+za+zb)||(xb-xa+1)*(zb-za+1)>64)return null;
  const seen=new Set(large);
  for(let x=xa;x<=xb;x++)for(let z=za;z<=zb;z++){
   for(const i of grid.get(key(x,z))||[])seen.add(i);
  }
  return [...seen].sort((a,b)=>a-b);
 };
}
// Authoritative combat; native sessions adapt original rules over the canonical world.
const at=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export function segmentBox(from,to,box){return segmentAabbT(from.x,from.y,from.z,to.x,to.y,to.z,box.x0,box.x1,box.y0,box.y1,box.z0,box.z1);}
function targetBox(t){
 const type=t.t==='jeep'?'cotxe':t.t==='patrulla_marina'?'llanxa':t.t;
 if(type==='torre')return {x0:t.x-.68,x1:t.x+.68,z0:t.z-.68,z1:t.z+.68,y0:t.y+8.18,y1:t.y+9.35};
 if(['cotxe','llanxa','tanqueta','tanc'].includes(type)){
  const radius=(vehicleSpecs.radii[type]||2)*(vehicleSpecs.scales[type]||1)*.66;
  const hullHeight=type==='llanxa'?3:type==='cotxe'?3.1:4.2;
  return {x0:t.x-radius,x1:t.x+radius,z0:t.z-radius,z1:t.z+radius,
   y0:t.y-.4,y1:t.y+hullHeight};
 }
 return {x0:t.x-.8,x1:t.x+.8,z0:t.z-.8,z1:t.z+.8,y0:t.y,y1:t.y+3};
}
export function traceArena(from,to,geometry,world,{ignoreBarbed=false,collectWindows=false,ignoreVegetation=false,wallCandidates=null}={}){
  let fraction=1,hit=false,wallIndex=null,tree=null;const windowCrossings=[];
  // Descart ràpid de geometria fora del tram. Imprescindible per la
  // cadència alta de la tanqueta, sense perdre cap intersecció exacta.
  const minX=Math.min(from.x,to.x),maxX=Math.max(from.x,to.x),minY=Math.min(from.y,to.y),maxY=Math.max(from.y,to.y),minZ=Math.min(from.z,to.z),maxZ=Math.max(from.z,to.z);
  for(const index of wallCandidates??geometry.walls.keys()){const w=geometry.walls[index];if(!w.open&&!(ignoreBarbed&&w.barbed)&&towerParapetBlocksShot(w,from)&&w.x1>=minX&&w.x0<=maxX&&w.z1>=minZ&&w.z0<=maxZ&&w.y1>=minY&&w.y0<=maxY){
    const crossing=windowCrossing(from,to,w);
    if(crossing){if(collectWindows)windowCrossings.push({wallIndex:index,...crossing});continue;}
    const t=wallShotHit(from,to,w);if(t!==null&&t<=fraction){fraction=t;hit=true;wallIndex=index;}
  }}
  // The base shells use axis-aligned world footprints, including rotated variants.
  for(const b of geometry.buildings||[]){
    if(b.x+b.w/2<minX||b.x-b.w/2>maxX||b.z+b.d/2<minZ||b.z-b.d/2>maxZ||b.fy>maxY||b.fy+b.h<minY)continue;
    if(!b.rb&&b.rhp>0){const t=segmentBox(from,to,{x0:b.x-b.w/2,x1:b.x+b.w/2,z0:b.z-b.d/2,z1:b.z+b.d/2,y0:b.fy+b.h-.12,y1:b.fy+b.h+.12});if(t!==null&&t<=fraction){fraction=t;hit=true;wallIndex=null;}}
    if(b.upperFloor&&!b.rb){const t=segmentBox(from,to,{x0:b.x-b.w/2,x1:b.x+b.w/2,z0:b.z-b.d/2,z1:b.z+b.d/2,y0:b.fy+b.storey-.12,y1:b.fy+b.storey+.12});if(t!==null&&t<=fraction){fraction=t;hit=true;wallIndex=null;}}
  }
  const length=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),steps=Math.max(1,Math.ceil(length/.2));
  for(let i=0;i<=steps;i++){const t=i/steps;if(t>fraction)break;const p=at(from,to,t);if(p.y<(world.locomotionAt?.(p.x,p.z,p.y)?.basement?world.locomotionAt(p.x,p.z,p.y).floor:world.heightAt(p.x,p.z))){fraction=t;hit=true;wallIndex=null;break;}}
  // Reuse solo vegetation footprints and height limits through the indexed world.
  // Sample at least as densely as solo projectiles (1.15 m); the terrain pass
  // already uses .2 m steps, which also catches narrow trunks along fast shots.
  if(!ignoreVegetation&&world.vegetationAt)for(let i=0;i<=steps;i++){
    const t=i/steps;if(t>=fraction)break;const p=at(from,to,t);
    const candidate=world.vegetationAt(p.x,p.y,p.z);if(candidate){fraction=t;hit=true;wallIndex=null;tree=candidate;break;}
  }
  return {fraction,point:at(from,to,fraction),hit,wallIndex,tree,windowCrossings};
}
// Heading follows the simulation: zero faces -Z. Close awareness still requires LOS.
export function guardInView(guard,player){
  const dx=player.x-guard.x,dz=player.z-guard.z,d=Math.hypot(dx,dz);
  return d<=2||inView(guard.heading||0,dx,0,dz,Infinity,{sightHalfAngle:Math.PI/3+1e-10,sightVerticalAngle:Math.PI/2});
}
const facePoint=(guard,p)=>Math.atan2(-(p.x-guard.x),-(p.z-guard.z));
export function createRelayCombat({meta,record={},inventory,players,visiblePlayers=players,canAttack=()=>true,damagePlayer=()=>{},geometry,world,active,vehicles={live:()=>[],mounted:()=>null},cutWire=()=>false,blastWire=()=>{},blastStructures=()=>{},damagePalm=()=>false,blastPalms=()=>{},breakWindow=()=>false,damageWall=()=>false,windowAvailable=()=>true,waterSurface=()=>0,openEnemyDoor=()=>false,onEnemyAlert=()=>{},civilianTargets=()=>[],damageCivilian=()=>false}){
  const targets=structuredClone(record.targets||meta.targets||[]),grenades=structuredClone(record.grenades||[]),effects=structuredClone(record.effects||[]),results=structuredClone(record.results||[]),cooldowns=new Map(record.cooldowns||[]);
  const clearedTowerParapets=new Set();const bursts=structuredClone(record.bursts||[]),projectiles=structuredClone(record.projectiles||[]);let sequence=record.sequence||0;
  const random=createWorldRandom(record.randomState??(((meta.seed||0)^0x7269666c)>>>0)),roll=(a,b)=>a+random()*(b-a);
  // Compute the upper-window target list once; the full archipelago can have
  // thousands of walls. Destruction is checked against live state below.
  const traceWallCandidates=createTraceWallIndex(geometry().walls);
  const upperPanes=geometry().walls.flatMap((wall,wallIndex)=>
    wall.upperFloorWindow&&wall.windowPanes?.length?
      wall.windowPanes.map((pane,paneIndex)=>({wallIndex,paneIndex})):[]);
  const effect=(kind,tick,data)=>{effects.push({id:++sequence,kind,tick,...data});if(effects.length>64)effects.shift();};
  const enemyVehicles=createEnemyVehicleController({
    meta,vehicles,targets,players:visiblePlayers,world,geometry,
    navigate:(unit,tick)=>stepNativeSoldierNavigation(unit,{
      tick,world:world(),players:[],requestDoor:openEnemyDoor}),
    firePassenger:(unit,v,tick,seat=1)=>{
      if(seat===0&&['tanc','tanqueta'].includes(v.t)){
        // El soldat al volant utilitza la torreta del blindat requisat;
        // la posa s'actualitza cada pas d'IA (10 Hz), també en recàrrega.
        const profile=weaponCatalog[v.t==='tanc'?'tank':'tankette'];
        const actor=visiblePlayers().filter(p=>p.hp>0&&!p.fall&&!p.swimming)
          .map(p=>({p,d:Math.hypot(p.x-v.x,p.z-v.z)}))
          .filter(row=>row.d<profile.range)
          .sort((a,b)=>a.d-b.d)[0]?.p;
        if(!actor)return;
        const aim={x:actor.x,y:actor.y+1.5,z:actor.z},
          eye=vehicleGunPose(v);
        if(!eye)return;
        const dx=aim.x-eye.origin.x,dy=aim.y-eye.origin.y,dz=aim.z-eye.origin.z,
          len=Math.hypot(dx,dy,dz)||1,
          aligned=stepVehicleTurret(v,[dx/len,dy/len,dz/len],.1);
        if(!aligned||tick<(unit.nextAttackTick||0))return;
        const gun=vehicleGunPose(v);
        if(!gun||traceArena(gun.origin,aim,geometry(),world()).fraction<.999)return;
        const id='enemy-armored-'+(++sequence);
        projectiles.push({...launchProjectile(gun.origin,gun.direction,profile.speed,{
          id,actorId:unit.id,enemy:true,weapon:v.t==='tanc'?'tank':'tankette',
          dmg:profile.damage,splash:profile.splash||0,sourceVehicle:v.id
        }),life:profile.life});
        unit.nextAttackTick=tick+Math.ceil((v.t==='tanc'?5:.16)*30);
        effect('shot',tick,{enemy:true,actorId:unit.id,projectileId:id,
          weapon:v.t==='tanc'?'tank':'tankette',from:gun.origin,to:aim,hit:null});
        return;
      }
      if(tick<(unit.nextAttackTick||0))return;
      // La moto requisa també té pilot armat: el Worker valida fusell i LDV.
      const boat=requisitionBoat(v.t),rocket=boat&&seat===1,
        eye=boat?boatCrewMuzzle(v,seat,v.y):passengerMuzzle(v,v.y);
      if(!eye)return; // Tripulació protegida dins dels blindats.
      const actor=visiblePlayers().filter(p=>p.hp>0&&!p.fall&&!p.swimming)
        .map(p=>({p,d:Math.hypot(p.x-v.x,p.z-v.z)}))
        .filter(x=>x.d<(rocket?245:boat?170:75))
        .sort((a,b)=>a.d-b.d)[0]?.p;
      if(!actor)return;
      const aim={x:actor.x,y:actor.y+1.5,z:actor.z};
      if(traceArena(eye,aim,geometry(),world()).fraction<.999||
         enemyFriendlyVehicleInFireLane(eye,aim,v.id))return;
      const direction=enemyAccuracy.direction(meta.difficulty||1,
        rocket?'marineRocket':boat?'marineMG':'rifle',
        aim.x-eye.x,aim.y-eye.y,aim.z-eye.z,roll),
        id='enemy-crew-'+(++sequence),
        weapon=rocket?'bazooka':'rifle',
        speed=rocket?75:boat?125:70;
      projectiles.push({...launchProjectile(eye,direction,speed,{
        id,actorId:unit.id,enemy:true,weapon,
        dmg:rocket?combatBalance.weapons.boatRocket:
          unit.dmg??combatBalance.weapons.rifle,
        splash:rocket?8:0,sourceVehicle:v.id
      }),...(rocket?{life:Math.max(2.2,
        Math.hypot(aim.x-eye.x,aim.y-eye.y,aim.z-eye.z)/speed+.75)}:{})});
      unit.nextAttackTick=tick+Math.ceil((rocket?5:boat?unit.rate||1.1:(unit.rate||1.1)*1.5)*30);
      effect('shot',tick,{enemy:true,actorId:unit.id,projectileId:id,
        weapon,from:eye,to:aim,hit:null});
    }
  });
  function alarm(position,actorId,tick,kind='pistol'){
    // Els dos jugadors són invisibles també per a alertes acústiques.
    if(!visiblePlayers().length&&players().some(p=>p.id===actorId))return;
    const native=meta.mode==='native',noise=native?{...position,id:++sequence,kind,radius:RADII[kind]??RADII.pistol}:null;
    for(const t of targets)if(t.ai&&t.hp>0){
      if(native&&t.t==='soldat'){hearNativeSoldier(t,noise,tick);continue;}
      if(Math.hypot(t.x-position.x,t.z-position.z)<35){t.alarmedUntil=tick+180;t.focus=actorId;t.lastSeenTick=tick;t.lastKnown={x:position.x,y:position.y,z:position.z};if(t.t!=='jeep')t.heading=facePoint(t,position);t.state='search';}
    }
  }
  // Únic esdeveniment autoritatiu per activar soldats i sincronitzar clients.
  function vehicleSignal(actorId,vehicle,tick){
    const sound=VEHICLE_SIGNAL_SOUNDS[vehicle?.t];
    if(meta.mode!=='native'||!sound||!vehicle?.seats?.includes(actorId))return false;
    const at={x:vehicle.x,y:vehicle.y+1,z:vehicle.z};
    alarm(at,actorId,tick,sound);
    effect('vehicle-signal',tick,{actorId,vehicleId:vehicle.id,sound,at,radius:RADII[sound]});
    return true;
  }
  const friendlyCrewAboard=v=>!!v.enemyCrew?.some(id=>targets.some(t=>
    t.id===id&&t.hp>0&&['waiting','riding'].includes(t.enemyRequisition?.phase)));
  function friendlyCoverOnLine(from,to,v){
    const kind=v.t==='jeep'?'cotxe':v.t==='patrulla_marina'?'llanxa':v.t,
      shape=vehicleSpecs.hitboxes[kind],scale=vehicleSpecs.scales[kind]||1;
    if(!shape)return false;
    const height=kind==='ferry'?8:kind==='heli'||kind==='heli_combat'?5.5:
      kind==='camio'?4.8:kind==='tanc'?4.7:kind==='tanqueta'?4:
      kind==='llanxa'||kind==='llanxa_coets'?3.8:3.3;
    // Les patrulles NPC desen el rumb a heading; els vehicles pilotables a hd.
    const pose=v.hd==null?{...v,hd:v.heading||0}:v;
    return friendlyVehicleBlocksLine(from,to,pose,{
      width:shape[0]*scale,depth:shape[1]*scale,baseY:v.y,height});
  }
  function enemyFriendlyVehicleInFireLane(from,to,excludeId=null){
    for(const v of vehicles.live()){
      if(v.id===excludeId||v.destroyed||!friendlyCrewAboard(v))continue;
      if(friendlyCoverOnLine(from,to,v))return true;
    }
    // Els vehicles de patrulla preexistents també són aliats, encara que
    // no formen part de la llista de vehicles que es poden requisar.
    for(const v of targets){
      if(v.id===excludeId||v.hp<=0||
        !['jeep','tanqueta','tanc','patrulla_marina'].includes(v.t))continue;
      if(friendlyCoverOnLine(from,to,v))return true;
    }
    return false;
  }
  function nativeSoldierAim(unit,actor,{vehicle=vehicles.mounted(actor.id),crouched=!!actor.crouched&&!vehicle}={}){
    const eye={x:unit.x,y:unit.y+2.2,z:unit.z};
    for(const height of crouched?[1.25]:vehicle?[1.5]:[1.5,2.35]){
      const aim={x:actor.x,y:actor.y+height,z:actor.z};
      if(traceArena(eye,aim,geometry(),world(),{ignoreBarbed:true,ignoreVegetation:true}).fraction<.97)continue;
      if(enemyFriendlyVehicleInFireLane(eye,aim,vehicle?.id))continue;
      if(vehicles.live().some(v=>{if(v===vehicle||v.id===vehicle?.id||v.destroyed||friendlyCrewAboard(v))return false;const r=(vehicleSpecs.radii[v.t]||0)*.55,t=segmentSphereT(eye.x,eye.y,eye.z,aim.x,aim.y,aim.z,v.x,v.y+Math.min(1.7,r*.6),v.z,r);return t!==null&&t<.97;}))continue;
      return aim;
    }return null;
  }
  // La torre és una estructura: cap arma automàtica ni supressió.
  function stepNativeTower(unit,tick){return meta.mode==='native'&&unit.t==='torre';}
  function stepNativeTowerGuard(unit,tick){
    if(meta.mode!=='native'||!unit.towerGuard)return false;
    const host=targets.find(t=>t.id===unit.towerHostId);
    if(!host||host.hp<=0){unit.hp=0;unit.canSee=false;return true;}
    if(tick%3!==(unit.towerSeat||0)%3)return true;
    const dt=.1,eye={x:unit.x,y:unit.y+2.78,z:unit.z},
      contacts=visiblePlayers().filter(p=>p.hp>0&&!p.fall&&!p.swimming)
        .flatMap(p=>{
          const dx=p.x-unit.x,dz=p.z-unit.z,d=Math.hypot(dx,dz),
            vehicle=vehicles.mounted(p.id),
            disguised=!!inventory.get(p.id)?.disguised&&!vehicle;
          if(disguised&&d>20&&tick>(unit.alarmedUntil||0))return [];
          const facing=towerGuardInView(unit.heading||0,dx,dz,unit.rng||TOWER_GUARD_RANGE),
            warned=host.towerAlertTargetId===p.id&&tick<(host.towerAlertUntilTick||0);
          if(!facing&&!warned)return [];
          for(const h of p.crouched&&!vehicle?[1.25]:[1.5,2.35]){
            const aim={x:p.x,y:p.y+h,z:p.z};
            if(traceArena(eye,aim,geometry(),world(),{
              ignoreBarbed:true,wallCandidates:traceWallCandidates(eye,aim)
            }).fraction>=.999)return [{p,aim,d}];
          }
          return [];
        }).sort((a,b)=>a.d-b.d||a.p.id.localeCompare(b.p.id));
    const contact=contacts.find(c=>c.p.id===unit.focus)||contacts[0];
    unit.focus=contact?.p.id||null;
    unit.canSee=!!contact;unit.state=contact?'attack':'patrol';
    if(contact){
      host.towerAlertTargetId=contact.p.id;
      host.towerAlertUntilTick=tick+36;
    }
    if(!contact){
      const angle=(unit.heading||0)+TOWER_GUARD_SCAN_SPEED*dt;
      unit.heading=Math.atan2(Math.sin(angle),Math.cos(angle));
      return true;
    }
    const {p,aim,d}=contact,angle=facePoint(unit,p);
    unit.heading=towerTurnHeading(unit.heading||0,angle,dt);
    if(Math.abs(Math.atan2(Math.sin(angle-unit.heading),Math.cos(angle-unit.heading)))>.13||
       tick<(unit.nextAttackTick||0)||d>(unit.rng||TOWER_GUARD_RANGE))return true;
    const heavy=!!unit.rocketSoldier;
    if(heavy&&d<=12)return true;
    const fx=-Math.sin(unit.heading),fz=-Math.cos(unit.heading),
      origin={x:unit.x+fx*1.18,y:eye.y-(heavy?.04:.08),
        z:unit.z+fz*1.18};
    if(traceArena(origin,aim,geometry(),world(),{
      ignoreBarbed:true,wallCandidates:traceWallCandidates(origin,aim)
    }).fraction<.999||enemyFriendlyVehicleInFireLane(origin,aim))return true;
    const direction=enemyAccuracy.direction(meta.difficulty||1,
      heavy?'towerHeavy':'rifle',aim.x-origin.x,aim.y-origin.y,aim.z-origin.z,roll),
      id='tower-guard-'+(++sequence);
    projectiles.push({...launchProjectile(origin,direction,heavy?76:70,{
      id,actorId:unit.id,enemy:true,weapon:heavy?'bazooka':'rifle',
      dmg:heavy?combatBalance.weapons.bazooka:(unit.dmg??combatBalance.weapons.rifle),
      splash:heavy?8:0}),life:heavy?3.8:2.2});
    unit.nextAttackTick=tick+Math.ceil((heavy?5:1.1)*30);
    unit.lastAttack=tick;
    effect('shot',tick,{enemy:true,actorId:unit.id,projectileId:id,
      weapon:heavy?'bazooka':'rifle',from:origin,to:aim,hit:null});
    return true;
  }
  function stepNativeGeneral(unit,tick){
    if(meta.mode!=='native'||unit.t!=='general')return false;
    if(tick>=(unit.nextSenseTick||0)){
      unit.nextSenseTick=tick+3;
      const eye={x:unit.x,y:unit.y+2.2,z:unit.z},
        level=world().locomotionAt(unit.x,unit.z,unit.y);
      const contacts=visiblePlayers().filter(p=>p.hp>0&&!p.fall)
        .flatMap(p=>{
          const other=world().locomotionAt(p.x,p.z,p.y);
          if(Math.hypot(p.x-unit.x,p.z-unit.z)>60||
             !!level.basement!==!!other.basement||
             level.basement&&Math.abs(p.y-unit.y)>4.4)return [];
          const aim={x:p.x,y:p.y+1.5,z:p.z};
          if(traceArena(eye,aim,geometry(),world(),{ignoreBarbed:true,ignoreVegetation:true,wallCandidates:traceWallCandidates(eye,aim)}).fraction<.999)return [];
          return [{p,aim,d:Math.hypot(p.x-unit.x,p.z-unit.z)}];
        }).sort((a,b)=>a.d-b.d||a.p.id.localeCompare(b.p.id));
      const contact=contacts.find(c=>c.p.id===unit.focus)||contacts[0];
      unit.focus=contact?.p.id||null;
      unit.canSee=!!contact;unit.state=contact?'attack':'patrol';
      unit.generalAim=contact?.aim||null;
    }
    if(!unit.canSee)return true;
    const actor=visiblePlayers().find(p=>p.id===unit.focus&&p.hp>0);
    if(!actor)return true;
    unit.heading=facePoint(unit,actor);
    const d=Math.hypot(actor.x-unit.x,actor.z-unit.z);
    if(d<36&&d>.1&&unit.sp>0&&tick%3===0){
      const old={x:unit.x,y:unit.y,z:unit.z,hd:unit.heading},
        candidate={x:unit.x+(unit.x-actor.x)/d*unit.sp*.1,
          z:unit.z+(unit.z-actor.z)/d*unit.sp*.1,y:unit.y,hd:unit.heading},
        support=world().locomotionAt(candidate.x,candidate.z,unit.y),
        resolved=world().resolveBody(old,candidate);
      if((!world().locomotionAt(unit.x,unit.z,unit.y).basement||support.basement)&&
         Math.abs(resolved.x-candidate.x)<.08&&Math.abs(resolved.z-candidate.z)<.08&&
         Math.abs(support.floor-unit.y)<.9){
        unit.x=candidate.x;unit.z=candidate.z;unit.y=support.floor+.06;
      }
    }
    if(d>(unit.rng||60)||tick<(unit.nextAttackTick||0))return true;
    const eye={x:unit.x,y:unit.y+2.2,z:unit.z},
      aim={x:actor.x,y:actor.y+1.5,z:actor.z};
    if(traceArena(eye,aim,geometry(),world(),{ignoreBarbed:true,ignoreVegetation:true,wallCandidates:traceWallCandidates(eye,aim)}).fraction<.999||
       enemyFriendlyVehicleInFireLane(eye,aim))return true;
    const direction=enemyAccuracy.direction(meta.difficulty||1,'pistol',
      aim.x-eye.x,aim.y-eye.y,aim.z-eye.z,roll),
      id='general-shot-'+(++sequence);
    projectiles.push(launchProjectile(eye,direction,70,
      {id,actorId:unit.id,enemy:true,weapon:'pistol',dmg:unit.dmg??combatBalance.weapons.pistol}));
    unit.nextAttackTick=tick+Math.ceil((unit.rate||.8)*30);
    effect('shot',tick,{enemy:true,actorId:unit.id,projectileId:id,weapon:'pistol',from:eye,to:aim,hit:null});
    return true;
  }
  function nativeSoldierStep(unit,tick){
    if(unit.towerGuard)return stepNativeTowerGuard(unit,tick);
    if(enemyVehicles.tryAcquire(unit,tick))return true;
    const contact=senseNativeSoldier(unit,{players:visiblePlayers(),inventory,mounted:id=>vehicles.mounted(id),world:world(),visibleAim:nativeSoldierAim,tick});
    if(!contact)return unit.state!=='patrol';
    const {actor,acquired}=contact;unit.heading=facePoint(unit,actor);
    if(acquired){unit.nextAttackTick=tick;alarm({x:unit.x,y:unit.y+2,z:unit.z},unit.id,tick,'alert');onEnemyAlert(unit,actor,tick,targets);}
    if(Math.hypot(actor.x-unit.x,actor.z-unit.z)>SOLDIER.fireRange||tick<(unit.nextAttackTick??0))return true;
    const aim=nativeSoldierAim(unit,actor);if(!aim)return true;
    const rocket=!!unit.rocketSoldier,profile=soldierAccuracyProfile(unit),eye={x:unit.x,y:unit.y+2.2,z:unit.z},
      direction=enemyAccuracy.direction(meta.difficulty||1,profile,aim.x-unit.x,aim.y-eye.y,aim.z-unit.z,roll),
      origin=rocket?{x:unit.x-Math.sin(unit.heading)*1.65+Math.cos(unit.heading)*.44,y:eye.y+.65,z:unit.z-Math.cos(unit.heading)*1.65-Math.sin(unit.heading)*.44}:eye;
    if(enemyFriendlyVehicleInFireLane(origin,aim))return true;
    const id='enemy-bullet-'+(++sequence);
    projectiles.push(launchProjectile(origin,direction,rocket?76:70,{id,actorId:unit.id,enemy:true,weapon:rocket?'bazooka':profile,dmg:rocket?weaponCatalog.bazooka.damage:unit.dmg??combatBalance.weapons.rifle,splash:rocket?8:0}));
    unit.nextAttackTick=tick+Math.ceil((rocket?5:unit.rate??(unit.elite?.16:1.1))*30);unit.lastAttack=tick;
    effect('shot',tick,{enemy:true,actorId:unit.id,projectileId:id,weapon:rocket?'bazooka':'rifle',from:origin,to:aim,hit:null});return true;
  }
  // La mateixa navegació del joc individual, sense simular IA als clients.
  // A 10 Hz manté el Worker lleuger; la interpolació visual suavitza la pose.
  function stepNativePatrolVehicle(unit,tick){
    const marine=unit.t==='patrulla_marina',land=['jeep','tanqueta','tanc'].includes(unit.t);
    if(!marine&&!land)return false;
    if(meta.mode!=='native')return false;
    if(unit.patrolPhase===undefined)
      unit.patrolPhase=[...unit.id].reduce((n,c)=>n+c.charCodeAt(0),0)%3;
    if(tick%3!==unit.patrolPhase)return true;
    const dt=.1,terrain=(x,z)=>world().heightAt(x,z),
      searchRadius=marine?470:unit.t==='jeep'?80:110,
      eye={x:unit.x,y:unit.y+(marine?3:2.35),z:unit.z},
      potential=visiblePlayers().filter(p=>p.hp>0&&!p.fall)
        .map(p=>({p,d:Math.hypot(p.x-unit.x,p.z-unit.z)}))
        .filter(c=>c.d<searchRadius).sort((a,b)=>a.d-b.d||a.p.id.localeCompare(b.p.id));
    let target=null;
    if(tick>=(unit.nextPatrolSenseTick||0)){
      unit.nextPatrolSenseTick=tick+(marine?9:6);
      for(const {p} of potential){
        const aim={x:p.x,y:p.y+(vehicles.mounted(p.id)?2:1.5),z:p.z};
        if(traceArena(eye,aim,geometry(),world(),{
          ignoreBarbed:true,wallCandidates:traceWallCandidates(eye,aim)
        }).fraction>=.995){
          target=p.id;break;
        }
      }
      unit.patrolFocus=target;
    }
    const current=potential.find(c=>c.p.id===unit.patrolFocus);
    const hostile=current?.p||null;
    if(marine){
      const clearTraffic=(x,z,margin)=>{
        for(const v of vehicles.live()){
          if(Math.hypot(v.x-x,v.z-z)<margin+(vehicleSpecs.radii[v.t]||2)*.55)
            return false;
        }
        for(const other of targets)if(other!==unit&&other.hp>0&&
          other.t==='patrulla_marina'&&Math.hypot(other.x-x,other.z-z)<margin+7)
          return false;
        return true;
      };
      if((unit.marineCrewHp?.[0]??MARINE_CREW_HP)>0)stepMarinePatrol(unit,{dt,heightAt:terrain,
        waterAt:(x,z)=>waterSurface(x,z,tick/30),
        limit:Math.min(Math.abs(meta.bounds.x1),Math.abs(meta.bounds.z1)),
        random,trafficClear:clearTraffic,target:hostile});
      else unit.speed=0; // Sense pilot: la llanxa queda a la deriva, intacta.
    }else{
      stepLandPatrol(unit,{dt,world:world(),random});
      // Els blindats terrestres segueixen els seus waypoints originals.
    }
    unit.state=hostile?'attack':'patrol';
    if(!hostile)return true;
    const d=Math.hypot(hostile.x-unit.x,hostile.z-unit.z);
    const cooldown=marine?(unit.rocketCd??0):(unit.nextAttackTick??0);
    if(marine){
      const aiming={x:hostile.x,y:hostile.y+(vehicles.mounted(hostile.id)?2:1.5),z:hostile.z};
      const boatPose={t:'llanxa',x:unit.x,z:unit.z,hd:unit.heading};
      const origin=boatCrewMuzzle(boatPose,0,unit.y);
      if((unit.marineCrewHp?.[0]??MARINE_CREW_HP)>0&&d<170&&tick>=(unit.nextMgTick??0)){
        const dir=enemyAccuracy.direction(meta.difficulty||1,'marineMG',
          aiming.x-origin.x,aiming.y-origin.y,aiming.z-origin.z,roll),
          id='marine-mg-'+(++sequence);
        projectiles.push(launchProjectile(origin,dir,125,{id,actorId:unit.id,
          enemy:true,weapon:'rifle',dmg:combatBalance.weapons.rifle,life:2.7}));
        unit.nextMgTick=tick+Math.ceil(.28*30);
        effect('shot',tick,{enemy:true,actorId:unit.id,projectileId:id,weapon:'rifle',from:origin,to:aiming});
      }
      if((unit.marineCrewHp?.[1]??MARINE_CREW_HP)>0&&d<245&&tick>=(unit.nextRocketTick??0)){
        const rocketOrigin=boatCrewMuzzle(boatPose,1,unit.y),
          dir=enemyAccuracy.direction(meta.difficulty||1,'marineRocket',
            aiming.x-rocketOrigin.x,aiming.y-rocketOrigin.y,aiming.z-rocketOrigin.z,roll),
          id='marine-rocket-'+(++sequence);
        projectiles.push({...launchProjectile(rocketOrigin,dir,75,{
          id,actorId:unit.id,enemy:true,weapon:'bazooka',
          dmg:combatBalance.weapons.boatRocket||weaponCatalog.bazooka.damage,
          splash:8}),life:Math.max(2.2,d/75+.75)});
        unit.nextRocketTick=tick+5*30;
        effect('shot',tick,{enemy:true,actorId:unit.id,projectileId:id,weapon:'bazooka',from:rocketOrigin,to:aiming});
      }
    }else if(d<(unit.t==='jeep'?75:105)&&tick>=cooldown){
      const weapon=unit.t==='jeep'?'jeep':unit.t==='tanqueta'?'tankette':'tank';
      const origin={x:unit.x+Math.cos(unit.heading)*1.46-Math.sin(unit.heading)*1.1,
        y:unit.y+(unit.t==='jeep'?2.25:2.8),
        z:unit.z-Math.sin(unit.heading)*1.46-Math.cos(unit.heading)*1.1};
      const aiming={x:hostile.x,y:hostile.y+1.5,z:hostile.z},
        direction=enemyAccuracy.direction(meta.difficulty||1,weapon,
          aiming.x-origin.x,aiming.y-origin.y,aiming.z-origin.z,roll),
        id='patrol-shot-'+(++sequence),heavy=unit.t==='tanc';
      projectiles.push({...launchProjectile(origin,direction,heavy?75:70,{
        id,actorId:unit.id,enemy:true,weapon:heavy?'bazooka':'rifle',
        dmg:unit.dmg||combatBalance.weapons.rifle,splash:heavy?8:0}),life:heavy?3.7:2.5});
      unit.nextAttackTick=tick+Math.ceil((unit.t==='tanc'?5:unit.rate||1.1)*30);
      effect('shot',tick,{enemy:true,actorId:unit.id,projectileId:id,
        weapon:heavy?'bazooka':'rifle',from:origin,to:aiming});
    }
    return true;
  }
  function damageVehicle(v,amount,shotClass,tick,queue){
    const hostileCrew=[...(v.enemyCrew||[])];
   const destroyed=vehicles.damage(v.id,amount,shotClass);
   if(destroyed?.destroyed)for(const id of hostileCrew){const crew=targets.find(t=>t.id===id);if(crew)crew.hp=0;}
    if(!destroyed)return false;
    if(!destroyed.destroyed)return true;
    effect('vehicle-destroyed',tick,{vehicleId:v.id,at:destroyed.at,explosive:destroyed.explosive});
    if(destroyed.explosive){
      for(const id of destroyed.occupants)damagePlayer(id,Math.ceil(roll(VEHICLE_DESTRUCTION.occupantMin,VEHICLE_DESTRUCTION.occupantMax)));
      queue.push({skipPlayers:destroyed.occupants,at:destroyed.at,damage:VEHICLE_DESTRUCTION.damage,radius:VEHICLE_DESTRUCTION.radius,actorId:v.id});
    }
    return true;
  }
  function explode(first,tick){
    const queue=[first];
    while(queue.length){
      const blast=queue.shift(),center=blast.at,hits=[],protectedPlayers=new Set(players().filter(p=>vehicles.mounted(p.id)).map(p=>p.id));
      const visible=aim=>traceArena(center,aim,geometry(),world()).fraction>=1;
      for(const t of targets)if(t.hp>0){
        const aim=t.t==='torre'?towerExplosionAim(t,center):
          {x:t.x,y:t.y+1.5,z:t.z},
          d=Math.hypot(aim.x-center.x,aim.y-center.y,aim.z-center.z),
          damage=explosionDamage(blast.damage,d,blast.radius);
        if(!damage)continue;
        // El raycast del C4 ha d'ignorar els quatre suports de la
        // mateixa torre, però no altres edificis ni el terreny.
        const towerLegs=t.t==='torre'?geometry().walls.flatMap((w,i)=>
          w.towerLegOwner&&Math.hypot((w.x0+w.x1)/2-t.x,
            (w.z0+w.z1)/2-t.z)<4?[i]:[]):[];
        const trace=towerLegs.length?traceArena(center,aim,geometry(),world(),
          {wallCandidates:(traceWallCandidates(center,aim)??geometry().walls.map((_,i)=>i))
            .filter(i=>!towerLegs.includes(i))}):null;
        if((trace?trace.fraction>=1:visible(aim))){
          t.hp=damageHealth(t.hp,damage);hits.push(t.id);
        }
      }
      for(const u of civilianTargets())if(u.hp>0){
        const aim={x:u.x,y:u.y+1,z:u.z},damage=explosionDamage(blast.damage,Math.hypot(aim.x-center.x,aim.y-center.y,aim.z-center.z),blast.radius);
        if(damage&&visible(aim))damageCivilian(u.id,damage,tick);
      }
      // The hull protects occupants; personal grenades retain no team damage.
      for(const p of players())if(p.hp>0&&!protectedPlayers.has(p.id)&&!blast.skipPlayers?.includes(p.id)&&(!blast.ownerOnly||p.id===blast.actorId)){
        const aim={x:p.x,y:p.y+1,z:p.z},damage=explosionDamage(blast.damage,Math.hypot(aim.x-center.x,aim.y-center.y,aim.z-center.z),blast.radius);
        if(damage&&visible(aim)&&damagePlayer(p.id,damage)!==false)hits.push(p.id);
      }
      // Snapshot candidates before destruction, so a chain cannot mutate iteration.
      for(const v of [...vehicles.live()]){
        const damage=explosionDamage(blast.damage,vehicles.blastDistance(v,center),blast.radius);
        if(damage&&visible({x:v.x,y:v.y+1,z:v.z}))damageVehicle(v,damage,'heavy',tick,queue);
      }
      blastWire(center,blast.damage,blast.radius);
      blastStructures(center,blast.damage,blast.radius);
      blastPalms(center,blast.damage,blast.radius);
      alarm(center,blast.actorId,tick,'explosion');effect('explosion',tick,{actorId:blast.actorId,at:center,radius:blast.radius,
        weapon:blast.weapon==='c4'?'c4':blast.projectile?'projectile':'grenade',
        ...(blast.projectile&&blast.direction?{direction:blast.direction}:{}),hits});
    }
  }
  function aimWeapon(p,vehicle,weapon,from){
    const profile=weaponCatalog[weapon],hd=vehicle?.hd??p.hd,dx=-Math.sin(hd),dz=-Math.cos(hd),range=profile.range,focus={},heavy=!!profile.splash;
    const aim=createAimSelector({origin:from,direction:[dx,0,dz],range,cone:profile.cone,shotClass:heavy?'heavy':weapon,focus,verticalCone:profile.vertical,
      isClear:(x,y,z,tx,ty,tz)=>traceArena({x,y,z},{x:tx,y:ty,z:tz},geometry(),world()).fraction>=1});
    for(const t of targets)if(t.hp>0){
      // Un soldat embarcat es representa i s'adquireix al seient.
      const carrier=t.enemyVehicleId&&vehicles.live().find(v=>v.id===t.enemyVehicleId),
        point=carrier?vehicleOccupantHeadWorld(carrier,t.enemySeat||0,carrier.y):null;
      if(carrier&&['tanc','tanqueta'].includes(carrier.t))continue;
      if(t.t==='patrulla_marina'&&!heavy){
        for(let seat=0;seat<2;seat++){
          if((t.marineCrewHp?.[seat]??MARINE_CREW_HP)<=0)continue;
          const head=marineCrewHeadWorld(t,seat,t.y);
          aim.consider({id:t.id+':crew'+seat,t:'soldat'},'enemy',0,
            head.x,head.y,head.z);
        }
      }
      aim.consider(t,'enemy',weaponTargetPriority({...t,t:t.t||'soldat'},heavy?'heavy':weapon),
        point?.x??t.x,point?.y??(t.y+(t.t==='torre'?9.4:t.towerGuard?2.9:1.5)),point?.z??t.z);
    }
    for(const v of vehicles.live())if(v!==vehicle&&!v.destroyed&&
      (heavy?!v.seats.some(Boolean):true))
      aim.consider(v,'vehicle',heavy?3:1,v.x,v.y+1.5,v.z);
    // Without a visible enemy, aim light weapons at intact upper-floor
    // glass. The same physics trace checks the aperture, in both directions.
    if(!aim.hasTarget&&!vehicle&&!heavy&&['pistol','assault','sniper'].includes(weapon)){
      for(const {wallIndex,paneIndex} of upperPanes){
        const wall=geometry().walls[wallIndex],pane=wall?.windowPanes?.[paneIndex];
        if(!pane||wall.open||!windowAvailable(wallIndex,paneIndex))continue;
        const wx=pane.x-from.x,wz=pane.z-from.z;
        if(wx*wx+wz*wz>70*70||wx*dx+wz*dz<Math.hypot(wx,wz)*.95)continue;
        aim.consider(wall,'window',4,pane.x,(pane.y0+pane.y1)/2,pane.z);
      }
    }
    let direction=aim.direction();if(weapon==='bazooka')direction=limitBazookaHorizontalAim(direction,dx,dz);
    return {direction,focus};
  }
  function fire(actorId,p,bag,tick,weapon=bag.weapon||'pistol',requestedAim=null){
    const profile=weaponCatalog[weapon],vehicle=vehicles.mounted(actorId),gun=vehicle&&vehicle.seats[0]===actorId&&vehicleGunPose(vehicle),
      // El mateix avançament de la boca del canó que en mode individual.
      // Només quan es va a peu: els vehicles conserven els seus punts
      // de sortida i les seves regles de muntatge.
      muzzleReach=weapon==='pistol'?.7:weapon==='assault'?1.45:
        weapon==='sniper'?2.1:weapon==='bazooka'?1.35:0,
      muzzleHeading=p.hd||0,
      from=gun?.origin||{
        x:p.x+(vehicle?0:-Math.sin(muzzleHeading)*muzzleReach),
        y:p.y+(vehicle?2:weapon==='bazooka'?1.9:1.5),
        z:p.z+(vehicle?0:-Math.cos(muzzleHeading)*muzzleReach)
      };
    const aimed=aimWeapon(p,vehicle,weapon,from),focus=aimed.focus;
     let direction=gun?.direction||aimed.direction;
     if(!vehicle&&meta.mode==='native'&&requestedAim&&weapon==='bazooka'){
       // Si la petició és fora de con o de rang, mantenir el tret recte,
       // mai el blanc lateral seleccionat com a alternativa al servidor.
       direction=[-Math.sin(p.hd),0,-Math.cos(p.hd)];
       focus.target=null;focus.point=null;
     }
     // El bazuca i el franctirador han de disparar exactament a la mira
     // local, NO a un blanc diferent escollit al servidor.
     if(!vehicle&&meta.mode==='native'&&requestedAim&&['bazooka','sniper'].includes(weapon)){
       const dx=requestedAim.x-from.x,dy=requestedAim.y-from.y,dz=requestedAim.z-from.z,
         distance=Math.hypot(dx,dy,dz),horizontal=Math.hypot(dx,dz);
       if(distance>.5&&distance<=profile.range+12&&horizontal>.05){
         const candidate=[dx/distance,dy/distance,dz/distance],
           forward=[-Math.sin(p.hd),-Math.cos(p.hd)],
           alignment=(dx*forward[0]+dz*forward[1])/horizontal;
         // Bazuca: con de 90° totals, validat també pel Worker.
         const pitch=Math.abs(Math.atan2(dy,horizontal));
         if(weapon==='sniper'||alignment>=profile.cone-.001&&pitch<=profile.vertical+.001){
           direction=candidate;focus.target=null;focus.point=null;
         }
       }
     }
    const id='bullet-'+(++sequence),dmg=!['proving','world','native'].includes(meta.mode)&&['pistol','assault'].includes(weapon)?combatBalance.weapons.pistol:profile.damage;
    projectiles.push({...launchProjectile(from,direction,profile.speed,{id,actorId,weapon,dmg,splash:profile.splash||0,sourceVehicle:vehicle?.id,aimedAt:focus.target?.id||null}),life:profile.life});
    if(profile.ammo){const source=vehicle&&profile.ammo==='rockets'?vehicle:bag;source[profile.ammo]--;}
    effect('shot',tick,{actorId,projectileId:id,weapon,from,to:{x:from.x+direction[0],y:from.y+direction[1],z:from.z+direction[2]},hit:null,aimedAt:focus.target?.id||null});return 'FIRED';
  }

  function cancel(actorId){for(let i=bursts.length-1;i>=0;i--)if(bursts[i].actorId===actorId)bursts.splice(i,1);}
  function command(actorId,message,tick){
    const cached=results.find(r=>r.actorId===actorId&&r.commandId===message.commandId);if(cached)return {...cached,duplicate:true};
    const p=players().find(p=>p.id===actorId),bag=inventory.get(actorId);let code='INVALID',ok=false;
    if(p&&message.epoch===meta.id&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)&&combatCommands.includes(message.weapon)){
      const vehicle=vehicles.mounted(actorId),passenger=!!vehicle&&vehicle.seats[0]!==actorId,
        weapon=passenger?message.weapon:vehicle?(message.weapon==='grenade'?(canThrowGrenadeFromVehicle(vehicle)?'grenade':null):message.weapon==='secondary'&&vehicle.t==='heli_combat'?'heliMissile':message.weapon==='c4'&&vehicle.t==='heli'?'c4':mountedWeapons[vehicle.t]):message.weapon;
      const profile=weaponCatalog[weapon],ammoSource=profile?.ammo==='rockets'?vehicle:bag,key=actorId+':'+(weapon==='assault'?'pistol':weapon),cooldown=!['proving','world','native'].includes(meta.mode)&&['pistol','assault','grenade'].includes(weapon)?({pistol:10,assault:18,grenade:30}[weapon]):Math.ceil((profile?.cooldown||1)*30);
      if(vehicle&&message.weapon==='grenade'&&!canThrowGrenadeFromVehicle(vehicle))code='NOT_ACTIVE';
      else if(!active()||p.hp<=0||p.fall||p.swimming&&!vehicle||!canAttack(actorId)||!profile||vehicle&&!passenger&&(weapon==='grenade'? !vehicle.seats.includes(actorId):vehicle.seats[0]!==actorId))code='NOT_ACTIVE';
      else if((!vehicle||passenger)&&!['grenade',...(meta.mode==='native'?['c4']:[])].includes(weapon)&&((bag.weapon||'pistol')!==weapon||profile.item&&!bag[profile.item]))code='NOT_EQUIPPED';
      else if(tick-(cooldowns.get(key)??-Infinity)<cooldown)code='COOLDOWN';
      else if(profile.ammo&&!(ammoSource?.[profile.ammo]>0)||weapon==='assault'&&bag.bullets<3)code='EMPTY';
      else{
        if(weapon==='knife'){
          const hit=meleeTarget(p,targets.filter(t=>t.hp>0).map(t=>({...t,t:t.t||'soldat'})),t=>traceArena({x:p.x,y:p.y+1.2,z:p.z},{x:t.x,y:t.y+1.2,z:t.z},geometry(),world()).fraction>=1);
          if(hit){const target=targets.find(t=>t.id===hit.id);target.hp=damageHealth(target.hp,profile.damage);effect('impact',tick,{actorId,at:{x:hit.x,y:hit.y+1.2,z:hit.z},hit:hit.id});}
          // Trencament autoritatiu: un ganivet només arriba als vidres
          // propers, del davant i sense murs intermedis.
          const pane=knifeWindowHit(p,geometry().walls,2.8,
            (wallIndex,paneIndex)=>windowAvailable(wallIndex,paneIndex));
          if(pane&&breakWindow(pane.wallIndex,pane.paneIndex))
            effect('glass',tick,{actorId,at:pane.point,
              wallIndex:pane.wallIndex,paneIndex:pane.paneIndex});
          code='SWUNG';
        }else if(weapon==='cutters'){
          code=cutWire(p)?'CUT':'NO_WIRE';
        }else if(weapon==='grenade'||weapon==='c4'){
          bag[profile.ammo]--;
          const launched=weapon==='c4'?{x:p.x-Math.sin(p.hd)*1.35,y:p.y+.24,z:p.z-Math.cos(p.hd)*1.35,vx:0,vy:0,vz:0}:vehicle?vehicleGrenadeLaunch(vehicle,vehicle.y):['proving','world','native'].includes(meta.mode)?grenadeLaunch(message.power??.5,p,p.hd):{x:p.x,y:p.y+1.5,z:p.z,vx:-Math.sin(p.hd)*14,vz:-Math.cos(p.hd)*14,vy:8};
          grenades.push({id:weapon+'-'+(++sequence),actorId,...launched,weapon,explodeAt:tick+(weapon==='c4'?(message.seconds??5)*30:['proving','world','native'].includes(meta.mode)?72:60)});code=weapon==='c4'?'PLANTED':'THROWN';
        }else if(weapon==='assault'){
          const burst={actorId,remaining:0,delay:0};beginBurst(burst,bag.bullets,()=>{fire(actorId,p,bag,tick);return true;});bursts.push(burst);code='BURST';
        }else code=fire(actorId,p,bag,tick,weapon,message.aim);
        if(meta.mode!=='native'||!['grenade','c4'].includes(weapon))alarm(p,actorId,tick,['knife','cutters'].includes(weapon)?weapon:profile.splash?'bazooka':!vehicle&&weapon==='sniper'?'sniper':vehicle?'rifle':'pistol');bag.disguised=false;cooldowns.set(key,tick);ok=true;
      }
      const result={kind:'combat',actorId,commandId:message.commandId,ok,code};results.push(result);if(results.length>128)results.shift();return {...result};
    }return {kind:'combat',actorId,commandId:message.commandId,ok,code};
  }
  function hold(actorId,tick){
    const player=players().find(p=>p.id===actorId);if(!player||player.hp<=0||player.fall||!active())return;
    const bag=inventory.get(actorId),vehicle=vehicles.mounted(actorId),weapon=vehicle?(vehicle.t==='heli'?'grenade':mountedWeapons[vehicle.t]):bag?.weapon||'pistol',profile=weaponCatalog[weapon];
    if(vehicle&&vehicle.seats[0]!==actorId&&weapon!=='grenade')return;
    if(weapon==='sniper'||weapon==='bazooka')return; // Els trets de precisió requereixen la mira de cada clic.
     if(!profile||profile.ammo&&!((profile.ammo==='rockets'?vehicle:bag)?.[profile.ammo]>0)||weapon==='assault'&&bag.bullets<3)return;
    const key=actorId+':'+(weapon==='assault'?'pistol':weapon);if(tick-(cooldowns.get(key)??-Infinity)<Math.ceil(profile.cooldown*30))return;
    return command(actorId,{epoch:meta.id,commandId:'held-'+tick,weapon:vehicle&&vehicle.t!=='heli'?'pistol':weapon},tick);
  }
  function step(tick){
    if(!active())return;
    for(let i=bursts.length-1;i>=0;i--){const burst=bursts[i],p=players().find(p=>p.id===burst.actorId),bag=inventory.get(burst.actorId);
      if(!p||p.hp<=0||p.fall||p.swimming||!canAttack(p.id)||!bag?.assault||bag.weapon!=='assault'||!bag.bullets){bursts.splice(i,1);continue;}
      stepBurst(burst,1/30,true,()=>{if(!bag.bullets)return false;fire(p.id,p,bag,tick);alarm(p,p.id,tick,'pistol');bag.disguised=false;return true;});if(!burst.remaining)bursts.splice(i,1);
    }
    // L'autoapuntat no necessita 30 recerques LOS/s per vehicle: el canó
    // comparteix l'actualització física a 10 Hz, i els trets continuen a 30 Hz.
    if(tick%3===0)for(const vehicle of vehicles.live())if(turretSpecs[vehicle.t]&&vehicle.seats[0]){
      const p=players().find(p=>p.id===vehicle.seats[0]);if(!p||p.hp<=0)continue;
      const weapon=mountedWeapons[vehicle.t],gun=vehicleGunPose(vehicle),aimed=aimWeapon(p,vehicle,weapon,gun.origin);
      stepVehicleTurret(vehicle,aimed.direction,3/30);
    }
    for(let i=projectiles.length-1;i>=0;i--){
      const p=projectiles[i],flight=projectileStep(p,1/30),trace=traceArena(flight.from,flight.to,geometry(),world(),{ignoreBarbed:!p.splash,collectWindows:true,wallCandidates:traceWallCandidates(flight.from,flight.to)});
      if(trace.hit)flight.consider(trace.fraction,'world',null);
      for(const v of vehicles.live())if(v.id!==p.sourceVehicle){
        const crew=p.enemy?(v.seats||[]).map(id=>players().find(a=>a.id===id)||null):
            (v.enemyCrew||[]).map(id=>targets.find(t=>t.id===id)||null),
          seatHit=!p.splash?vehicleSeatProjectileContact(
            flight.from,flight.to,v,crew,{baseY:v.y}):null;
        if(seatHit)flight.consider(seatHit.t,seatHit.kind,{vehicle:v,...seatHit});
        else flight.consider(vehicles.contact(flight.from,flight.to,v),'vehicle',v);
      }
      if(p.enemy){for(const actor of players())if(actor.hp>0&&!vehicles.mounted(actor.id))flight.consider(segmentSphereT(flight.from.x,flight.from.y,flight.from.z,flight.to.x,flight.to.y,flight.to.z,actor.x,actor.y+1.5,actor.z,1.2),'player',actor);}
      else for(const t of targets)if(t.hp>0&&!t.enemyVehicleId){
        // La silueta visible de dos comandos és un blanc propi; el buc
        // no pot absorbir la bala que travessa el parabrisa o el rider.
        const contact=t.t==='patrulla_marina'&&!p.splash?
          marineCrewProjectileContact(flight.from,flight.to,t,{baseY:t.y}):null;
        if(contact)flight.consider(contact.t,contact.kind,{boat:t,...contact});
        else flight.consider(segmentBox(flight.from,flight.to,targetBox(t)),'enemy',t);
      }
      if(!p.enemy)for(const u of civilianTargets())if(u.hp>0)
        flight.consider(segmentSphereT(flight.from.x,flight.from.y,flight.from.z,flight.to.x,flight.to.y,flight.to.z,u.x,u.y+1.1,u.z,.55),'civilian',u);
      // Un projectil explosiu travessa el vidre i detona uns metres
      // més endins. La distància pendent persisteix entre ticks del Worker.
      if(p.splash){
        const dx=flight.delta.x,dy=flight.delta.y,dz=flight.delta.z,
          stepLength=Math.hypot(dx,dy,dz);
        if(p.glassInteriorRemaining>0){
          if(stepLength>=p.glassInteriorRemaining)
            flight.consider(p.glassInteriorRemaining/stepLength,'glass-interior',null);
          else p.glassInteriorRemaining-=stepLength;
        }else if(stepLength>.001){
          const entry=trace.windowCrossings.filter(pane=>{
            if(pane.t>flight.fraction+1e-6)return false;
            const wall=geometry().walls[pane.wallIndex],
              building=geometry().buildings?.find(b=>b.id===wall?.buildingId);
            return !!building&&
              (pane.point.x-building.x)*dx+(pane.point.z-building.z)*dz<-.04;
          }).sort((a,b)=>a.t-b.t)[0];
          if(entry){
            const remaining=2.2-stepLength*(1-entry.t);
            if(remaining<=0)
              flight.consider(entry.t+2.2/stepLength,'glass-interior',null);
            else p.glassInteriorRemaining=remaining;
          }
        }
      }
      const result=flight.finish();p.life=flight.life;Object.assign(p,result.point);
      for(const pane of trace.windowCrossings)if(pane.t<=flight.fraction+1e-6&&breakWindow(pane.wallIndex,pane.index)){effect('glass',tick,{actorId:p.actorId,at:pane.point,wallIndex:pane.wallIndex,paneIndex:pane.index});}
      if(result.hit){if(p.splash){if(result.kind!=='expire')explode({at:{...result.point},damage:p.dmg,radius:p.splash,actorId:p.actorId,
          projectile:true,direction:{x:p.vx,y:p.vy,z:p.vz},ownerOnly:!p.enemy},tick);projectiles.splice(i,1);continue;}
        let applied=true;
        if(result.kind==='marine-glass'){
          const boat=result.target.boat;
          applied=breakMarineWindshield(boat,result.target.pane);
          if(applied)effect('marine-glass',tick,{actorId:p.actorId,
            targetId:boat.id,pane:result.target.pane,at:{...result.point}});
        }else if(result.kind==='marine-crew'){
          const boat=result.target.boat;
          applied=damageMarineCrew(boat,result.target.seat,p.dmg);
          if(applied)effect('marine-crew-hit',tick,{actorId:p.actorId,
            targetId:boat.id,seat:result.target.seat,at:{...result.point}});
        }else if(result.kind==='vehicle-glass'){
          applied=breakVehicleSeatWindow(result.target.vehicle,result.target.seat);
          if(applied)effect('vehicle-glass',tick,{actorId:p.actorId,vehicleId:result.target.vehicle.id,
            seat:result.target.seat,at:{...result.point}});
        }else if(result.kind==='vehicle-occupant'){
          const occupant=result.target.target;
          if(p.enemy)applied=!!occupant&&damagePlayer(occupant.id,p.dmg)!==false;
          else if(occupant?.hp>0){occupant.hp=damageHealth(occupant.hp,p.dmg);applied=true;}
          else applied=false;
        }else if(result.kind==='vehicle'){const queue=[];applied=damageVehicle(result.target,p.dmg,'light',tick,queue);for(const blast of queue)explode(blast,tick);}else if(result.kind==='enemy'){
          if(result.target.t==='torre'){
            // Estructura sense soldats ficticis ni foc de supressió.
          }else if(!(p.enemy||p.splash)&&['tanqueta','tanc'].includes(result.target.t)){
            // La metralla lleugera no destrueix el blindatge hostil.
          }else result.target.hp=damageHealth(result.target.hp,p.dmg);
        }else if(result.kind==='player')applied=damagePlayer(result.target.id,p.dmg)!==false;
        else if(result.kind==='civilian')applied=damageCivilian(result.target.id,p.dmg,tick)>0;else if(result.kind==='world'&&trace.tree?.p)applied=damagePalm(trace.tree,p.dmg);else if(result.kind==='world'&&trace.wallIndex!=null&&Math.hypot(result.point.x-trace.point.x,result.point.y-trace.point.y,result.point.z-trace.point.z)<.01)applied=damageWall(trace.wallIndex,p.dmg);
        if(result.kind!=='expire'&&!['marine-crew','marine-glass'].includes(result.kind))effect('impact',tick,{actorId:p.actorId,at:{...result.point},hit:applied&&['enemy','player','vehicle'].includes(result.kind)?result.target.id:
          applied&&result.kind==='vehicle-occupant'?result.target.target?.id:null});projectiles.splice(i,1);
      }
    }
    for(let i=grenades.length-1;i>=0;i--){
      const g=grenades[i],from={x:g.x,y:g.y,z:g.z},next=g.weapon==='c4'&&g.landed?{...g}:ballisticStep(g,1/30,g.weapon==='c4'||['proving','world','native'].includes(meta.mode)?24:18);g.vy=next.vy;
      const candidate={x:next.x,y:next.y,z:next.z},trace=traceArena(from,candidate,geometry(),world());
      if(trace.fraction<1){g.landed=true;g.vx=0;g.vz=0;g.vy=0;Object.assign(g,at(from,candidate,Math.max(0,trace.fraction-.01)));g.y=Math.max(g.y,Math.max(0,world().heightAt(g.x,g.z))+(g.weapon==='c4'?.24:.16));}else Object.assign(g,candidate);
      // Impact stops the throw; its fuse keeps counting in simulation time.
      if(tick>=g.explodeAt){
        explode({at:{x:g.x,y:g.y+.08,z:g.z},damage:g.weapon==='c4'?weaponCatalog.c4.damage:['proving','world','native'].includes(meta.mode)?weaponCatalog.grenade.damage:combatBalance.weapons.grenade,radius:g.weapon==='c4'?weaponCatalog.c4.splash:['proving','world','native'].includes(meta.mode)?weaponCatalog.grenade.splash:8,actorId:g.actorId,weapon:g.weapon,ownerOnly:true},tick);grenades.splice(i,1);
      }
    }
    // Els parapets físics de la torre enderrocada desapareixen també
    // al Worker. Es processa cada torre un sol cop, no totes les parets
    // en cada tick de la simulació.
    if(meta.mode==='native')for(const t of targets)
      if(t.t==='torre'&&t.hp<=0&&!clearedTowerParapets.has(t.id)){
        clearedTowerParapets.add(t.id);
        for(const wall of geometry().walls)
          if(wall.towerParapetOwnerId===t.id){
            wall.open=true;wall.hp=0;
          }
      }
    // Abatre els ocupants no danya l'estructura; derruir la torre sí que
    // elimina els ocupants que encara sobreviuen.
    if(meta.mode==='native')for(const t of targets)
      if(t.towerGuard&&t.hp>0&&
         !(targets.find(host=>host.id===t.towerHostId)?.hp>0)){
        t.hp=0;t.state='dead';t.canSee=false;
      }
    for(const t of targets)if(t.ai){
      if(t.hp<=0){enemyVehicles.release(t,tick);t.state='dead';t.focus=null;continue;}
      if(stepNativePatrolVehicle(t,tick))continue;
      if(stepNativeTower(t,tick))continue;
      if(stepNativeGeneral(t,tick))continue;
      const nativeSoldier=meta.mode==='native'&&t.t==='soldat';
      if(nativeSoldier&&enemyVehicles.step(t,tick))continue;
      if(nativeSoldier){
        nativeSoldierStep(t,tick);
        stepNativeSoldierNavigation(t,{tick,world:world(),players:visiblePlayers(),
          requestDoor:openEnemyDoor});
        continue;
      }
      const eye={x:t.x,y:t.y+2.2,z:t.z},candidates=(nativeSoldier?[]:visiblePlayers()).filter(p=>p.hp>0&&!p.fall&&!p.swimming)
        .map(p=>({p,d:Math.hypot(p.x-t.x,p.y-t.y,p.z-t.z)}))
        .filter(({p,d})=>d<((inventory.get(p.id)?.disguised&&tick>(t.alarmedUntil||0))?4:18)&&guardInView(t,p))
        .map(({p,d})=>{
          const chest={x:p.x,y:p.y+1.5,z:p.z},head={x:p.x,y:p.y+2.35,z:p.z},
            aim=traceArena(eye,chest,geometry(),world()).fraction>=1?chest:
              traceArena(eye,head,geometry(),world()).fraction>=1?head:null;
          return {p,d,aim};
        }).filter(c=>!!c.aim).sort((a,b)=>a.d-b.d||a.p.id.localeCompare(b.p.id));
      if(candidates.length){
        const {p,aim}=candidates[0];if(t.focus!==p.id)t.seenTicks=0;t.focus=p.id;t.lastSeenTick=tick;t.lastKnown={x:p.x,y:p.y,z:p.z};t.seenTicks=(t.seenTicks||0)+1;t.heading=Math.atan2(-(p.x-t.x),-(p.z-t.z));t.state=t.seenTicks<30?'alert':'attack';
        if(t.seenTicks>=30&&tick-(t.lastAttack||0)>=90){const amount=Math.max(1,Math.ceil(combatBalance.weapons.rifle*(meta.difficulty||1)));const direction=enemyAccuracy.direction(meta.difficulty||1,'rifle',aim.x-t.x,aim.y-eye.y,aim.z-t.z,roll),id='enemy-bullet-'+(++sequence);
          projectiles.push(launchProjectile(eye,direction,70,{id,actorId:t.id,enemy:true,dmg:amount}));t.lastAttack=tick;effect('shot',tick,{enemy:true,actorId:t.id,from:eye,to:{x:eye.x+direction[0],y:eye.y+direction[1],z:eye.z+direction[2]},hit:null});}
      }else if(t.focus&&tick-(t.lastSeenTick??-Infinity)<120){t.state='search';t.seenTicks=0;const center=t.lastKnown?facePoint(t,t.lastKnown):(t.heading||0);t.heading=center+Math.sin((tick-t.lastSeenTick)/120*Math.PI*2)*Math.PI/3;}
      else{
        t.state='patrol';t.focus=null;t.seenTicks=0;
        const path=t.patrol||[],goal=path[t.patrolIndex||0];if(!goal)continue;
        const dx=goal.x-t.x,dz=goal.z-t.z,d=Math.hypot(dx,dz);if(d<.15)t.patrolIndex=((t.patrolIndex||0)+1)%path.length;
        else{const next={x:t.x+dx/d*Math.min(d,(nativeSoldier?(t.sp??7)*(t.guard?.35:.5):2)/30),z:t.z+dz/d*Math.min(d,(nativeSoldier?(t.sp??7)*(t.guard?.35:.5):2)/30),y:t.y,hd:t.heading||0},resolved=world().resolveBody(t,next),support=world().locomotionAt(next.x,next.z,t.y);t.heading=Math.atan2(-dx,-dz);
          if(Math.hypot(resolved.x-next.x,resolved.z-next.z)<1e-5&&Math.abs(support.floor-t.y)<.5){t.x=next.x;t.z=next.z;t.y=support.floor+.06;}else t.patrolIndex=((t.patrolIndex||0)+1)%path.length;
        }
      }
    }
    for(let i=effects.length-1;i>=0;i--)if(tick-effects[i].tick>(effects[i].kind==='shot'?9:24))effects.splice(i,1);
  }
  function impactVehicle(id,amount,tick){const v=vehicles.live().find(v=>v.id===id);if(!v||amount<=0)return;const queue=[];damageVehicle(v,amount,'heavy',tick,queue);for(const blast of queue)explode(blast,tick);}
  function runover(v,from,tick){
    const profile=vehicleDynamics.types[v.t],speed=from.travelSpeed??Math.abs(v.v);
    if(!['l','wl'].includes(profile.m)||speed<=6||tick<(v.ramUntilTick||0))return;
    const radius=['proving','world','native'].includes(meta.mode)?vehicleSpecs.radii[v.t]*vehicleSpecs.scales[v.t]*.68+1.2*.45:1.6*.68+.45;
    if(meta.mode==='native'&&v.enemyCrew?.[0]){
      // Un conductor sense copilot intenta atropellar el jugador.
      // Amb copilot també és possible un atropellament accidental.
      for(const actor of players())if(actor.hp>0&&!actor.fall&&!actor.swimming&&
        !vehicles.mounted(actor.id)&&Math.abs(actor.y-v.y)<3.4&&
        runoverSweepHit(from.x,from.z,v.x,v.z,actor.x,actor.z,radius)){
        const eye={x:actor.x,y:actor.y+1,z:actor.z};
        if(traceArena({x:from.x,y:from.y+1,z:from.z},eye,
          geometry(),world()).fraction<.999)continue;
        const damage=runoverDamage(speed,profile.mass||1);
        if(damagePlayer(actor.id,damage)!==false){
          v.ramUntilTick=tick+12;v.v*=.86;
          effect('impact',tick,{actorId:v.enemyCrew[0],at:eye,hit:actor.id});
        }
        return;
      }
    }
    for(const target of targets)if((!target.t||target.t==='soldat')&&target.hp>0&&
      !target.enemyVehicleId&&!['waiting','riding'].includes(target.enemyRequisition?.phase)&&
      Math.abs(v.y-target.y)<3&&runoverSweepHit(from.x,from.z,v.x,v.z,target.x,target.z,radius)){
      const eye={x:target.x,y:target.y+1,z:target.z};
      if(traceArena({x:from.x,y:from.y+1,z:from.z},eye,geometry(),world()).fraction<1)continue;
      target.hp=damageHealth(target.hp,runoverDamage(speed,profile.mass||1));v.ramUntilTick=tick+11;v.v*=.86;alarm(v,v.seats[0],tick,'collision');effect('impact',tick,{actorId:v.seats[0],at:eye,hit:target.id});break;
    }
  }
  return {command,hold,step,cancel,vehicleSignal,impactVehicle,runover,liveTargets:()=>targets,hasDeadGeneral:()=>targets.some(t=>t.t==='general'&&t.hp<=0),pause(){bursts.length=0;},finish(){projectiles.length=0;bursts.length=0;grenades.length=0;effects.length=0;},snapshot(){
    // Les rutes A*, els nodes temporals i els objectius de moviment només
    // són útils per al Worker. No els enviam a tots dos navegadors a 10 Hz.
    // El checkpoint, en canvi, conserva les rutes per reprendre l'operació.
    const visibleTargets=targets.map(t=>{
      const {navRoute,navDestination,navReplanTick,navPhase,roamGoal,
        roamReadyTick,roamUntil,tacticGoal,tacticUntil,tacticSide,
        towerAim,generalAim,...publicTarget}=t;
      return publicTarget;
    });
    return structuredClone({targets:visibleTargets,grenades,projectiles,effects});
   },checkpoint(){return structuredClone({targets,grenades,effects,results,cooldowns:[...cooldowns],bursts,projectiles,randomState:random.getState(),sequence});}};
}
