// El HUD de diagnòstic viu a la portada: no depèn de WebGL,
 // game-core, càrregues ESM ni del bucle de render del joc.
(()=>{
 'use strict';
 const params=new URLSearchParams(location.search);
 if(params.get('avatarAudit')!=='1')return;
 const panel=document.createElement('aside');
 panel.id='hunterAvatarAudit';
 panel.setAttribute('aria-label','Diagnòstic del protagonista V18');
 panel.style.cssText='position:fixed!important;z-index:2147483647!important;'+
   'top:max(7px,env(safe-area-inset-top));right:max(7px,env(safe-area-inset-right));'+
   'box-sizing:border-box;width:min(410px,calc(100vw - 14px));'+
   'max-height:70vh;overflow:auto;padding:10px;'+
   'border:2px solid #d5e3ac;border-radius:8px;'+
   'box-shadow:0 4px 20px #000c;background:#071620f2;color:#e3f8ef;'+
   'font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;'+
   'pointer-events:auto!important';
 const title=document.createElement('strong');
 title.textContent='DIAGNÒSTIC V18 · 0.6.251';
 const readout=document.createElement('pre');
 readout.id='hunterAvatarAuditReadout';
 readout.style.cssText='margin:8px 0;white-space:pre-wrap;word-break:break-word;font:inherit';
 readout.textContent='Arrencant el diagnòstic independent…';
 const button=document.createElement('button');
 button.type='button';
 button.textContent='PROVA FORÇADA V18: DESACTIVADA';
 button.style.cssText='padding:8px 10px;background:#d5e3ac;color:#101d14;'+
   'font:700 12px system-ui;border:0;border-radius:5px;cursor:pointer';
 const audit={
   enabled:true,forced:false,error:'',panel,readout,probe:null,stage:'PORTADA',
   paint(message){audit.stage=String(message)},
   attach(probe){audit.probe=probe;audit.stage='SONDA DE PARTIDA CONNECTADA'},
   fail(error){audit.error=String(error).slice(0,700)}
 };
 button.onclick=()=>{
   audit.forced=!audit.forced;
   button.textContent='PROVA FORÇADA V18: '+(audit.forced?'ACTIVADA':'DESACTIVADA');
 };
 panel.append(title,readout,button);
 window.HUNTER_AVATAR_AUDIT=audit;
 document.body.append(panel);
 window.addEventListener('error',event=>{
   if(event.message)audit.fail(event.message+' ('+
     (event.filename||'').split('/').pop()+':'+(event.lineno||'?')+')');
 });
 window.addEventListener('unhandledrejection',event=>{
   audit.fail('Rebuig no gestionat: '+(event.reason?.stack||event.reason));
 });
 // Rellotge PROPI del HUD. No utilitza la mateixa callback de la
 // simulació que podria estar desactualitzada, fallar o no existir.
 let previousReport=-Infinity;
 function report(time){
  if(time-previousReport>=250){
   previousReport=time;
   try{
    const ready=window.HUNTER_READY===true;
    const mode=window.HUNTER_RUNTIME_MODE||'no registrat';
    const probe=audit.probe;
    let lines=['Càrrega real: '+(ready?'PREPARADA':'en curs')+
      ' · runtime: '+mode,
      'Versió motor: '+(window.HUNTER_VERSION||'no registrada')];
    if(!probe){
     lines.push('Sonda del joc: NO CONNECTADA');
     if(ready)lines.push('ALERTA: el motor juga però game-core no ha\nconnectat la sonda V18. Comprova caché/bundle.');
     else lines.push('Etapa: '+audit.stage);
     if(audit.forced)lines.push('PROVA FORÇADA pendent: falta la sonda');
    }else{
     const pl=probe.player,u=pl?.userData||{};
     const visual=u.humanGameCanonicalRig,j=u.humanGameCanonicalJoints;
     let meshCount=0,casters=0;
     visual?.traverse?.(o=>{
      if(o.isMesh){meshCount++;if(o.castShadow)casters++}
     });
     const angle=id=>j?.[id]?.rotation?.x?.toFixed?.(2)??'ABSENT';
     const n=value=>Number(value||0).toFixed(2);
     const state=probe.state?.()||{};
     const shadow=probe.shadow?.()||{};
     lines.push('Sonda del joc: CONNECTADA · RAF: '+(state.frames??'?'),
       'Partida: '+!!state.started+' · pausa: '+!!state.paused+
         ' · gràfics: '+(probe.quality||'?'),
       'V18: '+!!visual+' · pose(): '+typeof u.humanGamePose+
         ' · crides: '+(state.poseCalls??'?'),
       'Model visible: '+!!(pl?.visible&&visual?.visible)+
         ' · malles: '+meshCount+' · casters: '+casters,
       'Caminar: '+n(u.gameLandMove)+' · fase: '+n(u.ph)+
         ' · córrer: '+n(u.runBlend),
       'Aigua: '+!!state.swimming+' · estil: '+(u.gameSwimStyle||'absent')+
         ' · pes: '+n(u.gameSwimBlend),
       'Malucs L/R: '+angle('hipL')+' / '+angle('hipR')+
         ' · espatlla R: '+angle('shoulderR'),
       'Ombres: mapa='+!!shadow.enabled+' sol='+!!shadow.sun+
         ' desactivades='+!!shadow.disabled,
       'Seleccionades V18: '+(shadow.playerCasters??'?')+
         ' · actives: '+(shadow.active??'?'));
     lines.push('Prova forçada: '+(audit.forced?'ACTIVADA':'desactivada')+
       (audit.forced&&!visual?' (V18 ABSENT)':''));
    }
    if(audit.error)lines.push('ERROR: '+audit.error);
    readout.textContent=lines.join('\n');
   }catch(error){
    readout.textContent='ERROR DE DIAGNÒSTIC: '+(error?.stack||error);
   }
  }
  requestAnimationFrame(report);
 }
 requestAnimationFrame(report);
})();
