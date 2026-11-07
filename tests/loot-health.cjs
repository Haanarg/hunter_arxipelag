#!/usr/bin/env node
// Botí en edificis de dues plantes i curació immediata dins l'inventari.
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.run('seedSearchMode=true');
 game.start('12345');
 const generated=game.run(`(()=>{
   const counts=new Map(),issues=[];
   for(const it of items)if(it.building){
     counts.set(it.building,(counts.get(it.building)||0)+1);
     if(it.y>it.building.fy+4&&!it.building.interiorStair)issues.push('upper without floor');
   }
   const over=[...counts.values()].filter(n=>n>3);
   const twoFloors=B.filter(b=>b.floors===2&&!b.civilian&&!b.hangar&&
     !b.rb&&b.upperFloor&&b.interiorStair&&!b.interiorStair.destroyed);
   const emptyFloor=twoFloors.filter(b=>{
     const own=items.filter(it=>it.building===b);
     return !own.some(it=>it.y<b.fy+b.storey)||
       !own.some(it=>it.y>b.fy+b.storey);
   });
   return {baseMed:items.filter(it=>it.t==='med'&&it.compound==='base').length,
     over:over.length,issues,upper:items.filter(it=>it.building?.floors===2&&
       it.y>it.building.fy+it.building.storey+1).length,
     twoFloors:twoFloors.length,emptyFloor:emptyFloor.length};
 })()`);
 assert.equal(generated.baseMed,1,'Una única farmaciola al complex inicial');
 assert.equal(generated.over,0,'Cap edifici generat supera tres objectes');
 assert.deepEqual([...generated.issues],[], 'No hi ha botí flotant sense planta superior');
 assert(generated.twoFloors>0,'Hi ha edificis militars transitables de dues plantes');
 assert.equal(generated.emptyFloor,0,'Cada planta militar té com a mínim un objecte');
 const placement=game.run(`(()=>{
   // Escenari aïllat: mateix comptador per objectes fixos i aleatoris.
   const saved=items;items=[];
   const b=mkB(-H+90,-H+90,26,22,16,0xa9bdb0,0x79584e,
     {floors:2,doorSide:0,noPartitions:true});
   decorateRuntimeBuilding(b,{w:26,d:22,h:8,floors:2});
   b.compound='test';
   const first=addItemAt('med',b.x,b.z,'test');
   const second=addIt('arma',b),third=addIt('disf',b);
   const fourth=addItemAt('arma',b.x+2,b.z,'test');
   const fourthRandom=addIt('granada',b);
   const own=items.filter(it=>it.building===b);
   const upper=own.filter(it=>it.y>b.fy+b.storey);
   const lower=own.filter(it=>it.y<b.fy+b.storey);
   const result={first:!!first,second:!!second,third:!!third,
     fourth:!!fourth,fourthRandom:!!fourthRandom,
     total:own.length,upper:upper.length,lower:lower.length};
   items=saved;return result;
 })()`);
 assert.equal(placement.first,true,'Es col·loca el primer botí fix');
 assert.equal(placement.second,true,'Es col·loca el segon botí aleatori');
 assert.equal(placement.third,true,'Es col·loca el tercer botí aleatori');
 assert.equal(placement.fourth,false,'El quart botí fix és rebutjat');
 assert.equal(placement.fourthRandom,false,'El quart botí aleatori també');
 assert.equal(placement.total,3,'Màxim de tres objectes en tot l’edifici');
 assert.ok(placement.upper>=1&&placement.lower>=1,'Botí repartit entre ambdues plantes');
 const backpack=game.run(`(()=>{
   const o=createItemVisual('paracaigudes');
   return {sphere:o.children.filter(m=>m.geometry?.type==='SphereGeometry').length,
     straps:o.children.filter(m=>m.geometry?.type==='TubeGeometry').length,
     geometries:o.children.length};
 })()`);
 assert.ok(backpack.sphere>=3,'Motxilla arrodonida, no capsa');
 assert.ok(backpack.straps>=5,'Corretges i ansa reconeixibles');
 game.run("inv={med:1};hp=7;started=1;panel('inventory')");
 assert.match(game.el('panelBody').innerHTML,/Vida 7 \/ 20/,'L’inventari mostra la vida prèvia');
 const slot=game.el('invGrid').children[0];
 assert.equal(typeof slot.onclick,'function','La farmaciola és interactiva');
 slot.onclick();
 assert.equal(game.run('hp'),15,'La farmaciola recupera vuit punts');
 assert.equal(game.run('inv.med||0'),0,'Es consumeix una farmaciola');
 assert.match(game.el('panelBody').innerHTML,/Vida 15 \/ 20/,'Vida actualitzada sense tancar');
 assert.match(game.el('panelBody').innerHTML,/\+8 vida/,'Increment visible a l’inventari');
 assert.match(game.el('hud').innerHTML,/❤️ 15/,'El HUD s’actualitza mentre el joc és en pausa');
 assert.equal(game.el('gamepanel').style.display,'flex','L’inventari segueix obert');
 console.log('OK farmacioles, tres objectes per edifici, dues plantes, motxilla i vida immediata');
})().catch(err=>{console.error(err);process.exitCode=1});
