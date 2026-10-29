// Shared, renderer-free rules. World geometry is supplied by a trusted adapter.
export {stepAirborne,fallLandingDamage,waterSupport,sweptRoofLanding} from './player-vertical.mjs';
import {stepAirborne,fallLandingDamage,waterSupport} from './player-vertical.mjs';
export const COOP_PROTOCOL=1,COOP_TICK_RATE=30;
const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function wholeDamage(value){return finite(value)&&value>0?Math.ceil(value):0;}
export function damageHealth(hp,damage,{immune=false,over=false}={}){
  if(!finite(hp)||hp<0)throw new RangeError('Invalid health');
  const amount=wholeDamage(damage);
  return immune||over||!amount?hp:Math.max(0,Math.ceil(hp)-amount);
}
export function moveOnFoot(state,input,dt,{limit,swimming=false,crouched=false}={}){
  if(![state.x,state.z,state.hd,dt,limit,input.forward,input.strafe].every(finite)||dt<0||limit<=0)throw new RangeError('Invalid movement');
  const f=clamp(input.forward,-1,1),strafe=clamp(input.strafe,-1,1),length=Math.max(1,Math.hypot(f,strafe)),running=input.run===true;
  const ss=(swimming?(running?8.5:5):crouched?4.5:running?19:12)*f*dt/length,
    lateral=(swimming?(running?6.5:4.5):crouched?3.8:9)*strafe*dt/length;
  return {x:clamp(state.x-Math.sin(state.hd)*ss+Math.cos(state.hd)*lateral,-limit,limit),
    z:clamp(state.z-Math.cos(state.hd)*ss-Math.sin(state.hd)*lateral,-limit,limit),hd:state.hd};
}
export function validatePlayerInput(input){
  return !!input&&typeof input==='object'&&!Array.isArray(input)&&[4,5].includes(Object.keys(input).length)&&Object.keys(input).every(k=>['forward','turn','strafe','run','climb'].includes(k))&&(!Object.hasOwn(input,'climb')||finite(input.climb)&&Math.abs(input.climb)<=1)&&
    ['forward','turn','strafe'].every(k=>finite(input[k])&&Math.abs(input[k])<=1)&&typeof input.run==='boolean';
}
function copyFall(fall){
  if(fall==null)return null;
  const keys=['y','vy','vx','vz','t','leanF','leanS','startHeight'];
  if(!keys.every(k=>finite(fall[k]))||fall.t<0||fall.startHeight<0||typeof fall.parachute!=='boolean'||!['air','shaft'].includes(fall.kind??'air'))throw new RangeError('Invalid falling actor');
  return {...Object.fromEntries(keys.map(k=>[k,fall[k]])),kind:fall.kind??'air',parachute:fall.parachute};
}
function locomotionSample(world,vertical,x,z,y,time){
  const s=world.locomotionAt(x,z,y),surface=vertical.surfaceAt(x,z,time);
  if(!s||![s.floor,s.terrain,surface].every(finite)||!['interior','basement','drop'].every(k=>typeof s[k]==='boolean'))throw new RangeError('Invalid locomotion support');
  return {floor:s.floor,terrain:s.terrain,interior:s.interior,basement:s.basement,drop:s.drop,surface};
}
function verticalPlayer(previous,input,context,{world,vertical,limit,time}){
  const dt=1/COOP_TICK_RATE;
  function sample(x,z,y){
    return locomotionSample(world,vertical,x,z,y,time);
  }
  function supported(candidate,s){const support=waterSupport(s);return {...candidate,y:support.y,fall:null,swimming:support.swimming,hp:previous.hp};}
  const control=previous.hp>0?input:{forward:0,turn:0,strafe:0,run:false},hd=previous.hd+control.turn*dt*2.2;
  if(previous.fall){
    const air=stepAirborne({...previous,hd},previous.fall,control,dt,limit);
    let candidate={x:air.x,z:air.z,y:air.fall.y,hd};
    if(previous.fall.kind==='shaft')candidate={...world.resolveBody(previous,candidate),y:air.fall.y};
    const s=sample(candidate.x,candidate.z,candidate.y),
      roof=previous.fall.kind==='shaft'?null:world.roofLanding(previous,candidate);
    if(roof!==null&&!finite(roof))throw new RangeError('Invalid landing roof');
    const landing=roof!==null?Math.max(s.floor,roof):s.basement||s.interior?s.floor:Math.max(s.floor,s.surface-1.4);
    if(candidate.y<=landing&&(previous.fall.kind!=='shaft'||previous.y>=landing-.08)){
      const damage=fallLandingDamage(air.fall,{maxHealth:vertical.maxHealth,water:roof===null&&!s.basement&&!s.interior&&s.surface>s.terrain+1.5}),
        landed=supported(candidate,sample(candidate.x,candidate.z,landing));
      // Re-sampling at landing keeps roof/floor height gates in the right level.
      return {...landed,hp:damageHealth(previous.hp,damage)};
    }
    return {...candidate,fall:air.fall,swimming:false,hp:previous.hp};
  }
  const before=sample(previous.x,previous.z,previous.y),swimming=waterSupport(before).swimming,
    moved=moveOnFoot({...previous,hd},{...control,run:control.run&&control.forward>.1&&!context.crouched&&context.canRun!==false},dt,{limit,swimming,crouched:!!context.crouched}),
    candidate=world.resolveBody(previous,moved),s=sample(candidate.x,candidate.z,previous.y),support=waterSupport(s);
  if(s.drop||previous.y-support.y>.75){
    return {...candidate,y:previous.y,hp:previous.hp,swimming:false,fall:{kind:'shaft',y:previous.y,vy:0,vx:0,vz:0,t:0,leanF:0,leanS:0,startHeight:Math.max(0,previous.y-support.y),parachute:false}};
  }
  return supported(candidate,s);
}
export function createPlayerSimulation({epoch,actors,limit,world={},vertical=null,checkpoint=null,movement=null}){
  if(checkpoint){
    if(checkpoint.protocol!==COOP_PROTOCOL||checkpoint.epoch!==epoch||!Number.isSafeInteger(checkpoint.tick)||checkpoint.tick<0||!Array.isArray(checkpoint.players)||checkpoint.players.some(p=>!Number.isSafeInteger(p.acknowledged)||p.acknowledged<0))throw new RangeError('Invalid simulation checkpoint');
    actors=checkpoint.players;
  }
  if(typeof epoch!=='string'||!epoch||!finite(limit)||limit<=0||!Array.isArray(actors)||actors.length!==2||new Set(actors.map(a=>a.id)).size!==2)throw new RangeError('Invalid cooperative session');
  const players=new Map();let tick=checkpoint?.tick??0;
  if(vertical){
    vertical={surfaceAt:vertical.surfaceAt,maxHealth:vertical.maxHealth??20};
    if(typeof vertical.surfaceAt!=='function'||!finite(vertical.maxHealth)||vertical.maxHealth<=0||!['locomotionAt','resolveBody','roofLanding'].every(k=>typeof world[k]==='function'))throw new RangeError('Vertical simulation requires trusted world and water');
  }
  for(const actor of actors){
    if(typeof actor.id!=='string'||!actor.id||![actor.x,actor.z,actor.hd,actor.hp].every(finite)||actor.hp<0||actor.y!==undefined&&!finite(actor.y)||Math.abs(actor.x)>limit||Math.abs(actor.z)>limit)throw new RangeError('Invalid actor');
    if(vertical&&(!finite(actor.y)||actor.hp>vertical.maxHealth))throw new RangeError('Invalid vertical actor');
    const fall=vertical?copyFall(actor.fall):null;
    if(fall&&fall.y!==actor.y)throw new RangeError('Inconsistent falling height');
    const swimming=vertical&&!fall?waterSupport(locomotionSample(world,vertical,actor.x,actor.z,actor.y,tick/COOP_TICK_RATE)).swimming:false,ack=checkpoint?actor.acknowledged:0;
    players.set(actor.id,{id:actor.id,x:actor.x,z:actor.z,hd:actor.hd,hp:actor.hp,y:actor.y??0,...(vertical?{fall,swimming}:{}),received:ack,acknowledged:ack,lastInputTick:-Infinity,input:{forward:0,turn:0,strafe:0,run:false}});
  }
  function accept(actorId,message){
    const p=players.get(actorId);
    if(!p||!message||message.protocol!==COOP_PROTOCOL||message.epoch!==epoch||!Number.isSafeInteger(message.sequence)||message.sequence<=p.received||!validatePlayerInput(message.input))return false;
    p.received=message.sequence;p.lastInputTick=tick;p.input={...message.input};return true;
  }
  function snapshot(){return {protocol:COOP_PROTOCOL,epoch,tick,players:[...players.values()].map(p=>({id:p.id,x:p.x,z:p.z,y:p.y,hd:p.hd,hp:p.hp,acknowledged:p.acknowledged,...(vertical?{swimming:p.swimming,fall:copyFall(p.fall)}:{})}))};}
  function step(){
    const next=[];
    for(const p of players.values()){
      const input=tick-p.lastInputTick<Math.ceil(COOP_TICK_RATE*.25)?p.input:{forward:0,turn:0,strafe:0,run:false},
        previous={id:p.id,x:p.x,z:p.z,y:p.y,hd:p.hd,hp:p.hp,...(vertical?{fall:copyFall(p.fall)}:{})},context=world.context?.({...previous,fall:vertical?copyFall(p.fall):undefined})||{},hd=p.hd+(p.hp>0?input.turn:0)/COOP_TICK_RATE*2.2;
      let candidate=movement?.({...previous},input)??(vertical?verticalPlayer(previous,input,context,{world,vertical,limit,time:(tick+1)/COOP_TICK_RATE}):p.hp>0?moveOnFoot({...p,hd},{...input,run:input.run&&input.forward>.1&&!context.crouched&&context.canRun!==false},1/COOP_TICK_RATE,{...context,limit}):{x:p.x,z:p.z,hd:p.hd});
      if(!vertical&&world.resolve)candidate=world.resolve(previous,candidate);
      if(!candidate||candidate.y!==undefined&&!finite(candidate.y)||![candidate.x,candidate.z,candidate.hd].every(finite)||Math.abs(candidate.x)>limit||Math.abs(candidate.z)>limit)throw new RangeError('Invalid world resolution');
      if(vertical){candidate.fall=copyFall(candidate.fall);if(!finite(candidate.hp)||candidate.hp<0||candidate.hp>p.hp||typeof candidate.swimming!=='boolean'||candidate.fall&&candidate.fall.y!==candidate.y)throw new RangeError('Invalid vertical resolution');}
      next.push({p,candidate});
    }
    // A failed world adapter cannot partially commit one actor's movement.
    for(const {p,candidate} of next){p.x=candidate.x;p.z=candidate.z;p.hd=candidate.hd;p.y=candidate.y??p.y;if(vertical){p.fall=candidate.fall;p.swimming=candidate.swimming;p.hp=candidate.hp;}p.acknowledged=p.received;}
    tick++;return snapshot();
  }
  return Object.freeze({accept,step,snapshot,place(actorId,point){const p=players.get(actorId);if(!p||![point.x,point.y,point.z,point.hd].every(finite)||Math.abs(point.x)>limit||Math.abs(point.z)>limit)return false;p.x=point.x;p.y=point.y;p.z=point.z;p.hd=point.hd;p.fall=null;p.swimming=false;p.lastInputTick=-Infinity;p.input={forward:0,turn:0,strafe:0,run:false};return true;},revive(actorId,health){const p=players.get(actorId);if(!p||p.hp!==0||p.fall||p.swimming||!finite(health)||health<=0||health>(vertical?.maxHealth??20))return false;p.hp=health;p.lastInputTick=-Infinity;p.input={forward:0,turn:0,strafe:0,run:false};return true;},clearInputs(){for(const p of players.values()){p.lastInputTick=-Infinity;p.input={forward:0,turn:0,strafe:0,run:false};}},damage(actorId,amount){const p=players.get(actorId);if(!p)return false;p.hp=damageHealth(p.hp,amount);return true;}});
}
