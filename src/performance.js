// Mesurador de rendiment i resolució adaptativa. Sense impacte sobre la física.
window.HUNTER_PERFORMANCE=Object.freeze({
  create({renderer,maxPixelRatio,minPixelRatio,element=null,compact=false}){
    const ceiling=Math.max(.65,maxPixelRatio),
          floor=Math.min(ceiling,Math.max(.65,minPixelRatio));
    let ratio=ceiling,frames=0,frameAccum=0,sinceAdjustment=0,lastDisplay=0,
        wasActive=false;
    const stats={
      fps:0,frameMs:0,renderCpuMs:0,drawCalls:0,triangles:0,
      pixelRatio:ratio,maxPixelRatio:ceiling,minPixelRatio:floor,
      changes:0,active:false
    };
    function setRatio(next){
      next=Math.min(ceiling,Math.max(floor,Math.round(next*100)/100));
      if(Math.abs(next-ratio)<.025)return false;
      ratio=next;stats.pixelRatio=next;stats.changes++;
      renderer.setPixelRatio(next);
      return true;
    }
    // Call once after the 3D draw. The timings are CPU/frame timings, not GPU timers.
    function sample({dt,renderCpuMs=0,active=true,now=0}){
      stats.active=!!active;
      const counts=renderer.info?.render;
      stats.drawCalls=counts?.calls||0;
      stats.triangles=counts?.triangles||0;
      stats.renderCpuMs=renderCpuMs;
      if(!active){
        frames=0;frameAccum=0;sinceAdjustment=0;wasActive=false;
        return stats;
      }
      if(!wasActive){wasActive=true;frames=0;frameAccum=0;sinceAdjustment=0}
      // Suspensions de la pestanya no han de fer caure la qualitat.
      if(dt>0&&dt<=.2){
        frames++;
        frameAccum+=dt;
        sinceAdjustment+=dt;
      }
      if(frameAccum>=.85){
        const measuredFps=frames/frameAccum;
        stats.fps=stats.fps?stats.fps*.35+measuredFps*.65:measuredFps;
        stats.frameMs=1000/stats.fps;
        frames=0;frameAccum=0;
      }
      // Histeresi: reducció a ~45 FPS, recuperació només si hi ha marge (>56).
      // Només reajustem un cop cada 2.5 s per evitar oscil·lacions i recrear
      // els buffers de pantalla constantment.
      if(sinceAdjustment>=2.5&&stats.fps){
        if(stats.fps<(compact?42:46))setRatio(ratio-.12);
        else if(stats.fps>(compact?54:57))setRatio(ratio+.08);
        sinceAdjustment=0;
      }
      if(element&&now-lastDisplay>=350){
        element.textContent='FPS '+Math.round(stats.fps||0)+
          ' · fotograma '+(stats.frameMs||0).toFixed(1)+' ms'+
          '\nCPU render '+stats.renderCpuMs.toFixed(1)+' ms · '+stats.drawCalls+' dibuixos'+
          '\n'+Math.round(stats.triangles/1000)+'k triangles · Resolució ×'+ratio.toFixed(2);
        lastDisplay=now;
      }
      return stats;
    }
    return {stats,sample,setRatio};
  }
});
