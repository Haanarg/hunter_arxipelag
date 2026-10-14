// Preview-only architectural revision. Runtime layouts remain untouched.
export const warehouseIds=new Set(['warehouse','air-store','ammo-store','heavy-store','store','freight','fish-store','shelter']);
const upperFloor={hangar:'workshop',outpost:'barracks',port:'office',heliport:'control',polvori:'guard',comunicacions:'radio',base:'barracks',hq:'barracks','road-checkpoint':'guard','base-coast':'barracks'};
export function siteBounds(l){
 const points=l.fence?.flat();
 return points?{minX:Math.min(...points.map(p=>p[0]))+.6,maxX:Math.max(...points.map(p=>p[0]))-.6,minZ:Math.min(...points.map(p=>p[1]))+.6,maxZ:Math.max(...points.map(p=>p[1]))-.6}:{minX:-l.size[0]/2+3,maxX:l.size[0]/2-3,minZ:-l.size[1]/2+3,maxZ:l.size[1]/2-3};
}
// Includes asymmetric flag cloth, not just the position of its pole.
export function propFootprint(kind){return kind==='flag'?[-.3,5.3,-.3,.3]:kind==='fuel'?[-3,3,-1.5,1.5]:kind==='generator'?[-3.5,3.5,-2.25,2.25]:kind==='sandbag'?[-3.55,3.55,-.5,.5]:kind==='crate'?[-1.4,1.4,-1.33,1.33]:kind==='bench'?[-2,2,-.7,.7]:kind==='well'?[-2.2,2.2,-1.8,1.8]:kind==='lamp'?[-1,1,-.4,.4]:[-.8,.8,-.8,.8]}
export function refinePreviewLayout(input){
 const l=JSON.parse(JSON.stringify(input)),type=l.type||l.id;
 l.buildings=l.buildings.map(b=>({...b,warehouse:warehouseIds.has(b.id),floors:b.floors??(b.id===upperFloor[type]&&!warehouseIds.has(b.id)?2:1)}));
 const bounds=siteBounds(l),placed=[];
 l.props=l.props.map(([kind,ox,oz])=>{
  const [left,right,back,front]=propFootprint(kind),radius=Math.max(-left,right,-back,front),shore=l.waterfront?.shore??(type==='port'?8:Infinity);
  const inside=(x,z)=>x+left>=bounds.minX&&x+right<=bounds.maxX&&z+back>=bounds.minZ&&z+front<=bounds.maxZ;
  const rotor=(x,z)=>!l.helipad||Math.hypot(Math.max(0,Math.abs(x-l.helipad.x)-radius),Math.max(0,Math.abs(z-l.helipad.z)-radius))>l.helipad.clearRadius+1;
  let x=ox,z=oz;
  if(!inside(x,z)||!rotor(x,z)){
   const candidates=[];
   for(let cx=Math.ceil(bounds.minX-left);cx<=bounds.maxX-right;cx+=2)for(let cz=Math.ceil(bounds.minZ-back);cz<=Math.min(bounds.maxZ-front,shore-front-1);cz+=2){
    if(!rotor(cx,cz)||l.buildings.some(b=>Math.abs(cx-b.x)<b.w/2+radius+1&&Math.abs(cz-b.z)<b.d/2+radius+1))continue;
    if((l.towers||(l.tower?[l.tower]:[])).some(t=>Math.abs(cx-t.x)<3+radius&&Math.abs(cz-t.z)<3+radius))continue;
    if(placed.some(p=>Math.hypot(cx-p.x,cz-p.z)<radius+p.radius+.5))continue;
    if(l.vehicles.some(v=>Math.hypot(cx-v.x,cz-v.z)<radius+6))continue;
    const routes=[...l.routes,...(l.vehiclePatrols||[]),{points:l.patrol,width:2}];
    if(routes.some(r=>r.points.slice(1).some((b,i)=>{const a=r.points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((cx-a[0])*dx+(cz-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(cx-a[0]-t*dx,cz-a[1]-t*dz)<r.width/2+radius+.5})))continue;
    candidates.push({x:cx,z:cz,d:(cx-ox)**2+(cz-oz)**2});
   }
   candidates.sort((a,b)=>a.d-b.d);if(!candidates.length)throw new Error('No safe decoration position: '+l.id+'/'+kind);
   ({x,z}=candidates[0]);
  }
  placed.push({x,z,radius});return[kind,x,z];
 });
 return l;
}
