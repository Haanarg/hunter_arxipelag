import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {weaponCatalog,inventoryCaps} from '../src/weapon-catalog.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const solo=read('../src/game-core.js');
const fire=read('../src/combat.js');
const ui=read('../src/ui.js');
const markup=read('../index.html');
const coop=read('../server/coop-mission.mjs');
const native=read('../src/coop-world-runtime.js');
const saves=read('../src/operation-runtime.js');

// Les tres reserves són independents. Pistola i fusell d'assalt
// continuen consumint exactament la mateixa reserva de bales.
assert.equal(weaponCatalog.pistol.ammo,'bullets');
assert.equal(weaponCatalog.assault.ammo,'bullets');
assert.equal(weaponCatalog.sniper.ammo,'sniperAmmo');
assert.equal(weaponCatalog.bazooka.ammo,'bazookaAmmo');
assert.equal(inventoryCaps.bazooka,1,'el bazuca és una arma, no la reserva de coets');
assert.equal(inventoryCaps.bazookaAmmo,12);

// La caixa SOLO manté les 16 bales originals i suma 5 de rifle i 3 coets.
assert(solo.includes("if(it.t==='arma'){ammo+=16;sniperAmmo+=5;bazookaAmmo+=3;}"));
assert(solo.includes("else if(it.t==='bazooka'){inv.bazooka=1;bazookaAmmo+=3}"));
assert(solo.includes('bazookaAmmo,scopeActive,'));
assert(fire.includes('bazookaEquipped&&inv.bazooka&&bazookaAmmo>0'));
assert(fire.includes('bazookaAmmo--;'));
assert(!fire.includes('delete inv.bazooka;bazookaEquipped=false'));

// En cooperatiu, el Worker concedeix 5 cartutxos i 3 coets quan
// s'agafa una caixa de bales, i no desbloqueja l'arma bazuca.
assert(coop.includes("if(supply.item==='bullets'){"));
assert(coop.includes('bag.sniperAmmo+5'));
assert(coop.includes('bag.bazookaAmmo+3'));
assert(coop.includes("}else if(supply.item==='bazooka'){"));
assert(coop.includes('bag.bazooka=1;'));
assert(native.includes("bazooka:['bazooka',1]"));
assert(native.includes('bazookaAmmo=bag.bazookaAmmo??0'));

// El botó de disparar mostra la reserva de l'arma activa; el panell
// mostra tres icones amb xifres i amaga els números de les armes.
assert(solo.includes("fire-ammo-count"));
assert(solo.includes("bazookaEquipped?bazookaAmmo:sniperEquipped?sniperAmmo:ammo"));
assert(ui.includes('class="inv-ammo-grid"'));
assert(ui.includes("'Cartutxos de franctirador'"));
assert(ui.includes("'Coets de bazuca'"));
assert(ui.includes("['bazooka','franctirador','fusell_assalt','arma'].includes(id)"));
assert(markup.includes('.inv-ammo-number'));
assert(markup.includes('.fire-ammo-count'));

// Els coets subsisteixen en les partides desades antigues.
assert(saves.includes('knifeEquipped,sniperAmmo,bazookaAmmo,'));
assert(saves.includes('bazookaAmmo=Number.isInteger(p.bazookaAmmo)'));

console.log('OK caixes +16 bales/+5 rifle/+3 coets; possessió de bazuca, HUD, inventari, SOLO i COOP.');
