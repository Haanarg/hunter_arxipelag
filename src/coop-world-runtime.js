// Capture physical data only; never graphics, inventory or account credentials.
function captureCoopWorldGeometry(){
  if(!started||generationPromise||operationBusy)throw new Error('Cal un món generat abans de capturar la geometria.');
  return window.HUNTER_WORLD_ADAPTER.normalizeWorldGeometry({format:2,generatorVersion:OPERATION_GENERATOR_VERSION,
    seed:seed>>>0,mapScale:MAP_SCALE,islands,levels:terrainLevels,walls:Wl,
    trees:[...new Set([...TG.values()].flat())],stairs,piers,buildings:B,bunker:activeBunker?.basement?activeBunker:null,
    terminalRamps:(world?.userData.compounds||[]).filter(c=>c.loadingRamp).map(c=>terminalRampState(c.loadingRamp)).filter(Boolean)});
}
window.HUNTER_COOP_WORLD=Object.freeze({capture:captureCoopWorldGeometry,
  create:()=>window.HUNTER_WORLD_ADAPTER.createStaticWorldAdapter(captureCoopWorldGeometry())});

// Native multiplayer is a session of the original runtime, never another view.
// La derrota és autoritativa i idèntica als dos navegadors.
// A 0 HP el jugador encara pot ser reanimat; la mort és definitiva
// quan el Worker passa la missió a la fase «failed».
function showNativeCoopGameOver(session,state){
 if(state.phase!=='failed'||session.gameOver)return;
 session.gameOver=true;
 if(scopeActive)setSniperScope(false);
 cancelGrenadeCharge();
 const overlay=document.createElement('div');
 overlay.id='hunter-coop-game-over';
 overlay.style.cssText='position:fixed;inset:0;z-index:20000;background:#080c10e8;color:#f7f2ea;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center;padding:24px;font-family:system-ui,sans-serif';
 const heading=document.createElement('h1');heading.textContent='GAME OVER';
 heading.style.cssText='font-size:clamp(48px,11vw,120px);letter-spacing:.12em;color:#e7685e;text-shadow:0 5px 32px #000;margin:0';
 const reason=document.createElement('p');
 reason.textContent=state.players.some(p=>p.hp<=0)?'Un membre de l’equip ha mort. La missió ha acabat per a tots dos.':'La missió ha fracassat per a tots dos.';
 reason.style.cssText='font-size:clamp(18px,2.6vw,26px);max-width:640px;margin:0';
 const button=document.createElement('button');
 button.type='button';button.textContent='Tornar a la sala';
 button.style.cssText='padding:14px 28px;border-radius:10px;background:#355468;color:white;border:1px solid #82a0b7;font-size:18px;cursor:pointer';
 button.onclick=()=>{stopNativeCoop();paused=true;ui.show('coop');};
 overlay.append(heading,reason,button);document.body.appendChild(overlay);
}

const NATIVE_VEHICLE_POSE_KEYS=['x','y','z','hd','v','alt','verticalV','sideV','strafeV','driveInput','steerInput','yawRate'];
let nativeCoopSession=null;
// Els efectes visuals i la predicció no poden aturar el bucle de joc
// ni el canal de snapshots del cooperatiu.
function reportNativeCoopVisualError(error,part){
 const s=nativeCoopSession;
 if(!s)return;
 s.visualErrors=(s.visualErrors||0)+1;
 s.lastVisualError=String(error?.message||error);
 if(s.channel?.stats){
   s.channel.stats.visualErrors=s.visualErrors;
   s.channel.stats.lastVisualError=s.lastVisualError;
 }
 if(s.visualErrors<=5)console.error('Cooperatiu: error visual a '+part,error);
}
function nativeCoopInput(){
 if(!nativeCoopSession||nativeCoopSession.preparing||nativeCoopSession.gameOver||paused||document.hidden)return {forward:0,turn:0,strafe:0,run:false,interact:false};
 const controls=readPlayerControls(updateStrafeControls(),!cv&&!paused&&!scopeActive),{f:forward,tr:turn,strafe,ud:climb,running:run}=controls;
 const flying=!cv&&nativeCoopSession.state?.cheats?.fly;
 return {forward:scopeActive?0:forward,turn:scopeActive?0:turn,strafe:scopeActive?0:strafe,interact:!!K.KeyE&&!!nativeReviveAction(),run:!!run,crouch:!!playerCrouched,fire:!!K.KeyF&&(!grenadeEquipped||!!cv),...(flying?{climb:(K.KeyH||K.Space?1:0)-(K.KeyJ||K.ShiftLeft?1:0)}:cv&&VT[cv.t].m==='a'?{climb}:{})};
}
// La fase 2 hereta el camp, els cinc NPC i els relés que JA ha generat
// el joc individual. No consumeix cap tirada aleatòria suplementària.
function captureNativeCoopOptionals(){
 const camp=world?.userData?.prisonCamp,
       groups=world?.userData?.compounds||[],
       transform=p=>{
         const [x,z]=Array.isArray(p)?p:[p.x,p.z],
           angle=camp?.angle||0,c=Math.round(Math.cos(angle)),sn=Math.round(Math.sin(angle)),
           wx=(camp?.x||0)+x*c-z*sn,wz=(camp?.z||0)+x*sn+z*c;
         return {x:wx,y:hAt(wx,wz),z:wz};
       },
       units=prisonerSystem.entities,
       layouts=camp?.layout,
       relays=radioRelay.snapshot().relays;
 if(!camp||!layouts||units.length!==5)throw Error('Falten presoners a la missió original.');
 const prisonFenceIndexes=(camp.prisonFenceSegments||[])
   .map(entry=>Wl.indexOf(entry.collider)).filter(i=>i>=0);
 if(!prisonFenceIndexes.length)
   for(const w of camp.prisonGate?.colliders||[]){const i=Wl.indexOf(w);if(i>=0)prisonFenceIndexes.push(i);}
 const escape=(layouts.escapeRoute||[[0,8],[0,30],[0,62],[0,86]]).map(transform),
       mechanicAccess=(layouts.mechanicAccess||[[33,36],[33,16]]).map(transform);
 const sourceIds=new Map(groups.filter(c=>c.id==='comunicacions')
   .map(c=>[c.layoutId||c.id,c]));
 const hq=groups.find(c=>c.id==='hq'&&!c.layout?.friendly&&!c.layout?.civilian);
 return {
   prison:{id:camp.id||'prison-camp',x:camp.x,z:camp.z,angle:camp.angle||0,
     rescuePoint:transform(layouts.rescuePoint||{x:0,z:8}),
     mechanicStation:transform(layouts.mechanicStation||{x:33,z:16}),
     guardIds:[...(camp.soldiers||[]),...(camp.towers||[])].map(u=>u.saveId),
     fenceIndexes:prisonFenceIndexes,
     farmerEscape:escape,mechanicAccess,
     entities:units.map(u=>({id:u.id,role:u.role,x:u.x,y:u.y,z:u.z,
       hp:u.hp,state:u.state,pose:u.captivePose||'standing'}))},
   radio:relays.map(relay=>{
     const source=sourceIds.get(relay.sourceId)||groups.find(c=>c.id==='comunicacions'&&
       Math.hypot(c.x-relay.x,c.z-relay.z)<180),
       collider=Wl.findIndex(w=>w.owner?.kind==='radio-relay'&&
         Math.hypot((w.cx??(w.x0+w.x1)/2)-relay.x,
           (w.cz??(w.z0+w.z1)/2)-relay.z)<1);
     return {id:relay.id,x:relay.x,y:relay.y,z:relay.z,
       colliderIndex:collider,sourceIds:(source?.soldiers||[]).map(u=>u.saveId),
       hqDefenders:(hq?.soldiers||[]).filter(u=>!u.elite&&!u.basement)
         .slice(0,4).map(u=>u.saveId)};
   })
 };
}
function captureNativeCoopWorld(){
 const geometry=captureCoopWorldGeometry(),baseWalls=geometry.walls;
 geometry.walls=Wl.map((w,i)=>({...baseWalls[i],id:w.saveId,buildingId:w.owner?.saveId,towerLegOwnerId:w.towerLegOwner?.saveId||null,towerParapetOwnerId:w.towerParapetOwner?.saveId||null,hp:Number.isFinite(w.hp)?w.hp:1e9,rammable:!!w.rammable,barbed:!!w.barbed,locked:!!w.locked&&!w.bunkerGate,alwaysOpen:!!w.alwaysOpen,...Object.fromEntries(['ax','az','bx','bz','supportSide','supportWeight','woodenDoor','upperFloorWindow','civicFurniture','civicGroup','civicRubble','porchSupports','weakWood','towerParapet','towerX','towerZ','towerBaseY'].filter(k=>w[k]!=null).map(k=>[k,w[k]]))}));
 geometry.buildings.forEach((b,i)=>{b.id=B[i].saveId;});geometry.stairs.forEach((s,i)=>{s.buildingId=stairs[i].owner?.saveId;});
 const all=[...new Set([...TG.values()].flat())];geometry.trees=[...PL,...all.filter(t=>!t.p)].map(t=>({x:t.x,z:t.z,r:t.r,p:!!t.p,rock:!!t.rock,...(t.p?{y:t.y,s:t.s,yaw:t.yaw}:{}),...(t.rock?{topY:t.topY,bottomY:t.bottomY}:{})}));
 const point=v=>({x:v.x,y:v.y??v.o?.position?.y??Math.max(0,hAt(v.x,v.z)),z:v.z});
 const itemMap={arma:['bullets',16],granada:['grenades',5],disf:['disguise',1],med:['medkits',1],fusell_assalt:['assault',1],franctirador:['sniper',1],bazooka:['bazooka',1],cisalla:['cutters',1],expl:['c4',1],paracaigudes:['parachute',1],mapa:['mapa',1],mapa_heli:['mapa_heli',1],mapa_tanc:['mapa_tanc',1]};
 const payload={requestedSeed:requestedSeed>>>0,geometry,spawn:{...P},vehicles:V.map(v=>({id:v.saveId,t:v.t,...point(v),hd:v.hd,v:0,life:v.life??VT[v.t].life,rockets:v.rockets})),
  targets:E.map(e=>({id:e.saveId,t:e.t,...point(e),hp:e.hp,
  ...(e.t==='patrulla_marina'?{
    marineCrewHp:[...(e.marineCrewHp||window.HUNTER_VEHICLE_OCCUPANT_DAMAGE.marineCrewInitialHealth())],
    marineBrokenWindshield:[...(e.marineBrokenWindshield||[])]
  }:{}),...(e.t==='jeep'?{
    patrolCrewHp:[...(e.patrolCrewHp||[COMBAT_BALANCE.people.soldier,COMBAT_BALANCE.people.soldier])],
    brokenVehicleWindows:[...(e.brokenVehicleWindows||[])]
  }:{}),heading:e.hd||0,ai:['soldat','general','torre','jeep','tanqueta','tanc','patrulla_marina'].includes(e.t),state:'patrol',patrol:(e.patrol?.length?e.patrol:[]).map(p=>({x:p.x,y:e.o.position.y,z:p.z})),home:{x:e.home?.x??e.x,z:e.home?.z??e.z},tx:e.tx??e.x,tz:e.tz??e.z,patrolIndex:e.pi??0,wt:e.wt??0,speed:e.speed??e.sp??0,yawRate:e.yawRate??0,orbitSign:e.orbitSign??1,heading:e.navHd??e.hd??0,guard:!!e.guard,towerGuard:!!e.towerGuard,towerSeat:e.towerSeat??null,
  towerHostId:e.towerHost?.saveId||null,
  sp:e.sp,rate:e.rate,dmg:e.dmg,elite:!!e.elite,rocketSoldier:!!e.rocketSoldier,sensePhaseTicks:Math.ceil((e.senseT||0)*30),seenTicks:0,lastAttack:-90})),
  supplies:items.filter(it=>itemMap[it.t]).map(it=>({id:it.saveId,item:itemMap[it.t][0],amount:itemMap[it.t][1],...point(it)})),
  optional:captureNativeCoopOptionals(),
  intel:{sites:hqIntelSites.map(p=>({x:p.x,z:p.z,real:!!p.real})),
    eliminationOrder:hqIntelEliminationOrder.slice()},
  sharks:fa.filter(f=>f.k==='s').map((f,i)=>({
    id:'shark-'+i,x:f.x,z:f.z,cx:f.cx,cz:f.cz,r:f.r,
    a:f.a,sp:f.sp,biteCd:0,sharkMode:'patrol',phase:i%6
  }))};
 return JSON.parse(JSON.stringify(payload,(_,value)=>typeof value==='number'&&Number.isFinite(value)?Math.round(value*1e6)/1e6:value));
}
async function startNativeCoop(room){
 if(nativeCoopSession)throw Error('Ja hi ha una sessió cooperativa.');
 if(started&&!over){try{await saveOperation();}catch(error){msg=error.message;msgT=20;ui.show('coop');throw error;}}
 document.getElementById('hunter-coop-game-over')?.remove();
 const session=nativeCoopSession={preparing:true,room,state:null,meta:null,self:null,remotes:new Map(),fireHeld:false,seenEffects:new Set(),projectiles:new Map(),grenades:new Map()};
 movementFx.reset();
 session.projectileVisual=window.HUNTER_CREATE_NATIVE_COOP_PROJECTILE_VISUAL?.();
 session.grenadeVisual=window.HUNTER_CREATE_NATIVE_COOP_GRENADE_VISUAL?.();
 session.previousCheats={...cheats};
 try{
  await startGameProgressively({seed:room.seed,scale:room.mapScale,difficulty:room.difficulty,nativeSession:true});
  const payload=captureNativeCoopWorld();session.prediction=window.HUNTER_CREATE_NATIVE_PREDICTION?.(payload.geometry);const text=JSON.stringify(payload),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));session.fingerprint=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
  session.walls=Wl.slice();session.buildings=B.slice();session.palms=PL.slice();session.vehicles=new Map(V.map(v=>[v.saveId,v]));session.enemies=new Map(E.map(e=>[e.saveId,e]));session.items=new Map(items.map(it=>[it.saveId,it]));
  session.channel=window.HUNTER_NATIVE_COOP_TRANSPORT({room,getInput:nativeCoopInput,onInput:message=>session.prediction?.sent(message.sequence),
   onStatus(status){session.connectionStatus=status;if(status!=='open'&&session.state)session.state={...session.state,status:'paused'};const labels={connecting:'Connectant…',retrying:'Reconnectant…',replaced:'Sessió oberta en una altra pestanya.',ended:'Sessió finalitzada.',version:'Cal recarregar el joc.'};msg=status==='open'?'Preparant el mateix món amb el company…':labels[status]||'Connexió interrompuda.';msgT=8;},
   onAction(result){if(result.ok===false){const labels={HOST_ONLY:'Només el HOST pot activar els trucs.',NOT_ACTIVE:'La sessió no permet aquesta acció.',EMPTY:'No tens munició.',NOT_EQUIPPED:'Cal equipar aquesta arma.',TOO_FAR:'Acosta’t més al vehicle o a la porta.',FULL:'El vehicle és ple.',MOVING:'Atura el vehicle abans de pujar o baixar.',EXIT_BLOCKED:'No hi ha espai per baixar.',BLOCKED:'Hi ha un obstacle al pas.',NOT_READY:'El mecànic encara no està preparat.',DISABLED:'Aquest relé ja està desactivat.',SAVE_FAILED:'El servidor no ha pogut guardar l’acció. Torna-ho a provar.'};if(labels[result.code]){msg=labels[result.code];msgT=3;}}},
   onRoom(){},onError(error){msg=error||'La sessió s’ha interromput.';msgT=12;session.preparing=true;},
   onMission(data){if(data.meta.fingerprint!==session.fingerprint){session.preparing=true;msg='El món de la sala no coincideix. Recarregueu tots dos.';msgT=30;return;}session.meta=data.meta;session.self=data.self;session.state=data.state;try{session.prediction?.receive(data.state,data.self);}
     catch(error){reportNativeCoopVisualError(error,'predicció inicial');session.prediction=null;}
     session.seenEffects=new Set(data.state.combat.effects.map(e=>e.id));session.seenOptionalEvents=new Set((data.state.optionals?.events||[]).map(e=>e.id));session.seenSharkBites=new Set((data.state.fauna?.events||[]).map(e=>e.id));session.projectileVisual?.prime(data.state.combat.effects);session.preparing=false;paused=false;ui.hide();resetCameraState();},
   onState(state){session.state=state;
      try{session.prediction?.receive(state,session.self);}
      catch(error){reportNativeCoopVisualError(error,'predicció de snapshot');session.prediction=null;}
    }});
  // Disponible per al diagnòstic sense mostrar dades de xarxa als menús normals.
  window.HUNTER_COOP_NETWORK_STATS=session.channel.stats;
  if(session.prediction?.stats)
    session.channel.stats.localPrediction=session.prediction.stats;
  if(session.projectileVisual?.stats)
    session.channel.stats.projectileVisual=session.projectileVisual.stats;
  session.channel.start();session.channel.prepare({payload,fingerprint:session.fingerprint,host:room.members.find(m=>m.host)?.id===window.HUNTER_ACCOUNT_SERVICE.status().user?.id||room.host===window.HUNTER_ACCOUNT_SERVICE.status().user?.id});
  msg='Esperant el company al món original…';msgT=30;
 }catch(error){stopNativeCoop();paused=true;msg=error.message;msgT=20;ui.show('coop');throw error;}
}
function nativeCoopFireWeapon(){
 if(cv&&grenadeEquipped&&!window.HUNTER_SHARED_WEAPONS.canThrowGrenadeFromVehicle(cv))grenadeEquipped=false;
 const row=cv&&nativeCoopSession?.appliedVehicleRows?.get(cv.saveId);
 const passenger=!!row&&row.seats?.[0]!==nativeCoopSession.self;
 if(passenger)return grenadeEquipped?'grenade':bazookaEquipped?'bazooka':sniperEquipped?'sniper':assaultRifleEquipped?'assault':cisallaEquipped?'cutters':knifeEquipped?'knife':'pistol';
 return cv?(cv.t==='heli'?'grenade':window.HUNTER_SHARED_WEAPONS.mountedWeapons[cv.t]):grenadeEquipped?'grenade':bazookaEquipped?'bazooka':sniperEquipped?'sniper':assaultRifleEquipped?'assault':cisallaEquipped?'cutters':knifeEquipped?'knife':'pistol';
}
function selectNativeCoopWeapon(id){
 const weapons={pistola:'pistol',arma:'pistol',ganivet:'knife',fusell_assalt:'assault',franctirador:'sniper',bazooka:'bazooka',cisalla:'cutters',granada:'grenade'},weapon=weapons[id];
 if(!weapon||weapon==='grenade'&&cv&&!window.HUNTER_SHARED_WEAPONS.canThrowGrenadeFromVehicle(cv)||!nativeCoopSession?.state||(cv&&nativeCoopSession.appliedVehicleRows?.get(cv.saveId)?.seats?.[0]===nativeCoopSession.self)||swimming||hp<=0||(!['pistol','knife'].includes(weapon)&&!inv[id]))return false;
 const sent=weapon==='grenade'||nativeCoopSession.channel.inventory('weapon',weapon);
 if(!sent)return false;
 cancelGrenadeCharge();cancelAssaultBurst();setSniperScope(false);grenadeEquipped=weapon==='grenade';
 if(grenadeEquipped){bazookaEquipped=sniperEquipped=assaultRifleEquipped=cisallaEquipped=knifeEquipped=false;}
 drawWeaponPicker();return true;
}
function nativeCoopCommand(type,payload={}){
 const s=nativeCoopSession;if(!s?.state||s.state.status!=='running'||paused&&!['item','plant'].includes(type))return false;
 if(type==='fire'){
   const weapon=nativeCoopFireWeapon();if(!weapon)return false;
   let aim=null;
   if(!cv&&weapon==='bazooka'){
     // La retícula original és la font de veritat, inclosos els edificis.
     updateBazookaReticle(.1);
     if(bazookaReticleMode==='bazooka'&&bazookaReticleHasHit&&bazookaReticleElement?.style.display!=='none')
       aim={x:bazookaReticleWorld.x,y:bazookaReticleWorld.y,z:bazookaReticleWorld.z};
     else{
       const fx=-Math.sin(P.hd),fz=-Math.cos(P.hd);
       aim={x:P.x+fx*150,y:P.y+1.9,z:P.z+fz*150};
     }
   }else if(!cv&&weapon==='sniper'&&scopeActive){
     const focus=currentSniperFocus();
     if(focus){const point=sniperReticlePoint(focus);aim={x:point.x,y:point.y,z:point.z};}
   }
   if(weapon==='sniper'&&sniperAmmo<=0){msg='El rifle no té cartutxos.';msgT=3;return false;}
   const sent=s.channel.combat(weapon,undefined,undefined,aim);
   if(sent&&weapon==='sniper'){pl.userData.firePose=.42;msg='Rifle: dispar confirmant…';msgT=1;}
   return sent;
  }
 if(type==='vehicle'){const v=cv||nearV();return v?s.channel.vehicle(v.saveId,cv?'exit':'enter'):false;}
 if(type==='item'){
  const map={arma:'pistol',fusell_assalt:'assault',franctirador:'sniper',bazooka:'bazooka',cisalla:'cutters',ganivet:'knife',granada:'grenade'};
  if(map[payload.id]){const sent=selectNativeCoopWeapon(payload.id);if(sent)resume();return sent;}
  if(payload.id==='expl'){panel('bombtimer');return true;}
  if(payload.id==='med')return s.channel.inventory('use','medkits');
  if(payload.id==='disf')return s.channel.inventory('disguise',!disg);
  return false;
 }
 if(type==='optional'){
  if(nativeReviveAction())return true; // Mantinguda E: el tick del servidor reanima.
  const action=nativeCoopOptionalAction();if(!action)return false;
  return s.channel.optional(action.kind==='mechanicFollow'?'follow':action.kind,action.target);
 }
 if(type==='plant')return (!cv||cv.t==='heli')&&s.channel.combat('c4',undefined,payload.seconds);return false;
}
// La boca REAL de l'arma, com al joc individual. Únicament per
// a la primera posició gràfica del projectil confirmat.
function nativeCoopProjectileMuzzle(weapon){
 if(cv||!pl?.userData)return null;
 if(weapon==='sniper'&&scopeActive){
   const p=sniperMuzzleWorld(scopeYaw,scopePitch);
   return {x:p.x,y:p.y,z:p.z};
 }
 const u=pl.userData;
 let parent,point;
 if(weapon==='pistol'){parent=u.gun;point=[0,.183,-.84];}
 else if(weapon==='assault'){parent=u.assaultMuzzle;point=[0,0,0];}
 else if(weapon==='sniper'){parent=u.sniperMuzzle;point=[0,0,0];}
 else return null;
 if(!parent)return null;
 // El primer tret pot arribar quan l'animació de la pistola encara
 // és al canell. Fins que acaba d'alçar-la, mantenim el punt físic
 // del mode individual: .7 m davant i a l'altura del canó.
 if(weapon==='pistol'&&(u.pistolBlend||0)<.65){
   return {x:P.x-Math.sin(P.hd)*.7,
     y:P.y+1.5-(playerCrouched?.48:0),
     z:P.z-Math.cos(P.hd)*.7};
 }
 pl.updateMatrixWorld(true);
 const p=parent.localToWorld(new THREE.Vector3(...point));
 return {x:p.x,y:p.y,z:p.z};
}
function updateNativeCoop(dt){
 // Una fallada puntual de material/partícules no ha d'aturar per sempre el
 // requestAnimationFrame del guest: el servidor continua rebent inputs.
 try{updateNativeCoopFrame(dt);}
 catch(error){reportNativeCoopVisualError(error,'actualització del fotograma');}
}
function updateNativeCoopFrame(dt){
 const s=nativeCoopSession;if(!s)return;
 s.channel?.noteFrame?.(!paused&&!document.hidden);
 updateStrafeControls();joystick.setVehicleMode(cv?.t||null);
 joystick.setRunEnabled(!cv&&!paused&&!over&&hp>0&&!scopeActive&&!playerFall&&!s.gameOver&&!s.preparing);
 if(s.preparing||!s.state){updateVehicleSpecialAction();updatePlayerHUD(.13);return;}
 const state=s.state,projecting=s.projectedState!==state,
       actor=projecting?state.players.find(p=>p.id===s.self):s.projectedActor;
 if(!actor)return;
 if(projecting)showNativeCoopGameOver(s,state);
 if(projecting){
   for(const key of Object.keys(cheats))cheats[key]=!!state.cheats?.[key];
   s.interpolation??=window.HUNTER_CREATE_NATIVE_INTERPOLATION?.();
   if(s.channel?.stats&&s.interpolation&&!s.channel.stats.remoteInterpolation)
     s.channel.stats.remoteInterpolation=s.interpolation.stats;
   s.interpolation?.receive(state,s.self);
   s.projectedActor=actor;hp=actor.hp;
   // Les baixes són soldats, no cascs de vehicles. La patrullera té
   // dues places; els mariners abatuts abans de perdre el buc compten
   // individualment i no es dupliquen quan es destrueix.
   kills=state.combat.targets.reduce((count,e)=>{
     if(e.t==='patrulla_marina')return count+(e.hp<=0?2:
       (e.marineCrewHp||[]).filter(health=>health<=0).length);
     if(e.hp<=0)return count+(e.t==='jeep'?2:1);
     return count;
   },0);
 }
 const input=nativeCoopInput(),
       presented=s.prediction?.advance(dt,input,!paused&&!document.hidden&&state.status==='running')||actor;
 elapsed=state.tick/30;
 P.x=presented.x;P.y=presented.y;P.z=presented.z;P.hd=presented.hd;
 if(state.optionals){
   prisonerSystem.applyCoopState(state.optionals.prison,dt,P);
   radioRelay.applyCoopState(state.optionals.radio,P);
   if(projecting){
     s.seenOptionalEvents??=new Set();
     for(const event of state.optionals.events||[]){
       if(s.seenOptionalEvents.has(event.id))continue;
       s.seenOptionalEvents.add(event.id);
       const labels={'prison-rescue':'Camp alliberat! Els presoners fugen i el mecànic va al taller.',
         'repair-complete':'Vehicle reparat.','repair-cancelled':'Reparació interrompuda.',
         'radio-disabled':'Relé de ràdio desactivat.','radio-warning':'La ràdio ha mobilitzat soldats de l’HQ.',
         'civilian-death':'Un presoner ha mort.'};
       if(labels[event.kind]){msg=labels[event.kind];msgT=4;}
     }
     if(s.seenOptionalEvents.size>40)
       s.seenOptionalEvents=new Set((state.optionals.events||[]).map(e=>e.id));
   }
 }
 if(projecting){
  const down=state.rescue?.down?.find(d=>d.actorId===s.self);
  if(hp<=0&&down){msg='Has caigut! El company et pot reanimar amb una farmaciola ('+Math.ceil(down.remaining)+' s).';msgT=1.5;}
  else if(s.wasDown&&hp>0){msg='T’han reanimat!';msgT=3;}
  s.wasDown=hp<=0;
  if(hp>0&&!!K.KeyE){const helping=state.rescue?.down?.find(d=>d.helperId===s.self);if(helping){msg='Reanimant el company… '+Math.min(100,Math.round(helping.progress/90*100))+'%';msgT=1.5;}}
 }
 swimming=!!presented.swimming;playerFall=presented.fall;
 if(playerFall?.parachute&&hp>0){
   if(!parachuteVisual)parachuteVisual=createParachuteVisual();
   parachuteVisual.position.set(P.x,P.y,P.z);
 }else if(parachuteVisual)removeParachuteVisual();
 ib=buildingCandidates(P.x,P.z).find(b=>Math.abs(P.x-b.x)<b.w/2&&Math.abs(P.z-b.z)<b.d/2&&P.y<b.fy+b.h)||null;
 // Inventari, vida i recomptes autoritatius són immutables entre snapshots.
 const bag=projecting?state.inventories.find(i=>i.actorId===s.self):null;
 if(bag&&bag!==s.appliedBag){s.appliedBag=bag;if(grenadeEquipped&&!bag.grenades){cancelGrenadeCharge();grenadeEquipped=false;}ammo=bag.bullets;sniperAmmo=bag.sniperAmmo;bazookaAmmo=bag.bazookaAmmo??0;inv={};for(const [key,id] of Object.entries({grenades:'granada',disguise:'disf',medkits:'med',assault:'fusell_assalt',sniper:'franctirador',bazooka:'bazooka',cutters:'cisalla',c4:'expl',parachute:'paracaigudes'}))if(bag[key])inv[id]=bag[key];bazookaEquipped=!grenadeEquipped&&bag.weapon==='bazooka';sniperEquipped=!grenadeEquipped&&bag.weapon==='sniper';assaultRifleEquipped=!grenadeEquipped&&bag.weapon==='assault';cisallaEquipped=!grenadeEquipped&&bag.weapon==='cutters';knifeEquipped=!grenadeEquipped&&bag.weapon==='knife';if(disg!==bag.disguised)setDis(bag.disguised);}
 if(projecting){
   // Els deltes conserven la mateixa referència per a les entitats intactes.
   // No copiam centenars de vehicles quan només se n'ha mogut un.
   s.appliedVehicleRows??=new Map();
   cv=null;
   for(const row of state.vehicles){
     const v=s.vehicles.get(row.id);if(!v)continue;
     if(s.appliedVehicleRows.get(row.id)!==row){
       const previous=s.appliedVehicleRows.get(row.id);
       Object.assign(v,row);
       for(const seat of row.brokenVehicleWindows||[]){
         const q=window.HUNTER_VEHICLE_OCCUPANT_DAMAGE.vehicleSeatWorld(v,seat,row.y);
         shatterVehicleWindow(v,seat,q,null,true);
       }
       if(row.destroyed&&!previous?.destroyed&&s.projectedState){
         // Mateixa fragmentació de les malles que al mode individual,
         // sense tornar a aplicar danys: el Worker ja és l'autoritat.
         v.o.position.set(row.x,row.y,row.z);v.o.rotation.y=row.hd;
         if(['bici','barca_rems','windsurf'].includes(v.t)){
           // Les mateixes peces voladores del mode individual, sense boom().
           fragileVehicleDebris(v,row.y,previous?.v??row.v??0);
           snd('woodBreak',.62,{x:row.x,y:row.y,z:row.z},v);
         }else vehicleDebris(v,row.y);
       }
       if(!v.o.visible)v.o.position.set(row.x,row.y,row.z);
       if(v.o.userData.turretPivot)v.o.userData.turretPivot.rotation.y=row.turretYaw||0;
       if(v.o.userData.turretPitch)v.o.userData.turretPitch.rotation.x=row.turretPitch||0;
       s.appliedVehicleRows.set(row.id,row);
     }
     if(row.destroyed)v.o.visible=false;
     if(row.seats.includes(s.self)){cv=v;v.o.visible=!row.destroyed;}
   }
 }
 // El mateix conjunt de malles de gavines i taurons del món individual.
 // No executam update() dels taurons localment: podria mossegar dos cops.
 if(state.fauna){
   s.sharkViews??=fa.filter(f=>f.k==='s');
   const alpha=1-Math.exp(-Math.max(0,dt)*13);
   for(const row of state.fauna.sharks||[]){
     const index=Number(row.id.slice(6)),f=s.sharkViews[index];
     if(!f||!Number.isFinite(row.x)||!Number.isFinite(row.z))continue;
     f.x=row.x;f.z=row.z;f.dead=!!row.dead;
     if(!f.nativeCoopInitialized){
       f.o.position.set(row.x,wy(row.x,row.z,elapsed)-.18,row.z);
       f.nativeCoopInitialized=true;
     }
     f.o.position.x+=(row.x-f.o.position.x)*alpha;
     f.o.position.z+=(row.z-f.o.position.z)*alpha;
     f.o.position.y=wy(f.o.position.x,f.o.position.z,elapsed)-.18;
     f.o.rotation.y=row.hd;
   }
   if(projecting){
     s.seenSharkBites??=new Set((state.fauna.events||[]).map(e=>e.id));
     for(const event of state.fauna.events||[]){
       if(s.seenSharkBites.has(event.id))continue;
       s.seenSharkBites.add(event.id);
       if(event.kind==='shark-bite'&&event.actorId===s.self){
         msg='Un tauró et mossega!';msgT=1.8;
       }
     }
     if(s.seenSharkBites.size>36)s.seenSharkBites=
       new Set((state.fauna.events||[]).map(e=>e.id));
   }
 }
 // Gavines: animació original purament visual, sense decisions de combat.
 for(const f of fa)if(f.k==='g'&&f.o){
   f.a+=f.sp*dt;
   f.x=f.cx+Math.cos(f.a)*f.r;f.z=f.cz+Math.sin(f.a)*f.r;
   const flyY=Math.max(f.y+Math.sin(elapsed+f.cx)*2,
     Math.max(0,hAt(f.x,f.z))+10);
   f.o.position.set(f.x,flyY,f.z);
   f.o.rotation.y=Math.PI-f.a;
   f.wl.rotation.z=Math.sin(elapsed*8+f.cx)*.5;
   f.wr.rotation.z=-f.wl.rotation.z;
 }
 // La cartografia és la mateixa del mode individual; el Worker
 // confirma quan HOST o GUEST recull un mapa i tots dos reben els sectors.
 if(state.intel&&s.appliedIntelRevision!==state.intel.revision){
   const intel=state.intel;
   s.appliedIntelRevision=intel.revision;
   hqIntelStage=intel.stage;hqMapKnown=!!intel.confirmed;
   hqIntelSectors.clear();
   for(let i=0;i<intel.investigated;i++)hqIntelSectors.add(i);
   hqIntelDiscarded.clear();for(const i of intel.discarded)hqIntelDiscarded.add(i);
   if(intel.candidates.length)hqIntelSites=intel.candidates.map(p=>({...p}));
   for(const [kind,key] of [['heli','heliSectors'],['tanc','tankSectors']]){
     knownVehicleSectors[kind].clear();
     for(const i of intel[key]||[])knownVehicleSectors[kind].add(i);
   }
   intelMarks=(intel.knownVehicles||[]).map((row,i)=>{
     const ref=s.vehicles.get(row.id)||s.enemies.get(row.id);
     return ref?{kind:['heli','heli_combat'].includes(row.t)?'heli':'tanc',
       ref,label:(['heli','heli_combat'].includes(row.t)?'Helicòpter ':'Tanc ')+(i+1)}:null;
   }).filter(Boolean);
   if(intel.revision>0&&intel.description){msg=intel.description;msgT=4;}
   mini();
 }
 if(projecting)rebuildVehicleGrid(); // Reindexa també els vehicles en COOP.
 joystick.setVehicleMode(cv?.t||null);updateVehicleSpecialAction();
 // Les posicions remotes es presenten amb un interval de snapshot
 // de retard: cap extrapolació de física o dany. L'actor/vehicle local
 // continua utilitzant la predicció i reconciliació originals.
 const remoteAlpha=s.interpolation?.advance(dt,!paused&&!document.hidden&&state.status==='running')??1;
 const predictedVehicle=s.prediction?.vehicle();
 for(const pair of s.interpolation?.movingVehicles(remoteAlpha)||[]){
   const v=s.vehicles.get(pair.id);
   // Un passatger local segueix el vehicle remot, però el conductor
   // local manté la seva predicció sense interferència visual.
   if(!v||v.destroyed||!v.o.visible||predictedVehicle?.id===pair.id)continue;
   v.x=pair.pose.x;v.y=pair.pose.y;v.z=pair.pose.z;v.hd=pair.pose.hd;
   if(pair.pose.alt!==undefined)v.alt=pair.pose.alt;
 }
 // La predicció només modifica cada fotograma el vehicle que condueix
 // l'actor local; la resta espera dades noves del servidor.
 if(cv&&!cv.destroyed&&predictedVehicle?.id===cv.saveId){
   for(const key of NATIVE_VEHICLE_POSE_KEYS)
     if(predictedVehicle[key]!==undefined)cv[key]=predictedVehicle[key];
   // La càmera, el pilot i el vehicle comparteixen la correcció visual;
   // el simulador de col·lisions continua utilitzant el vehicle cru.
   cv.x=presented.x;cv.y=presented.y;cv.z=presented.z;cv.hd=presented.hd;
 }
 refreshVehicleGridIfCellsChanged();
 updateVehicleVisualLod(elapsed,dt,{skipHidden:true});
 // Exactament els mateixos rastres instanciats del mode individual:
 // la física i el snapshot ja han actualitzat la posició de cada vehicle.
 const fxContext={playerX:P.x,playerZ:P.z,playerVehicle:cv,
   terrainAt:hAt,waterAt:(x,z)=>wy(x,z,elapsed)};
 for(const v of V)if(!v.destroyed)movementFx.vehicle(v,dt,fxContext);
 // El fum usa la vida autoritativa de cada vehicle, també els enemics.
 for(const v of V)if(!v.destroyed)
   updateDamagedVehicleSmoke(v,dt,v.life,v.maxLife||VT[v.t]?.life||1);
 for(const e of E)if(ENEMY_TRAIL_TYPES.has(e.t)&&e.hp>0)
   updateDamagedVehicleSmoke(e,dt,e.hp,EC[e.t]?.hp||1);
 if(cv||swimming)playerCrouched=false;if(scopeActive&&(cv||swimming||playerFall||!sniperEquipped))setSniperScope(false);pl.position.set(P.x,P.y,P.z);pl.rotation.y=P.hd;pl.visible=!cv&&!scopeActive;animPl(hp<=0?0:cv?0:input.forward,dt,input.run&&hp>0,input.strafe);
 // El seient és sempre el que ha assignat el servidor, no el rol HOST/GUEST.
 // Si el convidat condueix, continua assegut al lloc esquerre.
 const mySeats=cv&&s.appliedVehicleRows?.get(cv.saveId)?.seats,
       mySeat=mySeats?.indexOf(s.self)??-1;
 poseRider(cv,dt,mySeat>=0?mySeat:null);
 pl.rotation.z=hp<=0&&!cv?-Math.PI/2:0;if(hp<=0&&!cv)pl.position.y+=.5;
 // El crol inclina el model i enfonsa el pit si només es pren P.y.
 // La mateixa elevació VISUAL del mode individual preserva la física.
 if(swimming&&!cv&&hp>0)
   pl.position.y+=window.HUNTER_CHARACTERS.swimVisualLift(
     pl,wy(P.x,P.z,elapsed),P.y);
 if(projecting){
   // Les referències als seients i als actors remots només es resolen
   // en rebre un snapshot; la interpolació continua a cada fotograma.
   s.nativeRemoteViews??=new Map();
   s.nativeSeatOwners??=new Map();
   s.remoteLoadouts=new Map(state.inventories.map(bag=>[bag.actorId,bag]));
   s.nativeSeatOwners.clear();
   for(const row of state.vehicles)
     for(const playerId of row.seats||[])
       if(playerId)s.nativeSeatOwners.set(playerId,s.vehicles.get(row.id)||null);
   for(const other of state.players){
     if(other.id===s.self)continue;
     let view=s.nativeRemoteViews.get(other.id);
     if(!view){
       let model=s.remotes.get(other.id);
       if(!model){
         model=window.HUNTER_CHARACTERS.createPlayer(THREE,{box:bx});
         model.position.set(other.x,other.y,other.z);
         model.userData.nativeRider=window.HUNTER_RIDER.create(THREE,{
           scene,box:bx,material:M,scales:VS,heightAt:hAt,shadows:visualQuality.shadows
         });
         scene.add(model);s.remotes.set(other.id,model);
       }
       view={model,target:new THREE.Vector3(),actor:null,vehicle:null};
       s.nativeRemoteViews.set(other.id,view);
     }
     view.actor=other;
     view.target.set(other.x,other.y,other.z);
     view.vehicle=s.nativeSeatOwners.get(other.id)||null;
   }
 }
 for(const view of s.nativeRemoteViews?.values()||[]){
   const {model,target,actor:other,vehicle:remoteVehicle}=view;
   const oldX=model.position.x,oldZ=model.position.z,
         interpolated=s.interpolation?.actor(other.id,remoteAlpha);
   if(interpolated)target.set(interpolated.x,interpolated.y,interpolated.z);
   else target.set(other.x,other.y,other.z);
   // No fem una segona interpolació exponencial: afegiria més retard.
   // La pose ja està temporitzada pels ticks i no supera el darrer estat.
   if(s.interpolation)model.position.copy(target);
   else model.position.lerp(target,1-Math.exp(-18*dt));
   model.rotation.y=interpolated?.hd??other.hd;
   model.rotation.z=other.hp<=0&&!remoteVehicle?-Math.PI/2:0;
   if(other.hp<=0&&!remoteVehicle)model.position.y+=.5;
   model.visible=!remoteVehicle;
   if(other.fall?.parachute&&other.hp>0&&!remoteVehicle){
     let canopy=model.userData.nativeParachute;
     if(!canopy){canopy=makeParachuteVisual();world.add(canopy);model.userData.nativeParachute=canopy;}
     canopy.position.copy(model.position);canopy.visible=true;
   }else if(model.userData.nativeParachute){
     world.remove(model.userData.nativeParachute);
     model.userData.nativeParachute=null;
   }
   const remoteSeats=remoteVehicle&&s.appliedVehicleRows?.get(remoteVehicle.saveId)?.seats,
         remoteSeat=remoteSeats?.indexOf(other.id)??-1;
   const riderTarget=remoteVehicle||target,
     riderScope=scopeActive?currentSniperFocus():null,
     riderFocused=!!riderScope?.contains(riderTarget.x,riderTarget.y+2,riderTarget.z,3),
     riderDistance=riderFocused?0:Math.hypot(riderTarget.x-P.x,riderTarget.z-P.z);
   model.userData.nativeRider.update(remoteVehicle,dt,
     remoteSeat>=0?remoteSeat:null,riderDistance);
   const speed=Math.hypot(model.position.x-oldX,model.position.z-oldZ)/Math.max(.001,dt);
   const remoteBag=s.remoteLoadouts?.get(other.id),u=model.userData,
     weapon=u.nativeShotRemaining>0?u.nativeShotWeapon:remoteBag?.weapon||'pistol';
   window.HUNTER_CHARACTERS.animatePlayer(model,{
     forward:Math.min(1,speed/6),dt,swimming:other.swimming,
     crouching:!!other.crouched,inVehicle:!!remoteVehicle,
     ammo:remoteBag?.bullets??1,running:speed>7,
     bazookaEquipped:weapon==='bazooka',sniperEquipped:weapon==='sniper',
     assaultRifleEquipped:weapon==='assault',grenadeEquipped:weapon==='grenade'
   });
   if(other.swimming&&other.hp>0&&!remoteVehicle)
     model.position.y+=window.HUNTER_CHARACTERS.swimVisualLift(
       model,wy(target.x,target.z,elapsed),target.y);
 }

 if(projecting){
   s.appliedEnemyRows??=new Map();
   s.nativeAnimatedEnemies??=[];
   s.nativeAnimatedEnemies.length=0;
   for(const row of state.combat.targets){
     const e=s.enemies.get(row.id);if(!e)continue;
     if(s.appliedEnemyRows.get(row.id)!==row){
       // El canvi de moviment és una propietat visual, no una segona IA.
       e.nativeMoving=Math.hypot(row.x-e.x,row.z-e.z)>.001;
       e.x=row.x;e.z=row.z;e.hp=row.hp;e.hd=row.heading||0;
       // Un cop enderrocada la torre, els parapets tampoc poden
       // continuar tapant trets al client com a col·lisions invisibles.
       if(e.t==='torre'&&row.hp<=0&&!e.nativeTowerCoverCleared){
         e.nativeTowerCoverCleared=true;
         for(const wall of [...e.towerLegColliders||[],...e.towerParapetColliders||[]]){
           wall.open=true;wall.hp=0;wall.playerBlock=false;
         }
       }
       if(e.t==='patrulla_marina'){
         e.marineCrewHp=row.marineCrewHp||window.HUNTER_VEHICLE_OCCUPANT_DAMAGE.marineCrewInitialHealth();
         e.marineBrokenWindshield=row.marineBrokenWindshield||[];
         syncMarinePatrolCrew(e.o,e);
       }else if(e.t==='jeep'){
         e.patrolCrewHp=row.patrolCrewHp||[COMBAT_BALANCE.people.soldier,COMBAT_BALANCE.people.soldier];
         const rig=e.o?.userData?.enemyCarCrew;
         if(rig){
           if(rig.driver)rig.driver.visible=e.patrolCrewHp[0]>0;
           if(rig.gunner)rig.gunner.visible=e.patrolCrewHp[1]>0;
           if(rig.mount)rig.mount.visible=e.patrolCrewHp[1]>0;
         }
         for(const seat of row.brokenVehicleWindows||[]){
           const point=window.HUNTER_VEHICLE_OCCUPANT_DAMAGE.vehicleSeatWorld(e,seat,row.y);
           shatterVehicleWindow(e,seat,point,null,true);
         }
       }
       e.nativePatrolFocus=row.patrolFocus||null;e.nativePatrolSpeed=row.speed||0;
       e.canSee=!!row.canSee;
       e.aiMode=row.state==='attack'?'combat':row.state;
       // Model assegut: reutilitzam les figures dels Humvee de patrulla.
       // El soldat original continua essent l'actor lògic, sempre ocult a bord.
       const boarded=row.enemyVehicleId?s.vehicles.get(row.enemyVehicleId):null;
       if(e.nativeBoardedVehicle&&
          (e.nativeBoardedVehicle!==boarded||e.nativeEnemySeat!==(row.enemySeat||0)||row.hp<=0))
         window.HUNTER_ENEMY_CREW_VISUAL.show(
           e.nativeBoardedVehicle,e.nativeEnemySeat||0,false);
       if(boarded&&!boarded.destroyed&&row.hp>0){
         if(e.o.parent!==world)world.add(e.o);
         e.o.scale.setScalar(1);e.o.visible=false;
         window.HUNTER_ENEMY_CREW_VISUAL.show(boarded,row.enemySeat||0,true);
         e.nativeBoardedVehicle=boarded;
         e.nativeEnemySeat=row.enemySeat||0;
       }else if(e.nativeBoardedVehicle){
         if(e.o.parent!==world)world.add(e.o);
         e.o.scale.setScalar(1);e.o.visible=row.hp>0;
         e.nativeBoardedVehicle=null;e.nativeEnemySeat=null;
       }
       // El model manté la pose temporal si aquest enemic es mou.
       // L'estat lògic e.x/e.z continua essent autoritatiu.
       if(!s.interpolation?.enemy?.(row.id)&&!e.nativeBoardedVehicle){
         e.o.position.set(row.x,row.y,row.z);
         if(e.t!=='torre')e.o.rotation.y=e.hd;
       }
       s.appliedEnemyRows.set(row.id,row);
     }else e.nativeMoving=false;
     e.nativeCoopId=row.id;
     e.nativeVisualTick=state.tick;
     if(row.hp<=0)e.o.visible=false;
     else s.nativeAnimatedEnemies.push(e);
   }
 }
 // En canvi, l'animació d'infanteria original sí que necessita el dt
 // de cada fotograma, incloses les pauses entre dos snapshots rebuts.
 for(const e of s.nativeAnimatedEnemies||[]){
   if(e.nativeBoardedVehicle){
     e.o.visible=false; // el rider de patrulla és el model visible.
     continue;
   }
   if(!e.o.visible)continue;
   const pose=s.interpolation?.enemy?.(e.nativeCoopId);
   let walking=e.nativeMoving;
   if(pose){
     const beforeX=e.o.position.x,beforeZ=e.o.position.z;
     e.o.position.set(pose.x,pose.y,pose.z);
     if(e.t!=='torre')e.o.rotation.y=pose.hd;
     // Les cames segueixen el moviment visible, no si la darrera
     // actualització de xarxa ha canviat formalment el registre.
     walking=Math.hypot(pose.x-beforeX,pose.z-beforeZ)>Math.max(.001,dt*.12);
   }
   if(e.t==='jeep'&&e.o.userData.steeringPivots){
     // Les rodes reflecteixen les corbes reals INTERPOLADES del servidor:
     // ni el gir ni el gir de les rodes inventen moviment al client.
     const carPose=e.nativeCarWheelPose??={
       x:e.o.position.x,z:e.o.position.z,hd:e.o.rotation.y
     };
     const dx=e.o.position.x-carPose.x,dz=e.o.position.z-carPose.z,
       traveled=Math.hypot(dx,dz),
       angle=Math.atan2(Math.sin(e.o.rotation.y-carPose.hd),
         Math.cos(e.o.rotation.y-carPose.hd)),
       steering=traveled>.003&&dt>.0001?
         Math.max(-1,Math.min(1,angle/(1.6*dt))):0;
     window.HUNTER_VEHICLES.animateSteering(e.o,'cotxe',steering,dt);
     if(traveled>.003){
       const signed=dx*(-Math.sin(e.o.rotation.y))+dz*(-Math.cos(e.o.rotation.y));
       for(const wheel of e.o.userData.wheels||[])
         wheel.rotation.x-=signed/(wheel.userData.radius||.65);
     }
     carPose.x=e.o.position.x;carPose.z=e.o.position.z;carPose.hd=e.o.rotation.y;
   }
   animateEnemyInfantry(e,walking,dt);
   // Els mateixos dos comandos asseguts en tots els modes. Les
   // patrulleres només giren els riders; els trets són del Worker.
   if(e.t==='patrulla_marina'){
     const target=s.state?.players.find(p=>p.id===e.nativePatrolFocus&&p.hp>0);
     if(target){
       const aim=new THREE.Vector3(target.x,target.y+1.6,target.z);
       aimEnemyBoatCrew(e.o,0,aim,dt);
       aimEnemyBoatCrew(e.o,1,aim,dt);
     }
     const roll=Math.sin(elapsed*2+e.o.position.x*.03+e.o.position.z*.024);
     e.o.rotation.x=roll*.028;e.o.rotation.z=-(e.nativePatrolSpeed||0)*.0015+roll*.024;
   }
   if(ENEMY_TRAIL_TYPES.has(e.t)){
     // Mostreig de la pose suau del vaixell/jeep, no de l'últim paquet
     // de 10 Hz. El rastre manté memòria entre fotogrames.
     const trail=e.nativeFxRow??={t:e.t,x:e.o.position.x,z:e.o.position.z,
       hd:e.o.rotation.y,v:0,destroyed:false};
     trail.x=e.o.position.x;trail.z=e.o.position.z;trail.hd=e.o.rotation.y;
     trail.destroyed=e.hp<=0;
     movementFx.vehicle(trail,dt,{...fxContext,enemy:true});
   }
 }
 // Els ocupants de llanxes requisades giren cap al mateix objectiu
 // que els de les patrulleres, sense crear canons nous al client.
 for(const v of V)if(!v.destroyed&&
     (v.t==='llanxa'||v.t==='llanxa_coets')&&
     v.o.userData.enemyCarCrew?.boatWeapons?.length){
   const target=s.state?.players?.filter(p=>p.hp>0&&!p.fall)
     .map(p=>({p,d:Math.hypot(p.x-v.x,p.z-v.z)}))
     .filter(q=>q.d<245).sort((a,b)=>a.d-b.d)[0]?.p;
   if(target){
     const aim=new THREE.Vector3(target.x,target.y+1.5,target.z);
     if(v.o.userData.enemyCarCrew.driver.visible)aimEnemyBoatCrew(v.o,0,aim,dt);
     if(v.o.userData.enemyCarCrew.gunner.visible)aimEnemyBoatCrew(v.o,1,aim,dt);
   }
 }
 movementFx.update(dt,cam);
 if(projecting){
   s.projectileVisual?.receive(state.combat.projectiles,s.self,
     nativeCoopProjectileMuzzle,state.combat.effects,state.tick);
   // Els trets curts confirmats es poden visualitzar encara que el
   // projectil hagi desaparegut de la fila autoritativa.
   for(const [id,mesh] of s.projectiles)
     if(!s.projectileVisual?.has(id)){
       world.remove(mesh);s.projectiles.delete(id);
     }
 }
 s.nativeProjectileDirection??=new THREE.Vector3();
 s.projectileVisual?.advance(
   !paused&&!document.hidden&&state.status==='running'?dt:0,
   (id,pose,row)=>{
     let mesh=s.projectiles.get(id);
     if(!mesh){
       const heavy=!!row.splash;
       mesh=new THREE.Mesh(heavy?gHeavy:gLight,heavy?mS:mW);
       mesh.scale.setScalar(heavy?1:SMALL_ARMS_SCALE);
       world.add(mesh);s.projectiles.set(id,mesh);
       const dir=s.nativeProjectileDirection.set(row.vx,row.vy,row.vz);
       if(dir.lengthSq())mesh.quaternion.setFromUnitVectors(
         heavyForward,dir.normalize());
     }
     mesh.position.set(pose.x,pose.y,pose.z);
   },
   id=>{const mesh=s.projectiles.get(id);
     if(mesh){world.remove(mesh);s.projectiles.delete(id);}
   });
 if(projecting){
 if(projecting)s.grenadeVisual?.receive(state.combat.grenades);
 s.grenadeVisual?.advance(
   !paused&&!document.hidden&&state.status==='running'?dt:0,
   (id,pose,row)=>{
     let mesh=s.grenades.get(id);
     if(!mesh){
       mesh=row.weapon==='c4'?
         window.HUNTER_EXPLOSIVE_VISUALS.create(THREE,true):createGrenadeModel();
       world.add(mesh);s.grenades.set(id,mesh);
     }
     mesh.position.set(pose.x,pose.y,pose.z);
   });
 // Fallback for a source-mode bootstrap without the optional module.
 if(!s.grenadeVisual&&projecting){
   s.nativeGrenadeIds??=new Set();s.nativeGrenadeIds.clear();
   for(const row of state.combat.grenades){
     s.nativeGrenadeIds.add(row.id);
     let mesh=s.grenades.get(row.id);
     if(!mesh){mesh=row.weapon==='c4'?window.HUNTER_EXPLOSIVE_VISUALS.create(THREE,true):createGrenadeModel();world.add(mesh);s.grenades.set(row.id,mesh);}
     mesh.position.set(row.x,row.y,row.z);
   }
 }
 if(projecting){
   const alive=s.grenadeVisual?null:new Set(state.combat.grenades.map(g=>g.id));
   for(const [id,mesh] of s.grenades)if(!(s.grenadeVisual?s.grenadeVisual.has(id):alive.has(id))){
     world.remove(mesh);window.HUNTER_RESOURCES.dispose(mesh);s.grenades.delete(id);
   }
 }
  if(s.appliedEffects!==state.combat.effects){
 s.appliedEffects=state.combat.effects;
 for(const effect of state.combat.effects)if(!s.seenEffects.has(effect.id)){
   // Es marca abans de dibuixar: si falla una partícula no repetim la fallada
   // cada fotograma. L'estat autoritatiu brokenWindows s'aplica igualment.
   s.seenEffects.add(effect.id);
   try{
     if(effect.kind==='vehicle-signal'){
        // L'altre participant sent i veu el radi de la font autoritativa.
        if(effect.actorId!==s.self&&effect.at){
          snd(effect.sound,1,effect.at,s.vehicles.get(effect.vehicleId));
          window.HUNTER_STEALTH.emit(effect.sound,effect.at.x,effect.at.y,effect.at.z,effect.radius);
        }
      }
      else if(effect.kind==='vehicle-destroyed'){
        // El servidor confirma la destrucció abans d'eliminar el model.
        // Pot arribar una explosió separada al mateix tick: evitar doblar-la.
        const hasBlast=state.combat.effects.some(other=>other.kind==='explosion'&&
          Math.hypot(other.at.x-effect.at.x,other.at.y-effect.at.y,other.at.z-effect.at.z)<2.5&&
          Math.abs((other.tick??0)-(effect.tick??0))<=1);
        if(effect.explosive&&!hasBlast){
          presentExplosion(effect.at.x,effect.at.y,effect.at.z,8);
        }
      }
      else if(effect.kind==='explosion')presentExplosion(effect.at.x,effect.at.y,effect.at.z,effect.radius,{
        weapon:effect.weapon,splash:effect.weapon==='projectile'?effect.radius:0,
        direction:effect.direction});
     else if(effect.kind==='impact')spawnBulletImpact(effect.hit?'blood':'spark',
       effect.at.x,effect.at.y,effect.at.z,{vx:0,vy:0,vz:1});
     else if(effect.kind==='glass'&&s.walls[effect.wallIndex])
       shatterWindow(s.walls[effect.wallIndex],effect.paneIndex,effect.at,null);
     else if(effect.kind==='marine-glass'){
       const boat=s.enemies.get(effect.targetId);
       if(boat){
         boat.marineBrokenWindshield??=[];
         if(!boat.marineBrokenWindshield.includes(effect.pane))
           boat.marineBrokenWindshield.push(effect.pane);
         syncMarinePatrolCrew(boat.o,boat);
         snd('glassBreak',.8,effect.at,boat.o);
         spawnBulletImpact('glass',effect.at.x,effect.at.y,effect.at.z,{vx:0,vy:0,vz:1});
       }
     }
     else if(effect.kind==='marine-crew-hit'){
       spawnBulletImpact('blood',effect.at.x,effect.at.y,effect.at.z,{vx:0,vy:0,vz:1});
     }
     else if(effect.kind==='patrol-car-glass'){
       const car=s.enemies.get(effect.targetId);
       if(car)shatterVehicleWindow(car,effect.seat,effect.at,null);
     }
     else if(effect.kind==='patrol-car-crew-hit'){
       spawnBulletImpact('blood',effect.at.x,effect.at.y,effect.at.z,{vx:0,vy:0,vz:1});
     }
     else if(effect.kind==='vehicle-glass'){
       const v=s.vehicles.get(effect.vehicleId);
       if(v){
         shatterVehicleWindow(v,effect.seat,effect.at,null);
       }
     }
     else if(effect.kind==='shot'){
        snd('shot',.7,effect.from);
        if(effect.actorId===s.self&&!cv){
          pl.userData.firePose=.32;
          if(effect.weapon==='pistol'){
            pl.userData.pistolAimTime=.32;pl.userData.pistolShotAge=0;
          }
        }else if(effect.actorId!==s.self&&!effect.enemy){
          const model=s.remotes.get(effect.actorId),u=model?.userData;
          if(u){
            const vehicle=s.nativeRemoteViews?.get(effect.actorId)?.vehicle;
            u.nativeShotWeapon=effect.weapon||'pistol';
            u.nativeShotAge=0;u.nativeShotRemaining=.38;
            u.firePose=effect.weapon==='sniper'||effect.weapon==='bazooka'?.42:.32;
            if(effect.weapon==='pistol'&&!vehicle){
              u.pistolAimTime=.32;u.pistolShotAge=0;
            }
            if(vehicle&&effect.weapon==='pistol')
              u.nativeRider?.firePistol?.(vehicle,()=>null);
          }
        }
      }
   }catch(error){reportNativeCoopVisualError(error,'efecte '+effect.kind);}
 }
 if(s.seenEffects.size>256){const current=new Set(state.combat.effects.map(e=>e.id));s.seenEffects=current;}
 }
 if(s.appliedRemovedWalls!==state.removedWalls){s.appliedRemovedWalls=state.removedWalls;
 s.removedWallsShown??=new Set();
  for(const i of state.removedWalls||[]){
    if(s.removedWallsShown.has(i))continue;
    s.removedWallsShown.add(i);
    const w=s.walls[i];if(!w)continue;
    if(w.civicFurniture){
      collapseCivicProp(w,!!s.projectedState);
      continue;
    }
    w.open=true;w.hp=0;w.playerBlock=false;w.destroyedWall=true;
    if(s.projectedState&&!w.towerLegOwner&&!w.towerParapetOwner)wallBreak(w);
    else{
      for(const mesh of w.parts||[w.m])if(mesh)mesh.visible=false;
      for(const trim of w.timberTrim||[])trim.visible=false;
      if(w.porchSupports)collapsePorch(w.owner,false);
    }
  }
 }
 if(s.appliedDoors!==state.doors){s.appliedDoors=state.doors;
 s.doors??=new Map(Dr.map(d=>[d.saveId,d]));for(const row of state.doors){const d=s.doors.get(row.id);if(d){d.desiredOpen=row.open;d.open=row.open;if(d.m)d.m.visible=!row.open&&!row.destroyed;}}
 }
 if(s.appliedBrokenWindows!==state.brokenWindows){s.appliedBrokenWindows=state.brokenWindows;
 for(const id of state.brokenWindows||[]){const [index,pane]=id.split(':').map(Number),wall=s.walls[index];if(wall){wall.brokenWindows??=new Set();wall.brokenWindows.add(pane);if(wall.glassMeshes?.[pane])wall.glassMeshes[pane].visible=false;}}
 }
 if(s.appliedRemovedRoofs!==state.removedRoofs){s.appliedRemovedRoofs=state.removedRoofs;
 for(const i of state.removedRoofs||[]){const b=s.buildings[i];if(b&&!b.rb)roofBreak(b);}
 }
 if(s.appliedPalmHealth!==state.palmHealth){s.appliedPalmHealth=state.palmHealth;
 for(const [i,health] of state.palmHealth||[]){const palm=s.palms[i];if(palm){palm.hp=health;if(health<=0&&palm.alive)killPalm(palm);}}
 }
 if(s.appliedClaimedSupplies!==state.claimedSupplies){s.appliedClaimedSupplies=state.claimedSupplies;
 for(const id of state.claimedSupplies||[]){const item=s.items.get(id);if(item){world.remove(item.o);items=items.filter(it=>it!==item);s.items.delete(id);}}
 }
 s.projectedState=state;}
 const heldFire=hp>0&&!paused&&state.status==='running'&&!!K.KeyF;if(heldFire&&!s.fireHeld)nativeCoopCommand('fire');s.fireHeld=heldFire;
 if(scopeActive){scopeYaw+=((K.KeyA?1:0)-(K.KeyD?1:0)-joystick.state.x)*dt*.38;scopePitch=Math.max(-.65,Math.min(.65,scopePitch+((K.KeyW?1:0)-(K.KeyS?1:0)-joystick.state.y)*dt*.30));}
 window.HUNTER_STEALTH.tick(dt);
 window.HUNTER_STEALTH_DEBUG.update(THREE,world,E,P);
 updateDoors(dt);palmVisualTick-=dt;if(palmVisualTick<=0){palmVisualTick=scopeActive?.10:.16;PM.update?.(P.x,P.z,!!scopeActive,palmsDisabled,currentSniperFocus());updateShadowCasters();}worldVisualTick-=dt;if(worldVisualTick<=0){worldVisualTick=.2;updateDistanceVisibility();}updatePlayerCamera(dt);updateBazookaReticle(dt);updateLightAimReticle(dt);updateGrenadeCharge(dt);updatePlayerHUD(dt);updDeb(dt);updFx(dt);if(state.phase==='won'&&!victoryCinematic){const general=[...s.enemies.values()].find(e=>e.t==='general');if(general)startVictoryCinematic(general);}if(state.status==='paused'){msg='Sessió pausada · esperant el company.';msgT=1;}msgT=Math.max(0,msgT-dt);
}
window.HUNTER_NATIVE_COOP=Object.freeze({start:startNativeCoop,active:()=>!!nativeCoopSession,
 connected:()=>!!nativeCoopSession?.channel?.isOpen?.(),
 reconnect:()=>{
   const session=nativeCoopSession;
   if(!session||session.gameOver)return false;
   session.connectionStatus='connecting';
   session.preparing=true;
   session.channel?.reconnect?.();
   return true;
 }});


// Mateixa prioritat i icones E que el joc individual, però les dades
// d'acció provenen de l'estat del Worker, mai del gestor local dels NPC.
function nativeCoopOptionalAction(){
 const s=nativeCoopSession,optional=s?.state?.optionals;
 if(!optional||!s?.self||hp<=0||swimming||playerFall||cv||paused||s.gameOver)return null;
 const prison=optional.prison,mechanic=prison?.entities?.find(u=>
   u.role==='mechanic'&&u.hp>0&&u.state==='ready');
 if(mechanic&&prison.released&&Math.hypot(P.x-mechanic.x,P.z-mechanic.z)<9&&
    Math.abs(P.y-mechanic.y)<3.8){
  const repair=prison.repair,vehicles=s.state.vehicles||[];
  if(repair){
   if(repair.vehicleId&&vehicles.some(v=>v.id===repair.vehicleId))
    return {kind:'repair',target:repair.vehicleId,
      label:'Reparant '+Math.floor(repair.progress/6*100)+'% · cancel·lar',icon:'🔧'};
  }else{
   const target=vehicles.filter(v=>!v.destroyed&&!v.sunk&&
      v.life>0&&v.life<(v.maxLife??COMBAT_BALANCE.vehicles[v.t]??v.life)&&
      Math.abs(v.v||0)<=.35&&Math.abs(v.y-mechanic.y)<3.8&&
      Math.hypot(v.x-mechanic.x,v.z-mechanic.z)<Math.min(32,
        Math.max(7,vehicleRadius(v.t)+5)))
     .sort((a,b)=>Math.hypot(a.x-mechanic.x,a.z-mechanic.z)-
       Math.hypot(b.x-mechanic.x,b.z-mechanic.z))[0];
   if(target)return {kind:'repair',target:target.id,
     label:'Reparar '+(VT[target.t]?.n||target.t),icon:'🔧'};
  }
  if(Math.hypot(P.x-mechanic.x,P.z-mechanic.z)<4)
   return {kind:'mechanicFollow',target:mechanic.id,
     label:mechanic.following?'Mecànic: espera aquí':'Mecànic: segueix-me',icon:'🔧'};
 }
 const radio=optional.radio?.find(r=>r.operational&&
   Math.hypot(P.x-r.x,P.z-r.z)<2.9&&Math.abs(P.y-r.y)<2);
 return radio?{kind:'sabotage',target:radio.id,
   label:'Sabotejar el relé de ràdio',icon:'📡'}:null;
}
function nativeReviveAction(){const s=nativeCoopSession;if(!s?.state||cv||hp<=0||swimming||playerFall||!inv.med)return null;const other=s.state.players.find(p=>p.id!==s.self&&p.hp<=0&&Math.hypot(P.x-p.x,P.z-p.z)<=3.2&&Math.abs(P.y-p.y)<2);return other?{kind:'revive',label:'Mantén E per reanimar el company',icon:'✋'}:null;}
function stopNativeCoop(){document.getElementById('hunter-coop-game-over')?.remove();const s=nativeCoopSession;if(!s)return;s.channel?.stop?.();cancelGrenadeCharge();for(const key of Object.keys(K))K[key]=0;for(const mesh of s.projectiles.values())world?.remove(mesh);for(const mesh of s.grenades.values()){world?.remove(mesh);window.HUNTER_RESOURCES.dispose(mesh);}s.projectiles.clear();s.grenades.clear();window.HUNTER_ARCADE_BLAST_FX?.clear();removeParachuteVisual();s.projectileVisual?.reset();s.grenadeVisual?.reset();movementFx.reset();window.HUNTER_STEALTH.clear();window.HUNTER_STEALTH_DEBUG.reset();if(s.previousCheats)Object.assign(cheats,s.previousCheats);for(const model of s.remotes.values()){if(model.userData.nativeParachute){world.remove(model.userData.nativeParachute);model.userData.nativeParachute=null;}if(model.userData.nativeRider){scene.remove(model.userData.nativeRider.object);window.HUNTER_RESOURCES.dispose(model.userData.nativeRider.object);}scene.remove(model);window.HUNTER_RESOURCES.dispose(model);}nativeCoopSession=null;window.HUNTER_COOP_NETWORK_STATS=null;}
