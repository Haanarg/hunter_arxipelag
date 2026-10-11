import * as T from '../vendor/three-r186.module.mjs';
export function createCompoundConcept(layout){
 const root=new T.Group(),roofs=[],tags=[],overlays=new T.Group(),materials=new Map();root.add(overlays);
 const mat=(color,profile='paint')=>{const key=color+profile;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:profile==='metal'?.57:.92,metalness:profile==='metal'?.25:0,flatShading:true}));return materials.get(key)};
 const box=(g,w,h,d,c,x=0,y=0,z=0,profile='paint')=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c,profile));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m};
 const cylinder=(g,r,h,c,x,y,z)=>{const m=new T.Mesh(new T.CylinderGeometry(r,r,h,10),mat(c,'metal'));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};
 const rod=(g,a,b,r,c)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),6),mat(c,'metal'));m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());g.add(m);return m};
 const tag=(text,x,y,z)=>tags.push({text,position:new T.Vector3(x,y,z)});
 const building=window.HUNTER_BUILDINGS.create(T,{material:mat,materialProfile:()=>({roughness:.88}),box});
 const isPort=layout.id==='port';
 box(root,layout.size[0]+12,2,isPort?76:layout.size[1]+8,0x498535,0,-1.05,isPort?-25:0);
 box(root,layout.size[0]-6,.18,isPort?61:layout.size[1]-10,0x8e8c75,0,.02,isPort?-24:0);
 // A thick, clean diorama base makes the reserved site footprint legible.
 box(root,layout.size[0]+14,3,layout.size[1]+12,0x43594e,0,-3.5,0);
 if(isPort){
   box(root,layout.size[0]+12,.22,60,0x329da8,0,-.28,36);
   box(root,102,.75,10,0xaaa994,0,.19,7);
   for(let x=-48;x<50;x+=4)box(root,2.4,.035,.25,0xf1d589,x,.59,11.7);
   for(const x of[-24,24]){
     box(root,6,.5,36,0x8e7252,x,.38,30);
     for(let z=13;z<48;z+=1.5)box(root,5.9,.03,.055,0x4f4739,x,.65,z);
     for(let z=14;z<48;z+=8)for(const side of[-1,1]){cylinder(root,.22,2,0x514d40,x+side*2.7,-.3,z);cylinder(root,.24,.6,0x39484b,x+side*2.3,.92,z)}
     tag('Moll · 6 m',x,1,46);
   }
   for(let z=17;z<63;z+=9)for(let x=-45;x<49;x+=19)box(root,6,.025,.16,0x7bcbd0,x+(z%3),-.15,z);
 }
 if(layout.helipad){
   const p=layout.helipad;box(root,p.size,.24,p.size,0x66706e,p.x,.22,p.z);
   const ring=new T.Mesh(new T.RingGeometry(p.size*.39,p.size*.405,48),mat(0xf3e5b1));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.355,p.z);root.add(ring);
   for(const side of[-1,1])box(root,1.6,.025,12,0xf3e5b1,p.x+side*4,.36,p.z);box(root,8,.025,1.6,0xf3e5b1,p.x,.36,p.z);
   for(const dx of[-19,19])for(const dz of[-19,19]){cylinder(root,.35,.2,0x273c3f,p.x+dx,.48,p.z+dz);cylinder(root,.24,.1,0xecc668,p.x+dx,.62,p.z+dz)}
   const reserve=new T.Mesh(new T.RingGeometry(p.clearRadius-.3,p.clearRadius,64),new T.MeshBasicMaterial({color:0xffc85c,side:T.DoubleSide,transparent:true,opacity:.7,depthWrite:false}));reserve.rotation.x=-Math.PI/2;reserve.position.set(p.x,.86,p.z);overlays.add(reserve);tag('Rotors · radi lliure 22 m',p.x,1,p.z-24);
 }
 if(layout.antenna){
   const a=layout.antenna,g=new T.Group();g.position.set(a.x,.2,a.z);root.add(g);g.userData.previewAntenna=true;g.scale.setScalar(a.scale||1);
   box(g,8,.55,8,0x92948b,0,.25,0);
   for(let y=0;y<a.height/(a.scale||1);y+=4){const color=y%8?0xd8d8c4:0xa7463b,lower=2.7-y*.065,upper=2.7-(y+4)*.065;
     for(const dx of[-1,1])for(const dz of[-1,1])rod(g,[dx*lower,y,dz*lower],[dx*upper,y+4,dz*upper],.13,color);
     for(const side of[-1,1]){rod(g,[-lower,y,side*lower],[upper,y+4,side*upper],.07,color);rod(g,[lower,y,side*lower],[-upper,y+4,side*upper],.07,color);rod(g,[side*lower,y,-lower],[side*upper,y+4,upper],.07,color);rod(g,[side*lower,y,lower],[side*upper,y+4,-upper],.07,color)}
   }
   const dish=new T.Mesh(new T.SphereGeometry(2.2,16,8,0,Math.PI*2,0,Math.PI*.4),new T.MeshStandardMaterial({color:0xe4e5d8,roughness:.65,side:T.DoubleSide}));dish.rotation.x=Math.PI*.65;dish.position.set(0,18,3);g.add(dish);rod(g,[0,17,0],[0,18,3],.15,0x616b68);rod(g,[0,28,0],[0,31,0],.09,0xddddca);cylinder(g,.22,.4,0xec6545,0,31,0);tag('Antena · '+a.height+' m',a.x,32*(a.scale||1),a.z);
 }
 for(const b of layout.buildings){
   const shell=b.hangar?building.createHangarShell({width:b.w,depth:b.d,height:b.h,wallColor:0xbab99d,roofColor:0xb7c1b4}):building.createShell({width:b.w,depth:b.d,height:b.h,wallColor:0xc9b98d,roofColor:0x79584e});
   const g=shell.group;g.position.set(b.x,.24,b.z);root.add(g);roofs.push(shell.roof);
   if(layout.satellite?.buildingId===b.id){
     // Roof assembly: olive paraboloid, radial ribs, lattice rim and feed tripod.
     const assembly=new T.Group();assembly.position.y=b.h+1.2;shell.roof.add(assembly);assembly.userData.previewSatellite=true;
     box(assembly,7,.5,7,0x59634a,0,.25,0);
     const pedestal=new T.Mesh(new T.CylinderGeometry(1.8,3,3.4,8),mat(0x606b4b));pedestal.position.y=2.2;assembly.add(pedestal);
     for(const x of[-2.6,2.6]){rod(assembly,[x,1.2,0],[x,5.5,0],.35,0x374439);rod(assembly,[x,2,-2],[x,5.5,0],.22,0x374439)}
     const dish=new T.Group();dish.position.y=6;dish.rotation.x=-.62;dish.rotation.y=.3;assembly.add(dish);
     const radius=layout.satellite.radius,depth=2.7,segments=48,rings=10,vertices=[],indices=[];
     const point=(r,t,offset=0)=>[r*Math.cos(t),r*Math.sin(t),depth*(r/radius)**2+offset];
     for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++)vertices.push(...point(radius*j/rings,i*2*Math.PI/segments));
     for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const k=j*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1)}
     const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
     const bowl=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x7f8c59,side:T.DoubleSide,roughness:.83}));bowl.castShadow=bowl.receiveShadow=true;dish.add(bowl);
     for(let i=0;i<16;i++){const t=i*Math.PI/8,next=t+Math.PI/8;
       for(let j=0;j<10;j++)rod(dish,point(radius*j/10,t,-.16),point(radius*(j+1)/10,t,-.16),.09,0x374439);
       rod(dish,point(radius,t),point(radius,next),.12,0x354237);
       rod(dish,point(radius,t,-.7),point(radius,next,-.7),.10,0x354237);
       rod(dish,point(radius,t),point(radius,next,-.7),.07,0x354237);
     }
     for(const r of[radius*.35,radius*.65])for(let i=0;i<48;i++)rod(dish,point(r,i*Math.PI/24,.025),point(r,(i+1)*Math.PI/24,.025),.025,0x526044);
     for(let i=0;i<3;i++){const t=i*2*Math.PI/3+Math.PI/2;rod(dish,point(radius*.92,t),[0,0,6.3],.14,0x344137)}
     rod(dish,[0,0,5.7],[0,0,7],.48,0x506044);rod(dish,[0,0,7],[0,0,7.8],.12,0x344137);
     tag('Parabòlica · Ø 18 m',b.x,b.h+19,b.z);
   }
   const wall=(x,z,w,d,h=b.h)=>building.addWall(g,{lx:x,lz:z,sx:w,sz:d,height:h,material:shell.walls});
   if(b.hangar){
     const arch=new T.Shape();arch.moveTo(-b.w/2,0);arch.lineTo(b.w/2,0);
     for(let i=0;i<=10;i++){const a=i*Math.PI/10;arch.lineTo(Math.cos(a)*b.w/2,.12+Math.sin(a)*b.w/2)}arch.closePath();
     const rear=new T.Mesh(new T.ExtrudeGeometry(arch,{depth:.45,bevelEnabled:false}),shell.walls);rear.position.z=-b.d/2-.2;g.add(rear);
     wall(-b.w/2+1.2,b.d/2,2.4,.7,5);wall(b.w/2-1.2,b.d/2,2.4,.7,5);
     // Bench and supply rack clear of the tank's reserved central corridor.
     box(g,2,1.2,12,0x59634d,-b.w/2+3,.6,-6);
     for(let z=-10;z<0;z+=3)box(g,1.3,.8,1.6,0x9a7546,-b.w/2+3,1.6,z);
     tag('Hangar · boca 30 m',b.x,b.h+1,b.z);
   }else{
     const solid=layout.id==='ammo-proposal'&&b.id!=='guard';
     if(solid){wall(0,-b.d/2,b.w,.6);for(const x of[-b.w/2,b.w/2])wall(x,0,.6,b.d)}else{building.addWindowedWall(g,{lx:0,lz:-b.d/2,sx:b.w,sz:.45,height:b.h,material:shell.walls});for(const x of[-b.w/2,b.w/2])building.addWindowedWall(g,{lx:x,lz:0,sx:.45,sz:b.d,height:b.h,material:shell.walls})}
     const door=4;wall(-(b.w+door)/4,b.d/2,(b.w-door)/2,.45);wall((b.w+door)/4,b.d/2,(b.w-door)/2,.45);
     building.addWall(g,{lx:0,lz:b.d/2,sx:door,sz:.45,height:b.h-4.4,material:shell.walls,y:4.4+(b.h-4.4)/2});
     box(g,5,.15,3,0xafa88c,0,.1,b.d/2+1.5);
     box(g,5,1.2,1.8,0x776044,-b.w/2+4,.9,-b.d/2+3);
     if(b.id==='barracks')for(const x of[-5,5])for(const z of[-6,0]){box(g,2.5,.65,4,0x4c5b43,x,.6,z);box(g,2.2,.25,3.5,0x939978,x,1.05,z)}
     tag(b.label,b.x,b.h+2,b.z);
   }
 }
 function prop(kind,x,z){
   if(kind==='flag'){root.add(building.createFlag({x,y:.2,z,color:0xd62a35}));return}
   if(kind==='crate'){box(root,2.8,2.2,2.6,0x89603b,x,1.25,z);for(const side of[-1,1])box(root,.12,2.25,2.65,0x403e31,x+side*.9,1.27,z);return}
   if(kind==='barrel'){cylinder(root,.75,1.8,0x5f7370,x,1.15,z);for(const h of[.5,1.75])cylinder(root,.79,.15,0x394749,x,h,z);return}
   if(kind==='fuel'){const c=cylinder(root,1.3,5,0x697977,x,2,z);c.rotation.z=Math.PI/2;box(root,6,.5,3,0x4b5757,x,.45,z);return}
   if(kind==='generator'){box(root,7,.4,4.5,0x6d7369,x,.35,z);box(root,5,2.5,3,0x57694f,x,1.8,z);for(let k=-2;k<=2;k++)box(root,.12,1.6,.06,0x29383a,x+k*.55,1.9,z+1.53);cylinder(root,.17,3,0x41484b,x+1.5,3.2,z-.7);box(root,1,.7,.08,0x303b3e,x-1.5,2,z+1.55);return}
   if(kind==='lamp'){cylinder(root,.12,8,0x3f5052,x,4,z);box(root,2,.3,.8,0xebd48a,x,8,z);return}
   if(kind==='sandbag')for(let row=0;row<2;row++)for(let i=0;i<5-row;i++)box(root,1.3,.65,.95,0xaaa17a,x+(i-(4-row)/2)*1.45,.65+row*.6,z);
 }
 layout.props.forEach(([kind,x,z])=>prop(kind,x,z));
 if(layout.tower){const {x,z}=layout.tower;const g=new T.Group();g.position.set(x,.2,z);root.add(g);
  for(const a of[-2,2])for(const b of[-2,2]){box(g,.32,9,.32,0x495456,a,4.5,b);rod(g,[a,.3,b],[-a,8,b],.08,0x495456)}
  box(g,5,.45,5,0x5f6657,0,8.5,0);box(g,4,1.5,.3,0x8c5144,0,9.4,-2);for(const a of[-2,2])box(g,.3,1.5,4,0x8c5144,a,9.4,0);
  const roof=box(g,5.8,.3,5.8,0x625d4c,0,11,0);roofs.push(roof);tag('Torre',x,12,z);
  for(let y=.4;y<8.5;y+=.65)rod(g,[-.6,y,2.5],[.6,y,2.5],.08,0x687375);
 }
 const makeVehicle=window.HUNTER_VEHICLES.createFactory(T,{box,material:mat,shadows:true});
 for(const v of layout.vehicles){const model=makeVehicle(v.t);model.position.set(v.x,isPort?-.05:.25,v.z);model.rotation.y=v.hd;root.add(model);model.userData.previewVehicle=v.t;
  if(v.t==='tanc')tag('Tanc',v.x,5,v.z);}
 for(const [i,[x,z]] of layout.soldiers.entries()){
  const model=window.HUNTER_CHARACTERS.createCommando(T);model.position.set(x,isPort&&z>12?.68:.25,z);model.rotation.y=i*1.7;root.add(model);
 }
 for(const item of layout.loot){
  const group=new T.Group();group.position.set(item.x,.35,item.z);group.userData.previewLoot=item.kind;root.add(group);
  if(item.kind==='bazooka'){
    box(group,4,.2,1.6,0x786748,0,.45,0);for(const side of[-1,1])box(group,.2,.7,1.3,0x424e46,side*1.4,.1,0);
    const tube=cylinder(group,.22,2.65,0x58664a,0,1,0);tube.rotation.z=Math.PI/2;
    for(const side of[-1,1]){const cap=cylinder(group,.29,.2,0x252b27,side*1.42,1,0);cap.rotation.z=Math.PI/2}box(group,.16,.4,.22,0x252b27,-.35,.72,0);box(group,.12,.2,.3,0x737b74,.35,1.25,0);
    tag('Bazooka garantit',item.x,2,item.z);continue;
  }
  if(item.kind==='explosius'&&window.HUNTER_EXPLOSIVE_VISUALS){const explosive=window.HUNTER_EXPLOSIVE_VISUALS.create(T,false);explosive.scale.setScalar(window.HUNTER_EXPLOSIVE_VISUALS.PICKUP_SCALE);group.add(explosive);continue}
  if(layout.phase===2&&['mapa','mapa_heli','mapa_tanc'].includes(item.kind)){
    const color={mapa:0xead59b,mapa_heli:0xafd9ef,mapa_tanc:0xc6b06a}[item.kind];
    box(group,3,1.1,2.3,0x6b654b,0,.45,0);box(group,2.6,.07,1.8,color,0,1.04,0);
    for(const x of[-.65,.65])box(group,.03,.015,1.75,0x69775c,x,1.085,0);
    box(group,1.9,.015,.04,0x69775c,0,1.09,0);
    tag({mapa:'Mapa HQ',mapa_heli:'Mapa helicòpters',mapa_tanc:'Mapa tancs'}[item.kind],item.x,2.3,item.z);tags.at(-1).interior=true;continue;
  }
  const colors={'munició':0xc4ad57,'farmaciola':0xf5ede2,'granades':0x66894e,'mapa':0xd9d2ac,'disfressa':0x993838,'explosius':0x58664a};box(group,1.5,.8,1.15,colors[item.kind],0,.55,0);
  if(item.kind==='farmaciola'){box(group,.9,.05,.22,0xd43a3a,0,.98,0);box(group,.22,.05,.9,0xd43a3a,0,.99,0)}
 }

 // Boundaries deliberately leave wide entrance openings.
 if(layout.fence){
  for(const [a,b] of layout.fence){const length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/6);
    for(let i=0;i<n;i++){const p=[a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n],q=[a[0]+(b[0]-a[0])*(i+1)/n,a[1]+(b[1]-a[1])*(i+1)/n];
      for(const [x,z] of[p,q])cylinder(root,.12,4.9,0x4a4f52,x,2.65,z);
      for(const y of[.75,1.75,2.75,3.75,4.55])rod(root,[p[0],y,p[1]],[q[0],y,q[1]],.028,0x30363a);
      rod(root,[p[0],.8,p[1]],[q[0],4.55,q[1]],.024,0x353b3e);rod(root,[p[0],4.55,p[1]],[q[0],.8,q[1]],.024,0x353b3e);
      for(let j=0;j<4;j++){const t=(j+.5)/4,x=p[0]+(q[0]-p[0])*t,z=p[1]+(q[1]-p[1])*t;rod(root,[x-.22,4.7,z-.22],[x+.22,5.1,z+.22],.024,0x292f32)}
    }
  }
 }else if(!isPort){const hw=layout.size[0]/2-3,hd=layout.size[1]/2-5;
   for(let x=-hw;x<=hw;x+=6){if(Math.abs(x)>10)box(root,4.5,1.1,.8,0x7e806e,x,.7,hd);box(root,4.5,1.1,.8,0x7e806e,x,.7,-hd)}
   for(let z=-hd+6;z<hd;z+=6)for(const x of[-hw,hw])if(!(layout.id==='outpost'&&x<0&&Math.abs(z-20)<8))box(root,.8,1.1,4.5,0x7e806e,x,.7,z);
 }
 const overlayMaterial=c=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:.28,depthWrite:false});
 function strip(a,b,width,color){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),m=new T.Mesh(new T.BoxGeometry(width,.015,len),overlayMaterial(color));m.rotation.y=Math.atan2(dx,dz);m.position.set((a[0]+b[0])/2,.85,(a[1]+b[1])/2);overlays.add(m)}
 for(const route of layout.routes){for(let i=1;i<route.points.length;i++)strip(route.points[i-1],route.points[i],route.width,0x53dfba)}
 for(const zone of layout.zones){const m=new T.Mesh(new T.PlaneGeometry(zone.w,zone.d),overlayMaterial(0xffc85c));m.rotation.x=-Math.PI/2;m.position.set(zone.x,.91,zone.z);overlays.add(m)}
 const line=new T.Line(new T.BufferGeometry().setFromPoints(layout.patrol.map(([x,z])=>new T.Vector3(x,1,z))),new T.LineDashedMaterial({color:0xed6464,dashSize:1.6,gapSize:.9}));line.computeLineDistances();overlays.add(line);
 for(const [x,z] of layout.entrances){const a=new T.Mesh(new T.ConeGeometry(2,4,3),new T.MeshBasicMaterial({color:0xffcf6d}));a.rotation.x=z<0?Math.PI/2:-Math.PI/2;if(x<0){a.rotation.z=-Math.PI/2;a.rotation.x=0}a.position.set(x,1,z);overlays.add(a)}
 // Site scale reference is visible from the plan view too.
 for(let x=-45;x<=-25;x+=5)box(root,.14,.07,1.2,0xeff3cf,x,.28,isPort?-51:48);
 box(root,20,.07,.15,0xeff3cf,-35,.28,isPort?-51:48);tag('20 m',-35,1,isPort?-52:49);
 overlays.visible=false;root.updateMatrixWorld(true);
 return{root,roofs,tags,overlays,layout};
}
