// Authoritative combat for the reduced relay arena. No client positions or hits.
const at=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export function segmentBox(from,to,box){
  let near=0,far=1;
  for(const k of ['x','y','z']){const delta=to[k]-from[k],lo=box[k+'0'],hi=box[k+'1'];
    if(Math.abs(delta)<1e-10){if(from[k]<lo||from[k]>hi)return null;continue;}
    const a=(lo-from[k])/delta,b=(hi-from[k])/delta;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;
  }return near;
}
function targetBox(t){return {x0:t.x-.8,x1:t.x+.8,z0:t.z-.8,z1:t.z+.8,y0:t.y,y1:t.y+3};}
export function traceArena(from,to,geometry,world){
  let fraction=1;
  for(const w of geometry.walls)if(!w.open){const t=segmentBox(from,to,w);if(t!==null)fraction=Math.min(fraction,t);}
  // The base shells use axis-aligned world footprints, including rotated variants.
  for(const b of geometry.buildings||[]){
    if(!b.rb&&b.rhp>0){const t=segmentBox(from,to,{x0:b.x-b.w/2,x1:b.x+b.w/2,z0:b.z-b.d/2,z1:b.z+b.d/2,y0:b.fy+b.h-.12,y1:b.fy+b.h+.12});if(t!==null)fraction=Math.min(fraction,t);}
    if(b.upperFloor){const t=segmentBox(from,to,{x0:b.x-b.w/2,x1:b.x+b.w/2,z0:b.z-b.d/2,z1:b.z+b.d/2,y0:b.fy+b.storey-.12,y1:b.fy+b.storey+.12});if(t!==null)fraction=Math.min(fraction,t);}
  }
  const length=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),steps=Math.max(1,Math.ceil(length/.2));
  for(let i=0;i<=steps;i++){const t=i/steps;if(t>fraction)break;const p=at(from,to,t);if(p.y<world.heightAt(p.x,p.z)){fraction=t;break;}}
  return {fraction,point:at(from,to,fraction)};
}
// Heading follows the simulation: zero faces -Z. Close awareness still requires LOS.
export function guardInView(guard,player){
  const dx=player.x-guard.x,dz=player.z-guard.z,d=Math.hypot(dx,dz);
  return d<=2||(-Math.sin(guard.heading||0)*dx-Math.cos(guard.heading||0)*dz)/d>=.5-1e-10;
}
const facePoint=(guard,p)=>Math.atan2(-(p.x-guard.x),-(p.z-guard.z));
export function createRelayCombat({meta,record={},inventory,players,damagePlayer=()=>{},geometry,world,active}){
  const targets=structuredClone(record.targets||meta.targets||[]),grenades=structuredClone(record.grenades||[]),effects=structuredClone(record.effects||[]),results=structuredClone(record.results||[]),cooldowns=new Map(record.cooldowns||[]);let sequence=record.sequence||0;
  const effect=(kind,tick,data)=>{effects.push({id:++sequence,kind,tick,...data});if(effects.length>64)effects.shift();};
  function alarm(position,actorId,tick){for(const t of targets)if(t.ai&&t.hp>0&&Math.hypot(t.x-position.x,t.z-position.z)<35){t.alarmedUntil=tick+180;t.focus=actorId;t.lastSeenTick=tick;t.lastKnown={x:position.x,y:position.y,z:position.z};t.heading=facePoint(t,position);t.state='search';}}
  function command(actorId,message,tick){
    const cached=results.find(r=>r.actorId===actorId&&r.commandId===message.commandId);if(cached)return {...cached,duplicate:true};
    const p=players().find(p=>p.id===actorId),bag=inventory.get(actorId);let code='INVALID',ok=false;
    if(p&&message.epoch===meta.id&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)&&['pistol','grenade'].includes(message.weapon)){
      const key=actorId+':'+message.weapon;
      if(!active()||p.hp<=0||p.fall||p.swimming)code='NOT_ACTIVE';
      else if(tick-(cooldowns.get(key)??-Infinity)<(message.weapon==='pistol'?10:30))code='COOLDOWN';
      else if(!(message.weapon==='pistol'?bag.bullets:bag.grenades))code='EMPTY';
      else{
        const from={x:p.x,y:p.y+1.5,z:p.z},dx=-Math.sin(p.hd),dz=-Math.cos(p.hd);
        if(message.weapon==='pistol'){
          const to={x:from.x+dx*70,y:from.y,z:from.z+dz*70},trace=traceArena(from,to,geometry(),world());let first=trace.fraction,hit=null;
          for(const t of targets)if(t.hp>0){const f=segmentBox(from,to,targetBox(t));if(f!==null&&f<first){first=f;hit=t;}}
          bag.bullets--;if(hit)hit.hp=Math.max(0,hit.hp-4);effect('shot',tick,{actorId,from,to:at(from,to,first),hit:hit?.id||null});code=hit?'HIT':'FIRED';
        }else{
          bag.grenades--;grenades.push({id:'grenade-'+(++sequence),actorId,...from,vx:dx*14,vz:dz*14,vy:8,explodeAt:tick+60});code='THROWN';
        }
        alarm(p,actorId,tick);bag.disguised=false;cooldowns.set(key,tick);ok=true;
      }
      const result={kind:'combat',actorId,commandId:message.commandId,ok,code};results.push(result);if(results.length>128)results.shift();return {...result};
    }return {kind:'combat',actorId,commandId:message.commandId,ok,code};
  }
  function step(tick){
    if(!active())return;
    for(let i=grenades.length-1;i>=0;i--){
      const g=grenades[i],from={x:g.x,y:g.y,z:g.z};g.vy-=18/30;
      const candidate={x:g.x+g.vx/30,y:g.y+g.vy/30,z:g.z+g.vz/30},trace=traceArena(from,candidate,geometry(),world());
      if(trace.fraction<1){g.vx=0;g.vz=0;g.vy=0;Object.assign(g,at(from,candidate,Math.max(0,trace.fraction-.01)));}else Object.assign(g,candidate);
      // Impact stops the throw; its fuse keeps counting in simulation time.
      if(tick>=g.explodeAt){
        const center={x:g.x,y:g.y+.08,z:g.z},hits=[];
        for(const t of targets)if(t.hp>0){const aim={x:t.x,y:t.y+1.5,z:t.z},d=Math.hypot(aim.x-center.x,aim.y-center.y,aim.z-center.z);if(d<8&&traceArena(center,aim,geometry(),world()).fraction>=1){const damage=Math.ceil(16*(1-d/8));t.hp=Math.max(0,t.hp-damage);hits.push(t.id);}}
        alarm(center,g.actorId,tick);effect('explosion',tick,{actorId:g.actorId,at:center,radius:8,hits});grenades.splice(i,1);
      }
    }
    for(const t of targets)if(t.ai){
      if(t.hp<=0){t.state='dead';t.focus=null;continue;}
      const eye={x:t.x,y:t.y+1.5,z:t.z},candidates=players().filter(p=>p.hp>0&&!p.fall&&!p.swimming).map(p=>({p,d:Math.hypot(p.x-t.x,p.y-t.y,p.z-t.z)})).filter(({p,d})=>d<((inventory.get(p.id)?.disguised&&tick>(t.alarmedUntil||0))?4:18)&&guardInView(t,p)&&traceArena(eye,{x:p.x,y:p.y+1.5,z:p.z},geometry(),world()).fraction>=1).sort((a,b)=>a.d-b.d||a.p.id.localeCompare(b.p.id));
      if(candidates.length){
        const p=candidates[0].p;if(t.focus!==p.id)t.seenTicks=0;t.focus=p.id;t.lastSeenTick=tick;t.lastKnown={x:p.x,y:p.y,z:p.z};t.seenTicks=(t.seenTicks||0)+1;t.heading=Math.atan2(-(p.x-t.x),-(p.z-t.z));t.state=t.seenTicks<30?'alert':'attack';
        if(t.seenTicks>=30&&tick-(t.lastAttack||0)>=90){const amount=Math.max(1,Math.ceil(2*(meta.difficulty||1)));damagePlayer(p.id,amount);t.lastAttack=tick;effect('shot',tick,{enemy:true,actorId:t.id,from:eye,to:{x:p.x,y:p.y+1.5,z:p.z},hit:p.id});}
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
  return {command,step,finish(){grenades.length=0;effects.length=0;},snapshot(){return structuredClone({targets,grenades,effects});},checkpoint(){return structuredClone({targets,grenades,effects,results,cooldowns:[...cooldowns],sequence});}};
}
