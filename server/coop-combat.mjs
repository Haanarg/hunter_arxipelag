import {turretSpecs,stepVehicleTurret,vehicleGunPose} from '../src/vehicle-turret-core.mjs';
import {weaponCatalog,combatCommands,mountedWeapons,grenadeLaunch,vehicleGrenadeLaunch,meleeTarget} from '../src/weapon-catalog.mjs';
import {limitBazookaHorizontalAim} from '../src/aiming-core.mjs';
import {enemyAccuracy} from '../src/enemy-accuracy-core.mjs';
import {createWorldRandom} from '../src/world-generation-core.mjs';
import {launchProjectile,projectileStep,SMALL_ARMS_PROJECTILE_SPEED} from '../src/projectile-core.mjs';
import {createAimSelector,weaponTargetPriority,SMALL_ARMS_AIM_CONE,SMALL_ARMS_AIM_VERTICAL,SMALL_ARMS_RANGE} from '../src/aiming-core.mjs';
import {damageHealth} from '../src/player-simulation.mjs';
import {VEHICLE_DESTRUCTION,beginBurst,stepBurst,relayCombatBalance as combatBalance,explosionDamage,segmentAabbT,segmentSphereT,inView,ballisticStep} from '../src/combat-rules.mjs';
// Authoritative combat for the reduced relay arena. No client positions or hits.
const at=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export function segmentBox(from,to,box){return segmentAabbT(from.x,from.y,from.z,to.x,to.y,to.z,box.x0,box.x1,box.y0,box.y1,box.z0,box.z1);}
function targetBox(t){return {x0:t.x-.8,x1:t.x+.8,z0:t.z-.8,z1:t.z+.8,y0:t.y,y1:t.y+3};}
export function traceArena(from,to,geometry,world,{ignoreBarbed=false}={}){
  let fraction=1,hit=false;
  for(const w of geometry.walls)if(!w.open&&!(ignoreBarbed&&w.barbed)){const t=segmentBox(from,to,w);if(t!==null){fraction=Math.min(fraction,t);hit=true;}}
  // The base shells use axis-aligned world footprints, including rotated variants.
  for(const b of geometry.buildings||[]){
    if(!b.rb&&b.rhp>0){const t=segmentBox(from,to,{x0:b.x-b.w/2,x1:b.x+b.w/2,z0:b.z-b.d/2,z1:b.z+b.d/2,y0:b.fy+b.h-.12,y1:b.fy+b.h+.12});if(t!==null){fraction=Math.min(fraction,t);hit=true;}}
    if(b.upperFloor){const t=segmentBox(from,to,{x0:b.x-b.w/2,x1:b.x+b.w/2,z0:b.z-b.d/2,z1:b.z+b.d/2,y0:b.fy+b.storey-.12,y1:b.fy+b.storey+.12});if(t!==null){fraction=Math.min(fraction,t);hit=true;}}
  }
  const length=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),steps=Math.max(1,Math.ceil(length/.2));
  for(let i=0;i<=steps;i++){const t=i/steps;if(t>fraction)break;const p=at(from,to,t);if(p.y<world.heightAt(p.x,p.z)){fraction=t;hit=true;break;}}
  return {fraction,point:at(from,to,fraction),hit};
}
// Heading follows the simulation: zero faces -Z. Close awareness still requires LOS.
export function guardInView(guard,player){
  const dx=player.x-guard.x,dz=player.z-guard.z,d=Math.hypot(dx,dz);
  return d<=2||inView(guard.heading||0,dx,0,dz,Infinity,{sightHalfAngle:Math.PI/3+1e-10,sightVerticalAngle:Math.PI/2});
}
const facePoint=(guard,p)=>Math.atan2(-(p.x-guard.x),-(p.z-guard.z));
export function createRelayCombat({meta,record={},inventory,players,canAttack=()=>true,damagePlayer=()=>{},geometry,world,active,vehicles={live:()=>[],mounted:()=>null},cutWire=()=>false}){
  const targets=structuredClone(record.targets||meta.targets||[]),grenades=structuredClone(record.grenades||[]),effects=structuredClone(record.effects||[]),results=structuredClone(record.results||[]),cooldowns=new Map(record.cooldowns||[]);const bursts=structuredClone(record.bursts||[]),projectiles=structuredClone(record.projectiles||[]);let sequence=record.sequence||0;
  const random=createWorldRandom(record.randomState??(((meta.seed||0)^0x7269666c)>>>0)),roll=(a,b)=>a+random()*(b-a);
  const effect=(kind,tick,data)=>{effects.push({id:++sequence,kind,tick,...data});if(effects.length>64)effects.shift();};
  function alarm(position,actorId,tick){for(const t of targets)if(t.ai&&t.hp>0&&Math.hypot(t.x-position.x,t.z-position.z)<35){t.alarmedUntil=tick+180;t.focus=actorId;t.lastSeenTick=tick;t.lastKnown={x:position.x,y:position.y,z:position.z};t.heading=facePoint(t,position);t.state='search';}}
  function damageVehicle(v,amount,shotClass,tick,queue){
    const destroyed=vehicles.damage(v.id,amount,shotClass);
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
      for(const t of targets)if(t.hp>0){const aim={x:t.x,y:t.y+1.5,z:t.z},d=Math.hypot(aim.x-center.x,aim.y-center.y,aim.z-center.z),damage=explosionDamage(blast.damage,d,blast.radius);if(damage&&visible(aim)){t.hp=damageHealth(t.hp,damage);hits.push(t.id);}}
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
      alarm(center,blast.actorId,tick);effect('explosion',tick,{actorId:blast.actorId,at:center,radius:blast.radius,hits});
    }
  }
  function aimWeapon(p,vehicle,weapon,from){
    const profile=weaponCatalog[weapon],hd=vehicle?.hd??p.hd,dx=-Math.sin(hd),dz=-Math.cos(hd),range=profile.range,focus={},heavy=!!profile.splash;
    const aim=createAimSelector({origin:from,direction:[dx,0,dz],range,cone:profile.cone,shotClass:heavy?'heavy':weapon,focus,verticalCone:profile.vertical,
      isClear:(x,y,z,tx,ty,tz)=>traceArena({x,y,z},{x:tx,y:ty,z:tz},geometry(),world()).fraction>=1});
    for(const t of targets)if(t.hp>0)aim.consider(t,'enemy',weaponTargetPriority({...t,t:t.t||'soldat'},heavy?'heavy':weapon),t.x,t.y+1.5,t.z);
    for(const v of vehicles.live())if(v!==vehicle&&!v.seats.some(Boolean))aim.consider(v,'vehicle',3,v.x,v.y+1,v.z);
    let direction=aim.direction();if(weapon==='bazooka')direction=limitBazookaHorizontalAim(direction,dx,dz);
    return {direction,focus};
  }
  function fire(actorId,p,bag,tick,weapon=bag.weapon||'pistol'){
    const profile=weaponCatalog[weapon],vehicle=vehicles.mounted(actorId),gun=vehicle&&vehicleGunPose(vehicle),
      from=gun?.origin||{x:p.x,y:p.y+(vehicle?2:weapon==='bazooka'?1.9:1.5),z:p.z};
    const aimed=aimWeapon(p,vehicle,weapon,from),focus=aimed.focus,direction=gun?.direction||aimed.direction;
    const id='bullet-'+(++sequence),dmg=meta.mode!=='proving'&&['pistol','assault'].includes(weapon)?combatBalance.weapons.pistol:profile.damage;
    projectiles.push({...launchProjectile(from,direction,profile.speed,{id,actorId,weapon,dmg,splash:profile.splash||0,sourceVehicle:vehicle?.id,aimedAt:focus.target?.id||null}),life:profile.life});
    if(profile.ammo){const source=vehicle&&profile.ammo==='rockets'?vehicle:bag;source[profile.ammo]--;}
    effect('shot',tick,{actorId,from,to:{x:from.x+direction[0],y:from.y+direction[1],z:from.z+direction[2]},hit:null,aimedAt:focus.target?.id||null});return 'FIRED';
  }

  function cancel(actorId){for(let i=bursts.length-1;i>=0;i--)if(bursts[i].actorId===actorId)bursts.splice(i,1);}
  function command(actorId,message,tick){
    const cached=results.find(r=>r.actorId===actorId&&r.commandId===message.commandId);if(cached)return {...cached,duplicate:true};
    const p=players().find(p=>p.id===actorId),bag=inventory.get(actorId);let code='INVALID',ok=false;
    if(p&&message.epoch===meta.id&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)&&combatCommands.includes(message.weapon)){
      const vehicle=vehicles.mounted(actorId),weapon=vehicle?(message.weapon==='grenade'?(vehicle.t==='heli_combat'?null:'grenade'):message.weapon==='secondary'&&vehicle.t==='heli_combat'?'heliMissile':message.weapon==='c4'&&vehicle.t==='heli'?'c4':mountedWeapons[vehicle.t]):message.weapon;
      const profile=weaponCatalog[weapon],ammoSource=profile?.ammo==='rockets'?vehicle:bag,key=actorId+':'+(weapon==='assault'?'pistol':weapon),cooldown=meta.mode!=='proving'&&['pistol','assault','grenade'].includes(weapon)?({pistol:10,assault:18,grenade:30}[weapon]):Math.ceil((profile?.cooldown||1)*30);
      if(!active()||p.hp<=0||p.fall||p.swimming&&!vehicle||!canAttack(actorId)||!profile||vehicle&&(weapon==='grenade'? !vehicle.seats.includes(actorId):vehicle.seats[0]!==actorId))code='NOT_ACTIVE';
      else if(!vehicle&&!['grenade'].includes(weapon)&&((bag.weapon||'pistol')!==weapon||profile.item&&!bag[profile.item]))code='NOT_EQUIPPED';
      else if(tick-(cooldowns.get(key)??-Infinity)<cooldown)code='COOLDOWN';
      else if(profile.ammo&&!(ammoSource?.[profile.ammo]>0)||weapon==='assault'&&bag.bullets<3)code='EMPTY';
      else{
        if(weapon==='knife'){
          const hit=meleeTarget(p,targets.filter(t=>t.hp>0).map(t=>({...t,t:t.t||'soldat'})),t=>traceArena({x:p.x,y:p.y+1.2,z:p.z},{x:t.x,y:t.y+1.2,z:t.z},geometry(),world()).fraction>=1);
          if(hit){const target=targets.find(t=>t.id===hit.id);target.hp=damageHealth(target.hp,profile.damage);effect('impact',tick,{actorId,at:{x:hit.x,y:hit.y+1.2,z:hit.z},hit:hit.id});}code='SWUNG';
        }else if(weapon==='cutters'){
          code=cutWire(p)?'CUT':'NO_WIRE';
        }else if(weapon==='grenade'||weapon==='c4'){
          bag[profile.ammo]--;
          const launched=weapon==='c4'?{x:p.x-Math.sin(p.hd)*1.35,y:p.y+.24,z:p.z-Math.cos(p.hd)*1.35,vx:0,vy:0,vz:0}:vehicle?vehicleGrenadeLaunch(vehicle,vehicle.y):meta.mode==='proving'?grenadeLaunch(.5,p,p.hd):{x:p.x,y:p.y+1.5,z:p.z,vx:-Math.sin(p.hd)*14,vz:-Math.cos(p.hd)*14,vy:8};
          grenades.push({id:weapon+'-'+(++sequence),actorId,...launched,weapon,explodeAt:tick+(weapon==='c4'?150:meta.mode==='proving'?72:60)});code=weapon==='c4'?'PLANTED':'THROWN';
        }else if(weapon==='assault'){
          const burst={actorId,remaining:0,delay:0};beginBurst(burst,bag.bullets,()=>{fire(actorId,p,bag,tick);return true;});bursts.push(burst);code='BURST';
        }else code=fire(actorId,p,bag,tick,weapon);
        alarm(p,actorId,tick);bag.disguised=false;cooldowns.set(key,tick);ok=true;
      }
      const result={kind:'combat',actorId,commandId:message.commandId,ok,code};results.push(result);if(results.length>128)results.shift();return {...result};
    }return {kind:'combat',actorId,commandId:message.commandId,ok,code};
  }
  function step(tick){
    if(!active())return;
    for(let i=bursts.length-1;i>=0;i--){const burst=bursts[i],p=players().find(p=>p.id===burst.actorId),bag=inventory.get(burst.actorId);
      if(!p||p.hp<=0||p.fall||p.swimming||!canAttack(p.id)||!bag?.assault||bag.weapon!=='assault'||!bag.bullets){bursts.splice(i,1);continue;}
      stepBurst(burst,1/30,true,()=>{if(!bag.bullets)return false;fire(p.id,p,bag,tick);alarm(p,p.id,tick);bag.disguised=false;return true;});if(!burst.remaining)bursts.splice(i,1);
    }
    for(const vehicle of vehicles.live())if(turretSpecs[vehicle.t]&&vehicle.seats[0]){
      const p=players().find(p=>p.id===vehicle.seats[0]);if(!p||p.hp<=0)continue;
      const weapon=mountedWeapons[vehicle.t],gun=vehicleGunPose(vehicle),aimed=aimWeapon(p,vehicle,weapon,gun.origin);
      stepVehicleTurret(vehicle,aimed.direction,1/30);
    }
    for(let i=projectiles.length-1;i>=0;i--){
      const p=projectiles[i],flight=projectileStep(p,1/30),trace=traceArena(flight.from,flight.to,geometry(),world(),{ignoreBarbed:!p.splash});
      if(trace.hit)flight.consider(trace.fraction,'world',null);
      for(const v of vehicles.live())if(v.id!==p.sourceVehicle)flight.consider(vehicles.contact(flight.from,flight.to,v),'vehicle',v);
      if(p.enemy){for(const actor of players())if(actor.hp>0&&!vehicles.mounted(actor.id))flight.consider(segmentSphereT(flight.from.x,flight.from.y,flight.from.z,flight.to.x,flight.to.y,flight.to.z,actor.x,actor.y+1.5,actor.z,1.2),'player',actor);}
      else for(const t of targets)if(t.hp>0)flight.consider(segmentBox(flight.from,flight.to,targetBox(t)),'enemy',t);
      const result=flight.finish();p.life=flight.life;Object.assign(p,result.point);
      if(result.hit){if(p.splash){if(result.kind!=='expire')explode({at:{...result.point},damage:p.dmg,radius:p.splash,actorId:p.actorId,ownerOnly:true},tick);projectiles.splice(i,1);continue;}let applied=true;if(result.kind==='vehicle'){const queue=[];applied=damageVehicle(result.target,p.dmg,'light',tick,queue);for(const blast of queue)explode(blast,tick);}else if(result.kind==='enemy')result.target.hp=damageHealth(result.target.hp,p.dmg);else if(result.kind==='player')applied=damagePlayer(result.target.id,p.dmg)!==false;
        if(result.kind!=='expire')effect('impact',tick,{actorId:p.actorId,at:{...result.point},hit:applied&&['enemy','player','vehicle'].includes(result.kind)?result.target.id:null});projectiles.splice(i,1);
      }
    }
    for(let i=grenades.length-1;i>=0;i--){
      const g=grenades[i],from={x:g.x,y:g.y,z:g.z},next=g.weapon==='c4'&&g.landed?{...g}:ballisticStep(g,1/30,g.weapon==='c4'||meta.mode==='proving'?24:18);g.vy=next.vy;
      const candidate={x:next.x,y:next.y,z:next.z},trace=traceArena(from,candidate,geometry(),world());
      if(trace.fraction<1){g.landed=true;g.vx=0;g.vz=0;g.vy=0;Object.assign(g,at(from,candidate,Math.max(0,trace.fraction-.01)));g.y=Math.max(g.y,Math.max(0,world().heightAt(g.x,g.z))+(g.weapon==='c4'?.24:.16));}else Object.assign(g,candidate);
      // Impact stops the throw; its fuse keeps counting in simulation time.
      if(tick>=g.explodeAt){
        explode({at:{x:g.x,y:g.y+.08,z:g.z},damage:g.weapon==='c4'?weaponCatalog.c4.damage:meta.mode==='proving'?weaponCatalog.grenade.damage:combatBalance.weapons.grenade,radius:g.weapon==='c4'?weaponCatalog.c4.splash:meta.mode==='proving'?weaponCatalog.grenade.splash:8,actorId:g.actorId,ownerOnly:true},tick);grenades.splice(i,1);
      }
    }
    for(const t of targets)if(t.ai){
      if(t.hp<=0){t.state='dead';t.focus=null;continue;}
      const eye={x:t.x,y:t.y+1.5,z:t.z},candidates=players().filter(p=>p.hp>0&&!p.fall&&!p.swimming).map(p=>({p,d:Math.hypot(p.x-t.x,p.y-t.y,p.z-t.z)})).filter(({p,d})=>d<((inventory.get(p.id)?.disguised&&tick>(t.alarmedUntil||0))?4:18)&&guardInView(t,p)&&traceArena(eye,{x:p.x,y:p.y+1.5,z:p.z},geometry(),world()).fraction>=1).sort((a,b)=>a.d-b.d||a.p.id.localeCompare(b.p.id));
      if(candidates.length){
        const p=candidates[0].p;if(t.focus!==p.id)t.seenTicks=0;t.focus=p.id;t.lastSeenTick=tick;t.lastKnown={x:p.x,y:p.y,z:p.z};t.seenTicks=(t.seenTicks||0)+1;t.heading=Math.atan2(-(p.x-t.x),-(p.z-t.z));t.state=t.seenTicks<30?'alert':'attack';
        if(t.seenTicks>=30&&tick-(t.lastAttack||0)>=90){const amount=Math.max(1,Math.ceil(combatBalance.weapons.rifle*(meta.difficulty||1)));const direction=enemyAccuracy.direction(meta.difficulty||1,'rifle',p.x-t.x,p.y+1.5-eye.y,p.z-t.z,roll),id='enemy-bullet-'+(++sequence);
          projectiles.push(launchProjectile(eye,direction,70,{id,actorId:t.id,enemy:true,dmg:amount}));t.lastAttack=tick;effect('shot',tick,{enemy:true,actorId:t.id,from:eye,to:{x:eye.x+direction[0],y:eye.y+direction[1],z:eye.z+direction[2]},hit:null});}
      }else if(t.focus&&tick-(t.lastSeenTick??-Infinity)<120){t.state='search';t.seenTicks=0;const center=t.lastKnown?facePoint(t,t.lastKnown):(t.heading||0);t.heading=center+Math.sin((tick-t.lastSeenTick)/120*Math.PI*2)*Math.PI/3;}
      else{
        t.state='patrol';t.focus=null;t.seenTicks=0;
        const path=t.patrol||[],goal=path[t.patrolIndex||0];if(!goal)continue;
        const dx=goal.x-t.x,dz=goal.z-t.z,d=Math.hypot(dx,dz);if(d<.15)t.patrolIndex=((t.patrolIndex||0)+1)%path.length;
        else{const next={x:t.x+dx/d*Math.min(d,2/30),z:t.z+dz/d*Math.min(d,2/30),y:t.y,hd:t.heading||0},resolved=world().resolveBody(t,next),support=world().locomotionAt(next.x,next.z,t.y);t.heading=Math.atan2(-dx,-dz);
          if(Math.hypot(resolved.x-next.x,resolved.z-next.z)<1e-5&&Math.abs(support.floor-t.y)<.5){t.x=next.x;t.z=next.z;t.y=support.floor+.06;}else t.patrolIndex=((t.patrolIndex||0)+1)%path.length;
        }
      }
    }
    for(let i=effects.length-1;i>=0;i--)if(tick-effects[i].tick>(effects[i].kind==='shot'?9:24))effects.splice(i,1);
  }
  return {command,step,cancel,pause(){bursts.length=0;},finish(){projectiles.length=0;bursts.length=0;grenades.length=0;effects.length=0;},snapshot(){return structuredClone({targets,grenades,projectiles,effects});},checkpoint(){return structuredClone({targets,grenades,effects,results,cooldowns:[...cooldowns],bursts,projectiles,randomState:random.getState(),sequence});}};
}
