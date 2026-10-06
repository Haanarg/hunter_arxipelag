// Compatibility extraction: shared state remains in game-core.js.
function build(){elapsed=0;water.update(0);joystick.reset();compoundClear=[];terrainLevels=[];if(world){scene.remove(world);const gs=new Set(),ms=new Set();world.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m))}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose())}world=new THREE.Group();scene.add(world);B=[];stairs=[];piers=[];swimming=false;intelMarks=[];playerEject=null;playerFall=null;riderSystem.reset();pl.rotation.x=0;pl.userData.firePose=0;Wl=[];Dr=[];items=[];inv={};bazookaEquipped=false;pl.userData.bazooka.visible=false;waypoint=null;E=[];Pj=[];DEAD=[];DB.length=0;WA.length=0;TG.clear();bombs=[];fx=[];logb=[];hp=100;ammo=24;fcd=0;kills=0;over=0;endEl.style.display='none';setDis(false);let pa,pb;
{const base=requestedSeed==null?Math.floor(Math.random()*0xffffffff)>>>0:requestedSeed>>>0;let tries=0;do{seed=(base+Math.imul(tries++,0x9e3779b1))>>>0;genIslands();pa=land(A,2000);pb=land(Bi,2000)}while((!pa||!pb)&&tries<8);if(!pa||!pb)throw new Error('No s’ha pogut generar un mapa vàlid amb aquesta llavor')}
addLevelArea(pa.x,pa.z,82,72,pa.h,0,18);[[-27,0],[27,-12],[0,31]].forEach(([dx,dz])=>mkB(pa.x+dx,pa.z+dz,15,15,7,0xe9dfc8,0x2c5fc0));flag(pa.x,pa.z-7,0x2c7bff);
addLevelArea(pb.x,pb.z,148,133,pb.h,0,28);mkEnemyBunker(pb.x,pb.z);mkB(pb.x+49,pb.z+16,12,12,6,0x8a7a70,0x8c1f1f);mkB(pb.x-50,pb.z-15,12,12,6,0x8a7a70,0x8c1f1f);flag(pb.x+15,pb.z-6,0xe02828);barbedHQ(pb.x,pb.z,72.5,65,18,26);
const cols=[0xd8b48a,0xc9a27a,0xb8c4c9,0xd9c9a0],compoundVehicles=[],heliportSites=[];let tankHangarAssigned=false;
const compoundProp=(kind,x,z,rot=0)=>{
  const y=Math.max(.05,hAt(x,z)),g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;
  if(kind==='crate'){bx(g,1.2,.9,1,0x7b5a35,0,.45,0,'paint');bx(g,1.26,.1,1.06,0x3f3021,0,.2,0,'metal');bx(g,.1,.95,1.08,0x3f3021,0,.48,0,'metal')}
  else if(kind==='barrel'){const body=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.9,10),M(0x53616a,'metal'));body.position.y=.45;g.add(body);for(const y0 of[.12,.78]){const ring=new THREE.Mesh(new THREE.CylinderGeometry(.44,.44,.08,10),M(0x2e3438,'metal'));ring.position.y=y0;g.add(ring)}}
  else if(kind==='barrier'){bx(g,2.4,.72,.5,0x9a8c72,0,.36,0,'masonry');for(const x0 of[-.9,.9])bx(g,.28,.28,.8,0x5d5548,x0,.14,0,'masonry')}
  else if(kind==='ammo'){bx(g,1.5,.75,1.1,0x5f6846,0,.38,0,'paint');bx(g,1.55,.12,1.15,0x30352c,0,.78,0,'metal');bx(g,.12,.8,1.18,0x30352c,0,.38,0,'metal')}
  else if(kind==='bollard'){const post=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.85,10),M(0x4b5154,'metal'));post.position.y=.42;g.add(post);const base=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.1,10),M(0x2f3437,'metal'));base.position.y=.08;g.add(base)}
  else if(kind==='sign'){bx(g,.12,7.4,.12,0x454b4f,0,3.7,0,'metal');const fg=new THREE.Group();fg.position.set(0,6.55,0);g.add(fg);bx(fg,2.5,1.25,.06,0xb32626,1.22,0,0,'paint');const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.42,8),M(0xd1bd72,'metal'));tip.position.set(0,7.58,0);g.add(tip)}
  else if(kind==='sandbag'){for(const xx of[-.8,0,.8])bx(g,.72,.38,.48,0x9b8a68,xx,.2,0,'masonry');for(const xx of[-.4,.4])bx(g,.72,.38,.48,0xa39372,xx,.52,0,'masonry')}
  else if(kind==='fuel'){const tank=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,2.2,12),M(0x69706f,'metal'));tank.rotation.z=Math.PI/2;tank.position.y=.9;g.add(tank);for(const xx of[-.82,.82])bx(g,.12,1.15,.9,0x414647,xx,.62,0,'metal')}
  else if(kind==='lamp'){bx(g,.14,4.2,.14,0x454b4f,0,2.1,0,'metal');bx(g,.7,.22,.45,0xe7d68a,0,4.15,0,'paint')}
  else if(kind==='net'){for(const xx of[-1.2,1.2])bx(g,.12,2.1,.12,0x4d5356,xx,1.05,0,'metal');for(let yy=.45;yy<2;yy+=.42)bx(g,2.5,.035,.035,0x5b6062,0,yy,0,'metal');for(let xx=-1.05;xx<=1.05;xx+=.42)bx(g,.035,1.65,.035,0x5b6062,xx,1.2,0,'metal')}
  world.add(g);return g
};
const compoundPad=(x,z,w,d,c=0x77736c)=>{const y=hAt(x,z)-.015,o=new THREE.Mesh(new THREE.BoxGeometry(w,.06,d),M(c,'masonry'));o.position.set(x,y,z);world.add(o);compoundClear.push({x,z,r:Math.hypot(w,d)*.55});return o};
const landingPad=(x,z,size=30,rot=0)=>{
  const y=hAt(x,z)+.025,g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;
  const base=new THREE.Mesh(new THREE.BoxGeometry(size,.12,size),M(0x666b6d,'masonry'));g.add(base);
  const w=Math.max(1.1,size*.07),L=size*.45;bx(g,w,.035,L,0xf2f2e9,-L*.28,.09,0,'paint');bx(g,w,.035,L,0xf2f2e9,L*.28,.09,0,'paint');bx(g,L*.62,.035,w,0xf2f2e9,0,.09,0,'paint');
  world.add(g);compoundClear.push({x,z,r:size*.72});return g
};
const compoundPath=(x1,z1,x2,z2,width=4,c=0x766f61)=>{
  const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz);if(L<1)return;
  const n=Math.max(1,Math.ceil(L/5)),ux=dx/L,uz=dz/L,yaw=Math.atan2(dx,dz);
  for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n,m=(a+b)/2,seg=L/n,mx=x1+dx*m,mz=z1+dz*m,my=hAt(mx,mz)+.035;
    const shoulder=new THREE.Mesh(new THREE.BoxGeometry(width+1.4,.035,seg+.5),M(0x8a806c,'masonry'));shoulder.position.set(mx,my-.025,mz);shoulder.rotation.y=yaw;world.add(shoulder);const o=new THREE.Mesh(new THREE.BoxGeometry(width,.07,seg+.18),M(c,'masonry'));o.position.set(mx,my,mz);o.rotation.y=yaw;world.add(o);compoundClear.push({x:mx,z:mz,r:width*.75+1.5})}
};
const compoundPier=(x1,z1,x2,z2,width=4.2)=>{
  const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz);if(L<2)return;
  const ux=dx/L,uz=dz/L,px=-uz,pz=ux,yaw=Math.atan2(dx,dz),n=Math.max(1,Math.ceil(L/5));
  for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n,m=(a+b)/2,seg=L/n,mx=x1+dx*m,mz=z1+dz*m,y=.72;
    const deck=new THREE.Mesh(new THREE.BoxGeometry(width,.28,seg+.12),M(0x816346,'paint'));deck.position.set(mx,y,mz);deck.rotation.y=yaw;world.add(deck);piers.push({x:mx,z:mz,ux,uz,px,pz,length:seg+.12,width,y:y+.14});
    for(const side of[-1,1]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,2.3,8),M(0x48433e,'metal'));post.position.set(mx+px*side*(width*.44),-.25,mz+pz*side*(width*.44));world.add(post);if(i%2===0){const rail=wireRod([mx+px*side*(width*.44),1.05,mz+pz*side*(width*.44)],[mx+px*side*(width*.44)+ux*seg*.8,1.05,mz+pz*side*(width*.44)+uz*seg*.8],.035,0x4b5154)}}
    compoundClear.push({x:mx,z:mz,r:width*.8+1.5})
  }
  for(const side of[-1,1]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.9,8),M(0x3e4447,'metal'));b.position.set(x2+px*side*(width*.35),1.12,z2+pz*side*(width*.35));world.add(b)}
};
const findPortWater=q=>{for(let a=0;a<32;a++){const aa=a*Math.PI/16;for(let d=28;d<Math.max(100,q.r||180);d+=8){const wx=q.x+Math.cos(aa)*d,wz=q.z+Math.sin(aa)*d;if(rawHAt(wx,wz)<-3&&rawHAt(wx+Math.cos(aa)*12,wz+Math.sin(aa)*12)<-3)return{x:wx,z:wz,hd:Math.atan2(-Math.cos(aa),-Math.sin(aa)),aa}}}return null};
const findPortSite=(island,tries=18)=>{for(let n=0;n<tries;n++){const q=land(island,700,1);if(!q)continue;q.r=island.r;const portBest=findPortWater(q);if(portBest)return{...q,portBest}}return null};
const makeStandalonePier=q=>{const best=q.portBest||findPortWater(q);if(!best)return false;const dx=best.x-q.x,dz=best.z-q.z,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L;let shore=null;for(let d=3;d<L;d+=2.5){const sx=q.x+ux*d,sz=q.z+uz*d;if(rawHAt(sx,sz)<.35){shore={x:sx-ux*1.8,z:sz-uz*1.8};break}}if(!shore)return false;const pierLen=Math.min(34,Math.max(14,L-5)),end={x:shore.x+ux*pierLen,z:shore.z+uz*pierLen};compoundPier(shore.x,shore.z,end.x,end.z,3.6);for(const side of[-1,1]){const px=-uz,pz=ux;compoundProp('bollard',end.x+px*side*1.1,end.z+pz*side*1.1,0)}compoundClear.push({x:q.x,z:q.z,r:18});return true};
const compound=(type,q)=>{
  const x=q.x,z=q.z,ang=rr(0,Math.PI*2),mirror=R()<.5?-1:1,cs=Math.cos(ang),sn=Math.sin(ang),local=(dx,dz)=>[dx*mirror,dz],tr=(dx,dz)=>{const [mx,mz]=local(dx,dz);return[x+mx*cs-mz*sn,z+mx*sn+mz*cs]},level=(w,d,blend=16)=>addLevelArea(x,z,w,d,q.h!=null?q.h:rawHAt(x,z),ang,blend),doorToward=(dx,dz)=>{const [mx,mz]=local(dx,dz),tx=-mx,tz=-mz;return Math.abs(tx)>Math.abs(tz)?(tx>0?2:3):(tz>0?0:1)},put=(dx,dz,w,d,h,c,r,opt)=>{const [px,pz]=tr(dx,dz),o={...(opt||{})};if(o.doorSide==null&&!o.hangar)o.doorSide=doorToward(dx,dz);return mkB(px,pz,w,d,h,c,r,o)},prop=(kind,dx,dz,rot=0)=>{const [px,pz]=tr(dx,dz);return compoundProp(kind,px,pz,ang+rot*mirror)},heading=(rot=0)=>ang+rot*mirror;
  if(type==='avancada'){
    level(58,50,18);compoundPad(x,z,50,42,0x6c675c);{const [a1,b1]=tr(-22,17),[a2,b2]=tr(18,-16);compoundPath(a1,b1,a2,b2,4.8,0x786f60)}
    const oa=put(-18,4,12,12,6,0x8a7a70,0x6d2929,{kind:'outpost'}),ob=put(17,11,10,10,5.5,0x9b8a78,0x6d2929,{kind:'outpost'}),oc=put(13,-16,9,9,5,0x7e756c,0x5f2525,{kind:'outpost'});
    if(R()<.8)addIt('granada',R()<.55?oa:(R()<.5?ob:oc));
    const [tx,tz]=tr(-24,-18);mkEn('torre',tx,tz);const route=[tr(-18,16),tr(18,16),tr(20,-14),tr(-16,-17)];for(let n=0;n<2;n++){const [sx,sz]=route[n*2];setPatrol(mkEn('soldat',sx,sz),route.map((p,i)=>route[(i+n*2)%route.length]))}
    for(const p of[[-23,18],[-12,21],[5,21],[20,15],[24,2],[21,-15]])prop('barrier',p[0],p[1],p[0]<0?0:Math.PI/2);
    for(const p of[[-18,13],[17,12],[17,-12]])prop('sandbag',p[0],p[1]);prop('lamp',-2,17);prop('sign',-1,11);prop('crate',2,-2);prop('crate',4,-2);prop('barrel',-3,-1);
    const outDef=[tr(-18,13),tr(17,12),tr(17,-12)];E.slice(-2).forEach(u=>setDefense(u,outDef));compoundVehicles.push({t:'moto',...(()=>{const [vx,vz]=tr(21,15);return{x:vx,z:vz}})(),hd:heading()});
    if(R()<.45){const [vx,vz]=tr(-2,-13);compoundVehicles.push({t:'tanc',x:vx,z:vz,hd:heading(),military:true})}
    if(R()<.28){const [hx,hz]=tr(0,20);compoundVehicles.push({t:'heli',x:hx,z:hz,hd:heading(),military:true})}
    if(R()<.42){const [cx,cz]=tr(-15,-4);compoundVehicles.push({t:'camio',x:cx,z:cz,hd:heading(),military:true})}if(R()<.22){const [lx,lz]=tr(0,-21),ly=hAt(lx,lz);addLevelArea(lx,lz,28,28,ly,ang,10);landingPad(lx,lz,22,heading())}
  } else if(type==='garatge'){
    level(78,74,20);compoundPad(x,z,68,64,0x686868);{const [a1,b1]=tr(-10,-36),[a2,b2]=tr(-10,8);compoundPath(a1,b1,a2,b2,8,0x5e5f5d);const [c1,d1]=tr(9,7),[c2,d2]=tr(30,11);compoundPath(c1,d1,c2,d2,4.6,0x656563)}
    const h=put(-10,5,40,44,18,0xb6b0a2,0xd8cfb7,{hangar:true,kind:'hangar',doorSide:1,doorWidth:32,doorHeight:11,openDoor:true});put(30,11,11,10,5.8,0xb7a98e,0x6e4435,{kind:'garage'});
    // Props repartits per zones lliures, lluny de la casa annexa i de la boca de l'hangar.
    for(const p of[[18,-24],[23,-24],[28,-24]])prop('barrel',p[0],p[1]);
    for(const p of[[30,-14],[30,-9]])prop('crate',p[0],p[1]);
    prop('fuel',17,18,Math.PI/2);prop('fuel',18,25,Math.PI/2);
    prop('lamp',8,-20);prop('sign',31,26,Math.PI/2);if(R()<.65){const gr=[tr(17,-17),tr(31,0),tr(22,20),tr(2,20)],gd=[tr(15,-15),tr(29,5)];setDefense(setPatrol(mkEn('soldat',gr[0][0],gr[0][1]),gr,true),gd)}
    {const hangarType=tankHangarAssigned?['cotxe','camio','tanqueta'][Math.floor(R()*3)]:'tanc';if(hangarType==='tanc')tankHangarAssigned=true;compoundVehicles.push({t:hangarType,x:h.x,z:h.z-4,hd:0,insideHangar:true,hangar:h})}if(R()<.32){const [lx,lz]=tr(19,-20),ly=hAt(lx,lz);addLevelArea(lx,lz,30,30,ly,ang,10);landingPad(lx,lz,24,heading())}
  } else if(type==='heliport'){
    level(64,64,20);landingPad(x,z,36,heading());
    for(const p of[[-20,-20],[0,-23],[20,-20],[-23,0],[23,0]])prop('sandbag',p[0],p[1],p[0]===0?0:Math.PI/2);
    prop('lamp',-20,17);prop('lamp',20,17);prop('sign',0,22);
    const route=[tr(-18,-18),tr(18,-18),tr(18,18),tr(-18,18)],def=[tr(-18,-12),tr(18,-12),tr(0,18)];
    for(let n=0;n<3;n++){const [sx,sz]=route[n];setDefense(setPatrol(mkEn('soldat',sx,sz),route.map((p,i)=>route[(i+n)%route.length]),true),def)}
    const hi=heliportSites.length;heliportSites.push({x,z,hd:heading()});compoundVehicles.push({t:hi===1?'heli_combat':'heli',x,z,hd:heading(),heliport:true,military:true,guaranteed:true})
  } else if(type==='polvori'){
    level(64,56,17);compoundPad(x,z,52,44,0x706a5c);{const [a1,b1]=tr(0,-20),[a2,b2]=tr(0,12);compoundPath(a1,b1,a2,b2,4,0x746d5f)}
    {const p1=tr(-27,-23),p2=tr(27,-23),p3=tr(27,23),p4=tr(-27,23),g1=tr(-6,-23),g2=tr(6,-23);barbedSegment(p1[0],p1[1],g1[0],g1[1]);barbedSegment(g2[0],g2[1],p2[0],p2[1]);barbedSegment(p2[0],p2[1],p3[0],p3[1]);barbedSegment(p3[0],p3[1],p4[0],p4[1]);barbedSegment(p4[0],p4[1],p1[0],p1[1])}
    const a=put(-15,3,13,11,6,0x918b78,0x664338,{kind:'ammo'}),b=put(15,6,9,9,5.2,0x847a69,0x574035,{kind:'ammo'});addIt('expl',a);addIt('expl',b);addIt('granada',R()<.5?a:b);if(R()<.45)addIt('granada',R()<.5?a:b);if(R()<.55)addIt('arma',a);if(R()<.35)addIt('bazooka',R()<.5?a:b);
    for(const p of[[-21,-15],[-11,-18],[0,-18],[11,-18],[21,-14]])prop('barrier',p[0],p[1]);for(const p of[[-3,1],[1,1],[5,1]])prop('ammo',p[0],p[1]);for(const p of[[-22,8],[22,8],[-22,-6],[22,-6]])prop('net',p[0],p[1],Math.PI/2);prop('lamp',0,15);prop('sign',0,-15);const ammoRoute=[tr(-18,-12),tr(18,-12),tr(18,13),tr(-18,13)],ammoDef=[tr(-17,-9),tr(17,-9),tr(15,11)];const [sx,sz]=ammoRoute[0];setDefense(setPatrol(mkEn('soldat',sx,sz),ammoRoute,true),ammoDef)
  } else if(type==='port'){
    const portBest=q.portBest||findPortWater(q);if(!portBest)return false;
    level(58,42,18);compoundPad(x,z,50,34,0x77746d);{const [a1,b1]=tr(0,16),[a2,b2]=tr(0,-10);compoundPath(a1,b1,a2,b2,5.4,0x686764)}
    put(-17,10,17,11,6.5,0xa89a82,0x675044,{kind:'port'});put(18,10,10,9,5,0xb8aa91,0x675044,{kind:'port'});
    for(const p of[[-20,-5],[-10,-5],[0,-5],[10,-5],[20,-5]])prop('bollard',p[0],p[1]);prop('crate',12,1);prop('crate',15,1);prop('barrel',18,2);prop('lamp',-20,2);if(R()<.7){const pr=[tr(-20,0),tr(20,0),tr(18,14),tr(-18,14)],pd=[tr(-18,1),tr(18,1)];setDefense(setPatrol(mkEn('soldat',pr[0][0],pr[0][1]),pr,true),pd)}
    const best=portBest;
    if(best){const dx=best.x-x,dz=best.z-z,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L;let shore={x:x,z:z};for(let d=4;d<L;d+=3){const sx=x+ux*d,sz=z+uz*d;if(hAt(sx,sz)<.35){shore={x:sx-ux*2,z:sz-uz*2};break}}const end={x:best.x-ux*3,z:best.z-uz*3};compoundPier(shore.x,shore.z,end.x,end.z,4.4);const px=-uz,pz=ux;{const roll=R(),boatType=roll<.23?'llanxa':roll<.43?'moto_aquatica':roll<.68?'barca_rems':roll<.9?'windsurf':'hover';compoundVehicles.push({t:boatType,x:best.x+px*4.8,z:best.z+pz*4.8,hd:best.hd})}}
  }
  return true
};
const compoundCenters=[],usedPortIslands=new Set();const farCompound=(q,min=150)=>compoundCenters.every(c=>Math.hypot(q.x-c.x,q.z-c.z)>min);
const candidateIslands=islands.filter(i=>i!==A&&i!==Bi).slice().sort(()=>R()-.5),usedSpecialIslands=new Set();
const reserveCompound=(type,min=180)=>{for(const i of candidateIslands){if(usedSpecialIslands.has(i))continue;for(let n=0;n<14;n++){const q=land(i,750,1);if(q&&farCompound(q,min)){q.r=i.r;if(compound(type,q)){compoundCenters.push({x:q.x,z:q.z});usedSpecialIslands.add(i);return q}}}}return null};
const forceReserve=(type,min)=>{let q=reserveCompound(type,min)||reserveCompound(type,110);if(q)return q;for(const i of candidateIslands){const c=land(i,1600,1);if(c){c.r=i.r;if(compound(type,c)){compoundCenters.push({x:c.x,z:c.z});usedSpecialIslands.add(i);return c}}}const fallback=candidateIslands.find(i=>!usedSpecialIslands.has(i))||candidateIslands[0];if(fallback){const c={x:fallback.x,z:fallback.z,h:rawHAt(fallback.x,fallback.z),r:fallback.r};if(compound(type,c)){compoundCenters.push({x:c.x,z:c.z});usedSpecialIslands.add(fallback);return c}}return null};
forceReserve('garatge',190);
const reserveHeliportFallback=()=>{
  const all=islands.filter(i=>i!==Bi).slice().sort(()=>R()-.5);
  for(const i of all)for(let n=0;n<28;n++){const q=land(i,1200,1);if(!q)continue;if(Math.hypot(q.x-pb.x,q.z-pb.z)<260||Math.hypot(q.x-pa.x,q.z-pa.z)<120)continue;if(!farCompound(q,120))continue;q.r=i.r;if(compound('heliport',q)){compoundCenters.push({x:q.x,z:q.z});return q}}
  return null
};
const heliportTarget=1+MAP_SCALE;
let heliportsMade=0;for(let n=0;n<heliportTarget;n++){const q=forceReserve('heliport',n?160:210)||reserveHeliportFallback();if(q)heliportsMade++}
let guaranteedPorts=0;for(const i of candidateIslands){if(guaranteedPorts>=2*MAP_SCALE)break;if(usedSpecialIslands.has(i))continue;const q=findPortSite(i,22);if(!q||!farCompound(q,180))continue;if(compound('port',q)){compoundCenters.push({x:q.x,z:q.z});usedPortIslands.add(i);guaranteedPorts++}}
if(!guaranteedPorts){for(const i of candidateIslands){if(usedSpecialIslands.has(i))continue;const q=findPortSite(i,32);if(q&&compound('port',q)){compoundCenters.push({x:q.x,z:q.z});usedPortIslands.add(i);guaranteedPorts=1;break}}}
islands.forEach(i=>{if(i===A||i===Bi||usedPortIslands.has(i)||usedSpecialIslands.has(i))return;let q=null;for(let n=0;n<8&&!q;n++){const c=land(i,650,1);if(c&&farCompound(c))q=c}if(!q)return;q.r=i.r;const roll=R();let type=roll<.3?'avancada':roll<.6?'garatge':roll<.84?'polvori':'port';
if(type==='port'){const pq=findPortSite(i,14);if(pq&&farCompound(pq)){q=pq}else type=R()<.5?'avancada':'polvori'}
if(compound(type,q))compoundCenters.push({x:q.x,z:q.z});if(i.r>520&&R()<.22){let q2=null;for(let n=0;n<10&&!q2;n++){const c=land(i,700,1);if(c&&Math.hypot(c.x-q.x,c.z-q.z)>190&&farCompound(c))q2=c}if(q2){q2.r=i.r;if(compound(R()<.6?'garatge':'avancada',q2))compoundCenters.push({x:q2.x,z:q2.z})}}});
let standalonePiers=0,targetPiers=(3+Math.floor(R()*3))*MAP_SCALE;for(const i of candidateIslands){if(standalonePiers>=targetPiers)break;if(usedPortIslands.has(i))continue;const q=findPortSite(i,12);if(!q||!farCompound(q,110)||compoundClear.some(c=>Math.hypot(q.x-c.x,q.z-c.z)<80))continue;if(makeStandalonePier(q))standalonePiers++}
const terrain=window.HUNTER_TERRAIN.create(THREE,{size:S,segments:SEG,heightAt:hAt,material:MAT.terrain()});world.add(terrain.mesh,window.HUNTER_TERRAIN.createBorder(THREE,{size:S,halfSize:H}));
updateSeabed();vegetate(pa);spawnFauna();HQ={x:pb.x,z:pb.z};const rb=B.slice(6);
const hq=B[3],gl=(x,z)=>hAt(x,z)>.5&&!treeHit(x,z,2)&&!Wl.some(w=>x>w.x0-2&&x<w.x1+2&&z>w.z0-2&&z<w.z1+2);
const generalSpots=hq.generalSpots?.length?hq.generalSpots:[{x:hq.x,z:hq.z-3}],generalSpot=generalSpots[Math.floor(R()*generalSpots.length)];mkEn('general',generalSpot.x,generalSpot.z,hq.fy+.3);
const sp2=(t,cx,cz,r0,r1)=>{for(let k=0;k<12;k++){const a=rr(0,6.28),d=rr(r0,r1),x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;if(gl(x,z))return mkEn(t,x,z)}return null};
const hqRoute=[[pb.x-52,pb.z-44],[pb.x+52,pb.z-44],[pb.x+52,pb.z+43],[pb.x-52,pb.z+43]],hqDef=[[pb.x-42,pb.z+43],[pb.x+42,pb.z+43],[pb.x-47,pb.z-34],[pb.x+47,pb.z-34]];for(let k=0;k<5;k++){const u=sp2('soldat',pb.x,pb.z,24,54);if(u&&k<3)setDefense(setPatrol(u,hqRoute.map((p,i)=>hqRoute[(i+k)%hqRoute.length]),k===2),hqDef)}
const carRoute1=[[pb.x-96,pb.z-76],[pb.x+96,pb.z-76],[pb.x+96,pb.z+76],[pb.x-96,pb.z+76]],carRoute2=carRoute1.slice().reverse();
setPatrol(mkEn('jeep',pb.x-92,pb.z-76),carRoute1,true);setPatrol(mkEn('jeep',pb.x+92,pb.z+76),carRoute2,true);
const armorRoute1=[[pb.x-42,pb.z+40],[pb.x+42,pb.z+40],[pb.x+46,pb.z-31],[pb.x-46,pb.z-31]],armorRoute2=armorRoute1.slice().reverse();
setPatrol(mkEn('tanqueta',pb.x-34,pb.z+36),armorRoute1,true);setPatrol(mkEn('tanqueta',pb.x+34,pb.z+36),armorRoute2,true);
[[-69,-61],[69,-61],[-69,61],[69,61]].forEach(([a,b])=>mkEn('torre',pb.x+a,pb.z+b));
islands.forEach(i=>{if(i===A||i===Bi||R()<.5)return;const q=land(i,60);if(!q)return;for(let k=0;k<1+(R()<.4);k++)sp2('soldat',q.x,q.z,0,10);if(R()<.25)sp2('torre',q.x,q.z,5,12)});
rb.forEach(b=>{const n=R()<.25?0:R()<.6?1:2,pool=['arma','arma','med','med','expl','granada','granada','disf','mapa','bazooka'];for(let k=0;k<n;k++)addIt(pool[Math.floor(R()*pool.length)],b)});
addIt('arma',B[0]);addIt('expl',B[1]);addIt('med',B[2]);
rb.slice().sort(()=>R()-.5).slice(0,2).forEach(b=>addIt('mapa',b));
rb.slice().sort(()=>R()-.5).slice(0,1+MAP_SCALE).forEach(b=>addIt('mapa_heli',b));
rb.slice().sort(()=>R()-.5).slice(0,1+MAP_SCALE).forEach(b=>addIt('mapa_tanc',b));
P.x=pa.x;P.z=pa.z+8;P.hd=0;P.base={x:pa.x,z:pa.z};V=[];cv=null;mm=null;
const add=(t,x,z,a,meta={})=>{const o=mkV(t),c=VT[t],v={t,x,z,hd:a||0,v:0,alt:Math.max(0,hAt(x,z))+.8,o,armor:c.armor??0,maxLife:c.life??1,life:c.life??1,smokeT:0,...meta};if(t==='heli_combat')v.rockets=6;if(t==='llanxa_coets')v.rockets=5;world.add(o);V.push(v);return v};
[
  {t:'tanc',x:pb.x-18,z:pb.z+42,hd:Math.PI}
].forEach(v=>add(v.t,v.x,v.z,v.hd,{military:true,hq:true,guaranteed:true}));
const addProtectedMilitary=()=>{};
const near=(r,t)=>{for(let k=0;k<80;k++){const x=pa.x+rr(-r,r),z=pa.z+rr(-r,r),h=hAt(x,z);if(h>1.5&&slope(x,z,h)<2.5&&!B.some(b=>Math.abs(x-b.x)<b.hw+vehicleRadius(t)&&Math.abs(z-b.z)<b.hd+vehicleRadius(t))&&!treeHit(x,z,vehicleRadius(t))&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(t)+vehicleRadius(v.t)+2))return[x,z]}return[pa.x+30,pa.z+30]};
['cotxe','moto','bici'].forEach(t=>{const q=near(90,t);add(t,q[0],q[1],rr(0,6.28))});
const shores=[];for(let a=0;a<360;a+=12)for(let d=10;d<700;d+=10){const x=pa.x+Math.cos(a*.01745)*d,z=pa.z+Math.sin(a*.01745)*d;if(Math.abs(x)>H-60||Math.abs(z)>H-60)break;if(hAt(x,z)<-2){shores.push({d,x,z});break}}
shores.sort((a,b)=>a.d-b.d);if(shores[0])add('llanxa',shores[0].x,shores[0].z,rr(0,6.28));
const clearVehicle=(t,x,z)=>Math.abs(x)<H-vehicleRadius(t)-5&&Math.abs(z)<H-vehicleRadius(t)-5&&!treeHit(x,z,vehicleRadius(t))&&!V.some(v=>Math.hypot(x-v.x,z-v.z)<vehicleRadius(t)+vehicleRadius(v.t)+5);
compoundVehicles.forEach(v=>{if(VT[v.t]?.m==='w'||VT[v.t]?.m==='wl'){if(hAt(v.x,v.z)<-2)add(v.t,v.x,v.z,v.hd,v);return}
  const r=vehicleRadius(v.t),buildingClear=v.insideHangar?true:!B.some(b=>Math.abs(v.x-b.x)<b.hw+r&&Math.abs(v.z-b.z)<b.hd+r),clear=!treeHit(v.x,v.z,r*.7)&&buildingClear&&!V.some(o=>Math.hypot(v.x-o.x,v.z-o.z)<r+vehicleRadius(o.t)+3);
  if(clear||v.insideHangar)add(v.t,v.x,v.z,v.hd,v)
});
const coastalWaterTypes=['barca_rems','windsurf','moto_aquatica','llanxa'];
const pickCoastalWaterType=()=>{const q=R();return q<.4?'barca_rems':q<.72?'windsurf':q<.88?'moto_aquatica':'llanxa'};
const beachedWaterSpot=(island,t)=>{
  const r=vehicleRadius(t),start=R()*Math.PI*2;
  for(let n=0;n<32;n++){
    const a=start+n*Math.PI*2/32,ux=Math.cos(a),uz=Math.sin(a);
    let wasLand=false;
    for(let d=Math.max(18,island.r*.18);d<island.r*1.35;d+=5){
      const x=island.x+ux*d,z=island.z+uz*d,h=hAt(x,z);
      if(h>.15){wasLand=true;continue}
      if(!wasLand)continue;
      if(h<-1.25&&h>-3.15){
        const clear=Math.abs(x)<H-r-5&&Math.abs(z)<H-r-5&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+4)&&!B.some(b=>Math.abs(x-b.x)<b.hw+r+3&&Math.abs(z-b.z)<b.hd+r+3);
        if(clear){
          // Proa aproximadament cap a terra: aparença de vehicle encallat/varat a la riba.
          const hd=Math.atan2(ux,uz)+rn(-.18,.18);
          return{x,z,hd};
        }
      }
      if(h<-3.15)break;
    }
  }
  return null
};
let beachedWaterCount=0;
islands.forEach(island=>{
  if(R()>=.75)return;
  const t=pickCoastalWaterType(),q=beachedWaterSpot(island,t);
  if(q){add(t,q.x,q.z,q.hd,{beached:true,coastal:true});beachedWaterCount++}
});

heliportSites.forEach((p,i)=>{
  const desired=i===1?'heli_combat':'heli',near=V.some(v=>v.t===desired&&Math.hypot(v.x-p.x,v.z-p.z)<10);
  if(!near)add(desired,p.x,p.z,p.hd,{heliport:true,military:true,guaranteed:true});
});
if(heliportSites.length){
  if(!V.some(v=>v.t==='heli')){const p=heliportSites[0];add('heli',p.x,p.z,p.hd,{heliport:true,military:true,guaranteed:true})}
  if(!V.some(v=>v.t==='heli_combat')){const p=heliportSites[Math.min(1,heliportSites.length-1)],a=p.hd+Math.PI/2,x=p.x+Math.sin(a)*22,z=p.z+Math.cos(a)*22;add('heli_combat',x,z,p.hd,{heliport:true,military:true,guaranteed:true})}
}
const protectedVehicleSpot=t=>{const r=vehicleRadius(t),ok=(x,z)=>hAt(x,z)>1.2&&slope(x,z,hAt(x,z))<3&&!treeHit(x,z,r*.7)&&!B.some(b=>Math.abs(x-b.x)<b.hw+r&&Math.abs(z-b.z)<b.hd+r)&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+3);for(let k=0;k<240;k++){const a=rr(0,Math.PI*2),d=rr(30,58),x=pb.x+Math.cos(a)*d,z=pb.z+Math.sin(a)*d;if(ok(x,z))return{x,z,hd:a+Math.PI}}return null};
const distributedMilitarySpot=t=>{const r=vehicleRadius(t),pool=islands.filter(i=>i!==Bi).slice().sort(()=>R()-.5),ok=(x,z)=>Math.hypot(x-pb.x,z-pb.z)>220&&hAt(x,z)>1.2&&slope(x,z,hAt(x,z))<3&&!treeHit(x,z,r*.7)&&!B.some(b=>Math.abs(x-b.x)<b.hw+r&&Math.abs(z-b.z)<b.hd+r)&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+3);for(const i of pool)for(let k=0;k<50;k++){const q=land(i,900,1);if(q&&ok(q.x,q.z))return{x:q.x,z:q.z,hd:rr(0,Math.PI*2)}}return null};
const hardLandVehicleSpot=t=>{const r=vehicleRadius(t),ok=(x,z)=>Math.abs(x)<H-r-8&&Math.abs(z)<H-r-8&&Math.hypot(x-pb.x,z-pb.z)>220&&hAt(x,z)>1.2&&slope(x,z,hAt(x,z))<4&&!treeHit(x,z,r*.65)&&!B.some(b=>Math.abs(x-b.x)<b.hw+r&&Math.abs(z-b.z)<b.hd+r)&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+4);for(let k=0;k<1600;k++){const x=rr(-H+r+10,H-r-10),z=rr(-H+r+10,H-r-10);if(ok(x,z))return{x,z,hd:rr(0,Math.PI*2)}}for(let k=0;k<72;k++){const a=k*Math.PI/36,d=110+(k%4)*20,x=pa.x+Math.cos(a)*d,z=pa.z+Math.sin(a)*d;if(ok(x,z))return{x,z,hd:a+Math.PI}}return null};
const waterVehicleSpot=t=>{const r=vehicleRadius(t),pool=islands.slice().sort(()=>R()-.5);for(const i of pool){for(let tries=0;tries<3;tries++){const q=findPortSite(i,18);if(!q||!q.portBest)continue;const a=q.portBest.aa,px=-Math.sin(a),pz=Math.cos(a);for(const side of[-1,1]){const x=q.portBest.x+px*side*(r+4),z=q.portBest.z+pz*side*(r+4);if(hAt(x,z)<-2&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+3))return{x,z,hd:q.portBest.hd}}}}return null};
const ensureVehicleType=t=>{if(t==='heli'?V.some(v=>v.t==='heli'&&!v.heliport):V.some(v=>v.t===t))return;let q=null,c=VT[t];if(c.m==='w'||c.m==='wl')q=waterVehicleSpot(t);else if(['heli','heli_combat','tanqueta','tanc','camio'].includes(t))q=distributedMilitarySpot(t)||hardLandVehicleSpot(t);else{const p=near(120,t);q={x:p[0],z:p[1],hd:rr(0,Math.PI*2)}}if(q)add(t,q.x,q.z,q.hd)};
['llanxa','moto_aquatica','barca_rems','windsurf','hover','cotxe','moto','bici','camio','tanqueta','tanc','heli','heli_combat'].forEach(ensureVehicleType);
// La llanxa llançacohets és única per mapa.
V.filter(v=>v.t==='llanxa_coets').slice(1).forEach(v=>{const i=V.indexOf(v);if(i>=0)V.splice(i,1);world.remove(v.o)});
if(!V.some(v=>v.t==='llanxa_coets')){const q=waterVehicleSpot('llanxa_coets');if(q)add('llanxa_coets',q.x,q.z,q.hd,{unique:true,guaranteed:true})}
const ensureVehicleCount=(t,min)=>{let guard=0;while(V.filter(v=>v.t===t).length<min&&guard++<12){const q=distributedMilitarySpot(t)||hardLandVehicleSpot(t);if(!q)break;add(t,q.x,q.z,q.hd,{military:true,guaranteed:true})}};
ensureVehicleCount('tanc',2);
const ensureDistributedCount=(t,min)=>{let guard=0;while(V.filter(v=>v.t===t).length<min&&guard++<16){const q=distributedMilitarySpot(t)||hardLandVehicleSpot(t);if(!q)break;add(t,q.x,q.z,q.hd,{military:true,guaranteed:true})}};
ensureDistributedCount('heli',2*MAP_SCALE);
ensureDistributedCount('heli_combat',MAP_SCALE);
ensureDistributedCount('tanqueta',1+MAP_SCALE);
islands.forEach(i=>{if(i!==A&&R()<.65){const t=['cotxe','moto','bici'][Math.floor(R()*3)];for(let tries=0;tries<12;tries++){const q=land(i,80);if(q&&clearVehicle(t,q.x,q.z)){add(t,q.x,q.z,rr(0,6.28));break}}}});

P.y=Math.max(0,hAt(P.x,P.z));pl.position.set(P.x,P.y,P.z);V.forEach(v=>place(v,0,0,0));world.traverse(o=>{if(o.isMesh){o.castShadow=!o.isInstancedMesh;o.receiveShadow=true}});pl.traverse(o=>{if(o.isMesh)o.castShadow=true});cam.position.set(P.x+28,P.y+30,P.z+45);cam.lookAt(P.x,P.y+2,P.z);}
