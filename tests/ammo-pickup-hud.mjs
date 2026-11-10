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
const generation=read('../src/world-generation.js');

// Les tres reserves són independents. Pistola i fusell d'assalt
// continuen consumint exactament la mateixa reserva de bales.
assert.equal(weaponCatalog.pistol.ammo,'bullets');
assert.equal(weaponCatalog.assault.ammo,'bullets');
assert.equal(weaponCatalog.sniper.ammo,'sniperAmmo');
assert.equal(weaponCatalog.bazooka.ammo,'bazookaAmmo');
assert.equal(inventoryCaps.bazooka,1,'el bazuca és una arma, no la reserva de coets');
assert.equal(inventoryCaps.bazookaAmmo,12);

// SOLO: una caixa de munició concedeix 12 bales normals, 3 de franctirador i 2 coets.
assert(solo.includes("if(it.t==='arma'){ammo+=12;sniperAmmo+=3;bazookaAmmo+=2;}"));
assert(solo.includes("' · +12 bales, +3 rifle, +2 coets'"),'El missatge de recollida ha de concordar amb les quantitats reals');
assert(solo.includes("else if(it.t==='bazooka'){inv.bazooka=1;bazookaAmmo+=3}"));
assert(solo.includes('bazookaAmmo,scopeActive,'));
assert(fire.includes("bazookaEquipped){if(!inv.bazooka||bazookaAmmo<=0)"));
assert(fire.includes('bazookaAmmo--;'));
assert(!fire.includes('delete inv.bazooka;bazookaEquipped=false'));

// En cooperatiu, el Worker aplica les mateixes quantitats (12/3/2)
// quan es recull una caixa, i no desbloqueja el bazuca.
assert(coop.includes("if(supply.item==='bullets'){"));
assert(coop.includes('bag.bullets+12'));
assert(coop.includes('bag.sniperAmmo+3'));
assert(coop.includes('bag.bazookaAmmo+2'));
assert(coop.includes("}else if(supply.item==='bazooka'){"));
assert(coop.includes('bag.bazooka=1;'));
assert(native.includes("bazooka:['bazooka',1]"));
assert(native.includes('bazookaAmmo=bag.bazookaAmmo??0'));

// El botó de disparar mostra la reserva de l'arma activa; el panell
// mostra tres icones amb xifres i amaga els números de les armes.
assert(solo.includes("fire-ammo-count"));
assert(solo.includes("bazookaEquipped?bazookaAmmo:sniperEquipped?sniperAmmo:ammo"));
assert(solo.includes('passenger=!!mountedRow')&&solo.includes('personalWeapon=!cv||passenger'));
assert(generation.includes('sniperAmmo=0;bazookaAmmo=0;setSniperScope(false)'));

assert(ui.includes('class="inv-ammo-grid"'));
assert(ui.includes("'Cartutxos de franctirador'"));
assert(ui.includes("'Coets de bazuca'"));
assert(ui.includes("['bazooka','franctirador','fusell_assalt','arma'].includes(id)"));
assert(markup.includes('.inv-ammo-number'));
assert(markup.includes('.fire-ammo-count'));

// Els coets subsisteixen en les partides desades antigues.
assert(saves.includes('knifeEquipped,sniperAmmo,bazookaAmmo,'));
assert(saves.includes('bazookaAmmo=Number.isInteger(p.bazookaAmmo)'));

console.log('OK caixes +12 bales/+3 rifle/+2 coets; HUD i inventari SOLO/COOP coherents.');
