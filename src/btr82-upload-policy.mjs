// Classifica el GLB font del BTR-82 i els tres LOD conservadors independents.
// El model original té 21.483 triangles/199 malles; els LOD tenen 18 malles.
export const LOD_PERCENTAGES=Object.freeze([75,50,25]);
export const FULL_SOURCE_MIN_TRIANGLES=19000;
export function classifyBtr82Upload({name='',triangles=0,meshes=0,targetSlot=1}={}){
 if(!Number.isFinite(triangles)||triangles<1)throw Error('El GLB no conté triangles');
 const basename=String(name).toLowerCase();
 const obsolete=basename.match(/(?:^|[^0-9])(5|4|3|2)(?:pct|percent|%)(?=[^0-9]|$)/);
 if(obsolete)return {kind:'obsolete',percent:Number(obsolete[1])};
 const originalName=/(?:^|[-_])(original|full|100pct)(?:[-_.]|$)|low_poly_btr_82/.test(basename);
 if(meshes>=90||triangles>=FULL_SOURCE_MIN_TRIANGLES||
  (originalName&&triangles>=FULL_SOURCE_MIN_TRIANGLES*.95))
  return {kind:'source',slot:1};
 const label=basename.match(/(?:^|[^0-9])(75|50|25)(?:pct|percent|%)(?=[^0-9]|$)/);
 const requested=label?Number(label[1]):null;
 const fromName=requested===null?-1:LOD_PERCENTAGES.indexOf(requested);
 if(fromName>=0)return {kind:'lod',slot:fromName+2,percent:requested};
 const slot=targetSlot>=2&&targetSlot<=4?targetSlot:
  triangles>=13500?2:triangles>=8000?3:4;
 return {kind:'lod',slot,percent:LOD_PERCENTAGES[slot-2]};
}
