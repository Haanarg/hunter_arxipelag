// Shared, renderer-free rules. World geometry is supplied by a trusted adapter.
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
  return !!input&&typeof input==='object'&&!Array.isArray(input)&&Object.keys(input).length===4&&
    ['forward','turn','strafe'].every(k=>finite(input[k])&&Math.abs(input[k])<=1)&&typeof input.run==='boolean';
}
export function createPlayerSimulation({epoch,actors,limit,world={}}){
  if(typeof epoch!=='string'||!epoch||!finite(limit)||limit<=0||!Array.isArray(actors)||actors.length!==2||new Set(actors.map(a=>a.id)).size!==2)throw new RangeError('Invalid cooperative session');
  const players=new Map();let tick=0;
  for(const actor of actors){
    if(typeof actor.id!=='string'||!actor.id||![actor.x,actor.z,actor.hd,actor.hp].every(finite)||actor.hp<0||Math.abs(actor.x)>limit||Math.abs(actor.z)>limit)throw new RangeError('Invalid actor');
    players.set(actor.id,{...actor,received:0,acknowledged:0,lastInputTick:-Infinity,input:{forward:0,turn:0,strafe:0,run:false}});
  }
  function accept(actorId,message){
    const p=players.get(actorId);
    if(!p||!message||message.protocol!==COOP_PROTOCOL||message.epoch!==epoch||!Number.isSafeInteger(message.sequence)||message.sequence<=p.received||!validatePlayerInput(message.input))return false;
    p.received=message.sequence;p.lastInputTick=tick;p.input={...message.input};return true;
  }
  function snapshot(){return {protocol:COOP_PROTOCOL,epoch,tick,players:[...players.values()].map(p=>({id:p.id,x:p.x,z:p.z,hd:p.hd,hp:p.hp,acknowledged:p.acknowledged}))};}
  function step(){
    const next=[];
    for(const p of players.values()){
      const input=tick-p.lastInputTick<Math.ceil(COOP_TICK_RATE*.25)?p.input:{forward:0,turn:0,strafe:0,run:false},context=world.context?.({...p})||{};
      const previous={id:p.id,x:p.x,z:p.z,hd:p.hd,hp:p.hp},hd=p.hd+(p.hp>0?input.turn:0)/COOP_TICK_RATE*2.2;
      let candidate=p.hp>0?moveOnFoot({...p,hd},input,1/COOP_TICK_RATE,{limit,...context}):{x:p.x,z:p.z,hd:p.hd};
      if(world.resolve)candidate=world.resolve(previous,candidate);
      if(!candidate||![candidate.x,candidate.z,candidate.hd].every(finite)||Math.abs(candidate.x)>limit||Math.abs(candidate.z)>limit)throw new RangeError('Invalid world resolution');
      next.push({p,candidate});
    }
    // A failed world adapter cannot partially commit one actor's movement.
    for(const {p,candidate} of next){p.x=candidate.x;p.z=candidate.z;p.hd=candidate.hd;p.acknowledged=p.received;}
    tick++;return snapshot();
  }
  return Object.freeze({accept,step,snapshot,damage(actorId,amount){const p=players.get(actorId);if(!p)return false;p.hp=damageHealth(p.hp,amount);return true;}});
}
