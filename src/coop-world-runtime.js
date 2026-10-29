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
let nativeCoopSession=null;
function nativeCoopInput(){
 if(!nativeCoopSession||nativeCoopSession.preparing||paused||document.hidden)return {forward:0,turn:0,strafe:0,run:false,interact:false};
 const controls=readPlayerControls(updateStrafeControls(),!cv&&!paused&&!scopeActive),{f:forward,tr:turn,strafe,ud:climb,running:run}=controls;
 return {forward:scopeActive?0:forward,turn:scopeActive?0:turn,strafe:scopeActive?0:strafe,interact:!!K.KeyE&&!!nativeReviveAction(),run:!!run,crouch:!!playerCrouched,fire:!!K.KeyF&&(!grenadeEquipped||!!cv),...(cv&&VT[cv.t].m==='a'?{climb}: {})};
}
function captureNativeCoopWorld(){
 const geometry=captureCoopWorldGeometry(),baseWalls=geometry.walls;
 geometry.walls=Wl.map((w,i)=>({...baseWalls[i],id:w.saveId,buildingId:w.owner?.saveId,hp:Number.isFinite(w.hp)?w.hp:1e9,rammable:!!w.rammable,barbed:!!w.barbed,locked:!!w.locked&&!w.bunkerGate,alwaysOpen:!!w.alwaysOpen,...Object.fromEntries(['ax','az','bx','bz','supportSide','supportWeight','woodenDoor','upperFloorWindow'].filter(k=>w[k]!=null).map(k=>[k,w[k]]))}));
 geometry.buildings.forEach((b,i)=>{b.id=B[i].saveId;});geometry.stairs.forEach((s,i)=>{s.buildingId=stairs[i].owner?.saveId;});
 const all=[...new Set([...TG.values()].flat())];geometry.trees=[...PL,...all.filter(t=>!t.p)].map(t=>({x:t.x,z:t.z,r:t.r,p:!!t.p,rock:!!t.rock,...(t.p?{y:t.y,s:t.s,yaw:t.yaw}:{}),...(t.rock?{topY:t.topY,bottomY:t.bottomY}:{})}));
 const point=v=>({x:v.x,y:v.y??v.o?.position?.y??Math.max(0,hAt(v.x,v.z)),z:v.z});
 const itemMap={arma:['bullets',16],granada:['grenades',5],disf:['disguise',1],med:['medkits',1],fusell_assalt:['assault',1],franctirador:['sniper',1],bazooka:['bazooka',3],cisalla:['cutters',1],expl:['c4',1]};
 const payload={requestedSeed:requestedSeed>>>0,geometry,spawn:{...P},vehicles:V.map(v=>({id:v.saveId,t:v.t,...point(v),hd:v.hd,v:0,life:v.life??VT[v.t].life,rockets:v.rockets})),
  targets:E.map(e=>({id:e.saveId,t:e.t,...point(e),hp:e.hp,heading:e.hd||0,ai:e.t==='soldat'||e.t==='general',state:'patrol',patrol:(e.patrol?.length?e.patrol:[point(e)]).map(p=>({x:p.x,y:e.o.position.y,z:p.z})),guard:!!e.guard,sp:e.sp,rate:e.rate,dmg:e.dmg,elite:!!e.elite,rocketSoldier:!!e.rocketSoldier,sensePhaseTicks:Math.ceil((e.senseT||0)*30),seenTicks:0,lastAttack:-90})),
  supplies:items.filter(it=>itemMap[it.t]).map(it=>({id:it.saveId,item:itemMap[it.t][0],amount:itemMap[it.t][1],...point(it)}))};
 return JSON.parse(JSON.stringify(payload,(_,value)=>typeof value==='number'&&Number.isFinite(value)?Math.round(value*1e6)/1e6:value));
}
async function startNativeCoop(room){
 if(nativeCoopSession)throw Error('Ja hi ha una sessió cooperativa.');
 if(started&&!over){try{await saveOperation();}catch(error){msg=error.message;msgT=20;ui.show('coop');throw error;}}
 const session=nativeCoopSession={preparing:true,room,state:null,meta:null,self:null,remotes:new Map(),fireHeld:false,seenEffects:new Set(),projectiles:new Map(),grenades:new Map()};
 try{
  await startGameProgressively({seed:room.seed,scale:room.mapScale,difficulty:room.difficulty,nativeSession:true});
  const payload=captureNativeCoopWorld();session.prediction=window.HUNTER_CREATE_NATIVE_PREDICTION?.(payload.geometry);const text=JSON.stringify(payload),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));session.fingerprint=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
  session.walls=Wl.slice();session.buildings=B.slice();session.palms=PL.slice();session.vehicles=new Map(V.map(v=>[v.saveId,v]));session.enemies=new Map(E.map(e=>[e.saveId,e]));session.items=new Map(items.map(it=>[it.saveId,it]));
  session.channel=window.HUNTER_NATIVE_COOP_TRANSPORT({room,getInput:nativeCoopInput,onInput:message=>session.prediction?.sent(message.sequence),
   onStatus(status){if(status!=='open'&&session.state)session.state={...session.state,status:'paused'};const labels={connecting:'Connectant…',retrying:'Reconnectant…',replaced:'Sessió oberta en una altra pestanya.',ended:'Sessió finalitzada.',version:'Cal recarregar el joc.'};msg=status==='open'?'Preparant el mateix món amb el company…':labels[status]||'Connexió interrompuda.';msgT=8;},
   onAction(result){if(result.ok===false){const labels={EMPTY:'No tens munició.',NOT_EQUIPPED:'Cal equipar aquesta arma.',TOO_FAR:'Acosta’t més al vehicle o a la porta.',FULL:'El vehicle és ple.',MOVING:'Atura el vehicle abans de pujar o baixar.',EXIT_BLOCKED:'No hi ha espai per baixar.',BLOCKED:'Hi ha un obstacle al pas.'};if(labels[result.code]){msg=labels[result.code];msgT=3;}}},
   onRoom(){},onError(error){msg=error||'La sessió s’ha interromput.';msgT=12;session.preparing=true;},
   onMission(data){if(data.meta.fingerprint!==session.fingerprint){session.preparing=true;msg='El món de la sala no coincideix. Recarregueu tots dos.';msgT=30;return;}session.meta=data.meta;session.self=data.self;session.state=data.state;session.prediction?.receive(data.state,data.self);session.seenEffects=new Set(data.state.combat.effects.map(e=>e.id));session.preparing=false;paused=false;ui.hide();resetCameraState();},
   onState(state){session.state=state;session.prediction?.receive(state,session.self);}});
  session.channel.start();session.channel.prepare({payload,fingerprint:session.fingerprint,host:room.members.find(m=>m.host)?.id===window.HUNTER_ACCOUNT_SERVICE.status().user?.id||room.host===window.HUNTER_ACCOUNT_SERVICE.status().user?.id});
  msg='Esperant el company al món original…';msgT=30;
 }catch(error){stopNativeCoop();paused=true;msg=error.message;msgT=20;ui.show('coop');throw error;}
}
function nativeCoopFireWeapon(){
 return cv?(cv.t==='heli'?'grenade':window.HUNTER_SHARED_WEAPONS.mountedWeapons[cv.t]):grenadeEquipped?'grenade':bazookaEquipped?'bazooka':sniperEquipped?'sniper':assaultRifleEquipped?'assault':cisallaEquipped?'cutters':knifeEquipped?'knife':'pistol';
}
function selectNativeCoopWeapon(id){
 const weapons={pistola:'pistol',arma:'pistol',ganivet:'knife',fusell_assalt:'assault',franctirador:'sniper',bazooka:'bazooka',cisalla:'cutters',granada:'grenade'},weapon=weapons[id];
 if(!weapon||!nativeCoopSession?.state||cv||swimming||hp<=0||(!['pistol','knife'].includes(weapon)&&!inv[id]))return false;
 const sent=weapon==='grenade'||nativeCoopSession.channel.inventory('weapon',weapon);
 if(!sent)return false;
 cancelGrenadeCharge();cancelAssaultBurst();setSniperScope(false);grenadeEquipped=weapon==='grenade';
 if(grenadeEquipped){bazookaEquipped=sniperEquipped=assaultRifleEquipped=cisallaEquipped=knifeEquipped=false;}
 drawWeaponPicker();return true;
}
function nativeCoopCommand(type,payload={}){
 const s=nativeCoopSession;if(!s?.state||s.state.status!=='running'||paused&&!['item','plant'].includes(type))return false;
 if(type==='fire'){const weapon=nativeCoopFireWeapon();return weapon?s.channel.combat(cv&&cv.t!=='heli'?'pistol':weapon):false;}
 if(type==='vehicle'){const v=cv||nearV();return v?s.channel.vehicle(v.saveId,cv?'exit':'enter'):false;}
 if(type==='item'){
  const map={arma:'pistol',fusell_assalt:'assault',franctirador:'sniper',bazooka:'bazooka',cisalla:'cutters',ganivet:'knife',granada:'grenade'};
  if(map[payload.id]){const sent=selectNativeCoopWeapon(payload.id);if(sent)resume();return sent;}
  if(payload.id==='expl'){panel('bombtimer');return true;}
  if(payload.id==='med')return s.channel.inventory('use','medkits');
  if(payload.id==='disf')return s.channel.inventory('disguise',!disg);
  return false;
 }
 if(type==='optional')return !!nativeReviveAction();
 if(type==='plant')return (!cv||cv.t==='heli')&&s.channel.combat('c4',undefined,payload.seconds);return false;
}
function updateNativeCoop(dt){
 const s=nativeCoopSession;if(!s)return;updateStrafeControls();joystick.setRunEnabled(!cv&&!paused);if(s.preparing||!s.state){updatePlayerHUD(.13);return;}
 const state=s.state,actor=state.players.find(p=>p.id===s.self);if(!actor)return;
 const projecting=s.projectedState!==state,input=nativeCoopInput(),presented=s.prediction?.advance(dt,input,!paused&&!document.hidden&&state.status==='running')||actor;elapsed=state.tick/30;Object.assign(P,{x:presented.x,y:presented.y,z:presented.z,hd:presented.hd});hp=actor.hp;kills=state.combat.targets.filter(e=>e.hp<=0).length;swimming=!!presented.swimming;playerFall=presented.fall;ib=buildingCandidates(P.x,P.z).find(b=>Math.abs(P.x-b.x)<b.w/2&&Math.abs(P.z-b.z)<b.d/2&&P.y<b.fy+b.h)||null;
 const bag=state.inventories.find(i=>i.actorId===s.self);if(bag){if(grenadeEquipped&&!bag.grenades){cancelGrenadeCharge();grenadeEquipped=false;}ammo=bag.bullets;sniperAmmo=bag.sniperAmmo;inv={};for(const [key,id] of Object.entries({grenades:'granada',disguise:'disf',medkits:'med',assault:'fusell_assalt',sniper:'franctirador',bazooka:'bazooka',cutters:'cisalla',c4:'expl'}))if(bag[key])inv[id]=bag[key];bazookaEquipped=!grenadeEquipped&&bag.weapon==='bazooka';sniperEquipped=!grenadeEquipped&&bag.weapon==='sniper';assaultRifleEquipped=!grenadeEquipped&&bag.weapon==='assault';cisallaEquipped=!grenadeEquipped&&bag.weapon==='cutters';knifeEquipped=!grenadeEquipped&&bag.weapon==='knife';if(disg!==bag.disguised)setDis(bag.disguised);}
 cv=null;for(const row of state.vehicles){const v=s.vehicles.get(row.id);if(!v)continue;if(projecting)Object.assign(v,row);const predictedVehicle=s.prediction?.vehicle();if(predictedVehicle?.id===row.id)for(const key of ['x','y','z','hd','v','alt','verticalV','sideV','strafeV','driveInput','steerInput','yawRate'])if(predictedVehicle[key]!==undefined)v[key]=predictedVehicle[key];if(row.destroyed)v.o.visible=false;if(row.seats.includes(s.self)){cv=v;v.o.visible=!row.destroyed;}if(projecting&&!v.o.visible)v.o.position.set(row.x,row.y,row.z);if(projecting&&v.o.userData.turretPivot)v.o.userData.turretPivot.rotation.y=row.turretYaw||0;if(projecting&&v.o.userData.turretPitch)v.o.userData.turretPitch.rotation.x=row.turretPitch||0;}
 updateVehicleVisualLod(elapsed,dt,{skipHidden:true});
 if(cv||swimming)playerCrouched=false;if(scopeActive&&(cv||swimming||playerFall||!sniperEquipped))setSniperScope(false);pl.position.set(P.x,P.y,P.z);pl.rotation.y=P.hd;pl.visible=!cv&&!scopeActive;animPl(cv?0:input.forward,dt,input.run,input.strafe);poseRider(cv,dt);
 for(const other of state.players)if(other.id!==s.self){let model=s.remotes.get(other.id);if(!model){model=window.HUNTER_CHARACTERS.createPlayer(THREE,{box:bx});model.position.set(other.x,other.y,other.z);model.userData.nativeRider=window.HUNTER_RIDER.create(THREE,{scene,box:bx,material:M,scales:VS,heightAt:hAt,shadows:visualQuality.shadows});scene.add(model);s.remotes.set(other.id,model);}const oldX=model.position.x,oldZ=model.position.z;model.position.lerp(new THREE.Vector3(other.x,other.y,other.z),1-Math.exp(-18*dt));model.rotation.y=other.hd;const vehicleRow=state.vehicles.find(v=>v.seats.includes(other.id)),remoteVehicle=vehicleRow?s.vehicles.get(vehicleRow.id):null;model.visible=!remoteVehicle;model.userData.nativeRider.update(remoteVehicle,dt);const speed=Math.hypot(model.position.x-oldX,model.position.z-oldZ)/Math.max(.001,dt);window.HUNTER_CHARACTERS.animatePlayer(model,{forward:Math.min(1,speed/6),dt,swimming:other.swimming,crouching:!!other.crouched,inVehicle:!!remoteVehicle,ammo:1,running:speed>7});}

 for(const row of state.combat.targets){const e=s.enemies.get(row.id);if(e){if(e.nativeVisualTick!==state.tick){e.nativeMoving=Math.hypot(row.x-e.x,row.z-e.z)>.001;e.nativeVisualTick=state.tick;}e.x=row.x;e.z=row.z;e.hp=row.hp;e.hd=row.heading||0;e.canSee=!!row.canSee;e.aiMode=row.state==='attack'?'combat':row.state;if(projecting){e.o.position.set(row.x,row.y,row.z);e.o.rotation.y=e.hd;}if(row.hp<=0)e.o.visible=false;if(e.hp>0&&e.o.visible)animateEnemyInfantry(e,e.nativeMoving,dt);}}
 if(projecting){
 const liveProjectiles=new Set();for(const row of state.combat.projectiles){liveProjectiles.add(row.id);let mesh=s.projectiles.get(row.id);if(!mesh){mesh=new THREE.Mesh(row.splash?gHeavy:gLight,row.splash?mS:mW);mesh.scale.setScalar(row.splash?1:SMALL_ARMS_SCALE);world.add(mesh);s.projectiles.set(row.id,mesh);}mesh.position.set(row.x,row.y,row.z);const direction=new THREE.Vector3(row.vx,row.vy,row.vz);if(direction.lengthSq())mesh.quaternion.setFromUnitVectors(heavyForward,direction.normalize());}for(const [id,mesh] of s.projectiles)if(!liveProjectiles.has(id)){world.remove(mesh);s.projectiles.delete(id);}
 const liveGrenades=new Set();for(const row of state.combat.grenades){liveGrenades.add(row.id);let mesh=s.grenades.get(row.id);if(!mesh){mesh=row.weapon==='c4'?window.HUNTER_EXPLOSIVE_VISUALS.create(THREE,true):createGrenadeModel();world.add(mesh);s.grenades.set(row.id,mesh);}mesh.position.set(row.x,row.y,row.z);}for(const [id,mesh] of s.grenades)if(!liveGrenades.has(id)){world.remove(mesh);window.HUNTER_RESOURCES.dispose(mesh);s.grenades.delete(id);}
 for(const effect of state.combat.effects)if(!s.seenEffects.has(effect.id)){s.seenEffects.add(effect.id);if(effect.kind==='explosion')presentExplosion(effect.at.x,effect.at.y,effect.at.z,effect.radius);else if(effect.kind==='impact')spawnBulletImpact(effect.hit?'blood':'spark',effect.at.x,effect.at.y,effect.at.z,{vx:0,vy:0,vz:1});else if(effect.kind==='glass'&&s.walls[effect.wallIndex])shatterWindow(s.walls[effect.wallIndex],effect.paneIndex,effect.at,null);else if(effect.kind==='shot')snd('shot',.7,effect.from);}
 if(s.seenEffects.size>256){const current=new Set(state.combat.effects.map(e=>e.id));s.seenEffects=current;}
 for(const i of state.removedWalls||[]){const w=s.walls[i];if(w){w.open=true;w.hp=0;for(const mesh of w.parts||[w.m])if(mesh)mesh.visible=false;}}
 s.doors??=new Map(Dr.map(d=>[d.saveId,d]));for(const row of state.doors){const d=s.doors.get(row.id);if(d){d.desiredOpen=row.open;d.open=row.open;if(d.m)d.m.visible=!row.open&&!row.destroyed;}}
 for(const id of state.brokenWindows||[]){const [index,pane]=id.split(':').map(Number),wall=s.walls[index];if(wall){wall.brokenWindows??=new Set();wall.brokenWindows.add(pane);if(wall.glassMeshes?.[pane])wall.glassMeshes[pane].visible=false;}}
 for(const i of state.removedRoofs||[]){const b=s.buildings[i];if(b&&!b.rb)roofBreak(b);}
 for(const [i,health] of state.palmHealth||[]){const palm=s.palms[i];if(palm){palm.hp=health;if(health<=0&&palm.alive)killPalm(palm);}}
 for(const id of state.claimedSupplies){const item=s.items.get(id);if(item){world.remove(item.o);items=items.filter(it=>it!==item);s.items.delete(id);}}
 s.projectedState=state;}
 const heldFire=!paused&&state.status==='running'&&!!K.KeyF;if(heldFire&&!s.fireHeld)nativeCoopCommand('fire');s.fireHeld=heldFire;
 if(scopeActive){scopeYaw+=((K.KeyA?1:0)-(K.KeyD?1:0)-joystick.state.x)*dt*.38;scopePitch=Math.max(-.65,Math.min(.65,scopePitch+((K.KeyW?1:0)-(K.KeyS?1:0)-joystick.state.y)*dt*.30));}
 updateDoors(dt);palmVisualTick-=dt;if(palmVisualTick<=0){palmVisualTick=scopeActive?.10:.16;PM.update?.(P.x,P.z,!!scopeActive,palmsDisabled,currentSniperFocus());updateShadowCasters();}worldVisualTick-=dt;if(worldVisualTick<=0){worldVisualTick=.2;updateDistanceVisibility();}updatePlayerCamera(dt);updateBazookaReticle(dt);updateGrenadeCharge(dt);updatePlayerHUD(dt);updDeb(dt);updFx(dt);if(state.phase==='won'&&!victoryCinematic){const general=[...s.enemies.values()].find(e=>e.t==='general');if(general)startVictoryCinematic(general);}if(state.status==='paused'){msg='Sessió pausada · esperant el company.';msgT=1;}msgT=Math.max(0,msgT-dt);
}
window.HUNTER_NATIVE_COOP=Object.freeze({start:startNativeCoop,active:()=>!!nativeCoopSession});

function nativeReviveAction(){const s=nativeCoopSession;if(!s?.state||cv||!inv.med)return null;const other=s.state.players.find(p=>p.id!==s.self&&p.hp<=0&&Math.hypot(P.x-p.x,P.z-p.z)<=3.2&&Math.abs(P.y-p.y)<2);return other?{kind:'revive',label:'Mantén E per reanimar el company',icon:'✋'}:null;}
function stopNativeCoop(){const s=nativeCoopSession;if(!s)return;s.channel?.stop?.();cancelGrenadeCharge();for(const key of Object.keys(K))K[key]=0;for(const mesh of s.projectiles.values())world?.remove(mesh);for(const mesh of s.grenades.values()){world?.remove(mesh);window.HUNTER_RESOURCES.dispose(mesh);}s.projectiles.clear();s.grenades.clear();for(const model of s.remotes.values()){if(model.userData.nativeRider){scene.remove(model.userData.nativeRider.object);window.HUNTER_RESOURCES.dispose(model.userData.nativeRider.object);}scene.remove(model);window.HUNTER_RESOURCES.dispose(model);}nativeCoopSession=null;}
