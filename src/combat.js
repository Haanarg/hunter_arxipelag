// Compatibility extraction: shared state remains in game-core.js.
function setDis(v){disg=v;pl.userData.mats.forEach(([m,a,b])=>m.color.copy(vivid(v?b:a)))}
function fin(m){over=1;Object.keys(K).forEach(k=>K[k]=0);endEl.textContent=m+' · Obre Ⅱ / Esc per tornar a jugar';endEl.style.display='flex'}
function hurtP(d){if(over)return;d*=DIF;hp-=d;snd('hurt',.5);if(hp<=0){hp=0;fin('HAS MORT')}}
function destroyTower(u){
  if(!u?.o)return;u.o.updateMatrixWorld(true);const p=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),center=new THREE.Vector3(u.x,u.o.position.y+4,u.z);
  u.o.traverse(src=>{if(!src.isMesh||src.isInstancedMesh||!src.geometry)return;src.matrixWorld.decompose(p,q,sc);const piece=new THREE.Mesh(src.geometry,src.material);piece.position.copy(p);piece.quaternion.copy(q);piece.scale.copy(sc);piece.castShadow=true;world.add(piece);const dx=p.x-center.x,dz=p.z-center.z,dd=Math.max(.3,Math.hypot(dx,dz)),sp=rn(6,15);DB.push({m:piece,s0:piece.scale.clone(),vx:dx/dd*sp+rn(-4,4),vy:rn(7,20),vz:dz/dd*sp+rn(-4,4),rx:rn(-7,7),ry:rn(-7,7),rz:rn(-7,7),life:rn(2.5,4.5),vehiclePart:true})});debris(u.x,u.o.position.y+5,u.z,0x4b5157,12,.45,12);for(let i=0;i<5;i++)puff(u.x+rn(-2,2),u.o.position.y+rn(2,8),u.z+rn(-2,2),0x55534f,rn(1.3,2.6));boom(u.x,u.o.position.y+4,u.z,7,28,'p')
}
function killEnemy(u){
  const i=E.indexOf(u);if(i<0)return;E.splice(i,1);kills++;
  if(u.t==='soldat'||u.t==='general'){u.deadT=0;u.deadSide=rn(-1,1)<0?-1:1;u.o.userData.legs?.forEach(l=>l.rotation.x=0);u.o.userData.arms?.forEach(a=>a.rotation.x=0);DEAD.push(u)}
  else if(u.t==='torre'){destroyTower(u);world.remove(u.o)}
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
if(own!='e')E.slice().forEach(u=>{const d=Math.hypot(u.x-x,u.o.position.y+1.5-y,u.z-z);if(d<r)hurtE(u,dmg*(1-d/r*.5))});
Wl.slice().forEach(w=>{const dd=Math.hypot((w.x0+w.x1)/2-x,(w.z0+w.z1)/2-z);if(dd<r&&y<w.y1+3)dmgW(w,dmg*1.5*(1-dd/(2*r)))});
B.forEach(b=>{const dd=Math.hypot(b.x-x,b.z-z),rr2=r+b.w/2;if(dd<rr2&&b.rhp>0){b.rhp-=dmg*1.2*(1-dd/rr2*.6);if(b.rhp<=0)roofBreak(b)}});
PL.forEach(t=>{if(!t.alive)return;const dd=Math.hypot(t.x-x,t.z-z);if(dd<r)dmgP(t,dmg*1.5*(1-dd/(2*r)))});
V.slice().forEach(v=>{const vy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z)),dd=Math.hypot(v.x-x,vy-y,v.z-z);if(dd<r&&own!='p'){const power=Math.max(1,Math.ceil((1-dd/r)*3));damageVehicle(v,dmg*.5*(1-dd/r),power)}});
const q=cv?cv.o.position:P,d=Math.hypot(q.x-x,q.y-y,q.z-z);if(d<r&&own!='p'&&!cv)hurtP(dmg*.6*(1-d/r))}
function plant(){if(over||cv||swimming||!inv.expl)return;if(--inv.expl<=0)delete inv.expl;setDis(false);const o=new THREE.Mesh(new THREE.BoxGeometry(.9,.5,.9),new THREE.MeshBasicMaterial({color:0xff2020}));
o.position.set(P.x,P.y+.3,P.z);world.add(o);bombs.push({x:P.x,y:P.y+.3,z:P.z,t:3,o});msg='Bomba col·locada: 3 s!';msgT=2}
function sight(x,z,tx,tz,y){const d=Math.hypot(tx-x,tz-z),n=Math.max(1,Math.ceil(d/1.5));for(let k=1;k<n;k++){const xx=x+(tx-x)*k/n,zz=z+(tz-z)*k/n;if(wallCandidates(xx,zz).some(w=>!w.open&&y>w.y0&&y<w.y1&&xx>w.x0&&xx<w.x1&&zz>w.z0&&zz<w.z1))return false}return true}
function melee(){if(cv||swimming||fcd>0)return false;fcd=.52;pl.userData.meleePose=.34;const fx_=-Math.sin(P.hd),fz=-Math.cos(P.hd);let hit=null,best=2.6;for(const u of E){const dx=u.x-P.x,dz=u.z-P.z,d=Math.hypot(dx,dz);if(d<best&&d>.35&&(dx*fx_+dz*fz)/d>.35&&sight(P.x,P.z,u.x,u.z,P.y+1.2)){best=d;hit=u}}if(hit)hurtE(hit,6);snd('hurt',hit?.45:.18);setDis(false);return true}
function secondaryWeapon(){
  if(!cv||fcd>0)return false;const hd=cv.hd,fx_=-Math.sin(hd),fz=-Math.cos(hd),d45=Math.SQRT1_2;
  if(cv.t==='heli_combat'){if((cv.rockets||0)<=0){msg='Sense míssils.';msgT=2;return false}cv.rockets--;fcd=.75;shoot(cv.x+fx_*5,cv.o.position.y+1,cv.z+fz*5,fx_*d45,-d45,fz*d45,72,60,10,'p',mS,2.4);msg='Míssils: '+cv.rockets;msgT=1;return true}
  if(cv.t==='llanxa_coets'){if((cv.rockets||0)<=0){msg='Sense coets.';msgT=2;return false}cv.rockets--;fcd=.9;shoot(cv.x+fx_*6,cv.o.position.y+1.2,cv.z+fz*6,fx_,.015,fz,68,70,11,'p',mS,2.6);msg='Coets: '+cv.rockets;msgT=1;return true}
  return false
}
function fire(){if(over||swimming||fcd>0)return;const c=cv&&cv.t,hd=cv?cv.hd:P.hd,fx_=-Math.sin(hd),fz=-Math.cos(hd);
if(c=='tanc'){const a20=Math.PI/9,ch=Math.cos(a20),sv=Math.sin(a20);fcd=.9;shoot(cv.x+fx_*5.5*VS.tanc,cv.o.position.y+2.57*VS.tanc,cv.z+fz*5.5*VS.tanc,fx_*ch,-sv,fz*ch,85,45,8,'p',mS,2.2)}
else if(c=='heli'){const d45=Math.SQRT1_2;fcd=.6;shoot(cv.x+fx_*3.2*VS.heli,cv.o.position.y+.5*VS.heli,cv.z+fz*3.2*VS.heli,fx_*d45,-d45,fz*d45,85,45,8,'p',mS,2)}
else if(c=='heli_combat'){const d45=Math.SQRT1_2;fcd=.12;shoot(cv.x+fx_*4.1*VS.heli_combat,cv.o.position.y+.15,cv.z+fz*4.1*VS.heli_combat,fx_*d45,-d45,fz*d45,145,9,0,'p',mB,.85)}
else if(c=='tanqueta'){fcd=.16;shoot(cv.x+fx_*4.2*VS.tanqueta,cv.o.position.y+1.7,cv.z+fz*4.2*VS.tanqueta,fx_,0,fz,135,10,0,'p',mB,.9)}
else if(c=='llanxa_coets'){secondaryWeapon();return}
else if(!cv&&bazookaEquipped&&inv.bazooka){if(--inv.bazooka<=0)delete inv.bazooka;bazookaEquipped=false;fcd=1.05;pl.userData.firePose=.42;shoot(P.x+fx_*1.35,P.y+1.9,P.z+fz*1.35,fx_,.01,fz,72,135,18,'pb',mS,3);msg='Bazooka disparat!';msgT=2;setDis(false)}
else if(!cv&&ammo>0){ammo--;fcd=.22;pl.userData.firePose=.32;let ax=fx_,ay=0,az=fz,best=75;for(const e of E){const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);if(d<best&&d>1&&(dx*fx_+dz*fz)/d>.97&&sight(P.x,P.z,e.x,e.z,P.y+1.5)){best=d;const dy=e.o.position.y+1.5-(P.y+1.5),l=Math.hypot(dx,dy,dz);ax=dx/l;ay=dy/l;az=dz/l}}shoot(P.x+fx_*.7,P.y+1.5,P.z+fz*.7,ax,ay,az,130,12,0,'p',mB,1)}
else if(!cv&&ammo<=0){melee();return}else return;setDis(false)}
function updPj(dt){const steps=Math.max(1,Math.ceil(dt/.008));for(let k=0;k<steps;k++)updPjTick(dt/steps)}
function updPjTick(dt){for(let i=Pj.length-1;i>=0;i--){const p=Pj[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.life-=dt;p.o.position.set(p.x,p.y,p.z);
let hit=p.life<=0||p.y<Math.max(hAt(p.x,p.z),0)+.2;
if(!hit){const w=wallCandidates(p.x,p.z).find(w=>!w.open&&p.y<w.y1&&p.y>w.y0&&p.x>w.x0&&p.x<w.x1&&p.z>w.z0&&p.z<w.z1);if(w){hit=true;if(!p.spl)dmgW(w,p.dmg*(p.own=='e'?.5:1))}else{const b=B.find(b=>b.rhp>0&&Math.abs(p.x-b.x)<b.w/2+.6&&Math.abs(p.z-b.z)<b.d/2+.6&&p.y<b.fy+b.h+1.4&&p.y>b.fy+b.h-.4);if(b){hit=true;if(!p.spl)b.rhp-=p.dmg*(p.own=='e'?.5:1);if(b.rhp<=0)roofBreak(b)}}}
if(!hit){const t0=treeAt(p.x,p.z,.5);if(t0&&p.y<Math.max(hAt(p.x,p.z),0)+(t0.p?6.5:1.5)){hit=true;if(t0.p&&!p.spl)dmgP(t0,p.dmg*(p.own=='e'?.5:1))}}
if(!hit&&(p.own=='p'||p.own=='pb'))for(const u of E)if(Math.hypot(u.x-p.x,u.o.position.y+1.5-p.y,u.z-p.z)<u.r+.6){hit=true;if(!p.spl)hurtE(u,p.dmg);break}
if(!hit){for(const v of V){if(p.own==='p'&&v===cv)continue;const vy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z)),rr=vehicleRadius(v.t)*.62;if(Math.hypot(v.x-p.x,vy+1-p.y,v.z-p.z)<rr){hit=true;if(!p.spl)damageVehicle(v,p.dmg,1);break}}}
if(!hit&&p.own=='e'&&!cv){const q=P;if(Math.hypot(q.x-p.x,q.y+1.5-p.y,q.z-p.z)<1.2){hit=true;if(!p.spl)hurtP(p.dmg)}}
if(hit){if(p.spl)boom(p.x,p.y,p.z,p.spl,p.dmg,p.own);world.remove(p.o);Pj.splice(i,1)}}}
function updFx(dt){for(let i=bombs.length-1;i>=0;i--){const b=bombs[i];b.t-=dt;if(b.t<=0){boom(b.x,b.y,b.z,16,100,'b');world.remove(b.o);bombs.splice(i,1)}}
for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt;f.o.scale.setScalar(1+(.6-f.life)*f.s);f.o.material.opacity=Math.max(0,f.life/.6);if(f.life<=0){world.remove(f.o);fx.splice(i,1)}}}
