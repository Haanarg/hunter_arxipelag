import * as compoundPaths from './compound-paths.mjs?v=0.5.104';
window.HUNTER_COMPOUND_PATHS=compoundPaths;
import {runtimeLayouts,chooseCompoundLayout} from './compound-runtime-layouts.mjs?v=0.5.104';
import * as compoundArchitecture from './compound-architecture.mjs?v=0.5.104';
window.HUNTER_RUNTIME_LAYOUTS=runtimeLayouts;window.HUNTER_CHOOSE_COMPOUND=chooseCompoundLayout;window.HUNTER_COMPOUND_ARCHITECTURE=compoundArchitecture;
import {createCompoundStructures} from './compound-structures.mjs';
window.HUNTER_COMPOUND_STRUCTURES=createCompoundStructures;
import {runtimeScripts} from './runtime-scripts.mjs';
import {RUNTIME_BUNDLE_PATH} from './runtime-bundle.mjs?v=0.5.104';
import {compoundLayouts} from './compound-layouts.mjs';
window.HUNTER_COMPOUND_LAYOUTS=compoundLayouts;
import {GAME_VERSION} from './version.mjs?v=0.5.104';
import {createTruckModel} from './truck-model.mjs';
import {createCivilianCarModel} from './civilian-car-model.mjs';
window.HUNTER_CIVIL_C1A=createCivilianCarModel;
// Mateixa geometria A4.3 que es mostra a camio-proves.html.
window.HUNTER_TRUCK_CONCEPT=createTruckModel;
import * as rockFields from './rock-fields.mjs';
window.HUNTER_ROCK_FIELDS=rockFields;

const versionBadge=document.getElementById('versionBadge');
if(versionBadge)versionBadge.textContent='v'+GAME_VERSION;
window.HUNTER_VERSION=GAME_VERSION;

// Tres perfils; "Alts" és el predeterminat en qualsevol dispositiu.
// Es respecten sempre la selecció explícita i el paràmetre llegat low.
const graphicsQuality=document.getElementById('graphicsQuality');
const params=new URLSearchParams(location.search);
const requestedQuality=params.get('quality');
const legacyLow=params.get('low')==='1';
const validQualities=['desktop','mobile','ultra'];
const quality=validQualities.includes(requestedQuality)?requestedQuality:
  legacyLow?'mobile':'desktop';
window.HUNTER_GRAPHICS_QUALITY=quality;
window.HUNTER_FORCE_LOW_QUALITY=quality!=='desktop';
if(graphicsQuality){
  graphicsQuality.value=quality;
  graphicsQuality.addEventListener('change',()=>{
    const url=new URL(location.href);
    const selected=validQualities.includes(graphicsQuality.value)?
      graphicsQuality.value:'mobile';
    url.searchParams.delete('low');
    url.searchParams.set('quality',selected);
    // El renderer i els shaders canvien només amb una recàrrega;
    // mai no es redimensionen els buffers durant la partida.
    location.replace(url.toString());
  });
}

// Pont temporal: motor ESM i sistemes clàssics carregats seqüencialment.
try {
  const THREE = await import('../vendor/three-r186.module.mjs');
  THREE.ColorManagement.enabled = true;
  window.THREE = THREE;
  // El model D3.1 del cotxe militar és ara la versió procedural B.
  // La malla, normals, UV i textura es creen a partir de dades JavaScript
  // una sola vegada; no es demana cap GLB durant la partida.
  // Les dades procedurals són la font del model; els GLB s’han retirat.
  // Si les dades no es poden preparar, mantenim la geometria clàssica
  // de reserva per no impedir l'inici de la partida.
  try {
    const {prepareHumveeD31Runtime}=await import('./humvee-d31-runtime.mjs?v=0.5.104');
    window.HUNTER_HUMVEE_D31=await prepareHumveeD31Runtime(THREE,{vehicleScale:1.3});
    console.info('Humvee D3.1 procedural B · 175% carregat al joc',
      window.HUNTER_HUMVEE_D31.dimensions);
  } catch (humveeError) {
    window.HUNTER_HUMVEE_D31=null;
    console.warn('No es pot preparar el Humvee B; geometria clàssica de reserva',humveeError);
  }
  // El bundle inclou els scripts clàssics en el mateix ordre i preserva
  // les variables globals de la versió anterior. Només fem UNA petició.
  // Si el fitxer empaquetat no s'ha desplegat, recuperem el loader antic.
  const loadClassic=(path,versioned=false)=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.async=false;
    const url=new URL('../'+path,import.meta.url);
    if(versioned)url.searchParams.set('v',GAME_VERSION);
    script.src=url.href;
    const cleanup=()=>window.removeEventListener('error',onError);
    const onError=event=>{
      if(event.filename===script.src){cleanup();const error=event.error||new Error(event.message);error.runtimeExecution=true;reject(error)}
    };
    window.addEventListener('error',onError);
    script.onload=()=>{cleanup();resolve()};
    script.onerror=()=>{cleanup();reject(new Error('No es pot carregar '+path))};
    document.head.append(script);
  });
  const loadLegacy=async()=>{for(const path of runtimeScripts)await loadClassic(path,true)};
  const useBundle=params.get('runtime')!=='source'&&params.get('perfAudit')!=='1';
  let runtimeMode='source';
  if(useBundle&&RUNTIME_BUNDLE_PATH){
    try{await loadClassic(RUNTIME_BUNDLE_PATH);runtimeMode='bundle'}
    catch(error){
      // Un paquet parcialment executat no és segur de carregar una segona
      // vegada damunt els mateixos globals. Recarregam una pàgina neta.
      const fallback=new URL(location.href);
      fallback.searchParams.set('runtime','source');
      console.warn('Error amb el runtime agrupat; recarregant els scripts originals',error);
      location.replace(fallback.toString());
      throw error;
    }
  }else await loadLegacy();
  window.HUNTER_RUNTIME_MODE=runtimeMode;
  window.HUNTER_READY = true;
} catch (error) {
  console.error('No s’ha pogut iniciar Húnter', error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.style.cssText = 'position:fixed;inset:20%;z-index:999;background:#172b36;color:white;padding:24px';
  // Mostrar l'error real: un problema del runtime no és un error de WebGL.
  message.style.cssText += ';inset:15%;overflow:auto;font:16px/1.45 system-ui;white-space:pre-wrap';
  message.textContent = 'Error en iniciar Húnter (v'+GAME_VERSION+').\n'+
    (error?.name||'Error')+': '+(error?.message||'Causa desconeguda')+`\n\nSi persisteix, envia una captura d’aquest missatge.`;
  document.body.append(message);
}
