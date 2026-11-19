// Arrencada independent del HUD de diagnòstic: s'executa ABANS del motor
// del joc, fins i tot quan falla algun import ESM, el WebGL o la generació.
(()=>{
 'use strict';
 const params=new URLSearchParams(location.search);
 if(params.get('avatarAudit')!=='1')return;
 const panel=document.createElement('aside');
 panel.id='hunterAvatarAudit';
 panel.setAttribute('aria-label','Diagnòstic del protagonista V18');
 panel.style.cssText='position:fixed!important;z-index:2147483647!important;'+
   'top:max(7px,env(safe-area-inset-top));right:max(7px,env(safe-area-inset-right));'+
   'box-sizing:border-box;width:min(365px,calc(100vw - 14px));'+
   'max-height:65vh;overflow:auto;padding:10px;'+
   'border:2px solid #d5e3ac;border-radius:8px;'+
   'box-shadow:0 4px 20px #000c;background:#071620f2;color:#e3f8ef;'+
   'font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;'+
   'pointer-events:auto!important';
 const title=document.createElement('strong');
 title.textContent='DIAGNÒSTIC V18 · 0.6.248';
 const readout=document.createElement('pre');
 readout.id='hunterAvatarAuditReadout';
 readout.style.cssText='margin:8px 0;white-space:pre-wrap;word-break:break-word;font:inherit';
 readout.textContent='Panell inicialitzat abans de Three.js.\nCarregant la portada…';
 const button=document.createElement('button');
 button.type='button';
 button.textContent='PROVA FORÇADA V18: DESACTIVADA';
 button.style.cssText='padding:8px 10px;background:#d5e3ac;color:#101d14;'+
   'font:700 12px system-ui;border:0;border-radius:5px;cursor:pointer';
 const audit={enabled:true,forced:false,error:'',panel,readout,
   paint(message){readout.textContent=message+(audit.error?'\nERROR: '+audit.error:'')},
   fail(error){audit.error=String(error).slice(0,700);audit.paint(readout.textContent)}};
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
})();
