// Percepció compartida: els sons són esdeveniments de joc, no volum d'àudio.
// Sense geometria ni WebAudio mentre el depurador no està activat.
window.HUNTER_STEALTH=(()=>{
  const CONFIG=window.HUNTER_ENEMY_PERCEPTION.CONFIG;
  const RADII=window.HUNTER_ENEMY_PERCEPTION.RADII;
  const events=[];let nextId=0;
  const debug={sight:false,noise:false};
  const enabled=()=>debug.sight||debug.hearing||debug.noise;
  const setLayer=(key,value)=>{if(Object.hasOwn(debug,key))debug[key]=!!value};
  const layers=()=>({...debug});
  function emit(kind,x,y,z,radius=RADII[kind]||0){
    if(!(radius>0)||!Number.isFinite(x)||!Number.isFinite(z))return null;
    // Un motor o una ràfega no han de crear desenes d'esdeveniments/frame.
    const old=events.findLast?.(e=>e.kind===kind&&e.age<.2&&
      Math.hypot(x-e.x,z-e.z)<9);
    if(old){old.id=++nextId;old.x=x;old.y=y;old.z=z;old.radius=radius;old.age=0;return old}
    const e={id:++nextId,kind,x,y,z,radius,age:0};events.push(e);
    if(events.length>36)events.splice(0,events.length-36);
    return e;
  }
  function tick(dt){for(let i=events.length-1;i>=0;i--)
    if((events[i].age+=dt)>.85)events.splice(i,1)}
  function clear(){events.length=0}
  function inView(heading,dx,dy,dz,range=CONFIG.sightRange){return window.HUNTER_SHARED_COMBAT.inView(heading,dx,dy,dz,range,CONFIG)}
  function heardAt(x,y,z,lastId=0,attenuation=()=>1){
    let choice=null,best=-Infinity;
    for(const noise of events){
      if(noise.id<=lastId)continue;
      const d=Math.hypot(x-noise.x,z-noise.z);
      if(d>noise.radius)continue;
      const factor=attenuation(noise);
      if(d>noise.radius*factor)continue;
      const score=noise.radius*factor-d;
      if(score>best){choice=noise;best=score}
    }
    return choice;
  }
  return Object.freeze({CONFIG,RADII,emit,tick,clear,inView,heardAt,
    events:()=>events,enabled,layers,setLayer,setDebug:v=>{for(const key of Object.keys(debug))debug[key]=!!v}});
})();
