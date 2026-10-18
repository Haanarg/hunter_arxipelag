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
      return {errors,variant:sub.variant};
    })()`);
    assert.equal(result.errors.length,0,seed+': '+result.errors.join(','));
    seen.add(result.variant);
  }
  assert(seen.size>1,'At least two seeds should select different basement variants');
  console.log('Búnquer: planta original, soterrani, escales, general, soldats d’elit i variants OK');
})().catch(e=>{console.error(e);process.exitCode=1});
