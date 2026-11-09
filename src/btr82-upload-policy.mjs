// Segona generació del BTR-82. La nova base 100% és l'antic LOD 25%:
// 5.371 triangles i 18 malles. Els LOD nous són 4.025, 2.684 i 1.338.
export const LOD_PERCENTAGES=Object.freeze([75,50,25]);
export const BASE_TRIANGLES=5371;
export const BASE_MESHES=18;
export const APPROVED_LOD_TRIANGLES=Object.freeze({75:4025,50:2684,25:1338});
export function classifyBtr82Upload({name='',triangles=0,meshes=0,targetSlot=1}={}){
 if(!Number.isFinite(triangles)||triangles<1)throw Error('El GLB no conté triangles');
 const basename=String(name).toLowerCase();
 if(triangles>7000||meshes>30)return {kind:'obsolete'};
 if(triangles===BASE_TRIANGLES&&meshes===BASE_MESHES)return {kind:'source',slot:1};
 const old=basename.match(/(?:^|[^0-9])(5|4|3|2)(?:pct|percent|%)(?=[^0-9]|$)/);
 if(old)return {kind:'obsolete',percent:Number(old[1])};
 const explicit=basename.match(/btr82-base-(75|50|25)(?:pct)?\.glb$/);
 if(explicit){
  const pct=Number(explicit[1]),slot=LOD_PERCENTAGES.indexOf(pct)+2;
  if(triangles!==APPROVED_LOD_TRIANGLES[pct])return {kind:'obsolete'};
  return {kind:'lod',slot,percent:pct};
 }
 for(let i=0;i<LOD_PERCENTAGES.length;i++){
  const pct=LOD_PERCENTAGES[i];
  if(triangles===APPROVED_LOD_TRIANGLES[pct])return {kind:'lod',slot:i+2,percent:pct};
 }
 if(triangles>BASE_TRIANGLES||triangles<600)return {kind:'obsolete'};
 const slot=targetSlot>=2&&targetSlot<=4?targetSlot:
  triangles>3400?2:triangles>1900?3:4;
 return {kind:'lod',slot,percent:LOD_PERCENTAGES[slot-2]};
}
