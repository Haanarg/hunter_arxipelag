// Diagnòstic de rendiment sense canviar els buffers WebGL durant una partida.
// Reescalar WebGLRenderer en calent provoca fotogrames foscos i pauses de GPU
// en alguns navegadors mòbils. La qualitat es decideix a l'arrencada.
window.HUNTER_PERFORMANCE=Object.freeze({
  create({renderer,maxPixelRatio,minPixelRatio,element=null,compact=false}){
    const ratio=Math.max(.65,maxPixelRatio);
    let frames=0,frameAccum=0,lastDisplay=0,lastFps=0;
    const stats={
      fps:0,frameMs:0,renderCpuMs:0,postRenderCpuMs:0,updateCpuMs:0,terrainCpuMs:0,drawCalls:0,triangles:0,
      simulationSteps:0,simulationMs:0,droppedMs:0,
      pixelRatio:ratio,maxPixelRatio:ratio,minPixelRatio:ratio,
      changes:0,active:false,mode:'fixed'
    };
    function sample({dt,renderCpuMs=0,postRenderCpuMs=0,updateCpuMs=0,terrainCpuMs=0,
      simulationSteps=0,simulationMs=0,droppedMs=0,active=true,now=0,display=false}){
      stats.active=!!active;
      const counts=renderer.info?.render;
      stats.drawCalls=counts?.calls||0;
      stats.triangles=counts?.triangles||0;
      stats.renderCpuMs=renderCpuMs;
      stats.postRenderCpuMs=postRenderCpuMs;
      stats.updateCpuMs=updateCpuMs;
      stats.terrainCpuMs=terrainCpuMs;
      stats.simulationSteps=simulationSteps;
      stats.simulationMs=simulationMs;
      stats.droppedMs=droppedMs;
      if(!active){
        frames=0;frameAccum=0;lastFps=0;
        return stats;
      }
      // Ignorar pauses de la pestanya i salts del rellotge.
      if(dt>0&&dt<=5){frames++;frameAccum+=dt;}
      if(frameAccum>=.85){
        const fps=frames/frameAccum;
        stats.fps=lastFps?stats.fps*.35+fps*.65:fps;
        stats.frameMs=1000/stats.fps;
        frames=0;frameAccum=0;lastFps=stats.fps;
      }
      if(display&&element&&now-lastDisplay>=350){
        element.textContent='FPS '+Math.round(stats.fps||0)+
          ' · fotograma '+(stats.frameMs||0).toFixed(1)+' ms'+
          '\nSim '+stats.simulationSteps+' passos · '+stats.simulationMs.toFixed(0)+
          ' ms simulats · '+stats.droppedMs.toFixed(0)+' ms descartats'+
          '\nCPU joc '+stats.updateCpuMs.toFixed(1)+' ms · terreny '+stats.terrainCpuMs.toFixed(1)+' ms'+
          '\nCPU render '+stats.renderCpuMs.toFixed(1)+' ms · postrender '+stats.postRenderCpuMs.toFixed(1)+' ms · '+stats.drawCalls+' dibuixos'+
          '\n'+Math.round(stats.triangles/1000)+'k triangles · Resolució fixa ×'+ratio.toFixed(2)+
          (stats.hotspots?'\nCPU graella '+stats.hotspots.broadphaseMs.toFixed(2)+' · IA '+stats.hotspots.aiMs.toFixed(2)+
          ' · visual '+stats.hotspots.visibilityMs.toFixed(2)+' · sigil '+stats.hotspots.stealthMs.toFixed(2)+' ms'+
          '\nIA nav '+stats.hotspots.aiNavMs.toFixed(1)+' · mar '+stats.hotspots.aiMarineMs.toFixed(1)+
          ' · percepció '+stats.hotspots.aiSenseMs.toFixed(1)+' ms'+
          '\nIA tram '+stats.hotspots.aiDirectMs.toFixed(1)+' ('+stats.hotspots.aiDirectChecks+')'+
          ' · A* '+stats.hotspots.aiPathMs.toFixed(1)+' ('+stats.hotspots.aiPathChecks+') ms'+
          '\nIA col·lisions '+stats.hotspots.aiSweepMs.toFixed(1)+' ms · '+
          stats.hotspots.aiSweepChecks+' trajectes · '+stats.hotspots.aiSweepSamples+' mostres'+
          '\nIA terra ràpid '+(stats.hotspots.aiSweepFastGroundSamples||0)+
          ' · complet '+(stats.hotspots.aiSweepFullGroundSamples||0)+
          ' · prediccions passives '+(stats.hotspots.aiPassiveDirectChecks||0)+
          '\nIA decisions immediates '+(stats.hotspots.aiImmediateDecisions||0)+
          ' · remotes '+(stats.hotspots.aiRemoteDecisions||0)+
          '\nIA visió torres '+(stats.hotspots.aiTowerSightMs||0).toFixed(1)+
          ' ms · '+(stats.hotspots.aiTowerSightChecks||0)+' raigs · '+
          (stats.hotspots.aiTowerSightSkipped||0)+' evitats'+
          '\nIA tipus soldats '+(stats.hotspots.aiSoldierMs||0).toFixed(1)+
          ' · torres '+(stats.hotspots.aiTowerMs||0).toFixed(1)+
          ' · vehicles '+(stats.hotspots.aiVehicleMs||0).toFixed(1)+
          ' · coordinació '+(stats.hotspots.aiCoordMs||0).toFixed(1)+' ms'+
          '\nIA resta '+Math.max(0,stats.hotspots.aiMs-stats.hotspots.aiNavMs-
            stats.hotspots.aiMarineMs-stats.hotspots.aiSenseMs).toFixed(1)+' ms'+
          '\nIA actualitzats '+stats.hotspots.aiUpdated+' · espaiats '+stats.hotspots.aiSkipped:'');
        lastDisplay=now;
      }
      return stats;
    }
    // Mostres reals de la partida (no de la pausa). Màxim 5 s/600 mostres;
    // els percentils només es calculen quan es prem Copia.
    const recentFrames=[];
    let recentDuration=0;
    function captureActiveFrame({rawDt=0,hotspots=null,drawCategories=null,detailed=false}={}){
      if(!stats.active)return;
      stats.lastActive={
        capturedAt:Date.now(),detailed:!!detailed,
        fps:stats.fps,frameMs:stats.frameMs,
        updateCpuMs:stats.updateCpuMs,renderCpuMs:stats.renderCpuMs,
        postRenderCpuMs:stats.postRenderCpuMs,terrainCpuMs:stats.terrainCpuMs,
        drawCalls:stats.drawCalls,triangles:stats.triangles,
        pixelRatio:stats.pixelRatio,simulationSteps:stats.simulationSteps,
        simulationMs:stats.simulationMs,droppedMs:stats.droppedMs,
        hotspots:detailed&&hotspots?{...hotspots}:null,
        drawCategories:detailed&&drawCategories?{...drawCategories}:null
      };
      if(!(rawDt>0&&rawDt<=5))return;
      const row={dt:rawDt,updateMs:stats.updateCpuMs,
        renderMs:stats.renderCpuMs,droppedMs:stats.droppedMs,
        aiMs:detailed?(hotspots?.aiMs??null):null};
      recentFrames.push(row);
      recentDuration+=rawDt;
      while(recentFrames.length>1&&
        (recentDuration>5||recentFrames.length>600)){
        recentDuration-=recentFrames.shift().dt;
      }
    }
    function recentSummary(){
      if(!recentFrames.length||recentDuration<=0)return null;
      const percentile=(values,p)=>{
        if(!values.length)return null;
        const sorted=values.slice().sort((a,b)=>a-b);
        return sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)];
      };
      const summarize=values=>values.length?{
        mean:values.reduce((a,b)=>a+b,0)/values.length,
        p95:percentile(values,.95)
      }:null;
      return {
        samples:recentFrames.length,seconds:recentDuration,
        fps:recentFrames.length/recentDuration,
        frameMs:{p50:percentile(recentFrames.map(r=>r.dt*1000),.5),
          p95:percentile(recentFrames.map(r=>r.dt*1000),.95),
          p99:percentile(recentFrames.map(r=>r.dt*1000),.99)},
        updateCpuMs:summarize(recentFrames.map(r=>r.updateMs)),
        renderCpuMs:summarize(recentFrames.map(r=>r.renderMs)),
        aiCpuMs:summarize(recentFrames.filter(r=>r.aiMs!==null).map(r=>r.aiMs)),
        droppedMs:summarize(recentFrames.map(r=>r.droppedMs))
      };
    }
    function resetCapture(){
      recentFrames.length=0;recentDuration=0;stats.lastActive=null;
      frames=0;frameAccum=0;lastFps=0;stats.fps=0;stats.frameMs=0;
    }
    return {stats,sample,captureActiveFrame,recentSummary,resetCapture};
  }
});
