const PIER_DECK_Y=2.4; // 20 cm sobre el màxim de les ones, més proper al nivell de terra. // Cota de coberta per sobre del màxim d'onatge (2.2 m).
// Validació final contra TOTS els vehicles: també els afegits després dels molls.
function jetSkiSpotClear(q,ignore=null){
  const box=vehicleBox({t:'moto_aquatica',...q});box.w+=2;box.d+=2;
  const r=Math.hypot(box.w,box.d)/2;
  if(Math.abs(q.x)>H-r-5||Math.abs(q.z)>H-r-5||hAt(q.x,q.z)>-1.2)return false;
  if(B.some(b=>Math.abs(q.x-b.x)<b.hw+r&&Math.abs(q.z-b.z)<b.hd+r))return false;
  return !V.some(v=>v!==ignore&&obbOverlap(box,vehicleBox(v)))&&!E.some(v=>['jeep','tanqueta','tanc'].includes(v.t)&&obbOverlap(box,vehicleBox(v)));
}
// Recorre la corba de profunditat en passos curts: 100 m de costa, no una recta mar endins.
function shiftJetSkiAlongCoast(origin,ignore){
  const depth=Math.max(-3,Math.min(-1.8,hAt(origin.x,origin.z)));
  for(const side of[1,-1]){
    let x=origin.x,z=origin.z,walked=0;
    for(let step=0;step<80;step++){
      const gx=hAt(x+2,z)-hAt(x-2,z),gz=hAt(x,z+2)-hAt(x,z-2),len=Math.hypot(gx,gz);
      if(len<1e-5)break;
      x+=side*(-gz/len)*5;z+=side*(gx/len)*5;walked+=5;
      for(let j=0;j<8;j++){
        const error=hAt(x,z)-depth;if(Math.abs(error)<.12)break;
        const dx=(hAt(x+1,z)-hAt(x-1,z))/2,dz=(hAt(x,z+1)-hAt(x,z-1))/2,den=dx*dx+dz*dz;
        if(den<1e-6)break;
        const k=Math.max(-3,Math.min(3,error/Math.sqrt(den)))/Math.sqrt(den);x-=dx*k;z-=dz*k;
      }
      const q={x,z,hd:origin.hd};
      if(walked%100===0&&Math.abs(hAt(x,z)-depth)<.3&&jetSkiSpotClear(q,ignore))return {...q,coastShift:walked};
    }
  }
  return null;
}
function findJetSkiCoastSpot(ignore=null){
  for(const island of islands){
    for(let n=0;n<64;n++){
      const a=n*Math.PI/32,ux=Math.cos(a),uz=Math.sin(a);let landD=null;
      for(let d=0;d<island.r*1.6;d+=10){
        const h=hAt(island.x+ux*d,island.z+uz*d);
        if(h>0){landD=d;continue}
        if(landD===null||h> -2.5)continue;
        let lo=landD,hi=d;
        for(let k=0;k<15;k++){const mid=(lo+hi)/2;if(hAt(island.x+ux*mid,island.z+uz*mid)>-2.5)lo=mid;else hi=mid}
        const q={x:island.x+ux*hi,z:island.z+uz*hi,hd:Math.atan2(ux,uz)};
        if(jetSkiSpotClear(q,ignore))return q;
        break;
      }
    }
  }
  return null;
}
function ensureJetSkis(add){
  for(const v of V.filter(v=>v.t==='moto_aquatica')){
    if(jetSkiSpotClear(v,v))continue;
    const q=shiftJetSkiAlongCoast(v,v)||findJetSkiCoastSpot(v);
    if(!q)throw new Error('No s’ha trobat una costa lliure per a la moto aquàtica');
    Object.assign(v,q,{coastal:true});
  }
  while(V.filter(v=>v.t==='moto_aquatica').length<4){
    const q=findJetSkiCoastSpot();
    if(!q)throw new Error('No s’han pogut situar quatre motos aquàtiques sense solapaments');
    add('moto_aquatica',q.x,q.z,q.hd,{coastal:true,guaranteed:true});
  }
}

// Compatibility extraction: shared state remains in game-core.js.
function build(){clearVictoryCinematic();window.HUNTER_ENEMY_LOD.reset();const requestedPalmDisable=!!document.getElementById('disablePalms')?.checked;palmsDisabled=false;cancelGrenadeCharge();clearBulletImpacts();removeParachuteVisual();const buildStarted=performance.now(),buildStages={},buildCounters={landAttempts:0,landCandidates:0},markBuildStage=(()=>{let last=buildStarted;return name=>{const now=performance.now();buildStages[name]=Math.round((now-last)*100)/100;last=now}})();movementFx.reset();if(terrainStream)terrainStream.dispose();terrainStream=null;seedCompounds=[];elapsed=0;water.update(0);joystick.reset();compoundClear=[];terrainLevels=[];terrainLevelGrid.clear();if(seedSearchMode){
  // Un únic món lògic reutilitzable: res de desmuntar geometries o
  // afegir/eliminar escenes per cada llavor.
  if(!seedScratchWorld)seedScratchWorld=new THREE.Group();
  seedScratchWorld.clear();world=seedScratchWorld;
}else{
  if(world){scene.remove(world);const gs=new Set(),ms=new Set();world.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m))}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose())}
  world=new THREE.Group();scene.add(world);
}
world.userData={compounds:[],airObstacles:[]};B=[];stairs=[];piers=[];swimming=false;intelMarks=[];hqMapKnown=false;playerEject=null;playerFall=null;riderSystem.reset();pl.rotation.x=0;pl.userData.firePose=0;Wl=[];Dr=[];items=[];inv={};bazookaEquipped=false;grenadeEquipped=false;cisallaEquipped=false;pl.userData.cisallaCut=0;sniperEquipped=false;sniperAmmo=0;setSniperScope(false);pl.userData.sniper.visible=false;pl.userData.bazooka.visible=false;pl.userData.grenade.visible=false;pl.userData.grenadeThrow=0;pl.userData.grenadeReleased=false;pl.userData.grenadePending=null;waypoint=null;E=[];Pj=[];DEAD=[];DB.length=0;WA.length=0;TG.clear();bombs=[];grenades=[];fx=[];logb=[];hp=100;ammo=16;fcd=0;kills=0;over=0;endEl.style.display='none';setDis(false);let pa,pb;
{const base=requestedSeed==null?Math.floor(Math.random()*0xffffffff)>>>0:requestedSeed>>>0;let tries=0;do{seed=(base+Math.imul(tries++,0x9e3779b1))>>>0;genIslands();pa=land(A,2000);pb=land(Bi,2000)}while((!pa||!pb)&&tries<8);if(!pa||!pb)throw new Error('No s’ha pogut generar un mapa vàlid amb aquesta llavor')}
markBuildStage('islandsAndBasePositions');
const cols=[0xd8b48a,0xc9a27a,0xb8c4c9,0xd9c9a0],compoundVehicles=[],heliportSites=[],staticDecorRoots=[],pathRoutes=[];

// Camins, molls i decoració dels compounds: malles per sectors i material,
// mantenint intactes les dades de física, construccions i saqueig.
const batchStaticDecor=()=>{
  const CHUNK=160,groups=new Map(),materialMap=new Map();
  world.updateMatrixWorld(true);
  let originals=0,batches=0,vertices=0;
  for(const root of staticDecorRoots){
    if(!root.parent)continue;
    root.traverse(mesh=>{
      if(!mesh.isMesh||mesh.isInstancedMesh||!mesh.geometry?.attributes.position)return;
      const mat=mesh.material;
      if(!mat?.color||Array.isArray(mat))return;
      const center=mesh.getWorldPosition(new THREE.Vector3()),
            cx=Math.floor(center.x/CHUNK),cz=Math.floor(center.z/CHUNK);
      const signature=[mat.type,mat.roughness??0,mat.metalness??0,mat.opacity??1,
        mat.transparent?1:0,mat.side,mat.flatShading?1:0,mat.polygonOffset?1:0,mat.polygonOffsetFactor,mat.polygonOffsetUnits].join(':');
      const key=cx+','+cz+'|'+signature;
      let group=groups.get(key);
      if(!group){group={cx,cz,mat,meshes:[]};groups.set(key,group)}
      group.meshes.push(mesh);originals++;
    });
  }
  const transform=new THREE.Matrix4(),geometries=[];
  for(const group of groups.values()){
    const x=(group.cx+.5)*CHUNK,z=(group.cz+.5)*CHUNK,
          pieces=[],sizes=[];let total=0;
    for(const mesh of group.meshes){
      transform.makeTranslation(-x,0,-z).multiply(mesh.matrixWorld);
      const copy=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      copy.applyMatrix4(transform);
      const n=copy.attributes.position.count,color=new Float32Array(n*3);
      for(let k=0;k<n;k++){
        color[k*3]=mesh.material.color.r;
        color[k*3+1]=mesh.material.color.g;
        color[k*3+2]=mesh.material.color.b;
      }
      copy.setAttribute('color',new THREE.BufferAttribute(color,3));
      pieces.push(copy);sizes.push(n);total+=n;
    }
    const geom=new THREE.BufferGeometry();
    for(const [attribute,width] of [['position',3],['normal',3],['uv',2],['color',3]]){
      const data=new Float32Array(total*width);let offset=0;
      for(let k=0;k<pieces.length;k++){
        const src=pieces[k].getAttribute(attribute);
        if(src)data.set(src.array,offset);
        offset+=sizes[k]*width;
      }
      geom.setAttribute(attribute,new THREE.BufferAttribute(data,width));
    }
    geom.computeBoundingSphere();
    const mat=group.mat.clone();
    mat.color.setHex(0xffffff);mat.vertexColors=true;mat.needsUpdate=true;
    const mesh=new THREE.Mesh(geom,mat);
    mesh.name='hunter-static-decor-batch';
    mesh.position.set(x,0,z);mesh.castShadow=false;
    world.add(mesh);
    batches++;vertices+=total;
    for(const g of pieces)g.dispose();
  }
  const disposed=new Set(),materials=new Set();
  for(const root of staticDecorRoots){
    root.traverse(o=>{
      if(o.geometry&&!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose()}
      if(o.material){
        for(const mat of Array.isArray(o.material)?o.material:[o.material])materials.add(mat);
      }
    });
    root.parent?.remove(root);
  }
  for(const mat of materials)mat.dispose();
  staticDecorRoots.length=0;
  const result={originalMeshes:originals,batchedMeshes:batches,drawCallsSaved:originals-batches,vertices};
  window.HUNTER_STATIC_BATCH_STATS=result;
  return result;
};
const addVillageWell=g=>{
  const outer=new THREE.Mesh(
    new THREE.CylinderGeometry(1.7,1.8,1.75,24,1,true),
    M(0x858976,'masonry'));
  outer.position.y=.875;g.add(outer);
  // La cara interior necessita normals cap endins: el cilindre original
  // era visible només des de fora i semblava buit/invisible des de dalt.
  const lining=M(0x444b43,'masonry').clone();
  lining.side=THREE.BackSide;
  const inner=new THREE.Mesh(
    new THREE.CylinderGeometry(1.08,1.04,1.72,24,1,true),lining);
  inner.position.y=.88;g.add(inner);
  // L'anella cobreix el gruix de la pedra; la superfície fosca queda
  // molt més avall, però per sobre del terreny perquè no l'oculti el LOD.
  const rim=new THREE.Mesh(
    new THREE.RingGeometry(1.06,1.72,24),M(0x9d9b84,'masonry'));
  rim.rotation.x=-Math.PI/2;rim.position.y=1.76;g.add(rim);
  const water=new THREE.Mesh(
    new THREE.CircleGeometry(1.035,24),M(0x142c33,'paint'));
  water.rotation.x=-Math.PI/2;water.position.y=.22;g.add(water);
  const innerShadow=new THREE.Mesh(
    new THREE.RingGeometry(.78,1.035,24),M(0x1e2828,'masonry'));
  innerShadow.rotation.x=-Math.PI/2;innerShadow.position.y=.235;g.add(innerShadow);
};
const compoundProp=(kind,x,z,rot=0)=>{
  if(seedSearchMode)return null; // Les props no participen als emplaçaments.
  const y=Math.max(.05,hAt(x,z)),g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;
  if(kind==='bench'){bx(g,4,.25,1.2,0x806447,0,.9,0);for(const x of[-1.4,1.4])bx(g,.2,.8,1,0x485249,x,.4,0)}
  else if(kind==='well')addVillageWell(g);
  else if(kind==='lifebuoy'){const m=new THREE.Mesh(new THREE.TorusGeometry(.6,.15,6,16),M(0xe57846,'paint'));m.position.y=1.5;g.add(m);bx(g,.12,2.3,.12,0x5b6050,0,1.15,0)}
  else if(kind==='crate'){bx(g,1.2,.9,1,0x7b5a35,0,.45,0,'paint');bx(g,1.26,.1,1.06,0x3f3021,0,.2,0,'metal');bx(g,.1,.95,1.08,0x3f3021,0,.48,0,'metal')}
  else if(kind==='barrel'){const body=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.9,10),M(0x53616a,'metal'));body.position.y=.45;g.add(body);for(const y0 of[.12,.78]){const ring=new THREE.Mesh(new THREE.CylinderGeometry(.44,.44,.08,10),M(0x2e3438,'metal'));ring.position.y=y0;g.add(ring)}}
  else if(kind==='barrier'){bx(g,2.4,.72,.5,0x9a8c72,0,.36,0,'masonry');for(const x0 of[-.9,.9])bx(g,.28,.28,.8,0x5d5548,x0,.14,0,'masonry')}
  else if(kind==='ammo'){bx(g,1.5,.75,1.1,0x5f6846,0,.38,0,'paint');bx(g,1.55,.12,1.15,0x30352c,0,.78,0,'metal');bx(g,.12,.8,1.18,0x30352c,0,.38,0,'metal')}
  else if(kind==='bollard'){const post=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.85,10),M(0x4b5154,'metal'));post.position.y=.42;g.add(post);const base=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.1,10),M(0x2f3437,'metal'));base.position.y=.08;g.add(base)}
  else if(kind==='sign'){bx(g,.12,7.4,.12,0x454b4f,0,3.7,0,'metal');const fg=new THREE.Group();fg.position.set(0,6.55,0);g.add(fg);bx(fg,2.5,1.25,.06,0xb32626,1.22,0,0,'paint');const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.42,8),M(0xd1bd72,'metal'));tip.position.set(0,7.58,0);g.add(tip)}
  else if(kind==='sandbag'){for(const xx of[-.8,0,.8])bx(g,.72,.38,.48,0x9b8a68,xx,.2,0,'masonry');for(const xx of[-.4,.4])bx(g,.72,.38,.48,0xa39372,xx,.52,0,'masonry')}
  else if(kind==='fuel'){const tank=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,2.2,12),M(0x69706f,'metal'));tank.rotation.z=Math.PI/2;tank.position.y=.9;g.add(tank);for(const xx of[-.82,.82])bx(g,.12,1.15,.9,0x414647,xx,.62,0,'metal')}
  else if(kind==='lamp'){bx(g,.14,4.2,.14,0x454b4f,0,2.1,0,'metal');bx(g,.7,.22,.45,0xe7d68a,0,4.15,0,'paint')}
  else if(kind==='generator'){bx(g,7,.4,4.5,0x6d7369,0,.2,0,'metal');bx(g,5,2.5,3,0x57694f,0,1.65,0,'metal');for(let k=-2;k<=2;k++)bx(g,.12,1.6,.06,0x29383a,k*.55,1.75,1.53,'metal');bx(g,.25,3,.25,0x41484b,1.5,3.05,-.7,'metal')}
  else if(kind==='net'){for(const xx of[-1.2,1.2])bx(g,.12,2.1,.12,0x4d5356,xx,1.05,0,'metal');for(let yy=.45;yy<2;yy+=.42)bx(g,2.5,.035,.035,0x5b6062,0,yy,0,'metal');for(let xx=-1.05;xx<=1.05;xx+=.42)bx(g,.035,1.65,.035,0x5b6062,xx,1.2,0,'metal')}
  world.add(g);staticDecorRoots.push(g);return g
};
const compoundPad=(x,z,w,d,c=0x77736c)=>{
  if(seedSearchMode){compoundClear.push({x,z,r:Math.hypot(w,d)*.55});return {rotation:{y:0}}}
  const material=M(c,'masonry').clone();material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;
  const geometry=new THREE.PlaneGeometry(w,d);geometry.rotateX(-Math.PI/2);
  const o=new THREE.Mesh(geometry,material);o.position.set(x,hAt(x,z)+.06,z);world.add(o);staticDecorRoots.push(o);compoundClear.push({x,z,r:Math.hypot(w,d)*.55});return o;
};
const landingPad=(x,z,size=30,rot=0)=>{
  if(seedSearchMode){compoundClear.push({x,z,r:size*.72});return {rotation:{y:rot}}}
  const y=hAt(x,z)+.025,g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;
  const base=new THREE.Mesh(new THREE.BoxGeometry(size,.12,size),M(0x666b6d,'masonry'));g.add(base);
  const w=Math.max(1.1,size*.07),L=size*.45;bx(g,w,.035,L,0xf2f2e9,-L*.28,.09,0,'paint');bx(g,w,.035,L,0xf2f2e9,L*.28,.09,0,'paint');bx(g,L*.62,.035,w,0xf2f2e9,0,.09,0,'paint');
  world.add(g);staticDecorRoots.push(g);compoundClear.push({x,z,r:size*.72});return g
};
const compoundPath=(points,width=4,color=0x8a795e)=>{
  pathRoutes.push({points,width,color});
  const curve=window.HUNTER_COMPOUND_PATHS.smoothPath(points,width);
  for(let i=1;i<curve.length;i++){const a=curve[i-1],b=curve[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));for(let k=0;k<=n;k++){const t=k/n;compoundClear.push({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,r:width*.8+2})}}
};
const compoundPier=(x1,z1,x2,z2,width=4.2,accessRamp=true)=>{
  const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz);if(L<2)return;
  const ux=dx/L,uz=dz/L,px=-uz,pz=ux,n=Math.max(1,Math.ceil(L/5));
  // Només el tram longitudinal que arrenca de la costa té rampa.
  // Els caps transversals de les T són plataformes, mai rampes de 34 m d'ample.
  let ramp=null;
  if(accessRamp&&L>width){
    let rampLength=12,rampGround=null;
    // Allargar la rampa si els primers 12 m encara són dins l'aigua.
    for(let d=12;d<=40;d+=2){
      const shoreH=hAt(x1-ux*d,z1-uz*d);
      if(shoreH>.25){rampLength=d;rampGround=shoreH+.08;break}
    }
    if(rampGround!==null){
      ramp={x:x1,z:z1,nx:-ux,nz:-uz,length:rampLength,
        width:width-.25,bottom:rampGround,top:PIER_DECK_Y,ramp:true,pierAccess:true};
      stairs.push(ramp);
    }
  }
  if(seedSearchMode){
    for(let i=0;i<n;i++){
      const m=(i+.5)/n,seg=L/n,mx=x1+dx*m,mz=z1+dz*m;
      piers.push({x:mx,z:mz,ux,uz,px,pz,length:seg+.12,width,y:PIER_DECK_Y});
      compoundClear.push({x:mx,z:mz,r:width*.8+1.5});
    }
    return;
  }
  if(ramp){
    const rampMidX=x1-ux*ramp.length/2,rampMidZ=z1-uz*ramp.length/2,
          rise=ramp.top-ramp.bottom,
          rampMesh=new THREE.Mesh(new THREE.BoxGeometry(ramp.width,.22,ramp.length),
            M(0x957858,'paint'));
    rampMesh.position.set(rampMidX,(ramp.bottom+ramp.top)/2-.11,rampMidZ);
    rampMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),
      new THREE.Vector3(ux*ramp.length,rise,uz*ramp.length).normalize());
    world.add(rampMesh);staticDecorRoots.push(rampMesh);
  }
  const yaw=Math.atan2(dx,dz);
  for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n,m=(a+b)/2,seg=L/n,mx=x1+dx*m,mz=z1+dz*m,y=PIER_DECK_Y-.14;
    const deck=new THREE.Mesh(new THREE.BoxGeometry(width,.28,seg+.12),M(0x816346,'paint'));deck.position.set(mx,y,mz);deck.rotation.y=yaw;world.add(deck);staticDecorRoots.push(deck);piers.push({x:mx,z:mz,ux,uz,px,pz,length:seg+.12,width,y:y+.14});
    // Els pilons decoratius no bloquegen la circulació; no hi ha
    // barana contínua en les unions en T ni als costats del pantalà.
    for(const side of[-1,1]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,3.35,8),M(0x48433e,'metal'));post.position.set(mx+px*side*(width*.44),PIER_DECK_Y-1.15,mz+pz*side*(width*.44));world.add(post);staticDecorRoots.push(post)}
    compoundClear.push({x:mx,z:mz,r:width*.8+1.5})
  }
  for(const side of[-1,1]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.9,8),M(0x3e4447,'metal'));b.position.set(x2+px*side*(width*.35),PIER_DECK_Y+.26,z2+pz*side*(width*.35));world.add(b);staticDecorRoots.push(b)}
};
const findPortWater=q=>{for(let a=0;a<32;a++){const aa=a*Math.PI/16;for(let d=28;d<Math.max(100,q.r||180);d+=8){const wx=q.x+Math.cos(aa)*d,wz=q.z+Math.sin(aa)*d;if(rawHAt(wx,wz)<-3&&rawHAt(wx+Math.cos(aa)*12,wz+Math.sin(aa)*12)<-3)return{x:wx,z:wz,hd:Math.atan2(-Math.cos(aa),-Math.sin(aa)),aa}}}return null};
const findPortSite=(island,tries=18)=>{for(let n=0;n<tries;n++){const q=land(island,700,1);if(!q)continue;q.r=island.r;const portBest=findPortWater(q);if(portBest)return{...q,portBest}}return null};
const makeStandalonePier=q=>{const best=q.portBest||findPortWater(q);if(!best)return false;const dx=best.x-q.x,dz=best.z-q.z,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L;let shore=null;for(let d=3;d<L;d+=2.5){const sx=q.x+ux*d,sz=q.z+uz*d;if(rawHAt(sx,sz)<.35){shore={x:sx-ux*1.8,z:sz-uz*1.8};break}}if(!shore)return false;const pierLen=Math.min(34,Math.max(14,L-5)),end={x:shore.x+ux*pierLen,z:shore.z+uz*pierLen};compoundPier(shore.x,shore.z,end.x,end.z,3.6);for(const side of[-1,1]){const px=-uz,pz=ux;compoundProp('bollard',end.x+px*side*1.1,end.z+pz*side*1.1,0)}compoundClear.push({x:q.x,z:q.z,r:18});return true};
const phase3Options={pad:compoundPad,path:compoundPath,pier:compoundPier,prop:compoundProp,vehicles:compoundVehicles,heliportSites,rocketAssigned:false};
const baseCompound=buildApprovedCompound(window.HUNTER_CHOOSE_COMPOUND('base',R),pa,phase3Options);
const hqCompound=buildApprovedCompound(window.HUNTER_CHOOSE_COMPOUND('hq',R),pb,phase3Options);
markBuildStage('initialCompounds');
const COMPOUND_RADII=Object.freeze({
  avancada:84,
  garatge:95,
  heliport:102,
  polvori:98,
  comunicacions:95,
  port:90
});
const COMPOUND_GAP=34;
// Reserva explícita de la base i de l'HQ: encara que dues illes generades se solapin
// físicament, cap compound podrà entrar dins aquests perímetres.
const compoundCenters=[
  {x:pa.x,z:pa.z,r:baseCompound.r,type:'base'},
  {x:pb.x,z:pb.z,r:hqCompound.r,type:'hq'}
];
const typeId=t=>({avancada:'outpost',garatge:'hangar'}[t]||t);
const compoundRadius=type=>Math.max(COMPOUND_RADII[type]||58,...window.HUNTER_RUNTIME_LAYOUTS.filter(l=>l.type===typeId(type)).map(layoutRadius));
const compoundSiteClear=(type,q,minCenter=0)=>{
  const r=compoundRadius(type);
  return compoundCenters.every(c=>{
    const d=Math.hypot(q.x-c.x,q.z-c.z);
    return d>Math.max(minCenter,r+c.r+COMPOUND_GAP)
  })
};
const registerCompound=(type,q)=>compoundCenters.push({x:q.x,z:q.z,r:compoundRadius(type),type});
// Mateixa validació espacial que findRedesignedPort, però abandona
// cada emplaçament a la primera comprovació impossible. És només un
// filtre: la funció original encara confirma els ports acceptats.
const portSiteFeasible=q=>{
  for(let turn=0;turn<4;turn++){
    const angle=turn*Math.PI/2,point=compoundTransform(q,angle);
    for(let d=16;d<Math.max(180,(q.r||180)*1.4);d+=8){
      const [x,z]=point(0,d);if(rawHAt(x,z)>.3)continue;
      for(const offset of[-8,0,8]){
        const [cx,cz]=point(0,d+offset),site={x:cx,z:cz,h:.86,angle,r:q.r},
              tr=compoundTransform(site,angle);
        if(Math.abs(cx)>H-100||Math.abs(cz)>H-100)continue;
        let valid=true;
        for(const lx of[-52,-26,0,26,52]){
          for(const lz of[-60,-35,-10]){
            const p=tr(lx,lz);
            if(rawHAt(...p)<.1){valid=false;break}
          }
          if(!valid)break
        }
        if(!valid)continue;
        coastTest:for(const [lx,lz] of[[-13,31],[15,26],[35,34]])
          for(const dx of[-7,0,7])for(let dz=-16;dz<=52;dz+=4){
            const p=tr(lx+dx,lz+dz);
            if(rawHAt(...p)>-2.2){valid=false;break coastTest}
          }
        if(valid)return true;
      }
      if(rawHAt(x,z)<-15)break;
    }
  }
  return false;
};
const compound=(type,q)=>{
  const approvedId={avancada:'outpost',garatge:'hangar',port:'port',heliport:'heliport',polvori:'polvori',comunicacions:'comunicacions'}[type];
  if(approvedId){
    if(type==='port'&&!q.portPrepared){if(!portSiteFeasible(q))return false;q=findRedesignedPort(q);if(!q)return false}
    if(!compoundSiteClear(type,q,0))return false;
    let layout=window.HUNTER_CHOOSE_COMPOUND(approvedId,R);
    if(type==='port'&&!coastalLayoutFits(layout,q)){layout=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.type==='port'&&l.variant===1);if(!coastalLayoutFits(layout,q))return false;}
    if(type!=='port'){const r=Math.max(...layout.size)/2;for(const dx of[-r,0,r])for(const dz of[-r,0,r])if(rawHAt(q.x+dx,q.z+dz)<.1)return false;}
    buildApprovedCompound(layout,q,{pad:compoundPad,path:compoundPath,pier:compoundPier,prop:compoundProp,vehicles:compoundVehicles,heliportSites,rocketAssigned:compoundVehicles.some(v=>v.t==='llanxa_coets')});
    registerCompound(type,q);return true;
  }
  return false;
};
const usedPortIslands=new Set();
const candidateIslands=islands.filter(i=>i!==A&&i!==Bi).slice().sort(()=>R()-.5),usedSpecialIslands=new Set();
const reserveCompound=(type,min=180)=>{for(const i of candidateIslands){if(usedSpecialIslands.has(i))continue;for(let n=0;n<18;n++){const q=land(i,850,1);if(q&&compoundSiteClear(type,q,min)){q.r=i.r;if(compound(type,q)){usedSpecialIslands.add(i);return q}}}}return null};
const forceReserve=(type,min)=>{
  let q=reserveCompound(type,min)||reserveCompound(type,110);if(q)return q;
  // Fallback exhaustiu, però mai saltant-se la zona de seguretat.
  for(const i of candidateIslands){
    if(usedSpecialIslands.has(i))continue;
    for(let n=0;n<48;n++){
      const c=land(i,1800,1);if(!c||!compoundSiteClear(type,c,95))continue;
      c.r=i.r;if(compound(type,c)){usedSpecialIslands.add(i);return c}
    }
  }
  return null
};
const civilOptions={pad:compoundPad,path:compoundPath,pier:compoundPier,prop:compoundProp,vehicles:compoundVehicles,heliportSites,rocketAssigned:true};
const dockLayout=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.id==='civil-dock'),terminalLayout=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.id==='ferry-terminal');
const terminalRecords=[];
let connection=null;
const exit=baseCompound.entrances[0],roadStart={x:exit[0],z:exit[1]};
const initialDock=findCoastalLayout(dockLayout,{...A},q=>{
 if(!compoundSiteClear('civil-dock',q))return false;
 const end=compoundTransform(q,q.angle)(0,-dockLayout.size[1]/2),points=solveCoastRoad(roadStart,{x:end[0],z:end[1]});
 if(!points)return false;connection=points;return true;
});
if(initialDock){const c=buildApprovedCompound(dockLayout,initialDock,civilOptions);registerCompound('civil-dock',initialDock);buildCoastRoad(connection,compoundPath);world.userData.baseCoast.dockId=c.layoutId;world.userData.baseCoast.dock={x:c.x,z:c.z};}
else world.userData.baseCoast={unavailable:true,reason:'No walkable coastal corridor for this base site'};
for(const island of islands.filter(i=>i!==Bi).sort((a,b)=>b.r-a.r)){
 if(terminalRecords.length>=2)break;
 const site=findCoastalLayout(terminalLayout,island,q=>compoundSiteClear('ferry-terminal',q));if(!site)continue;
 const c=buildApprovedCompound(terminalLayout,site,civilOptions);c.islandIndex=islands.indexOf(island);terminalRecords.push(c);registerCompound('ferry-terminal',site);
}
let villages=0,civilDocks=initialDock?1:0;
for(const island of candidateIslands){
 if(villages<2*MAP_SCALE){
  const types=['hut-settlement-small','hut-settlement','hut-settlement-large'],chosen=types[Math.floor(R()*3)],l=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.id===chosen);
  for(let tries=0;tries<6;tries++){const q=land(island,250,1);if(!q||!compoundSiteClear(l.id,q))continue;const r=Math.max(...l.size)/2;if([-r,0,r].some(dx=>[-r,0,r].some(dz=>rawHAt(q.x+dx,q.z+dz)<.3)))continue;buildApprovedCompound(l,q,civilOptions);registerCompound(l.id,q);villages++;break;}
 }
 if(civilDocks<2*MAP_SCALE){const q=findCoastalLayout(dockLayout,island,q=>compoundSiteClear('civil-dock',q));if(q){buildApprovedCompound(dockLayout,q,civilOptions);registerCompound('civil-dock',q);civilDocks++;}}
}
markBuildStage('civilCompoundsAndCoast');
forceReserve('garatge',190);
forceReserve('avancada',180);
forceReserve('polvori',190);
forceReserve('comunicacions',190);
const reserveHeliportFallback=()=>{
  const all=islands.filter(i=>i!==Bi).slice().sort(()=>R()-.5);
  for(const i of all)for(let n=0;n<28;n++){const q=land(i,1200,1);if(!q)continue;if(Math.hypot(q.x-pb.x,q.z-pb.z)<260||Math.hypot(q.x-pa.x,q.z-pa.z)<120)continue;if(!compoundSiteClear('heliport',q,120))continue;q.r=i.r;if(compound('heliport',q))return q}
  return null
};
const heliportTarget=1+MAP_SCALE;
let heliportsMade=0;for(let n=0;n<heliportTarget;n++){const q=forceReserve('heliport',n?160:210)||reserveHeliportFallback();if(q)heliportsMade++}
markBuildStage('militaryCompounds');
let guaranteedPorts=0,fastPortCandidates=0,fastPortAccepted=0;
// Les recerques antigues partien de punts aleatoris a terra i repetien
// fins a 40*22 intents per illa. El traçat del port només necessita
// una costa en la direcció dels eixos del layout: provam primer uns
// ancoratges interiors estables, sense crides a R() ni models provisionals.
// El validador original confirma cada ubicació i preserva l'espai d'aigua.
for(const i of candidateIslands){
  if(guaranteedPorts>=2*MAP_SCALE)break;
  if(usedSpecialIslands.has(i))continue;
  const r=i.r*.24,anchors=[
    [i.x,i.z],[i.x+r,i.z],[i.x-r,i.z],[i.x,i.z+r],[i.x,i.z-r]
  ];
  for(const [x,z] of anchors){
    fastPortCandidates++;
    const site=findRedesignedPort({x,z,r:i.r});
    if(!site||!compoundSiteClear('port',site,180))continue;
    if(compound('port',{...site,portPrepared:true})){
      usedPortIslands.add(i);guaranteedPorts++;fastPortAccepted++;break;
    }
  }
}
// Compatibilitat per a llavors geogràficament difícils: cerca restringida
// en les illes encara lliures. Mai no recalculam les illes ja resoltes.
for(const i of candidateIslands){
  if(guaranteedPorts>=2*MAP_SCALE)break;
  if(usedSpecialIslands.has(i)||usedPortIslands.has(i))continue;
  for(let attempt=0;attempt<4;attempt++){
    const q=findPortSite(i,6);
    if(!q||!compoundSiteClear('port',q,180))continue;
    if(compound('port',q)){usedPortIslands.add(i);guaranteedPorts++;break}
  }
}
if(!guaranteedPorts){for(const i of candidateIslands){if(usedSpecialIslands.has(i))continue;const q=findPortSite(i,32);if(q&&compoundSiteClear('port',q,110)&&compound('port',q)){usedPortIslands.add(i);guaranteedPorts=1;break}}}
buildCounters.guaranteedPorts=guaranteedPorts;
buildCounters.fastPortCandidates=fastPortCandidates;
buildCounters.fastPortAccepted=fastPortAccepted;
markBuildStage('guaranteedPorts');
islands.forEach(i=>{if(i===A||i===Bi||usedPortIslands.has(i)||usedSpecialIslands.has(i))return;const roll=R();let type=roll<.25?'avancada':roll<.5?'garatge':roll<.72?'polvori':roll<.86?'comunicacions':'port',q=null;
for(let n=0;n<10&&!q;n++){const c=land(i,700,1);if(c&&compoundSiteClear(type,c,150))q=c}if(!q)return;q.r=i.r;
if(type==='port'){const pq=findPortSite(i,14);if(pq&&compoundSiteClear('port',pq,150)){q=pq}else type=R()<.5?'avancada':'polvori'}
compound(type,q);
if(i.r>520&&R()<.22){const type2=R()<.6?'garatge':'avancada';let q2=null;for(let n=0;n<14&&!q2;n++){const c=land(i,800,1);if(c&&Math.hypot(c.x-q.x,c.z-q.z)>190&&compoundSiteClear(type2,c,150))q2=c}if(q2){q2.r=i.r;compound(type2,q2)}}});
markBuildStage('remainingCompounds');
let standalonePiers=0,targetPiers=(3+Math.floor(R()*3))*MAP_SCALE;for(const i of candidateIslands){if(standalonePiers>=targetPiers)break;if(usedPortIslands.has(i))continue;const q=findPortSite(i,12);if(!q||!compoundSiteClear('port',q,110)||compoundClear.some(c=>Math.hypot(q.x-c.x,q.z-c.z)<80))continue;if(makeStandalonePier(q))standalonePiers++}
markBuildStage('civilianPiers');
if(seedSearchMode&&seedSearchCategoryEl.value==='compound'){
  seedCompounds=compoundCenters.map(c=>({type:c.type,x:c.x,z:c.z}));
  P.base={x:pa.x,z:pa.z};return;
}
const terrainStarted=performance.now();
// La cerca comprova exactament el mateix món determinista, però no necessita
// renderitzar terra, preparar GPU ni calcular el fons marí a cada candidat.
const terrain=seedSearchMode?null:window.HUNTER_TERRAIN.create(THREE,{size:S,segments:SEG,heightAt:hAt,material:MAT.terrain(),startX:pa.x,startZ:pa.z,lowQuality:!visualQuality.shadows,quality:qualityName,shadows:visualQuality.shadows});
if(terrain){terrainStream=terrain;world.add(terrain.mesh,window.HUNTER_TERRAIN.createBorder(THREE,{size:S,halfSize:H}))}
const initialTerrainMs=performance.now()-terrainStarted;
markBuildStage('terrain');
const seabedStarted=performance.now();
if(!seedSearchMode)updateSeabed();
const seabedMs=performance.now()-seabedStarted,vegetationStarted=performance.now();
markBuildStage('seabed');
vegetate(pa);if(seedSearchMode)fa=[];else spawnFauna();
const vegetationMs=performance.now()-vegetationStarted;
markBuildStage('vegetationAndFauna');HQ={x:hqCompound.buildings[0].x,z:hqCompound.buildings[0].z};const rb=B.slice(6);
const hq=B[3],gl=(x,z)=>hAt(x,z)>.5&&!treeHit(x,z,2)&&!Wl.some(w=>x>w.x0-2&&x<w.x1+2&&z>w.z0-2&&z<w.z1+2);
const sp2=(t,cx,cz,r0,r1)=>{for(let k=0;k<12;k++){const a=rr(0,6.28),d=rr(r0,r1),x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;if(gl(x,z)&&!world.userData.compounds.some(c=>c.layout.civilian&&Math.hypot(x-c.x,z-c.z)<c.r))return mkEn(t,x,z)}return null};
islands.forEach(i=>{if(i===A||i===Bi||R()<.5)return;const q=land(i,60);if(!q)return;for(let k=0;k<1+(R()<.4);k++)sp2('soldat',q.x,q.z,0,10);if(R()<.25)sp2('torre',q.x,q.z,5,12)});
rb.forEach(b=>{
  const n=R()<.25?0:R()<.6?1:2;
  const pool=['arma','arma','med','expl','granada','granada','disf','mapa','bazooka','franctirador','paracaigudes']
    .filter(t=>lootAllowed(t,b)&&(!b.civilian||['arma','med','disf'].includes(t)));
  for(let k=0;k<n&&pool.length;k++){
    const kind=pool[Math.floor(R()*pool.length)];
    addIt(kind,b);
  }
});
addIt('arma',B[0]);addIt('expl',B[1]);
// El complex inicial ja sol tenir una farmaciola fixa al seu disseny.
// No duplicar-la a les habitacions: màxim una a tota la base.
if(!items.some(it=>it.t==='med'&&it.compound==='base')){
  const firstBaseBuilding=B.find(b=>b.compound==='base'&&!b.hangar);
  if(firstBaseBuilding)addIt('med',firstBaseBuilding);
}
// Les recollides garantides s'han de buscar entre edificis que realment
// acceptin aquell tipus d'objecte: no perdre mapes per haver triat polvorins.
const lootBuildings=t=>rb.filter(b=>!b.civilian&&lootAllowed(t,b));
const sniperSites=lootBuildings('franctirador');
addIt('franctirador',sniperSites[Math.floor(R()*sniperSites.length)]||B[2]);
for(const [type,count]of[['mapa',2],['mapa_heli',1+MAP_SCALE],['mapa_tanc',1+MAP_SCALE]]){
  lootBuildings(type).sort(()=>R()-.5).slice(0,count).forEach(b=>addIt(type,b));
}
markBuildStage('enemiesAndLoot');
if(seedSearchMode&&seedSearchCategoryEl.value==='item'){
  P.base={x:pa.x,z:pa.z};return;
}
P.x=baseCompound.spawn?.x??pa.x;P.z=baseCompound.spawn?.z??pa.z+20;P.hd=0;P.base={x:pa.x,z:pa.z};V=[];cv=null;mm=null;
const add=(t,x,z,a,meta={})=>{const o=seedSearchMode?seedVehicleStub(t):mkV(t),c=VT[t],surface=Math.max(0,hAt(x,z)),v={t,x,z,hd:a||0,v:0,alt:c.m==='a'?helicopterLandedAltitude({o},surface):surface+.8,o,armor:c.armor??0,maxLife:c.life??1,life:c.life??1,smokeT:0,...meta};if(t==='heli_combat')v.rockets=6;if(t==='llanxa_coets')v.rockets=Infinity;if(!seedSearchMode)world.add(o);V.push(v);return v};
// Cap tanc neutral dins del HQ: els tancs pilotables apareixen
// distribuïts per l'arxipèlag, lluny de la base enemiga.

const near=(r,t)=>{for(let k=0;k<80;k++){const x=pa.x+rr(-r,r),z=pa.z+rr(-r,r),h=hAt(x,z);if(h>1.5&&slope(x,z,h)<2.5&&!B.some(b=>Math.abs(x-b.x)<b.hw+vehicleRadius(t)&&Math.abs(z-b.z)<b.hd+vehicleRadius(t))&&!treeHit(x,z,vehicleRadius(t))&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(t)+vehicleRadius(v.t)+2))return[x,z]}return[pa.x+30,pa.z+30]};
['moto'].forEach(t=>{const q=near(90,t);add(t,q[0],q[1],rr(0,6.28))});
const shores=[];for(let a=0;a<360;a+=12)for(let d=10;d<700;d+=10){const x=pa.x+Math.cos(a*.01745)*d,z=pa.z+Math.sin(a*.01745)*d;if(Math.abs(x)>H-60||Math.abs(z)>H-60)break;if(hAt(x,z)<-2){shores.push({d,x,z,a:a*.01745});break}}
shores.sort((a,b)=>a.d-b.d);
const launchSpot=shores[0]?{x:shores[0].x,z:shores[0].z,a:shores[0].a}:null;
// Ferris globals: busquem una costa vàlida a qualsevol illa i en triem dues de ben separades.
const ferrySpotForIsland=(island,islandIndex)=>{
  const start=R()*Math.PI*2;
  for(let n=0;n<36;n++){
    const a=start+n*Math.PI*2/36,ux=Math.cos(a),uz=Math.sin(a);
    let touchedLand=false;
    for(let d=Math.max(24,island.r*.22);d<island.r*1.5;d+=8){
      const sx=island.x+ux*d,sz=island.z+uz*d,h=hAt(sx,sz);
      if(h>.2){touchedLand=true;continue}
      if(!touchedLand)continue;
      if(h<-1.7){
        const x=sx+ux*14,z=sz+uz*14;
        if(Math.abs(x)>H-28||Math.abs(z)>H-28||hAt(x,z)>-1.25)break;
        return{x,z,hd:Math.atan2(island.x-x,island.z-z),islandIndex,islandX:island.x,islandZ:island.z}
      }
      if(h<-5)break
    }
  }
  return null
};
const ferryCandidates=[];
for(let islandIndex=0;islandIndex<islands.length;islandIndex++){
  const q=ferrySpotForIsland(islands[islandIndex],islandIndex);
  if(q)ferryCandidates.push(q)
}
const ferrySpots=terminalRecords.map(c=>{const v=c.vehicles.find(v=>v.t==='ferry'),island=islands[c.islandIndex];return{...v,islandIndex:c.islandIndex,islandX:island.x,islandZ:island.z,terminal:c}});
if(ferryCandidates.length&&ferrySpots.length<2){
  const first=ferryCandidates[Math.floor(R()*ferryCandidates.length)];ferrySpots.push(first);
  const second=ferryCandidates.filter(q=>q.islandIndex!==first.islandIndex).sort((a,b)=>Math.hypot(b.x-first.x,b.z-first.z)-Math.hypot(a.x-first.x,a.z-first.z))[0];
  if(second&&ferrySpots.length<2)ferrySpots.push(second)
}
for(let i=0;i<ferryCandidates.length&&ferrySpots.length<2;i++){
  const q=ferryCandidates[i];if(!ferrySpots.some(f=>f.islandIndex===q.islandIndex))ferrySpots.push(q)
}
markBuildStage('ferrySiteSearch');
ferrySpots.slice(0,2).forEach(q=>{const f=add('ferry',q.x,q.z,q.hd,{coastal:true,guaranteed:true,ferryIslandIndex:q.islandIndex,ferryIslandX:q.islandX,ferryIslandZ:q.islandZ});if(q.terminal){q.terminal.ferry=f;createTerminalRamp(q.terminal,f)}});
// La llanxa inicial comparteix sovint el millor punt de costa amb un ferry.
// Si hi ha solapament, la desplacem 100 m seguint la costa (tangent local), no mar endins.
if(launchSpot){
  let lx=launchSpot.x,lz=launchSpot.z;
  const overlapsFerry=()=>ferrySpots.some(f=>Math.hypot(lx-f.x,lz-f.z)<vehicleRadius('ferry')+vehicleRadius('llanxa')+6);
  if(overlapsFerry()){
    const tx=-Math.sin(launchSpot.a),tz=Math.cos(launchSpot.a);
    const candidates=[
      {x:launchSpot.x+tx*100,z:launchSpot.z+tz*100},
      {x:launchSpot.x-tx*100,z:launchSpot.z-tz*100}
    ];
    const valid=q=>Math.abs(q.x)<H-vehicleRadius('llanxa')-5&&Math.abs(q.z)<H-vehicleRadius('llanxa')-5&&hAt(q.x,q.z)<-1.2;
    const best=candidates.find(valid)||candidates[0];
    lx=best.x;lz=best.z;
  }
  add('llanxa',lx,lz,rr(0,6.28));
}
const clearVehicle=(t,x,z)=>Math.abs(x)<H-vehicleRadius(t)-5&&Math.abs(z)<H-vehicleRadius(t)-5&&!treeHit(x,z,vehicleRadius(t))&&!V.some(v=>Math.hypot(x-v.x,z-v.z)<vehicleRadius(t)+vehicleRadius(v.t)+5);
compoundVehicles.forEach(v=>{if(v.t==='ferry')return;if(VT[v.t]?.m==='w'||VT[v.t]?.m==='wl'){if(hAt(v.x,v.z)<-2&&!V.some(o=>obbOverlap(vehicleBox(v),vehicleBox(o))))add(v.t,v.x,v.z,v.hd,v);return}
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

markBuildStage('coastalVehicles');
heliportSites.forEach((p,i)=>{
  const desired=p.type||(i===1?'heli_combat':'heli'),near=V.some(v=>v.t===desired&&Math.hypot(v.x-p.x,v.z-p.z)<10);
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

markBuildStage('guaranteedVehicles');
ensureJetSkis(add);
markBuildStage('jetSkis');
// Mateix recompte i posicions per llavor al joc i al cercador de llavors.
// El cercador desa coordenades sense crear models ni IA.
spawnMarinePatrols();
markBuildStage('marinePatrols');
P.y=Math.max(0,hAt(P.x,P.z));pl.position.set(P.x,P.y,P.z);if(!seedSearchMode){V.forEach(v=>place(v,0,0,0));updateTerminalRamps();prepareEnemyNavigation();}world.userData.paths=pathRoutes;if(!seedSearchMode){const roads=window.HUNTER_COMPOUND_PATHS.createPathNetwork(THREE,{routes:pathRoutes,heightAt:(x,z)=>Math.max(hAt(x,z),terrainStream?.visibleHeightAt(x,z)??-Infinity),heightVersion:(x,z)=>terrainStream?.surfaceVersionAt(x,z)??-1});world.add(roads);world.userData.pathStats=roads.userData.pathStats;}const staticBatchStats=seedSearchMode?null:batchStaticDecor();if(!seedSearchMode&&visualQuality.shadows)prepareShadowCasters();else shadowCandidates.length=0;cam.position.set(P.x+28,P.y+30,P.z+45);cam.lookAt(P.x,P.y+2,P.z);
markBuildStage('finalizationAndBatching');
seedCompounds=compoundCenters.map(c=>({type:c.type,x:c.x,z:c.z}));
window.HUNTER_BUILD_STATS={totalMs:performance.now()-buildStarted,stages:buildStages,portSearch:buildCounters,initialTerrainMs,seabedMs,vegetationMs,seabedSamples:seedSearchMode?0:water.seabedStats.lastSamples,terrainTiles:terrain?.stats||null,palms:PM.stats,staticBatches:staticBatchStats};
if(!seedSearchMode){
  setPalmsDisabled(requestedPalmDisable);
  setWaterDisabled(!!document.getElementById('disableWater')?.checked);
  setShadowsDisabled(!!document.getElementById('disableShadows')?.checked);
}
if(!seedSearchMode){prepareVisibilitySystem();waterUpgradePending=true;}
if(window.HUNTER_PERF_DEBUG)console.info('Hunter · generació',window.HUNTER_BUILD_STATS);
}



function buildSeedData(){
  // Fa servir EXACTAMENT les funcions de distribució de la partida.
  // En mode lògic, cap model s'afegeix a l'escena i només se'n retornen
  // els registres consultables pel cercador.
  if(!seedSearchMode)throw new Error('buildSeedData requereix mode cerca');
  build();
  return {seed,base:P.base,vehicles:V,items,compounds:seedCompounds,
    enemies:world.userData.marinePatrolPositions||[]};
}
