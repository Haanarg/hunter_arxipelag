import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Instrumentam el mòdul real: els models falsos només compten quantes
// vegades es creen superfícies d'aigua i s'actualitza salut de palmeres.
// Les regressions amb les 16 físiques de vehicle estan a
// tests/native-coop-prediction.cjs.
const source=readFileSync(new URL('../src/native-coop-prediction.mjs',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/gm,'')
 .replace('export function createNativePrediction','function createNativePrediction');
const calls={worlds:0,palms:0,waters:0,steps:0,indices:0,queries:0};
let currentWater=null;
const factory=new Function('stepRangeVehicle','firstVehicleContact','vehicleSpecs',
 'createPlayerSimulation','createStaticWorldAdapter','createCanonicalWater','createNativeVehicleCandidateIndex','structuredClone',
 source+'\nreturn createNativePrediction;')(
 (vehicle,input,dt,tick,world,water)=>{
  calls.steps++;
  assert.strictEqual(water,currentWater,'El vehicle utilitza l’aigua del món vigent');
  vehicle.x+=dt*(input.forward||0);
 },
 ()=>null,
 {hitboxes:{cotxe:[2,4]},scales:{cotxe:1}},
 ({checkpoint})=>({snapshot:()=>({players:checkpoint.players}),accept(){},step(){}}),
 ()=>{calls.worlds++;return {limit:10000,heightAt:()=>0,
  setPalmHealth(){calls.palms++}};},
 ()=>{calls.waters++;return currentWater={surfaceAt:()=>0}},
 vehicles=>{calls.indices++;return {nearby(cx,cz,reach){calls.queries++;return vehicles.filter(v=>Math.hypot(v.x-cx,v.z-cz)<=reach+Math.hypot(2,4)/2);}}},
 structuredClone
);
const state={missionId:'m',tick:0,phase:'relay',status:'running',
 doorRevision:0,removedWalls:[],removedRoofs:[],doors:[],
 palmHealth:[[0,25]],players:[{id:'a',hp:25,acknowledged:0,x:0,y:0,z:0}],
 vehicles:[{id:'car',t:'cotxe',x:0,y:0,z:0,hd:0,
  seats:['a',null],v:0}]
};
const prediction=factory({walls:[],buildings:[]});
prediction.receive(state,'a');
assert.deepEqual([calls.worlds,calls.waters,calls.palms],[1,1,1]);
prediction.sent(1);
prediction.advance(1/30,{forward:1,turn:0,strafe:0});
prediction.advance(1/30,{forward:1,turn:0,strafe:0});
assert.equal(calls.waters,1,'No crear aigua per cada subpas');
assert.equal(calls.steps,2);
assert.equal(calls.indices,1,'Un índex de vehicles per snapshot, no per pas');
assert.equal(calls.queries,2,'Les consultes de col·lisió reutilitzen l’índex');
prediction.receive({...state,tick:3},'a');
assert.equal(calls.indices,2,'Un nou snapshot crea un nou índex');
assert.equal(calls.palms,1,'No aplicar palma intacta en cada delta');
prediction.receive({...state,tick:6,palmHealth:[[0,20]]},'a');
assert.equal(calls.palms,2,'Salut modificada aplica estat nou');
prediction.receive({...state,tick:9,doorRevision:1},'a');
assert.deepEqual([calls.worlds,calls.waters],[2,2],
 'Canvi de geometria obliga a refer superfície canònica');
console.log('native coop prediction cache: water reuse, palm deltas and geometry invalidation passed');
