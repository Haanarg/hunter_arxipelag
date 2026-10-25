// Presoners civils: rescat opcional i reparació exclusivament al mecànic alliberat.
// No consumeix R()/Math.random ni afegeix civils a la llista d'enemics.
window.HUNTER_PRISONERS=Object.freeze({
 create({THREE:T,heightAt=()=>0,canMove=()=>true,clearLine=()=>true,
   notify=()=>{},sound=()=>{},vehicleRadius=()=>4,vehicleName=v=>v.t}={}){
  const entities=[],resources=new Set();
  let world=null,camp=null,rescuePoint=null,station=null,escapeRoute=[],
    discovered=false,released=false,repair=null,lastContext=null,serial=0;
  const config=Object.freeze({discoverRange:80,rescueRange:6,personRange:9,
    maxServiceRange:32,repairSeconds:6,walkSpeed:3.2,mechanicSpeed:2.8});
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
   escapeRoute=[];discovered=false;released=false;repair=null;lastContext=null;serial++;
  }
  function createModels(){
   const cube=own(new T.BoxGeometry(1,1,1)),head=own(new T.SphereGeometry(.18,7,5)),
     hat=own(new T.CylinderGeometry(.31,.34,.055,8)),
     mat=hex=>own(new T.MeshStandardMaterial({color:hex,roughness:.9,flatShading:true})),
     skin=mat(0xba8b63),farmer=mat(0xd8cba7),trousers=mat(0x665642),
     overall=mat(0x3d6980),boots=mat(0x363932),straw=mat(0xb49a58),
     tool=mat(0xa8b3b1),belt=mat(0x795332);
   function mesh(parent,geometry,material,w,h,d,x,y,z){
    const o=new T.Mesh(geometry,material);o.scale.set(w,h,d);o.position.set(x,y,z);
    o.castShadow=true;parent.add(o);return o;
   }
   return u=>{
    const root=new T.Group(),mechanic=u.role==='mechanic',shirt=mechanic?overall:farmer;
    root.name='hunter-prisoner-'+u.id;
    mesh(root,cube,shirt,.51,.55,.29,0,1.08,0);
    mesh(root,cube,belt,.52,.09,.31,0,.85,0);
    mesh(root,head,skin,1,1,1,0,1.57,0);
    if(mechanic){
     mesh(root,cube,overall,.36,.12,.34,0,1.75,-.015);
     mesh(root,cube,tool,.055,.32,.055,.29,.79,-.02);
     mesh(root,cube,tool,.19,.055,.055,.29,.95,-.02);
     mesh(root,cube,farmer,.11,.16,.025,-.13,1.22,-.158);
    }else mesh(root,hat,straw,1,1,1,0,1.75,0);
    const legs=[],arms=[];
    for(const side of[-1,1]){
     const leg=new T.Group();leg.position.set(side*.14,.82,0);root.add(leg);
     mesh(leg,cube,mechanic?overall:trousers,.20,.64,.24,0,-.32,0);
     mesh(leg,cube,boots,.22,.16,.33,0,-.68,-.04);legs.push(leg);
     const arm=new T.Group();arm.position.set(side*.34,1.30,0);root.add(arm);
     mesh(arm,cube,shirt,.16,.35,.20,0,-.15,0);
     mesh(arm,cube,skin,.14,.25,.16,0,-.43,0);arms.push(arm);
    }
    root.userData.civilian=true;root.userData.prisonerId=u.id;
    u.legs=legs;u.arms=arms;return root;
   };
  }
  function configure({world:nextWorld,camp:nextCamp,logicalOnly=false}={}){
   reset();world=nextWorld||null;camp=nextCamp||null;
   if(!world||!camp?.layout)return;
   rescuePoint=localPoint(camp.layout.rescuePoint||{x:0,z:8});
   station=localPoint(camp.layout.mechanicStation||{x:33,z:16});
   escapeRoute=(camp.layout.escapeRoute||[[0,8],[0,30],[0,62],[0,86]]).map(localPoint);
   const model=logicalOnly?null:createModels();
   let mechanicAdded=false;
   for(const spec of camp.layout.prisoners||[]){
    if(spec.role==='mechanic'&&mechanicAdded)continue;
    const role=spec.role==='mechanic'?'mechanic':'farmer';if(role==='mechanic')mechanicAdded=true;
    const p=localPoint(spec),u={t:'civilian',civilian:true,friendly:true,id:spec.id,
      role,...p,hp:4,maxHp:4,radius:.55,height:1.85,state:'captive',
      destroyed:false,path:[],waypoint:0,phase:0,blocked:0,following:false,followWarning:false,o:null};
    if(model){u.o=model(u);u.o.position.set(u.x,u.y,u.z);u.o.visible=false;world.add(u.o)}
    entities.push(u);
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
   if(!alive(u)||u.state!=='ready'||!v||v.destroyed||!(ctx.vehicles||[]).includes(v))return false;
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
  function getAction(ctx=lastContext){
   if(!validContext(ctx)||ctx.canInteract===false||!camp||!discovered)return null;
   if(!released){
    if(ctx.vehicle||!entities.some(alive)||!visiblePoint(ctx,rescuePoint,config.rescueRange))return null;
    return{kind:'rescue',label:'Alliberar presoners',icon:'🔓',target:camp,serial};
   }
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
   if(action.kind==='rescue'){
    if(danger(ctx)){notify('Allunya els guàrdies abans d’alliberar-los.');return true}
    released=true;
    let farmerIndex=0;
    const c=Math.round(Math.cos(camp.angle||0)),s=Math.round(Math.sin(camp.angle||0));
    for(const u of entities){
     if(!alive(u))continue;
     if(u.role==='mechanic'){
      u.path=[{...rescuePoint},{...station}];u.state='to-station';
     }else{
      const lane=(farmerIndex++-1.5)*1.5;
      u.path=escapeRoute.map(p=>({...p,x:p.x+lane*c,z:p.z+lane*s}));u.state='evacuating';
     }
     u.waypoint=0;
    }
    notify('Presoners alliberats. El mecànic va al taller.');sound('pick',.55,rescuePoint);
    return true;
   }
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
   const walking=u.path.length>0&&u.blocked===0,
     stride=walking?Math.sin(u.phase)*.58:0;
   for(let i=0;i<u.legs.length;i++)u.legs[i].rotation.x=(i?-1:1)*stride;
   for(let i=0;i<u.arms.length;i++){
    u.arms[i].rotation.x=(i?1:-1)*stride*.65;
    u.arms[i].rotation.z=u.state==='captive'?(i?-1:1)*.22:0;
   }
   if(repair?.mechanic===u){u.arms[0].rotation.x=-1.1+Math.sin(repair.progress*14)*.18;u.arms[1].rotation.x=-.7}
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
    discovered=true;notify('Camp de presoners descobert.');
   }
   const step=Math.max(0,Math.min(.25,Number.isFinite(dt)?dt:0));
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
     label:entities.some(alive)?'Camp de presoners':'Camp de presoners buit',state:entities.some(alive)?'captive':'lost'});
   if(released&&u)result.push({kind:'mechanic',x:u.x,z:u.z,
    label:u.state==='ready'?'Mecànic · reparacions':'Mecànic alliberat',state:u.following?'following':u.state});
   return result;
  }
  function snapshot(){
   return{configured:!!camp,discovered,released,
    entities:entities.map(u=>({id:u.id,role:u.role,state:u.state,hp:u.hp,x:u.x,y:u.y,z:u.z,waypoint:u.waypoint,blocked:u.blocked,following:u.following})),
    repair:repair?{vehicle:repair.vehicle.t,progress:repair.progress,duration:config.repairSeconds}:null};
  }
  return Object.freeze({configure,reset,update,getAction,interact,markers,hurt,snapshot,entities,config});
 }
});
