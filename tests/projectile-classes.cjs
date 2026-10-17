const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 const report=game.run(`(()=>{
   world=new THREE.Group();scene.add(world);
   const saved={wallCandidates,buildingCandidates,enemyCandidatesAt,vehicleCandidatesAt,treeAt,hAt,
     boom,cv,E,seedSearchMode,kills,explodeEnemyVehicle,Px:P.x,Pz:P.z,Py:P.y};
   const checks={},results={};
   let walls=[],buildings=[],enemies=[],vehicles=[],blasts=[];
   const reset=()=>{
     for(const p of Pj)world.remove(p.o);
     Pj.length=0;clearBulletImpacts();
     walls=[];buildings=[];enemies=[];vehicles=[];blasts=[];
   };
   const fireShot=(splash=0,owner='p',damage=20)=>{
     shoot(-9,2,0,1,0,0,100,damage,splash,owner,mW,.7);
     const shot=Pj[Pj.length-1],record={type:shot.shotClass,speed:shot.vx,power:shot.dmg};
     updPj(.15);
     return record;
   };
   const wall=(military=false,barbed=false)=>{
     const w={x0:-1,x1:1,y0:1,y1:3,z0:-1,z1:1,hp:100,open:false,barbed};
     if(military)w.owner={compound:'outpost',kind:'outpost'};
     return w;
   };
   const building=military=>({x:0,z:0,w:4,d:4,fy:0,h:2,rhp:120,hangar:false,compound:military?'hq':null});
   const enemy=type=>({x:0,z:0,t:type,r:2,hp:140,alert:0,o:new THREE.Group(),destroyed:false});
   const vehicle=type=>({t:type,x:0,z:0,hd:0,life:10,maxLife:10,armor:VD.types[type].armor,
      o:new THREE.Group(),destroyed:false});
   try{
     P.x=100;P.z=100;P.y=1;cv=null;
     wallCandidates=()=>walls;buildingCandidates=()=>buildings;
     enemyCandidatesAt=()=>enemies;vehicleCandidatesAt=()=>vehicles;
     treeAt=()=>null;hAt=()=>0;
     boom=(x,y,z,r,d,own)=>blasts.push({r,d,own});
     const light=fireShot();
     reset();const heavy=fireShot(8);
     checks.classes=light.type==='light'&&heavy.type==='heavy';
     checks.heavyFaster=heavy.speed>light.speed&&Math.abs(heavy.speed/light.speed-1.17)<1e-9;
     checks.heavyLethal=heavy.power>light.power;
     const model=Pj.at(-1)?.o;
     checks.heavyHalfSize=!!model&&Math.abs(model.scale.x-.35)<1e-9;
     reset();walls=[wall(false,true)];
     fireShot();
     checks.lightThroughWire=walls[0].hp===100&&Pj.length===1;
     reset();walls=[wall(true)];
     fireShot();
     checks.militaryWallsProtected=walls[0].hp===100&&Pj.length===0;
     reset();walls=[wall(false)];
     fireShot();
     checks.civilianWallDamaged=walls[0].hp<100;
     reset();buildings=[building(true)];
     fireShot();
     checks.militaryRoofsProtected=buildings[0].rhp===120;
     reset();buildings=[building(false)];
     fireShot();
     checks.civilianRoofDamaged=buildings[0].rhp<120;
     reset();vehicles=[vehicle('tanqueta')];
     fireShot();
     checks.armoredVehicleProtected=vehicles[0].life===10;
     reset();vehicles=[vehicle('heli_combat')];
     fireShot();
     checks.armoredHelicopterProtected=vehicles[0].life===10;
     // El coet de patrulla marina esclata al casc de l'helicòpter:
     // la seva esfera de col·lisió queda fora del radi nominal de 8 m,
     // però la distància a la superfície ha de ser zero.
     const combatHeli=vehicles[0],hull=vehicleRadius(combatHeli.t)*.62;
     checks.helicopterExplosiveHull=hull>8&&
       explosionDistanceToVehicleHull(combatHeli,hull,1,0)<.001&&
       explosionDistanceToVehicleHull(combatHeli,hull+9,1,0)>8;
     reset();vehicles=[vehicle('cotxe')];
     fireShot();
     checks.unarmoredVehicleDamaged=vehicles[0].life===9;
     reset();enemies=[enemy('tanc')];
     fireShot();
     checks.enemyTankProtected=enemies[0].hp===140;
     reset();enemies=[enemy('tanqueta')];
     fireShot();
     checks.enemyTanketteProtected=enemies[0].hp===140;
     reset();enemies=[enemy('soldat')];
     fireShot();
     checks.soldierDamaged=enemies[0].hp<140;
     reset();enemies=[{...enemy('patrulla_marina'),r:7.5}];
     // Llanxa danyada per una bala que impacta a proa, no al centre.
     shoot(-12,2,0,1,0,0,100,12,0,'p',mW,.7);
     updPj(.12);
     checks.marinePatrolLightHull=enemies[0].hp<140;
     reset();enemies=[{...enemy('patrulla_marina'),r:7.5}];
     fireShot();
     checks.marinePatrolPistol=enemies[0].hp<140;
     // Regressió d'inicialització REAL: abans faltava EC.patrulla_marina,
     // mkEn produïa u.hp undefined i restar dany el convertia en NaN.
     const formerEnemies=E,formerSeedSearch=seedSearchMode;
     seedSearchMode=true;E=[];
     const livePatrol=mkEn('patrulla_marina',0,0,0);
     checks.marinePatrolInitialHealth=livePatrol.hp===95&&
       Number.isFinite(livePatrol.hp);
     hurtE(livePatrol,35);
     checks.marinePatrolTakesDamage=livePatrol.hp===60;
     // Mateixa ruta de destrucció real (killEnemy): simulam només
     // les partícules per no generar geometria durant aquest test.
     explodeEnemyVehicle=u=>{u.destroyed=true};
     hurtE(livePatrol,61);
     checks.marinePatrolHeavyKill=livePatrol.destroyed&&!E.includes(livePatrol);
     explodeEnemyVehicle=saved.explodeEnemyVehicle;
     E=formerEnemies;seedSearchMode=formerSeedSearch;
     reset();enemies=[enemy('torre')];
     fireShot();
     checks.towerProtected=enemies[0].hp===140;
     reset();walls=[wall(true)];
     fireShot(8);
     checks.heavyExplosion=blasts.length===1&&blasts[0].d>20;
     reset();walls=[wall(false,true)];
     fireShot(8);
     checks.heavyStopsAtWire=blasts.length===1&&Pj.length===0;
     checks.boomIsHeavy=String(updFx).includes("boom(g.x,g.y,g.z,16,100,'b')")&&
       String(updFx).includes("boom(b.x,b.y,b.z,48,300,'b')");
     // Una patrullera de 95 HP ha de ser destruïda per una explosió de
     // bazooka que toqui la superfície del buc, encara que el centre sigui
     // fora de la línia directa del projectil.
     reset();enemies=[{...enemy('patrulla_marina'),hp:95,r:7.5}];
     const hullRadius=vehicleRadius('llanxa')*.62;
     boom=saved.boom;
     boom(hullRadius,1.8,0,18,135*HEAVY_SHOT_DAMAGE_FACTOR,'pb');
     checks.bazookaDestroysMarineHull=enemies[0].hp<=0;
     boom=(x,y,z,r,d,own)=>blasts.push({r,d,own});
     // L'autoapuntat ha d'anticipar una llanxa que es desplaça de costat.
     const marine={x:0,z:-85,hd:-Math.PI/2,speed:18},
           aim=bazookaInterceptPoint(marine,0,2,0,2,72*HEAVY_SHOT_SPEED_FACTOR),
           impactTime=Math.hypot(aim.x,aim.z)/(72*HEAVY_SHOT_SPEED_FACTOR);
     checks.bazookaLeadsMarine=aim.x>15&&
       Math.abs(aim.x-18*impactTime)<.01&&Math.abs(aim.z+85)<.01;
     results.heavyMultiplier=HEAVY_SHOT_DAMAGE_FACTOR;
     results.heavySpeedFactor=HEAVY_SHOT_SPEED_FACTOR;
   }finally{
     reset();for(const k of ['wallCandidates','buildingCandidates','enemyCandidatesAt','vehicleCandidatesAt',
       'treeAt','hAt','boom','cv'])globalThis[k]=saved[k];
     E=saved.E;seedSearchMode=saved.seedSearchMode;kills=saved.kills;
     explodeEnemyVehicle=saved.explodeEnemyVehicle;
     P.x=saved.Px;P.z=saved.Pz;P.y=saved.Py;scene.remove(world);
   }
   return {checks,results}
 })()`);
 for(const [name,ok] of Object.entries(report.checks))assert(ok,name+' failed: '+JSON.stringify(report));
 console.log('PASS: classificació balística i protecció dels blindats',JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1});
