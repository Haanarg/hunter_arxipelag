import {segmentSphereT} from '../src/combat-rules.mjs';
// A ground pickup is a horizontal swept contact plus a floor-height gate.
export function firstSupplyContact(from,to,item,radius=1.2){
 const t=segmentSphereT(from.x,0,from.z,to.x,0,to.z,item.x,0,item.z,radius);
 return t!==null&&Math.abs(from.y+(to.y-from.y)*t-item.y)<1.2?t:null;
}
