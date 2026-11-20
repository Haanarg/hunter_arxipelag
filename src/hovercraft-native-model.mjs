// Hovercraft D: dimensions del casc aprovades, ventilador rotatiu circular.
// La maqueta es descriu en coordenades canòniques i la mida del casc
// s'integra en cada malla sense deixar una transformació no uniforme.
// És important NO estirar el ventilador en X: gira al pla XY i qualsevol
// corrector global el torna ovalat quan canvia l'angle de les pales.
import {createHovercraftConcept,hovercraftConcepts} from './hovercraft-concepts.mjs';

export const HOVERCRAFT_D_NATIVE_AXES=Object.freeze({x:1.28,y:1,z:1.20});

export function createNativeHovercraftD(T){
 const craft=createHovercraftConcept(T,hovercraftConcepts[3]);
 const bodyAxis=new T.Vector3(HOVERCRAFT_D_NATIVE_AXES.x,1,HOVERCRAFT_D_NATIVE_AXES.z);
 const fanAxis=new T.Vector3(1,1,HOVERCRAFT_D_NATIVE_AXES.z);
 const hullMatrix=new T.Matrix4().makeScale(...bodyAxis.toArray());
 const fanMatrix=new T.Matrix4().makeScale(...fanAxis.toArray());
 let processedMeshes=0,roundMeshes=0;
 const transform=(node,withinRotor=false)=>{
  const isRotor=withinRotor||node.userData.hoverFanRotor===true;
  if(node.isMesh){
   const round=isRotor||Boolean(node.userData.hoverFanCircular);
   const size=round?fanAxis:bodyAxis;
   const scaleMatrix=round?fanMatrix:hullMatrix;
   // M és la transformació local de la malla SENSE translació.
   // M^-1 * S * M conserva exactament la rotació i les deformacions
   // artístiques de primitives (com el tap de l'eix del ventilador).
   // Les possibles cisalles s'integren als vèrtexs, no al renderer.
   const M=new T.Matrix4().compose(
    new T.Vector3(),node.quaternion.clone(),node.scale.clone());
   const warp=M.clone().invert().multiply(scaleMatrix).multiply(M);
   node.geometry=node.geometry.clone();
   node.geometry.applyMatrix4(warp);
   node.position.multiply(size);
   ++processedMeshes;
   if(round)++roundMeshes;
  }else if(node!==craft){
   // Els punts del rotor i els pivots dels seients es converteixen una
   // sola vegada; no hereten una escala de pare durant l'animació.
   node.position.multiply(bodyAxis);
  }
  for(const child of node.children)transform(child,isRotor);
 };
 transform(craft);
 for(const pos of craft.userData.seatStations)pos.multiply(bodyAxis);
 craft.userData.steeringStation.multiply(bodyAxis);
 craft.userData.hovercraftNativeDimensions=true;
 craft.userData.hovercraftRoundFan=true;
 craft.userData.hovercraftAxes=HOVERCRAFT_D_NATIVE_AXES;
 craft.userData.hovercraftNativeMeshCount=processedMeshes;
 craft.userData.hovercraftRoundMeshCount=roundMeshes;
 if(craft.scale.toArray().some(v=>Math.abs(v-1)>1e-10)||
    craft.userData.rotors.length!==1||roundMeshes<10)
  throw Error('Hovercraft D amb ventilador no normalitzat');
 return craft;
}
