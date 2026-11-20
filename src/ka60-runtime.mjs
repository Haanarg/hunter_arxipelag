// Ka-60 A definitiu, geometria nativa aprovada.
import {createKamovCandidate} from './kamov-reference-candidates.mjs?rev=kamov-20261115-cockpit-body-panels-13';
import {bakeFixedModelScales} from './model-scale-normalization.mjs';
export const KA60_RUNTIME_ID='ka60-a-cockpit-body-13';
export const KA60_WORLD_SCALE=2;
export function createKa60Runtime(THREE,{vehicleScale=1}={}){
 if(!Number.isFinite(vehicleScale)||vehicleScale<=0)throw Error('Escala Ka-60 invàlida');
 const model=createKamovCandidate(THREE,'ka60-a');
 // La geometria del candidat ja té la mida aprovada x2 i escala 1.
 // VS és una conversió LEGÍTIMA de les unitats locals del vehicle:
 // queda consolidada aquí abans de muntar pilots, sense escalar
 // el conjunt després de crear els seients o les articulacions.
 model.scale.setScalar(1/vehicleScale);
 bakeFixedModelScales(model);
 if(model.scale.x!==1||model.scale.y!==1||model.scale.z!==1)
  throw Error('Ka-60 amb escala visual residual');
 model.name='Kamov Ka-60 · variant A definitiva';
 const main=model.children.find(o=>o.userData.kamovRotor?.axis==='y');
 const tail=model.children.find(o=>o.userData.kamovRotor?.axis==='x');
 if(!main||!tail)throw Error('Falten pivots independents del Ka-60');
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model,true);
 Object.assign(model.userData,{
  ka60Model:KA60_RUNTIME_ID,rotor:main,tailRotor:tail,cockpitSeatCount:2,roundWheelCount:3,
  skidContactHeight:Math.abs(bounds.min.y)<1e-5?0:bounds.min.y,
  rotorContactHeight:main.position.y,
  // El pilot antic anava dins d'un pare escalat. La conversió del
  // seient passa ara a ser explícita i s'aplica al crear el pilot natiu.
  cockpitSeatLocalScale:KA60_WORLD_SCALE/vehicleScale,
  worldScale:KA60_WORLD_SCALE
 });
 return model;
}
