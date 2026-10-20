'use strict';
// Invariant global: qualsevol dany finit i positiu és enter; la física
// continua sent decimal, i els col·liders/armadures retenen les immunitats.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('12345');game.frame();
 const report=game.run(`(()=>{
   const scalar=[-.6,0,.2,.4,.99,1,1.01,2.3,4,10.1,Infinity,NaN]
     .map(x=>wholeDamage(x));
   const start=hp;
   hurtP(.4,false,{type:'fall'});
   const player=hp;
   hurtP(2.3,true,{type:'bullet'});
   const player2=hp;
   hurtP(0);
   const zeroIgnored=hp;
   const enemy={t:'jeep',hp:8,x:P.x+20,z:P.z,o:{position:{y:0}}};
   hurtE(enemy,2.3);
   const armored={t:'tanc',life:20,destroyed:false};
   damageVehicle(armored,.4,1,'light');
   const armoredLight=armored.life;
   damageVehicle(armored,.4,1,'heavy');
   const armoredHeavy=armored.life;
   const truck={t:'camio',life:10,destroyed:false};
   damageVehicle(truck,2.2,1,'heavy');
   const truckLife=truck.life;
   const tree={alive:true,hp:5};
   dmgP(tree,1.4);
   const treeLife=tree.hp;
   const wall={hp:10,open:false};
   dmgW(wall,2.1);
   const wallLife=wall.hp;
   const invulnerable={hp:Infinity};
   dmgW(invulnerable,3.6);
   const invulnerableLife=invulnerable.hp;
   const shotStart=Pj.length;
   shoot(P.x+2,P.y+2,P.z+2,0,0,-1,36,2.3,0,'p',
     new THREE.MeshBasicMaterial({color:0xffffff}),1);
   const projectileDamage=Pj[Pj.length-1].dmg;
   const shotAdded=Pj.length===shotStart+1;
   return {scalar,start,player,player2,zeroIgnored,
     enemyHp:enemy.hp,armoredLight,armoredHeavy,truckLife,treeLife,wallLife,
     invulnerableLife,projectileDamage,shotAdded};
 })()`);
 assert.equal(report.scalar.join(','),'0,0,1,1,1,1,2,3,4,11,0,0');
 assert.equal(report.start,20);
 assert.equal(report.player,19,'Caiguda fraccionària de 0,4 = 1 punt');
 assert.equal(report.player2,16,'Dany de bala fraccionari es normalitza');
 assert.equal(report.zeroIgnored,16,'Mal de zero no canvia la vida');
 assert.equal(report.enemyHp,5,'Soldats/enemics empren enters');
 assert.equal(report.armoredLight,20,'El tanc segueix immune a bales lleugeres');
 assert.equal(report.armoredHeavy,19,'Arma pesada fraccionària esdevé entera');
 assert.equal(report.truckLife,7,'Vehicles amb vida entera');
 assert.equal(report.treeLife,3,'Palmeres amb vida entera');
 assert.equal(report.wallLife,7,'Murs amb vida entera');
 assert.equal(report.invulnerableLife,Infinity,'Col·liders amb vida infinita no reben dany');
 assert.equal(report.projectileDamage,3,'Projectils nous porten mal enter');
 assert(report.shotAdded);
 const core=fs.readFileSync(path.join(__dirname,'../src/game-core.js'),'utf8');
 assert.match(core,/dmg=fall\.parachute\?0:wholeDamage\(/,
   'El mal de les caigudes es normalitza abans de ser aplicat');
 assert.match(core,/hp=Math\.min\(COMBAT_BALANCE\.player,Math\.ceil\(hp\)\+COMBAT_BALANCE\.medkit\)/,
   'Les farmacioles no poden deixar decimals');
 // La mort continua activant-se després d'un impacte enter.
 game.run("hp=1;hurtP(.1,false,{type:'fall',x:P.x,y:P.y+8,z:P.z})");
 assert.equal(game.run('hp'),0);
 assert.equal(game.run('over'),1);
 assert.equal(game.run('deathCinematic?.active'),true);
 console.log('OK: dany enter a tots els bàndols, caigudes, objectes, vehicles i mort');
})().catch(err=>{console.error(err);process.exitCode=1});
