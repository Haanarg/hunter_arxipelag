// Presoners civils: rescat opcional i reparació exclusivament al mecànic alliberat.
// No consumeix R()/Math.random ni afegeix civils a la llista d'enemics.
window.HUNTER_PRISONERS=Object.freeze({
 create({THREE:T,heightAt=()=>0,canMove=()=>true,clearLine=()=>true,
   notify=()=>{},sound=()=>{},onRescue=()=>{},vehicleRadius=()=>4,vehicleName=v=>v.t}={}){
  const entities=[],resources=new Set();
  let world=null,camp=null,rescuePoint=null,station=null,escapeRoute=[],mechanicRoute=[],
    discovered=false,released=false,repair=null,lastContext=null,serial=0,cheerNotified=false;
  const config=Object.freeze({discoverRange:80,rescueRange:6,personRange:9,
    maxServiceRange:32,repairSeconds:6,walkSpeed:3.2,mechanicSpeed:2.8,
    // Upright protagonist mesh (compact D head, 1.2 baked units × 2/3 scale).
    standingHeight:2.84648});
  const own=r=>(resources.add(r),r),alive=u=>!!u&&u.hp>0&&!u.destroyed;
  const position=o=>({x:o.x,y:Number.isFinite(o.y)?o.y:
    (o.t==='heli'||o.t==='heli_combat')&&Number.isFinite(o.alt)?o.alt:o.o?.position?.y??0,z:o.z});
  const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y??0)-(b.y??0),a.z-b.z);
  const eye=(o,lift=1.5)=>{const p=position(o);p.y+=lift;return p};
  function localPoint(p){
   const angle=camp.angle||0,c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle)),
     x=Array.isArray(p)?p[0]:p.x,z=Array.isArray(p)?p[1]:p.z,
     wx=camp.x+x*c-z*s,wz=camp.z+x*s+z*c;
   return{x:wx,y:heightAt(wx,wz),z:wz};
  }
  function reset(){
   for(const u of entities)u.o?.removeFromParent();
   for(const resource of resources)resource.dispose?.();
   resources.clear();entities.length=0;world=camp=rescuePoint=station=null;
   escapeRoute=[];mechanicRoute=[];discovered=false;released=false;repair=null;lastContext=null;cheerNotified=false;serial++;
  }
  // Low-poly humans with anatomically shaped torsos, faces, clothing,
  // articulated arms and proper shoes. All geometry is shared across NPCs.
  function createModels(){
   const cube=own(new T.BoxGeometry(1,1,1)),
     head=own(new T.SphereGeometry(.18,12,10)),
     joint=own(new T.SphereGeometry(.12,10,8)),
     torso=own(new T.CylinderGeometry(.295,.245,.57,10)),
     upperLeg=own(new T.CylinderGeometry(.12,.096,.37,9)),
     lowerLeg=own(new T.CylinderGeometry(.10,.077,.35,9)),
     sleeve=own(new T.CylinderGeometry(.105,.083,.36,9)),
     forearm=own(new T.CylinderGeometry(.083,.066,.26,9)),
     collar=own(new T.CylinderGeometry(.115,.14,.085,10)),
     brim=own(new T.CylinderGeometry(.31,.34,.055,10)),
     cap=own(new T.CylinderGeometry(.28,.29,.12,10)),
     eye=own(new T.SphereGeometry(.035,8,6)),
     nose=own(new T.ConeGeometry(.047,.12,7)),
     hairCap=own(new T.SphereGeometry(.183,12,6,0,Math.PI*2,0,Math.PI*.46)),
     mat=hex=>own(new T.MeshStandardMaterial({color:hex,roughness:.93,flatShading:true})),
     skin=[mat(0xc59168),mat(0xa87354),mat(0xdbac7f),mat(0x976348),mat(0xc89370)],
     shirts=[mat(0xb9aa87),mat(0x7a846b),mat(0x8c795e),mat(0x9b8f77)],
     pants=[mat(0x655f51),mat(0x545746),mat(0x635747)],
     overall=mat(0x3c6578),overallDark=mat(0x263f50),
     boots=mat(0x333b38),straw=mat(0xb49b65),hair=mat(0x4c392f),
     metal=mat(0xa8b3b1),belt=mat(0x514338),white=mat(0xd4cabb),eyes=mat(0x242a2a);
   function mesh(parent,geometry,material,w,h,d,x,y,z){
    const o=new T.Mesh(geometry,material);o.scale.set(w,h,d);o.position.set(x,y,z);
    o.castShadow=true;parent.add(o);return o;
   }
   return u=>{
    const root=new T.Group(),rig=new T.Group(),mechanic=u.role==='mechanic',
      variant=Number((u.id||'').match(/\\d+/)?.[0]||0),shirt=mechanic?overall:shirts[variant%shirts.length],
      trousers=mechanic?overallDark:pants[variant%pants.length],tone=skin[variant%skin.length];
    root.name='hunter-prisoner-'+u.id;root.add(rig);u.rig=rig;
    // Torso narrows to the waist; shoulders/neck and layered collar
    // prevent the rectangular toy-like silhouette of the old model.
    mesh(rig,torso,shirt,1,1,.92,0,1.085,0);
    mesh(rig,joint,shirt,2.15,.72,1.2,0,1.33,0);
    mesh(rig,collar,mechanic?white:shirt,1,1,1,0,1.398,0);
    mesh(rig,cube,belt,.49,.068,.31,0,.834,0);
    mesh(rig,joint,trousers,2.04,.88,1.24,0,.805,0);
    // Head with a neck, ears, nose, eyes, eyebrows and distinct hairstyles.
    mesh(rig,collar,tone,.58,.9,.62,0,1.417,0);
    const face=mesh(rig,head,tone,1,.99,.93,0,1.57,0);
    u.head=face;
    for(const side of[-1,1]){
     mesh(rig,joint,tone,.5,.66,.50,side*.18,1.57,0);
     mesh(rig,eye,eyes,1,1,1,side*.065,1.585,-.167);
     mesh(rig,cube,hair,.064,.022,.019,side*.067,1.638,-.165);
    }
    mesh(rig,nose,tone,.8,.7,.8,0,1.535,-.181);
    if(mechanic){
     mesh(rig,hairCap,hair,1,1,1,0,1.616,0);
     // Work cap, peak, pockets and a wrench secured to the overalls.
     mesh(rig,cap,overallDark,1,1,1,0,1.75,0);
     mesh(rig,cube,overallDark,.23,.022,.18,0,1.70,-.25);
     for(const side of[-1,1])mesh(rig,cube,overallDark,.12,.15,.017,side*.13,1.09,-.259);
     mesh(rig,cube,metal,.052,.30,.052,.28,.83,-.02);
     mesh(rig,cube,metal,.18,.052,.052,.28,.95,-.02);
     mesh(rig,cube,white,.11,.13,.025,-.12,1.19,-.267);
    }else{
     mesh(rig,hairCap,hair,1,1,1,0,1.58,0);
     mesh(rig,brim,straw,1,1,1,0,1.75,0);
     mesh(rig,cube,straw,.42,.12,.32,0,1.69,0);
     mesh(rig,cube,trousers,.18,.10,.07,0,1.255,-.231); // torn shirt opening
    }
    const legs=[],arms=[];
    for(const side of[-1,1]){
     const leg=new T.Group();leg.position.set(side*.14,.82,0);rig.add(leg);
     mesh(leg,upperLeg,trousers,1,1,1,0,-.20,0);
     mesh(leg,joint,trousers,.84,.78,.94,0,-.385,0);
     mesh(leg,lowerLeg,trousers,1,1,1,0,-.51,0);
     mesh(leg,cube,boots,.22,.16,.34,0,-.68,-.045);
     mesh(leg,joint,boots,1.05,.62,1.32,0,-.685,-.105);
     legs.push(leg);
     const arm=new T.Group();arm.position.set(side*.34,1.30,0);rig.add(arm);
     mesh(arm,joint,shirt,1,.94,1.0,0,-.045,0);
     mesh(arm,sleeve,shirt,1,1,1,0,-.20,0);
     mesh(arm,joint,tone,.65,.65,.65,0,-.375,0);
     mesh(arm,forearm,tone,1,1,1,0,-.42,0);
     mesh(arm,joint,tone,.69,.55,.73,0,-.515,0);
     arms.push(arm);
    }
    root.userData.civilian=true;root.userData.prisonerId=u.id;
    root.scale.setScalar(u.modelScale);
    u.legs=legs;u.arms=arms;return root;
   };
  }
  function pose(u,seated=false){
   // The seat is the pelvis at ground level, with straight legs on the ground.
   // Keep the root at the world foot point: movement and projectile bounds share it.
   u.pose=seated?'seated':'standing';
   u.height=seated?(u.role==='mechanic'?1.115:1.0825)*u.modelScale:config.standingHeight;
   u.radius=(u.cheering?.92:seated?.76:.56)*u.modelScale;
   if(!u.o)return;
   u.rig.position.y=seated?-.695:-.06;
   for(let i=0;i<u.legs.length;i++)u.legs[i].rotation.x=seated?Math.PI/2:0;
   for(let i=0;i<u.arms.length;i++){
    u.arms[i].rotation.x=seated?-.5:0;
    u.arms[i].rotation.z=u.state==='captive'?(i?-1:1)*.22:0;
   }
   u.o.userData.pose=u.pose;
  }
  function configure({world:nextWorld,camp:nextCamp,logicalOnly=false}={}){
   reset();world=nextWorld||null;camp=nextCamp||null;
   if(!world||!camp?.layout)return;
   rescuePoint=localPoint(camp.layout.rescuePoint||{x:0,z:8});
   station=localPoint(camp.layout.mechanicStation||{x:33,z:16});
   escapeRoute=(camp.layout.escapeRoute||[[0,8],[0,30],[0,62],[0,86]]).map(localPoint);
   mechanicRoute=(camp.layout.mechanicRoute||[camp.layout.rescuePoint||{x:0,z:8},
    camp.layout.mechanicStation||{x:33,z:16}]).map(localPoint);
   const model=logicalOnly?null:createModels();
   let mechanicAdded=false,farmerIndex=0;
   for(const spec of camp.layout.prisoners||[]){
    if(spec.role==='mechanic'&&mechanicAdded)continue;
    const role=spec.role==='mechanic'?'mechanic':'farmer';if(role==='mechanic')mechanicAdded=true;
    const p=localPoint(spec),u={t:'civilian',civilian:true,friendly:true,id:spec.id,
      role,...p,hp:4,maxHp:4,radius:.55,height:config.standingHeight,state:'captive',
      modelScale:config.standingHeight/(role==='mechanic'?1.75:1.7175),
      captivePose:spec.pose||(role==='farmer'&&farmerIndex++%2===1?'seated':'standing'),
      destroyed:false,path:[],waypoint:0,phase:0,blocked:0,following:false,followWarning:false,
      cheering:false,cheerPhase:farmerIndex*.9,o:null};
    if(model){u.o=model(u);u.o.position.set(u.x,u.y,u.z);u.o.visible=false;world.add(u.o)}
    pose(u,u.captivePose==='seated');entities.push(u);
   }
  }
  function mechanic(){return entities.find(u=>u.role==='mechanic'&&alive(u))||null}
  function observer(ctx){return ctx?.vehicle||ctx?.player}
  function visiblePoint(ctx,p,range){
   const q=observer(ctx);
   return !!q&&distance(position(q),p)<=range&&clearLine(eye(q),{x:p.x,y:p.y+1.2,z:p.z});
  }
  function danger(ctx,at=observer(ctx)){
   if(!at)return true;
   const p=position(at);
   for(const u of ctx.enemies||[]){
    if(!alive(u))continue;
    const q=position(u),d=distance(p,q);
    if(d>70)continue;
    if((u.canSee||u.aiMode==='combat'&&d<32||d<7)&&clearLine(eye(u,2),eye(at)))return true;
   }
   return false;
  }
  const validContext=ctx=>!!ctx?.active&&!!ctx.player;
  function serviceRange(v){return Math.min(config.maxServiceRange,Math.max(7,(vehicleRadius(v.t)||4)+5))}
  function serviceVehicle(v,ctx,u,{requireDamage=true}={}){
   if(ctx.canInteract===false)return false;
   if(!alive(u)||u.state!=='ready'||!v||v.destroyed||v.sunk||v.waterIngress?.dead||!(ctx.vehicles||[]).includes(v))return false;
   if(!Number.isFinite(v.life)||!Number.isFinite(v.maxLife)||v.maxLife<=0||v.life<=0)return false;
   if(requireDamage&&v.life>=v.maxLife)return false;
   if(Math.abs(v.v||0)>.35||Math.abs(v.strafeV||0)>.35||Math.abs(v.vy||0)>.35)return false;
   const q=position(v),limit=serviceRange(v);
   // Aircraft must be landed; a big hull does not permit repair from the air.
   if(Math.abs(q.y-u.y)>3.8||Math.hypot(v.x-u.x,v.z-u.z)>limit)return false;
   const p=position(observer(ctx));
   if(ctx.vehicle&&ctx.vehicle!==v)return false;
   if(!ctx.vehicle&&Math.hypot(p.x-u.x,p.z-u.z)>config.personRange)return false;
   if(Math.abs(p.y-u.y)>3.8||!clearLine(eye(u),eye(v,1)))return false;
   return !danger(ctx)&&!danger(ctx,u);
  }
  function repairTarget(ctx,u){
   if(ctx.vehicle)return serviceVehicle(ctx.vehicle,ctx,u)?ctx.vehicle:null;
   let target=null,best=Infinity;
   for(const v of ctx.vehicles||[]){
    if(!serviceVehicle(v,ctx,u))continue;
    const d=Math.hypot(v.x-u.x,v.z-u.z);
    if(d<best){best=d;target=v}
   }
   return target;
  }
  // Physical campaign goal: all six guards and four towers must be
  // neutralised AND at least one segment of the INNER enclosure destroyed.
  // The original E-on-a-specific-gate shortcut is intentionally removed.
  function rescueStatus(ctx){
   const troops=new Set([...(camp?.soldiers||[]),...(camp?.towers||[]),
     ...(ctx?.enemies||[]).filter(u=>u.compound===camp?.id)]);
   let guards=0,towers=0;
   for(const u of troops){
    if(!alive(u))continue;
    if(u.t==='torre')towers++;
    else if(u.t==='soldat')guards++;
   }
   const gaps=(camp?.prisonFenceSegments||[])
     .filter(s=>s?.collider&&(s.collider.hp<=0||s.collider.open));
   const gate=camp?.prisonGate;
   // Compatibility with saved layouts that have a gate but no section index.
   if(!camp?.prisonFenceSegments?.length&&gate?.colliders?.some(w=>w.hp<=0||w.open))
    gaps.push({collider:gate.colliders[0],gate:true});
   return{guards,towers,breach:gaps.length>0,gaps};
  }
  function routeThroughBreach(entry){
   const w=entry.collider,wx=(w.ax+w.bx)*.5,wz=(w.az+w.bz)*.5,
     c=Math.round(Math.cos(camp.angle||0)),s=Math.round(Math.sin(camp.angle||0)),
     x=(wx-camp.x)*c+(wz-camp.z)*s,
     z=-(wx-camp.x)*s+(wz-camp.z)*c,
     side=x<0?-1:1;
   let exit;
   // Approach the hole perpendicularly and never use an intact section.
   if(z<=-9.5)exit=[[x,z+3],[x,z-3.5],[side*26,-16],[side*26,30],[0,37]];
   else if(Math.abs(x)>=19.5)exit=[[x-side*3,z],[x+side*3.5,z],[side*26,30],[0,37]];
   else exit=[[x,z-3],[x,z+3.5],[x,32],[0,37]];
   return exit.map(localPoint);
  }
  function releaseCaptives(ctx,status){
   if(released||!status.breach||status.guards||status.towers||!entities.some(alive))return;
   // Prefer a front/gate gap when there are several: fewer corners for
   // unarmed NPCs and a clean approach to the single outer exit.
   const best=status.gaps.slice().sort((a,b)=>{
    const score=e=>{
     const w=e.collider,cx=(w.ax+w.bx)*.5,cz=(w.az+w.bz)*.5,
       dx=cx-camp.x,dz=cz-camp.z,
       c=Math.round(Math.cos(camp.angle||0)),s=Math.round(Math.sin(camp.angle||0));
     return Math.hypot(dx*c+dz*s,(-dx*s+dz*c)-24);
    };
    return score(a)-score(b);
   })[0];
   const exit=routeThroughBreach(best),farmersEnd=escapeRoute.slice(-2);
   released=true;
   let index=0;
   for(const u of entities){
    if(!alive(u))continue;
    if(u.role==='mechanic'){
     u.path=[...exit,...(camp.layout.mechanicAccess||[[33,36],[33,16]]).map(localPoint)];u.state='to-station';
    }else{
     // A small stagger avoids prisoners occupying exactly the same spot.
     u.path=[...exit,...farmersEnd];u.state='evacuating';u.phase=index++*.7;
    }
    u.cheering=false;pose(u,false);u.waypoint=0;
   }
   discovered=true;
   onRescue(entities.filter(alive).length);
   notify('Camp alliberat! Els presoners escapen per la bretxa; el mecànic va al taller.');
   sound('pick',.5,rescuePoint);
  }
  function getAction(ctx=lastContext){
   if(!validContext(ctx)||ctx.canInteract===false||!camp||!discovered||!released)return null;
   const u=mechanic();if(!u||u.state!=='ready')return null;
   if(repair){
    if(!serviceVehicle(repair.vehicle,ctx,u,{requireDamage:false}))return null;
    return{kind:'repair',label:'Reparant '+Math.floor(repair.progress/config.repairSeconds*100)+'% · cancel·lar',
      icon:'🔧',target:repair.vehicle,serial};
   }
   const v=repairTarget(ctx,u);
   if(v)return{kind:'repair',label:'Reparar '+vehicleName(v),icon:'🔧',target:v,serial};
   if(!ctx.vehicle&&distance(position(ctx.player),position(u))<4&&clearLine(eye(ctx.player),eye(u)))
    return{kind:'mechanicFollow',label:u.following?'Mecànic: espera aquí':'Mecànic: segueix-me',icon:'🔧',target:u,serial};
   return null;
  }
  function stopRepair(message=null){
   if(!repair)return;
   repair=null;if(message)notify(message);
  }
  function interact(action,ctx=lastContext){
   if(!validContext(ctx)||ctx.canInteract===false||!action||action.serial!==serial)return false;
   const current=getAction(ctx);
   if(!current||current.kind!==action.kind||current.target!==action.target)return false;
   if(action.kind==='mechanicFollow'){
    const u=action.target;u.following=!u.following;u.path=[];u.followWarning=false;
    notify(u.following?'El mecànic et segueix a peu.':'El mecànic espera aquí.');return true;
   }
   if(repair){stopRepair('Reparació cancel·lada.');return true}
   const u=mechanic(),v=action.target;
   if(!serviceVehicle(v,ctx,u))return false;
   u.following=false;u.path=[];
   repair={vehicle:v,life:v.life,maxLife:v.maxLife,progress:0,x:v.x,z:v.z,
     y:position(v).y,mechanic:u};
   notify('El mecànic repara el vehicle. Mantén-lo aturat.');return true;
  }
  function follow(u,ctx){
   if(!u.following||!alive(u)||u.state!=='ready')return;
   // El jugador el guia caminant; el mecànic no embarca ni persegueix vehicles.
   if(ctx.vehicle||distance(position(ctx.player),position(u))<=3){u.path=[];return}
   const p=ctx.player,hd=p.hd||0,x=p.x+Math.sin(hd)*2.5,z=p.z+Math.cos(hd)*2.5;
   u.path=[{x,y:heightAt(x,z),z}];u.waypoint=0;
  }
  function move(u,dt){
   if(!alive(u)||!u.path.length||u.waypoint>=u.path.length)return;
   const goal=u.path[u.waypoint],dx=goal.x-u.x,dz=goal.z-u.z,d=Math.hypot(dx,dz),
     speed=u.role==='mechanic'?config.mechanicSpeed:config.walkSpeed;
   if(d<.18){
    u.waypoint++;
    if(u.waypoint>=u.path.length){u.state=u.role==='mechanic'?'ready':'rescued';u.path=[];u.phase=0;return}
    return;
   }
   const step=Math.min(d,speed*dt),next={x:u.x+dx/d*step,z:u.z+dz/d*step,y:u.y};
   next.y=heightAt(next.x,next.z);
   if(next.y<.05||!canMove(position(u),next,u.radius)){
    u.blocked+=dt;
    if(u.following&&u.blocked>1.5&&!u.followWarning){
     u.followWarning=true;notify('El mecànic no pot passar. Guia’l per terra ferma.');
    }
    return;
   }
   u.blocked=0;u.followWarning=false;u.x=next.x;u.y=next.y;u.z=next.z;u.phase+=step*3.7;
   if(u.o){u.o.position.set(u.x,u.y,u.z);u.o.rotation.y=Math.atan2(-dx,-dz)}
  }
  function animate(u,dt){
   if(!u.o||!alive(u))return;
   if(u.state==='captive'){
    pose(u,u.captivePose==='seated');
    if(u.cheering){
     u.cheerPhase+=dt*5;
     const wave=Math.sin(u.cheerPhase)*.26;
     for(let i=0;i<u.arms.length;i++){
      u.arms[i].rotation.z=(i?1:-1)*(2.05+wave*.5);
      u.arms[i].rotation.x=Math.sin(u.cheerPhase*.7+i)*.19;
     }
     if(u.head)u.head.rotation.y=Math.sin(u.cheerPhase*.35)*.17;
    }
    return;
   }
   const walking=dt>0&&u.path.length>0&&u.blocked===0,
     stride=walking?Math.sin(u.phase)*.58:0;
   for(let i=0;i<u.legs.length;i++)u.legs[i].rotation.x=(i?-1:1)*stride;
   for(let i=0;i<u.arms.length;i++){
    u.arms[i].rotation.x=(i?1:-1)*stride*.65;
    u.arms[i].rotation.z=0;
   }
   if(repair?.mechanic===u){u.arms[0].rotation.x=-1.1+Math.sin(repair.progress*14)*.18;u.arms[1].rotation.x=-.7}
   else if(u.role==='mechanic'&&u.state==='ready'&&!u.following){
    // Idle workshop behaviour: the rescued mechanic inspects his tools.
    u.arms[0].rotation.x=-.45+Math.sin(u.phase)*.10;
    u.arms[1].rotation.x=-.22;
    u.phase+=dt*1.5;
   }
  }
  function update(dt,ctx){
   lastContext=ctx;
   const view=observer(ctx),visualRange=Math.max(1,Number(ctx?.visualRange)||400);
   for(const u of entities)if(u.o)
    u.o.visible=!!view&&distance(position(view),position(u))<visualRange;
   if(!validContext(ctx)){
    stopRepair();return;
   }
   if(ctx.canInteract===false)stopRepair();
   if(!camp)return;
   if(!discovered&&visiblePoint(ctx,rescuePoint,config.discoverRange)){
    discovered=true;notify('Camp de presoners: elimina els guàrdies i les torres; obre una bretxa a la tanca interior.');
   }
   const step=Math.max(0,Math.min(.25,Number.isFinite(dt)?dt:0));
   // The wire mesh is transparent to the captives' perception. Looking at
   // the rescuer makes them wave and call encouragement even while locked up.
   let greeted=false;
   for(const u of entities)if(alive(u)&&u.state==='captive'){
    const p=position(observer(ctx));
    u.cheering=distance(p,position(u))<32&&Math.abs(p.y-u.y)<8;
    greeted ||= u.cheering;
   }
   if(greeted&&!cheerNotified){
    cheerNotified=true;notify('Els presoners et veuen i t’animen: «Som aquí! Allibera’ns!»');
   }
   if(!released)releaseCaptives(ctx,rescueStatus(ctx));
   for(const u of entities){follow(u,ctx);move(u,step);animate(u,step)}
   if(repair){
    const v=repair.vehicle,u=repair.mechanic,p=position(v),
      changed=v.life!==repair.life||v.maxLife!==repair.maxLife||
       Math.hypot(v.x-repair.x,v.z-repair.z)>.3||Math.abs(p.y-repair.y)>.3;
    if(changed||!serviceVehicle(v,ctx,u)){
     stopRepair('Reparació interrompuda.');return;
    }
    repair.progress+=step;
    if(repair.progress>=config.repairSeconds){
     v.life=v.maxLife;repair=null;notify('Vehicle reparat.');sound('pick',.55,position(u));
    }
   }
  }
  function hurt(u,amount){
   if(!entities.includes(u)||!alive(u)||!Number.isFinite(amount)||amount<=0)return 0;
   const damage=Math.min(u.hp,Math.max(1,Math.ceil(amount)));u.hp-=damage;
   if(repair?.mechanic===u)stopRepair();
   if(u.hp<=0){
    u.hp=0;u.destroyed=true;u.state='dead';u.path=[];
    if(u.o){u.o.rotation.x=-Math.PI/2;u.o.position.y=u.y+.22}
    if(discovered&&u.role==='mechanic')notify('El mecànic ha mort. Ja no podrà reparar vehicles.');
   }
   return damage;
  }
  function markers(){
   if(!discovered||!camp)return[];
   const result=[],u=mechanic();
   if(!released)result.push({kind:'prison',x:rescuePoint.x,z:rescuePoint.z,
     label:entities.some(alive)?'Camp de presoners · destrueix defenses i tanca interior':'Camp de presoners buit',
     state:entities.some(alive)?'captive':'lost'});
   if(released&&u)result.push({kind:'mechanic',x:u.x,z:u.z,
    label:u.state==='ready'?'Mecànic · reparacions':'Mecànic alliberat',state:u.following?'following':u.state});
   return result;
  }
  function snapshot(){
   const status=rescueStatus(lastContext);
   return{configured:!!camp,discovered,released,
    rescue:{guards:status.guards,towers:status.towers,breach:status.breach},
    entities:entities.map(u=>({id:u.id,role:u.role,state:u.state,hp:u.hp,x:u.x,y:u.y,z:u.z,waypoint:u.waypoint,blocked:u.blocked,following:u.following,cheering:u.cheering})),
    repair:repair?{vehicle:repair.vehicle.t,progress:repair.progress,duration:config.repairSeconds}:null};
  }
  function exportSave(){
   return {discovered,released,cheerNotified,
    entities:entities.map(u=>({id:u.id,state:u.state,hp:u.hp,x:u.x,y:u.y,z:u.z,
      destroyed:u.destroyed,path:JSON.parse(JSON.stringify(u.path)),waypoint:u.waypoint,
      phase:u.phase,blocked:u.blocked,following:u.following,followWarning:u.followWarning,
      cheering:u.cheering,cheerPhase:u.cheerPhase,pose:u.pose,rotation:u.o?.rotation.y||0})),
    repair:repair?{mechanicId:repair.mechanic.id,vehicleId:repair.vehicle.saveId,progress:repair.progress}:null};
  }
  function validateSave(data){
   if(!data||typeof data.discovered!=='boolean'||typeof data.released!=='boolean'||
     !Array.isArray(data.entities)||data.entities.length!==entities.length||
     new Set(data.entities.map(u=>u.id)).size!==entities.length||data.entities.some(s=>
      !entities.some(u=>u.id===s.id)||!['captive','evacuating','to-station','ready','rescued','dead'].includes(s.state)||
      !['x','y','z','hp','waypoint','phase','blocked','rotation'].every(k=>Number.isFinite(s[k]))||
      !Array.isArray(s.path)||s.path.some(p=>!['x','y','z'].every(k=>Number.isFinite(p[k])))))
     throw new Error('Estat dels presoners invàlid.');
  }
  function importSave(data,vehicles=[]){
   validateSave(data);discovered=data.discovered;released=data.released;cheerNotified=data.cheerNotified;repair=null;
   for(const saved of data.entities){
    const u=entities.find(u=>u.id===saved.id),{id,pose:savedPose,rotation,...state}=saved;
    Object.assign(u,JSON.parse(JSON.stringify(state)));pose(u,savedPose==='seated');
    if(u.o){u.o.position.set(u.x,u.y,u.z);u.o.rotation.y=rotation;
     if(u.hp<=0){u.o.rotation.x=-Math.PI/2;u.o.position.y=u.y+.22;}}
   }
   // Repair is an ongoing action; preserve progress only with the original living mechanic and vehicle.
   if(data.repair){
    const u=entities.find(u=>u.id===data.repair.mechanicId),v=vehicles.find(v=>v.saveId===data.repair.vehicleId);
    if(alive(u)&&v&&!v.destroyed&&Number.isFinite(data.repair.progress))
      repair={mechanic:u,vehicle:v,progress:data.repair.progress,x:v.x,y:position(v).y,z:v.z,life:v.life,maxLife:v.maxLife};
   }
  }
  // El COOP usa els MATEIXOS cinc models i animacions del mode individual.
  // El servidor decideix la posició, la vida, la fugida i la reparació:
  // aquí només es projecta una còpia gràfica, sense IA local.
  function applyCoopState(shared,dt,viewer){
    if(!shared)return;
    discovered=!!shared.discovered;released=!!shared.released;
    const mechanicUnit=mechanic();
    repair=shared.repair&&mechanicUnit?
      {mechanic:mechanicUnit,progress:shared.repair.progress}:null;
    for(const row of shared.entities||[]){
      const u=entities.find(u=>u.id===row.id);if(!u)continue;
      const prior={x:u.x,z:u.z,state:u.state};
      u.x=row.x;u.y=row.y;u.z=row.z;u.hp=row.hp;u.state=row.state;
      u.following=!!row.following;u.phase=row.phase||0;u.cheering=false;
      // No es crida update(): tornaria a alliberar i moure presoners.
      if(row.state!==prior.state)pose(u,row.state==='captive'&&row.pose==='seated');
      u.path=[];
      if(!u.o)continue;
      const beforeX=u.o.position.x,beforeZ=u.o.position.z;
      if(u.hp<=0)u.o.position.set(u.x,u.y+.22,u.z);
      else{
        // Els presoners s'animen a 60–240 FPS encara que els paquets
        // autoritatius arribin només ~10 cops per segon.
        const smooth=1-Math.exp(-Math.max(0,dt)*15);
        u.o.position.set(beforeX+(u.x-beforeX)*smooth,
          u.o.position.y+(u.y-u.o.position.y)*smooth,
          beforeZ+(u.z-beforeZ)*smooth);
      }
      u.o.visible=!!viewer&&Math.hypot(viewer.x-u.x,viewer.z-u.z)<400;
      if(u.hp<=0){u.o.rotation.x=-Math.PI/2;continue;}
      u.o.rotation.x=0;
      const dx=u.o.position.x-beforeX,dz=u.o.position.z-beforeZ;
      if(Math.hypot(dx,dz)>.0005)u.o.rotation.y=Math.atan2(-dx,-dz);
      // Reutilitzam l'animació original, sense avançar la física.
      if(Math.hypot(dx,dz)>.0005){u.path=[{x:u.x+dx,z:u.z+dz}];u.blocked=0;}
      animate(u,Math.min(.12,Math.max(0,dt)));
      u.path=[];
    }
  }
  return Object.freeze({configure,reset,update,applyCoopState,getAction,interact,markers,hurt,snapshot,entities,config,exportSave,validateSave,importSave});
 }
});
