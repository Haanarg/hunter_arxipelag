// Hunter: Arxipèlag — final Humvee D3.1 at 175%, procedural method B.
// No GLB or network model download during game startup: positions, normals,
// UVs, wheel nodes, materials and the embedded PNG atlas come from JS data.
// The approved geometry is preserved in the procedural JavaScript data.
import {loadHumveeMethodB} from './humvee-procedural-models.mjs?v=0.5.73';

export const HUNTER_HUMVEE_GAME_SCALE=1.75;
export const HUNTER_HUMVEE_RENDERER='procedural-B';
const EXPECTED_BODY_TRIANGLES=1686;
const EXPECTED_RENDER_TRIANGLES=2894;
const EXPECTED_WHEELS=4;
const DEFAULT_VEHICLE_SCALE=1.3;
const WHEEL_RADIUS=.5*HUNTER_HUMVEE_GAME_SCALE;

function expect(condition,message){
 if(!condition)throw new Error('Humvee procedural B: '+message);
}

// Same wheel animation interface as the previous GLB implementation:
// the game's animator rolls wheels around X and steers the front axles in Y.
function rigWheels(THREE,root){
 const wheelNodes=[];
 root.traverse(child=>{
  if(child.userData?.wheel)wheelNodes.push(child);
 });
 expect(wheelNodes.length===EXPECTED_WHEELS,'falten les quatre rodes');
 const rolling=[],steering=[];
 for(const wheel of wheelNodes){
  const parent=wheel.parent;
  const center=wheel.position.clone();
  const steeringJoint=new THREE.Group();
  steeringJoint.position.copy(center);
  steeringJoint.name='humvee-steering-'+wheel.name;
  parent.add(steeringJoint);
  const rollingJoint=new THREE.Group();
  rollingJoint.name='humvee-rolling-'+wheel.name;
  steeringJoint.add(rollingJoint);
  parent.remove(wheel);
  wheel.position.set(0,0,0);
  rollingJoint.add(wheel);
  rollingJoint.userData.radius=WHEEL_RADIUS;
  rolling.push(rollingJoint);
  if(wheel.userData.front)steering.push(steeringJoint);
 }
 expect(steering.length===2,'la direcció ha de controlar les dues rodes davanteres');
 root.userData.wheels=rolling;
 root.userData.steeringPivots=steering;
}

export async function prepareHumveeD31Runtime(THREE,{vehicleScale=DEFAULT_VEHICLE_SCALE}={}){
 expect(Number.isFinite(vehicleScale)&&vehicleScale>0,
  'factor d’escala del cotxe incorrecte');

 // Geometry and texture are decoded exactly once by the procedural-B factory,
 // and all game car instances share the resulting BufferGeometry/materials.
 const procedural=await loadHumveeMethodB(THREE);
 expect(procedural.meta?.triangles===EXPECTED_RENDER_TRIANGLES,
  'la geometria del D3.1 no coincideix amb els triangles aprovats');
 const template=procedural.create();
 const wheels=[];
 template.traverse(object=>{if(object.userData?.wheel)wheels.push(object)});
 expect(wheels.length===EXPECTED_WHEELS&&wheels.filter(w=>w.userData.front).length===2,
  'la jerarquia de rodes no coincideix amb el model aprovat');
 const bbox=new THREE.Box3().setFromObject(template);
 const size=bbox.getSize(new THREE.Vector3());
 expect(size.x>3&&size.x<7&&size.z>6&&size.z<10,
  'dimensions del Humvee fora del rang: '+size.x.toFixed(2)+' × '+size.z.toFixed(2));
 let instances=0;

 return Object.freeze({
  name:'Humvee D3.1 · procedural B',
  renderer:HUNTER_HUMVEE_RENDERER,
  scale:HUNTER_HUMVEE_GAME_SCALE,
  bodyTriangles:EXPECTED_BODY_TRIANGLES,
  renderedTriangles:EXPECTED_RENDER_TRIANGLES,
  dimensions:Object.freeze({width:size.x,height:size.y,length:size.z}),
  drawCalls:procedural.meta.drawCalls,
  create(){
   // The vehicle factory scales the outer group by VS.cotxe=1.3.
   // Compensate here: actual displayed dimensions remain exactly 175%.
   const car=procedural.create();
   car.scale.setScalar(1/vehicleScale);
   rigWheels(THREE,car);
   car.userData.humveeModel='D3.1';
   car.userData.humveeGameScale=HUNTER_HUMVEE_GAME_SCALE;
   car.userData.humveeRenderer=HUNTER_HUMVEE_RENDERER;
   car.name='Humvee_D3.1_procedural_B_'+(++instances);
   return car;
  }
 });
}
