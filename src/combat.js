// Compatibility extraction: shared state remains in game-core.js.
// FX de bales normals: un conjunt petit de malles compartides i reciclables.
// Les explosions i les col·lisions sense projectils conserven els FX originals.
const BULLET_IMPACT_LIMIT=112,bulletImpacts=[],bulletImpactFree=[];
const bulletBloodGeometry=new THREE.IcosahedronGeometry(.061,0),
      bulletSparkGeometry=new THREE.BoxGeometry(.045,.045,.17);
const bulletImpactMaterials={
  blood:[0x87262a,0xab3535].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.86,depthWrite:false})),
  spark:[0xffdb83,0xffa23d].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.94,depthWrite:false}))
};
function spawnBulletImpact(type,x,y,z,p){
  if(!world||(type!=='blood'&&type!=='spark'))return;
  const blood=type==='blood',count=blood?5:7,
        length=Math.max(.001,Math.hypot(p.vx,p.vy,p.vz)),
        backX=-p.vx/length,backY=-p.vy/length,backZ=-p.vz/length;
  for(let n=0;n<count&&bulletImpacts.length<BULLET_IMPACT_LIMIT;n++){
    const mats=bulletImpactMaterials[type],
          geometry=blood?bulletBloodGeometry:bulletSparkGeometry,
          m=bulletImpactFree.pop()||new THREE.Mesh(geometry,mats[n%2]);
    m.geometry=geometry;m.material=mats[n%2];
    const size=blood?rn(.7,1.1):rn(.7,1.4),
          life=blood?rn(.24,.38):rn(.13,.27),
          speed=blood?rn(.5,2.1):rn(1.8,5.4);
    m.position.set(x+backX*.09+rn(-.045,.045),y+backY*.09+rn(-.045,.045),z+backZ*.09+rn(-.045,.045));
    m.rotation.set(rn(0,6.28),rn(0,6.28),rn(0,6.28));
    m.scale.setScalar(size);m.visible=true;world.add(m);
    bulletImpacts.push({m,life,maxLife:life,size,
      vx:backX*speed+rn(-speed*.8,speed*.8),
      vy:backY*speed+rn(blood?.15:.7,blood?1.25:3.3),
      vz:backZ*speed+rn(-speed*.8,speed*.8),
      gravity:blood?9:14});
  }
}
function updateBulletImpacts(dt){
  for(let i=bulletImpacts.length-1;i>=0;i--){
    const f=bulletImpacts[i];f.life-=dt;
    if(f.life<=0){
      world.remove(f.m);f.m.visible=false;bulletImpactFree.push(f.m);
      bulletImpacts.splice(i,1);continue;
    }
    f.vy-=f.gravity*dt;
    f.m.position.x+=f.vx*dt;f.m.position.y+=f.vy*dt;f.m.position.z+=f.vz*dt;
    if(f.m.geometry===bulletSparkGeometry){f.m.rotation.x+=dt*17;f.m.rotation.z+=dt*13}
    f.m.scale.setScalar(f.size*Math.max(.05,f.life/f.maxLife));
  }
}
function clearBulletImpacts(){
  for(const f of bulletImpacts){world?.remove(f.m);f.m.visible=false;bulletImpactFree.push(f.m)}
  bulletImpacts.length=0;
}

function setDis(v){disg=v;[...pl.userData.mats,...rider.userData.mats].forEach(([m,a,b])=>m.color.copy(vivid(v?b:a)))}
function fin(m){setSniperScope(false);over=1;Object.keys(K).forEach(k=>K[k]=0);endEl.textContent=m+' · Obre Ⅱ / Esc per tornar a jugar';endEl.style.display='flex'}
function hurtP(d){if(over)return;d*=DIF;hp-=d;snd('hurt',.5);if(hp<=0){hp=0;fin('HAS MORT')}}
function destroyTower(u){
  if(!u?.o||u.destroyed)return;
  u.destroyed=true;
  // Desfer els col·lidors de les quatre potes i invalidar l'índex espacial.
  // Així cap projectil ni vehicle no col·lisiona amb una torre desapareguda.
  for(const leg of u.towerLegColliders||[]){
    const i=Wl.indexOf(leg);if(i>=0)Wl.splice(i,1);
  }
  wallGridCount=-1;
  u.towerLegColliders=[];
  // Abans es clonaven TOTES les malles, incloses les dues representacions
  // LOD (torres completes). Produïen dos esquelets gegants flotants.
  // Generam peces petites reals, sense copiar ni el LOD ni trams sencers.
  const base=u.o.position.y;
  for(let k=0;k<26;k++){
    const high=k<10,yy=base+(high?rn(7.5,10.2):rn(.8,7.6)),
          xx=u.x+rn(-1.85,1.85),zz=u.z+rn(-1.85,1.85),
          color=high?(k%3?0x7c2f2f:0x343a3e):0x4b5157,
          m=new THREE.Mesh(dgeo,dmat(color)),
          size=high?rn(.45,1.12):rn(.32,.78);
    m.scale.set(size*rn(.6,1.3),size*rn(.45,1),size*rn(.6,1.25));
    m.position.set(xx,yy,zz);m.rotation.set(rn(-.4,.4),rn(0,Math.PI),rn(-.4,.4));
    m.castShadow=true;world.add(m);
    const dx=xx-u.x,dz=zz-u.z,length=Math.max(.35,Math.hypot(dx,dz));
    DB.push({m,s0:m.scale.clone(),
      vx:dx/length*rn(6,13)+rn(-3,3),vy:rn(5,15),
      vz:dz/length*rn(6,13)+rn(-3,3),
      rx:rn(-7,7),ry:rn(-7,7),rz:rn(-7,7),
      life:rn(1.9,3.1),vehiclePart:true});
  }
  for(let k=0;k<8;k++)puff(u.x+rn(-2,2),base+rn(.5,9),u.z+rn(-2,2),
    k%2?0x55534f:0x8b8176,rn(1.5,3.5));
  boom(u.x,base+4,u.z,7,28,'p');
}
function explodeEnemyVehicle(u){
  // Mateixa explosió visual que els vehicles pilotables: fragments de la
  // geometria original, núvol de fum i ona de foc. No reapareix el model.
  if(u.destroyed)return;
  u.destroyed=true;
  const y=u.o?.position?.y??(u.gy??Math.max(0,hAt(u.x,u.z)));
  if(u.o){vehicleDebris(u,y);world.remove(u.o)}
  const heavy=u.t==='tanc'||u.t==='tanqueta';
  boom(u.x,y+(heavy?1.8:1.2),u.z,heavy?12:9,heavy?48:32,'e');
}
function killEnemy(u,killingShot=null){
  const i=E.indexOf(u);if(i<0)return;E.splice(i,1);kills++;
  if(u.t==='soldat'||u.t==='general'){window.HUNTER_ENEMY_LOD.setLevel(u.o,'full');u.deadT=0;u.deadSide=rn(-1,1)<0?-1:1;u.o.userData.legs?.forEach(l=>l.rotation.x=0);u.o.userData.arms?.forEach(a=>a.rotation.x=0);DEAD.push(u)}
  else if(u.t==='torre'){destroyTower(u);world.remove(u.o)}
  else if(u.t==='jeep'||u.t==='tanqueta'||u.t==='tanc'||u.t==='patrulla_marina')explodeEnemyVehicle(u);
  else world.remove(u.o);
  if(u.t==='general')startVictoryCinematic(u,killingShot)
}
function hurtE(u,d,killingShot=null){u.hp-=d;u.alert=12;if(u.hp<=0)killEnemy(u,killingShot)}
function explodeVehicle(v){
  if(!v||v.destroyed)return;v.destroyed=true;const wasPilot=cv===v,yy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
  if(wasPilot){
    if(VT[v.t]?.m==='a'){
      // Abandonament forçat en ple vol: el jugador surt realment des de
      // l'altura de l'helicòpter i rep el dany corresponent quan cau.
      ejectFromHelicopter(v);
      msg='L’helicòpter ha explotat! Estàs caient!';msgT=3;
    }else{
      cv=null;P.x=v.x;P.z=v.z;
      const a=rn(0,Math.PI*2),sp=rn(14,24);
      playerEject={kind:'blast',vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,t:.8,dur:.8,spin:rn(-1,1)<0?-1:1,height:1.25};
      hurtP(rn(18,30));msg='El vehicle ha explotat!';msgT=3;
    }
  }
  const i=V.indexOf(v);if(i>=0)V.splice(i,1);
  intelMarks=intelMarks.filter(m=>m.ref!==v);
  if(v.o){vehicleDebris(v,yy);world.remove(v.o)}
  boom(v.x,yy+1,v.z,10,45,'p');
}
// Els blindats requereixen projectils pesats; la resta de vehicles
// poden patir impactes lleugers. També protegeix el conductor.
// Projectils explosius: 50% més ràpids i meitat de mida visual.
const HEAVY_SHOT_SPEED_FACTOR=1.17,HEAVY_SHOT_DAMAGE_FACTOR=1.3,HEAVY_SHOT_VISUAL_SCALE=.5;
const shotClassFromSplash=spl=>spl>0?'heavy':'light';
const isArmoredVehicle=v=>v?.t==='tanqueta'||v?.t==='tanc'||
  (v&&Math.max(v.armor??0,VT[v.t]?.armor??0)>=6);
const isArmoredEnemy=u=>u?.t==='tanqueta'||u?.t==='tanc';
const isMilitaryBuilding=b=>!!b&&!b.civilian&&(!!b.compound||b.kind==='enemy_bunker');
const isMilitaryWall=w=>!!w?.towerLegOwner||isMilitaryBuilding(w?.owner);
function damageVehicle(v,dmg,impacts=1,shotClass='heavy'){
  if(shotClass==='light'&&isArmoredVehicle(v))return;
  if(!v||v.destroyed)return;const c=VT[v.t],armor=Math.max(0,Math.min(10,v.armor??c.armor??0));
  v.life=Math.max(0,(v.life??c.life??1)-Math.max(1,impacts));v.smokeT=0;
  // Si l'helicòpter queda destruït, reservam el dany per a la
  // caiguda: un cop mortal aquí congelaria l'expulsió en ple aire.
  const fallingFromDestroyedHeli=cv===v&&v.life<=0&&VT[v.t]?.m==='a';
  if(cv===v&&armor<10&&!fallingFromDestroyedHeli)hurtP(dmg*(1-armor/10)*.55);
  if(v.life<=0)explodeVehicle(v)
}

function shoot(x,y,z,dx,dy,dz,sp,dmg,spl,own,mat,sc){
  const shotClass=shotClassFromSplash(spl),speed=sp*(shotClass==='heavy'?HEAVY_SHOT_SPEED_FACTOR:1),
        power=dmg*(shotClass==='heavy'?HEAVY_SHOT_DAMAGE_FACTOR:1);
  snd(spl?'cannon':'shot',Math.max(0,1-Math.hypot(x-P.x,z-P.z)/140)*(own=='e'?.6:1));
  // Les bales petites conserven el seu model; les pesades són ojives
  // amb la punta orientada exactament segons el vector de velocitat.
  // La rotació no depèn del rumb del vehicle i també funciona en tirs
  // ascendents, descendents i diagonals.
  const heavy=shotClass==='heavy';
  const o=new THREE.Mesh(heavy?gHeavy:gB,mat);
  o.scale.setScalar(sc*(heavy?HEAVY_SHOT_VISUAL_SCALE:1));
  if(heavy){
    const heading=new THREE.Vector3(dx,dy,dz);
    if(heading.lengthSq()>1e-12)
      o.quaternion.setFromUnitVectors(heavyForward,heading.normalize());
  }
  o.position.set(x,y,z);world.add(o);
  Pj.push({x,y,z,sx:x,sy:y,sz:z,vx:dx*speed,vy:dy*speed,vz:dz*speed,dmg:power,spl,shotClass,own,life:2.2,o})
}
// Distància d'una explosió al CASC, no al centre del vehicle.
// Els coets impacten sobre l'esfera de col·lisió; en helicòpters grans
// aquesta superfície quedava fora del radi de l'explosió de 8 metres.
function explosionDistanceToVehicleHull(v,x,y,z){
  const vy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
  return Math.max(0,Math.hypot(v.x-x,vy+1-y,v.z-z)-vehicleRadius(v.t)*.62);
}
function boom(x,y,z,r,dmg,own,source=null){snd('boom',Math.max(0,1-Math.hypot(x-P.x,z-P.z)/200));const o=new THREE.Mesh(sphG,new THREE.MeshBasicMaterial({color:0xffa030,transparent:true}));o.position.set(x,y,z);world.add(o);fx.push({o,life:.6,s:r*1.6});
if(own!='e')for(const u of enemyCandidatesAt(x,z,r+vehicleRadius('llanxa')*.62+4)){
  // Per a una patrullera es mesura la distància a la superfície del casc,
  // no al seu centre: impactar a la proa o a un costat també la destrueix.
  const marine=u.t==='patrulla_marina',
        distance=Math.hypot(u.x-x,u.o.position.y+(marine?1.8:1.5)-y,u.z-z),
        d=marine?Math.max(0,distance-vehicleRadius('llanxa')*.62):distance;
  if(d<r)hurtE(u,dmg*(1-d/r*.5),
    source||{x,y,z,sx:cv?.x??P.x,sy:(cv?.o?.position.y??P.y)+1.7,sz:cv?.z??P.z,spl:r,own})
}
for(const w of wallCandidates(x,z,r)){const dd=Math.hypot((w.x0+w.x1)/2-x,(w.z0+w.z1)/2-z);if(dd<r&&y<w.y1+3)dmgW(w,dmg*1.5*(1-dd/(2*r)))}
for(const b of buildingCandidates(x,z,r)){const dd=Math.hypot(b.x-x,b.z-z),rr2=r+b.w/2;if(dd<rr2&&b.rhp>0){b.rhp-=dmg*1.2*(1-dd/rr2*.6);if(b.rhp<=0)roofBreak(b)}}
PL.forEach(t=>{if(!t.alive)return;const dd=Math.hypot(t.x-x,t.z-z);if(dd<r)dmgP(t,dmg*1.5*(1-dd/(2*r)))});
for(const v of vehicleCandidatesAt(x,z,r+12,true)){
  const surfaceDistance=explosionDistanceToVehicleHull(v,x,y,z);
  if(surfaceDistance<r&&(own!=='p'||v!==cv)){
    const power=Math.max(1,Math.ceil((1-surfaceDistance/r)*3));
    damageVehicle(v,dmg*.5*(1-surfaceDistance/r),power,'heavy')
  }
}
const q=cv?cv.o.position:P,d=Math.hypot(q.x-x,q.y-y,q.z-z);if(d<r&&own!='p'&&!cv)hurtP(dmg*.6*(1-d/r))}
function plant(){if(over||cv||swimming||!inv.expl)return;if(--inv.expl<=0)delete inv.expl;setDis(false);
const o=window.HUNTER_EXPLOSIVE_VISUALS.create(THREE,true);
// El display és a la cara local -Z. Amb el gir oposat al del jugador
// queda de cara a qui acaba de plantar la càrrega.
o.rotation.y=P.hd+Math.PI;
// La posem davant dels peus, no sota el personatge, perquè el visor es vegi.
const forward=1.35,x=P.x-Math.sin(P.hd)*forward,z=P.z-Math.cos(P.hd)*forward,
      y=Math.max(0,hAt(x,z))+.24;
o.position.set(x,y,z);world.add(o);
bombs.push({x,y,z,t:3,o});msg='Bomba col·locada: 3 s!';msgT=2}
// La filferrada és permeable a la vista i al foc lleuger, però segueix
// impedint els atacs cos a cos quan ignoreBarbed=false.
function sight(x,z,tx,tz,y,ignoreBarbed=true){const d=Math.hypot(tx-x,tz-z),n=Math.max(1,Math.ceil(d/1.5));for(let k=1;k<n;k++){const xx=x+(tx-x)*k/n,zz=z+(tz-z)*k/n;if(wallCandidates(xx,zz).some(w=>!w.open&&(!ignoreBarbed||!w.barbed)&&y>w.y0&&y<w.y1&&xx>w.x0&&xx<w.x1&&zz>w.z0&&zz<w.z1))return false}return true}
function melee(){if(cv||swimming||fcd>0)return false;fcd=.52;pl.userData.meleePose=pl.userData.knifeAttackDuration||.38;const fx_=-Math.sin(P.hd),fz=-Math.cos(P.hd);let hit=null,best=2.6;for(const u of E){const dx=u.x-P.x,dz=u.z-P.z,d=Math.hypot(dx,dz);if(d<best&&d>.35&&(dx*fx_+dz*fz)/d>.35&&sight(P.x,P.z,u.x,u.z,P.y+1.2,false)){best=d;hit=u}}if(hit)hurtE(hit,6);snd('hurt',hit?.45:.18);setDis(false);return true}
function secondaryWeapon(){
  if(!cv||fcd>0)return false;const hd=cv.hd,fx_=-Math.sin(hd),fz=-Math.cos(hd),d45=Math.SQRT1_2;
  if(cv.t==='heli_combat'){if((cv.rockets||0)<=0){msg='Sense míssils.';msgT=2;return false}cv.rockets--;fcd=.75;const x=cv.x+fx_*5,y=cv.o.position.y+1,z=cv.z+fz*5,[ax,ay,az]=autoAimWeaponShot(x,y,z,fx_*d45,-d45,fz*d45,120,.91,'heavy');shoot(x,y,z,ax,ay,az,72,60,10,'p',mS,2.4);msg='Míssils: '+cv.rockets;msgT=1;return true}
  if(cv.t==='llanxa_coets'){/* Munició infinita: no es consumeix ni es comprova el comptador. */fcd=.9;const x=cv.x+fx_*6,y=cv.o.position.y+1.2,z=cv.z+fz*6,base=Math.hypot(1,.015),[ax,ay,az]=autoAimWeaponShot(x,y,z,fx_/base,.015/base,fz/base,105,.94,'heavy');shoot(x,y,z,ax,ay,az,68,70,11,'p',mS,2.6);msg='Coets: ∞';msgT=1;return true}
  return false
}
// Un toc deixa caure la granada a prop; 1,4 s de pressió assoleixen
// l'abast màxim. La mateixa velocitat serveix per a la mira i el projectil.
const GRENADE_CHARGE_SECONDS=1.4,GRENADE_MIN_SPEED=3.5,GRENADE_MAX_SPEED=33;
let grenadeCharge=null,grenadeAimVisual=null;
function grenadeLaunchParams(power=0,origin=P,hd=P.hd){
  const ratio=Math.max(0,Math.min(1,power)),speed=GRENADE_MIN_SPEED+(GRENADE_MAX_SPEED-GRENADE_MIN_SPEED)*ratio,
        fx=-Math.sin(hd),fz=-Math.cos(hd);
  return {x:origin.x+fx*.85,y:origin.y+2.05,z:origin.z+fz*.85,
          vx:fx*speed,vy:12,vz:fz*speed,t:2.4};
}
function grenadeImpactTrajectory(power=0,origin=P,hd=P.hd){
  const g=grenadeLaunchParams(power,origin,hd),points=[{x:g.x,y:g.y,z:g.z}],dt=1/40;
  for(let i=0;i<96;i++){
    const x0=g.x,y0=g.y,z0=g.z,x1=x0+g.vx*dt,y1=y0+(g.vy-24*dt)*dt,z1=z0+g.vz*dt,
          mx=(x0+x1)/2,mz=(z0+z1)/2,reach=Math.hypot(x1-x0,z1-z0)/2+.5;
    let hitT=null;
    for(const w of wallCandidates(mx,mz,reach)){
      if(w.open)continue;
      const q=segmentAabbT(x0,y0,z0,x1,y1,z1,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1);
      if(q!=null&&(hitT==null||q<hitT))hitT=q;
    }
    for(const b of buildingCandidates(mx,mz,reach)){
      if(b.rhp<=0)continue;
      const q=b.hangar?hangarRoofSegmentT(x0,y0,z0,x1,y1,z1,b):
        segmentAabbT(x0,y0,z0,x1,y1,z1,b.x-b.w/2,b.x+b.w/2,b.fy+b.h-.35,b.fy+b.h+.8,b.z-b.d/2,b.z+b.d/2);
      if(q!=null&&(hitT==null||q<hitT))hitT=q;
    }
    const fraction=hitT==null?1:hitT;
    g.x=x0+(x1-x0)*fraction;g.y=y0+(y1-y0)*fraction;g.z=z0+(z1-z0)*fraction;
    g.vy-=24*dt;g.t-=dt;
    const surface=Math.max(hAt(g.x,g.z),wy(g.x,g.z,elapsed))+.16;
    if(hitT!=null||g.t<=0||g.y<=surface){
      g.y=Math.max(g.y,surface);points.push({x:g.x,y:g.y,z:g.z});break;
    }
    points.push({x:g.x,y:g.y,z:g.z});
  }
  const end=points[points.length-1];
  return {points,landing:{x:end.x,z:end.z,y:Math.max(hAt(end.x,end.z),wy(end.x,end.z,elapsed))+.21}};
}
// Només la cinta visual comença per sobre del cap, deixant espai amb
// el jugador. No retallam la simulació: el cercle continua marcant la
// caiguda real, fins i tot si la granada impacta abans de sortir del cos.
function grenadeAimStartIndex(points,origin=P){
  const minHeight=origin.y+3.55,minimumGap=1.45;
  return points.findIndex((p,i)=>i>0&&p.y>=minHeight&&
    Math.hypot(p.x-origin.x,p.z-origin.z)>=minimumGap);
}
function beginGrenadeCharge(){
  if(grenadeCharge||over||paused||cv||swimming||playerFall||fcd>0||!grenadeEquipped||!inv.granada)return false;
  grenadeCharge={elapsed:0};
  return true;
}
function cancelGrenadeCharge(){
  grenadeCharge=null;
  if(grenadeAimVisual){
    const a=grenadeAimVisual;world.remove(a.line,a.circle,a.fill);
    a.line.geometry.dispose();a.line.material.dispose();
    a.circle.geometry.dispose();a.circle.material.dispose();
    a.fill.geometry.dispose();a.fill.material.dispose();
    grenadeAimVisual=null;
  }
}
function releaseGrenadeCharge(){
  if(!grenadeCharge)return false;
  const power=Math.min(1,grenadeCharge.elapsed/GRENADE_CHARGE_SECONDS);
  cancelGrenadeCharge();
  return throwGrenade(power);
}
function updateGrenadeCharge(dt){
  if(!grenadeCharge)return;
  if(!grenadeEquipped||!inv.granada||cv||swimming||playerFall||paused||over){cancelGrenadeCharge();return}
  grenadeCharge.elapsed=Math.min(GRENADE_CHARGE_SECONDS,grenadeCharge.elapsed+dt);
  // Actualitzar només a 25 Hz per mantenir baix el cost de les interseccions.
  grenadeCharge.visualTimer=(grenadeCharge.visualTimer??0)-dt;
  if(grenadeCharge.visualTimer>0)return;
  grenadeCharge.visualTimer=.04;
  const aim=grenadeImpactTrajectory(grenadeCharge.elapsed/GRENADE_CHARGE_SECONDS);
  if(!grenadeAimVisual){
    // Cinta de triangles d'uns 25 cm: una línia WebGL simple d'1 px
    // és massa fina per veure-la amb claredat en mòbils.
    const geometry=new THREE.BufferGeometry(),
          positions=new THREE.BufferAttribute(new Float32Array(97*2*3),3),indices=[];
    for(let i=0;i<96;i++)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
    positions.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position',positions);geometry.setIndex(indices);
    const line=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
      color:0xff4949,side:THREE.DoubleSide,transparent:true,opacity:.48,
      depthWrite:false,depthTest:false
    }));
    line.frustumCulled=false;line.renderOrder=1001;
    const circle=new THREE.Mesh(new THREE.RingGeometry(.72,1.03,40).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({color:0xff4242,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false,depthTest:false}));
    const fill=new THREE.Mesh(new THREE.CircleGeometry(.72,40).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({color:0xff4242,side:THREE.DoubleSide,transparent:true,opacity:.18,depthWrite:false,depthTest:false}));
    circle.renderOrder=1002;fill.renderOrder=1001;
    world.add(line,circle,fill);grenadeAimVisual={line,circle,fill};
  }
  const a=grenadeAimVisual,attr=a.line.geometry.attributes.position,
        start=grenadeAimStartIndex(aim.points),visiblePoints=start<0?[]:aim.points.slice(start);
  for(let i=0;i<visiblePoints.length;i++){
    const p=visiblePoints[i],before=visiblePoints[Math.max(0,i-1)],
          after=visiblePoints[Math.min(visiblePoints.length-1,i+1)],
          dx=after.x-before.x,dz=after.z-before.z,d=Math.max(.001,Math.hypot(dx,dz)),
          sx=-dz/d*.125,sz=dx/d*.125;
    attr.setXYZ(i*2,p.x-sx,p.y+.06,p.z-sz);
    attr.setXYZ(i*2+1,p.x+sx,p.y+.06,p.z+sz);
  }
  a.line.geometry.setDrawRange(0,Math.max(0,visiblePoints.length-1)*6);attr.needsUpdate=true;
  a.circle.position.set(aim.landing.x,aim.landing.y+.035,aim.landing.z);
  a.fill.position.set(aim.landing.x,aim.landing.y+.02,aim.landing.z);
}
// Les granades de l'helicòpter utilitari provenen de l'inventari,
 // sense requerir que el jugador les tengui equipades. Surten per la
 // porta lateral i conserven la inèrcia de l'aparell.
function throwHelicopterGrenade(){
  if(!cv||cv.t!=='heli'||over||paused||fcd>0)return false;
  if(!inv.granada){
    msg='No tens granades a l’inventari.';msgT=2;fcd=.35;return false;
  }
  const v=cv,fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),
        rightX=Math.cos(v.hd),rightZ=-Math.sin(v.hd),
        forward=(v.v||0)*.9+7,side=(v.strafeV||0)+4.5,
        flight={
          x:v.x+fx*1.5+rightX*2.5,
          y:v.o.position.y+2.4,
          z:v.z+fz*1.5+rightZ*2.5,
          vx:fx*forward+rightX*side,vy:5,
          vz:fz*forward+rightZ*side,t:2.4
        };
  inv.granada--;
  if(inv.granada<=0){delete inv.granada;grenadeEquipped=false}
  fcd=.7;setDis(false);
  launchGrenade({flight});
  msg='Granades: '+(inv.granada||0);msgT=1.5;
  return true;
}
function throwGrenade(power=0){
  if(over||cv||swimming||fcd>0||!grenadeEquipped||!inv.granada)return false;
  // Fixem el llançament quan s'allibera el botó perquè la predicció i
  // el punt de caiguda no canviïn durant l'animació de llançament.
  const flight=grenadeLaunchParams(power);
  inv.granada--;if(inv.granada<=0){delete inv.granada;grenadeEquipped=false}
  fcd=.7;setDis(false);
  pl.userData.grenadeThrow=.55;pl.userData.grenadeReleased=false;
  pl.userData.grenadeThrowPower=Math.max(0,Math.min(1,power));
  pl.userData.grenadePending={t:.23,flight};
  msg='Granades: '+(inv.granada||0);msgT=1.5;
  return true;
}
function launchGrenade(pending){
  const flight=pending.flight||grenadeLaunchParams(),{x,y,z,vx,vy,vz,t}=flight,
        o=new THREE.Group(),
        body=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),new THREE.MeshStandardMaterial({color:0x46513f,roughness:.82,metalness:.08}));
  body.scale.set(.88,1.08,.88);o.add(body);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(.08,.13,.08),new THREE.MeshStandardMaterial({color:0x252b27,roughness:.7,metalness:.25}));cap.position.y=.18;o.add(cap);
  o.position.set(x,y,z);world.add(o);
  grenades.push({x,y,z,vx,vy,vz,t,o});
}
// Prioritat compartida: 0 soldats/general, 1 vehicles enemics, 2 torres.
// Elements de l'escenari i vehicles abandonats no competeixen per l'autoapuntat.
function weaponTargetPriority(enemy){
  if(enemy.t==='soldat'||enemy.t==='general')return 0;
  if(enemy.t==='jeep'||enemy.t==='tanqueta'||enemy.t==='tanc'||enemy.t==='patrulla_marina')return 1;
  if(enemy.t==='torre')return 2;
  return 3;
}
// Les bales lleugeres travessen la filferrada. Només els obstacles
// sòlids bloquegen l'apuntat assistit.
function weaponAimClear(x,y,z,tx,ty,tz){
  // Una sola consulta als índexs espacials per candidat. Evitem centenars
  // de mostres petites a cada tret de metralladora de l'helicòpter.
  const mx=(x+tx)/2,mz=(z+tz)/2,reach=Math.hypot(tx-x,tz-z)/2+3;
  for(const w of wallCandidates(mx,mz,reach)){
    if(w.open||w.barbed)continue;
    const t=segmentAabbT(x,y,z,tx,ty,tz,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1);
    if(t!=null&&t<.98)return false;
  }
  for(const b of buildingCandidates(mx,mz,reach)){
    if(b.rhp<=0)continue;
    const t=b.hangar
      ?hangarRoofSegmentT(x,y,z,tx,ty,tz,b)
      :segmentAabbT(x,y,z,tx,ty,tz,
        b.x-b.w/2-.6,b.x+b.w/2+.6,b.fy+b.h-.4,b.fy+b.h+1.4,
        b.z-b.d/2-.6,b.z+b.d/2+.6);
    if(t!=null&&t<.98)return false;
  }
  return true;
}
// Solució del punt d'intercepció a velocitat constant per a llanxes mòbils.
// S'utilitza només al bazooka: la resta d'armes conserva la seva punteria.
function bazookaInterceptPoint(e,originX,originY,originZ,targetY,speed){
  const vx=-Math.sin(e.hd)*(e.speed||0),vz=-Math.cos(e.hd)*(e.speed||0),
        dx=e.x-originX,dy=targetY-originY,dz=e.z-originZ,
        a=vx*vx+vz*vz-speed*speed,b=2*(dx*vx+dz*vz),
        c=dx*dx+dy*dy+dz*dz,disc=b*b-4*a*c;
  if(disc<0||Math.abs(a)<.00001)return {x:e.x,y:targetY,z:e.z};
  const roots=[(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)],
        time=Math.min(...roots.filter(t=>t>0));
  if(!Number.isFinite(time)||time>3.7)return {x:e.x,y:targetY,z:e.z};
  return {x:e.x+vx*time,y:targetY,z:e.z+vz*time};
}
function autoAimWeaponShot(x,y,z,fx,fy,fz,range,cone=.97,shotClass='light',focus=null,projectileSpeed=0){
  if(focus){focus.target=null;focus.point=null}
  let bestPriority=Infinity,bestDist=range,chosen=null;
  for(const e of E){
    if(e.destroyed||e.hp<=0||shotClass==='light'&&(isArmoredEnemy(e)||e.t==='torre'))continue;
    const priority=weaponTargetPriority(e);
    if(priority>=3||priority>bestPriority)continue;
    const dx=e.x-x,dz=e.z-z,dist=Math.hypot(dx,dz);
    if(dist<=1||dist>range||(priority===bestPriority&&dist>=bestDist))continue;
    const baseY=e.o?.position?.y??(e.gy??0),
          ty=baseY+(e.t==='torre'?4.5:e.t==='tanc'?2.8:e.t==='tanqueta'?2.1:e.t==='patrulla_marina'?1.8:1.5),
          dy=ty-y,len=Math.hypot(dx,dy,dz);
    if(len<=.001||(dx*fx+dy*fy+dz*fz)/len<cone)continue;
    if(!weaponAimClear(x,y,z,e.x,ty,e.z))continue;
    const lead=projectileSpeed>0&&e.t==='patrulla_marina'
      ?bazookaInterceptPoint(e,x,y,z,ty,projectileSpeed):{x:e.x,y:ty,z:e.z},
          leadX=lead.x-x,leadY=lead.y-y,leadZ=lead.z-z,
          length=Math.hypot(leadX,leadY,leadZ);
    bestPriority=priority;bestDist=dist;
    chosen=[leadX/length,leadY/length,leadZ/length];
    if(focus){focus.target=e;focus.point={x:e.x,y:ty,z:e.z}}
  }
  return chosen||[fx,fy,fz];
}
// Retícula del bazooka: empra EXACTAMENT les coordenades i el con de
// selecció d'autoapuntat del tret real. Blanca si apunta lliurement,
// verda quan hi ha una diana enemiga seleccionada.
const bazookaReticleElement=document.getElementById('bazookaReticle');
const bazookaReticleWorld=new THREE.Vector3(),bazookaReticleScreen=new THREE.Vector3();
let bazookaReticleTimer=0,bazookaReticleHasHit=false,bazookaReticleLocked=false;
// Primera superfície real a la trajectòria; cap objectiu => cap retícula
// damunt de mar buit o horitzó. No altera en absolut la balística.
function bazookaFirstSolidHit(x,y,z,dx,dy,dz,range=105){
  const tx=x+dx*range,ty=y+dy*range,tz=z+dz*range,
        mx=(x+tx)/2,mz=(z+tz)/2,reach=Math.hypot(tx-x,tz-z)/2;
  let best=Infinity;
  const consider=t=>{if(t!=null&&t>=0&&t<=1&&t<best)best=t};
  for(const w of wallCandidates(mx,mz,reach+2)){
    if(w.open)continue;
    consider(segmentAabbT(x,y,z,tx,ty,tz,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1));
  }
  for(const b of buildingCandidates(mx,mz,reach+2)){
    if(b.rhp<=0)continue;
    consider(b.hangar?hangarRoofSegmentT(x,y,z,tx,ty,tz,b)
      :segmentAabbT(x,y,z,tx,ty,tz,b.x-b.w/2-.6,b.x+b.w/2+.6,
        b.fy+b.h-.4,b.fy+b.h+1.4,b.z-b.d/2-.6,b.z+b.d/2+.6));
  }
  for(const e of enemyCandidatesAt(mx,mz,reach+16)){
    if(e.destroyed||e.hp<=0)continue;
    const marine=e.t==='patrulla_marina';
    consider(segmentSphereT(x,y,z,tx,ty,tz,e.x,
      e.o.position.y+(marine?1.8:e.t==='torre'?4.5:1.5),
      e.z,marine?vehicleRadius('llanxa')*.62:(e.r||1)+.6));
  }
  for(const v of vehicleCandidatesAt(mx,mz,reach+12,true)){
    if(v.destroyed)continue;
    consider(segmentSphereT(x,y,z,tx,ty,tz,v.x,
      (v.o?.position.y??Math.max(0,hAt(v.x,v.z)))+1,v.z,vehicleRadius(v.t)*.62));
  }
  const steps=Math.ceil(range/3);
  for(let k=1;k<=steps;k++){
    const t=k/steps;if(t>=best)break;
    const px=x+(tx-x)*t,pz=z+(tz-z)*t,py=y+(ty-y)*t;
    if(py<Math.max(hAt(px,pz),0)+.2){consider(t);break}
  }
  if(!Number.isFinite(best))return null;
  return {x:x+(tx-x)*best,y:y+(ty-y)*best,z:z+(tz-z)*best};
}
function updateBazookaReticle(dt){
  if(!bazookaReticleElement)return;
  const visible=started&&!paused&&!over&&!cv&&!swimming&&!playerFall&&
    bazookaEquipped&&(inv.bazooka||0)>0;
  if(!visible){bazookaReticleElement.style.display='none';bazookaReticleTimer=0;bazookaReticleHasHit=false;return}
  bazookaReticleTimer-=dt;
  if(bazookaReticleTimer<=0){
    bazookaReticleTimer=.08;
    const fx=-Math.sin(P.hd),fz=-Math.cos(P.hd),
          ox=P.x+fx*1.35,oy=P.y+1.9,oz=P.z+fz*1.35,
          base=Math.hypot(1,.01),focus={},
          direction=autoAimWeaponShot(ox,oy,oz,fx/base,.01/base,fz/base,
            105,.94,'heavy',focus,72*HEAVY_SHOT_SPEED_FACTOR);
    bazookaReticleLocked=!!focus.target;
    const hit=focus.point||bazookaFirstSolidHit(ox,oy,oz,
      direction[0],direction[1],direction[2]);
    bazookaReticleHasHit=!!hit;
    if(hit)bazookaReticleWorld.set(hit.x,hit.y,hit.z);
    bazookaReticleElement.classList.toggle('locked',bazookaReticleLocked);
  }
  if(!bazookaReticleHasHit){bazookaReticleElement.style.display='none';return}
  cam.updateMatrixWorld();
  bazookaReticleScreen.copy(bazookaReticleWorld).project(cam);
  const p=bazookaReticleScreen;
  if(p.z<-1||p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1){
    bazookaReticleElement.style.display='none';return;
  }
  bazookaReticleElement.style.display='block';
  bazookaReticleElement.style.left=((p.x+1)*50)+'%';
  bazookaReticleElement.style.top=((1-p.y)*50)+'%';
}
// Conservem el punt de sortida horitzontal del tanc i la tanqueta (0 graus).
function autoAimArmoredShot(x,y,z,fx,fz,range){
  return autoAimWeaponShot(x,y,z,fx,0,fz,range,.97,'heavy');
}
// Rifle: sortida REAL des de l'extrem del canó. En mode mira el model
// invisible s'orienta com l'òptica; P.hd i el moviment no canvien.
function sniperMuzzleWorld(heading,pitch=0){
  const rifle=pl.userData.sniper,muzzle=pl.userData.sniperMuzzle;
  if(!rifle||!muzzle)throw new Error('Falta el pivot del canó del franctirador');
  rifle.rotation.set(pitch,heading-P.hd,0,'YXZ');
  pl.position.set(P.x,P.y,P.z);
  pl.rotation.y=P.hd;
  pl.updateMatrixWorld(true);
  return muzzle.getWorldPosition(new THREE.Vector3());
}
// Primer obstacle sota el centre del reticle (mateixes col·lisions que les
// bales). Apuntar a un talús no ha de generar una bala desviada cap al terra.
function sniperReticlePoint(focus,range=1000){
  const ox=P.x+Math.sin(scopeYaw)*.12,oy=P.y+1.76,
        oz=P.z+Math.cos(scopeYaw)*.12,
        tx=ox+focus.dx*range,ty=oy+focus.dy*range,tz=oz+focus.dz*range,
        mx=(ox+tx)/2,mz=(oz+tz)/2,reach=Math.hypot(tx-ox,tz-oz)/2+8;
  let bestT=1;
  const consider=t=>{if(t!=null&&t>0&&t<bestT)bestT=t};
  for(const w of wallCandidates(mx,mz,reach)){
    if(!w.open&&!w.barbed)consider(segmentAabbT(ox,oy,oz,tx,ty,tz,
      w.x0,w.x1,w.y0,w.y1,w.z0,w.z1));
  }
  for(const b of buildingCandidates(mx,mz,reach)){
    if(b.rhp<=0)continue;
    const hit=b.hangar?hangarRoofSegmentT(ox,oy,oz,tx,ty,tz,b):
      segmentAabbT(ox,oy,oz,tx,ty,tz,
        b.x-b.w/2-.6,b.x+b.w/2+.6,b.fy+b.h-.4,b.fy+b.h+1.4,
        b.z-b.d/2-.6,b.z+b.d/2+.6);
    consider(hit);
  }
  for(const e of enemyCandidatesAt(mx,mz,reach+4)){
    if(e.hp<=0||e.destroyed)continue;
    consider(segmentSphereT(ox,oy,oz,tx,ty,tz,
      e.x,e.o.position.y+(e.t==='torre'?4.5:1.5),e.z,(e.r||1)+.6));
  }
  for(const v of vehicleCandidatesAt(mx,mz,reach+12,true)){
    if(v.destroyed)continue;
    const baseY=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
    consider(segmentSphereT(ox,oy,oz,tx,ty,tz,
      v.x,baseY+1,v.z,vehicleRadius(v.t)*.62));
  }
  // Mostreig del terreny de 3 m, amb refinament binari del punt d'impacte.
  const samples=Math.ceil(range/3),surfaceDifference=t=>{
    const x=ox+(tx-ox)*t,z=oz+(tz-oz)*t;
    return oy+(ty-oy)*t-(Math.max(hAt(x,z),0)+.2);
  };
  let prev=0;
  for(let k=1;k<=samples;k++){
    const t=k/samples;
    if(t>=bestT)break;
    if(surfaceDifference(t)<0){
      let lo=prev,hi=t;
      for(let j=0;j<9;j++){
        const mid=(lo+hi)*.5;
        if(surfaceDifference(mid)<0)hi=mid;else lo=mid;
      }
      bestT=Math.min(bestT,hi);break;
    }
    prev=t;
  }
  return new THREE.Vector3(ox+(tx-ox)*bestT,oy+(ty-oy)*bestT,oz+(tz-oz)*bestT);
}
function sniperShotVector(muzzle,target,focus){
  const d=target.clone().sub(muzzle),
        heading=new THREE.Vector3(focus.dx,focus.dy,focus.dz);
  // Per a obstacles que estan darrere de la boca, mai disparar enrere.
  if(d.lengthSq()<16||d.dot(heading)<0)return heading;
  return d.normalize();
}
// Cisalla: treu només el tram proper i encaradís, sense cap alerta ni so.
function cutBarbedWire(){
 if(!cisallaEquipped||!inv.cisalla||cv||swimming||playerFall||playerEject||over||fcd>0)
   return false;
 const reach=2.75,fx=-Math.sin(P.hd),fz=-Math.cos(P.hd);
 let target=null,closest=Infinity;
 for(const w of wallCandidates(P.x,P.z,reach+1)){
   if(!w.barbed||w.open||w.hp<=0||P.y+1.1<w.y0||P.y+1.1>w.y1)continue;
   const x=Math.max(w.x0,Math.min(w.x1,P.x)),
     z=Math.max(w.z0,Math.min(w.z1,P.z)),
     nx=x-P.x,nz=z-P.z,
     near=Math.hypot(nx,nz),
     facing=near>.08?(nx*fx+nz*fz)/near:
       ((w.cx-P.x)*fx+(w.cz-P.z)*fz)/Math.max(.01,Math.hypot(w.cx-P.x,w.cz-P.z));
   if(near>reach||facing<.3)continue;
   if(near<closest){closest=near;target=w}
 }
 if(!target){
   fcd=.28;msg='Acosta’t a una filferrada i mira-la per tallar-la.';msgT=1.6;
   return false;
 }
 target.hp=0;target.cut=true;
 for(const piece of target.parts?.length?target.parts:[target.m]){
   piece.visible=false;piece.parent?.remove(piece);
 }
 const index=Wl.indexOf(target);if(index>=0){Wl.splice(index,1);wallGridCount=-1}
 const doorIndex=Dr.indexOf(target);if(doorIndex>=0)Dr.splice(doorIndex,1);
 pl.userData.cisallaCut=.46;fcd=.52;
 msg='Filferrada tallada silenciosament.';msgT=1.4;
 return true;
}
// La pistola personal és utilitzable només des dels vehicles oberts.
const OPEN_RIDER_PISTOL=new Set(['bici','moto','moto_aquatica','barca_rems','windsurf','llanxa']);
function fire(){if(cisallaEquipped&&!cv)return cutBarbedWire();if(over||swimming||fcd>0)return;const c=cv&&cv.t,hd=cv?cv.hd:P.hd,fx_=-Math.sin(hd),fz=-Math.cos(hd);
if(c=='tanc'||c=='tanqueta'){
  // El projectil segueix el canó real mentre la torreta gira: no
  // s'alinea artificialment amb l'objectiu en prémer Dispar.
  const gun=window.HUNTER_VEHICLES.turretShot(THREE,cv.o);
  if(!gun)return;
  const {origin:p,direction:d}=gun;
  if(c=='tanc'){
    fcd=.9;shoot(p.x,p.y,p.z,d.x,d.y,d.z,85,45,8,'p',mS,2.2);
    Pj[Pj.length-1].life=4.4;
  }else{
    fcd=TANKETTE_FIRE_INTERVAL;shoot(p.x,p.y,p.z,d.x,d.y,d.z,135,10,0,'p',mW,SMALL_ARMS_SCALE);
  }
}
else if(c==='heli'){throwHelicopterGrenade();return}
else if(c=='heli_combat'){const a30=Math.PI/6,ch=Math.cos(a30),sv=Math.sin(a30),x=cv.x+fx_*4.1*VS.heli_combat,y=cv.o.position.y+.15,z=cv.z+fz*4.1*VS.heli_combat;const [ax,ay,az]=autoAimWeaponShot(x,y,z,fx_*ch,-sv,fz*ch,130,.91);fcd=.12;shoot(x,y,z,ax,ay,az,145,9,0,'p',mB,.85)}

else if(c=='llanxa_coets'){secondaryWeapon();return}
else if(c&&OPEN_RIDER_PISTOL.has(c)){
  // Un tret amb la pistola, des de la mà dreta del pilot, mantenint
  // el mateix consum, dany, cadència i autoapuntat que quan va a peu.
  if(ammo<=0)return;
  const shot=riderSystem.firePistol(cv,(origin,direction)=>
    autoAimWeaponShot(origin.x,origin.y,origin.z,
      direction.x,direction.y,direction.z,75,.97));
  if(!shot)return;
  ammo--;fcd=.22;
  const p=shot.origin,d=shot.direction;
  shoot(p.x,p.y,p.z,d.x,d.y,d.z,130,12,0,'p',mW,SMALL_ARMS_SCALE);
}
else if(!cv&&sniperEquipped&&inv.franctirador){
  if(sniperAmmo<=0){msg='El rifle no té munició.';msgT=2;return}
  sniperAmmo--;fcd=1.05;pl.userData.firePose=.42;
  // Origen físic del projectil: punta del rifle, no tors ni ull.
  // Amb zoom, la trajectòria convergeix al primer punt sota el reticle.
  const heading=scopeActive?scopeYaw:hd,
        muzzle=sniperMuzzleWorld(heading,scopeActive?scopePitch:0),
        fx=-Math.sin(heading),fz=-Math.cos(heading),
        focus=scopeActive?window.HUNTER_SCOPE_FOCUS.create(P.x,P.y+1.76,P.z,scopeYaw,scopePitch):null,
        direction=focus
          ?sniperShotVector(muzzle,sniperReticlePoint(focus),focus)
          :new THREE.Vector3(...autoAimWeaponShot(muzzle.x,muzzle.y,muzzle.z,fx,0,fz,180,.984));
  shoot(muzzle.x,muzzle.y,muzzle.z,direction.x,direction.y,direction.z,470,65,0,'p',mW,SMALL_ARMS_SCALE);
  msg='Rifle: '+sniperAmmo+' cartutxos.';msgT=1.5;
}
else if(!cv&&grenadeEquipped&&inv.granada){throwGrenade();return}
else if(!cv&&bazookaEquipped&&inv.bazooka){if(--inv.bazooka<=0){delete inv.bazooka;bazookaEquipped=false}fcd=1.05;pl.userData.firePose=.42;const x=P.x+fx_*1.35,y=P.y+1.9,z=P.z+fz*1.35,base=Math.hypot(1,.01),[ax,ay,az]=autoAimWeaponShot(x,y,z,fx_/base,.01/base,fz/base,105,.94,'heavy',null,72*HEAVY_SHOT_SPEED_FACTOR);shoot(x,y,z,ax,ay,az,72,135,18,'pb',mS,3);Pj[Pj.length-1].life=3.8;msg='Bazooka: '+(inv.bazooka||0)+' coets restants.';msgT=2;setDis(false)}
else if(!cv&&ammo>0){ammo--;fcd=.22;pl.userData.firePose=.32;pl.userData.pistolAimTime=.32;pl.userData.pistolShotAge=0;const x=P.x+fx_*.7,y=P.y+1.5,z=P.z+fz*.7,[ax,ay,az]=autoAimWeaponShot(x,y,z,fx_,0,fz,75,.97);shoot(x,y,z,ax,ay,az,130,12,0,'p',mW,SMALL_ARMS_SCALE)}
else if(!cv&&ammo<=0){melee();return}else return;setDis(false)}
function segmentAabbT(x0,y0,z0,x1,y1,z1,minX,maxX,minY,maxY,minZ,maxZ){
  let lo=0,hi=1;
  const clip=(p,d,mn,mx)=>{
    if(Math.abs(d)<1e-9)return p>=mn&&p<=mx;
    let a=(mn-p)/d,b=(mx-p)/d;if(a>b){const q=a;a=b;b=q}
    lo=Math.max(lo,a);hi=Math.min(hi,b);return lo<=hi
  };
  return clip(x0,x1-x0,minX,maxX)&&clip(y0,y1-y0,minY,maxY)&&clip(z0,z1-z0,minZ,maxZ)&&hi>=0&&lo<=1?Math.max(0,lo):null
}
function segmentSphereT(x0,y0,z0,x1,y1,z1,cx,cy,cz,r){
  const dx=x1-x0,dy=y1-y0,dz=z1-z0,mx=x0-cx,my=y0-cy,mz=z0-cz,
        a=dx*dx+dy*dy+dz*dz,c=mx*mx+my*my+mz*mz-r*r;
  if(c<=0)return 0;if(a<1e-12)return null;
  const b=2*(mx*dx+my*dy+mz*dz),disc=b*b-4*a*c;if(disc<0)return null;
  const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null
}
function hangarRoofSegmentT(x0,y0,z0,x1,y1,z1,b){
  const segs=b.roof?.userData?.hitSegments;if(!segs?.length)return null;
  let best=null;
  for(const s of segs){
    const rz=s.a-Math.PI/2,c=Math.cos(rz),sn=Math.sin(rz),
          ax=x0-b.x-s.x,ay=y0-b.fy-s.y,az=z0-b.z,
          bx=x1-b.x-s.x,by=y1-b.fy-s.y,bz=z1-b.z,
          lx0=ax*c+ay*sn,ly0=-ax*sn+ay*c,
          lx1=bx*c+by*sn,ly1=-bx*sn+by*c,
          t=segmentAabbT(lx0,ly0,az,lx1,ly1,bz,-s.chord/2,s.chord/2,-.16,.16,-s.depth/2,s.depth/2);
    if(t!=null&&(best==null||t<best))best=t
  }
  return best
}
function updPj(dt){
  for(let i=Pj.length-1;i>=0;i--){
    const p=Pj[i],x0=p.x,y0=p.y,z0=p.z,x1=x0+p.vx*dt,y1=y0+p.vy*dt,z1=z0+p.vz*dt,
          sx=x1-x0,sy=y1-y0,sz=z1-z0,horiz=Math.hypot(sx,sz),
          mx=(x0+x1)/2,mz=(z0+z1)/2,reach=horiz/2;
    p.life-=dt;
    let bestT=p.life<=0?1:Infinity,kind=p.life<=0?'expire':null,target=null;

    const consider=(t,k,o)=>{if(t!=null&&t>=0&&t<=1&&t<bestT){bestT=t;kind=k;target=o}};

    // Parets i teulades: intersecció contínua de segment amb AABB.
    for(const w of wallCandidates(mx,mz,reach+1)){
      // Bales de pistola, rifle, soldats, cotxes i tanquetes: passen.
      // Míssils, coets i canons explosius continuen colpejant el filferro.
      if(w.open||(w.barbed&&p.shotClass==='light'))continue;
      consider(segmentAabbT(x0,y0,z0,x1,y1,z1,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1),'wall',w)
    }
    for(const b of buildingCandidates(mx,mz,reach+1)){
      if(b.rhp<=0)continue;
      const bt=b.hangar
        ?hangarRoofSegmentT(x0,y0,z0,x1,y1,z1,b)
        :segmentAabbT(x0,y0,z0,x1,y1,z1,b.x-b.w/2-.6,b.x+b.w/2+.6,b.fy+b.h-.4,b.fy+b.h+1.4,b.z-b.d/2-.6,b.z+b.d/2+.6);
      consider(bt,'building',b)
    }

    // Personatges i vehicles: intersecció contínua amb volum esfèric aproximat.
    if(p.own==='p'||p.own==='pb'){
      // També cercam els centres de llanxes situats a cel·les veïnes
      // quan només la proa o la popa intercepten el segment del coet.
      for(const u of enemyCandidatesAt(mx,mz,reach+vehicleRadius('llanxa')*.62+4)){
        // Les llanxes patrulleres reben bales lleugeres per tot el buc,
        // també a proa i popa; el radi de soldat era massa petit.
        const marine=u.t==='patrulla_marina',
              cy=u.o.position.y+(marine?1.8:u.t==='torre'?4.5:1.5),
              radius=marine?vehicleRadius('llanxa')*.62:(u.r||1)+.6;
        consider(segmentSphereT(x0,y0,z0,x1,y1,z1,u.x,cy,u.z,radius),'enemy',u)
      }
    }
    for(const v of vehicleCandidatesAt(mx,mz,reach+12,true)){
      if(p.own==='p'&&v===cv)continue;
      const vy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z)),rr=vehicleRadius(v.t)*.62;
      consider(segmentSphereT(x0,y0,z0,x1,y1,z1,v.x,vy+1,v.z,rr),'vehicle',v)
    }
    if(p.own==='e'&&!cv)consider(segmentSphereT(x0,y0,z0,x1,y1,z1,P.x,P.y+1.5,P.z,1.2),'player',P);

    // Terreny i arbres continuen mostrejats a una densitat equivalent a l'antic substep.
    const sampleN=Math.max(1,Math.ceil(Math.hypot(sx,sy,sz)/1.15));
    for(let k=1;k<=sampleN;k++){
      const t=k/sampleN;if(t>=bestT)break;
      const x=x0+sx*t,y=y0+sy*t,z=z0+sz*t,ground=Math.max(hAt(x,z),0)+.2;
      if(y<ground){consider(t,'terrain',null);break}
      const tree=treeAt(x,z,.5);
      if(tree&&y<Math.max(hAt(x,z),0)+(tree.p?6.5:1.5)){consider(t,'tree',tree);break}
    }

    const hit=bestT!==Infinity;
    const t=hit?bestT:1;p.x=x0+sx*t;p.y=y0+sy*t;p.z=z0+sz*t;p.o.position.set(p.x,p.y,p.z);
    if(!hit)continue;

    if(!p.spl){
      // La mateixa detecció de col·lisions dona feedback en ambdós sentits.
      // Soldats/general/jugador: sang discreta; altres dianes: espurnes.
      const person=kind==='player'||(kind==='enemy'&&(target.t==='soldat'||target.t==='general')),
            solid=kind==='wall'||kind==='building'||kind==='vehicle'||kind==='enemy';
      if(person)spawnBulletImpact('blood',p.x,p.y,p.z,p);
      else if(solid)spawnBulletImpact('spark',p.x,p.y,p.z,p);
      if(kind==='wall'){if(!isMilitaryWall(target))dmgW(target,p.dmg*(p.own==='e'?.5:1))}
      else if(kind==='building'){if(!isMilitaryBuilding(target)){target.rhp-=p.dmg*(p.own==='e'?.5:1);if(target.rhp<=0)roofBreak(target)}}
      else if(kind==='tree'&&target?.p)dmgP(target,p.dmg*(p.own==='e'?.5:1));
      else if(kind==='enemy'){if(!isArmoredEnemy(target)&&target.t!=='torre')hurtE(target,p.dmg,p)}
      else if(kind==='vehicle')damageVehicle(target,p.dmg,1,'light');
      else if(kind==='player')hurtP(p.dmg)
    }
    if(p.spl)boom(p.x,p.y,p.z,p.spl,p.dmg,p.own,p);
    world.remove(p.o);Pj.splice(i,1)
  }
}
function updFx(dt){
const pending=pl.userData.grenadePending;if(pending){pending.t-=dt;if(pending.t<=0){launchGrenade(pending);pl.userData.grenadeReleased=true;pl.userData.grenadePending=null}}
for(let i=grenades.length-1;i>=0;i--){const g=grenades[i],x0=g.x,y0=g.y,z0=g.z;g.t-=dt;g.vy-=24*dt;const x1=x0+g.vx*dt,y1=y0+g.vy*dt,z1=z0+g.vz*dt,mx=(x0+x1)/2,mz=(z0+z1)/2,reach=Math.hypot(x1-x0,z1-z0)/2+.5;let hitT=null;
  for(const w of wallCandidates(mx,mz,reach))if(!w.open){const q=segmentAabbT(x0,y0,z0,x1,y1,z1,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1);if(q!=null&&(hitT==null||q<hitT))hitT=q}
  for(const b of buildingCandidates(mx,mz,reach)){const q=b.hangar?hangarRoofSegmentT(x0,y0,z0,x1,y1,z1,b):segmentAabbT(x0,y0,z0,x1,y1,z1,b.x-b.w/2,b.x+b.w/2,b.fy+b.h-.35,b.fy+b.h+.8,b.z-b.d/2,b.z+b.d/2);if(q!=null&&(hitT==null||q<hitT))hitT=q}
  const q=hitT==null?1:hitT;g.x=x0+(x1-x0)*q;g.y=y0+(y1-y0)*q;g.z=z0+(z1-z0)*q;g.o.position.set(g.x,g.y,g.z);g.o.rotation.x+=dt*8;g.o.rotation.z+=dt*5;
  const surface=Math.max(hAt(g.x,g.z),wy(g.x,g.z,elapsed))+.16;
  if(hitT!=null||g.t<=0||g.y<=surface){g.y=Math.max(g.y,surface);boom(g.x,g.y,g.z,16,100,'b');world.remove(g.o);grenades.splice(i,1)}
}
for(let i=bombs.length-1;i>=0;i--){const b=bombs[i];b.t-=dt;
  if(b.t>0)window.HUNTER_EXPLOSIVE_VISUALS.update(b.o,b.t);
  if(b.t<=0){boom(b.x,b.y,b.z,48,300,'b');world.remove(b.o);bombs.splice(i,1)}}
for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt;f.o.scale.setScalar(1+(.6-f.life)*f.s);f.o.material.opacity=Math.max(0,f.life/.6);if(f.life<=0){world.remove(f.o);fx.splice(i,1)}}
updateBulletImpacts(dt);
}

