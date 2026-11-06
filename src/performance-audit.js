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
  // Asynchronous WebGL GPU timer (render pass only, not VSYNC/compositor).
  // Never gl.finish; never read QUERY_RESULT before QUERY_RESULT_AVAILABLE.
  function createGpuTimer(renderer){
    let gl=null,ext=null,webgl2=false,active=null,state='unsupported';
    const queue=[],limit=8;
    let dropped=0,disjoint=0,completed=0;
    try{
      gl=renderer?.getContext?.();
      if(gl?.getExtension){
        webgl2=!!(gl.beginQuery&&gl.createQuery&&gl.getQueryParameter);
        ext=gl.getExtension(webgl2?'EXT_disjoint_timer_query_webgl2':
          'EXT_disjoint_timer_query');
        if(ext)state='supported';
      }
    }catch(error){state='unavailable'}
    const remove=query=>{
      try{if(webgl2)gl.deleteQuery(query);else ext.deleteQueryEXT(query)}
      catch(error){}
    };
    function dispose(){
      if(active){
        try{if(webgl2)gl.endQuery(ext.TIME_ELAPSED_EXT);
          else ext.endQueryEXT(ext.TIME_ELAPSED_EXT)}catch(error){}
        remove(active.query);active=null;
      }
      for(const entry of queue)remove(entry.query);
      queue.length=0;
    }
    function poll(){
      if(state!=='supported')return;
      try{
        if(gl.getParameter(ext.GPU_DISJOINT_EXT)){
          disjoint+=queue.length;
          for(const entry of queue)remove(entry.query);
          queue.length=0;return;
        }
        while(queue.length){
          const entry=queue[0];
          const available=webgl2?gl.getQueryParameter(entry.query,gl.QUERY_RESULT_AVAILABLE):
            ext.getQueryObjectEXT(entry.query,ext.QUERY_RESULT_AVAILABLE_EXT);
          if(!available)break;
          const nano=webgl2?gl.getQueryParameter(entry.query,gl.QUERY_RESULT):
            ext.getQueryObjectEXT(entry.query,ext.QUERY_RESULT_EXT);
          if(Number.isFinite(nano)&&nano>=0){entry.sample.ms=nano/1e6;completed++}
          remove(entry.query);queue.shift();
        }
      }catch(error){state='error';dispose()}
    }
    function begin(){
      if(state!=='supported'||active)return null;
      if(queue.length>=limit){dropped++;return null}
      try{
        const query=webgl2?gl.createQuery():ext.createQueryEXT();
        if(!query){dropped++;return null}
        const sample={ms:null};
        if(webgl2)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
        else ext.beginQueryEXT(ext.TIME_ELAPSED_EXT,query);
        active={query,sample};return sample;
      }catch(error){state='error';dispose();return null}
    }
    function end(sample){
      if(!active||active.sample!==sample)return;
      const entry=active;active=null;
      try{
        if(webgl2)gl.endQuery(ext.TIME_ELAPSED_EXT);
        else ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
        queue.push(entry);
      }catch(error){remove(entry.query);state='error';dispose()}
    }
    return {begin,end,poll,dispose,get status(){return state},
      get supported(){return state==='supported'},get dropped(){return dropped},
      get disjoint(){return disjoint},get completed(){return completed}};
  }
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
    // RAF intervals are measured BETWEEN callbacks: previous-frame CPU
    // is relevant to diagnosing missed refresh opportunities.
    const intervalBuckets={'~8.3ms':0,'~16.7ms':0,'~25ms':0,'~33.3ms':0,other:0};
    const snapshots=[],gpuValues=[],slow33=[],regular=[];
    const classify=ms=>{
      for(const [name,center] of [['~8.3ms',8.333],['~16.7ms',16.667],
        ['~25ms',25],['~33.3ms',33.333]])
        if(Math.abs(ms-center)<=1.6)return name;
      return 'other';
    };
    const cpu=frame=>frame?(frame.updateCpuMs||0)+(frame.terrainCpuMs||0)+
      (frame.preRenderCpuMs||0)+(frame.renderCpuMs||0)+(frame.postRenderCpuMs||0):null;
    const compactFrame=frame=>frame?{
      cpuMs:cpu(frame),updateCpuMs:frame.updateCpuMs||0,
      terrainCpuMs:frame.terrainCpuMs||0,renderCpuMs:frame.renderCpuMs||0,
      renderMatrixCpuMs:frame.renderMatrixCpuMs||0,
      preRenderCpuMs:frame.preRenderCpuMs||0,
      postRenderCpuMs:frame.postRenderCpuMs||0,
      terrainTextureCpuMs:frame.terrainTextureCpuMs||0,
      waterUpgradeCpuMs:frame.waterUpgradeCpuMs||0,
      gpuMs:Number.isFinite(frame.gpuSample?.ms)?frame.gpuSample.ms:null,
      aiMs:frame.aiMs||0,aiNavMs:frame.aiNavMs||0,
      aiPathMs:frame.aiPathMs||0,aiPathDeferred:frame.aiPathDeferred||0,
      shadowRedrawn:!!frame.shadowRedrawn,drawCalls:frame.drawCalls||0,
      simulationSteps:frame.simulationSteps||0
    }:null;
    for(let i=0;i<rows.length;i++){
      const frame=rows[i],previous=rows[i-1]||null;
      intervalBuckets[classify(frame.frameMs)]++;
      if(Number.isFinite(frame.gpuSample?.ms))gpuValues.push(frame.gpuSample.ms);
      if(Math.abs(frame.frameMs-33.333)<=1.6)slow33.push({frame,previous});
      if(Math.abs(frame.frameMs-16.667)<=1.6)regular.push({frame,previous});
      if(frame.frameMs>=24)
        snapshots.push({intervalMs:frame.frameMs,previous:compactFrame(previous),
          current:compactFrame(frame)});
    }
    snapshots.sort((a,b)=>b.intervalMs-a.intervalMs);
    snapshots.length=Math.min(6,snapshots.length);
    const prevMean=(items,key)=>{
      const valid=items.filter(pair=>pair.previous);
      return valid.length?valid.reduce((sum,pair)=>sum+(pair.previous[key]||0),0)/valid.length:null;
    };
    const gpuMean=gpuValues.length?
      gpuValues.reduce((sum,value)=>sum+value,0)/gpuValues.length:null;
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
      intervalBuckets,slow33Count:slow33.length,
      slow33PrevRenderCpuMs:prevMean(slow33,'renderCpuMs'),
      slow33PrevUpdateCpuMs:prevMean(slow33,'updateCpuMs'),
      normal16PrevRenderCpuMs:prevMean(regular,'renderCpuMs'),
      slow33PrevShadowRedrawRate:slow33.length?
        slow33.filter(p=>p.previous?.shadowRedrawn).length/slow33.length:null,
      slowFrameSamples:snapshots,
      gpuSamples:gpuValues.length,gpuMs:gpuMean,
      gpuP95Ms:gpuValues.length?
        gpuValues.sort((a,b)=>a-b)[Math.ceil(gpuValues.length*.95)-1]:null,
      gpuOverBudget:gpuValues.filter(value=>value>16.67).length,
      updateCpuMs:avg('updateCpuMs'),renderCpuMs:avg('renderCpuMs'),
      renderMatrixCpuMs:avg('renderMatrixCpuMs'),
      renderSubmitCpuMs:Math.max(0,avg('renderCpuMs')-avg('renderMatrixCpuMs')),
      roadVersionCpuMs:avg('roadVersionCpuMs'),roadRefitCpuMs:avg('roadRefitCpuMs'),
      roadVersionChecks:avg('roadVersionChecks'),roadRefits:avg('roadRefits'),
      roadFastSkips:avg('roadFastSkips'),
      postRenderCpuMs:avg('postRenderCpuMs'),terrainCpuMs:avg('terrainCpuMs'),
      preRenderCpuMs:avg('preRenderCpuMs'),
      terrainTextureCpuMs:avg('terrainTextureCpuMs'),
      waterUpgradeCpuMs:avg('waterUpgradeCpuMs'),
      postRenderMaxMs:Math.max(0,...rows.map(r=>r.postRenderCpuMs||0)),
      terrainTextureMaxMs:Math.max(0,...rows.map(r=>r.terrainTextureCpuMs||0)),
      waterUpgradeMaxMs:Math.max(0,...rows.map(r=>r.waterUpgradeCpuMs||0)),
      drawCalls:avg('drawCalls'),triangles:avg('triangles'),
      aiMs:avg('aiMs'),aiNavMs:avg('aiNavMs'),aiSweepMs:avg('aiSweepMs'),
      aiMsP95:rows.map(r=>r.aiMs||0).sort((a,b)=>a-b)[Math.ceil(rows.length*.95)-1],
      aiMsP99:rows.map(r=>r.aiMs||0).sort((a,b)=>a-b)[Math.ceil(rows.length*.99)-1],
      aiNavMsP95:rows.map(r=>r.aiNavMs||0).sort((a,b)=>a-b)[Math.ceil(rows.length*.95)-1],
      aiPathMs:avg('aiPathMs'),aiPathChecks:avg('aiPathChecks'),
      aiPathDeferred:avg('aiPathDeferred'),aiPathNodes:avg('aiPathNodes'),
      aiPassivePathNodes:avg('aiPassivePathNodes'),
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
  // El mode habitual comparteix NOMÉS les dades que poden orientar
  // optimitzacions: els experiments descartats i els inventaris sencers
  // del món queden disponibles exclusivament a l'auditoria avançada.
  function shareReport(report){
    const round=value=>typeof value==='number'&&Number.isFinite(value)
      ?Math.round(value*100)/100:value;
    const pick=(object,keys)=>Object.fromEntries(keys.filter(key=>object?.[key]!==undefined)
      .map(key=>[key,round(object[key])]));
    const ranked=(object,limit=Infinity)=>Object.fromEntries(Object.entries(object||{})
      .filter(([,value])=>typeof value==='number'&&value!==0)
      .sort((a,b)=>b[1]-a[1]).slice(0,limit)
      .map(([key,value])=>[key,round(value)]));
    if(report.mode==='focused'){
      const s=report.phases?.[0]?.stats||{};
      return {
        format:'hunter-perf-share-v1',status:report.status,mode:'focused',
        seed:report.seed,version:report.version||null,quality:report.quality,pixelRatio:report.pixelRatio,
        auditPosition:report.auditPosition,
        phases:[{id:'base-1',name:'Joc normal',stats:{
          ...pick(s,['frames','fps','frameMs','p95FrameMs','p99FrameMs',
            'updateCpuMs','renderCpuMs','renderMatrixCpuMs','renderSubmitCpuMs',
            'preRenderCpuMs','postRenderCpuMs',
            'terrainTextureMaxMs','waterUpgradeMaxMs','postRenderMaxMs',
            'aiMs','aiNavMs','aiSweepMs','aiMsP95','aiMsP99',
            'sweepChecks','sweepSamples','drawCalls','triangles',
            'simulationSteps','slowFrames50','gpuSamples','gpuMs']),
          groups:ranked(s.groups,9),vehicleTypes:ranked(s.vehicleTypes,6),
          otherDetails:ranked(s.otherDetails,6),
          slowFrameSamples:(s.slowFrameSamples||[]).slice(0,3).map(entry=>({
            intervalMs:round(entry.intervalMs),
            previous:entry.previous?pick(entry.previous,
              ['cpuMs','updateCpuMs','renderCpuMs','postRenderCpuMs',
                'waterUpgradeCpuMs','aiMs','simulationSteps']):null,
            current:entry.current?pick(entry.current,
              ['cpuMs','updateCpuMs','renderCpuMs','postRenderCpuMs',
                'waterUpgradeCpuMs','aiMs','simulationSteps']):null
          }))
        }}]
      };
    }
    const metrics=['frames','fps','frameMs','p95FrameMs','p99FrameMs',
      'slowFrames20','frames20to25','frames24to25','slowFrames25','slowFrames50',
      'updateCpuMs','renderCpuMs','renderMatrixCpuMs','renderSubmitCpuMs',
      'roadVersionCpuMs','roadRefitCpuMs',
      'roadVersionChecks','roadRefits','roadFastSkips','postRenderCpuMs',
      'preRenderCpuMs','terrainTextureCpuMs','waterUpgradeCpuMs',
      'postRenderMaxMs','terrainTextureMaxMs','waterUpgradeMaxMs',
      'terrainCpuMs','drawCalls','triangles','aiMs','aiNavMs','aiSweepMs',
      'aiMsP95','aiMsP99','aiNavMsP95','aiPathMs','aiPathChecks',
      'aiPathDeferred','aiPathNodes','aiPassivePathNodes',
      'sweepChecks','sweepSamples','aiUpdated','aiSkipped','simulationSteps',
      'shadowRedrawRate','shadowDrawCalls','unclassifiedDrawCalls',
      'slow33Count','slow33PrevRenderCpuMs','slow33PrevUpdateCpuMs',
      'normal16PrevRenderCpuMs','slow33PrevShadowRedrawRate',
      'gpuSamples','gpuMs','gpuP95Ms','gpuOverBudget',
      'deferredFaunaCasters','boatMotionProxies'];
    return {
      format:'hunter-perf-share-v1',status:report.status,seed:report.seed,
      version:report.version||null,
      quality:report.quality,pixelRatio:report.pixelRatio,
      auditPosition:report.auditPosition,stressPreset:report.stressPreset,
      playerBatchStats:report.playerBatchStats,pathStats:report.pathStats,
      vehicleFleet:Object.fromEntries(Object.entries(report.vehicleFleet||{})
        .map(([type,vehicle])=>[type,pick(vehicle,
          ['count','meshes','savedMeshes','originalMeshes','shadowCasters'])])),
      phases:(report.phases||[]).map((phase,index)=>{
        const s=phase.stats||{};
        return {id:phase.id,name:phase.name,stats:{
          ...pick(s,metrics),intervalBuckets:s.intervalBuckets||{},
          slowFrameSamples:(s.slowFrameSamples||[]).slice(0,4).map(entry=>({
            intervalMs:round(entry.intervalMs),
            previous:entry.previous?pick(entry.previous,
              ['cpuMs','updateCpuMs','renderCpuMs','preRenderCpuMs',
                'postRenderCpuMs','terrainTextureCpuMs','waterUpgradeCpuMs',
                'gpuMs','aiMs','aiPathMs','aiPathDeferred','shadowRedrawn','simulationSteps']):null,
            current:entry.current?pick(entry.current,
              ['cpuMs','updateCpuMs','renderCpuMs','preRenderCpuMs',
                'postRenderCpuMs','terrainTextureCpuMs','waterUpgradeCpuMs',
                'gpuMs','aiMs','aiPathMs','aiPathDeferred','shadowRedrawn','simulationSteps']):null
          })),
          groups:ranked(s.groups),shadowGroups:ranked(s.shadowGroups),
          shadowReasons:s.shadowReasons||{},shadowCulprits:s.shadowCulprits||{},
          vehicleTypes:ranked(s.vehicleTypes),vehicleShadowTypes:ranked(s.vehicleShadowTypes),
          ...(index===0?{vehicleParts:ranked(s.vehicleParts,15),
            otherDetails:ranked(s.otherDetails,15)}:{})
        }};
      }),
      baseline:report.baseline,gpuTimer:report.gpuTimer||null,
      phaseComparisons:report.phaseComparisons||null
    };
  }
  function create({getState,getCameraPose=null,setShadowsDisabled,setWaterDisabled,windowObject=window,
    warmupMs=1100,sampleMs=3000,readyMs=2000,gpuTimer=null,fullAudit=false}){
    const phases=fullAudit?PHASES:[PHASES[0]];
    let status='pending',index=0,phaseElapsed=0,rows=[],origin=null,initialCameraPose=null,
      original=null,results=[],notice='',lastReport=null,readyElapsed=0,ready=false,
      readyPosition=null,cameraMovedFrames=0;
    const doc=windowObject.document;
    const panel=doc.createElement('section');
    panel.id='perfAuditPanel';
    panel.style.cssText='position:fixed;right:10px;top:8px;z-index:16;width:min(360px,calc(100vw - 20px));max-height:70vh;overflow:auto;box-sizing:border-box;padding:12px;border:1px solid #9ccba5;border-radius:9px;background:#102333ee;color:#f2fbef;font:12px/1.5 ui-monospace,monospace;box-shadow:0 2px 16px #0009';
    const label=doc.createElement('div'),details=doc.createElement('pre');
    label.style.cssText='font-weight:bold;margin-bottom:6px';
    details.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font:inherit';
    const start=doc.createElement('button');
    start.type='button';
    start.textContent='Comença l’auditoria';
    start.disabled=true;
    start.style.cssText='display:block;margin:8px 0;padding:9px 12px;font:inherit;cursor:pointer';
    const copy=doc.createElement('button');
    const copyFull=doc.createElement('button');
    const download=doc.createElement('button');
    for(const button of [copy,copyFull,download]){
      button.type='button';
      button.style.cssText='display:none;margin:8px 6px 0 0;padding:7px 10px;font:inherit;cursor:pointer';
    }
    copy.textContent='Copia diagnòstic';
    copyFull.textContent='Copia dades detallades';
    download.textContent='Descarrega dades detallades';
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
    panel.append(label,details,start,copy,copyFull,download);doc.body.append(panel);
    function display(message){
      label.textContent='Auditoria de rendiment · '+(status==='finished'?'finalitzada':status==='aborted'?'interrompuda':'en curs');
      details.textContent=message;
    }
    display('Entra a la partida i situa la càmera. Quan estigui preparada podràs començar manualment l’auditoria.');
    start.onclick=()=>{
      if(status!=='pending'||!ready)return;
      original={...getState()};
      origin={...readyPosition};
      initialCameraPose=null;cameraMovedFrames=0;
      status='running';index=0;phaseElapsed=0;rows=[];
      start.style.display='none';
      apply(phases[index]);
      display(fullAudit?'Fase 1/5: Normal (inici)\nEstabilitzant la càmera abans de mesurar.':
        'Diagnòstic de joc normal\nEstabilitzant la càmera abans de mesurar.');
    };
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
      // Comparisons are correlations, not proof of individual system cost.
      const relative={};
      for(const id of ['no-shadows','no-water','no-both']){
        if(byId[id]&&baseline){
          relative[id]={fpsDelta:byId[id].fps-baseline.fps,
            renderCpuDeltaMs:byId[id].renderCpuMs-
              baselines.reduce((sum,s)=>sum+s.renderCpuMs,0)/baselines.length,
            gpuDeltaMs:byId[id].gpuMs!=null&&baselines.every(s=>s.gpuMs!=null)?
              byId[id].gpuMs-baselines.reduce((sum,s)=>sum+s.gpuMs,0)/baselines.length:null};
        }
      }
      const report={status,mode:fullAudit?'full':'focused',
        seed:original.seed,version:original.version||null,quality:original.quality,
        pixelRatio:original.pixelRatio,
        playerBatchStats:original.playerBatchStats||null,
        pathStats:original.pathStats||null,
        stressPreset:original.stressPreset||null,
        vehicleFleet:original.vehicleFleet||null,
        auditPosition:origin,
        originalShadowsDisabled:original.shadowsDisabled,
        originalWaterDisabled:original.waterDisabled,phases:results,baseline,
        gpuTimer:{status:gpuTimer?.status||'unavailable',
          completed:gpuTimer?.completed||0,disjoint:gpuTimer?.disjoint||0,
          dropped:gpuTimer?.dropped||0},
        phaseComparisons:relative,
        note:'Temps GPU, si disponible: passada WebGL sense VSYNC ni composició. Intervals RAF: temps ENTRE callbacks. Les comparacions no proven causalitat.'};
      lastReport=report;
      windowObject.HUNTER_PERF_AUDIT_RESULTS=report;
      const fmt=n=>Number.isFinite(n)?n.toFixed(1):'n/d';
      if(!fullAudit){
        const normal=byId['base-1'];
        let short='Diagnòstic · joc normal ('+(normal?.frames||0)+' fotogrames)\n';
        short+='FPS '+fmt(normal?.fps)+' · p95 '+fmt(normal?.p95FrameMs)+
          ' ms · p99 '+fmt(normal?.p99FrameMs)+' ms\n';
        short+='CPU joc '+fmt(normal?.updateCpuMs)+' ms · render '+
          fmt(normal?.renderCpuMs)+' ms · IA '+fmt(normal?.aiMs)+' ms\n';
        short+='Navegació '+fmt(normal?.aiNavMs)+' ms · col·lisions '+
          fmt(normal?.aiSweepMs)+' ms\n';
        short+='Dibuixos '+Math.round(normal?.drawCalls||0)+
          ' · triangles '+Math.round(normal?.triangles||0)+'\n';
        short+='Pic postrender '+fmt(normal?.postRenderMaxMs)+' ms'+
          ' (mar '+fmt(normal?.waterUpgradeMaxMs)+
          ', textura '+fmt(normal?.terrainTextureMaxMs)+')\n';
        short+='Draw calls: '+
          Object.entries(normal?.groups||{}).sort((a,b)=>b[1]-a[1])
            .slice(0,6).map(([k,n])=>k+' '+Math.round(n)).join(', ');
        display(short);
        for(const button of [copy,copyFull,download])
          button.style.display='inline-block';
        windowObject.console.info('[HUNTER] Diagnòstic de rendiment',report);
        return;
      }
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
      message+='\\nGPU WebGL: '+(gpuTimer?.status||'no disponible')+
        ', mostres '+(gpuTimer?.completed||0)+'\\n';
      message+='Intervals de refresc (normal): '+
        JSON.stringify(initial?.intervalBuckets||{})+'\\n';
      message+='Salts ~33 ms: '+(initial?.slow33Count||0)+
        '; render CPU del fotograma anterior '+
        fmt(initial?.slow33PrevRenderCpuMs)+' ms\\n';
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
        if(!frame.active){
          readyElapsed=0;ready=false;readyPosition=null;
          start.disabled=true;return;
        }
        if(frame.frameMs>0&&frame.frameMs<=200)readyElapsed+=frame.frameMs;
        readyPosition={x:frame.x,z:frame.z};
        if(!ready&&readyElapsed>=readyMs){
          ready=true;start.disabled=false;
          display('Partida preparada. Col·loca la càmera i prem «Comença l’auditoria» quan la vista sigui estable.');
        }
        return;
      }
      if(!frame.active){abort('La partida s’ha pausat, ocultat o acabat.');return}
      if(Math.hypot(frame.x-origin.x,frame.z-origin.z)>4){
        abort('El personatge s’ha mogut més de 4 m: la comparació no és fiable.');return;
      }
      if(!(frame.frameMs>0&&frame.frameMs<=200))return;
      // La vista segueix interpolant durant el primer escalfament.
      // Fixam la referència després, no en el primer fotograma actiu.
      if(index===0&&phaseElapsed<warmupMs){
        phaseElapsed+=frame.frameMs;
        if(phaseElapsed>=warmupMs)initialCameraPose=getCameraPose?.()||null;
        return;
      }
      if(initialCameraPose&&getCameraPose){
        const pose=getCameraPose();
        const dot=pose?.reduce((sum,value,i)=>sum+value*initialCameraPose[i],0);
        // Diferència de més de ~7° durant 3 fotogrames consecutius.
        // Això evita falsos positius per petits ajustos de seguiment.
        if(Number.isFinite(dot)&&Math.abs(dot)<.998)cameraMovedFrames++;
        else cameraMovedFrames=0;
        if(cameraMovedFrames>=3){
          abort('La càmera ha girat clarament durant la mesura. Repeteix-la mantenint la vista fixa.');return;
        }
      }
      phaseElapsed+=frame.frameMs;
      if(phaseElapsed>warmupMs)rows.push(frame);
      if(phaseElapsed<warmupMs+sampleMs)return;
      const phase=phases[index];
      results.push({id:phase.id,name:phase.name,stats:summary(rows)});
      index++;
      if(index>=phases.length){finish();return}
      phaseElapsed=0;rows=[];
      apply(phases[index]);
      display('Fase '+(index+1)+'/'+phases.length+': '+phases[index].name+
        '\nMesuram render, joc, IA i dibuixos. No moguis el personatge.');
    }
    return {onFrame,abort,get status(){return status},get ready(){return ready},get results(){return results}};
  }
  window.HUNTER_PERFORMANCE_AUDIT=Object.freeze({create,summary,shareReport,createGpuTimer,PHASES});
})();
