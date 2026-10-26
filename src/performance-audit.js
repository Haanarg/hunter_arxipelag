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
    const groups={},shadowGroups={},otherDetails={},shadowReasons={},shadowCulprits={},
      vehicleTypes={},vehicleParts={},vehicleShadowTypes={};
    const fold=(out,values)=>{
      for(const [key,value] of Object.entries(values||{}))
        out[key]=(out[key]||0)+value/rows.length;
    };
    for(const r of rows){
      fold(groups,r.groups);
      fold(shadowGroups,r.shadowGroups);
      fold(otherDetails,r.otherDetails);
      fold(vehicleTypes,r.vehicleTypes);
      fold(vehicleParts,r.vehicleParts);
      fold(vehicleShadowTypes,r.vehicleShadowTypes);
      if(r.shadowRedrawn&&r.shadowReason)
        shadowReasons[r.shadowReason]=(shadowReasons[r.shadowReason]||0)+1;
      if(r.shadowRedrawn&&r.shadowCulprit)
        shadowCulprits[r.shadowCulprit]=(shadowCulprits[r.shadowCulprit]||0)+1;
    }
    const groupSum=obj=>Object.values(obj).reduce((a,b)=>a+b,0);
    const attributed=groupSum(groups)+groupSum(shadowGroups);
    return {
      frames:rows.length,fps:1000/avg('frameMs'),
      frameMs:avg('frameMs'),
      p95FrameMs:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)],
      p99FrameMs:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.99)-1)],
      slowFrames20:rows.filter(r=>r.frameMs>20).length,
      frames20to25:rows.filter(r=>r.frameMs>20&&r.frameMs<=25).length,
      frames24to25:rows.filter(r=>r.frameMs>=24&&r.frameMs<=25).length,
      slowFrames25:rows.filter(r=>r.frameMs>25).length,
      slowFrames50:rows.filter(r=>r.frameMs>50).length,
      updateCpuMs:avg('updateCpuMs'),renderCpuMs:avg('renderCpuMs'),
      roadVersionCpuMs:avg('roadVersionCpuMs'),roadRefitCpuMs:avg('roadRefitCpuMs'),
      roadVersionChecks:avg('roadVersionChecks'),roadRefits:avg('roadRefits'),
      roadFastSkips:avg('roadFastSkips'),
      postRenderCpuMs:avg('postRenderCpuMs'),terrainCpuMs:avg('terrainCpuMs'),
      drawCalls:avg('drawCalls'),triangles:avg('triangles'),
      aiMs:avg('aiMs'),aiNavMs:avg('aiNavMs'),aiSweepMs:avg('aiSweepMs'),
      sweepChecks:avg('sweepChecks'),sweepSamples:avg('sweepSamples'),
      aiUpdated:avg('aiUpdated'),aiSkipped:avg('aiSkipped'),
      simulationSteps:avg('simulationSteps'),
      shadowRedrawRate:avg('shadowRedrawn'),
      deferredFaunaCasters:avg('deferredFaunaCasters'),
      boatMotionProxies:avg('boatMotionProxies'),
      shadowDrawCalls:groupSum(shadowGroups),
      unclassifiedDrawCalls:Math.max(0,avg('drawCalls')-attributed),
      groups,shadowGroups,otherDetails,shadowReasons,shadowCulprits,
      vehicleTypes,vehicleParts,vehicleShadowTypes
    };
  }
  // Versió compacta per compartir en xats: preserva les cinc fases i els
  // comptadors diagnòstics; el JSON complet continua disponible per descarregar.
  function shareReport(report){
    const round=value=>typeof value==='number'&&Number.isFinite(value)
      ?Math.round(value*100)/100:value;
    const pick=(object,keys)=>Object.fromEntries(keys.filter(key=>object?.[key]!==undefined)
      .map(key=>[key,round(object[key])]));
    const ranked=(object,limit=Infinity)=>Object.fromEntries(Object.entries(object||{})
      .filter(([,value])=>typeof value==='number'&&value!==0)
      .sort((a,b)=>b[1]-a[1]).slice(0,limit)
      .map(([key,value])=>[key,round(value)]));
    const metrics=['frames','fps','frameMs','p95FrameMs','p99FrameMs',
      'slowFrames20','frames20to25','frames24to25','slowFrames25','slowFrames50',
      'updateCpuMs','renderCpuMs','roadVersionCpuMs','roadRefitCpuMs',
      'roadVersionChecks','roadRefits','roadFastSkips','postRenderCpuMs',
      'terrainCpuMs','drawCalls','triangles','aiMs','aiNavMs','aiSweepMs',
      'sweepChecks','sweepSamples','aiUpdated','aiSkipped','simulationSteps',
      'shadowRedrawRate','shadowDrawCalls','unclassifiedDrawCalls',
      'deferredFaunaCasters','boatMotionProxies'];
    return {
      format:'hunter-perf-share-v1',status:report.status,seed:report.seed,
      quality:report.quality,pixelRatio:report.pixelRatio,
      auditPosition:report.auditPosition,stressPreset:report.stressPreset,
      playerBatchStats:report.playerBatchStats,pathStats:report.pathStats,
      vehicleFleet:Object.fromEntries(Object.entries(report.vehicleFleet||{})
        .map(([type,vehicle])=>[type,pick(vehicle,
          ['count','meshes','savedMeshes','originalMeshes','shadowCasters'])])),
      phases:(report.phases||[]).map((phase,index)=>{
        const s=phase.stats||{};
        return {id:phase.id,name:phase.name,stats:{
          ...pick(s,metrics),groups:ranked(s.groups),shadowGroups:ranked(s.shadowGroups),
          shadowReasons:s.shadowReasons||{},shadowCulprits:s.shadowCulprits||{},
          vehicleTypes:ranked(s.vehicleTypes),vehicleShadowTypes:ranked(s.vehicleShadowTypes),
          ...(index===0?{vehicleParts:ranked(s.vehicleParts,15),
            otherDetails:ranked(s.otherDetails,15)}:{})
        }};
      }),
      baseline:report.baseline
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
    const copyFull=doc.createElement('button');
    const download=doc.createElement('button');
    for(const button of [copy,copyFull,download]){
      button.type='button';
      button.style.cssText='display:none;margin:8px 6px 0 0;padding:7px 10px;font:inherit;cursor:pointer';
    }
    copy.textContent='Copia resum (per al xat)';
    copyFull.textContent='Copia JSON complet';
    download.textContent='Descarrega JSON complet';
    function copyText(text,button,message){
      const fallback=()=>{
        let area;
        try{
          area=doc.createElement('textarea');
          area.value=text;
          area.setAttribute('readonly','');
          area.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
          doc.body.append(area);
          area.select();
          const success=!!doc.execCommand?.('copy');
          button.textContent=success?message:'No s’ha pogut copiar: descarrega el JSON.';
        }catch(error){
          button.textContent='No s’ha pogut copiar: descarrega el JSON.';
        }finally{area?.remove();}
      };
      try{
        const clipboard=windowObject.navigator?.clipboard;
        if(!clipboard?.writeText){fallback();return;}
        Promise.resolve(clipboard.writeText(text))
          .then(()=>{button.textContent=message;}).catch(fallback);
      }catch(error){fallback();}
    }
    copy.onclick=()=>{
      if(!lastReport)return;
      const text=JSON.stringify(shareReport(lastReport));
      copyText(text,copy,'Resum copiat ('+text.length+' caràcters)');
    };
    copyFull.onclick=()=>{
      if(!lastReport)return;
      const text=JSON.stringify(lastReport,null,2);
      copyText(text,copyFull,'JSON complet copiat ('+text.length+' caràcters)');
    };
    download.onclick=()=>{
      if(!lastReport)return;
      let url;
      try{
        const text=JSON.stringify(lastReport,null,2);
        url=windowObject.URL.createObjectURL(new windowObject.Blob([text],
          {type:'application/json;charset=utf-8'}));
        const link=doc.createElement('a');
        link.href=url;
        link.download='hunter-auditoria-'+lastReport.seed+'.json';
        doc.body.append(link);link.click();link.remove();
        download.textContent='JSON descarregat';
      }catch(error){
        download.textContent='No disponible: usa Copia JSON complet';
      }finally{
        if(url)windowObject.setTimeout(
          ()=>windowObject.URL.revokeObjectURL(url),1000);
      }
    };
    panel.append(label,details,copy,copyFull,download);doc.body.append(panel);
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
        stressPreset:original.stressPreset||null,
        vehicleFleet:original.vehicleFleet||null,
        auditPosition:origin,
        originalShadowsDisabled:original.shadowsDisabled,
        originalWaterDisabled:original.waterDisabled,phases:results,baseline,
        note:'Comparació de CPU i FPS: no és una mesura directa de GPU. La suma de crides per categoria pot no incloure totes les passades auxiliars.'};
      lastReport=report;
      windowObject.HUNTER_PERF_AUDIT_RESULTS=report;
      const fmt=n=>Number.isFinite(n)?n.toFixed(1):'n/d';
      let message='Mateixa llavor i posició; opcions originals restaurades.\n';
      if(original.stressPreset)
        message+='ESTRÈS: llavor '+original.stressPreset.seed+
          ', X '+fmt(original.stressPreset.x)+', Z '+fmt(original.stressPreset.z)+'\n';
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
      message+='Vehicles: malles eliminades per model (mapa complet):\n';
      for(const [type,data] of Object.entries(original.vehicleFleet||{})
        .filter(([,data])=>data.savedMeshes>0)
        .sort((a,b)=>b[1].savedMeshes-a[1].savedMeshes).slice(0,12))
        message+='  '+type+': '+data.originalMeshes+' → '+data.meshes+
          ' ('+data.savedMeshes+' menys)\n';
      message+='Vehicles: crides de dibuix per model (fase inicial):\n';
      for(const [key,count] of Object.entries(initial?.vehicleTypes||{}).sort((a,b)=>b[1]-a[1]))
        message+='  '+key+': '+fmt(count)+'\n';
      message+='Peces de vehicles (les 15 més costoses):\n';
      for(const [key,count] of Object.entries(initial?.vehicleParts||{}).sort((a,b)=>b[1]-a[1]).slice(0,15))
        message+='  '+key+': '+fmt(count)+'\n';
      message+='Ombres dels vehicles per model:\n';
      for(const [key,count] of Object.entries(initial?.vehicleShadowTypes||{}).sort((a,b)=>b[1]-a[1]))
        message+='  '+key+': '+fmt(count)+'\n';
      message+='Recalculades '+fmt((initial?.shadowRedrawRate||0)*100)+'% dels fotogrames; ';
      message+='sense classificació: '+fmt(initial?.unclassifiedDrawCalls)+' crides\n';
      message+='\nIA: '+fmt(byId['base-1']?.aiMs)+'ms; col·lisions '+fmt(byId['base-1']?.aiSweepMs)+'ms';
      display(message);
      for(const button of [copy,copyFull,download])button.style.display='inline-block';
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
  window.HUNTER_PERFORMANCE_AUDIT=Object.freeze({create,summary,shareReport,PHASES});
})();
