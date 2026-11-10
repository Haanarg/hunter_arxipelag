import * as THREE from '../vendor/three-r186.module.mjs';
import {getHoleBrushTarget,closeHoleUnderBrush} from './vehicle-hole-brush.mjs';

// 18 accions amb estat REPARAT a l'informe del 10/11/2026.
// Coordenades XYZ locals del MODEL, no índexs de cara (els índexs
// canvien amb SimplifyModifier i amb les reparacions anteriors).
// Els 5 punts PENDENTS no es tanquen mitjançant geometria inventada.
export const BTR82_CONFIRMED_REPAIRS=Object.freeze([
 {id:1,mesh:'hull_material_0',point:[-.416,1.913,4.681],triangles:3},
 {id:5,mesh:'hull_material_0',point:[.129,1.869,-1.651],triangles:1},
 {id:6,mesh:'turret_material_3',point:[.193,2.347,-1.311],triangles:2},
 {id:7,mesh:'turret_material_3',point:[-.063,2.688,-1.403],triangles:2},
 {id:8,mesh:'turret_material_3',point:[-.061,2.681,-1.403],triangles:2},
 {id:9,mesh:'turret_material_2',point:[-.141,2.433,-1.506],triangles:2},
 {id:10,mesh:'hull_material_0',point:[.615,2.094,-.946],triangles:1},
 {id:11,mesh:'hull_material_0',point:[.175,1.869,-.470],triangles:1},
 {id:12,mesh:'hull_material_0',point:[-.172,2.084,-.502],triangles:1},
 {id:13,mesh:'turret_material_3',point:[-.263,2.692,-.640],triangles:2},
 {id:14,mesh:'turret_material_3',point:[-.257,2.247,-.513],triangles:1},
 {id:15,mesh:'turret_material_3',point:[-.225,2.692,-.640],triangles:2},
 {id:16,mesh:'turret_material_3',point:[-.118,2.577,-.926],triangles:1},
 {id:17,mesh:'turret_material_3',point:[-.051,2.441,-.858],triangles:1},
 {id:18,mesh:'hull_material_0',point:[-.481,1.869,-1.299],triangles:1},
 {id:19,mesh:'hull_material_0',point:[-.714,1.869,-1.359],triangles:1},
 {id:20,mesh:'turret_material_3',point:[-.138,2.717,-.965],triangles:1},
 {id:21,mesh:'hull_material_0',point:[-.295,1.800,-1.855],triangles:1}
]);

export const BTR82_PENDING_REPAIRS=Object.freeze([
 {id:2,mesh:'turret_material_3',point:[.393,2.246,-.716]},
 {id:3,mesh:'hull_material_0',point:[-1.062,2.020,-1.523]},
 {id:4,mesh:'hull_material_0',point:[-1.194,1.992,-1.511]},
 {id:22,mesh:'turret_material_3',point:[-.231,2.829,-.561]},
 {id:23,mesh:'turret_material_3',point:[-.231,2.803,-.526]}
]);

// Reprodueix únicament una reparació si encara existeix una aresta
// lliure compatible, el centre coincideix i el nombre de cares és exacte.
// Així no es confon una cara nova de la simplificació amb la de l'usuari.
export function applyBtr82ConfirmedRepairs(scene){
 const applied=[],skipped=[];
 scene.updateMatrixWorld(true);
 for(const mark of BTR82_CONFIRMED_REPAIRS){
  const mesh=scene.getObjectByName(mark.mesh);
  if(!mesh?.isMesh||!mesh.geometry?.index){
   skipped.push({id:mark.id,reason:'malla absent'});continue;
  }
  const expectedCenter=new THREE.Vector3(...mark.point);
  const worldPoint=scene.localToWorld(expectedCenter.clone());
  const target=getHoleBrushTarget(mesh,worldPoint,.65);
  if(!target){
   skipped.push({id:mark.id,reason:'contorn no localitzat'});continue;
  }
  const foundCenter=scene.worldToLocal(mesh.localToWorld(target.center.clone()));
  const error=foundCenter.distanceTo(expectedCenter);
  if(error>.16||target.triangles.length!==mark.triangles){
   skipped.push({id:mark.id,reason:'contorn diferent',error:+error.toFixed(3),
    expected:mark.triangles,found:target.triangles.length});continue;
  }
  const edit=closeHoleUnderBrush(target);
  if(!edit||edit.triangles!==mark.triangles){
   skipped.push({id:mark.id,reason:'no aplicat'});continue;
  }
  applied.push({id:mark.id,mesh:mark.mesh,triangles:edit.triangles});
 }
 const summary={requested:BTR82_CONFIRMED_REPAIRS.length,
  applied:applied.length,triangles:applied.reduce((n,e)=>n+e.triangles,0),
  skipped,details:applied,pending:BTR82_PENDING_REPAIRS.length};
 scene.userData.btr82ConfirmedRepairs=summary;
 return summary;
}
