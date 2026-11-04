import assert from 'node:assert/strict';
import {
  createTowerModel,towerGuardPosition,towerGuardInView,towerTurnHeading,
  TOWER_GUARD_FLOOR_Y,TOWER_GUARD_SPACING,TOWER_GUARD_RANGE,
  TOWER_GUARD_SCAN_SPEED
} from '../src/tower-model.mjs';

class Group {
  constructor(){this.children=[];this.userData={};}
  add(child){this.children.push(child);}
}
const fakeTHREE={Group};
const parts=[];
const box=(parent,width,height,depth,color,x,y,z,finish)=>{
  const mesh={geometry:{parameters:{width,height,depth}},position:{x,y,z},color,finish};
  parent.add(mesh);parts.push(mesh);return mesh;
};
const model=createTowerModel(fakeTHREE,{box});
const slots=model.userData.towerGuardSlots;
assert.equal(slots.length,2,'two independently occupied cabin slots');
assert.equal(model.userData.towerLegMeshes.length,4,'four structural supports remain');
assert.equal(model.userData.towerTurret,undefined,'no autonomous gun-mount mesh');
const p0=towerGuardPosition({x:100,y:6,z:-20},0);
const p1=towerGuardPosition({x:100,y:6,z:-20},1);
assert.equal(p0.y,6+TOWER_GUARD_FLOOR_Y);
assert.equal(p1.y,p0.y);
assert.equal(p1.x-p0.x,2*TOWER_GUARD_SPACING,'soldiers have separate positions');
assert.ok(p1.x-p0.x>2.5,'two real full-size character rigs fit beside each other');
const deck=parts.find(v=>v.geometry.parameters.width===6.4&&v.geometry.parameters.height===.44);
const roof=parts.find(v=>v.geometry.parameters.width===6.95&&v.geometry.parameters.height===.32);
assert.ok(deck&&roof&&roof.position.y-TOWER_GUARD_FLOOR_Y>3.7,
  'cabin has full standing clearance and cover over both soldiers');
assert.equal(towerGuardInView(0,0,-30),true,'front is visible');
assert.equal(towerGuardInView(0,20,-30),true,'a target within 60 degrees is visible');
assert.equal(towerGuardInView(0,30,0),false,'side target is not visible without scanning');
assert.equal(towerGuardInView(0,0,30),false,'rear cannot be detected omnisciently');
assert.equal(towerGuardInView(0,0,-TOWER_GUARD_RANGE-1),false,'limited range');
let angle=0;
for(let i=0;i<60;i++)angle=towerTurnHeading(angle,-Math.PI/2,1/60);
assert.ok(angle<-.9&&angle>-(Math.PI/2),'guards turn gradually, without snapping');
assert.ok(TOWER_GUARD_SCAN_SPEED>0&&TOWER_GUARD_SCAN_SPEED<1,
  'idle vigilance is a slow continuous sweep');
console.log('Tower sentries: model, independent slots, sight cone and rotation OK');
