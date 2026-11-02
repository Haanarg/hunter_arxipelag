#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8');
const html=read('index.html'),js=read('src/menu-main-integration.mjs'),boot=read('src/menu-boot.mjs');
const start=html.indexOf('<div id="startMenu"'),end=html.indexOf('<div id="performanceScreen"',start);
assert.ok(start>0&&end>start,'El menú definitiu està a l’HTML del primer fotograma');
const content=html.slice(start,end);
for(const id of ['brandTitle','hunterTagline','hunterHomeActions','hunterNewGame','operationsOpen',
 'coopOpen','historyOpen','accountOpen','hunterOpenOptions','hunterNewGameSetup',
 'difficultyButtons','seedBox','seedRandom','seedInput','mapSizeBox','seedSearchOpen',
 'hunterSetupOptions','hunterBackFromSetup','hunterOptions','qualityBox',
 'graphicsQuality','performanceMenuOpen','hunterBackFromOptions','startLoading'])
 assert.equal(html.split('id="'+id+'"').length,2,'Un únic control per a '+id);
assert.ok(content.includes('EXPLORA • SOBREVIU • ELIMINA'));
assert.ok(content.includes('✦ NOVA PARTIDA ▶')&&content.includes('♟ COOPERATIU'));
assert.ok(!html.includes('Elimina el general enemic amagat'),
 'El subtítol antic ja no pot existir al codi');
for(const old of ['Estadístiques / llavors','Cooperatiu · sala privada',
 'Continuar / operacions desades','Compte / núvol','<h1 id="brandTitle"'])
 assert.ok(!content.includes(old),'Element antic no eliminat: '+old);
assert.equal(content.split('data-d=').length-1,3);
assert.match(content,/id="hunterNewGameSetup"[^>]*hidden/);
assert.match(content,/id="hunterOptions"[^>]*hidden/);
assert.match(html,/id="menuWorldVista"[^>]*><iframe[^>]*menu-background\.html/);
for(const bad of ['replaceChildren(', 'createElement(', 'prepend(', 'append('])
 assert.ok(!js.includes(bad),'La portada no pot crear-se o substituir-se després: '+bad);
for(const id of ['hunterNewGame','hunterBackFromSetup','hunterOpenOptions',
 'hunterSetupOptions','hunterBackFromOptions'])
 assert.ok(js.includes("find('"+id+"').addEventListener("),'Navegació conservada: '+id);
assert.ok(boot.includes('menu-main-integration.mjs?menu=direct-html-v1'));
assert.ok(html.includes('menu-boot.mjs?v=0.6.84&visual=8&glassfix=2&smooth=13&menu=direct-html-v1'));
console.log('PASS: menú nou des del primer HTML, cap títol/subtítol o botons antics');
