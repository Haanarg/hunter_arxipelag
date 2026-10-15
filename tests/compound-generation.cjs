const assert=require('node:assert/strict');
(async()=>{
 const {runtimeLayouts}=await import('../src/compound-runtime-layouts.mjs');
 assert(!runtimeLayouts.some(l=>l.type==='road-checkpoint'));
 for(const type of ['base','hq','hangar','outpost','port','heliport','polvori','comunicacions']){
  const variants=runtimeLayouts.filter(l=>l.type===type);assert.equal(variants.length,4,type);
  for(const l of variants)assert.equal(l.buildings.filter(b=>b.floors===2).length,l.variant===4?1:0,l.layoutId);
 }
 for(const l of runtimeLayouts.filter(l=>l.settlement)){assert.equal(l.routes.length,1);assert(new Set(l.buildings.map(b=>b.rotationY)).size>=3)}
 const g=await require('./harness.cjs')();g.run('seedSearchMode=true');g.start(process.env.SEED||'12345');
 const result=g.run(`(()=>{
 const issues=[],check=(v,m)=>{if(!v)issues.push(m)},cs=world.userData.compounds;
 for(const id of ['base','hq','hangar','outpost','port','heliport','polvori','comunicacions','civil-dock','ferry-terminal'])check(cs.some(c=>c.id===id),'missing '+id);
 check(cs.filter(c=>c.id==='ferry-terminal').length===2,'two terminals');check(V.filter(v=>v.t==='ferry').length===2,'two ferries');check(V.filter(v=>v.t==='llanxa_coets').length===1,'one rocket boat');
 check(cs.some(c=>c.layout.settlement),'settlement');check(!cs.some(c=>c.id==='road-checkpoint'),'no checkpoints');check(!!world.userData.baseCoast.points,'base coast route');
 for(const c of cs){
  check(c.buildings.filter(b=>b.floors===2).length===(c.variant===4?1:0),c.layoutId+' storeys');
  for(const b of c.buildings){check(!b.wood||b.roof.userData.branchGable,'hut roof');if(b.wood)check(!b.o.children.some(m=>m.visible&&m.material?.color?.getHex()===0x3e7185),'hut glazing');}
  if(c.id==='polvori'){for(const t of ['bazooka','franctirador'])check(c.loot.some(i=>i.t===t),'polvori '+t);check(!c.loot.some(i=>LOOT_MAPS.has(i.t)),'polvori maps');}
  if(c.id==='comunicacions')for(const t of ['mapa','mapa_heli','mapa_tanc'])check(c.loot.some(i=>i.t===t),'comms '+t);
  for(const v of c.vehicles)check(V.some(o=>o.t===v.t&&Math.hypot(o.x-v.x,o.z-v.z)<.1),c.layoutId+' missing vehicle '+v.t);
 }
 const b=B.find(b=>b.upperFloor);check(!!b,'upper floor coverage');
 if(b){const a=b.interiorStair;let y=b.fy+.3;check(groundAt(b.x,b.z,y)<b.fy+b.storey,'no ground teleport');
  for(let t=1;t>=0;t-=.025){const x=a.x+a.nx*a.length*t,z=a.z+a.nz*a.length*t,next=groundAt(x,z,y);check(Math.abs(next-y)<.5,'stair discontinuity');y=next;}
  check(Math.abs(y-a.top)<.2,'reached upper floor');
  const p=buildingWorldPoint(b,0,0);check(Math.abs(groundAt(p.x,p.z,y)-a.top)<.2,'upper support');
  for(let t=0;t<=1;t+=.025){y=groundAt(a.x+a.nx*a.length*t,a.z+a.nz*a.length*t,y);}check(y<b.fy+1,'descended');
  roofBreak(b);check(upperFloorHeight(b,p.x,p.z,a.top)===null,'destroyed floor support');
 }
 for(const c of cs.filter(c=>c.loadingRamp)){const r=c.loadingRamp,f=r.f;for(const y of [-.25,0,.25]){f.o.position.y=y;const s=terminalRampState(r),x=s.x+s.ux*s.length/2,z=s.z+s.uz*s.length/2;check(Math.abs(terminalRampHeight(x,z)-(s.startY+s.endY)/2)<1e-6,'wave bridge');}
 f.x+=10;check(terminalRampState(r)===null,'bridge retracts');f.x-=10;
 }
 return{issues,sites:cs.map(c=>c.layoutId),buildings:B.length};})()`);
 console.log(JSON.stringify(result,null,2));assert.equal(result.issues.length,0,result.issues.join("; "));
})().catch(e=>{console.error(e);process.exitCode=1});
