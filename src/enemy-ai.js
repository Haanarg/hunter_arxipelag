// Compatibility extraction: shared state remains in game-core.js.
function enemyMoveClear(u,nx,nz,hd,isVeh){
  const r=isVeh?Math.max(1.5,vehicleRadius(vehicleHitType(u.t))*.55):1.5;
  let clear=hAt(nx,nz)>-.8&&!treeHit(nx,nz,isVeh?vehicleRadius(vehicleHitType(u.t))*.4:1.2)&&Math.abs(nx)<H-5&&Math.abs(nz)<H-5&&!wallCandidates(nx,nz,r).some(w=>!w.open&&nx>w.x0-r&&nx<w.x1+r&&nz>w.z0-r&&nz<w.z1+r);
  if(clear&&isVeh){const test=vehicleBox(u,nx,nz,hd);clear=!vehicleObstacles(u).some(o=>vehicleHeightCompatible(u,o)&&obbOverlap(test,vehicleBox(o)))}
  return clear
}
function mvE(u,s){
  const isVeh=['jeep','tanqueta','tanc'].includes(u.t),tryStep=hd=>{
    const nx=u.x-Math.sin(hd)*s,nz=u.z-Math.cos(hd)*s;
    if(!enemyMoveClear(u,nx,nz,hd,isVeh))return false;
    u.hd=hd;u.x=nx;u.z=nz;return true
  };
  const desired=u.hd;
  if(tryStep(desired)){if(isVeh)u.blockedT=Math.max(0,(u.blockedT||0)-.08);return}
  if(isVeh){
    u.blockedT=(u.blockedT||0)+.08;
    const side=u.avoidSide||1,angles=[Math.PI/7,Math.PI/4,Math.PI/3,Math.PI/2];
    for(const a of angles){
      if(tryStep(desired+side*a)){u.avoidSide=side;return}
      if(tryStep(desired-side*a)){u.avoidSide=-side;return}
    }
    // Si queda realment encaixat, canvia el costat preferit i força un nou objectiu de patrulla.
    if(u.blockedT>.8){u.avoidSide=-(u.avoidSide||1);u.blockedT=0;u.wt=0}
    return
  }
  u.wt=0
}
const ENEMY_SENSE_DT=.1;
function updEn(dt){E.forEach(u=>{
  u.alert=Math.max(0,u.alert-dt);u.cd-=dt;u.playerHitCd=Math.max(0,(u.playerHitCd||0)-dt);
  const q=cv||P,py=cv?cv.o.position.y:P.y,dx=q.x-u.x,dz=q.z-u.z,d=Math.hypot(dx,dz),
        det=disg&&!cv?20:u.alert>0?300:u.t=='general'?60:120,
        eyeY=u.o.position.y+(u.t=='torre'?9.4:2.2);

  // Percepció desacoblada del moviment: ~10 Hz i desfasada entre enemics.
  u.senseT=(u.senseT??0)-dt;
  if(u.senseT<=0){
    u.senseT+=ENEMY_SENSE_DT;
    u.canSee=!over&&d<det&&sight(u.x,u.z,q.x,q.z,eyeY);
    u.defenseTarget=u.canSee&&u.sp>0&&d>u.rng*.55?chooseDefense(u,q):null;
  }

  if(u.canSee){
    u.hd=Math.atan2(-dx,-dz);
    if(u.sp>0&&d>u.rng*.55){
      const dp=u.defenseTarget;
      if(dp&&Math.hypot(dp.x-u.x,dp.z-u.z)>1.8){
        u.hd=Math.atan2(u.x-dp.x,u.z-dp.z);mvE(u,u.sp*.75*dt)
      }else if(d>u.rng*.72)mvE(u,u.sp*dt)
    }
    if(d<u.rng&&u.cd<=0){
      u.cd=u.rate;const y0=eyeY,ex=q.x-u.x+rr(-1.5,1.5),ey=py+1.5-y0,ez=q.z-u.z+rr(-1.5,1.5),l=Math.hypot(ex,ey,ez);
      shoot(u.x,y0,u.z,ex/l,ey/l,ez/l,u.spl?60:70,u.dmg,u.spl,'e',mE,u.spl?2:1)
    }
  }else if(u.sp>0){
    if(u.wt<=0||Math.hypot(u.tx-u.x,u.tz-u.z)<2){
      if(u.patrol&&u.patrol.length){
        u.pi=((u.pi==null?-1:u.pi)+1)%u.patrol.length;u.tx=u.patrol[u.pi].x;u.tz=u.patrol[u.pi].z;u.wt=u.guard?2.5:8
      }else{
        const roam=u.guard?8:25;u.tx=u.home.x+rr(-roam,roam);u.tz=u.home.z+rr(-roam,roam);u.wt=u.guard?3:6
      }
    }
    u.wt-=dt;u.hd=Math.atan2(u.x-u.tx,u.z-u.tz);mvE(u,u.sp*(u.guard?.35:.5)*dt)
  }

  u.o.position.set(u.x,(u.gy!=null?u.gy:hAt(u.x,u.z))+(u.t=='jeep'||u.t=='tanc'?.05:0),u.z);
  if(u.t!='torre')u.o.rotation.y=u.hd;
  if(u.o.userData.legs){
    const a=u.o.userData;u.phase=(u.phase||0)+dt*u.sp;
    const moving=u.sp>0&&(d>u.rng*.7||!u.canSee),swing=moving?Math.sin(u.phase)*.45:0;
    a.legs[0].rotation.x=swing;a.legs[1].rotation.x=-swing;
    const aim=!!u.canSee;
    a.arms.forEach((arm,i)=>arm.rotation.x+=((aim?1.45:(i?swing:-swing)*.5)-arm.rotation.x)*(1-Math.exp(-12*dt)))
  }
})}
function updDead(dt){for(let i=DEAD.length-1;i>=0;i--){const u=DEAD[i];u.deadT+=dt;const k=Math.min(1,u.deadT/.55),e=1-Math.pow(1-k,3),base=u.gy!=null?u.gy:hAt(u.x,u.z);u.o.position.set(u.x,base+.05+(1-e)*.12,u.z);u.o.rotation.y=u.hd;u.o.rotation.z=u.deadSide*e*Math.PI*.48;if(u.o.userData.arms)u.o.userData.arms.forEach((a,j)=>{a.rotation.x=(-.35+j*.7)*e;a.rotation.z=(j?-.25:.25)*e});if(u.o.userData.legs)u.o.userData.legs.forEach((l,j)=>l.rotation.x=(j?-.18:.18)*e);if(u.deadT>18){world.remove(u.o);DEAD.splice(i,1)}}}
function mkEn(t,x,z,gy){const c=EC[t];let g;
if(t=='soldat'||t=='general'){g=window.HUNTER_CHARACTERS.createSoldier(THREE,{box:bx,material:M,general:t==='general'})}
else if(t=='jeep'){g=mkV('cotxe');bx(g,.2,2,.2,0xff2020,0,3.4,0)}
else if(t=='tanqueta'){g=mkV('tanqueta');bx(g,.18,1.7,.18,0xff2020,0,3.2,.4)}
else if(t=='tanc'){g=mkV('tanc');bx(g,.2,2,.2,0xff2020,0,4,0)}
else if(t=='torre'){g=new THREE.Group();const leg=0x4b5157,deck=0x626b70,cabin=0x7c2f2f,roof=0x343a3e;
for(const x of[-1.45,1.45])for(const z of[-1.45,1.45])bx(g,.38,7.8,.38,leg,x,3.9,z,'metal');
bx(g,4.4,.45,4.4,deck,0,7.9,0,'metal');
for(const x of[-2.05,2.05])bx(g,.16,1.25,4.15,leg,x,8.65,0,'metal');
for(const z of[-2.05,2.05])bx(g,4.15,1.25,.16,leg,0,8.65,z,'metal');
bx(g,2.75,1.8,2.75,cabin,0,9.15,0,'paint');
bx(g,1.9,.72,.08,0x6b9aa5,0,9.35,-1.39,'glass');
bx(g,3.35,.28,3.35,roof,0,10.25,0,'metal');
bx(g,.32,.32,2.1,roof,0,9.25,-2.25,'metal');
bx(g,.42,.8,.42,0xe4d36f,0,10.78,0,'paint')}
else{g=new THREE.Group();bx(g,1,1,.6,0x222222,0,.5,0);bx(g,1.3,1.6,.7,0xd4af37,0,1.8,0);bx(g,.8,.8,.8,0xf0c9a0,0,3,0);bx(g,.9,.5,.9,0xaa0000,0,3.6,0);g.scale.setScalar(1.2)}
world.add(g);const sensePhase=(E.length%10)*.01,u={t,x,z,gy,hd:rr(0,6.28),o:g,home:{x,z},cd:rr(0,1),alert:0,wt:0,tx:x,tz:z,senseT:sensePhase,canSee:false,defenseTarget:null,...c};E.push(u);return u}
