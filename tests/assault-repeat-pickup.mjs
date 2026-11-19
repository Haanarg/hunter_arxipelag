import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const solo=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/coop-mission.mjs',import.meta.url),'utf8');

// Executa la branca real del joc, no una còpia del càlcul.
const match=solo.match(/else if\(it\.t==='fusell_assalt'\)\{[\s\S]*?\}\s*(?=else inv\[it\.t\])/);
assert(match,'La recollida del fusell d’assalt té branca pròpia');
const branch=match[0].replace(/^else /,'');
const pickup=new Function('inv','ammo', 'it','IT',
  'let mapMessage=null;'+branch+'return {inv,ammo,mapMessage}');
const item={t:'fusell_assalt'},IT={fusell_assalt:{n:'Fusell d’assalt'}};
const first=pickup({},40,item,IT);
assert.equal(first.inv.fusell_assalt,1);
assert.equal(first.ammo,56,'La primera arma concedeix 16 bales a més de desbloquejar el fusell');
assert.match(first.mapMessage,/16 bales/);
const duplicate=pickup({fusell_assalt:1},40,item,IT);
assert.equal(duplicate.inv.fusell_assalt,1,'No duplicar el fusell');
assert.equal(duplicate.ammo,56,'Una segona arma afegeix 16 bales');
assert.match(duplicate.mapMessage,/16 bales/);

// El servidor COOP també ha de permetre la recollida duplicada quan hi ha
// espai a la bossa i donar exactament +16, respectant el topall.
assert(server.includes("supply.item==='assault'?"),'El límit de COOP contempla el fusell repetit');
assert(server.includes("bag.assault>=1&&bag.bullets>=capacities.bullets"),'Només rebutjar la recollida amb munició plena');
assert(server.includes("bag.bullets=Math.min(capacities.bullets,bag.bullets+16)"),'COOP: 16 bales amb topall');
assert(server.includes("bag.assault=1;"),'Primer fusell afegit a la bossa');
// Executa la branca COOP real tant amb inventari buit com amb fusell previ.
const coopMatch=server.match(/else if\(supply\.item==='assault'\)\{[\s\S]*?\}(?=else bag\[supply\.item\])/);
assert(coopMatch,'Cal conservar la branca de recollida COOP');
const coopPickup=new Function('bag','supply','capacities',
  coopMatch[0].replace(/^else /,'')+'return bag');
const capacities={bullets:120};
const coopFirst=coopPickup({assault:0,bullets:40},{item:'assault'},capacities);
assert.equal(coopFirst.assault,1);
assert.equal(coopFirst.bullets,56,'COOP: el primer fusell també dóna 16 bales');
const coopAgain=coopPickup({assault:1,bullets:100},{item:'assault'},capacities);
assert.equal(coopAgain.bullets,116,'COOP: el fusell repetit continua sumant 16');
const nearCap=coopPickup({assault:1,bullets:115},{item:'assault'},capacities);
assert.equal(nearCap.bullets,120,'COOP: respecta la capacitat màxima');
console.log('PASS assault rifle: initial and repeated pickups grant +16 bullets in solo and COOP');
