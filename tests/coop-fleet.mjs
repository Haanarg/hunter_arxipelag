import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
import {vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
import {createVehicleView} from '../src/coop-vehicle-view.mjs';
import * as T from '../vendor/three-r186.module.mjs';
const room={id:'fleet',revision:1,seed:67,mapScale:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},g=generateRelayMission(room,{mode:'proving'});
assert.equal(g.record.meta.mode,'proving');assert.equal(g.record.meta.vehicles.length,16);
for(const t of Object.keys(vehicleDynamics.types)){
 const r=structuredClone(g.record),v=r.meta.vehicles.find(v=>v.t===t);r.status='running';r.meta.targets=[];Object.assign(r.checkpoint.players[0],{x:v.x,y:v.y,z:v.z});
 let m=restoreRelayMission(r,g.geometry);assert.equal(m.vehicleCommand('a',{epoch:m.meta.id,vehicleId:v.id,operation:'enter',commandId:'board'}).code,'ENTERED',t+' board');
 for(let tick=0;tick<60;tick++){assert.equal(m.accept('a',{protocol:1,epoch:m.meta.id,sequence:tick+1,input:{forward:1,turn:0,strafe:0,run:false,...(t.startsWith('heli')?{climb:1}:{})},interact:false}),true);m.step();}
 const moved=m.snapshot().vehicles.find(a=>a.id===v.id);assert.ok(Math.hypot(moved.x-v.x,moved.z-v.z)>1,t+' moves');assert.ok([moved.x,moved.y,moved.z,moved.v].every(Number.isFinite),t+' finite');
 if(t.startsWith('heli'))assert.ok(moved.y>v.y+10,t+' flies');
 const saved=m.checkpoint(0);m=restoreRelayMission(saved,g.geometry);assert.deepEqual(m.snapshot().vehicles,saved.vehicles.vehicles,t+' checkpoint');
 for(let i=0;i<12;i++)m.step();assert.equal(m.snapshot().vehicles.find(a=>a.id===v.id).v,0,t+' stale stop');
}
const scene=new T.Scene(),view=await createVehicleView(T,scene);view.update(g.record.meta.vehicles);scene.updateMatrixWorld(true);assert.equal(scene.children.length,16);
for(const model of scene.children){assert.ok(model.children[0].children.length>0);model.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite),'finite model '+model.userData.vehicleId));}
view.update(g.record.meta.vehicles.map(v=>({...v,destroyed:true})));assert.equal(scene.children.length,0);view.destroy();
console.log('all 16 vehicles: authoritative boarding/drive, boat water/shore, helicopter lift, stale stop, checkpoint, original Three models and disposal passed (no GPU)');
