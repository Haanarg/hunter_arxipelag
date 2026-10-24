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
