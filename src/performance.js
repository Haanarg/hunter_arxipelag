// Diagnòstic de rendiment sense canviar els buffers WebGL durant una partida.
// Reescalar WebGLRenderer en calent provoca fotogrames foscos i pauses de GPU
// en alguns navegadors mòbils. La qualitat es decideix a l'arrencada.
window.HUNTER_PERFORMANCE=Object.freeze({
  create({renderer,maxPixelRatio,minPixelRatio,element=null,compact=false}){
    const ratio=Math.max(.65,maxPixelRatio);
    let frames=0,frameAccum=0,lastDisplay=0,lastFps=0;
    const stats={
      fps:0,frameMs:0,renderCpuMs:0,drawCalls:0,triangles:0,
      pixelRatio:ratio,maxPixelRatio:ratio,minPixelRatio:ratio,
      changes:0,active:false,mode:'fixed'
    };
    function sample({dt,renderCpuMs=0,active=true,now=0}){
      stats.active=!!active;
      const counts=renderer.info?.render;
      stats.drawCalls=counts?.calls||0;
      stats.triangles=counts?.triangles||0;
      stats.renderCpuMs=renderCpuMs;
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
      if(element&&now-lastDisplay>=350){
        element.textContent='FPS '+Math.round(stats.fps||0)+
          ' · fotograma '+(stats.frameMs||0).toFixed(1)+' ms'+
          '\nCPU render '+stats.renderCpuMs.toFixed(1)+' ms · '+stats.drawCalls+' dibuixos'+
          '\n'+Math.round(stats.triangles/1000)+'k triangles · Resolució fixa ×'+ratio.toFixed(2);
        lastDisplay=now;
      }
      return stats;
    }
    return {stats,sample};
  }
});
