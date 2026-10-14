const assert=require('node:assert/strict');
(async()=>{
 const g=await require('./harness.cjs')();
 g.start('67',1);
 const result=g.run(`(()=>{
   const saved={cv,fcd,over,swimming,bazookaEquipped,grenadeEquipped,sniperEquipped,
     ammo,bazooka:inv.bazooka,shooting:Pj.length};
   const shots={};
   const clear=()=>{for(const p of Pj)world.remove(p.o);Pj.length=0;};
   const tryVehicle=(vehicle,description)=>{
     clear();
     cv=V.find(v=>v.t===vehicle);
     if(!cv)throw new Error('Missing vehicle '+vehicle);
     fcd=0;fire();
     const p=Pj[Pj.length-1];
     shots[description]={type:p?.shotClass,splash:p?.spl,damage:p?.dmg,speed:Math.hypot(p.vx,p.vy,p.vz)};
   };
   try{
     over=0;swimming=false;bazookaEquipped=false;grenadeEquipped=false;sniperEquipped=false;
     tryVehicle('tanqueta','tankette');
     tryVehicle('heli_combat','combatHelicopterGun');
     tryVehicle('tanc','tank');
     tryVehicle('heli','normalHelicopterGun');
     cv=null;clear();fcd=0;bazookaEquipped=true;inv.bazooka=3;fire();
     const r=Pj[Pj.length-1];
     shots.bazooka={type:r?.shotClass,splash:r?.spl,damage:r?.dmg,speed:Math.hypot(r.vx,r.vy,r.vz)};
     clear();cv=null;bazookaEquipped=false;ammo=5;fcd=0;fire();
     const bullet=Pj[Pj.length-1];
     shots.pistol={type:bullet?.shotClass,splash:bullet?.spl,damage:bullet?.dmg,speed:Math.hypot(bullet.vx,bullet.vy,bullet.vz)};
   }finally{
     clear();cv=saved.cv;fcd=saved.fcd;over=saved.over;swimming=saved.swimming;
     bazookaEquipped=saved.bazookaEquipped;grenadeEquipped=saved.grenadeEquipped;
     sniperEquipped=saved.sniperEquipped;ammo=saved.ammo;
     if(saved.bazooka==null)delete inv.bazooka;else inv.bazooka=saved.bazooka;
   }
   return shots;
 })()`);
 for(const type of ['tankette','combatHelicopterGun','pistol'])
   assert.equal(result[type].type,'light',type);
 for(const type of ['tank','normalHelicopterGun','bazooka'])
   assert.equal(result[type].type,'heavy',type);
 assert(result.tank.speed<result.tankette.speed);
 assert(result.tank.damage>result.tankette.damage);
 assert(result.combatHelicopterGun.speed>result.bazooka.speed);
 console.log('PASS weapon classification',JSON.stringify(result));
})().catch(error=>{console.error(error);process.exitCode=1});
