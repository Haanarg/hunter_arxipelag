const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.resolve(__dirname,'..');global.window=global;
 for(const p of['palette','player-model','characters','buildings','vehicles'])require(path.join(root,'src',p+'.js'));
 const T=await import('../vendor/three-r186.module.mjs');
 const {compoundLayouts}=await import('../src/compound-layouts.mjs');
 const {createCompoundConcept}=await import('../src/compound-concepts.mjs');
 const {phase2Layouts}=await import('../src/compound-phase2-layouts.mjs');
 for(const layout of [...compoundLayouts,...phase2Layouts]){
  const model=createCompoundConcept(layout);let meshes=0,triangles=0;
  model.root.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position;assert([...p.array].every(Number.isFinite));triangles+=(o.geometry.index?o.geometry.index.count:p.count)/3});
  assert(meshes>100);assert.equal(model.root.children.filter(o=>o.userData.previewVehicle).length,layout.vehicles.length);
  for(const v of layout.vehicles){const hb=HUNTER_VEHICLES.hitboxes[v.t],scale=HUNTER_VEHICLES.scales[v.t],hw=hb[0]*scale/2,hd=hb[1]*scale/2;
    for(const b of layout.buildings){if(b.hangar&&v.t==='tanc'){assert(Math.abs(v.x-b.x)+hw<b.w/2);continue}assert(Math.abs(v.x-b.x)>hw+b.w/2||Math.abs(v.z-b.z)>hd+b.d/2,'vehicle/building separation')}
  }
  // Patrol segments must not cross any building footprint, with 1 m body clearance.
  for(let i=1;i<layout.patrol.length;i++){const a=layout.patrol[i-1],b=layout.patrol[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2);for(let k=0;k<=n;k++){const x=a[0]+(b[0]-a[0])*k/n,z=a[1]+(b[1]-a[1])*k/n;for(const building of layout.buildings)assert(Math.abs(x-building.x)>=building.w/2+1||Math.abs(z-building.z)>=building.d/2+1,layout.id+' patrol intersects '+building.id)}}
  if(layout.id==='ammo-proposal')assert(model.root.children.some(o=>o.userData.previewLoot==='bazooka'),'guaranteed bazooka is present');
  if(layout.helipad){const p=layout.helipad;for(const b of layout.buildings){const dx=Math.max(0,Math.abs(b.x-p.x)-b.w/2),dz=Math.max(0,Math.abs(b.z-p.z)-b.d/2);assert(Math.hypot(dx,dz)>p.clearRadius,'rotor clearance')}}
  assert(model.roofs.length>=layout.buildings.length);assert(!model.overlays.visible);
  console.log(layout.id,meshes,'meshes',Math.round(triangles),'triangles');
 }
 console.log('Compound geometry, vehicles and patrol clearances passed');
})().catch(e=>{console.error(e);process.exitCode=1});
