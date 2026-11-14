// Estat visual de la càmera: mai no modifica el rumb ni la física del vehicle.
window.HUNTER_CAMERA_CONTROLS=Object.freeze({
  createVehicleLook(){
    let offset=0,grace=0;
    const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    return {
      get offset(){return offset},
      reset(){offset=0;grace=0},
      turn(dx){offset=wrap(offset-dx*.006);grace=.7},
      release(){grace=.7},
      heading(vehicle,dt,dragging){
        if(!dragging){
          const wait=grace;grace=Math.max(0,grace-dt);
          // Aturats, la mirada lliure continua sent útil. En reprendre la
          // marxa, torna darrere pel camí angular més curt, sense salts a ±π.
          const moving=Math.hypot(vehicle.v||0,vehicle.sideV||0,vehicle.strafeV||0,vehicle.verticalV||0)>.65;
          if(moving&&grace===0){
            offset*=Math.exp(-2.7*Math.max(0,dt-wait));
            if(Math.abs(offset)<.0001)offset=0;
          }
        }
        return vehicle.hd+offset;
      }
    };
  },
  // Seguiment angular suau per client: conductor i artiller COOP tenen
  // càmeres independents encara que comparteixin blindat i instantànies.
  createTurretFollow(){
    let active=false,angle=0;
    return {
      reset(){active=false;angle=0},
      heading(vehicle,turretYaw,dt){
        const desired=(Number.isFinite(vehicle?.hd)?vehicle.hd:0)+
          (Number.isFinite(turretYaw)?turretYaw:0);
        if(!active){angle=desired;active=true;return angle}
        const delta=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle));
        angle+=delta*(1-Math.exp(-12*Math.max(0,Math.min(.1,dt||0))));
        return angle;
      }
    };
  },
  // Manté visible el vehicle mentre travessa la boca d'un hangar.
  // Comprova tota la línia de visió, no només si el centre és a dins:
  // la càmera pot romandre sota la volta quan el vehicle ja n'ha sortit.
  hangarBlocksSight(building,camera,target,vehicle){
    if(!building?.hangar||!camera||!target||!vehicle)return false;
    const halfX=building.w/2+.2,halfZ=building.d/2+.2,
          bottom=building.fy-2,top=building.fy+building.h+2;
    if(vehicle.y<bottom||vehicle.y>=top)return false;
    if(Math.abs(vehicle.x-building.x)<halfX&&Math.abs(vehicle.z-building.z)<halfZ)return true;
    // Segment 3D amb el volum de la coberta. Ni sobrevols ni façanes
    // llunyanes han de fer desaparèixer un hangar sense oclusió.
    let near=0,far=1;
    for(const [a,min,max] of [
      ['x',building.x-halfX,building.x+halfX],
      ['z',building.z-halfZ,building.z+halfZ],
      ['y',bottom,top]
    ]){
      const delta=target[a]-camera[a];
      if(Math.abs(delta)<1e-8){if(camera[a]<min||camera[a]>max)return false;continue}
      const t0=(min-camera[a])/delta,t1=(max-camera[a])/delta;
      near=Math.max(near,Math.min(t0,t1));
      far=Math.min(far,Math.max(t0,t1));
      if(far<near)return false;
    }
    return far>=near&&far>0&&near<1;
  },
  // Keep the camera's entire overhead sightline within the stair aperture.
  bunkerStairCamera(bounds,desiredLocal,playerY,floorY,roofHeight){
    const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
    return {
      x:clamp(desiredLocal.x,bounds.left+.18,bounds.right-.18),
      z:clamp(desiredLocal.z,bounds.near+.18,bounds.far-.18),
      y:Math.min(floorY+roofHeight-1.3,playerY+10.4)
    };
  },
  // Test opaque physical walls, even when their render mesh is hidden.
  bunkerEnemyVisible(eye,target,walls,intersect){
    return [1.25,2.25].some(height=>!walls.some(w=>{
      if(w.open||w.destroyedWall||w.hp<=0||w.barbed)return false;
      const t=intersect(eye.x,eye.y,eye.z,target.x,target.y+height,target.z,
        w.x0,w.x1,w.y0,w.y1,w.z0,w.z1);
      return t!==null&&t>=0&&t<.998;
    }));
  },
  createOcclusion(){
    const hidden=[];
    return {
      get count(){return hidden.length},
      hide(wall){
        for(const mesh of wall.parts||[wall.m]){
          if(!mesh?.visible)continue;
          hidden.push({wall,mesh,parent:mesh.parent});
          mesh.visible=false;
        }
      },
      restore(){
        for(const {wall,mesh,parent} of hidden){
          // La visibilitat de càmera no pot ressuscitar runes ni tancar una
          // porta oberta pel joc mentre era oculta.
          if(wall.destroyedWall||wall.hp<=0||mesh.parent!==parent)continue;
          if(wall.door&&(wall.openProgress!=null?wall.openProgress>=.98:wall.open))continue;
          mesh.visible=true;
        }
        hidden.length=0;
      }
    };
  }
});
