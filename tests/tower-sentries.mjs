import assert from 'node:assert/strict';
import {
  createTowerModel,towerGuardPosition,towerGuardInView,towerTurnHeading,
  TOWER_GUARD_FLOOR_Y,TOWER_GUARD_SPACING,TOWER_GUARD_RANGE,
  TOWER_GUARD_SCAN_SPEED,TOWER_SIDE_PARAPET_HEIGHT,
  towerParapetVolumes,towerParapetBlocksShot
} from '../src/tower-model.mjs';
import {createAimSelector,weaponTargetPriority} from '../src/aiming-core.mjs';
import {segmentAabbT} from '../src/combat-rules.mjs';

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
assert.ok(Math.abs((p1.x-p0.x)-2*TOWER_GUARD_SPACING)<1e-9,'soldiers have separate positions');
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
for(let i=0;i<30;i++)angle=towerTurnHeading(angle,-Math.PI/2,1/60);
assert.ok(angle<-.9&&angle>-(Math.PI/2),'guards turn gradually, without snapping');
assert.ok(TOWER_GUARD_SCAN_SPEED>0&&TOWER_GUARD_SCAN_SPEED<1,
  'idle vigilance is a slow continuous sweep');
// Quatre parapets de la mateixa alçada: laterals, façana i part posterior.
// La geometria física ha de reproduir el model visual, també en COOP.
const parapets=towerParapetVolumes();
assert.equal(model.userData.towerParapetMeshes.length,4);
assert.equal(parapets.length,4);
assert.ok(parapets[0].x<0&&parapets[1].x>0);
assert.ok(parapets[2].z<0&&parapets[3].z>0);
assert.ok(parapets.every(w=>w.height===parapets[0].height&&w.y===parapets[0].y),
  'els quatre parapets tenen la mateixa alçada i coronament');
assert.equal(parts.filter(mesh=>mesh.color===0x7c2f2f).length,4,
  'el model ja no té plafons baixos separats als costats de la façana');
assert.ok(TOWER_SIDE_PARAPET_HEIGHT>2.2,'parets altes que cobreixen el cos');
for(const [i,wall] of parapets.entries()){
  const mesh=model.userData.towerParapetMeshes[i];
  assert.equal(mesh.geometry.parameters.height,wall.height);
  assert.equal(mesh.position.y,wall.y);
  assert.ok(wall.y+wall.height/2>10.7,'cobreixen el tors dels soldats');
  assert.ok(wall.y+wall.height/2<11.2,'el cap queda visible');
}
for(const wall of parapets){
  const from={x:wall.x*4,y:10,z:wall.z*4},
        to={x:0,y:10,z:0},
        box=[wall.x-wall.width/2,wall.x+wall.width/2,
          wall.y-wall.height/2,wall.y+wall.height/2,
          wall.z-wall.depth/2,wall.z+wall.depth/2];
  assert.ok(segmentAabbT(from.x,from.y,from.z,to.x,to.y,to.z,...box)!==null,
    'el parapet de cada costat protegeix dels trets entrants');
}
const cover={towerParapet:true,towerX:0,towerZ:0,towerBaseY:0};
assert.equal(towerParapetBlocksShot(cover,{x:24,y:2,z:0}),true,
  'els trets entrants topen amb el parapet');
assert.equal(towerParapetBlocksShot(cover,{x:TOWER_GUARD_SPACING,y:10.4,z:.25}),false,
  'els soldats poden disparar cap enfora des de dins');
assert.equal(towerParapetBlocksShot(cover,{x:0,y:2,z:0}),true,
  'els trets des de sota no ignoren el parapet');
assert.equal(towerParapetBlocksShot({}, {x:0,y:10,z:0}),true,
  'els altres murs continuen essent sòlids');
// Prova real del volum que intercepta bales a l'alçada del pit.
const exposedSide=parapets[1],coverBox=[
  exposedSide.x-exposedSide.width/2,exposedSide.x+exposedSide.width/2,
  exposedSide.y-exposedSide.height/2,exposedSide.y+exposedSide.height/2,
  exposedSide.z-exposedSide.depth/2,exposedSide.z+exposedSide.depth/2
];
assert.ok(segmentAabbT(8,10,0,1.43,10,0,...coverBox)!==null,
  'la bala entrant és interceptada a l’altura del pit');
assert.equal(segmentAabbT(8,11.4,0,1.43,11.15,0,...coverBox),null,
  'la zona del cap continua exposada per als trets precisos');
assert.equal(weaponTargetPriority({t:'torre'},'pistol'),3);
assert.equal(weaponTargetPriority({t:'torre'},'sniper'),3);
assert.equal(weaponTargetPriority({t:'torre'},'heavy'),0);
for(const shotClass of ['pistol','assault','sniper','attackCannon','light']){
  const selector=createAimSelector({origin:{x:0,y:0,z:0},
    direction:[0,0,-1],range:200,shotClass,focus:{}});
  selector.consider({t:'torre'},'enemy',0,0,10,-50);
  assert.equal(selector.hasTarget,false,shotClass+' no fixa mai la torre');
  selector.consider({t:'soldat'},'enemy',0,0,11,-50);
  assert.equal(selector.hasTarget,true,shotClass+' sí que pot fixar el defensor');
}
const rocket=createAimSelector({origin:{x:0,y:0,z:0},
  direction:[0,0,-1],range:200,shotClass:'heavy'});
rocket.consider({t:'torre'},'enemy',0,0,10,-50);
assert.equal(rocket.hasTarget,true,'el bazuca pot fixar la torre');

console.log('Tower sentries: model, independent slots, sight cone and rotation OK');
