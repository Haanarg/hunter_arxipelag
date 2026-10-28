// Frozen main ff5a17025a20c0b12f83ed03bd015b0f85ecca45 (v0.6.15).
module.exports=function(layout,q,R,rawHAt){
function compoundTransform(q,angle=0,mirror=1){
  const c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle));
  return (x,z)=>[q.x+x*mirror*c-z*s,q.z+x*mirror*s+z*c];
}
const world={userData:{compounds:[]}};let level;
const addLevelArea=(x,z,w,d,y,rot,blend)=>{level={x,z,hw:w/2,hd:d/2,y,rot,c:Math.cos(rot),s:Math.sin(rot),blend};};
  const isPort=layout.id==='port',coastal=isPort||!!layout.waterfront,angle=layout.fixedOrientation?(q.angle||0):['base','hq'].includes(layout.id)?0:coastal?q.angle:Math.floor(R()*4)*Math.PI/2,mirror=1,tr=compoundTransform(q,angle,mirror),c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle));
  const vector=(x,z)=>[x*c-z*s,x*s+z*c],rotatedHeading=hd=>hd*mirror-angle;
  const record={id:layout.id,layoutId:layout.layoutId||layout.id,variant:layout.variant||1,layout,x:q.x,z:q.z,angle,mirror,r:Math.hypot(...layout.size)/2+20,buildings:[],vehicles:[],soldiers:[],loot:[],entrances:layout.entrances.map(p=>tr(...p)),patrol:layout.patrol.map(p=>tr(...p))};
  world.userData.compounds.push(record);
  const shore=layout.waterfront?.shore??8,landDepth=coastal?shore+layout.size[1]/2-5:layout.size[1]+8;
  const center=tr(0,coastal?-layout.size[1]/2+landDepth/2:0),height=coastal?.86:q.h??rawHAt(q.x,q.z);
  addLevelArea(...center,layout.size[0]+8,landDepth,height,angle,coastal?3:18);
return {id:record.id,layoutId:record.layoutId,variant:record.variant,x:record.x,z:record.z,angle,mirror,r:record.r,isPort,coastal,landDepth,center,height,level,entrances:record.entrances,patrol:record.patrol,
routes:layout.routes.map(r=>({width:r.width,points:r.points.map(p=>tr(...p))})),buildings:layout.buildings.map(spec=>{const [x,z]=tr(spec.x,spec.z);return {...structuredClone(spec),x,z,angle:angle-(spec.rotationY||0)};})};
};
