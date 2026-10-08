import {runtimeScripts} from './runtime-scripts.mjs';
import {GAME_VERSION} from './version.mjs';

const versionBadge=document.getElementById('versionBadge');
if(versionBadge)versionBadge.textContent='v'+GAME_VERSION;
window.HUNTER_VERSION=GAME_VERSION;

const lowGraphics=document.getElementById('lowGraphics');
const coarsePointer=matchMedia('(pointer:coarse)').matches;
const lowParam=new URLSearchParams(location.search).get('low')==='1';
window.HUNTER_FORCE_LOW_QUALITY=lowParam;
if(lowGraphics){
  lowGraphics.checked=coarsePointer||lowParam;
  lowGraphics.disabled=coarsePointer;
  lowGraphics.title=coarsePointer?'El perfil reduït ja s’utilitza automàticament en aquest dispositiu.':'Força el mateix perfil gràfic reduït que Android.';
  lowGraphics.addEventListener('change',()=>{
    const url=new URL(location.href);
    if(lowGraphics.checked)url.searchParams.set('low','1');else url.searchParams.delete('low');
    location.replace(url.toString());
  });
}

// Pont temporal: motor ESM i sistemes clàssics carregats seqüencialment.
try {
  const THREE = await import('../vendor/three-r186.module.mjs');
  THREE.ColorManagement.enabled = true;
  window.THREE = THREE;
  for (const path of runtimeScripts) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      // Codi dels sistemes sincronitzat amb la versió del joc,
      // evitant que la memòria cau conservi geometries obsoletes.
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
    });
  }
} catch (error) {
  console.error('No s’ha pogut iniciar Húnter', error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.style.cssText = 'position:fixed;inset:20%;z-index:999;background:#172b36;color:white;padding:24px';
  message.textContent = 'No s’ha pogut iniciar el joc. Cal un navegador amb WebGL 2 i obrir el joc des d’un servidor HTTP. Recarrega la pàgina o prova un navegador actualitzat.';
  document.body.append(message);
}
