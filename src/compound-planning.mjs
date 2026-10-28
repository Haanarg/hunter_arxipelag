// Placement/pad plan only. Instantiation of walls, buildings and entities is a
// separate stage and may consume more random values before the next layout.
const finite=Number.isFinite;
export function compoundPoint(q,angle=0,mirror=1){
  if(![q.x,q.z,angle].every(finite)||![1,-1].includes(mirror))throw new RangeError('Invalid compound transform');
  const c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle));
  return (x,z)=>[q.x+x*mirror*c-z*s,q.z+x*mirror*s+z*c];
}
export function planCompound(layout,q,{random,rawHeightAt}){
  if(!layout||typeof layout.id!=='string'||!Array.isArray(layout.size)||layout.size.length!==2||!layout.size.every(v=>finite(v)&&v>0)||![q.x,q.z].every(finite)||typeof random!=='function'||typeof rawHeightAt!=='function')throw new RangeError('Invalid compound planning input');
  const isPort=layout.id==='port',coastal=isPort||!!layout.waterfront,
    angle=layout.fixedOrientation?(q.angle||0):['base','hq'].includes(layout.id)?0:coastal?q.angle:Math.floor(random()*4)*Math.PI/2,
    mirror=1,tr=compoundPoint(q,angle,mirror),shore=layout.waterfront?.shore??8,
    landDepth=coastal?shore+layout.size[1]/2-5:layout.size[1]+8,
    center=tr(0,coastal?-layout.size[1]/2+landDepth/2:0),height=coastal?.86:q.h??rawHeightAt(q.x,q.z);
  if(!finite(height)||!finite(landDepth)||landDepth<=0)throw new RangeError('Invalid compound pad');
  return {id:layout.id,layoutId:layout.layoutId||layout.id,variant:layout.variant||1,x:q.x,z:q.z,angle,mirror,
    r:Math.hypot(...layout.size)/2+20,isPort,coastal,landDepth,center,height,
    level:{x:center[0],z:center[1],hw:(layout.size[0]+8)/2,hd:landDepth/2,y:height,rot:angle,c:Math.cos(angle),s:Math.sin(angle),blend:coastal?3:18},
    entrances:layout.entrances.map(p=>tr(...p)),patrol:layout.patrol.map(p=>tr(...p)),
    routes:layout.routes.map(r=>({width:r.width,points:r.points.map(p=>tr(...p))})),
    buildings:layout.buildings.map(spec=>{const [x,z]=tr(spec.x,spec.z);return {...structuredClone(spec),x,z,angle:angle-(spec.rotationY||0)};})};
}
