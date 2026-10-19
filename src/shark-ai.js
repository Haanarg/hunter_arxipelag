// Taurons: persecució activa de nedadors i passades d'atac independents
// de la freqüència visual. Les col·lisions són amb el casc dels vaixells.
window.HUNTER_SHARKS=Object.freeze({
  VISION:90,LOSE:145,BITE_RADIUS:3.7,BITE_DAMAGE:3,
  kill(f){if(f.dead)return false;f.dead=true;f.deathT=0;f.sharkMode='dead';return true},
  vehicleHit(f,x0,z0,x1,z1,radius){
    if(f.dead)return false;
    const dx=x1-x0,dz=z1-z0,len2=dx*dx+dz*dz,
          k=len2>.0001?Math.max(0,Math.min(1,((f.x-x0)*dx+(f.z-z0)*dz)/len2)):0,
          px=x0+dx*k,pz=z0+dz*k,
          reach=Math.max(1.8,Math.min(13,radius*.58+1));
    return (f.x-px)**2+(f.z-pz)**2<=reach*reach;
  },
  update(f,dt,player,depthAt){
    if(f.dead){f.deathT=(f.deathT||0)+dt;
      return {bite:false,sink:Math.min(2.4,f.deathT*2.8),remove:f.deathT>.95}}
    if(dt<=0)return {bite:false,sink:0,remove:false};
    const sense=player&&depthAt(player.x,player.z)<-.5,
          distance=sense?Math.hypot(player.x-f.x,player.z-f.z):Infinity;
    f.biteCd=Math.max(0,(f.biteCd||0)-dt);
    let mode=f.sharkMode||'patrol';
    if(!sense||distance>this.LOSE){
      if(mode!=='patrol'){
        // Reenganxar l'òrbita exactament a la posició actual, sense salts.
        f.cx=f.x-Math.cos(f.a)*f.r;
        f.cz=f.z-Math.sin(f.a)*f.r;
        mode='patrol';
      }
    }else if(mode==='patrol'&&distance<this.VISION)mode='chase';
    let bite=false;
    const swim=(vx,vz,speed)=>{
      const mag=Math.hypot(vx,vz);
      if(mag<.0001)return;
      const ux=vx/mag,uz=vz/mag,
            nx=f.x+ux*speed*dt,nz=f.z+uz*speed*dt;
      if(depthAt(nx,nz)<-.8){
        f.x=nx;f.z=nz;
      }else{
        // Lliscament paral·lel a la costa, sense encallar-se a terra.
        if(depthAt(nx,f.z)<-.8)f.x=nx;
        if(depthAt(f.x,nz)<-.8)f.z=nz;
      }
      f.sharkYaw=Math.atan2(-ux,-uz);
    };
    if(mode==='chase'){
      const dx=player.x-f.x,dz=player.z-f.z,d=Math.hypot(dx,dz);
      if(d<=this.BITE_RADIUS&&f.biteCd<=0){
        bite=true;f.biteCd=2.1;
        f.retreatT=1.05;
        f.retreatX=d>.05?-dx/d:Math.sin(f.a);
        f.retreatZ=d>.05?-dz/d:Math.cos(f.a);
        mode='retreat';
      }else swim(dx,dz,14.5);
    }
    if(mode==='retreat'){
      swim(f.retreatX||0,f.retreatZ||-1,12.5);
      f.retreatT-=dt;
      if(f.retreatT<=0&&f.biteCd<=.95)mode='chase';
    }
    if(mode==='patrol'){
      const next=f.a+f.sp*dt,x=f.cx+Math.cos(next)*f.r,
            z=f.cz+Math.sin(next)*f.r;
      if(depthAt(x,z)<-.8){f.a=next;f.x=x;f.z=z}
      else f.a+=f.sp*dt*.15;
      f.sharkYaw=Math.PI-f.a;
    }
    f.sharkMode=mode;
    return {bite,sink:0,remove:false};
  }
});
