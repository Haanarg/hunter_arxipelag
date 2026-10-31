import {combatBalance} from '../src/combat-rules.mjs';

// Missions opcionals autoritatives que fan servir els models i els
// emplaçaments generats pel joc individual. Cap segon món ni client.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),
 point=p=>({x:p.x,y:p.y,z:p.z}),
 alive=u=>u&&u.hp>0&&u.state!=='dead',
 local=(camp,x,z)=>{
  const c=Math.round(Math.cos(camp.angle||0)),s=Math.round(Math.sin(camp.angle||0));
  return {x:camp.x+x*c-z*s,z:camp.z+x*s+z*c};
 };
export function createNativeOptionals({meta,record={},world,geometry,players,vehicles,
  canSee=()=>true,active=()=>true}){
 const spec=meta.optional;
 if(meta.mode!=='native'||!spec?.prison)return {
  snapshot:()=>null,checkpoint:()=>null,step(){},command:()=>({ok:false,code:'NOT_ACTIVE'}),
  warn(){return 0},damage(){return 0}
 };
 const camp=spec.prison,
  units=(record.prison?.entities||camp.entities).map(u=>({...u,
    path:u.path||[],waypoint:u.waypoint||0,phase:u.phase||0,following:!!u.following})),
  radio=(record.radio||spec.radio).map(r=>({...r,operational:r.operational!==false,
    discovered:!!r.discovered,reports:r.reports||0,dispatches:r.dispatches||0,
    lastWarnTick:r.lastWarnTick??-100000})),
  results=[...(record.results||[])];
 let knownTargets=[];
 let discovered=!!record.prison?.discovered,released=!!record.prison?.released,
  repair=record.prison?.repair?{...record.prison.repair}:null,
  followOwner=record.prison?.followOwner||null,events=[...(record.events||[])];
 const emit=(kind,tick,info={})=>{events.push({id:tick+':'+events.length,kind,tick,...info});if(events.length>12)events.shift();};
 function status(targets){
  const hostile=new Map(targets.map(t=>[t.id,t])),guardIds=camp.guardIds||[],
    guards=guardIds.filter(id=>hostile.get(id)?.t==='soldat'&&hostile.get(id)?.hp>0).length,
    towers=guardIds.filter(id=>hostile.get(id)?.t==='torre'&&hostile.get(id)?.hp>0).length,
    gaps=(camp.fenceIndexes||[]).filter(i=>geometry().walls[i]?.open||
      geometry().walls[i]?.hp<=0);
  return {guards,towers,breach:gaps.length>0,gaps};
 }
 function routeThroughGap(index){
  const w=geometry().walls[index],wx=(w.x0+w.x1)/2,wz=(w.z0+w.z1)/2,
    c=Math.round(Math.cos(camp.angle||0)),s=Math.round(Math.sin(camp.angle||0)),
    x=(wx-camp.x)*c+(wz-camp.z)*s,
    z=-(wx-camp.x)*s+(wz-camp.z)*c,side=x<0?-1:1;
  let route;
  if(z<=-9.5)route=[[x,z+3],[x,z-3.5],[side*26,-16],[side*26,30],[0,37]];
  else if(Math.abs(x)>=19.5)route=[[x-side*3,z],[x+side*3.5,z],[side*26,30],[0,37]];
  else route=[[x,z-3],[x,z+3.5],[x,32],[0,37]];
  return route.map(([x,z])=>{
   const p=local(camp,x,z);return {...p,y:world().heightAt(p.x,p.z)};
  });
 }
 function release(tick,st){
  if(released||st.guards||st.towers||!st.breach||!units.some(alive))return;
  const route=routeThroughGap(st.gaps[0]);
  let i=0;
  for(const u of units)if(alive(u)){
   u.state=u.role==='mechanic'?'to-station':'evacuating';
   u.path=u.role==='mechanic'?[...route,...camp.mechanicAccess]:
     [...route,...camp.farmerEscape.slice(-2)];
   u.waypoint=0;u.following=false;u.phase=(i++)*.7;
  }
  released=discovered=true;
  emit('prison-rescue',tick,{count:units.filter(alive).length});
 }
 function move(u,dt){
  if(!alive(u)||!u.path?.length)return;
  let goal=u.path[u.waypoint];if(!goal)return;
  const d=distance(u,goal);
  if(d<.18){
   u.waypoint++;goal=u.path[u.waypoint];
   if(!goal){u.path=[];u.state=u.role==='mechanic'?'ready':'rescued';return;}
  }
  const delta=distance(u,goal),step=Math.min(delta,(u.role==='mechanic'?2.8:3.2)*dt);
  if(delta<.01)return;
  const next={x:u.x+(goal.x-u.x)/delta*step,z:u.z+(goal.z-u.z)/delta*step,
    y:u.y,hd:0},p=world().resolveBody({...u,hd:0},next),
    support=world().locomotionAt(next.x,next.z,u.y);
  if(Math.hypot(next.x-p.x,next.z-p.z)>.07||
    support.terrain<.05||Math.abs(support.floor-u.y)>.8)return;
  u.x=next.x;u.z=next.z;u.y=support.floor;u.phase+=step*3.7;
 }
 function mechanic(){return units.find(u=>u.role==='mechanic'&&alive(u));}
 function nearVehicle(u,v){return v&&!v.destroyed&&!v.sunk&&v.life>0&&
  Number.isFinite(v.life)&&v.life<(v.maxLife??combatBalance.vehicles[v.t]??v.life)&&
  Math.abs(v.v||0)<=.35&&Math.abs(v.strafeV||0)<=.35&&
  Math.abs(v.y-u.y)<=3.8&&distance(u,v)<=Math.min(32,Math.max(7,(v.hullRadius||4)+5));}
 function readyRepair(actor,u,v){
  return actor&&!vehicles.mounted(actor.id)&&actor.hp>0&&!actor.fall&&!actor.swimming&&
   distance(actor,u)<=9&&Math.abs(actor.y-u.y)<=3.8&&nearVehicle(u,v)&&
   canSee({x:actor.x,y:actor.y+1.5,z:actor.z},{x:u.x,y:u.y+1.5,z:u.z})&&
   canSee({x:u.x,y:u.y+1.5,z:u.z},{x:v.x,y:v.y+1,z:v.z});
 }
 function step(tick,targets,actors){
  knownTargets=targets;
  if(!active())return;
  if(tick%3===0){
   if(!discovered&&actors.some(p=>p.hp>0&&
     Math.hypot(p.x-camp.rescuePoint.x,p.y-camp.rescuePoint.y,p.z-camp.rescuePoint.z)<80))discovered=true;
   const st=status(targets);
   release(tick,st);
   for(const u of units){
    if(u.role==='mechanic'&&u.state==='ready'&&u.following){
      const owner=actors.find(p=>p.id===followOwner&&p.hp>0&&!p.fall&&!p.swimming);
      if(owner&&!vehicles.mounted(owner.id)&&distance(owner,u)>3){
       const hd=owner.hd||0,x=owner.x+Math.sin(hd)*2.5,z=owner.z+Math.cos(hd)*2.5;
       u.path=[{x,y:world().heightAt(x,z),z}];u.waypoint=0;
      }else u.path=[];
    }
    move(u,.1);
   }
   if(repair){
    const u=mechanic(),v=vehicles.live().find(v=>v.id===repair.vehicleId),
      owner=actors.find(p=>p.id===repair.actorId);
    if(!u||u.state!=='ready'||!v||!owner||!readyRepair(owner,u,v)||
      Math.hypot(v.x-repair.x,v.z-repair.z)>.3||
      Math.abs(v.life-repair.life)>.001||Math.abs(v.y-repair.y)>.3){
      repair=null;emit('repair-cancelled',tick);
    }else{
      repair.progress+=.1;
      if(repair.progress>=6){
       v.life=v.maxLife??combatBalance.vehicles[v.t]??v.life;
       emit('repair-complete',tick,{vehicleId:v.id});repair=null;
      }
    }
   }
  }
  for(const r of radio)if(r.operational&&r.colliderIndex>=0){
   const wall=geometry().walls[r.colliderIndex];
   if(!wall||wall.hp<=0||wall.open){r.operational=false;r.disabledReason='destroyed';emit('radio-disabled',tick,{relayId:r.id});}
  }
  for(const r of radio)if(!r.discovered&&actors.some(p=>p.hp>0&&distance(p,r)<70&&Math.abs(p.y-r.y)<5))
   r.discovered=true;
 }
 function warn(witness,actor,tick,targets){
  if(!actor||!witness||!active())return 0;
  let dispatched=0;
  for(const r of radio)if(r.operational&&r.sourceIds.includes(witness.id)&&tick-r.lastWarnTick>=540){
   r.lastWarnTick=tick;r.reports++;
   const defenders=r.hqDefenders.map(id=>targets.find(t=>t.id===id))
     .filter(u=>u?.hp>0&&!u.canSee).slice(0,2);
   for(const unit of defenders){
    unit.state='search';unit.lastKnown={x:actor.x,y:actor.y,z:actor.z};
    unit.investigateUntil=tick+900;
    unit.heading=Math.atan2(unit.x-actor.x,unit.z-actor.z);
    r.dispatches++;dispatched++;
   }
   if(dispatched)emit('radio-warning',tick,{relayId:r.id});
  }
  return dispatched;
 }
 function command(actorId,message,tick){
  const cached=results.find(r=>r.actorId===actorId&&r.commandId===message.commandId);
  if(cached)return {...cached,duplicate:true};
  const actor=players().find(p=>p.id===actorId),u=mechanic();
  let ok=false,code='INVALID';
  if(!active()||!actor||actor.hp<=0||actor.fall||actor.swimming||
    vehicles.mounted(actorId)||meta.id!==message.epoch)code='NOT_ACTIVE';
  else if(message.operation==='sabotage'){
   const r=radio.find(r=>r.id===message.target);
   if(!r)code='UNKNOWN_TARGET';
   else if(!r.operational)code='DISABLED';
   else if(distance(actor,r)>2.9||Math.abs(actor.y-r.y)>2||!canSee(
     {x:actor.x,y:actor.y+1.5,z:actor.z},{x:r.x,y:r.y+1.6,z:r.z},r.colliderIndex))
     code='TOO_FAR';
   else{r.operational=false;r.disabledReason='sabotage';r.discovered=true;
    ok=true;code='SABOTAGED';emit('radio-disabled',tick,{relayId:r.id});}
  }else if(message.operation==='follow'){
   if(!u||u.state!=='ready'||!released)code='NOT_READY';
   else if(distance(actor,u)>=4||!canSee(
     {x:actor.x,y:actor.y+1.5,z:actor.z},{x:u.x,y:u.y+1.5,z:u.z}))
     code='TOO_FAR';
   else{u.following=!u.following;followOwner=u.following?actorId:null;u.path=[];
    ok=true;code=u.following?'FOLLOWING':'WAITING';}
  }else if(message.operation==='repair'){
   const v=vehicles.live().find(v=>v.id===message.target);
   if(repair&&repair.actorId===actorId){repair=null;ok=true;code='REPAIR_CANCELLED';}
   else if(!u||u.state!=='ready'||!released)code='NOT_READY';
   else if(!readyRepair(actor,u,v))code='TOO_FAR';
   else{
    u.following=false;followOwner=null;u.path=[];repair={
      actorId,vehicleId:v.id,progress:0,life:v.life,y:v.y,x:v.x,z:v.z};
    ok=true;code='REPAIRING';
   }
  }
  const result={kind:'optional',actorId,commandId:message.commandId,ok,code};
  results.push(result);if(results.length>48)results.shift();return result;
 }
 function damage(id,amount,tick){
  const u=units.find(u=>u.id===id);
  if(!u||!alive(u)||!(amount>0))return 0;
  const dealt=Math.min(u.hp,Math.ceil(amount));u.hp-=dealt;
  if(u.hp<=0){u.hp=0;u.state='dead';u.path=[];u.following=false;
   if(u.role==='mechanic'){repair=null;followOwner=null;}
   emit('civilian-death',tick,{personId:u.id});}
  return dealt;
 }
 function snapshot(){
  return {prison:{discovered,released,rescue:(()=>{const st=status(knownTargets);return {guards:st.guards,towers:st.towers,breach:st.breach};})(),
    entities:units.map(u=>({id:u.id,role:u.role,state:u.state,hp:u.hp,x:u.x,y:u.y,z:u.z,
      phase:u.phase,following:u.following,pose:u.pose})),repair:repair?
      {vehicleId:repair.vehicleId,progress:repair.progress,duration:6}:null},
    radio:radio.map(({id,x,y,z,operational,discovered,disabledReason,reports,dispatches})=>
      ({id,x,y,z,operational,discovered,disabledReason,reports,dispatches})),
    events:events.slice()};
 }
 function checkpoint(){return {prison:{discovered,released,followOwner,repair,
    entities:units.map(u=>({...u,path:u.path.map(point)}))},radio:radio.map(r=>({...r})),
    events:events.slice(),results:results.slice()};}
 return {snapshot,checkpoint,step,command,warn,damage};
}
