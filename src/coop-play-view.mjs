import {createTowerModel} from './tower-model.mjs';
import {createCompoundStructures} from './compound-structures.mjs';
import {createStaticWorldAdapter} from './world-adapter.mjs';
import {playerModel} from './player-model-core.mjs';
import {createVehicleView} from './coop-vehicle-view.mjs?v=0.6.44';
import {createCombatView} from './coop-combat-view.mjs?v=0.6.44';
const colors=[0x5fc5ff,0xffc85f],css=['#5fc5ff','#ffc85f'];
export async function createMissionView(container,meta,geometry,{three=null,makeRenderer=null,self=null}={}){
  const doorByWall=new Map((meta.doors||[]).map(d=>[d.wallIndex,d.id]));
  const b=meta.bounds,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
  const canvas=document.createElement('canvas');let displayed=canvas;container.replaceChildren(canvas);
  let zoom=1,state=null,last=performance.now(),destroyed=false,draw=()=>{},dispose=()=>{},resize=()=>{};
  try{
    const T=three||await import('../vendor/three-r186.module.mjs'),renderer=makeRenderer?makeRenderer({canvas}):new T.WebGLRenderer({canvas,antialias:true});
    renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.setClearColor(0x273b32);
    const scene=new T.Scene(),camera=new T.OrthographicCamera(-70,70,60,-60,.1,20000);
    camera.position.set(cx,meta.floor+110,cz+75);camera.lookAt(cx,meta.floor,cz);scene.add(new T.AmbientLight(0xffffff,2));
    const light=new T.DirectionalLight(0xffedcd,3);light.position.set(cx-40,100,cz+30);scene.add(light);
    const box=(w,h,d,x,y,z,color)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:1}));mesh.position.set(x,y,z);scene.add(mesh);return mesh;};
    if(meta.mode==='world'){
      const terrain=createStaticWorldAdapter(geometry),segments=192*geometry.mapScale,geo=new T.PlaneGeometry(b.x1-b.x0,b.z1-b.z0,segments,segments);geo.rotateX(-Math.PI/2);
      const positions=geo.getAttribute('position'),colors=new Float32Array(positions.count*3),col=new T.Color();
      for(let i=0;i<positions.count;i++){const x=positions.getX(i)+cx,z=positions.getZ(i)+cz,y=terrain.heightAt(x,z);positions.setXYZ(i,x,y,z);col.setHex(y<-.5?0x436d6b:y<2?0xc8b986:y>24?0x6c8652:0x638849);colors.set([col.r,col.g,col.b],i*3);}
      if(geometry.bunker){const bunker=geometry.bunker,indices=[];for(let i=0;i<geo.index.count;i+=3){const a=geo.index.getX(i),bb=geo.index.getX(i+1),c=geo.index.getX(i+2),x=(positions.getX(a)+positions.getX(bb)+positions.getX(c))/3,z=(positions.getZ(a)+positions.getZ(bb)+positions.getZ(c))/3;if(Math.abs(x-bunker.x)<bunker.basement.halfX&&Math.abs(z-bunker.z)<bunker.basement.halfZ)continue;indices.push(a,bb,c);}geo.setIndex(indices);}
      geo.setAttribute('color',new T.BufferAttribute(colors,3));geo.computeVertexNormals();const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,flatShading:true}));mesh.userData.worldTerrain=true;scene.add(mesh);
      const waterGeo=geo.clone(),waterPositions=waterGeo.getAttribute('position');for(let i=0;i<waterPositions.count;i++)waterPositions.setY(i,-.02);scene.add(new T.Mesh(waterGeo,new T.MeshBasicMaterial({color:0x318ab9})));
    }else if(meta.mode==='proving'){
      const terrain=createStaticWorldAdapter(geometry),geo=new T.PlaneGeometry(b.x1-b.x0,b.z1-b.z0,64,36);geo.rotateX(-Math.PI/2);const positions=geo.getAttribute('position');for(let i=0;i<positions.count;i++){const x=positions.getX(i)+cx,z=positions.getZ(i)+cz;positions.setXYZ(i,x,terrain.heightAt(x,z),z);}geo.computeVertexNormals();scene.add(new T.Mesh(geo,new T.MeshStandardMaterial({color:0x69884d,flatShading:true})));
      box(300,.1,360,320,0,0,0x318ab9);
    }else box(b.x1-b.x0,.3,b.z1-b.z0,cx,meta.floor-.16,cz,0x607b50);
    for(const pier of geometry.piers||[]){const mesh=box(pier.width,.24,pier.length,pier.x+pier.ux*pier.length/2,pier.y-.12,pier.z+pier.uz*pier.length/2,0x99846b);mesh.rotation.y=Math.atan2(pier.ux,pier.uz);}
    if(geometry.bunker){const bunker=geometry.bunker,st=bunker.basement.stair,run=Math.abs(st.zTop-st.zBottom);box(bunker.basement.halfX*2,.26,bunker.basement.halfZ*2,bunker.x,bunker.basement.floorY-.13,bunker.z,0x434c49);for(let i=0;i<15;i++)box(st.width,.21,run/15+.035,bunker.x+st.x,bunker.fy+.22-(i+1)*9.37/15-.1,bunker.z+st.zTop+(i+.5)*(st.zBottom-st.zTop)/15,0x8b9289);}
    const landmarkMeshes=[],structures=createCompoundStructures(),part=(group,w,h,d,color,x=0,y=0,z=0)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.8}));mesh.position.set(x,y,z);group.add(mesh);return mesh;};
    for(const compound of meta.compounds||[])for(const landmark of compound.landmarks||[]){let mesh;if(landmark.kind==='tower')mesh=createTowerModel(T,{box:part});else if(landmark.kind==='antenna')mesh=structures.antenna(landmark.spec);else if(landmark.kind==='satellite'){mesh=structures.satellite(landmark.spec.radius);mesh.scale.setScalar(landmark.spec.scale||1);}else{mesh=new T.Group();part(mesh,landmark.size,.08,landmark.size,0x566958);for(const x of [-4,4])part(mesh,1,.1,12,0xe6e3cf,x,.09,0);part(mesh,8,.1,1,0xe6e3cf,0,.09,0);}mesh.position.set(landmark.x,landmark.y,landmark.z);mesh.rotation.y=-compound.angle;mesh.userData.landmarkKind=landmark.kind;scene.add(mesh);landmarkMeshes.push({mesh,...landmark});}
    const doorMeshes=new Map(),windowMeshes=new Map(),wallMeshes=[],roofMeshes=[],stairMeshes=[];
    geometry.walls.forEach((wall,index)=>{
      const id=doorByWall.get(index),color=id?0x795c39:wall.playerBlock===false?0xb4b5a3:0xa0a795;
      let mesh;
      if(wall.windowPanes?.length){
        const facade=new T.Group(),panes=[...wall.windowPanes].map((p,i)=>({p,i})),
          normal=panes[0].p.axis,along=normal==='x'?'z':'x',
          start=wall[along+'0'],end=wall[along+'1'],thickness=Math.max(.08,wall[normal+'1']-wall[normal+'0']),
          middle=(wall[normal+'0']+wall[normal+'1'])/2;
        const add=(lo,hi,ya,yb,c,transparent=false)=>{
          if(hi-lo<=.03||yb-ya<=.03)return null;
          const geometry=new T.BoxGeometry(normal==='x'?thickness:hi-lo,yb-ya,normal==='z'?thickness:hi-lo),
            material=new T.MeshStandardMaterial({color:c,roughness:transparent?.18:.85,transparent,opacity:transparent?.55:1,depthWrite:!transparent}),
            part=new T.Mesh(geometry,material);
          part.position.set(normal==='x'?middle:(lo+hi)/2,(ya+yb)/2,normal==='z'?middle:(lo+hi)/2);
          facade.add(part);return part;
        };
        const low=Math.min(...panes.map(e=>e.p.y0)),high=Math.max(...panes.map(e=>e.p.y1));
        add(start,end,wall.y0,low,color);add(start,end,high,wall.y1,color);
        let cursor=start;
        for(const {p,i} of panes.sort((a,b)=>a.p[along]-b.p[along])){
          const left=p[along]-p.width/2,right=p[along]+p.width/2;
          add(cursor,left,low,high,color);
          const glass=add(left,right,p.y0,p.y1,0x6cabbe,true);
          if(glass){glass.userData.windowPaneId=index+':'+i;windowMeshes.set(index+':'+i,glass);}
          cursor=right;
        }
        add(cursor,end,low,high,color);mesh=facade;scene.add(facade);
      }else mesh=box(Math.max(.1,wall.x1-wall.x0),Math.max(.1,wall.y1-wall.y0),Math.max(.1,wall.z1-wall.z0),(wall.x0+wall.x1)/2,(wall.y0+wall.y1)/2,(wall.z0+wall.z1)/2,color);
      wallMeshes.push(mesh);mesh.visible=!wall.open;if(id){doorMeshes.set(id,mesh);mesh.userData.doorId=id;}
    });
    for(const building of geometry.buildings||[]){
      const roof=box(building.w,.24,building.d,building.x,building.fy+building.h,building.z,0x858b7c);
      roof.material.transparent=true;roof.material.opacity=.28;roof.material.depthWrite=false;
      const meshes=[roof];if(building.upperFloor){const floor=box(building.w,.24,building.d,building.x,building.fy+building.storey,building.z,0x9c9986);floor.material.transparent=true;floor.material.opacity=.25;floor.material.depthWrite=false;meshes.push(floor);}
      roofMeshes.push(meshes);for(const mesh of meshes)mesh.visible=!building.rb;
    }
    for(const s of geometry.stairs){
      const height=s.ramp?(s.top+s.bottom)/2:s.top-(s.steps-1)*s.rise/2,
        mesh=box(s.width,.16,s.length,s.x+s.nx*s.length/2,height,s.z+s.nz*s.length/2,0xa99870);
      mesh.rotation.y=Math.atan2(s.nx,s.nz);
      if(s.ramp)mesh.rotation.x=Math.atan2(s.top-s.bottom,s.length);
      mesh.visible=!s.destroyed;stairMeshes.push({mesh,buildingIndex:s.internal?(geometry.buildings||[]).findIndex(b=>b.id===s.buildingId):-1});
    }
    const line=(points,color,opacity=1)=>{const material=new T.LineBasicMaterial({color,transparent:opacity<1,opacity}),mesh=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(p.x,p.y??meta.floor+.15,p.z))),material);scene.add(mesh);return mesh;};
    line([{x:b.x0,z:b.z0},{x:b.x1,z:b.z0},{x:b.x1,z:b.z1},{x:b.x0,z:b.z1},{x:b.x0,z:b.z0}],0xffdfa0,.65);
    for(const c of meta.compounds||[])for(const route of c.routes||[])line(route.points.map(([x,z])=>({x,y:c.height+.12,z})),0xb3a78a,.65);
    meta.routes.forEach((route,i)=>line(route.map(p=>({...p,y:meta.floor+.12})),colors[i],.3));
    meta.terminals.forEach((p,i)=>{box(2.5,2.5,2.5,p.x,p.y+1.2,p.z,colors[i]);box(1.8,.15,1.8,p.x,p.y+2.5,p.z,0xe9fff3);});
    const supplies=new Map();
    function updateSupplies(items){const live=new Set(items.map(s=>s.id));for(const [id,mesh] of supplies)if(!live.has(id)){scene.remove(mesh);mesh.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});supplies.delete(id);}for(const s of items)if(!supplies.has(s.id)){const mesh=box(1.2,1.2,1.2,s.x,s.y+.6,s.z,s.item==='medkits'?0xf5f4e8:s.item==='bullets'?0xe4e7cc:s.item==='grenades'?0xd26e43:0x62965a);if(s.item==='medkits')for(const [w,d] of [[.8,.22],[.22,.8]]){const cross=new T.Mesh(new T.BoxGeometry(w,.05,d),new T.MeshBasicMaterial({color:0xd45047}));cross.position.y=.63;mesh.add(cross);}mesh.userData.supplyId=s.id;supplies.set(s.id,mesh);}}
    updateSupplies(meta.supplies||[]);
    const ring=new T.Mesh(new T.TorusGeometry(3,.18,8,32),new T.MeshBasicMaterial({color:0x99ff9b}));ring.rotation.x=-Math.PI/2;ring.position.set(meta.extraction.x,meta.extraction.y+.1,meta.extraction.z);scene.add(ring);
    const pawns=meta.members.map((m,i)=>{
      const group=new T.Group(),body=playerModel.create(T,{unitScale:.85});body.position.y=0;group.add(body);
      const arrow=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,1.4,0),new T.Vector3(0,1.4,-2.5)]),new T.LineBasicMaterial({color:0xffffff}));group.add(arrow);group.userData.actorId=m.id;scene.add(group);return group;
    });
    dispose=()=>{scene.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});renderer.dispose();};
    const combatView=createCombatView(T,scene),vehicleView=await createVehicleView(T,scene);
    let initialized=false;
    resize=()=>{const w=container.clientWidth,h=container.clientHeight,aspect=w/Math.max(1,h),half=Math.max((b.z1-b.z0)*.7,(b.x1-b.x0)/aspect*.6,40);camera.left=-half*aspect/zoom;camera.right=half*aspect/zoom;camera.top=half/zoom;camera.bottom=-half/zoom;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    draw=dt=>{
      if(state){for(const landmark of landmarkMeshes)if((state.removedWalls||[]).includes(landmark.wallIndex)||(state.removedRoofs||[]).includes(landmark.buildingIndex))landmark.mesh.visible=false;for(const index of state.removedRoofs||[]){for(const mesh of roofMeshes[index]||[])mesh.visible=false;for(const stair of stairMeshes)if(stair.buildingIndex===index)stair.mesh.visible=false;}for(const index of state.removedWalls||[])if(wallMeshes[index])wallMeshes[index].visible=false;const broken=new Set(state.brokenWindows||[]);for(const [id,glass] of windowMeshes)glass.visible=!broken.has(id);vehicleView.update(state.vehicles,dt/1000);combatView.update(state.combat,state.tick);updateSupplies(state.supplies||(meta.supplies||[]).filter(s=>!state.claimedSupplies?.includes(s.id)));for(const door of state.doors||[]){const mesh=doorMeshes.get(door.id);if(mesh)mesh.visible=!door.open&&!door.destroyed;}for(let i=0;i<2;i++){const p=state.players.find(p=>p.id===meta.members[i].id),pawn=pawns[i];if(!p)continue;const vehicle=state.vehicles?.find(v=>v.seats.includes(p.id)),side=vehicle?(vehicle.seats[0]===p.id?-.5:.5):0,px=p.x+Math.cos(p.hd)*side,pz=p.z-Math.sin(p.hd)*side;
        if(!initialized)pawn.position.set(px,p.y,pz);else pawn.position.lerp(new T.Vector3(px,p.y,pz),1-Math.exp(-dt/65));pawn.rotation.y=p.hd;pawn.children[0].rotation.z=p.hp<=0?Math.PI/2:0;pawn.children[0].position.y=p.hp<=0?.5:0;const body=pawn.children[0],tint=p.hp<=0?0xf07860:state.inventories?.find(b=>b.actorId===p.id)?.disguised?0x567346:colors[i];for(const [material] of body.userData.mats)material.color.setHex(tint);body.traverse(o=>{if(o.material?.emissive)o.material.emissive.setHex(state.rescue?.immune.some(d=>d.actorId===p.id&&state.tick<d.untilTick)?0x285a76:0);});
      }initialized=true;ring.material.color.setHex(state.phase==='won'?0xffe98c:0x99ff9b);}
      const focus=zoom>1&&state?.players.find(p=>p.id===self);if(focus){camera.position.set(focus.x,focus.y+110,focus.z+75);camera.lookAt(focus.x,focus.y,focus.z);}else{camera.position.set(cx,meta.floor+110,cz+75);camera.lookAt(cx,meta.floor,cz);}
      renderer.render(scene,camera);
    };
    dispose=()=>{vehicleView.destroy();combatView.destroy();scene.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});renderer.dispose();};
  }catch(_){
    // A Canvas map keeps the same mission playable on devices without WebGL.
    const flat=document.createElement('canvas');displayed=flat;container.replaceChildren(flat);const ctx=flat.getContext('2d');
    let worldMap=null;if(meta.mode==='world'){worldMap=document.createElement('canvas');worldMap.width=worldMap.height=128;const mapCtx=worldMap.getContext('2d'),terrain=createStaticWorldAdapter(geometry);for(let row=0;row<128;row++)for(let col=0;col<128;col++){const y=terrain.heightAt(b.x0+(col+.5)*(b.x1-b.x0)/128,b.z0+(row+.5)*(b.z1-b.z0)/128);mapCtx.fillStyle=y<0?'#318ab9':y<2?'#c8b986':'#6c8751';mapCtx.fillRect(col,row,1,1);}}
    resize=()=>{flat.width=Math.max(1,container.clientWidth)*Math.min(2,devicePixelRatio||1);flat.height=Math.max(1,container.clientHeight)*Math.min(2,devicePixelRatio||1);};
    draw=()=>{
      if(!ctx)return;const w=flat.width,h=flat.height,scale=zoom*Math.min(w/(b.x1-b.x0+10),h/(b.z1-b.z0+10)),focus=zoom>1&&state?.players.find(p=>p.id===self),x=v=>w/2+(v-(focus?.x??cx))*scale,z=v=>h/2+(v-(focus?.z??cz))*scale;
      ctx.fillStyle=meta.mode==='world'?'#318ab9':'#314f3e';ctx.fillRect(0,0,w,h);if(meta.mode!=='world'){ctx.fillStyle='#70835b';ctx.fillRect(x(b.x0),z(b.z0),(b.x1-b.x0)*scale,(b.z1-b.z0)*scale);}
      if(meta.mode==='world'){if(worldMap)ctx.drawImage(worldMap,x(b.x0),z(b.z0),(b.x1-b.x0)*scale,(b.z1-b.z0)*scale);for(const c of meta.compounds||[]){ctx.fillStyle='#d7d8be';ctx.fillRect(x(c.x)-3,z(c.z)-3,6,6);ctx.font='11px system-ui';ctx.fillText(c.name,x(c.x)+5,z(c.z));}}
      if(meta.mode==='proving'){ctx.fillStyle='#318ab9';ctx.fillRect(x(170),z(b.z0),(b.x1-170)*scale,(b.z1-b.z0)*scale);}
      const open=new Map((state?.doors||[]).map(d=>[d.id,d.open]));
      for(const [index,wall] of geometry.walls.entries())if(!(state?.removedWalls||[]).includes(index)&&!(open.get(doorByWall.get(index))??wall.open)){ctx.fillStyle=doorByWall.has(index)?'#795c39':wall.playerBlock===false?'#bbb998':'#c2c7b7';ctx.fillRect(x(wall.x0),z(wall.z0),Math.max(1,(wall.x1-wall.x0)*scale),Math.max(1,(wall.z1-wall.z0)*scale));}
      meta.routes.forEach((path,i)=>{ctx.beginPath();path.forEach((p,j)=>j?ctx.lineTo(x(p.x),z(p.z)):ctx.moveTo(x(p.x),z(p.z)));ctx.strokeStyle=css[i];ctx.globalAlpha=.3;ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;});
      const circle=(p,r,color,label)=>{ctx.beginPath();ctx.arc(x(p.x),z(p.z),r*scale,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(label){ctx.fillStyle='#132327';ctx.font='bold '+Math.max(12,2*scale)+'px system-ui';ctx.textAlign='center';ctx.fillText(label,x(p.x),z(p.z)+scale*.7);}};
      for(const s of state?.supplies||(meta.supplies||[]).filter(s=>!state?.claimedSupplies?.includes(s.id)))circle(s,.7,s.item==='medkits'?'#f5f4e8':'#e4e7cc',s.item==='medkits'?'✚':'+');
      circle(meta.extraction,3,'#a2efa2','E');meta.terminals.forEach((p,i)=>circle(p,2,css[i],String(i+1)));
      for(const v of state?.vehicles||[]){if(v.destroyed)continue;ctx.save();ctx.translate(x(v.x),z(v.z));ctx.rotate(-v.hd);ctx.fillStyle='#819966';ctx.fillRect(-.9*scale,-1.6*scale,1.8*scale,3.2*scale);ctx.fillStyle='#d6e2c8';ctx.fillRect(-.7*scale,-1.1*scale,1.4*scale,.3*scale);ctx.restore();if(meta.mode==='proving'){ctx.fillStyle='#fff';ctx.font='11px system-ui';ctx.fillText(v.t,x(v.x),z(v.z)-5);}}
      for(const t of state?.combat?.targets||[])if(t.hp>0)circle(t,1.2,t.state==='attack'?'#ff3535':t.state==='alert'||t.state==='search'?'#e4a347':'#a85e50',t.state==='attack'?'!':String(t.hp));
      for(const bullet of state?.combat?.projectiles||[])circle(bullet,.25,'#ffffff');
      for(const g of state?.combat?.grenades||[])circle(g,.7,'#becd62','!');
      for(const e of state?.combat?.effects||[]){if(e.kind==='shot'){ctx.beginPath();ctx.moveTo(x(e.from.x),z(e.from.z));ctx.lineTo(x(e.to.x),z(e.to.z));ctx.strokeStyle=e.hit?'#ff6855':'#ffe18a';ctx.lineWidth=2;ctx.stroke();}else if(e.kind==='impact'){circle(e.at,.4,e.hit?'#ff6855':'#ffe4aa');}else if(e.kind==='explosion'){ctx.globalAlpha=.3;circle(e.at,Math.max(.3,e.radius*Math.min(1,(state.tick-e.tick+1)/12)),'#ff9a32');ctx.globalAlpha=1;}}
      if(state)state.players.forEach(p=>{const i=meta.members.findIndex(m=>m.id===p.id);circle(p,1,p.hp<=0?'#f07860':state.inventories?.find(b=>b.actorId===p.id)?.disguised?'#567346':css[i],p.hp<=0?'✚':null);ctx.beginPath();ctx.moveTo(x(p.x),z(p.z));ctx.lineTo(x(p.x-Math.sin(p.hd)*3),z(p.z-Math.cos(p.hd)*3));ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();});
    };
  }
  resize();const observer=new ResizeObserver(resize);observer.observe(container);let frame;
  function loop(now){if(destroyed)return;draw(Math.min(100,now-last));last=now;frame=requestAnimationFrame(loop);}frame=requestAnimationFrame(loop);
  return {setZoom(value){zoom=Math.max(1,Math.min(meta.mode==='world'?64:8,value));resize();},setState(value){state=value;},destroy(){destroyed=true;cancelAnimationFrame(frame);observer.disconnect();dispose();if(displayed.parentNode===container)displayed.remove();}};
}
