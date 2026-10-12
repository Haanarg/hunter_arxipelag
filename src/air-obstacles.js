// Col·lisions 3D de l'antena i la parabòlica amb fuselatge i disc del rotor.
// Sense afegir malles de Three.js ni noves crides de dibuix.
(()=>{
  const registry=world=>world.userData.airObstacles||(world.userData.airObstacles=[]);
  function registerAntenna(world,root,spec,plinth){
    const scale=spec.scale||1;
    const entry={kind:'antenna',root,plinth,scale,
      height:Math.max(spec.height,31*scale)};
    registry(world).push(entry);return entry;
  }
  function registerSatellite(world,root,building,radius){
    const entry={kind:'satellite',root,building,radius};
    registry(world).push(entry);return entry;
  }
  const sq=x=>x*x;
  function antennaHit(T,e,x,z,skidY,topY,rotorY,rotorR,bodyR){
    const root=e.root,scale=e.scale,local=new T.Vector3(x,0,z);
    root.worldToLocal(local);
    const distance=Math.hypot(local.x,local.z),
      base=root.position.y,top=base+e.height,
      radiusAt=y=>{
        const localY=(y-base)/scale;
        if(localY<.9)return 4*scale*Math.SQRT2;
        if(localY>29)return .35*scale;
        return Math.max(.3,2.7-.065*localY)*scale*Math.SQRT2+.25;
      };
    // Rotor horitzontal: també pot colpejar la torre amb el fuselatge lluny.
    if(rotorY>=base-.35&&rotorY<=top+.35&&
       distance<=rotorR+radiusAt(rotorY)+.35)
      return {y:rotorY,part:'torre'};
    if(topY>=base&&skidY<=top){
      const hitY=Math.max(base,Math.min(top,(skidY+topY)/2));
      if(distance<=bodyR+radiusAt(hitY))
        return {y:hitY,part:'torre'};
    }
    // Plat petit que sobresurt al lateral de l'antena.
    const dish=new T.Vector3(0,18*scale,3*scale).applyMatrix4(root.matrixWorld),
      dishR=2.2*scale,
      horizontal=Math.hypot(x-dish.x,z-dish.z),
      dy=Math.abs(rotorY-dish.y);
    if(dy<=dishR+.3&&horizontal<=rotorR+
      Math.sqrt(Math.max(0,sq(dishR+.3)-sq(dy))))
      return {y:dish.y,part:'plat de l’antena'};
    const bodyY=Math.max(skidY,Math.min(topY,dish.y));
    if(sq(horizontal)+sq(bodyY-dish.y)<=sq(bodyR+dishR))
      return {y:dish.y,part:'plat de l’antena'};
    return null;
  }
  function satellitePoint(p,clearance,radius,rotation,T){
    // Sòcol, pedestal i braços, fixats al sostre.
    if(p.y>=-clearance-.2&&p.y<=6.2+clearance&&
       Math.hypot(p.x,p.z)<=3.5+clearance)return true;
    // Plat de 18 m orientat. Aproximació del paraboloide real:
    // z=2.7*(r/R)^2, amb reforços de gruix ~1.3 m.
    p.sub(new T.Vector3(0,6,0)).applyQuaternion(rotation);
    const r=Math.hypot(p.x,p.y),radialGap=Math.max(0,r-radius),
      surface=2.7*sq(Math.min(1,r/radius)),
      depthGap=Math.max(0,Math.abs(p.z-surface)-.65);
    if(sq(radialGap)+sq(depthGap)<=sq(clearance))return true;
    // Trípode i focus de l'extrem de la parabòlica.
    return r<=.48+clearance&&p.z>=5.6-clearance&&p.z<=7.9+clearance;
  }
  function satelliteHit(T,e,x,z,skidY,topY,rotorY,rotorR,bodyR){
    const inverse=new T.Matrix4().copy(e.root.matrixWorld).invert(),
      rotation=new T.Quaternion().setFromEuler(new T.Euler(-.62,.3,0)).invert(),
      local=(a,b,c)=>new T.Vector3(a,b,c).applyMatrix4(inverse);
    for(const y of [skidY+bodyR*.45,(skidY+topY)/2,topY-bodyR*.35]){
      if(satellitePoint(local(x,y,z),bodyR,e.radius,rotation,T))
        return {y,part:'parabòlica'};
    }
    // Rotor com a disc, amb el centre i dos anells de mostres.
    if(satellitePoint(local(x,rotorY,z),.38,e.radius,rotation,T))
      return {y:rotorY,part:'parabòlica'};
    for(const factor of [.52,1]){
      const r=rotorR*factor;
      for(let n=0;n<24;n++){
        const angle=n*Math.PI/12;
        if(satellitePoint(local(x+Math.cos(angle)*r,rotorY,
          z+Math.sin(angle)*r),.46,e.radius,rotation,T))
          return {y:rotorY,part:'parabòlica'};
      }
    }
    return null;
  }
  function hit(T,world,v,start,end,modelScale=1){
    const obstacles=world?.userData?.airObstacles;
    if(!obstacles?.length||v.destroyed||v.crashing)return null;
    const skid=v.o?.userData?.skidContactHeight||0,
      rotor=v.o?.userData?.rotorContactHeight||
        (v.t==='heli_combat'?3.3:3.9)*modelScale,
      topHeight=(v.t==='heli_combat'?3:3.45)*modelScale,
      bodyR=(v.t==='heli_combat'?1.45:1.65)*modelScale,
      rotorR=(v.t==='heli_combat'?6.75:7.4)*modelScale,
      dx=end.x-start.x,dz=end.z-start.z,da=end.alt-start.alt,
      steps=Math.max(1,Math.ceil(Math.hypot(dx,dz,da)/1.3));
    for(const e of obstacles){
      if(!e.root.parent)continue;
      if(e.kind==='antenna'&&e.plinth?.hp<=0)continue;
      if(e.kind==='satellite'&&(e.building?.rhp<=0||e.building?.rb))continue;
      e.root.updateWorldMatrix(true,false);
      const center=e.root.getWorldPosition(new T.Vector3()),
        extent=e.kind==='antenna'?11:e.radius+9,
        mx=(start.x+end.x)/2,mz=(start.z+end.z)/2;
      if(Math.hypot(mx-center.x,mz-center.z)>
        extent+rotorR+Math.hypot(dx,dz)/2+3)continue;
      const lower=center.y-(e.kind==='satellite'?12:0),
        upper=center.y+(e.kind==='antenna'?e.height:20);
      if(Math.max(start.alt,end.alt)+rotor<lower-3||
         Math.min(start.alt,end.alt)+skid>upper+bodyR+3)continue;
      for(let k=0;k<=steps;k++){
        const t=k/steps,x=start.x+dx*t,z=start.z+dz*t,
          alt=start.alt+da*t,skidY=alt+skid,topY=alt+topHeight,
          rotorY=alt+rotor,
          struck=e.kind==='antenna'
            ?antennaHit(T,e,x,z,skidY,topY,rotorY,rotorR,bodyR)
            :satelliteHit(T,e,x,z,skidY,topY,rotorY,rotorR,bodyR);
        if(struck)return {kind:e.kind,part:struck.part,x,z,alt,y:struck.y,
          obstacle:e,t};
      }
    }
    return null;
  }
  window.HUNTER_AIR_OBSTACLES=Object.freeze({registerAntenna,registerSatellite,hit});
})();
