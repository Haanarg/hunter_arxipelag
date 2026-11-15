// Ka-60 A definitiu, geometria nativa aprovada.
import {createKamovCandidate} from './kamov-reference-candidates.mjs?rev=kamov-20261115-cockpit-body-panels-13';
export const KA60_RUNTIME_ID='ka60-a-cockpit-body-13';
export const KA60_WORLD_SCALE=2;
export function createKa60Runtime(THREE,{vehicleScale=1}={}){
 if(!Number.isFinite(vehicleScale)||vehicleScale<=0)throw Error('Escala Ka-60 invàlida');
 const model=createKamovCandidate(THREE,'ka60-a');
 // No multiplicar de nou l'escala explícita x2 del candidat.
 model.scale.setScalar(KA60_WORLD_SCALE/vehicleScale);
 model.name='Kamov Ka-60 · variant A definitiva';
 const main=model.children.find(o=>o.userData.kamovRotor?.axis==='y');
 const tail=model.children.find(o=>o.userData.kamovRotor?.axis==='x');
 if(!main||!tail)throw Error('Falten pivots independents del Ka-60');
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model,true);
 Object.assign(model.userData,{
  ka60Model:KA60_RUNTIME_ID,rotor:main,tailRotor:tail,cockpitSeatCount:2,roundWheelCount:3,
  skidContactHeight:Math.abs(bounds.min.y)<1e-5?0:bounds.min.y,
  rotorContactHeight:main.position.y*model.scale.y,
  worldScale:KA60_WORLD_SCALE
 });
 return model;
}
