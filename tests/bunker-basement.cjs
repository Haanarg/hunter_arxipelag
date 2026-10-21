const assert=require('node:assert/strict');
const createGame=require('./harness.cjs');
(async()=>{
  const game=await createGame();game.run('seedSearchMode=true');
  const seen=new Set();
  for(const seed of ['12345','67','91284']){
    game.start(seed);
    const result=game.run(`(()=>{
      const b=B.find(q=>q.kind==='enemy_bunker'),c=world.userData.compounds.find(q=>q.id==='hq');
      const errors=[];if(!b?.basement||!c?.general)return{errors:['missing basement or general']};
      const sub=b.basement,point=(x,z)=>buildingWorldPoint(b,x,z);
      if(Math.abs(c.general.gy-sub.floorY)>.01)errors.push('general not underground');
      if(c.soldiers.filter(u=>u.elite).length!==6)errors.push('elite count');
      if(c.soldiers.filter(u=>u.elite).some(u=>u.rate!==TANKETTE_FIRE_INTERVAL))errors.push('machine gun cadence');
      if(sub.halfX<26||sub.halfZ<22)errors.push('rooms not enlarged');
      if(sub.doors.length!==5||sub.doors.some(d=>!d.bunkerInteriorDoor||
         d.doorHeight>4.5||d.open))errors.push('interior door geometry');
      const st=sub.stair;let previous=b.fy+.22;
      for(let i=0;i<=100;i++){
        const z=st.zTop+(st.zBottom-st.zTop)*i/100,p=point(st.x,z),y=groundAt(p.x,p.z,previous);
        if(Math.abs(y-previous)>.2)errors.push('stair discontinuity');previous=y;
      }
      if(Math.abs(previous-sub.floorY)>.03)errors.push('stair does not reach cellar');
      const landing=point(12,-3.2);
      if(Math.abs(groundAt(landing.x,landing.z,previous)-sub.floorY)>.03)errors.push('basement support');
      const upper=point(-12,0);
      if(Math.abs(groundAt(upper.x,upper.z,b.fy+.2)-(b.fy+.22))>.03)errors.push('upper support');
      const distant=point(-24,20);
      if(Math.abs(groundAt(distant.x,distant.z,sub.floorY)-sub.floorY)>.03)
        errors.push('extended rooms have no floor');
      // Les sales que sobresurten de la planta exterior no són mar.
      if(!playerInsideBunkerBasement(distant.x,distant.z,sub.floorY))
        errors.push('extended basement room is not recognized');
      if(playerInsideBunkerBasement(distant.x,distant.z,b.fy+.3))
        errors.push('upper floors mistaken for basement');
      if(swimming&&!ib)errors.push('unexpected swimming during bunker setup');
      if(!sub.doors.every(d=>d.bunkerBasementWall))
        errors.push('doors missing bunker camera occlusion marker');
      const general=c.general;
      if(!!general.basement){
        const oldE=E;
        E=[general];
        // En el despatx, l'altura del terreny exterior és >= 9 m
        // superior a la del general i no pot alterar la direcció.
        const sx=general.x+2.4,sz=general.z+2.4,sy=general.gy+1.5,
              dx=general.x-sx,dz=general.z-sz,len=Math.hypot(dx,dz),
              focus={},aim=autoAimWeaponShot(sx,sy,sz,dx/len,0,dz/len,
                75,.96,'light',focus);
        E=oldE;
        if(focus.target!==general)
          errors.push('no autoaim lock on underground general');
        else if(Math.abs(aim[1])>.13)
          errors.push('autoaim points towards the outside roof');
      }
      // Comprovam que hi ha espai per girar al peu de l'escala.
      const divider=sub.doors.find(d=>Math.abs(d.cx-b.x-7.5)<.1&&
        Math.abs(d.cz-b.z-(st.zTop>0?16:-16))<.1);
      if(!divider)errors.push('missing access-room divider door');
      const minLanding=Math.min(...Wl.filter(w=>w.bunkerBasementWall&&
        Math.abs(w.cx-b.x-(sub.halfX+7.5-.4)/2)<.15&&
        Math.abs(w.x1-w.x0)>10).map(w=>Math.abs(w.cz-b.z-st.zBottom)));
      if(minLanding<6)errors.push('insufficient stair landing');
      // L'obertura no és una simple desaparició instantània de la porta.
      const d=sub.doors[0],oldX=P.x,oldY=P.y,oldZ=P.z;
      P.x=d.cx;P.y=sub.floorY;P.z=d.cz;
      updateDoors(.65);
      if(!(d.openProgress>0&&d.openProgress<1)||d.open)
        errors.push('sliding door animation missing');
      updateDoors(.65);
      if(!d.open||d.m.position.y<=d.closedLocalY)
        errors.push('sliding door not fully opening');
      P.x=oldX;P.y=oldY;P.z=oldZ;
      return {errors,variant:sub.variant};
    })()`);
    assert.equal(result.errors.length,0,seed+': '+result.errors.join(','));
    seen.add(result.variant);
  }
  assert(seen.size>1,'At least two seeds should select different basement variants');
  console.log('Búnquer: planta original, soterrani, escales, general, soldats d’elit i variants OK');
})().catch(e=>{console.error(e);process.exitCode=1});
