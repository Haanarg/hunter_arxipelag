// Òptica x8: només el corredor de la mira exigeix LOD complet.
// L'altura real de les illes i el resultat de la llavor no es modifiquen.
window.HUNTER_SCOPE_FOCUS=Object.freeze({
  create(x,y,z,yaw,pitch){
    const cp=Math.cos(pitch),dx=-Math.sin(yaw)*cp,
          dy=Math.sin(pitch),dz=-Math.cos(yaw)*cp,
          maxDistance=2200,halfAngle=.105;
    const key=Math.round(yaw/.035)+':'+Math.round(pitch/.035)+':'+
      Math.round(x/35)+':'+Math.round(z/35);
    const contains=(px,py,pz,radius=0)=>{
      const ax=px-x,ay=py-y,az=pz-z,
            along=ax*dx+ay*dy+az*dz;
      if(along<0||along>maxDistance+radius)return false;
      const sideways=Math.max(0,ax*ax+ay*ay+az*az-along*along),
            allowed=halfAngle*along+Math.max(0,radius);
      return sideways<=allowed*allowed;
    };
    // Raig contra els límits XZ del sector. Té en compte els objectes propers
    // a les vores encara que el centre del sector quedi fora de la mira.
    const intersectsXZBox=(cx,cz,halfSize,extra=10)=>{
      let enter=0,leave=maxDistance;
      for(const [origin,direction,lo,hi] of [
        [x,dx,cx-halfSize-extra,cx+halfSize+extra],
        [z,dz,cz-halfSize-extra,cz+halfSize+extra]
      ]){
        if(Math.abs(direction)<1e-8){
          if(origin<lo||origin>hi)return false;
        }else{
          const t1=(lo-origin)/direction,t2=(hi-origin)/direction;
          enter=Math.max(enter,Math.min(t1,t2));
          leave=Math.min(leave,Math.max(t1,t2));
          if(enter>leave)return false;
        }
      }
      return leave>=0;
    };
    return {x,y,z,dx,dy,dz,maxDistance,key,contains,intersectsXZBox};
  }
});
