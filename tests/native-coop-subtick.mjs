import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNativeLocalPresentation} from '../src/native-coop-local-presentation.mjs';

const source=readFileSync(new URL('../src/native-coop-prediction.mjs',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/gm,'')
 .replace('export function createNativePrediction','function createNativePrediction');
const physicsCalls={real:0,preview:0};
const factory=new Function('stepRangeVehicle','firstVehicleContact','vehicleSpecs',
 'createPlayerSimulation','createStaticWorldAdapter','createCanonicalWater',
 'createNativeVehicleCandidateIndex','createNativeWallCandidateIndex',
 'createNativeLocalPresentation','structuredClone',source+'\nreturn createNativePrediction;')(
 (v,input,dt)=>{physicsCalls.preview++;v.x+=12*dt*(input.forward||0);},
 ()=>null,
 {hitboxes:{cotxe:[2,4]},scales:{cotxe:1}},
 ({checkpoint})=>{
  const row=structuredClone(checkpoint),controls=new Map();
  return {
   snapshot:()=>structuredClone(row),
   accept(id,message){controls.set(id,message);return true;},
   step(){
    row.tick++;
    for(const actor of row.players){
     const msg=controls.get(actor.id);
     if(!msg)continue;
     actor.x+=12/30*(msg.input.forward||0);
     actor.hd+=2.2/30*(msg.input.turn||0);
     actor.acknowledged=msg.sequence;
    }
    return structuredClone(row);
   }
  };
 },
 ()=>({limit:2400,heightAt:()=>0,setPalmHealth(){}}),
 ()=>({surfaceAt:()=>0}),
 vehicles=>({nearby:()=>vehicles}),
 walls=>({nearby:()=>walls}),
 createNativeLocalPresentation,
 structuredClone
);
const state=(vehicle=false)=>({missionId:'test',tick:0,phase:'relay',
 status:'running',removedWalls:[],removedRoofs:[],doors:[],palmHealth:[],
 players:[{id:'a',x:0,y:1,z:0,hd:0,hp:25,acknowledged:0,fall:null,swimming:false},
 {id:'b',x:100,y:1,z:0,hd:0,hp:25,acknowledged:0,fall:null,swimming:false}],
 vehicles:vehicle?[{id:'car',t:'cotxe',x:0,y:1,z:0,hd:0,seats:['a',null]}]:[]
});
const move={forward:1,turn:0,strafe:0,run:false};
function checkContinuous(driver){
 const initial=state(driver),prediction=factory({walls:[],buildings:[]});
 prediction.receive(initial,'a');prediction.sent(1);
 let previous=0,max=0,values=[];
 for(let i=0;i<48;i++){
  const pose=prediction.advance(1/240,move);
  const step=pose.x-previous;
  max=Math.max(max,Math.abs(step));
  assert(step>=-0.00001,`Pas enrere a ${i} amb vehicle=${driver}: ${step}`);
  previous=pose.x;values.push(step);
 }
 assert(max<.08,`La càmera no pot avançar a salts de 0.4m: ${max}`);
 assert(values.filter(v=>v>.015).length>=40,
  'La imatge ha de moure’s en la majoria dels frames de 240 Hz');
 assert(Math.abs(previous-2.4)<.06,`Desplaçament total: ${previous}`);
 if(driver){
  assert(Math.abs(prediction.vehicle().x-2.4)<.001,
   'La física del conductor es conserva exactament a 30 Hz');
 }
 return prediction;
}
checkContinuous(false);
checkContinuous(true);
// El canvi de control a mig tick no produeix un salt visual.
{
 const p=factory({walls:[],buildings:[]});p.receive(state(),'a');p.sent(1);
 let before;
 for(let i=0;i<22;i++)before=p.advance(1/240,move).x;
 const after=p.advance(1/240,{...move,forward:0}).x;
 assert(Math.abs(after-before)<.09,
  'Deixar de moure’s a mig tick no ha de sacsejar la càmera');
}
// Una recepció autoritativa tardana no ha d'interrompre el sub-tick.
{
 const p=factory({walls:[],buildings:[]}),first=state();
 p.receive(first,'a');p.sent(1);
 let before;
 for(let i=0;i<25;i++)before=p.advance(1/240,move).x;
 p.receive({...first,tick:3,players:first.players.map(a=>a.id==='a'?
  {...a,x:.95,acknowledged:1}:a)},'a');
 const after=p.advance(0,move).x;
 assert(Math.abs(after-before)<1e-8,'Recepció sense salt visual');
}
console.log('native coop sub-tick: 240 FPS foot and car, continuous pose, input change and snapshot rebase passed');
