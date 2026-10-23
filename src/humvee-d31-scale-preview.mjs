// Size-comparison adapter for the approved 175% D3.1.
// The source D GLB has been retired. This module uses the exact method-B
// JavaScript BufferGeometry data to preserve the player scale preview
// without any GLB or external loader requests.
import {loadHumveeMethodB} from './humvee-procedural-models.mjs?v=d31-a2-b3-20261023';
const D31_BASE_SCALE=1.75;
let T=null;
export async function loadApprovedHumveeD31(THREE){
 T=THREE;
 return await loadHumveeMethodB(THREE);
}
export function createApprovedHumveeD31(prepared,scale=D31_BASE_SCALE){
 if(!T||!prepared?.create)throw Error('El Humvee D3.1 encara no està preparat');
 const model=prepared.create();
 model.scale.setScalar(scale/D31_BASE_SCALE);
 model.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(model);
 model.position.y-=box.min.y;
 model.userData.scaleFactor=scale;
 model.userData.source='JS procedural method B — approved D3.1, no GLB request';
 return model;
}
