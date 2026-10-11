import {GAME_VERSION} from './version.mjs';

// La portada no carrega Three.js, WebGL, el món ni una llavor de fons.
// Una imatge estàtica renderitzada amb la llavor 67 és suficient.
window.HUNTER_MENU_READY = true;
const menu = document.getElementById('ini');
const loadingLabel = document.getElementById('startLoading');
const qualitySelect = document.getElementById('graphicsQuality');
const seedRandom = document.getElementById('seedRandom');
const seedInput = document.getElementById('seedInput');
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
