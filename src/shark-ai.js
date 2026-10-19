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
    let mode=f.sharkMode||'patrol',bite=false;
    const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
    const swimHeading=(desired,speed,turnRate=.92)=>{
      // Contínuament limita el gir a 53º/s. Sense inversions instantànies
      // en passar de la mossegada a la volta o a una altra embestida.
      const yaw=f.sharkYaw??Math.PI-f.a,
        delta=Math.max(-turnRate*dt,Math.min(turnRate*dt,angleDiff(desired,yaw))),
        next=yaw+delta,ux=-Math.sin(next),uz=-Math.cos(next);
      const nx=f.x+ux*speed*dt,nz=f.z+uz*speed*dt;
      if(depthAt(nx,nz)<-.8){f.x=nx;f.z=nz}
      else {
        if(depthAt(nx,f.z)<-.8)f.x=nx;
        if(depthAt(f.x,nz)<-.8)f.z=nz;
      }
      f.sharkYaw=next;
    };
    const swimTo=(x,z,speed,turnRate)=>{
      const dx=x-f.x,dz=z-f.z;
      if(Math.hypot(dx,dz)<.15)return;
      swimHeading(Math.atan2(-dx,-dz),speed,turnRate);
    };
    if(!sense||distance>this.LOSE){
      if(mode!=='patrol'){
        // Reenganxa l'òrbita al punt real, sense teletransportacions.
        f.cx=f.x-Math.cos(f.a)*f.r;
        f.cz=f.z-Math.sin(f.a)*f.r;
        mode='patrol';
      }
    }else if(mode==='patrol'&&distance<this.VISION){
      mode='chase';
      f.attackSide=f.attackSide||1;
    }
    if(mode==='chase'){
      const dx=player.x-f.x,dz=player.z-f.z,d=Math.hypot(dx,dz);
      if(d<=this.BITE_RADIUS&&f.biteCd<=0){
        bite=true;f.biteCd=2.2;
        // No canviar la direcció a la mossegada: continuar de llarg.
        f.passT=1.08;f.arcT=0;mode='pass';
        f.attackSide=-(f.attackSide||1);
        swimHeading(f.sharkYaw??Math.PI-f.a,17,.92);
      }else{
        // Lleuger desplaçament lateral: mossega de passada, no al centre.
        const yaw=f.sharkYaw??Math.PI-f.a,
          rightX=Math.cos(yaw),rightZ=-Math.sin(yaw),
          offset=d<14?1.45:0;
        swimTo(player.x+rightX*(f.attackSide||1)*offset,
          player.z+rightZ*(f.attackSide||1)*offset,17,1.0);
      }
    }else if(mode==='pass'){
      // Els primers 22 metres conserven el rumb del mos.
      swimHeading(f.sharkYaw??Math.PI-f.a,17,.92);
      f.passT-=dt;
      if(f.passT<=0){mode='arc';f.arcT=2.15;}
    }else if(mode==='arc'){
      // Arc de radi ~20 m; alternant costat es forma un 8 ample.
      // Mantenim una taxa de gir constant (cap canvi brusc de yaw).
      const side=f.attackSide||1;
      swimHeading((f.sharkYaw??0)+side*.72*dt,15,.72);
      f.arcT-=dt;
      if(f.arcT<=0)mode='chase';
    }else if(mode==='patrol'){
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
