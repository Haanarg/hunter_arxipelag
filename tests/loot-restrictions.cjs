const assert=require('node:assert/strict');
(async()=>{
  for(const [seed,scale] of [['12345',1],['67',1],['675',2]]){
    const g=await require('./harness.cjs')();
    g.start(seed,scale);
    const result=g.run(`(()=>{
      const checks=[],isInside=(i,b)=>Math.abs(i.x-b.x)<b.w/2&&Math.abs(i.z-b.z)<b.d/2;
      const complexes=world.userData.compounds,polvorins=complexes.filter(c=>c.id==='polvori'),
        hangars=complexes.filter(c=>c.id==='hangar'),workshops=B.filter(b=>b.compound==='hangar'&&b.layoutBuilding==='workshop');
      const check=(ok,label)=>{if(!ok)checks.push(label)};
      check(polvorins.length>0,'missing polvorí');
      check(hangars.length>0,'missing hangar');
      check(workshops.length>0,'missing workshop');
      check(items.some(i=>i.t==='franctirador'),'guaranteed sniper missing');
      for(const kind of ['mapa','mapa_heli','mapa_tanc'])
        check(items.some(i=>i.t===kind),'guaranteed '+kind+' missing');
      for(const it of items){
        check(!itemInsideHangar(it.x,it.z),'pickup inside hangar: '+it.t);
        if(LOOT_MAPS.has(it.t)){
          for(const c of polvorins)for(const b of c.buildings)
            check(!isInside(it,b),'map inside polvorí '+it.t);
        }
        if(LOOT_WEAPONS.has(it.t)){
          for(const b of workshops)check(!isInside(it,b),'weapon inside workshop '+it.t);
        }
      }
      for(const c of polvorins){
        check(!c.loot.some(it=>LOOT_MAPS.has(it.t)),'fixed polvorí map');
        for(const kind of ['arma','granada','expl','bazooka','franctirador'])
          check(c.loot.some(it=>it.t===kind),'missing fixed polvorí equipment '+kind);
      }
      for(const c of hangars){
        check(c.loot.some(it=>it.t==='arma'),'no ammunition in workshop');
        check(!c.loot.some(it=>LOOT_WEAPONS.has(it.t)),'fixed workshop weapon');
        check(!c.loot.some(it=>itemInsideHangar(it.x,it.z)),'fixed hangar pickup');
      }
      const hangar=B.find(b=>b.hangar),workshop=workshops[0],polvori=polvorins[0].buildings[0],
        count=items.length;
      for(const type of Object.keys(IT)){
        check(addIt(type,hangar)===null,'addIt allowed '+type+' inside hangar');
      }
      for(const type of LOOT_MAPS)check(addIt(type,polvori)===null,'addIt allowed '+type+' in polvorí');
      for(const type of LOOT_WEAPONS)check(addIt(type,workshop)===null,'addIt allowed '+type+' in workshop');
      check(items.length===count,'forbidden insertion modified items array');
      for(const type of Object.keys(IT)){
        check(addItemAt(type,hangar.x,hangar.z,hangars[0].id)===null,'addItemAt allowed '+type+' inside hangar');
      }
      check(addItemAt('mapa',polvori.x,polvori.z,'polvori')===null,'fixed placement allowed polvorí map');
      check(addItemAt('bazooka',workshop.x,workshop.z,'hangar')===null,'fixed placement allowed workshop weapon');
      check(items.length===count,'forbidden fixed placement modified items array');
      check(lootAllowed('arma',workshop),'workshop must allow ammunition');
      check(lootAllowed('cisalla',workshop),'workshop must allow tools');
      check(lootAllowed('bazooka',polvori),'polvorí must allow bazooka');
      return {checks,seed,scale,polvorins:polvorins.length,hangars:hangars.length,
        mapCounts:items.reduce((acc,it)=>(LOOT_MAPS.has(it.t)&&(acc[it.t]=(acc[it.t]||0)+1),acc),{}),
        workshopAmmo:hangars.reduce((n,c)=>n+c.loot.filter(it=>it.t==='arma').length,0),
        totalPickups:items.length};
    })()`);
    assert.deepEqual(Array.from(result.checks),[],JSON.stringify(result));
    console.log('PASS LOOT_RESTRICTIONS',JSON.stringify(result));
  }
})().catch(e=>{console.error(e);process.exitCode=1});
