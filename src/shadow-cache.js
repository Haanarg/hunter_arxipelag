// Ombres coherents: memòria cau amb invalidació per moviment i diagnòstic.
// La resolució, el filtre i les geometries no es modifiquen.
window.HUNTER_SHADOW_CACHE=Object.freeze({
  create({shadowMap,maxIdleMs=180,motionEpsilon=.02,majorMotion=.12,
    minorRefreshMs=48,labelNode=node=>node.name||node.type||'pivot'}){
    const lastPose=new WeakMap();
    let ready=false,lastUpdate=-Infinity,lastX=NaN,lastZ=NaN,lastCount=-1;
    const stats={redraws:0,reuses:0,motionRedraws:0,periodicRedraws:0,
      forcedRedraws:0,motionDeferrals:0,watched:0,lastReason:'inici',
      lastCulprit:'',reasons:{},culprits:{}};
    shadowMap.autoUpdate=false;
    const counts=(map,key)=>{map[key]=(map[key]||0)+1};
    function invalidate(){
      ready=false;lastCount=-1;lastUpdate=-Infinity;
      shadowMap.needsUpdate=true;
    }
    function capture(node){
      const p=node.position,r=node.rotation,s=node.scale,q=node.quaternion;
      if(!p||!r||!s)return;
      let saved=lastPose.get(node);
      if(!saved){saved=new Float64Array(13);lastPose.set(node,saved)}
      saved[0]=p.x;saved[1]=p.y;saved[2]=p.z;
      saved[3]=r.x;saved[4]=r.y;saved[5]=r.z;
      saved[6]=s.x;saved[7]=s.y;saved[8]=s.z;
      if(q){saved[9]=q.x;saved[10]=q.y;saved[11]=q.z;saved[12]=q.w}
    }
    function displacement(node){
      const p=node.position,r=node.rotation,s=node.scale,q=node.quaternion;
      if(!p||!r||!s)return Infinity;
      const old=lastPose.get(node);
      if(!old)return Infinity;
      let magnitude=Math.max(
        Math.abs(p.x-old[0]),Math.abs(p.y-old[1]),Math.abs(p.z-old[2]),
        Math.abs(r.x-old[3]),Math.abs(r.y-old[4]),Math.abs(r.z-old[5]),
        Math.abs(s.x-old[6]),Math.abs(s.y-old[7]),Math.abs(s.z-old[8]));
      if(q)magnitude=Math.max(magnitude,Math.abs(q.x-old[9]),
        Math.abs(q.y-old[10]),Math.abs(q.z-old[11]),Math.abs(q.w-old[12]));
      return magnitude;
    }
    function schedule({now,x,z,nodes=[],enabled=true,force=false}){
      if(!enabled)return false;
      const forced=force||!ready||shadowMap.needsUpdate;
      const anchorMoved=Math.abs(x-lastX)>motionEpsilon||
        Math.abs(z-lastZ)>motionEpsilon;
      const countChanged=nodes.length!==lastCount;
      const periodic=now-lastUpdate>=maxIdleMs;
      const elapsed=now-lastUpdate;
      let biggest=0,culprit=null;
      for(const node of nodes){
        const amount=displacement(node);
        if(amount>biggest){biggest=amount;culprit=node}
      }
      const moving=biggest>motionEpsilon,
            major=biggest>=majorMotion,
            delayMinor=moving&&!major&&!forced&&!anchorMoved&&!countChanged&&!periodic&&
              elapsed<minorRefreshMs;
      const reason=forced?'forçat':anchorMoved?'focus solar':
        countChanged?'candidats':major?'moviment gran':
        periodic?'refresc preventiu':moving&&!delayMinor?'moviment petit':'';
      const redraw=!!reason;
      stats.watched=nodes.length;
      if(!redraw){
        stats.reuses++;
        if(delayMinor)stats.motionDeferrals++;
        return false;
      }
      shadowMap.needsUpdate=true;
      for(const node of nodes)capture(node);
      lastX=x;lastZ=z;lastCount=nodes.length;
      lastUpdate=now;ready=true;
      stats.redraws++;stats.lastReason=reason;counts(stats.reasons,reason);
      const culpritName=culprit&&(reason==='moviment gran'||reason==='moviment petit')?
        String(labelNode(culprit)):'';
      stats.lastCulprit=culpritName;
      if(culpritName){
        // Vocabulari acotat: no acumular centenars d'identificadors per
        // a mapes grans. Conservam una entrada agregada de reserva.
        const key=Object.hasOwn(stats.culprits,culpritName)||
          Object.keys(stats.culprits).length<32?culpritName:'altres elements';
        counts(stats.culprits,key);
      }
      if(forced)stats.forcedRedraws++;
      else if(major||moving||anchorMoved||countChanged)stats.motionRedraws++;
      else stats.periodicRedraws++;
      return true;
    }
    return {stats,schedule,invalidate};
  }
});
