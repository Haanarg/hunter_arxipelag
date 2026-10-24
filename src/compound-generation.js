// Approved compound layouts share one specification with the preview.
// Quarter turns keep the existing axis-aligned wall collision representation exact.
function compoundTransform(q,angle=0,mirror=1){
  const c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle));
  return (x,z)=>[q.x+x*mirror*c-z*s,q.z+x*mirror*s+z*c];
}
function findRedesignedPort(q){return drainBuildSteps(findRedesignedPortSteps(q))}
function* findRedesignedPortSteps(q){
  // Search for a wide shore, with inland space and three full-size launch lanes.
  for(let turn=0;turn<4;turn++){
    const angle=turn*Math.PI/2,point=compoundTransform(q,angle);
    for(let d=16;d<Math.max(180,(q.r||180)*1.4);d+=8){
      yield {stage:'Emplaçaments de ports',completed:null,total:null};
      const [x,z]=point(0,d);if(rawHAt(x,z)>.3)continue;
      for(const offset of[-8,0,8]){
        const [cx,cz]=point(0,d+offset),site={x:cx,z:cz,h:.86,angle,r:q.r},tr=compoundTransform(site,angle);
        if(Math.abs(cx)>H-100||Math.abs(cz)>H-100)continue;
        let valid=true;
        for(const lx of[-52,-26,0,26,52])for(const lz of[-60,-35,-10]){const p=tr(lx,lz);if(rawHAt(...p)<.1)valid=false}
        if(!valid)continue;
        for(const [lx,lz] of[[-13,31],[15,26],[35,34]])for(const dx of[-7,0,7])for(let dz=-16;dz<=52;dz+=4){const p=tr(lx+dx,lz+dz);if(rawHAt(...p)>-2.2)valid=false}
        if(valid)return site;
      }
      // Once well offshore there cannot be a connected inland site on this ray.
      if(rawHAt(x,z)<-15)break;
    }
  }
  return null;
}
function buildApprovedCompound(layout,q,options){return drainBuildSteps(buildApprovedCompoundSteps(layout,q,options))}
function* buildApprovedCompoundSteps(layout,q,{pad,path,pier,prop,vehicles,rocketAssigned,heliportSites}){
  const isPort=layout.id==='port',coastal=isPort||!!layout.waterfront,angle=['base','hq'].includes(layout.id)?0:coastal?q.angle:Math.floor(R()*4)*Math.PI/2,mirror=1,tr=compoundTransform(q,angle,mirror),c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle));
  const vector=(x,z)=>[x*c-z*s,x*s+z*c],rotatedHeading=hd=>hd*mirror-angle;
  const record={id:layout.id,layoutId:layout.layoutId||layout.id,variant:layout.variant||1,layout,x:q.x,z:q.z,angle,mirror,r:Math.hypot(...layout.size)/2+20,buildings:[],vehicles:[],soldiers:[],loot:[],entrances:layout.entrances.map(p=>tr(...p)),patrol:layout.patrol.map(p=>tr(...p))};
  world.userData.compounds.push(record);
  const shore=layout.waterfront?.shore??8,landDepth=coastal?shore+layout.size[1]/2-5:layout.size[1]+8;
  const center=tr(0,coastal?-layout.size[1]/2+landDepth/2:0),height=coastal?.86:q.h??rawHAt(q.x,q.z);
  addLevelArea(...center,layout.size[0]+8,landDepth,height,angle,coastal?3:18);
  if(!layout.civilian){
    const pw=layout.size[0]-6,pd=coastal?landDepth-2:layout.size[1]-10;
    const bunkerSpec=layout.id==='hq'?layout.buildings.find(spec=>spec.bunker):null;
    if(bunkerSpec){
      // La llosa decorativa única de l'HQ travessava TAMBÉ el forat de
      // l'escala. Retallam el rectangle complet del búnquer abans de crear
      // cap malla, en lloc d'ocultar només el terreny LOD.
      const left=-pw/2,right=pw/2,back=-pd/2,front=pd/2,
        hx=bunkerSpec.x, hz=bunkerSpec.z,
        holeLeft=Math.max(left, hx-bunkerSpec.w/2-1.0),
        holeRight=Math.min(right,hx+bunkerSpec.w/2+1.0),
        holeBack=Math.max(back,hz-bunkerSpec.d/2-1.0),
        holeFront=Math.min(front,hz+bunkerSpec.d/2+1.0),
        regions=[
          [left,holeLeft,back,front],
          [holeRight,right,back,front],
          [holeLeft,holeRight,back,holeBack],
          [holeLeft,holeRight,holeFront,front]
        ];
      for(const [x0,x1,z0,z1] of regions){
        if(x1-x0<.25||z1-z0<.25)continue;
        const base=pad(...tr((x0+x1)/2,(z0+z1)/2),x1-x0,z1-z0);
        base.rotation.y=-angle;
      }
    }else{
      const base=pad(...center,pw,pd);
      base.rotation.y=-angle;
    }
  }
  // Keep vegetation outside the complete reservation, including gates and turning space.
  compoundClear.push({x:q.x,z:q.z,r:record.r});
  for(const route of layout.routes)path(route.points.map(p=>tr(...p)),route.width);
  let built=0;
  for(const spec of layout.buildings){
    yield {stage:'Construint '+layout.id,completed:built++,total:layout.buildings.length,unit:'edificis'};
    const [x,z]=tr(spec.x,spec.z),firstWall=Wl.length,firstStair=stairs.length,buildingAngle=angle-(spec.rotationY||0),bc=Math.round(Math.cos(buildingAngle)),bs=Math.round(Math.sin(buildingAngle)),buildingVector=(x,z)=>[x*bc-z*bs,x*bs+z*bc];
    const b=spec.bunker?mkEnemyBunker(x,z):mkB(x,z,spec.w,spec.d,spec.h*(spec.floors||1),spec.wood?0x96714b:spec.replacement?0xa9bdb0:spec.hangar?0xbab99d:0xc9b98d,layout.friendly?0x2c5fc0:spec.hangar?0xb7c1b4:0x79584e,{floors:spec.floors,wood:spec.wood,hangar:!!spec.hangar,kind:spec.hangar?'hangar':layout.id==='hangar'?'garage':layout.id,doorSide:0,doorWidth:spec.hangar?30:4,doorHeight:spec.hangar?11:4.4,openDoor:!!spec.hangar,noPartitions:true,solidWalls:!!spec.warehouse&&!spec.wood});
    decorateRuntimeBuilding(b,spec);b.civilian=!!layout.civilian;
    if(spec.hangar){
      const shape=seedSearchMode?null:new THREE.Shape();if(shape){shape.moveTo(-spec.w/2,0);shape.lineTo(spec.w/2,0);for(let i=0;i<=16;i++){const a=i*Math.PI/16;shape.lineTo(Math.cos(a)*spec.w/2,.12+Math.sin(a)*spec.w/2)}shape.closePath();}
      // La paret semicircular és l'únic tancament posterior: sense l'antic
      // prisma rectangular baix. El seu propi mesh és el que rep els danys.
      const rearThickness=.45,rearZ=-spec.d/2+.1;
      const rear=seedSearchMode?new THREE.Object3D():new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:rearThickness,bevelEnabled:false}),b.wm);
      rear.position.z=rearZ;b.o.add(rear);
      Wl.push({
        x0:x-spec.w/2,x1:x+spec.w/2,z0:z+rearZ,z1:z+rearZ+rearThickness,
        y0:b.fy-1,y1:b.fy+spec.h,hp:16,m:rear,parts:[rear],
        door:false,open:false,rammable:true,hangarRear:true,
        cx:x,cz:z+rearZ+rearThickness/2,owner:b
      });
      // The arched roof reaches the ground: its lower sides must be solid too.
      for(const sign of[-1,1]){const lx=x+sign*(spec.w/2-.4),side=seedSearchMode?new THREE.Object3D():buildingVisual.addWall(b.o,{lx:lx-x,lz:0,sx:.8,sz:spec.d,height:1,material:b.wm});Wl.push({x0:lx-.4,x1:lx+.4,z0:z-spec.d/2,z1:z+spec.d/2,y0:b.fy-1,y1:b.fy+3,hp:16,m:side,rammable:true,hangarSide:true,door:false,open:false,cx:lx,cz:z,owner:b})}
    }
    if(layout.friendly&&!seedSearchMode){
      if(spec.id==='barracks')for(const xx of[-5,5])for(const zz of[-6,0]){bx(b.o,2.5,.65,4,0x4c5b43,xx,.6,zz,'paint');bx(b.o,2.2,.25,3.5,0x939978,xx,1.05,zz,'paint')}
      if(spec.id==='clinic'){for(const xx of[-6,6]){bx(b.o,2.8,.7,5,0x64796c,xx,.8,-2,'paint');bx(b.o,2.6,.25,4.8,0xe4e9d9,xx,1.27,-2,'paint')}bx(b.roof,4,.06,1.1,0xf3efe3,0,spec.h+1.23,0,'paint');bx(b.roof,1.1,.06,4,0xf3efe3,0,spec.h+1.24,0,'paint');}
    }
    if(!seedSearchMode&&layout.satellite?.buildingId===spec.id){
      const assembly=window.HUNTER_COMPOUND_STRUCTURES().satellite(layout.satellite.radius);
      assembly.scale.setScalar(layout.satellite.scale||1);assembly.position.y=b.h+1.2;b.roof.add(assembly);
      window.HUNTER_AIR_OBSTACLES.registerSatellite(world,assembly,b,layout.satellite.radius*(layout.satellite.scale||1));
    }
    // Rotate both the visual shell and every associated physical record.
    b.o.rotation.y=-buildingAngle;b.angle=buildingAngle;
    const point=(wx,wz)=>{const p=buildingVector(wx-x,wz-z);return[x+p[0],z+p[1]]};
    for(const w of Wl.slice(firstWall)){
      // Totes les parets, portes i llindes pertanyen a aquest edifici:
      // els projectils lleugers no poden degradar-ne l'estructura.
      w.owner=b;
      const corners=[[w.x0,w.z0],[w.x0,w.z1],[w.x1,w.z0],[w.x1,w.z1]].map(p=>point(...p));
      w.x0=Math.min(...corners.map(p=>p[0]));w.x1=Math.max(...corners.map(p=>p[0]));w.z0=Math.min(...corners.map(p=>p[1]));w.z1=Math.max(...corners.map(p=>p[1]));[w.cx,w.cz]=point(w.cx,w.cz);if(w.nx!=null)[w.nx,w.nz]=buildingVector(w.nx,w.nz);
    }
    for(const a of stairs.slice(firstStair)){[a.x,a.z]=point(a.x,a.z);[a.nx,a.nz]=buildingVector(a.nx,a.nz)}
    if(bs){[b.w,b.d]=[b.d,b.w];[b.hw,b.hd]=[b.hd,b.hw]}
    b.doorSide=bs===1?3:bs===-1?2:bc===-1?1:0;b.compound=record.id;b.layoutBuilding=spec.id;record.buildings.push(b);
  }
  if(layout.antenna){const a=layout.antenna,[x,z]=tr(a.x,a.z),
    g=seedSearchMode?new THREE.Group():window.HUNTER_COMPOUND_STRUCTURES().antenna(a);
    g.position.set(x,height+.2,z);g.rotation.y=-angle;if(!seedSearchMode)world.add(g);
    record.antenna=g;
    // The solid plinth blocks movement and is destructible with the complete tower.
    const footing={x0:x-4*(a.scale||1),x1:x+4*(a.scale||1),z0:z-4*(a.scale||1),z1:z+4*(a.scale||1),y0:height,y1:height+1.3,
      hp:24,m:seedSearchMode?null:g.children[0],parts:seedSearchMode?[]:g.children.slice(),door:false,open:false,
      rammable:true,cx:x,cz:z};
    Wl.push(footing);
    if(!seedSearchMode)window.HUNTER_AIR_OBSTACLES.registerAntenna(world,g,a,footing);
  }
  if(layout.helipad&&!seedSearchMode){const p=layout.helipad,[x,z]=tr(p.x,p.z),g=new THREE.Group();g.position.set(x,height+.04,z);g.rotation.y=-angle;world.add(g);
    // La plataforma té la cara superior a y=.04. Abans l'anella era
    // només 1 cm més alta: a distància el depth buffer la feia desaparèixer.
    bx(g,p.size,.08,p.size,0x66706e,0,0,0,'masonry');
    const marking=M(0xf3e5b1,'paint').clone();
    marking.polygonOffset=true;marking.polygonOffsetFactor=-2;marking.polygonOffsetUnits=-2;
    const ring=new THREE.Mesh(new THREE.RingGeometry(p.size*.39,p.size*.405,48),marking);
    ring.rotation.x=-Math.PI/2;ring.position.y=.145;ring.renderOrder=2;g.add(ring);
    const stripe=(w,d,x,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,.025,d),marking);m.position.set(x,.145,z);m.renderOrder=2;g.add(m)};
    for(const side of[-1,1])stripe(1.6,12,side*4,0);
    stripe(8,1.6,0,0);
  }
  for(const [kind,x,z] of layout.props){if(kind==='flag')flag(...tr(x,z),layout.friendly?0x2c7bff:0xe02828);else prop(kind,...tr(x,z),-angle);}
  // The outpost perimeter has exactly the same two openings as the approved preview.
  if(layout.fence)for(const [a,b] of layout.fence)barbedSegment(...tr(...a),...tr(...b));
  if(!layout.boundary&&(layout.id==='hangar'||layout.id==='base')){
    const hw=layout.friendly?56:47,hd=50;
    for(let x=-hw;x<=hw;x+=6){if(Math.abs(x)>10)prop('barrier',...tr(x,hd),-angle);prop('barrier',...tr(x,-hd),-angle)}
    for(let z=-hd+6;z<hd;z+=6)for(const x of[-hw,hw])prop('barrier',...tr(x,z),Math.PI/2-angle);
  }
  if(layout.piers){for(const p of layout.piers)pier(...tr(p.x,p.z-p.d/2),...tr(p.x,p.z+p.d/2),p.w,p.accessRamp!==false&&p.d>p.w);}
  else if(isPort){
    pier(...tr(-51,7),...tr(51,7),10,false);
    for(const x of[-24,24])pier(...tr(x,7),...tr(x,48),6);
  }
  for(const [vehicleIndex,spec] of layout.vehicles.entries()){
    yield {stage:'Equipant '+layout.id,completed:null,total:null};
    const t=spec.t==='llanxa_coets'&&rocketAssigned?'llanxa':layout.id==='heliport'&&heliportSites.length===1?'heli_combat':spec.t,[x,z]=tr(spec.x,spec.z),v={t,x,z,hd:rotatedHeading(spec.hd),compound:record.id};
    if(layout.id==='hangar'){
      v.insideHangar=true;v.hangar=record.buildings[0];v.military=true;
    }
    if(layout.id==='heliport'){Object.assign(v,{heliport:true,military:true,guaranteed:true});heliportSites.push({x,z,hd:v.hd,type:t})}
    if(layout.id==='hq'){
      const u=mkEn(spec.t==='cotxe'?'jeep':spec.t,x,z);u.compound='hq';u.hd=v.hd;if(spec.t==='tanqueta')u.hqPatrolZone=vehicleIndex===0?'north':'south';
      const route=layout.vehiclePatrols[spec.t==='tanqueta'?vehicleIndex:2].points.slice(0,-1).map(p=>tr(...p));
      let nearest=0;route.forEach((p,j)=>{if(Math.hypot(p[0]-x,p[1]-z)<Math.hypot(route[nearest][0]-x,route[nearest][1]-z))nearest=j});
      setPatrol(u,route.map((_,j)=>route[(nearest+j)%route.length]),true);
      (record.enemyVehicles??=[]).push(u);
    }else{vehicles.push(v);record.vehicles.push(v);}
  }
  for(const tower of layout.towers||[layout.tower].filter(Boolean)){const u=mkEn('torre',...tr(tower.x,tower.z));u.compound=layout.id;}
  const route=record.patrol.slice(0,-1);
  for(const [i,p]of layout.soldiers.entries()){
    yield {stage:'Equipant '+layout.id,completed:null,total:null};
    const pos=tr(...p),u=mkEn('soldat',...pos);u.compound=layout.id;
    // Aproximadament un de cada cinc GUÀRDIES militars porta el mateix
    // bazuca que el jugador. El comptador viu al món reconstruït;
    // no consumeix R() i és reproduïble amb la llavor.
    if(!layout.friendly){
      const guardNumber=(world.userData.compoundGuardCount||0)+1;
      world.userData.compoundGuardCount=guardNumber;
      if(guardNumber%5===0){
        if(!seedSearchMode)window.HUNTER_CHARACTERS.equipBazooka(THREE,u.o,{box:bx});
        u.rocketSoldier=true;u.spl=8;u.dmg=25;u.rate=3.4;u.rng=85;
        u.cd=1.3+(guardNumber%3)*.35;
      }
    }
    if(layout.id==='hq'&&i>=5){setPatrol(u,[[pos[0],pos[1]-1],[pos[0],pos[1]+1]],true);record.soldiers.push(u);continue;}
    // Start at the nearest patrol waypoint so the first leg does not cut a building.
    let nearest=0;route.forEach((p,j)=>{if(Math.hypot(p[0]-pos[0],p[1]-pos[1])<Math.hypot(route[nearest][0]-pos[0],route[nearest][1]-pos[1]))nearest=j});
    setPatrol(u,route.map((_,j)=>route[(j+nearest)%route.length]));record.soldiers.push(u);
  }
  const bunker=record.buildings.find(b=>b.kind==='enemy_bunker'&&b.basement);
  if(bunker){
    const point=(p)=>buildingWorldPoint(bunker,p.x,p.z),level=bunker.basement.floorY;
    // Guàrdia d'elit exclusiu del búnquer, amb la mateixa cadència que la
    // metralladora de la tanqueta. Les rutes no surten del seu nivell.
    for(const [i,p] of bunker.basement.eliteLocal.entries()){
      const at=point(p),u=mkEn('soldat',at.x,at.z,level,{elite:true});
      u.basement=bunker;u.walkY=level;u.compound='hq';
      if(i<2){const z2=i===0?-6:4.5;setPatrol(u,[point({x:p.x,z:p.z}),point({x:p.x,z:z2})].map(q=>[q.x,q.z]),true)}
      else setPatrol(u,[[at.x,at.z]],true);
      record.soldiers.push(u);
    }
    for(const p of[{x:-11,z:0},{x:0,z:5}]){
      const at=point(p),u=mkEn('soldat',at.x,at.z,bunker.fy+.3,{elite:true});
      u.compound='hq';setPatrol(u,[[at.x,at.z]],true);record.soldiers.push(u);
    }
  }
  if(layout.general){
    const p=bunker?buildingWorldPoint(bunker,bunker.basement.generalLocal.x,bunker.basement.generalLocal.z):null;
    record.general=mkEn('general',...(p?[p.x,p.z]:tr(layout.general.x,layout.general.z)),
      bunker?bunker.basement.floorY:record.buildings[0].fy+.3);
    if(bunker){record.general.basement=bunker;record.general.walkY=bunker.basement.floorY;}
  }
  const lootKinds={'munició':'arma','farmaciola':'med','granades':'granada','cisalla':'cisalla','mapa':'mapa','mapa_heli':'mapa_heli','mapa_tanc':'mapa_tanc','explosius':'expl','bazooka':'bazooka','franctirador':'franctirador','disfressa':'disf','paracaigudes':'paracaigudes'};
  for(const loot of layout.loot){
    yield {stage:'Equipant '+layout.id,completed:null,total:null};
    if(loot.kind==='disfressa'&&R()>=.5)continue;
    const t=lootKinds[loot.kind];if(!IT[t])throw new Error('Unknown compound loot: '+loot.kind);
    const [x,z]=tr(loot.x,loot.z);
    if(!lootAllowed(t,null,x,z,record.id))continue;
    const o=addItemAt(t,x,z,record.id);
    if(!o)continue;
    const item=items[items.length-1];item.compound=record.id;record.loot.push(item);
  }
  if(layout.spawn){const p=tr(layout.spawn.x,layout.spawn.z);record.spawn={x:p[0],z:p[1]};}
  return record;
}
