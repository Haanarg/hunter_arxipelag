import * as compoundPaths from './compound-paths.mjs';
window.HUNTER_COMPOUND_PATHS=compoundPaths;
import {runtimeLayouts,chooseCompoundLayout} from './compound-runtime-layouts.mjs';
import * as compoundArchitecture from './compound-architecture.mjs';
window.HUNTER_RUNTIME_LAYOUTS=runtimeLayouts;window.HUNTER_CHOOSE_COMPOUND=chooseCompoundLayout;window.HUNTER_COMPOUND_ARCHITECTURE=compoundArchitecture;
import {createCompoundStructures} from './compound-structures.mjs';
window.HUNTER_COMPOUND_STRUCTURES=createCompoundStructures;
import {runtimeScripts} from './runtime-scripts.mjs';
import {RUNTIME_BUNDLE_PATH} from './runtime-bundle.mjs';
import {compoundLayouts} from './compound-layouts.mjs';
window.HUNTER_COMPOUND_LAYOUTS=compoundLayouts;
import {GAME_VERSION} from './version.mjs?v=0.5.70';
import {createTruckConcept} from './truck-concepts.mjs';
import {createFamilyC1Iteration} from './civilian-car-c1-iterations.mjs';
window.HUNTER_CIVIL_C1A=createFamilyC1Iteration;
// Mateixa geometria A4.3 que es mostra a camio-proves.html.
window.HUNTER_TRUCK_CONCEPT=createTruckConcept;
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
  // El model militar definitiu es prepara una vegada abans de generar el món.
  // No fem servir cap loader extern: el GLB/atles D3.1 es llegeix del joc.
  // Si falla la càrrega (p. ex. fitxer incomplet durant un desplegament),
  // el vehicle recupera temporalment la geometria anterior sense aturar el joc.
  try {
    const {prepareHumveeD31Runtime}=await import('./humvee-d31-runtime.mjs?v=0.5.70');
    window.HUNTER_HUMVEE_D31=await prepareHumveeD31Runtime(THREE,{vehicleScale:1.3});
    console.info('Humvee D3.1 a escala 175% carregat al joc',
      window.HUNTER_HUMVEE_D31.dimensions);
  } catch (humveeError) {
    window.HUNTER_HUMVEE_D31=null;
    console.warn('No es pot preparar el Humvee D3.1; geometria anterior de reserva',humveeError);
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
      if(event.filename===script.src){cleanup();reject(event.error||new Error(event.message))}
    };
    window.addEventListener('error',onError);
    script.onload=()=>{cleanup();resolve()};
    script.onerror=()=>{cleanup();reject(new Error('No es pot carregar '+path))};
    document.head.append(script);
  });
  const loadLegacy=async()=>{for(const path of runtimeScripts)await loadClassic(path,true)};
  const useBundle=params.get('runtime')==='bundle';
  if(useBundle&&RUNTIME_BUNDLE_PATH){
    try{await loadClassic(RUNTIME_BUNDLE_PATH)}
    catch(error){
      console.warn('Paquet runtime no disponible; recuperant scripts individuals',error);
      await loadLegacy();
    }
  }else await loadLegacy();
  window.HUNTER_RUNTIME_MODE=useBundle?'bundle':'source';
  window.HUNTER_READY = true;
} catch (error) {
  console.error('No s’ha pogut iniciar Húnter', error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.style.cssText = 'position:fixed;inset:20%;z-index:999;background:#172b36;color:white;padding:24px';
  message.textContent = 'No s’ha pogut iniciar el joc. Cal un navegador amb WebGL 2 i obrir el joc des d’un servidor HTTP. Recarrega la pàgina o prova un navegador actualitzat.';
  document.body.append(message);
}
