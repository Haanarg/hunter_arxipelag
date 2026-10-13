const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('2407759483');
 const inventory=game.run(`(()=>{
  const shop=world.userData.compounds.find(c=>c.id==='hangar');
  if(!shop)return {shop:false};
  const original=shop.loot.find(i=>i.t==='cisalla'),
        garage=shop.buildings.find(b=>b.layoutBuilding==='workshop');
  if(!original||!garage)return {shop:true,tool:!!original,garage:!!garage};
  const inside=Math.abs(original.x-garage.x)<garage.w/2&&
    Math.abs(original.z-garage.z)<garage.d/2;
  P.x=original.x;P.z=original.z;P.y=original.y-1.3;
  return {shop:true,tool:true,garage:true,inside,
    lootCount:shop.loot.filter(i=>i.t==='cisalla').length,
    model:!!original.o?.getObjectByName('hunter-bolt-cutters'),
    earlyAmmo:ammo,worldObject:original};
 })()`);
 assert(inventory.shop&&inventory.tool&&inventory.garage&&inventory.inside&&inventory.model,
   'workshop has a real pickup '+JSON.stringify({...inventory,worldObject:undefined}));
 game.frame(16);
 const collected=game.run('({picked:inv.cisalla===1,stillInWorld:items.some(i=>i.t==="cisalla"&&i.compound==="hangar")})');
 assert(collected.picked&&!collected.stillInWorld,'cisalla picked up from workshop '+JSON.stringify(collected));
 const shooting=game.run(`(()=>{
  // Lloc sobre el mar sense altres obstacles, amb tram de filferrada real.
  const x=H-160,z=H-160;
  const wire=barbedSection(x-3,z,x+3,z);
  const originalLife=wire.hp,initial=ammo;
  const shootFrom=own=>{
    shoot(x,2.5,z+6,0,0,-1,160,12,0,own,mW,SMALL_ARMS_SCALE);
    const bullet=Pj[Pj.length-1];
    updPj(.065);
    const passed=Pj.includes(bullet)&&bullet.z<z-1&&
      wire.hp===originalLife&&Wl.includes(wire);
    // Evitam que bales anteriors quedin vives en la següent prova.
    if(Pj.includes(bullet)){world.remove(bullet.o);Pj.splice(Pj.indexOf(bullet),1)}
    return passed;
  };
  const friend=shootFrom('p'),enemy=shootFrom('e'),
    soldierSight=soldierClearShot({t:'soldat',x,z:z+6},x,z+6,2.2,{x,z:z-6},1.0);
  // Comprovam l'impacte explosius separadament; boom també esborra el tram.
  shoot(x,2.5,z+6,0,0,-1,160,45,8,'p',mS,1.5);
  const explosive=Pj[Pj.length-1];
  updPj(.065);
  return {friend,enemy,soldierSight,
    explosiveGone:!Pj.includes(explosive),
    wireDestroyed:!Wl.includes(wire),initial};
 })()`);
 for(const key of ['friend','enemy','soldierSight','explosiveGone','wireDestroyed'])
   assert(shooting[key],key+': '+JSON.stringify(shooting));
 const cutting=game.run(`(()=>{
  const x=H-160,z=H-175,
        w=barbedSection(x-3,z,x+3,z),another=barbedSection(x-3,z-9,x+3,z-9);
  P.x=x;P.z=z+2.15;P.y=0;P.hd=0;fcd=0;cv=null;
  const invBefore=inv.cisalla,ammoBefore=ammo,killsBefore=kills,
    enemyAlerts=E.map(e=>e.alert);
  let played=0;const normalSnd=snd;snd=()=>{played++};
  let used,cut,weaponPose,wrongDirection,tooFar,otherWorks;
  try{
    used=useInvItem('cisalla')&&cisallaEquipped;
    // Simulem la pulsació de Dispar: amb cisalla no ha de crear bales.
    const beforeBullets=Pj.length;
    cut=fire();
    animPl(0,.12);
    weaponPose=!!pl.userData.cisalla.visible&&!pl.userData.gun.visible&&
      pl.userData.cisallaCut>0&&pl.userData.cisalla.userData.bladeArms.length===2;
    cut=!!cut&&!Wl.includes(w)&&w.hp===0&&w.cut&&
      Pj.length===beforeBullets&&inv.cisalla===invBefore;
    P.z=z-9+2.15;P.hd=Math.PI;fcd=0;
    wrongDirection=!cutBarbedWire()&&Wl.includes(another);
    P.hd=0;P.z=z-9+8.5;fcd=0;
    tooFar=!cutBarbedWire()&&Wl.includes(another);
    P.z=z-9+2.15;P.hd=0;fcd=0;
    otherWorks=cutBarbedWire()&&!Wl.includes(another);
  }finally{snd=normalSnd}
  const quiet=played===0&&E.every((e,i)=>e.alert===enemyAlerts[i]);
  const persistent=inv.cisalla===invBefore&&ammo===ammoBefore&&kills===killsBefore;
  const unequip=useInvItem('cisalla')&&!cisallaEquipped;
  const reEquip=useInvItem('cisalla')&&cisallaEquipped;
  dropInvItem('cisalla');
  const dropped=!inv.cisalla&&!cisallaEquipped;
  return {used,cut,weaponPose,wrongDirection,tooFar,otherWorks,quiet,persistent,
    unequip,reEquip,dropped,played};
 })()`);
 for(const [key,val] of Object.entries(cutting))
   if(key!=='played')assert(val,key+': '+JSON.stringify(cutting));
 // Els soldats es poden veure i disparar darrere d'una filferrada,
 // però la col·lisió física i la destrucció amb vehicles són intactes.
 const physics=game.run(`(()=>{
  const x=H-160,z=H-190;
  const w=barbedSection(x-3,z,x+3,z);
  const physical=wallCandidates(x,z,1).includes(w)&&w.barbed&&w.rammable;
  const hp=w.hp;
  dmgW(w,100);const ramDestroyed=!Wl.includes(w);
  return {physical,ramDestroyed,hp};
 })()`);
 assert(physics.physical&&physics.ramDestroyed);
 // Comprovam que la caiguda amb paracaigudes no ha recuperat cap arma.
 game.run(`(()=>{
  playerFall={y:Math.max(110,P.y+85),vy:-3,vx:0,vz:0,startHeight:100,t:0,
    parachute:true};
  pl.userData.cisalla.visible=true;
 })()`);
 game.frame(16);
 const air=game.run("({tool:pl.userData.cisalla.visible,gun:pl.userData.gun.visible,shoulder:pl.userData.ar.rotation.x})");
 assert(!air.tool&&!air.gun&&air.shoulder>2.2,
   'airborne model hides cisalla and pistol '+JSON.stringify(air));
 console.log('PASS: wire penetrated by light rounds, explosives destroy, silent shear cuts, hangar pickups, inventory and parachute',
  JSON.stringify({shooting,cutting,physics,air}));
})().catch(err=>{console.error(err);process.exitCode=1});