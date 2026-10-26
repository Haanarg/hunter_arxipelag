// Auditoria A/B optativa: mai no canvia la qualitat de la partida normal.
// Les comparacions són temps de CPU (no mesuren directament el temps de GPU).
(function(){
  const PHASES=[
    {id:'base-1',name:'Normal (inici)',shadows:false,water:false},
    {id:'no-shadows',name:'Sense ombres',shadows:true,water:false},
    {id:'no-water',name:'Sense aigua',shadows:false,water:true},
    {id:'no-both',name:'Sense ombres ni aigua',shadows:true,water:true},
    {id:'base-2',name:'Normal (final)',shadows:false,water:false}
  ];
  function summary(rows){
    if(!rows.length)return null;
    const avg=key=>rows.reduce((sum,r)=>sum+(r[key]||0),0)/rows.length;
    const sorted=rows.map(r=>r.frameMs).sort((a,b)=>a-b);
    const groups={},shadowGroups={},otherDetails={},shadowReasons={},shadowCulprits={};
    const fold=(out,values)=>{
      for(const [key,value] of Object.entries(values||{}))
        out[key]=(out[key]||0)+value/rows.length;
    };
    for(const r of rows){
      fold(groups,r.groups);
      fold(shadowGroups,r.shadowGroups);
      fold(otherDetails,r.otherDetails);
      if(r.shadowRedrawn&&r.shadowReason)
        shadowReasons[r.shadowReason]=(shadowReasons[r.shadowReason]||0)+1;
      if(r.shadowRedrawn&&r.shadowCulprit)
        shadowCulprits[r.shadowCulprit]=(shadowCulprits[r.shadowCulprit]||0)+1;
    }
    const groupSum=obj=>Object.values(obj).reduce((a,b)=>a+b,0);
    const attributed=groupSum(groups)+groupSum(shadowGroups);
    return {
      frames:rows.length,fps:1000/avg('frameMs'),
      frameMs:avg('frameMs'),p95FrameMs:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)],
      updateCpuMs:avg('updateCpuMs'),renderCpuMs:avg('renderCpuMs'),
      postRenderCpuMs:avg('postRenderCpuMs'),terrainCpuMs:avg('terrainCpuMs'),
      drawCalls:avg('drawCalls'),triangles:avg('triangles'),
      aiMs:avg('aiMs'),aiNavMs:avg('aiNavMs'),aiSweepMs:avg('aiSweepMs'),
      sweepChecks:avg('sweepChecks'),sweepSamples:avg('sweepSamples'),
      aiUpdated:avg('aiUpdated'),aiSkipped:avg('aiSkipped'),
      simulationSteps:avg('simulationSteps'),
      shadowRedrawRate:avg('shadowRedrawn'),
      deferredFaunaCasters:avg('deferredFaunaCasters'),
      shadowDrawCalls:groupSum(shadowGroups),
      unclassifiedDrawCalls:Math.max(0,avg('drawCalls')-attributed),
      groups,shadowGroups,otherDetails,shadowReasons,shadowCulprits
    };
  }
  function create({getState,setShadowsDisabled,setWaterDisabled,windowObject=window,
    warmupMs=1100,sampleMs=3000}){
    let status='pending',index=0,phaseElapsed=0,rows=[],origin=null,
      original=null,results=[],notice='',lastReport=null;
    const doc=windowObject.document;
    const panel=doc.createElement('section');
    panel.id='perfAuditPanel';
    panel.style.cssText='position:fixed;right:10px;top:8px;z-index:16;width:min(360px,calc(100vw - 20px));max-height:70vh;overflow:auto;box-sizing:border-box;padding:12px;border:1px solid #9ccba5;border-radius:9px;background:#102333ee;color:#f2fbef;font:12px/1.5 ui-monospace,monospace;box-shadow:0 2px 16px #0009';
    const label=doc.createElement('div'),details=doc.createElement('pre');
    label.style.cssText='font-weight:bold;margin-bottom:6px';
    details.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font:inherit';
    const copy=doc.createElement('button');
    copy.type='button';copy.textContent='Copia els resultats';
    copy.style.cssText='display:none;margin-top:8px;padding:7px 10px;font:inherit;cursor:pointer';
    copy.onclick=()=>{
      const text=JSON.stringify(lastReport,null,2);
      if(windowObject.navigator?.clipboard?.writeText)
        windowObject.navigator.clipboard.writeText(text).then(()=>{copy.textContent='Copiat!'})
          .catch(()=>{copy.textContent='Copia des de la consola: HUNTER_PERF_AUDIT_RESULTS'});
      else copy.textContent='Copia des de la consola: HUNTER_PERF_AUDIT_RESULTS';
    };
    panel.append(label,details,copy);doc.body.append(panel);
    function display(message){
      label.textContent='Auditoria de rendiment · '+(status==='finished'?'finalitzada':status==='aborted'?'interrompuda':'en curs');
      details.textContent=message;
    }
    display('Comença una partida i deixa el personatge quiet. Compararem la mateixa escena amb diverses opcions visuals.');
    function apply(phase){
      setShadowsDisabled(original.shadowsDisabled||phase.shadows);
      setWaterDisabled(original.waterDisabled||phase.water);
    }
    function restore(){
      if(!original)return;
      setShadowsDisabled(original.shadowsDisabled);
      setWaterDisabled(original.waterDisabled);
    }
    function abort(reason){
      if(status==='finished'||status==='aborted')return;
      status='aborted';notice=reason;restore();
      display(reason+'\nLes opcions visuals originals estan restaurades.');
      windowObject.HUNTER_PERF_AUDIT_RESULTS={status,reason,phases:results};
    }
    function finish(){
      status='finished';restore();
      const byId=Object.fromEntries(results.map(p=>[p.id,p.stats]));
      const baselines=[byId['base-1'],byId['base-2']].filter(Boolean);
      const baseline=baselines.length?{
        fps:baselines.reduce((s,x)=>s+x.fps,0)/baselines.length,
        frameMs:baselines.reduce((s,x)=>s+x.frameMs,0)/baselines.length
      }:null;
      const report={status,seed:original.seed,quality:original.quality,
        pixelRatio:original.pixelRatio,
        playerBatchStats:original.playerBatchStats||null,
        pathStats:original.pathStats||null,
        originalShadowsDisabled:original.shadowsDisabled,
        originalWaterDisabled:original.waterDisabled,phases:results,baseline,
        note:'Comparació de CPU i FPS: no és una mesura directa de GPU. La suma de crides per categoria pot no incloure totes les passades auxiliars.'};
      lastReport=report;
      windowObject.HUNTER_PERF_AUDIT_RESULTS=report;
      const fmt=n=>Number.isFinite(n)?n.toFixed(1):'n/d';
      let message='Mateixa llavor i posició; opcions originals restaurades.\n';
      message+='Escena            FPS   render  joc    crides\n';
      for(const p of results){
        const s=p.stats;
        message+=p.name.padEnd(18).slice(0,18)+' '+
          fmt(s?.fps).padStart(5)+' '+fmt(s?.renderCpuMs).padStart(6)+'ms '+
          fmt(s?.updateCpuMs).padStart(5)+'ms '+fmt(s?.drawCalls).padStart(7)+'\n';
      }
      if(baselines.length===2&&Math.abs(baselines[0].fps-baselines[1].fps)/Math.max(1,baseline.fps)>.15)
        message+='\nAvís: el rendiment normal ha variat més del 15%; comparació poc estable.\n';
      const initial=byId['base-1'];
      const categories=Object.entries(initial?.groups||{}).sort((a,b)=>b[1]-a[1]);
      message+='\nCrides de dibuix principals (normal):\n';
      for(const [key,count] of categories)if(count>0)message+='  '+key+': '+fmt(count)+'\n';
      message+='\nAltres: desglossament per pare/malla:\n';
      for(const [key,count] of Object.entries(initial?.otherDetails||{}).sort((a,b)=>b[1]-a[1]).slice(0,20))
        message+='  '+key+': '+fmt(count)+'\n';
      message+='\nPassades d’ombres per categoria:\n';
      for(const [key,count] of Object.entries(initial?.shadowGroups||{}).sort((a,b)=>b[1]-a[1]))
        if(count>0)message+='  '+key+': '+fmt(count)+'\n';
      message+='\nCauses de refresc d’ombres:\n';
      for(const [key,count] of Object.entries(initial?.shadowReasons||{}).sort((a,b)=>b[1]-a[1]))
        message+='  '+key+': '+count+' fotogrames\n';
      message+='Malles que activen refrescos:\n';
      for(const [key,count] of Object.entries(initial?.shadowCulprits||{}).sort((a,b)=>b[1]-a[1]).slice(0,12))
        message+='  '+key+': '+count+'\n';
      if(original.playerBatchStats)
        message+='Jugador: '+original.playerBatchStats.before+' → '+
          original.playerBatchStats.after+' malles ('+
          original.playerBatchStats.groups+' crides potencials eliminades)\n';
      if(original.pathStats)
        message+='Camins: '+original.pathStats.chunks+' sectors\n';
      message+='Fauna amb ombra i refresc diferit: '+fmt(initial?.deferredFaunaCasters)+' malles\n';
      message+='Recalculades '+fmt((initial?.shadowRedrawRate||0)*100)+'% dels fotogrames; ';
      message+='sense classificació: '+fmt(initial?.unclassifiedDrawCalls)+' crides\n';
      message+='\nIA: '+fmt(byId['base-1']?.aiMs)+'ms; col·lisions '+fmt(byId['base-1']?.aiSweepMs)+'ms';
      display(message);
      copy.style.display='inline-block';
      windowObject.console.info('[HUNTER] Auditoria de rendiment',report);
      windowObject.console.table(results.map(p=>({escena:p.name,fps:+p.stats.fps.toFixed(1),
        renderMs:+p.stats.renderCpuMs.toFixed(1),jocMs:+p.stats.updateCpuMs.toFixed(1),
        crides:Math.round(p.stats.drawCalls),iaMs:+p.stats.aiMs.toFixed(1)})));
    }
    function onFrame(frame){
      if(status==='finished'||status==='aborted')return;
      if(status==='pending'){
        if(!frame.active)return;
        original={...getState()};
        origin={x:frame.x,z:frame.z};
        status='running';index=0;phaseElapsed=0;rows=[];
        apply(PHASES[index]);
        display('Fase 1/5: Normal (inici)\nNo moguis el personatge fins a completar la prova.');
        return;
      }
      if(!frame.active){abort('La partida s’ha pausat, ocultat o acabat.');return}
      if(Math.hypot(frame.x-origin.x,frame.z-origin.z)>4){
        abort('El personatge s’ha mogut més de 4 m: la comparació no és fiable.');return;
      }
      if(!(frame.frameMs>0&&frame.frameMs<=200))return;
      phaseElapsed+=frame.frameMs;
      if(phaseElapsed>warmupMs){
        rows.push(frame);
      }
      if(phaseElapsed<warmupMs+sampleMs)return;
      const phase=PHASES[index];
      results.push({id:phase.id,name:phase.name,stats:summary(rows)});
      index++;
      if(index>=PHASES.length){finish();return}
      phaseElapsed=0;rows=[];
      apply(PHASES[index]);
      display('Fase '+(index+1)+'/5: '+PHASES[index].name+
        '\nMesuram render, joc, IA i dibuixos. No moguis el personatge.');
    }
    return {onFrame,abort,get status(){return status},get results(){return results}};
  }
  window.HUNTER_PERFORMANCE_AUDIT=Object.freeze({create,summary,PHASES});
})();
