import './menu-main-integration.mjs?menu=direct-html-v1';
import {GAME_VERSION} from './version.mjs?v=0.6.129';
import {RUNTIME_BUNDLE_PATH} from './runtime-bundle.mjs?v=0.6.127&visual=8&glassfix=2&smooth=13&friendlyCover=1&rifleCone80=1&bazookaShoulder=1';

// La portada reutilitza els controls reals i un renderitzat Three.js independent.
// El canvas del fons s'allibera abans d'arrencar el motor de la partida.
window.HUNTER_MENU_READY = true;
const menu = document.getElementById('ini');
const loadingLabel = document.getElementById('startLoading');
const qualitySelect = document.getElementById('graphicsQuality');
const seedRandom = document.getElementById('seedRandom');
const seedInput = document.getElementById('seedInput');
const performanceOpen=document.getElementById('performanceMenuOpen'),
      performanceBack=document.getElementById('performanceMenuBack'),
      performanceScreen=document.getElementById('performanceScreen'),
      startMenu=document.getElementById('startMenu');
performanceOpen.addEventListener('click',()=>{
  startMenu.style.display='none';
  performanceScreen.style.display='block';
  performanceScreen.setAttribute('aria-hidden','false');
});
performanceBack.addEventListener('click',()=>{
  performanceScreen.style.display='none';
  performanceScreen.setAttribute('aria-hidden','true');
  startMenu.style.display='flex';
});
const badge = document.getElementById('versionBadge');
if(badge)badge.textContent='v'+GAME_VERSION;

const params = new URLSearchParams(location.search);
const stressAuditRequested=params.get('perfAudit')==='1'&&params.get('stress')==='1';
if(stressAuditRequested){
  // La prova no depèn de la llavor aleatòria ni d'una elecció del menú.
  seedRandom.checked=false;seedInput.value='2407759483';seedInput.disabled=true;
  seedInput.title='Prova d’estrès: llavor 2407759483, X=1208, Z=-1594';
  const smallMap=document.querySelector('input[name="mapSize"][value="1"]');
  if(smallMap)smallMap.checked=true;
}
const validQualities = ['desktop','mobile','ultra'];
const requested = params.get('quality');
// Gràfics Alts per defecte també en dispositius tàctils.
const initialQuality=stressAuditRequested?'desktop':
  validQualities.includes(requested)?requested:
  params.get('low')==='1'?'mobile':'desktop';
qualitySelect.value=initialQuality;
qualitySelect.addEventListener('change',()=>{
  if(window.HUNTER_READY)return; // bootstrap.mjs és el responsable a partir d'aquí.
  const selected=validQualities.includes(qualitySelect.value)?qualitySelect.value:'mobile';
  const url=new URL(location.href);
  url.searchParams.delete('low');
  url.searchParams.set('quality',selected);
  location.replace(url.toString());
});
seedRandom.addEventListener('change',()=>{
  if(!window.HUNTER_READY){
    seedInput.disabled=seedRandom.checked;
    if(!seedRandom.checked)seedInput.focus();
  }
});
// Precarrega els recursos de xarxa mentre el menú continua interactiu.
 // No executa el motor ni crea WebGL: només importa Three.js i demana els scripts.
 // L'arrencada real continua sota el control de loadGame().
let bootPreloadStarted=false;
function preloadEngine(){
  if(bootPreloadStarted||window.HUNTER_READY)return;
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  if(connection?.saveData||/^(slow-2g|2g)$/.test(connection?.effectiveType||''))return;
  bootPreloadStarted=true;
  import('../vendor/three-r186.module.mjs').catch(error=>{
    console.info('Three.js es carregarà en prémer Comença',error);
  });
  const preloadScript=(path,versioned=false)=>{
    const url=new URL('../'+path,import.meta.url);
    if(versioned)url.searchParams.set('v',GAME_VERSION);
    const link=document.createElement('link');
    link.rel='preload';link.as='script';link.href=url.href;
    link.fetchPriority='low';
    document.head.appendChild(link);
  };
  if(params.get('runtime')!=='source'&&params.get('perfAudit')!=='1'&&RUNTIME_BUNDLE_PATH)preloadScript(RUNTIME_BUNDLE_PATH);
  else import('./runtime-scripts.mjs').then(({runtimeScripts})=>{
    // Desenvolupament: precàrrega dels scripts font, sense compilar.
    for(const path of runtimeScripts)preloadScript(path,true);
  }).catch(error=>console.info('Precarrega opcional no disponible',error));
}
if(params.get('eager')!=='1'){
  if(typeof requestIdleCallback==='function')
    requestIdleCallback(preloadEngine,{timeout:1500});
  else setTimeout(preloadEngine,450);
}
let bootPromise=null,requestPending=false;
const showLoading=(message)=>{
  loadingLabel.textContent=message;
  loadingLabel.style.display='block';
};
function loadGame(){
  if(window.HUNTER_READY)return Promise.resolve();
  if(!bootPromise){
    window.HUNTER_MENU_BACKGROUND_STOPPED=true;
    // Alliberam completament l'iframe i el seu context WebGL abans
    // d'importar el runtime. També impedeix feina de fons durant el coop.
    const background=document.getElementById('menuWorldVista');
    if(background){
      background.replaceChildren();
      background.hidden=true;
    }
    window.dispatchEvent(new Event('hunter:menu-background-stop'));
    bootPromise=import('./bootstrap.mjs?v=0.6.129&visual=8&glassfix=2&smooth=13&friendlyCover=1&rifleCone80=1&bazookaShoulder=1').then(()=>{
    if(!window.HUNTER_READY)throw new Error('El motor 3D no ha acabat de carregar');
  }).catch(error=>{bootPromise=null;throw error});
  }
  return bootPromise;
}
// A delayed import can outlive transient user activation. Unlock an empty
// context in the real difficulty click, without synthesising sound or using RNG.
function primeAudioGesture(){
  try{
    let context=window.HUNTER_PRIMED_AUDIO_CONTEXT;
    if(!context||context.state==='closed'){
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)return;
      context=window.HUNTER_PRIMED_AUDIO_CONTEXT=new AudioContext();
    }
    Promise.resolve(context.resume()).catch(()=>{});
  }catch(error){} // Audio is optional; generation must still be retryable.
}
function intercept(button,message){
  button.addEventListener('click',async event=>{
    // READY may become true while the first click still awaits the paint
    // handoff. Keep ownership of that request until its real Promise settles.
    if(requestPending){event.preventDefault();event.stopImmediatePropagation();return}
    if(button.dataset.d)primeAudioGesture();
    if(window.HUNTER_READY)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(requestPending)return;
    requestPending=true;
    const startupStart=performance.now();
    showLoading(message);
    try{
      await loadGame();
      const engineMs=performance.now()-startupStart;
      if(button.dataset.d)showLoading('Generant el món…');
      // Paint the engine/world handoff; world generation has its own real
      // cooperative scheduler and loading surface after this frame.
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const worldStart=performance.now();
      // HTMLElement.click() discards the handler's Promise. Await the actual
      // runtime handler so loading/timings also include the final world chunk.
      if(typeof button.onclick!=='function')throw new Error('Falta el gestor d’inici');
      await button.onclick.call(button);
      if(button.dataset.d){
        loadingLabel.style.display='none';
        window.HUNTER_STARTUP_TIMINGS={
          engineMs,worldMs:performance.now()-worldStart,
          totalMs:performance.now()-startupStart,preloaded:bootPreloadStarted
        };
        console.info('Hunter · arrencada',window.HUNTER_STARTUP_TIMINGS);
      }
    }catch(error){
      if(error.name!=='AbortError'){
        console.error('No es pot carregar el motor Hunter',error);
        showLoading('Error de càrrega. Torna a prémer per reintentar-ho.');
      }
    }finally{requestPending=false}
  },true);
}
for(const button of menu.querySelectorAll('button[data-d]'))
  intercept(button,'Carregant el motor 3D…');
intercept(document.getElementById('historyOpen'),'Carregant l’historial…');
intercept(document.getElementById('accountOpen'),'Carregant el compte…');
intercept(document.getElementById('operationsOpen'),'Carregant les operacions…');
intercept(document.getElementById('seedSearchOpen'),'Carregant el cercador de llavors…');
// Per a proves i generació automàtica de captures; el menú normal és diferit.
if(params.get('eager')==='1')loadGame().catch(error=>console.error('Error en mode eager',error));



intercept(document.getElementById('coopOpen'),'Carregant la sala…');


