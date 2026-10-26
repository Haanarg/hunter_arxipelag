#!/usr/bin/env node
// Safeguards for low-risk cleanup after the October 2026 optimisation audit.
// Run manually: node tests/optimization-ui-render-hooks.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'../src/game-core.js'),'utf8');
function segment(from,to){
 const start=src.indexOf(from);
 const end=src.indexOf(to,start);
 assert(start>=0&&end>start,'Missing expected source marker: '+from);
 return src.slice(start,end);
}
{
 const code=segment('const registeredDrawHooks=new WeakMap();',
                    'function terrainConcealsBuilding(');
 const group=(name)=>({
  name,isMesh:false,children:[],parent:null,
  add(child){child.parent=this;this.children.push(child)},
  traverse(fn){fn(this);for(const child of this.children)child.traverse(fn)}
 });
 const world=group('world'),building=group('building'),pl=group('player');
 const mesh={name:'test-window',isMesh:true,userData:{},children:[],parent:null,
  traverse(fn){fn(this)}};
 let previousCalls=0;
 mesh.onBeforeRender=function(){previousCalls++};
 building.add(mesh);world.add(building);
 const B=[{o:building}],V=[],E=[],fa=[],items=[],PM={trunk:null},
  terrainStream=null,renderCategories={edificis:0,vehicles:0,altres:0};
 const shadowRenderCategories={},renderOtherDetails={},
  vehicleDrawTypes={},vehicleDrawParts={},vehicleShadowTypes={},vehicleFleet={};
 const context={world,pl,B,V,E,fa,items,PM,terrainStream,renderCategories,
  shadowRenderCategories,renderOtherDetails,vehicleDrawTypes,vehicleDrawParts,
  vehicleShadowTypes,vehicleFleet,performanceStatsVisible:true,Map,WeakMap};
 vm.runInNewContext(code+';this.registerDrawCategories=registerDrawCategories;',context);
 context.registerDrawCategories();
 const initialHook=mesh.onBeforeRender;
 mesh.onBeforeRender();mesh.onBeforeShadow();
 assert.equal(shadowRenderCategories.edificis,1);
 assert.equal(renderCategories.edificis,1);
 assert.equal(previousCalls,1);
 context.registerDrawCategories();
 assert.strictEqual(mesh.onBeforeRender,initialHook,
  'Repeated world preparation must not nest render callbacks');
 mesh.onBeforeRender();
 assert.equal(renderCategories.edificis,2,'A mesh must count only once per draw');
 assert.equal(previousCalls,2,'Preserve the original animation callback');
 B.length=0;building.userData={vehicleBatchStats:{groups:3}};
 V.push({o:building,t:'cotxe'});
 context.registerDrawCategories();
 mesh.onBeforeRender();mesh.onBeforeShadow();
 assert.equal(vehicleDrawTypes.cotxe,1,'Identify vehicle draw calls by model');
 assert.equal(vehicleDrawParts['cotxe / test-window'],1,'Identify expensive named components');
 assert.equal(vehicleShadowTypes.cotxe,1,'Count vehicle shadow draws separately');
 assert.equal(vehicleFleet.cotxe.count,1);
 assert.equal(vehicleFleet.cotxe.meshes,1);
 assert.equal(vehicleFleet.cotxe.savedMeshes,3);
 assert.equal(vehicleFleet.cotxe.originalMeshes,4);
 assert.equal(renderCategories.vehicles,1,'Existing callbacks must use updated category');
 assert.equal(renderCategories.edificis,2);
 context.performanceStatsVisible=false;context.registerDrawCategories();
 mesh.onBeforeShadow();mesh.onBeforeRender();assert.equal(renderCategories.vehicles,1);
 assert.equal(shadowRenderCategories.vehicles,1,'Shadow hooks are removed when counters hidden');
 assert.equal(previousCalls,4);
 context.performanceStatsVisible=true;context.registerDrawCategories();
 assert.strictEqual(mesh.onBeforeRender,initialHook);
 mesh.onBeforeRender();assert.equal(renderCategories.vehicles,2);
}

{
 const code=segment('function syncWeaponPicker(){',
                    'pickerToggle.onclick=');
 let visible=true,toggleWrites=0,pickerWrites=0;
 const pickerToggle={style:{
  set display(value){this._display=value;toggleWrites++},
  get display(){return this._display}
 }};
 const picker={style:{set display(value){this._display=value;pickerWrites++}}};
 const context={pickerToggle,picker,pickerOpen:true,
  weaponPickerAvailable:()=>visible,
  drawWeaponPicker:()=>{picker.style.display='none'}};
 vm.runInNewContext(code+';this.syncWeaponPicker=syncWeaponPicker;',context);
 context.syncWeaponPicker();context.syncWeaponPicker();
 assert.equal(toggleWrites,1,'Identical visibility must not rewrite the DOM');
 visible=false;context.syncWeaponPicker();context.syncWeaponPicker();
 assert.equal(toggleWrites,2);
 assert.equal(pickerWrites,1);
 assert.equal(context.pickerOpen,false);
 visible=true;context.syncWeaponPicker();
 assert.equal(toggleWrites,3);
 assert.equal(pickerToggle.style.display,'block');
}
{
 const delayed=src.indexOf('uiTick+=dt;if(uiTick>.12){uiTick=0;const nv=cv?null:nearV();');
 assert(delayed>=0,'Find nearby vehicles only on the contextual UI refresh');
 assert.equal((src.match(/syncWeaponPicker\(\);/g)||[]).length,1,
  'The picker must be synchronized just once per animation frame');
}
console.log('OK: idempotent render labels, cached picker UI and throttled nearby vehicle query');
