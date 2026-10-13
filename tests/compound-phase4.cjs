const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 global.window=global;global.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
 for(const p of ['palette','player-model','characters','general-model','buildings','vehicles','explosive-visuals'])require(path.resolve(__dirname,'../src/'+p+'.js'));
 const {phase4Layouts,compoundVariants}=await import('../src/compound-phase4-layouts.mjs');
 const {compoundLayouts}=await import('../src/compound-layouts.mjs');
 const {createCompoundConcept}=await import('../src/compound-concepts.mjs');
 assert.equal(phase4Layouts.length,21);assert.equal(new Set(phase4Layouts.map(l=>l.id)).size,21);
 assert.equal(compoundLayouts.length,8,'drafts must not enter the runtime catalogue');
 for(const original of compoundLayouts){const variants=compoundVariants.filter(l=>l.type===original.id);assert.equal(variants.length,2);for(const v of variants)for(const item of original.loot)assert(v.loot.some(p=>p.kind===item.kind),'preserve '+item.kind)}
 const errors=[];
 for(const l of phase4Layouts){
  const model=createCompoundConcept(l);let meshes=0;
  model.root.traverse(o=>{if(o.isMesh){meshes++;assert([...o.geometry.attributes.position.array].every(Number.isFinite),l.id+' finite geometry')}});
  assert(meshes>50);assert.equal(model.root.children.filter(o=>o.userData.previewVehicle).length,l.vehicles.length);
  for(let i=0;i<l.buildings.length;i++)for(const b of l.buildings.slice(i+1)){const a=l.buildings[i];if(Math.abs(a.x-b.x)<(a.w+b.w)/2+2&&Math.abs(a.z-b.z)<(a.d+b.d)/2+2)errors.push(l.id+' buildings '+a.id+'/'+b.id)}
  for(const v of l.vehicles){const [w,d]=HUNTER_VEHICLES.hitboxes[v.t],scale=HUNTER_VEHICLES.scales[v.t],c=Math.abs(Math.cos(v.hd)),s=Math.abs(Math.sin(v.hd)),hw=(w*c+d*s)*scale/2,hd=(w*s+d*c)*scale/2;
   for(const b of l.buildings){if(b.hangar&&v.t==='tanc')continue;if(Math.abs(v.x-b.x)<hw+b.w/2&&Math.abs(v.z-b.z)<hd+b.d/2)errors.push(l.id+' vehicle '+v.t+'/'+b.id)}
  }
  for(const r of [...l.routes,...(l.vehiclePatrols||[]),{points:l.patrol,width:2}])for(let i=1;i<r.points.length;i++){
   const a=r.points[i-1],b=r.points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])));
   for(let k=0;k<=n;k++){const x=a[0]+(b[0]-a[0])*k/n,z=a[1]+(b[1]-a[1])*k/n;for(const block of l.buildings){if(l.throughBuildings?.includes(block.id))continue;if(Math.abs(x-block.x)<block.w/2+.5&&Math.abs(z-block.z)<block.d/2+.5){errors.push(l.id+' route '+r.label+'/'+block.id);k=n+1;break}}}
  }
  if(l.helipad){const p=l.helipad;for(const b of [...l.buildings,...(l.tower?[{...l.tower,w:6,d:6}]:[])]){const dx=Math.max(0,Math.abs(b.x-p.x)-b.w/2),dz=Math.max(0,Math.abs(b.z-p.z)-b.d/2);assert(Math.hypot(dx,dz)>p.clearRadius,l.id+' rotor reserve')}}
  if(l.type==='outpost')assert.equal(l.entrances.length,2);
  if(l.type==='hq'){assert(!l.vehicles.some(v=>v.t==='tanc'));assert.equal(l.towers.length,4);assert(l.buildings.some(b=>b.bunker));assert.equal(l.soldiers.length,8)}
  if(l.friendly)assert.equal(l.soldiers.length,0);
  const geometries=new Set(),materials=new Set();model.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
  console.log(l.id,meshes,'meshes');
 }
 assert.deepEqual([...new Set(errors)],[],'layout clearances');
 console.log('PASS: 21 designs, 16 variants, guaranteed loot, geometry and clearances; runtime unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
