import {GAME_VERSION} from './version.mjs';

// La portada no carrega Three.js, WebGL, el món ni una llavor de fons.
// Una imatge estàtica renderitzada amb la llavor 67 és suficient.
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
const validQualities = ['desktop','mobile','ultra'];
const requested = params.get('quality');
const initialQuality=validQualities.includes(requested)?requested:
  params.get('low')==='1'||matchMedia('(pointer:coarse)').matches?'mobile':'desktop';
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
  // Els fitxers clàssics encara s'executaran EN ORDRE quan bootstrap els insereixi.
  import('./runtime-scripts.mjs').then(({runtimeScripts})=>{
    for(const path of runtimeScripts){
      const url=new URL('../'+path,import.meta.url);
      url.searchParams.set('v',GAME_VERSION);
      const link=document.createElement('link');
      link.rel='preload';link.as='script';link.href=url.href;
      link.fetchPriority='low';
      document.head.appendChild(link);
    }
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
  if(!bootPromise)bootPromise=import('./bootstrap.mjs').then(()=>{
    if(!window.HUNTER_READY)throw new Error('El motor 3D no ha acabat de carregar');
  }).catch(error=>{bootPromise=null;throw error});
  return bootPromise;
}
function intercept(button,message){
  button.addEventListener('click',async event=>{
    if(window.HUNTER_READY)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(requestPending)return;
    requestPending=true;
    showLoading(message);
    try{
      await loadGame();
      // Una oportunitat real de pintar el missatge abans de la generació síncrona.
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      if(button.dataset.d)showLoading('Generant el món…');
      button.click(); // Deleguem al gestor original, instal·lat per game-core.js.
      if(button.dataset.d)loadingLabel.style.display='none';
    }catch(error){
      console.error('No es pot carregar el motor Hunter',error);
      showLoading('Error de càrrega. Torna a prémer per reintentar-ho.');
    }finally{requestPending=false}
  },true);
}
for(const button of menu.querySelectorAll('button[data-d]'))
  intercept(button,'Carregant el motor 3D…');
intercept(document.getElementById('seedSearchOpen'),'Carregant el cercador de llavors…');
// Per a proves i generació automàtica de captures; el menú normal és diferit.
if(params.get('eager')==='1')loadGame().catch(error=>console.error('Error en mode eager',error));
