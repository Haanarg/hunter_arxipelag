import {createCompoundStructures} from './compound-structures.mjs';
window.HUNTER_COMPOUND_STRUCTURES=createCompoundStructures;
import {runtimeScripts} from './runtime-scripts.mjs';
import {compoundLayouts} from './compound-layouts.mjs';
window.HUNTER_COMPOUND_LAYOUTS=compoundLayouts;
import {GAME_VERSION} from './version.mjs';

const versionBadge=document.getElementById('versionBadge');
if(versionBadge)versionBadge.textContent='v'+GAME_VERSION;
window.HUNTER_VERSION=GAME_VERSION;

// Tres perfils. En mòbil seleccionem "Reduïts" per defecte,
// però el jugador pot escollir "Mínims" o "Alts" a la portada.
const graphicsQuality=document.getElementById('graphicsQuality');
const coarsePointer=matchMedia('(pointer:coarse)').matches;
const params=new URLSearchParams(location.search);
const requestedQuality=params.get('quality');
const legacyLow=params.get('low')==='1';
const validQualities=['desktop','mobile','ultra'];
const quality=validQualities.includes(requestedQuality)?requestedQuality:
  legacyLow?'mobile':coarsePointer?'mobile':'desktop';
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
  // Les descàrregues comencen alhora, però async=false obliga els scripts
  // clàssics afegits dinàmicament a EXECUTAR-SE en l'ordre de runtimeScripts.
  // Això redueix la latència de xarxa sense trencar les dependències globals.
  await Promise.all(runtimeScripts.map(path => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = false;
    const scriptUrl = new URL('../' + path, import.meta.url);
    scriptUrl.searchParams.set('v', GAME_VERSION);
    script.src = scriptUrl.href;
    const cleanup = () => window.removeEventListener('error', onError);
    const onError = event => {
      if (event.filename === script.src) {
        cleanup();
        reject(event.error || new Error(event.message));
      }
    };
    window.addEventListener('error', onError);
    script.onload = () => { cleanup(); resolve(); };
    script.onerror = () => { cleanup(); reject(new Error('No es pot carregar ' + path)); };
    document.head.append(script);
  })));
  window.HUNTER_READY = true;
} catch (error) {
  console.error('No s’ha pogut iniciar Húnter', error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.style.cssText = 'position:fixed;inset:20%;z-index:999;background:#172b36;color:white;padding:24px';
  message.textContent = 'No s’ha pogut iniciar el joc. Cal un navegador amb WebGL 2 i obrir el joc des d’un servidor HTTP. Recarrega la pàgina o prova un navegador actualitzat.';
  document.body.append(message);
}
