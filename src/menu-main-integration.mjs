// Skin del menú principal: reutilitza els elements i IDs del menú real.
// No reimplementam cap gestor de partida, compte, cooperatiu ni desament.
const root=document.getElementById('ini');
const menu=document.getElementById('startMenu');
if(root&&menu){
  const existing=id=>{
    const node=document.getElementById(id);
    if(!node)throw new Error('Falta el control original del menú: '+id);
    return node;
  };
  const world=document.createElement('div');
  world.id='menuWorldVista';
  world.setAttribute('aria-hidden','true');
  root.prepend(world);

  const logo=existing('brandTitle');
  const description=logo.nextElementSibling;
  if(!description||description.tagName!=='P')throw new Error('Falta la descripció original del joc');
  description.className='hunter-intro';

  const tagline=document.createElement('p');
  tagline.id='hunterTagline';
  tagline.textContent='EXPLORA • SOBREVIU • ELIMINA';

  const home=document.createElement('section');
  home.id='hunterHomeActions';
  home.className='hunter-home-actions';
  home.setAttribute('aria-label','Menú principal');
  const newGame=document.createElement('button');
  newGame.id='hunterNewGame';
  newGame.type='button';
  newGame.className='hunter-action hunter-action-primary';
  newGame.textContent='✦  NOVA PARTIDA  ▶';
  home.append(newGame);
  const pair=document.createElement('div');
  pair.className='hunter-action-row';
  const operations=existing('operationsOpen');
  operations.classList.add('hunter-action','hunter-action-dark');
  operations.textContent='▶ CONTINUAR';
  const coop=existing('coopOpen');
  coop.classList.add('hunter-action','hunter-action-dark');
  coop.textContent='♟ COOPERATIU';
  pair.append(operations,coop);
  home.append(pair);
  const minor=document.createElement('div');
  minor.className='hunter-action-row hunter-action-row-minor';
  const history=existing('historyOpen');
  history.classList.add('hunter-action','hunter-action-small');
  history.textContent='▥ ESTADÍSTIQUES';
  const account=existing('accountOpen');
  account.classList.add('hunter-action','hunter-action-small');
  account.textContent='♙ COMPTE';
  const optionsButton=document.createElement('button');
  optionsButton.id='hunterOpenOptions';
  optionsButton.type='button';
  optionsButton.className='hunter-action hunter-action-small';
  optionsButton.textContent='⚙ OPCIONS';
  minor.append(history,account,optionsButton);
  home.append(minor);

  const setup=document.createElement('section');
  setup.id='hunterNewGameSetup';
  setup.className='hunter-submenu';
  setup.hidden=true;
  setup.setAttribute('aria-label','Configurar una nova partida');
  const heading=document.createElement('h2');
  heading.textContent='⚑ CONFIGURACIÓ DE LA MISSIÓ';
  setup.append(heading);
  const difficultyTitle=document.createElement('p');
  difficultyTitle.className='hunter-field-label';
  difficultyTitle.textContent='Dificultat · comença la missió';
  setup.append(difficultyTitle);
  // Aquests botons mantenen data-d i el gestor original d'inici.
  const difficulty=existing('difficultyButtons');
  for(const button of difficulty.querySelectorAll('button[data-d]'))
    button.classList.add('hunter-action','hunter-action-dark');
  setup.append(difficulty,existing('seedBox'));
  const setupButtons=document.createElement('div');
  setupButtons.className='hunter-action-row hunter-setup-buttons';
  const seedSearch=existing('seedSearchOpen');
  seedSearch.classList.add('hunter-action','hunter-action-small');
  seedSearch.textContent='⌕ CERCA DE LLAVORS';
  const setupOptions=document.createElement('button');
  setupOptions.id='hunterSetupOptions';
  setupOptions.type='button';
  setupOptions.className='hunter-action hunter-action-small';
  setupOptions.textContent='⚙ GRÀFICS';
  const backSetup=document.createElement('button');
  backSetup.id='hunterBackFromSetup';
  backSetup.type='button';
  backSetup.className='hunter-action hunter-action-small';
  backSetup.textContent='← TORNAR';
  setupButtons.append(seedSearch,setupOptions,backSetup);
  setup.append(setupButtons);

  const options=document.createElement('section');
  options.id='hunterOptions';
  options.className='hunter-submenu';
  options.hidden=true;
  options.setAttribute('aria-label','Opcions del joc');
  const optionsTitle=document.createElement('h2');
  optionsTitle.textContent='⚙ OPCIONS';
  options.append(optionsTitle);
  // Qualitat i rendiment continuen usant els controls originals.
  const quality=existing('qualityBox');
  const perf=existing('performanceMenuOpen');
  perf.textContent='⚙ RENDIMENT';
  perf.classList.add('hunter-action','hunter-action-small');
  options.append(quality);
  const backOptions=document.createElement('button');
  backOptions.id='hunterBackFromOptions';
  backOptions.type='button';
  backOptions.className='hunter-action hunter-action-small';
  backOptions.textContent='← TORNAR';
  const optionsButtons=document.createElement('div');
  optionsButtons.className='hunter-action-row hunter-setup-buttons';
  optionsButtons.append(backOptions);
  options.append(optionsButtons);

  const loading=existing('startLoading');
  menu.replaceChildren(logo,tagline,description,home,setup,options,loading);

  let optionsFrom='home';
  const show=which=>{
    home.hidden=which!=='home';
    setup.hidden=which!=='setup';
    options.hidden=which!=='options';
    menu.scrollTop=0;
    root.scrollTop=0;
  };
  newGame.addEventListener('click',()=>show('setup'));
  backSetup.addEventListener('click',()=>show('home'));
  optionsButton.addEventListener('click',()=>{optionsFrom='home';show('options')});
  setupOptions.addEventListener('click',()=>{optionsFrom='setup';show('options')});
  backOptions.addEventListener('click',()=>show(optionsFrom));

  // Els menús generats pel runtime conserven els seus botons de tornada:
  // si un submenú torna a mostrar startMenu, conserva l'estat anterior.
  window.HUNTER_MENU_INTEGRATED=true;
}
