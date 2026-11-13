import {createHash} from 'node:crypto';
import * as T from '../../vendor/three-r186.module.mjs';
import {playerBatching} from '../../src/player-batching-core.mjs';
import {createTruckModel} from '../../src/truck-model.mjs';
import {createCivilianCarModel} from '../../src/civilian-car-model.mjs';
import {prepareGazTigrRuntime} from '../../src/gaz-tigr-runtime.mjs';
export async function modelTraces(models){
 const gazTigr=prepareGazTigrRuntime(T),material=(color)=>new T.MeshStandardMaterial({color}),box=(g,w,h,d,c,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);g.add(m);return m;};
 const services={box,material,shadows:false,gazTigr,truck:createTruckModel,civilianCar:createCivilianCarModel,batching:playerBatching};
 const create=models.createFactory(T,services),traces={};
 for(const t of Object.keys(models.scales)){
  const model=create(t);model.updateMatrixWorld(true);const hash=createHash('sha256'),push=a=>hash.update(JSON.stringify(a));
  // Les empremtes històriques comproven el model original al 100%.
  // El grup de detall i el proxy llunyà no formen part del baseline
  // i es validen amb proves LOD independents.
  const full=model.userData.distantVehicleLOD?.full,
        visit=o=>{push([o.type,o.position.toArray(),o.rotation.toArray(),o.scale.toArray()]);if(o.geometry){for(const key of Object.keys(o.geometry.attributes).sort())push([key,...o.geometry.attributes[key].array]);if(o.geometry.index)push([...o.geometry.index.array]);}if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])push([m.type,m.color?.getHex(),m.vertexColors,m.transparent,m.opacity]);};
  if(full){
    visit(model);
    for(const child of full.children)child.traverse(visit);
  }else if(model.userData.rowboatVisualLod){
    // El vaixell de rems conserva el seu model original intacte:
    // l'oval distant, afegit després del batching, no forma part del baseline.
    visit(model);
    for(const child of model.userData.rowboatVisualLod.full)child.traverse(visit);
  }else model.traverse(visit);
  traces[t]=hash.digest('hex');
 }return traces;
}
