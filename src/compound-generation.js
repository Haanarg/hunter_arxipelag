// Approved compound layouts share one specification with the preview.
// Quarter turns keep the existing axis-aligned wall collision representation exact.
function compoundTransform(q,angle=0,mirror=1){
  const c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle));
  return (x,z)=>[q.x+x*mirror*c-z*s,q.z+x*mirror*s+z*c];
}
function findRedesignedPort(q){
  // Search for a wide shore, with inland space and three full-size launch lanes.
  for(let turn=0;turn<4;turn++){
    const angle=turn*Math.PI/2,point=compoundTransform(q,angle);
    for(let d=16;d<Math.max(180,(q.r||180)*1.4);d+=8){
      const [x,z]=point(0,d);if(rawHAt(x,z)>.3)continue;
      for(const offset of[-8,0,8]){
        const [cx,cz]=point(0,d+offset),site={x:cx,z:cz,h:.86,angle,r:q.r},tr=compoundTransform(site,angle);
        if(Math.abs(cx)>H-100||Math.abs(cz)>H-100)continue;
        let valid=true;
        for(const lx of[-52,-26,0,26,52])for(const lz of[-60,-35,-10]){const p=tr(lx,lz);if(rawHAt(...p)<.1)valid=false}
        if(!valid)continue;
        for(const [lx,lz] of[[-13,31],[15,26],[35,34]])for(const dx of[-7,0,7])for(let dz=-16;dz<=52;dz+=4){const p=tr(lx+dx,lz+dz);if(rawHAt(...p)>-2.2)valid=false}
        if(valid)return site;
      }
      // Once well offshore there cannot be a connected inland site on this ray.
      if(rawHAt(x,z)<-15)break;
    }
  }
  return null;
}
function buildApprovedCompound(layout,q,{pad,path,pier,prop,vehicles,rocketAssigned}){
  const isPort=layout.id==='port',angle=isPort?q.angle:Math.floor(R()*4)*Math.PI/2,mirror=isPort?1:R()<.5?-1:1,tr=compoundTransform(q,angle,mirror),c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle));
  const vector=(x,z)=>[x*c-z*s,x*s+z*c],rotatedHeading=hd=>hd*mirror-angle;
  const record={id:layout.id,x:q.x,z:q.z,angle,mirror,r:isPort?90:Math.hypot(...layout.size)/2+20,buildings:[],vehicles:[],soldiers:[],entrances:layout.entrances.map(p=>tr(...p)),patrol:layout.patrol.map(p=>tr(...p))};
  world.userData.compounds.push(record);
  const center=tr(0,isPort?-27:0),height=isPort?.86:q.h??rawHAt(q.x,q.z);
  addLevelArea(...center,isPort?110:layout.size[0]+8,isPort?70:layout.size[1]+8,height,angle,isPort?4:18);
  const base=pad(...center,layout.size[0]-6,isPort?62:layout.size[1]-10);base.rotation.y=-angle;
  // Keep vegetation outside the complete reservation, including gates and turning space.
  compoundClear.push({x:q.x,z:q.z,r:record.r});
  for(const route of layout.routes)for(let i=1;i<route.points.length;i++)path(...tr(...route.points[i-1]),...tr(...route.points[i]),route.width);
  for(const spec of layout.buildings){
    const [x,z]=tr(spec.x,spec.z),firstWall=Wl.length;
    const b=mkB(x,z,spec.w,spec.d,spec.h,spec.hangar?0xbab99d:0xc9b98d,spec.hangar?0xb7c1b4:0x79584e,{hangar:!!spec.hangar,kind:spec.hangar?'hangar':layout.id==='hangar'?'garage':layout.id,doorSide:0,doorWidth:spec.hangar?30:4,doorHeight:spec.hangar?11:4.4,openDoor:!!spec.hangar,noPartitions:true});
    if(spec.hangar){
      const shape=new THREE.Shape();shape.moveTo(-spec.w/2,0);shape.lineTo(spec.w/2,0);for(let i=0;i<=16;i++){const a=i*Math.PI/16;shape.lineTo(Math.cos(a)*spec.w/2,.12+Math.sin(a)*spec.w/2)}shape.closePath();
      // La paret semicircular és l'únic tancament posterior: sense l'antic
      // prisma rectangular baix. El seu propi mesh és el que rep els danys.
      const rearThickness=.45,rearZ=-spec.d/2+.1;
      const rear=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:rearThickness,bevelEnabled:false}),b.wm);
      rear.position.z=rearZ;b.o.add(rear);
      Wl.push({
        x0:x-spec.w/2,x1:x+spec.w/2,z0:z+rearZ,z1:z+rearZ+rearThickness,
        y0:b.fy-1,y1:b.fy+spec.h,hp:110,m:rear,parts:[rear],
        door:false,open:false,rammable:true,hangarRear:true,
        cx:x,cz:z+rearZ+rearThickness/2,owner:b
      });
      // The arched roof reaches the ground: its lower sides must be solid too.
      for(const sign of[-1,1]){const lx=x+sign*(spec.w/2-.4),side=buildingVisual.addWall(b.o,{lx:lx-x,lz:0,sx:.8,sz:spec.d,height:1,material:b.wm});Wl.push({x0:lx-.4,x1:lx+.4,z0:z-spec.d/2,z1:z+spec.d/2,y0:b.fy-1,y1:b.fy+3,hp:110,m:side,rammable:true,hangarSide:true,door:false,open:false,cx:lx,cz:z,owner:b})}
    }
    // Rotate both the visual shell and every associated physical record.
    b.o.rotation.y=-angle;
    const point=(wx,wz)=>{const p=vector(wx-x,wz-z);return[x+p[0],z+p[1]]};
    for(const w of Wl.slice(firstWall)){
      const corners=[[w.x0,w.z0],[w.x0,w.z1],[w.x1,w.z0],[w.x1,w.z1]].map(p=>point(...p));
      w.x0=Math.min(...corners.map(p=>p[0]));w.x1=Math.max(...corners.map(p=>p[0]));w.z0=Math.min(...corners.map(p=>p[1]));w.z1=Math.max(...corners.map(p=>p[1]));[w.cx,w.cz]=point(w.cx,w.cz);if(w.nx!=null)[w.nx,w.nz]=vector(w.nx,w.nz);
    }
    if(b.stair){const a=b.stair;[a.x,a.z]=point(a.x,a.z);[a.nx,a.nz]=vector(a.nx,a.nz)}
    if(s){[b.w,b.d]=[b.d,b.w];[b.hw,b.hd]=[b.hd,b.hw]}
    b.doorSide=s===1?3:s===-1?2:c===-1?1:0;b.compound=record.id;b.layoutBuilding=spec.id;record.buildings.push(b);
  }
  for(const [kind,x,z] of layout.props)prop(kind==='flag'?'sign':kind,...tr(x,z),-angle);
  // The outpost perimeter has exactly the same two openings as the approved preview.
  if(layout.fence)for(const [a,b] of layout.fence)barbedSegment(...tr(...a),...tr(...b));
  if(layout.id==='hangar'){
    const hw=47,hd=50;
    for(let x=-hw;x<=hw;x+=6){if(Math.abs(x)>10)prop('barrier',...tr(x,hd),-angle);prop('barrier',...tr(x,-hd),-angle)}
    for(let z=-hd+6;z<hd;z+=6)for(const x of[-hw,hw])prop('barrier',...tr(x,z),Math.PI/2-angle);
  }
  if(isPort){
    pier(...tr(-51,7),...tr(51,7),10);
    for(const x of[-24,24])pier(...tr(x,7),...tr(x,48),6);
  }
  for(const spec of layout.vehicles){
    const t=spec.t==='llanxa_coets'&&rocketAssigned?'llanxa':spec.t,[x,z]=tr(spec.x,spec.z),v={t,x,z,hd:rotatedHeading(spec.hd),compound:record.id};
    if(layout.id==='hangar'&&spec.t==='tanc'){v.insideHangar=true;v.hangar=record.buildings[0]}
    vehicles.push(v);record.vehicles.push(v);
  }
  if(layout.tower){const p=tr(layout.tower.x,layout.tower.z);mkEn('torre',...p)}
  const route=record.patrol.slice(0,-1);
  for(const [i,p]of layout.soldiers.entries()){
    const pos=tr(...p),u=mkEn('soldat',...pos);u.compound=layout.id;
    // Start at the nearest patrol waypoint so the first leg does not cut a building.
    let nearest=0;route.forEach((p,j)=>{if(Math.hypot(p[0]-pos[0],p[1]-pos[1])<Math.hypot(route[nearest][0]-pos[0],route[nearest][1]-pos[1]))nearest=j});
    setPatrol(u,route.map((_,j)=>route[(j+nearest)%route.length]));record.soldiers.push(u);
  }
  const lootKinds={'munició':'arma','farmaciola':'med','granades':'granada','mapa':'mapa'};
  for(const loot of layout.loot){const nearest=layout.buildings.reduce((a,b)=>Math.hypot(loot.x-a.x,loot.z-a.z)<Math.hypot(loot.x-b.x,loot.z-b.z)?a:b);addIt(lootKinds[loot.kind],record.buildings[layout.buildings.indexOf(nearest)])}
  return record;
}
