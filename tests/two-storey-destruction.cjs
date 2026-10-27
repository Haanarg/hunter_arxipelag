#!/usr/bin/env node
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 const result=game.run(`(()=>{
   seed=67;R=mul(seed);islands=[];seedSearchMode=false;
   world=new THREE.Group();scene.add(world);B=[];Wl=[];Dr=[];stairs=[];
   const create=(x)=>{
     const b=mkB(x,0,20,20,16,0xa9bdb0,0x79584e,
       {floors:2,doorSide:0,noPartitions:true});
     decorateRuntimeBuilding(b,{w:20,d:20,h:8,floors:2});
     return b;
   };
   const b=create(0),s=b.interiorStair,collider=b.interiorStairCollider,
         upper=b.upperFloor,group=b.interiorStairGroup;
   const initially={
     upper:!!upper&&upper.visible,
     frame:upper.children.filter(o=>o.isMesh).length>=7,
     stair:!!group&&group.visible&&group.children.length>10,
     collider:Wl.includes(collider)&&collider.hp>0&&
       collider.playerBlock===false&&collider.parts.length>10,
     navigation:stairs.includes(s)
   };
   dmgW(collider,collider.hp);
   const afterStair={
     removed:s.destroyed&&!group.visible&&!stairs.includes(s)&&!Wl.includes(collider),
     floorIntact:upper.visible&&!b.rb,
     canClimb:!!stairs.find(o=>o===s)
   };
   const b2=create(45),s2=b2.interiorStair,c2=b2.interiorStairCollider;
   let broken=0;
   for(const w of b2.structuralWalls){
     if(b2.rb)break;
     dmgW(w,w.hp);broken++;
   }
   const afterWalls={
     enough:broken>=3,
     collapsed:!!b2.rb&&!b2.upperFloor.visible,
     noFrame:b2.upperFloor.children.every(o=>!o.visible||!b2.upperFloor.visible),
     noStairs:s2.destroyed&&!b2.interiorStairGroup.visible&&!stairs.includes(s2),
     noHitbox:!Wl.includes(c2)
   };
   return {initially,afterStair,afterWalls};
 })()`);
 for(const [section,entries] of Object.entries(result))for(const [key,pass] of Object.entries(entries))
   assert.equal(pass,section==='afterStair'&&key==='canClimb'?false:true,
     section+': '+key);
 console.log('OK edificis de dos pisos: escala destructible, navegació, forjat i marc sense peces flotants');
})().catch(e=>{console.error(e);process.exitCode=1});
