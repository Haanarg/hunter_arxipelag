#!/usr/bin/env node
// El dany dels atacs enemics puja un grau sense alterar la punteria
// de cada dificultat ni les fonts de dany que no provenen d'armes.
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 const results=game.run(`(()=>{
   world=new THREE.Group();scene.add(world);
   cv=null;playerFall=null;playerEject=null;
   P.x=0;P.y=1.5;P.z=0;
   E=[];PL.length=0;
   enemyCandidatesAt=()=>[];vehicleCandidatesAt=()=>[];
   wallCandidates=()=>[];buildingCandidates=()=>[];treeAt=()=>null;
   hAt=()=>0;
   const samples=[];
   for(const difficulty of [.6,1,1.5]){
     DIF=difficulty;over=0;hp=100;
     const scale=enemyWeaponDamageScale();
     hurtP(7,true);
     const rifle=100-hp;

     // Cal provar també la col·lisió d'una bala real, no només hurtP.
     hp=100;over=0;
     shoot(-5,3,0,1,0,0,100,7,0,'e',mW,.7);
     updPj(.1);
     const bullet=100-hp;
     for(const p of Pj)world.remove(p.o);Pj.length=0;

     // Projectil de bazuca d'un soldat: 25 de base, x1,3 per arma
     // pesada i el 60% del dany explosiu al jugador a peu.
     hp=100;over=0;playerEject=null;
     boom(0,1.5,0,8,25*HEAVY_SHOT_DAMAGE_FACTOR,'e');
     const rocket=100-hp;

     // L'escala ambiental conserva el comportament previ.
     hp=100;over=0;hurtP(7);
     const environmental=100-hp;

     const car={t:'cotxe',x:0,z:0,hd:0,o:new THREE.Group(),
       armor:2,life:4,maxLife:4,destroyed:false};
     cv=car;hp=100;over=0;
     damageVehicle(car,10,1,'light',true);
     const vehicle=100-hp;
     cv=null;
     samples.push({difficulty,scale,rifle,bullet,rocket,environmental,vehicle});
   }
   return samples;
 })()`);
 const expected=[
   {difficulty:.6,scale:1,rifle:7,bullet:7,rocket:19.5,environmental:4.2,vehicle:4.4},
   {difficulty:1,scale:1.5,rifle:10.5,bullet:10.5,rocket:29.25,environmental:7,vehicle:6.6},
   {difficulty:1.5,scale:2,rifle:14,bullet:14,rocket:39,environmental:10.5,vehicle:8.8}
 ];
 for(let i=0;i<expected.length;i++)for(const [key,value] of Object.entries(expected[i]))
   assert.ok(Math.abs(results[i][key]-value)<.0001,
     'Nivell '+expected[i].difficulty+', '+key+': esperat '+value+
     ', real '+results[i][key]);
 console.log('OK dany enemic per nivell (bales, bazuca i vehicles); dany ambiental inalterat');
})().catch(e=>{console.error(e);process.exitCode=1});
