// Reutilitza el mapa d'ombres si els objectes que el poden alterar no es mouen.
// No modifica resolució, filtre, geometria ni quins objectes projecten ombra.
window.HUNTER_SHADOW_CACHE=Object.freeze({
  create({shadowMap,maxIdleMs=180,motionEpsilon=0.02}){
    const state=new WeakMap();
    let lastUpdate=-Infinity,lastX=NaN,lastZ=NaN,ready=false,trackedCount=-1;
    const stats={redraws:0,reuses:0,motionRedraws:0,periodicRedraws:0,forcedRedraws:0,watched:0};
    shadowMap.autoUpdate=false;
    function invalidate(){
      ready=false;trackedCount=-1;lastUpdate=-Infinity;
      shadowMap.needsUpdate=true;
    }
    function capture(node){
      const p=node.position,r=node.rotation,s=node.scale,q=node.quaternion;
      if(!p||!r||!s)return;
      let saved=state.get(node);
      if(!saved){saved=new Float64Array(13);state.set(node,saved)}
      saved[0]=p.x;saved[1]=p.y;saved[2]=p.z;
      saved[3]=r.x;saved[4]=r.y;saved[5]=r.z;
      saved[6]=s.x;saved[7]=s.y;saved[8]=s.z;
      if(q){saved[9]=q.x;saved[10]=q.y;saved[11]=q.z;saved[12]=q.w}
    }
    function changed(node){
      const p=node.position,r=node.rotation,s=node.scale,q=node.quaternion;
      if(!p||!r||!s)return true;
      const old=state.get(node);
      if(!old)return true;
      // Compare against the *last rendered* pose, not the preceding frame.
      // Slow continuous movement must still invalidate the cached shadow.
      return Math.abs(p.x-old[0])>motionEpsilon||
        Math.abs(p.y-old[1])>motionEpsilon||
        Math.abs(p.z-old[2])>motionEpsilon||
        Math.abs(r.x-old[3])>motionEpsilon||
        Math.abs(r.y-old[4])>motionEpsilon||
        Math.abs(r.z-old[5])>motionEpsilon||
        Math.abs(s.x-old[6])>motionEpsilon||
        Math.abs(s.y-old[7])>motionEpsilon||
        Math.abs(s.z-old[8])>motionEpsilon||
        (q&&(Math.abs(q.x-old[9])>motionEpsilon||
          Math.abs(q.y-old[10])>motionEpsilon||
          Math.abs(q.z-old[11])>motionEpsilon||
          Math.abs(q.w-old[12])>motionEpsilon));
    }
    function schedule({now,x,z,nodes=[],enabled=true,force=false}){
      if(!enabled)return false;
      const anchorMoved=!ready||Math.abs(x-lastX)>motionEpsilon||Math.abs(z-lastZ)>motionEpsilon;
      let moving=anchorMoved||nodes.length!==trackedCount;
      // Miram també les articulacions: un rotor pot girar sense moure el vehicle.
      for(const node of nodes)if(changed(node))moving=true;
      const forced=force||!ready||shadowMap.needsUpdate,
            periodic=now-lastUpdate>=maxIdleMs,
            redraw=forced||moving||periodic;
      lastX=x;lastZ=z;trackedCount=nodes.length;
      stats.watched=nodes.length;
      if(!redraw){
        stats.reuses++;
        return false;
      }
      shadowMap.needsUpdate=true;
      for(const node of nodes)capture(node);
      lastUpdate=now;ready=true;stats.redraws++;
      if(forced)stats.forcedRedraws++;
      else if(moving)stats.motionRedraws++;
      else stats.periodicRedraws++;
      return true;
    }
    return {stats,schedule,invalidate};
  }
});
