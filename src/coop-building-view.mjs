import {buildingVisual} from './building-visual-core.mjs?v=0.6.48';
import {windowLayout,windowPaneIndexAt} from './building-shell.mjs?v=0.6.48';
import {materialProfiles} from './material-profiles.mjs';
import {decorateTimber,decorateUpper} from './compound-architecture.mjs';
import {createFenceVisual} from './fence-visual-core.mjs';
import {createStaticWorldAdapter} from './world-adapter.mjs?v=0.6.48';
// Original visual factories; authoritative wall/roof indices remain untouched.
export function createBuildingView(T,scene,geometry,doors){
 const materialCache=new Map(),material=(color,profile='organic')=>{const key=color+':'+profile;if(!materialCache.has(key)){const c=new T.Color(color),h={};c.getHSL(h,T.SRGBColorSpace);c.setHSL(h.h,Math.min(1,h.s*1.5),h.l,T.SRGBColorSpace);materialCache.set(key,new T.MeshStandardMaterial({color:c,flatShading:true,...(materialProfiles[profile]||materialProfiles.organic)}));}return materialCache.get(key);};
 const box=(group,w,h,d,c,x=0,y=0,z=0,profile='paint')=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material(c,profile));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
 const cylinder=(group,r,h,c,x,y,z)=>{const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,10),material(c,'metal'));mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const rod=(group,a,b,r,c)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),mesh=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),6),material(c,'metal'));mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());group.add(mesh);return mesh;};
 const factory=buildingVisual.create(T,{material,materialProfile:name=>materialProfiles[name]||materialProfiles.organic,box,windowLayout}),info=[],byId=new Map(),wallMeshes=[],doorMeshes=new Map(),windowMeshes=new Map(),roofMeshes=[],stairMeshes=[];
 for(const [index,b] of (geometry.buildings||[]).entries()){
  const local={w:b.localW||b.w,d:b.localD||b.d,h:b.h},shell=(b.hangar?factory.createHangarShell:factory.createShell)({width:local.w,depth:local.d,height:b.h,wallColor:b.wood?0x96714b:b.hangar?0xbab99d:0xc9b98d,roofColor:b.hangar?0xb7c1b4:0x79584e}),members=[shell.roof];let upper=null,ribs=[];
  if(b.roof?.scale)shell.roof.scale.set(b.roof.scale.x,1,b.roof.scale.z);
  if(b.wood)ribs=decorateTimber(T,{b:local,shell,box,rod,cylinder,roofs:[]}).sideRibs;
  if(b.upperFloor){upper=decorateUpper(T,{b:local,storey:b.storey,shell,box,rod,roofs:[]});members.push(upper,upper.userData.stairGroup);}
  if(b.kind==='enemy_bunker'&&shell.foundation){shell.group.remove(shell.foundation);shell.foundation.geometry.dispose();}
  shell.group.position.set(b.x,b.fy,b.z);shell.group.rotation.y=-(b.angle||0);shell.group.userData.buildingId=b.id;shell.roof.userData.originalRoof=true;shell.roof.userData.roofKind=b.wood?'timber':b.hangar?'hangar':'flat';shell.group.updateMatrixWorld(true);scene.add(shell.group);
  const entry={b,index,shell,members,upper,ribs};info.push(entry);byId.set(b.id,entry);roofMeshes.push(members);
 }
 let terrain=null;const fence=createFenceVisual(T,{heightAt:(x,z)=>{terrain??=createStaticWorldAdapter(geometry);return terrain.heightAt(x,z);}});
 geometry.walls.forEach((w,index)=>{
  const id=doors.get(index),owner=byId.get(w.buildingId),group=new T.Group(),width=Math.max(.1,w.x1-w.x0),depth=Math.max(.1,w.z1-w.z0),bottom=owner&&w.y0<owner.b.fy?owner.b.fy:w.y0,height=Math.max(.1,w.y1-bottom);
  if(w.internalStair&&owner?.upper){group.visible=false;group.userData.internalStairProxy=true;}
  else if(w.barbed){const ax=w.ax??w.x0,az=w.az??w.z0,bx=w.bx??w.x1,bz=w.bz??w.z1,n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/6));for(let i=0;i<n;i++)group.add(fence(ax+(bx-ax)*i/n,az+(bz-az)*i/n,ax+(bx-ax)*(i+1)/n,az+(bz-az)*(i+1)/n));}
  else{
   group.position.set((w.x0+w.x1)/2,bottom,(w.z0+w.z1)/2);
   if(w.windows&&owner){const parts=factory.addWindowedWall(group,{lx:0,lz:0,sx:width,sz:depth,height,material:owner.shell.walls});for(const glass of parts)if(glass.userData.windowPane!==undefined){const axis=w.windowPanes?.[0]?.axis==='x'?'z':'x',coordinate=group.position[axis]+glass.position[axis],paneIndex=windowPaneIndexAt(w,coordinate);if(paneIndex>=0)windowMeshes.set(index+':'+paneIndex,glass);}group.userData.originalWindows=true;}
   else box(group,width,height,depth,id?0x704829:owner?.b.wood?0x96714b:w.playerBlock===false?0x8e9588:0xc9b98d,0,height/2,0,id?'paint':'masonry');
  }
  group.userData.wallIndex=index;if(!group.userData.internalStairProxy)group.visible=!w.open;scene.add(group);wallMeshes.push(group);if(id){doorMeshes.set(id,group);group.userData.doorId=id;}
 });
 for(const stair of geometry.stairs){const owner=byId.get(stair.buildingId);if(stair.internal&&owner?.upper)continue;const group=new T.Group();group.position.set(stair.x,0,stair.z);group.rotation.y=Math.atan2(stair.nx,stair.nz);
  if(stair.ramp){const mesh=box(group,stair.width,.16,stair.length,0xa99870,0,(stair.top+stair.bottom)/2,stair.length/2);mesh.rotation.x=Math.atan2(stair.top-stair.bottom,stair.length);}
  else for(let i=0;i<stair.steps;i++)box(group,stair.width,.25,stair.tread,0x817968,0,stair.top-i*stair.rise-.125,(i+.5)*stair.tread,'masonry');
  scene.add(group);group.visible=!stair.destroyed;stairMeshes.push({mesh:group,buildingIndex:stair.internal?owner?.index:-1});
 }
 return {wallMeshes,doorMeshes,roofMeshes,stairMeshes,update(state,self){const brokenWindows=new Set(state.brokenWindows||[]);for(const [id,glass] of windowMeshes)glass.visible=!brokenWindows.has(id);const actor=state.players.find(p=>p.id===self);for(const entry of info){const {b,index,shell,upper,ribs}=entry,broken=b.rb||(state.removedRoofs||[]).includes(index),inside=actor&&Math.abs(actor.x-b.x)<b.w/2&&Math.abs(actor.z-b.z)<b.d/2&&actor.y<b.fy+b.h;
   shell.roof.visible=!broken&&!inside;if(upper)upper.visible=!broken&&(!inside||actor.y>=b.fy+b.storey-.2);if(upper?.userData.stairGroup)upper.userData.stairGroup.visible=!broken;
   for(const rib of ribs){const point=shell.group.localToWorld(new T.Vector3(rib.mesh.position.x,0,rib.mesh.position.z));rib.mesh.visible=!(state.removedWalls||[]).some(i=>{const w=geometry.walls[i];return w?.buildingId===b.id&&point.x>=w.x0-.2&&point.x<=w.x1+.2&&point.z>=w.z0-.2&&point.z<=w.z1+.2;});}
  }}};
}
