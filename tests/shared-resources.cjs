const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const T=await import('../vendor/three-r186.module.mjs');
 const {createTruckModel}=await import('../src/truck-model.mjs');
 const {createCivilianCarModel}=await import('../src/civilian-car-model.mjs');
 const window={HUNTER_TRUCK_CONCEPT:createTruckModel,HUNTER_CIVIL_C1A:createCivilianCarModel};
 for(const path of ['src/shared-resources.js','src/player-batching.js','src/vehicles.js'])vm.runInNewContext(fs.readFileSync(path,'utf8'),{window,console,Math});
 const material=c=>new T.MeshStandardMaterial({color:c});
 const box=(parent,w,h,d,c,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);parent.add(m);return m};
 const create=window.HUNTER_VEHICLES.createFactory(T,{box,material,shadows:false});
 for(const type of ['camio','cotxe_civil']){
  const a=create(type),b=create(type),first=a.userData.wheels[0],second=b.userData.wheels[0];
  assert.notEqual(first,second);first.rotation.x=1;assert.equal(Math.abs(second.rotation.x),0);
  assert(a.getObjectById(first.id));assert(b.getObjectById(second.id));
  const ma=[],mb=[];a.traverse(o=>{if(o.isMesh)ma.push(o)});b.traverse(o=>{if(o.isMesh)mb.push(o)});
  assert.equal(ma.length,mb.length);
  ma.forEach((m,i)=>{assert.equal(m.geometry,mb[i].geometry);assert.equal(m.material,mb[i].material)});
  let disposed=0;ma[0].geometry.addEventListener('dispose',()=>disposed++);
  window.HUNTER_RESOURCES.dispose(a);assert.equal(disposed,0);
  const c=create(type);assert.equal(Math.abs(c.userData.wheels[0].rotation.x),0);
 }
 const transient=new T.Mesh(new T.BoxGeometry(),material(0));let released=0;
 transient.geometry.addEventListener('dispose',()=>released++);transient.material.addEventListener('dispose',()=>released++);
 window.HUNTER_RESOURCES.dispose(transient);assert.equal(released,2);
 console.log('PASS: reusable vehicle templates, independent wheel rigs and resource ownership');
})().catch(e=>{console.error(e);process.exitCode=1});
