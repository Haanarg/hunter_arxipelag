// Percepció compartida: els sons són esdeveniments de joc, no volum d'àudio.
// Sense geometria ni WebAudio mentre el depurador no està activat.
window.HUNTER_STEALTH=(()=>{
  const CONFIG=Object.freeze({sightRange:85,sightHalfAngle:Math.PI*50/180,
    sightVerticalAngle:Math.PI*33/180,hearingReference:25,searchSeconds:9,
    investigateSeconds:11,closeRecognition:4,crouchVisibility:.58});
  const RADII=Object.freeze({walk:7,run:25,crouch:2,swim:12,knife:3,cutters:3,
    door:10,pistol:140,sniper:220,bazooka:250,rifle:160,explosion:300,
    bicycle:5,motorbike:90,car:70,truck:130,tank:130,apc:120,
    rowboat:5,windsurf:5,jetski:100,speedboat:120,ferry:125,
    helicopter:250,collision:100,grenade:7});
  const events=[];let nextId=0,enabled=false;
  function emit(kind,x,y,z,radius=RADII[kind]||0){
    if(!(radius>0)||!Number.isFinite(x)||!Number.isFinite(z))return null;
    // Un motor o una ràfega no han de crear desenes d'esdeveniments/frame.
    const old=events.findLast?.(e=>e.kind===kind&&e.age<.2&&
      Math.hypot(x-e.x,z-e.z)<9);
    if(old){old.x=x;old.y=y;old.z=z;old.radius=radius;old.age=0;return old}
    const e={id:++nextId,kind,x,y,z,radius,age:0};events.push(e);
    if(events.length>36)events.splice(0,events.length-36);
    return e;
  }
  function tick(dt){for(let i=events.length-1;i>=0;i--)
    if((events[i].age+=dt)>.85)events.splice(i,1)}
  function clear(){events.length=0}
  function inView(heading,dx,dy,dz,range=CONFIG.sightRange){
    const horizontal=Math.hypot(dx,dz),dist=Math.hypot(horizontal,dy);
    if(dist>range||horizontal<.001)return false;
    // El model avança cap a -Z, amb hd com a rotació mundial de Y.
    const forward=(-Math.sin(heading)*dx-Math.cos(heading)*dz)/horizontal;
    return forward>=Math.cos(CONFIG.sightHalfAngle)&&
      Math.abs(Math.atan2(dy,horizontal))<=CONFIG.sightVerticalAngle;
  }
  function heardAt(x,y,z,lastId=0,attenuation=()=>1){
    let choice=null,best=-Infinity;
    for(const noise of events){
      if(noise.id<=lastId)continue;
      const d=Math.hypot(x-noise.x,y-noise.y,z-noise.z);
      if(d>noise.radius)continue;
      const factor=attenuation(noise);
      if(d>noise.radius*factor)continue;
      const score=noise.radius*factor-d;
      if(score>best){choice=noise;best=score}
    }
    return choice;
  }
  return Object.freeze({CONFIG,RADII,emit,tick,clear,inView,heardAt,
    events:()=>events,enabled:()=>enabled,setDebug:v=>(enabled=!!v)});
})();
