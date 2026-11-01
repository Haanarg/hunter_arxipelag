// Portada definitiva ja present al document inicial, sense reconstrucció tardana.
// Només enllacem els submenús; l'inici de partida, el COOP i els comptes
// continuen utilitzant els controladors originals.
const root=document.getElementById('ini');
const menu=document.getElementById('startMenu');
if(root&&menu){
 const find=id=>{
  const node=document.getElementById(id);
  if(!node)throw new Error('Falta el control del menú: '+id);
  return node;
 };
 const home=find('hunterHomeActions'),setup=find('hunterNewGameSetup'),options=find('hunterOptions');
 let optionsFrom='home';
 const show=which=>{
  home.hidden=which!=='home';
  setup.hidden=which!=='setup';
  options.hidden=which!=='options';
  menu.scrollTop=0;root.scrollTop=0;
 };
 find('hunterNewGame').addEventListener('click',()=>show('setup'));
 find('hunterBackFromSetup').addEventListener('click',()=>show('home'));
 find('hunterOpenOptions').addEventListener('click',()=>{optionsFrom='home';show('options')});
 find('hunterSetupOptions').addEventListener('click',()=>{optionsFrom='setup';show('options')});
 find('hunterBackFromOptions').addEventListener('click',()=>show(optionsFrom));
 window.HUNTER_MENU_INTEGRATED=true;
}
