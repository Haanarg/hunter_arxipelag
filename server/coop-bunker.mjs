import {bunkerBasementPlan,bunkerEntranceLayout} from '../src/world-generation-core.mjs';
// Physical counterpart of the original basement's walls, doors and perforated slab.
export function addCoopBunker(b,seed,geometry){
 const first=geometry.walls.length,p=bunkerBasementPlan(seed,b),{halfX,halfZ,divisions,westDoors,eastDivider}=p,st={x:p.stairX,zTop:p.stairTop,zBottom:p.stairBottom,width:p.stairWidth,enclosed:true};
 b.roof={scale:{x:(b.w-7)/(b.w+1.35),z:(b.d-7)/(b.d+1.35)}};
 for(const wall of geometry.walls)if(wall.buildingId===b.id&&wall.supportWeight){const lean=3.5*2.2/b.h;if(wall.supportSide===0)wall.z0-=lean;if(wall.supportSide===1)wall.z1+=lean;if(wall.supportSide===2)wall.x0-=lean;if(wall.supportSide===3)wall.x1+=lean;}
 b.basement={variant:p.variant,floorY:p.floorY,halfX,halfZ,stair:st};geometry.bunker=b;
 const wall=(x,z,w,d,base=-9.2,height=9.25,door=false)=>{const row={x0:b.x+x-w/2,x1:b.x+x+w/2,z0:b.z+z-d/2,z1:b.z+z+d/2,y0:b.fy+base,y1:b.fy+base+height,hp:1e9,indestructible:true,rammable:false,door,open:false,cx:b.x+x,cz:b.z+z,buildingId:b.id,id:b.id+'/basement/'+geometry.walls.length};geometry.walls.push(row);return row;};
 for(const q of bunkerEntranceLayout(p)){
   const w=wall(q.x,q.z,q.w,q.d,q.base,q.height,q.kind==='door');
   if(q.kind==='partition'){w.hp=30;w.indestructible=false;w.rammable=true;}
   if(q.playerBlock===false)w.playerBlock=false;
 }
 const slab=(xa,xb,za,zb)=>{if(xb<=xa||zb<=za)return;const w=wall((xa+xb)/2,(za+zb)/2,xb-xa,zb-za,-.03,.25);w.playerBlock=false;};
 const left=st.x-st.width/2,right=st.x+st.width/2,near=Math.min(st.zTop,st.zBottom),far=Math.max(st.zTop,st.zBottom);
 slab(-19.2,left,-16.2,16.2);slab(right,19.2,-16.2,16.2);slab(left,right,-16.2,near);slab(left,right,far,16.2);
 slab(-halfX,-19.2,-halfZ,halfZ);slab(19.2,halfX,-halfZ,halfZ);slab(-19.2,19.2,-halfZ,-16.2);slab(-19.2,19.2,16.2,halfZ);
 wall(-halfX+.4,0,.8,halfZ*2-.8);wall(halfX-.4,0,.8,halfZ*2-.8);wall(0,-halfZ+.4,halfX*2-.8,.8);wall(0,halfZ-.4,halfX*2-.8,.8);
 const span=halfX-7.9,roomX=(halfX+7.1)/2;for(const z of divisions)wall(-roomX,z,span,.65,-9.1,8.75);wall(roomX,eastDivider,span,.65,-9.1,8.75);
 function doorway(x,from,to,z){const gap=4.3,lo=z-gap/2,hi=z+gap/2;if(lo>from)wall(x,(from+lo)/2,.7,lo-from,-9.15,9);if(hi<to)wall(x,(hi+to)/2,.7,to-hi,-9.15,9);wall(x,z,.82,gap,-5.05,4.9);wall(x,z,.88,gap,-9.15,4.1,true);}
 const limits=[-halfZ+.65,...divisions,halfZ-.65];for(let i=0;i<3;i++)doorway(-7.5,limits[i],limits[i+1],westDoors[i]);doorway(7.5,-halfZ+.65,eastDivider,-16);doorway(7.5,eastDivider,halfZ-.65,16);
 const c=Math.round(Math.cos(b.angle||0)),s=Math.round(Math.sin(b.angle||0)),
  point=(x,z)=>[b.x+(x-b.x)*c-(z-b.z)*s,b.z+(x-b.x)*s+(z-b.z)*c];
 for(const w of geometry.walls.slice(first)){
  const corners=[[w.x0,w.z0],[w.x0,w.z1],[w.x1,w.z0],[w.x1,w.z1]].map(([x,z])=>point(x,z));
  w.x0=Math.min(...corners.map(a=>a[0]));w.x1=Math.max(...corners.map(a=>a[0]));
  w.z0=Math.min(...corners.map(a=>a[1]));w.z1=Math.max(...corners.map(a=>a[1]));
  [w.cx,w.cz]=point(w.cx,w.cz);
 }
}
