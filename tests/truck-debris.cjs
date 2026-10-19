'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('2026');game.frame();
 const result=game.run(`(()=>{
   const o=mkV('camio');
   o.position.set(100,0,80);world.add(o);
   const before=DB.length;
   vehicleDebris({t:'camio',x:100,z:80,o},0);
   const pieces=DB.slice(before).filter(d=>d.vehiclePart&&d.truckPiece);
   const other=DB.slice(before).filter(d=>d.vehiclePart&&!d.truckPiece);
   const rates=pieces.map(d=>Math.max(Math.abs(d.rx),Math.abs(d.ry),Math.abs(d.rz)));
   // Un fragment que arriba a terra ha de perdre velocitat angular.
   const first=pieces[0],old=Math.abs(first.rx);
   first.m.position.y=-10;first.vy=-1;
   updDeb(.016);
   const after=Math.abs(first.rx);
   return {pieces:pieces.length,other:other.length,
     maxRotation:Math.max(...rates),maxLife:Math.max(...pieces.map(d=>d.life)),
     landedSlowdown:after<old*.45};
 })()`);
 assert(result.pieces>=4,'Han de sortir peces visibles en destruir el camió');
 assert.equal(result.other,0,'El camió no ha de crear peces sense l’etiqueta de gir reduït');
 assert(result.maxRotation<=1.250001,'Rotació del camió massa exagerada');
 assert(result.maxLife<=3.101,'Fragments del camió massa persistents');
 assert(result.landedSlowdown,'En tocar terra han de perdre bona part del gir');
 console.log('OK camió: fragments amb gir reduït i amortiment en tocar terra');
})().catch(e=>{console.error(e);process.exitCode=1});
