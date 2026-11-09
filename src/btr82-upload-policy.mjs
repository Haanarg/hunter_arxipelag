// Decides whether an imported BTR GLB is the full source or an existing LOD.
// Pure module, also exercised by Node tests (no Three.js or browser required).
export const LOD_PERCENTAGES=Object.freeze([5,4,3,2]);
export const FULL_SOURCE_MIN_TRIANGLES=6000;
export function classifyBtr82Upload({name='',triangles=0,meshes=0,targetSlot=1}={}){
 if(!Number.isFinite(triangles)||triangles<1)throw Error('El GLB no conté triangles');
 const basename=String(name).toLowerCase();
 const originalName=/(?:^|[-_])(original|full|100pct)(?:[-_.]|$)|low_poly_btr_82/.test(basename);
 // Original Sketchfab: 21.483 triangles / 199 meshes. Offline reductions:
 // 448–1.077 triangles / 18 meshes. Do not infer source from upload slot.
 if(triangles>=FULL_SOURCE_MIN_TRIANGLES||meshes>=90||originalName&&triangles>3000)
  return {kind:'source',slot:1};
 const label=basename.match(/(?:^|[^0-9])(5|4|3|2)(?:pct|percent|%)(?=[^0-9]|$)/);
 const requested=label?Number(label[1]):null;
 const fromName=requested===null?-1:LOD_PERCENTAGES.indexOf(requested);
 if(fromName>=0)return {kind:'lod',slot:fromName+2,percent:requested};
 const slot=targetSlot>=2&&targetSlot<=5?targetSlot:
  triangles>=950?2:triangles>=750?3:triangles>=550?4:5;
 return {kind:'lod',slot,percent:LOD_PERCENTAGES[slot-2]};
}
