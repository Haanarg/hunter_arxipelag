// Diagnòstic de rendiment sense canviar els buffers WebGL durant una partida.
// Reescalar WebGLRenderer en calent provoca fotogrames foscos i pauses de GPU
// en alguns navegadors mòbils. La qualitat es decideix a l'arrencada.
window.HUNTER_PERFORMANCE=Object.freeze({
  create({renderer,maxPixelRatio,minPixelRatio,element=null,compact=false}){
    const ratio=Math.max(.65,maxPixelRatio);
    let frames=0,frameAccum=0,lastDisplay=0,lastFps=0;
    const stats={
      fps:0,frameMs:0,renderCpuMs:0,updateCpuMs:0,terrainCpuMs:0,drawCalls:0,triangles:0,
      simulationSteps:0,simulationMs:0,droppedMs:0,
      pixelRatio:ratio,maxPixelRatio:ratio,minPixelRatio:ratio,
      changes:0,active:false,mode:'fixed'
    };
    function sample({dt,renderCpuMs=0,updateCpuMs=0,terrainCpuMs=0,
      simulationSteps=0,simulationMs=0,droppedMs=0,active=true,now=0,display=false}){
      stats.active=!!active;
      const counts=renderer.info?.render;
      stats.drawCalls=counts?.calls||0;
      stats.triangles=counts?.triangles||0;
      stats.renderCpuMs=renderCpuMs;
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
      if(dt>0&&dt<=.2){frames++;frameAccum+=dt;}
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
          '\nCPU render '+stats.renderCpuMs.toFixed(1)+' ms · '+stats.drawCalls+' dibuixos'+
          '\n'+Math.round(stats.triangles/1000)+'k triangles · Resolució fixa ×'+ratio.toFixed(2)+
          (stats.hotspots?'\nCPU graella '+stats.hotspots.broadphaseMs.toFixed(2)+' · IA '+stats.hotspots.aiMs.toFixed(2)+
          ' · visual '+stats.hotspots.visibilityMs.toFixed(2)+' · sigil '+stats.hotspots.stealthMs.toFixed(2)+' ms'+
          '\nIA nav '+stats.hotspots.aiNavMs.toFixed(1)+' · mar '+stats.hotspots.aiMarineMs.toFixed(1)+
          ' · percepció '+stats.hotspots.aiSenseMs.toFixed(1)+' ms'+
          '\nIA tram '+stats.hotspots.aiDirectMs.toFixed(1)+' ('+stats.hotspots.aiDirectChecks+')'+
          ' · A* '+stats.hotspots.aiPathMs.toFixed(1)+' ('+stats.hotspots.aiPathChecks+') ms'+
          '\nIA col·lisions '+stats.hotspots.aiSweepMs.toFixed(1)+' ms · '+
          stats.hotspots.aiSweepChecks+' trajectes · '+stats.hotspots.aiSweepSamples+' mostres'+
          '\nIA actualitzats '+stats.hotspots.aiUpdated+' · espaiats '+stats.hotspots.aiSkipped:'');
        lastDisplay=now;
      }
      return stats;
    }
    return {stats,sample};
  }
});
