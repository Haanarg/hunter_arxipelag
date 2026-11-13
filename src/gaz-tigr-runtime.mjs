// Model definitiu GAZ Tigr-M: reutilitza la geometria nativa aprovada al laboratori.
// El vehicle manté el tipus 'cotxe', la física, la hitbox i els seients existents.
import {createReferenceVehicle} from './vehicle-reference-candidates.mjs';

export function prepareGazTigrRuntime(THREE,{vehicleScale=1.3}={}){
  const original=createReferenceVehicle(THREE,'tigr-v1');
  original.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(original);
  const dimensions=bounds.getSize(new THREE.Vector3());
  if(!(dimensions.x>1.5&&dimensions.y>1&&dimensions.z>3))
    throw new Error('Dimensions invàlides del GAZ Tigr-M');
  return {
    name:'GAZ Tigr-M · Three.js',
    renderer:'native-three',
    scale:1,
    dimensions:dimensions.toArray(),
    create(){
      const car=original.clone(true);
      car.name='GAZ_Tigr_M';
      const wheels=[],steeringPivots=[];
      const body=car.getObjectByName('Carrosseria GAZ Tigr-M');
      if(!body)throw new Error('Falta la carrosseria del GAZ');
      const wheelGroups=body.children.filter(o=>o.isGroup&&o.name.startsWith('Conjunt roda '));
      if(wheelGroups.length!==4)throw new Error('El GAZ requereix quatre rodes');
      for(const wheel of wheelGroups){
        const front=wheel.position.z<0;
        if(front){
          const steering=new THREE.Group();
          steering.name='Direcció '+wheel.name;
          steering.position.copy(wheel.position);
          body.add(steering);
          wheel.position.set(0,0,0);
          steering.add(wheel);
          steeringPivots.push(steering);
        }
        wheel.userData.radius=.55*vehicleScale;
        wheels.push(wheel);
      }
      car.userData.wheels=wheels;
      car.userData.steeringPivots=steeringPivots;
      car.userData.gazModel='Tigr-M';
      return car;
    }
  };
}
