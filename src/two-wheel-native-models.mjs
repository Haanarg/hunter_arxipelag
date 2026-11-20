// Fàbriques de dimensions natives per a bicicleta i moto aprovades.
// Els factors de la maqueta original només s'apliquen UNA VEGADA durant
// la creació geomètrica. Cap model surt amb escala de grup per corregir.
import {createStreetfighter25} from './streetfighter-25-geometry.mjs';
import {bakeFixedModelScales} from './model-scale-normalization.mjs';

export const TWO_WHEEL_APPROVED_SIZE=Object.freeze({
 motorcycle:1.24,bicycle:.74
});
const markAnchor=(T,parent,name,x,y,z)=>{
 const anchor=new T.Object3D();
 anchor.name=name;anchor.position.set(x,y,z);parent.add(anchor);
 return anchor;
};
function bakeApprovedSize(root,size){
 if(root.scale.x!==1||root.scale.y!==1||root.scale.z!==1)
  throw Error('Model de dues rodes rebut amb escala inicial');
 root.scale.setScalar(size);
 const report=bakeFixedModelScales(root);
 if(root.scale.x!==1||root.scale.y!==1||root.scale.z!==1)
  throw Error('Mida de vehicle no consolidada');
 root.userData.twoWheelApprovedSize=size;
 root.userData.twoWheelGeometryNative=true;
 root.userData.twoWheelScaleReport=report;
 return root;
}
export function createNativeStreetfighter25(T,options={}){
 const model=createStreetfighter25(T,options);
 const steering=model.userData.steeringPivots?.[0];
 if(!steering||model.userData.wheels?.length!==2)
  throw Error('Streetfighter sense forquilla i dues rodes');
 // Els ancoratges neixen al mateix marc que la malla importada i
 // queden cuits a dimensions nadiues JUNTAMENT amb la forquilla.
 model.userData.twoWheelAnchors={
  seat:markAnchor(T,model,'Moto · centre del seient',0,.88,.54),
  gripL:markAnchor(T,steering,'Moto · puny esquerre',-.36,.015,-.075),
  gripR:markAnchor(T,steering,'Moto · puny dret',.36,.015,-.075),
  pedalL:markAnchor(T,model,'Moto · reposapeu esquerre',-.24,.42,.16),
  pedalR:markAnchor(T,model,'Moto · reposapeu dret',.24,.42,.16)
 };
 bakeApprovedSize(model,TWO_WHEEL_APPROVED_SIZE.motorcycle);
 for(const wheel of model.userData.wheels)
  wheel.userData.radius*=TWO_WHEEL_APPROVED_SIZE.motorcycle;
 return model;
}
export function finalizeNativeBicycle(T,vehicle){
 if(vehicle.userData.wheels?.length!==2||!vehicle.userData.crank||
    !vehicle.userData.twoWheelAnchors?.pedalL)
  throw Error('La bicicleta ha de tenir rodes i pedalier abans de consolidar-la');
 // El constructor de quadre és procedural: consolidam en un model
 // homogeni, abans de VS, les malles, els radis, la forquilla, els
 // punts del manillar i el pedalier animat; no queda cap escala tardana.
 const native=new T.Group();
 native.name='Bicicleta 700C · geometria nativa';
 for(const child of [...vehicle.children])native.add(child);
 bakeApprovedSize(native,TWO_WHEEL_APPROVED_SIZE.bicycle);
 vehicle.add(native);
 for(const wheel of vehicle.userData.wheels)
  wheel.userData.radius*=TWO_WHEEL_APPROVED_SIZE.bicycle;
 if(Number.isFinite(vehicle.userData.bicycleSaddleTop))
  vehicle.userData.bicycleSaddleTop*=TWO_WHEEL_APPROVED_SIZE.bicycle;
 vehicle.userData.bicycleNativeVisual=native;
 return native;
}
