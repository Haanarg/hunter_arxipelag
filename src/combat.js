// Compatibility extraction: shared state remains in game-core.js.
function setDis(v){disg=v;[...pl.userData.mats,...rider.userData.mats].forEach(([m,a,b])=>m.color.copy(vivid(v?b:a)))}
function fin(m){over=1;Object.keys(K).forEach(k=>K[k]=0);endEl.textContent=m+' · Obre Ⅱ / Esc per tornar a jugar';endEl.style.display='flex'}
function hurtP(d){if(over)return;d*=DIF;hp-=d;snd('hurt',.5);if(hp<=0){hp=0;fin('HAS MORT')}}
function destroyTower(u){
  if(!u?.o)return;u.o.updateMatrixWorld(true);const p=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),center=new THREE.Vector3(u.x,u.o.position.y+4,u.z);
  u.o.traverse(src=>{if(!src.isMesh||src.isInstancedMesh||!src.geometry)return;src.matrixWorld.decompose(p,q,sc);const piece=new THREE.Mesh(src.geometry,src.material);piece.position.copy(p);piece.quaternion.copy(q);piece.scale.copy(sc);piece.castShadow=true;world.add(piece);const dx=p.x-center.x,dz=p.z-center.z,dd=Math.max(.3,Math.hypot(dx,dz)),sp=rn(6,15);DB.push({m:piece,s0:piece.scale.clone(),vx:dx/dd*sp+rn(-4,4),vy:rn(7,20),vz:dz/dd*sp+rn(-4,4),rx:rn(-7,7),ry:rn(-7,7),rz:rn(-7,7),life:rn(2.5,4.5),vehiclePart:true})});debris(u.x,u.o.position.y+5,u.z,0x4b5157,12,.45,12);for(let i=0;i<5;i++)puff(u.x+rn(-2,2),u.o.position.y+rn(2,8),u.z+rn(-2,2),0x55534f,rn(1.3,2.6));boom(u.x,u.o.position.y+4,u.z,7,28,'p')
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
function killEnemy(u){
  const i=E.indexOf(u);if(i<0)return;E.splice(i,1);kills++;
  if(u.t==='soldat'||u.t==='general'){u.deadT=0;u.deadSide=rn(-1,1)<0?-1:1;u.o.userData.legs?.forEach(l=>l.rotation.x=0);u.o.userData.arms?.forEach(a=>a.rotation.x=0);DEAD.push(u)}
  else if(u.t==='torre'){destroyTower(u);world.remove(u.o)}
  else if(u.t==='jeep'||u.t==='tanqueta'||u.t==='tanc')explodeEnemyVehicle(u);
  else world.remove(u.o);
  if(u.t==='general')fin('MISSIÓ COMPLERTA: el general ha caigut!')
}
function hurtE(u,d){u.hp-=d;u.alert=12;if(u.hp<=0)killEnemy(u)}
function explodeVehicle(v){
  if(!v||v.destroyed)return;v.destroyed=true;const wasPilot=cv===v,yy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
  if(wasPilot){cv=null;P.x=v.x;P.z=v.z;const a=rn(0,Math.PI*2),sp=rn(14,24);playerEject={kind:'blast',vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,t:.8,dur:.8,spin:rn(-1,1)<0?-1:1,height:1.25};hurtP(rn(18,30));msg='El vehicle ha explotat!';msgT=3}
  const i=V.indexOf(v);if(i>=0)V.splice(i,1);
  intelMarks=intelMarks.filter(m=>m.ref!==v);
  if(v.o){vehicleDebris(v,yy);world.remove(v.o)}
  boom(v.x,yy+1,v.z,10,45,'p');
}
function damageVehicle(v,dmg,impacts=1){
  if(!v||v.destroyed)return;const c=VT[v.t],armor=Math.max(0,Math.min(10,v.armor??c.armor??0));
  v.life=Math.max(0,(v.life??c.life??1)-Math.max(1,impacts));v.smokeT=0;
  if(cv===v&&armor<10)hurtP(dmg*(1-armor/10)*.55);
  if(v.life<=0)explodeVehicle(v)
}

function shoot(x,y,z,dx,dy,dz,sp,dmg,spl,own,mat,sc){snd(spl?'cannon':'shot',Math.max(0,1-Math.hypot(x-P.x,z-P.z)/140)*(own=='e'?.6:1));const o=new THREE.Mesh(gB,mat);o.scale.setScalar(sc);o.position.set(x,y,z);world.add(o);Pj.push({x,y,z,vx:dx*sp,vy:dy*sp,vz:dz*sp,dmg,spl,own,life:2.2,o})}
function boom(x,y,z,r,dmg,own){snd('boom',Math.max(0,1-Math.hypot(x-P.x,z-P.z)/200));const o=new THREE.Mesh(sphG,new THREE.MeshBasicMaterial({color:0xffa030,transparent:true}));o.position.set(x,y,z);world.add(o);fx.push({o,life:.6,s:r*1.6});
if(own!='e')for(const u of enemyCandidatesAt(x,z,r+4)){const d=Math.hypot(u.x-x,u.o.position.y+1.5-y,u.z-z);if(d<r)hurtE(u,dmg*(1-d/r*.5))}
for(const w of wallCandidates(x,z,r)){const dd=Math.hypot((w.x0+w.x1)/2-x,(w.z0+w.z1)/2-z);if(dd<r&&y<w.y1+3)dmgW(w,dmg*1.5*(1-dd/(2*r)))}
for(const b of buildingCandidates(x,z,r)){const dd=Math.hypot(b.x-x,b.z-z),rr2=r+b.w/2;if(dd<rr2&&b.rhp>0){b.rhp-=dmg*1.2*(1-dd/rr2*.6);if(b.rhp<=0)roofBreak(b)}}
PL.forEach(t=>{if(!t.alive)return;const dd=Math.hypot(t.x-x,t.z-z);if(dd<r)dmgP(t,dmg*1.5*(1-dd/(2*r)))});
for(const v of vehicleCandidatesAt(x,z,r+12,true)){const vy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z)),dd=Math.hypot(v.x-x,vy-y,v.z-z);if(dd<r&&own!='p'){const power=Math.max(1,Math.ceil((1-dd/r)*3));damageVehicle(v,dmg*.5*(1-dd/r),power)}}
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
function sight(x,z,tx,tz,y){const d=Math.hypot(tx-x,tz-z),n=Math.max(1,Math.ceil(d/1.5));for(let k=1;k<n;k++){const xx=x+(tx-x)*k/n,zz=z+(tz-z)*k/n;if(wallCandidates(xx,zz).some(w=>!w.open&&y>w.y0&&y<w.y1&&xx>w.x0&&xx<w.x1&&zz>w.z0&&zz<w.z1))return false}return true}
function melee(){if(cv||swimming||fcd>0)return false;fcd=.52;pl.userData.meleePose=.34;const fx_=-Math.sin(P.hd),fz=-Math.cos(P.hd);let hit=null,best=2.6;for(const u of E){const dx=u.x-P.x,dz=u.z-P.z,d=Math.hypot(dx,dz);if(d<best&&d>.35&&(dx*fx_+dz*fz)/d>.35&&sight(P.x,P.z,u.x,u.z,P.y+1.2)){best=d;hit=u}}if(hit)hurtE(hit,6);snd('hurt',hit?.45:.18);setDis(false);return true}
function secondaryWeapon(){
  if(!cv||fcd>0)return false;const hd=cv.hd,fx_=-Math.sin(hd),fz=-Math.cos(hd),d45=Math.SQRT1_2;
  if(cv.t==='heli_combat'){if((cv.rockets||0)<=0){msg='Sense míssils.';msgT=2;return false}cv.rockets--;fcd=.75;shoot(cv.x+fx_*5,cv.o.position.y+1,cv.z+fz*5,fx_*d45,-d45,fz*d45,72,60,10,'p',mS,2.4);msg='Míssils: '+cv.rockets;msgT=1;return true}
  if(cv.t==='llanxa_coets'){if((cv.rockets||0)<=0){msg='Sense coets.';msgT=2;return false}cv.rockets--;fcd=.9;shoot(cv.x+fx_*6,cv.o.position.y+1.2,cv.z+fz*6,fx_,.015,fz,68,70,11,'p',mS,2.6);msg='Coets: '+cv.rockets;msgT=1;return true}
  return false
}
function throwGrenade(){
  if(over||cv||swimming||fcd>0||!grenadeEquipped||!inv.granada)return false;
  inv.granada--;if(inv.granada<=0){delete inv.granada;grenadeEquipped=false}
  fcd=.7;setDis(false);
  pl.userData.grenadeThrow=.55;pl.userData.grenadeReleased=false;
  pl.userData.grenadePending={t:.23,hd:P.hd};
  msg='Granades: '+(inv.granada||0);msgT=1.5;
  return true
}
function launchGrenade(hd){
  const fx_=-Math.sin(hd),fz=-Math.cos(hd),
        o=new THREE.Group(),
        body=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),new THREE.MeshStandardMaterial({color:0x46513f,roughness:.82,metalness:.08}));
  body.scale.set(.88,1.08,.88);o.add(body);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(.08,.13,.08),new THREE.MeshStandardMaterial({color:0x252b27,roughness:.7,metalness:.25}));cap.position.y=.18;o.add(cap);
  const x=P.x+fx_*.85,y=P.y+2.05,z=P.z+fz*.85;o.position.set(x,y,z);world.add(o);
  grenades.push({x,y,z,vx:fx_*18,vy:12,vz:fz*18,t:2.4,o})
}
// Com la pistola: triem l'enemic més proper dins d'un con estret, sense
// apuntar a través de murs. Sense objectiu el tret surt exactament a 0°.
function autoAimArmoredShot(x,y,z,fx,fz,range){
  let best=range,dirX=fx,dirY=0,dirZ=fz;
  for(const e of E){
    if(e.destroyed||e.hp<=0)continue;
    const dx=e.x-x,dz=e.z-z,d=Math.hypot(dx,dz);
    if(d<=1||d>=best||(dx*fx+dz*fz)/d<=.97)continue;
    const ty=(e.o?.position?.y??(e.gy??0))+1.5,dy=ty-y;
    if(Math.abs(Math.atan2(dy,d))>Math.PI/9)continue;
    if(!sight(x,z,e.x,e.z,y))continue;
    const len=Math.hypot(dx,dy,dz);
    best=d;dirX=dx/len;dirY=dy/len;dirZ=dz/len;
  }
  return [dirX,dirY,dirZ];
}
function fire(){if(over||swimming||fcd>0)return;const c=cv&&cv.t,hd=cv?cv.hd:P.hd,fx_=-Math.sin(hd),fz=-Math.cos(hd);
if(c=='tanc'){const muzzleZ=5.35*VS.tanc,muzzleY=2.62*VS.tanc,x=cv.x+fx_*muzzleZ,y=cv.o.position.y+muzzleY,z=cv.z+fz*muzzleZ;const [ax,ay,az]=autoAimArmoredShot(x,y,z,fx_,fz,110);fcd=.9;shoot(x,y,z,ax,ay,az,85,45,8,'p',mS,2.2)}
else if(c=='heli'){const a30=Math.PI/6,ch=Math.cos(a30),sv=Math.sin(a30);fcd=.6;shoot(cv.x+fx_*3.2*VS.heli,cv.o.position.y+.5*VS.heli,cv.z+fz*3.2*VS.heli,fx_*ch,-sv,fz*ch,85,45,8,'p',mS,2)}
else if(c=='heli_combat'){const a30=Math.PI/6,ch=Math.cos(a30),sv=Math.sin(a30);fcd=.12;shoot(cv.x+fx_*4.1*VS.heli_combat,cv.o.position.y+.15,cv.z+fz*4.1*VS.heli_combat,fx_*ch,-sv,fz*ch,145,9,0,'p',mB,.85)}
else if(c=='tanqueta'){const muzzleZ=3.05*VS.tanqueta,muzzleY=2.48*VS.tanqueta,x=cv.x+fx_*muzzleZ,y=cv.o.position.y+muzzleY,z=cv.z+fz*muzzleZ;const [ax,ay,az]=autoAimArmoredShot(x,y,z,fx_,fz,85);fcd=.16;shoot(x,y,z,ax,ay,az,135,10,0,'p',mB,.9)}
else if(c=='llanxa_coets'){secondaryWeapon();return}
else if(!cv&&grenadeEquipped&&inv.granada){throwGrenade();return}
else if(!cv&&bazookaEquipped&&inv.bazooka){if(--inv.bazooka<=0)delete inv.bazooka;bazookaEquipped=false;fcd=1.05;pl.userData.firePose=.42;shoot(P.x+fx_*1.35,P.y+1.9,P.z+fz*1.35,fx_,.01,fz,72,135,18,'pb',mS,3);msg='Bazooka disparat!';msgT=2;setDis(false)}
else if(!cv&&ammo>0){ammo--;fcd=.22;pl.userData.firePose=.32;pl.userData.pistolAimTime=.32;pl.userData.pistolShotAge=0;let ax=fx_,ay=0,az=fz,best=75;for(const e of E){const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);if(d<best&&d>1&&(dx*fx_+dz*fz)/d>.97&&sight(P.x,P.z,e.x,e.z,P.y+1.5)){best=d;const dy=e.o.position.y+1.5-(P.y+1.5),l=Math.hypot(dx,dy,dz);ax=dx/l;ay=dy/l;az=dz/l}}shoot(P.x+fx_*.7,P.y+1.5,P.z+fz*.7,ax,ay,az,130,12,0,'p',mB,1)}
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
      if(w.open)continue;
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
      for(const u of enemyCandidatesAt(mx,mz,reach+4)){
        consider(segmentSphereT(x0,y0,z0,x1,y1,z1,u.x,u.o.position.y+1.5,u.z,(u.r||1)+.6),'enemy',u)
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
      if(kind==='wall')dmgW(target,p.dmg*(p.own==='e'?.5:1));
      else if(kind==='building'){target.rhp-=p.dmg*(p.own==='e'?.5:1);if(target.rhp<=0)roofBreak(target)}
      else if(kind==='tree'&&target?.p)dmgP(target,p.dmg*(p.own==='e'?.5:1));
      else if(kind==='enemy')hurtE(target,p.dmg);
      else if(kind==='vehicle')damageVehicle(target,p.dmg,1);
      else if(kind==='player')hurtP(p.dmg)
    }
    if(p.spl)boom(p.x,p.y,p.z,p.spl,p.dmg,p.own);
    world.remove(p.o);Pj.splice(i,1)
  }
}
function updFx(dt){
const pending=pl.userData.grenadePending;if(pending){pending.t-=dt;if(pending.t<=0){launchGrenade(pending.hd);pl.userData.grenadeReleased=true;pl.userData.grenadePending=null}}
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
for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt;f.o.scale.setScalar(1+(.6-f.life)*f.s);f.o.material.opacity=Math.max(0,f.life/.6);if(f.life<=0){world.remove(f.o);fx.splice(i,1)}}}

