const assert=require('node:assert/strict');
(async()=>{
  const game=await require('./harness.cjs')();
  game.start('2407759483');
  const initial=game.run("(()=>{\n    const model=pl,heli=V.find(v=>v.t==='heli'||v.t==='heli_combat');\n    if(!heli)return {found:false};\n    const u=pl.userData;\n    inv.paracaigudes=1;\n    cv=heli;heli.v=16;heli.alt=Math.max(140,hAt(heli.x,heli.z)+100);\n    heli.reentryLockUntil=0;\n    toggle();\n    return {found:true,deployed:!!playerFall?.parachute,mesh:pl===model,\n      canopy:!!parachuteVisual?.parent,gun:!!u.gun,parachutePosition:parachuteVisual?.position.y};\n  })()");
  assert(initial.found&&initial.deployed&&initial.canopy&&initial.gun);
  let anyVisible=false,last;
  for(let i=0;i<45;i++){
    game.frame(16);
    const actual=game.run("(()=>{\n      const u=pl.userData;\n      const equipment=[u.gun,u.knife,u.sniper,u.bazooka,u.grenade],\n        shoulderR=pl.worldToLocal(u.ar.getWorldPosition(new THREE.Vector3())),\n        handR=pl.worldToLocal(u.aer.localToWorld(new THREE.Vector3(0,-.65,0))),\n        shoulderL=pl.worldToLocal(u.al.getWorldPosition(new THREE.Vector3())),\n        handL=pl.worldToLocal(u.ael.localToWorld(new THREE.Vector3(0,-.65,0)));\n      return {fall:!!playerFall,parachute:!!playerFall?.parachute,\n        forwardArmR:u.ar.rotation.x,forwardArmL:u.al.rotation.x,\n        outwardR:u.ar.rotation.z,outwardL:u.al.rotation.z,\n        rightHandZ:handR.z-shoulderR.z,leftHandZ:handL.z-shoulderL.z,\n        visible:equipment.some(e=>e.visible),flash:!!u.pistolFlash?.visible,\n        canopy:!!parachuteVisual?.parent,modelSame:pl.userData===u};\n    })()");
    if(actual.visible||actual.flash)anyVisible=true;
    assert(actual.fall&&actual.parachute&&actual.canopy,'parachute remains active: '+JSON.stringify(actual));
    last=actual;
  }
  assert(!anyVisible,'no pistol/weapon appears during any parachute frame');
  assert(last.forwardArmR>2.2&&last.forwardArmL>2.2,'shoulders rotate FORWARD, not backward: '+JSON.stringify(last));
  assert(last.rightHandZ<-.3&&last.leftHandZ<-.3,'hands remain ahead of shoulders/ropes: '+JSON.stringify(last));
  assert(last.outwardR>0&&last.outwardL<0,'arms are apart towards two parachute lines');
  const touched=game.run("(()=>{\n    playerFall.y=-500;playerFall.vy=-4.8;return true\n  })()");
  game.frame(16);
  const post=game.run("(()=>{\n    return {fall:!!playerFall,canopy:!!parachuteVisual,gun:pl.userData.gun.visible,\n      model:pl.userData.profile,arms:[pl.userData.ar.rotation.x,pl.userData.al.rotation.x]};\n  })()");
  assert(!post.fall&&!post.canopy,'parachute state and dome cleared upon landing '+JSON.stringify(post));
  for(let i=0;i<40;i++)game.frame(16);
  const rest=game.run("(()=>{\n    return {gun:pl.userData.gun.visible,arms:[pl.userData.ar.rotation.x,pl.userData.al.rotation.x],\n      fall:!!playerFall,canopy:!!parachuteVisual};\n  })()");
  assert(rest.gun,'pistol resumes normal state only after landing: '+JSON.stringify(rest));
  assert(rest.arms.every(x=>x<1.2),'arms return to neutral animation '+JSON.stringify(rest));
  const free=game.run("(()=>{\n    playerFall={y:P.y+85,vy:0,vx:0,vz:0,startHeight:85,t:0,spin:1,parachute:false};\n    return true;\n  })()");
  game.frame(16);
  const freeState=game.run("({\n    gun:pl.userData.gun.visible,knife:pl.userData.knife.visible,\n    parachuteVisual:!!parachuteVisual,fall:!!playerFall\n  })");
  assert(freeState.fall&&!freeState.gun&&!freeState.knife&&!freeState.parachuteVisual,
    'free fall also hides weapons safely '+JSON.stringify(freeState));
  console.log('PASS: parachute hands forward, all airborne gear hidden, stable frames, landing restore',JSON.stringify({initial,last,post,rest,freeState}));
})().catch(err=>{console.error(err);process.exitCode=1});
