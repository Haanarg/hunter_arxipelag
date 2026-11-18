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
assert.equal(first.ammo,40,'La primera arma no dóna munició extra');
const duplicate=pickup({fusell_assalt:1},40,item,IT);
assert.equal(duplicate.inv.fusell_assalt,1,'No duplicar el fusell');
assert.equal(duplicate.ammo,56,'Una segona arma afegeix 16 bales');
assert.match(duplicate.mapMessage,/16 bales/);

// El servidor COOP també ha de permetre la recollida duplicada quan hi ha
// espai a la bossa i donar exactament +16, respectant el topall.
assert(server.includes("supply.item==='assault'?"),'El límit de COOP contempla el fusell repetit');
assert(server.includes("bag.assault>=1&&bag.bullets>=capacities.bullets"),'Només rebutjar la recollida amb munició plena');
assert(server.includes("bag.bullets=Math.min(capacities.bullets,bag.bullets+16)"),'COOP: 16 bales amb topall');
assert(server.includes("else bag.assault=1"),'Primer fusell afegit a la bossa');
console.log('PASS assault rifle: first pickup equips, repeat grants +16 bullets (solo and COOP)');
