const assert=require('assert');
(async()=>{
 const g=await require('./harness.cjs')();g.start(process.env.SEED||'12345',Number(process.env.MAP_SCALE||1));
 const result=g.run(`(()=>{
 const issues=[],cs=world.userData.compounds;
 const check=(v,m)=>{if(!v)issues.push(m)};
 for(const id of ['hangar','outpost','port'])check(cs.some(c=>c.id===id),'missing '+id);
 for(const c of cs){
  const tr=compoundTransform(c,c.angle,c.mirror),layout=HUNTER_COMPOUND_LAYOUTS.find(l=>l.id===c.id);
  check(c.buildings.length===2,c.id+' buildings');
  for(const b of c.buildings){
   const door=Dr.find(d=>Math.abs(d.cx-b.x)<=b.hw&&Math.abs(d.cz-b.z)<=b.hd);
   if(!b.hangar)check(!!door&&Math.abs(door.nx+Math.sin(c.angle))<1e-6&&Math.abs(door.nz-Math.cos(c.angle))<1e-6,c.id+' door direction');
   if(b.stair)check(Math.abs(b.stair.nx+Math.sin(c.angle))<1e-6&&Math.abs(b.stair.nz-Math.cos(c.angle))<1e-6,c.id+' stair direction');
  }
  for(const v of c.vehicles){check(V.some(o=>o.t===v.t&&Math.hypot(o.x-v.x,o.z-v.z)<.1),c.id+' missing '+v.t);check(!Wl.some(w=>!w.open&&w.playerBlock!==false&&obbOverlap(vehicleBox(v),enemyWallBox(w))),c.id+' vehicle in wall');}
  for(const u of c.soldiers)check(enemyMoveClear(u,u.x,u.z,u.hd),c.id+' enemy spawn');
  const u={t:'soldat'};
  for(let i=1;i<c.patrol.length;i++){
    const a=c.patrol[i-1],b=c.patrol[i];check(enemySweep(u,...a,...b,0,0,false),c.id+' patrol '+i);
  }
  if(c.id==='outpost'){
    for(const p of[[0,40],[-42,20]]){const [x,z]=tr(...p);check(!Wl.some(w=>w.barbed&&x>w.x0-2&&x<w.x1+2&&z>w.z0-2&&z<w.z1+2),'fence gate blocked')}
    for(const p of[[0,-40],[42,0],[-42,0]]){const [x,z]=tr(...p);check(Wl.some(w=>w.barbed&&x>=w.x0&&x<=w.x1&&z>=w.z0&&z<=w.z1),'missing perimeter fence')}
  }
  if(c.id==='hangar'){
    // Només l'arc posterior: sense l'antic prisma baix ni col·lisió duplicada.
    const b=c.buildings.find(b=>b.hangar),rearWalls=Wl.filter(w=>w.owner===b&&w.hangarRear);
    check(rearWalls.length===1,'hangar must have one rear semicircular wall');
    if(rearWalls.length===1){
      const w=rearWalls[0];
      check(w.m.geometry.type==='ExtrudeGeometry','hangar rear must be an arch, not a rectangular box');
      check(w.parts.length===1&&w.parts[0]===w.m,'arched wall is the only rear destructible part');
      check(w.rammable&&w.hp>0,'arched wall retains collision and damage');
    }
    const rearBox=b.o.children.filter(m=>m.isMesh&&m.geometry.type==='BoxGeometry'&&
      Math.abs(m.position.z+layout.buildings[0].d/2)<1.5&&
      m.geometry.parameters.width>=layout.buildings[0].w*.8&&
      m.geometry.parameters.depth<2);
    check(rearBox.length===0,'obsolete rectangular rear mesh still present');
    const v=c.vehicles[0],route=layout.routes[0].points.map(p=>tr(...p));
    for(let i=1;i<route.length;i++){
      const a=route[i-1],b=route[i],hd=Math.atan2(a[0]-b[0],a[1]-b[1]);
      check(enemySweep(v,...a,...b,hd,hd,false),'tank exit segment '+i);
    }
  }
  if(c.id==='port')for(const x of[-24,24])for(let z=7;z<=48;z+=2){const p=tr(x,z);check(groundAt(...p)>=.85,'dock walking height');check(enemySolidAt(u,...p,0),'dock navigation')}
 }
 for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++)check(Math.hypot(cs[i].x-cs[j].x,cs[i].z-cs[j].z)>cs[i].r+cs[j].r,'compound separation');
 check(V.filter(v=>v.t==='llanxa_coets').length===1,'unique rocket boat');
 return{issues,counts:cs.reduce((a,c)=>(a[c.id]=(a[c.id]||0)+1,a),{}),turns:[...new Set(cs.map(c=>c.angle))],mirrors:[...new Set(cs.map(c=>c.mirror))]};
 })()`);
 console.log(JSON.stringify(result,null,2));assert.equal(result.issues.length,0,'generated layout validation');
})().catch(e=>{console.error(e);process.exitCode=1});
