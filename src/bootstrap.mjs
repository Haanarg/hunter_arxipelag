import {runtimeScripts} from './runtime-scripts.mjs';
import {GAME_VERSION} from './version.mjs';

const versionBadge=document.getElementById('versionBadge');
if(versionBadge)versionBadge.textContent='v'+GAME_VERSION;
window.HUNTER_VERSION=GAME_VERSION;

// Pont temporal: motor ESM i sistemes clàssics carregats seqüencialment.
try {
  const THREE = await import('../vendor/three-r186.module.mjs');
  THREE.ColorManagement.enabled = true;
  window.THREE = THREE;
  for (const path of runtimeScripts) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('../' + path, import.meta.url).href;
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
