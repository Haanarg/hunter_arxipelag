import {createCompoundStructures} from './compound-structures.mjs';
import * as T from '../vendor/three-r186.module.mjs';
export function createCompoundConcept(layout){
 const structures=createCompoundStructures();
 const root=new T.Group(),roofs=[],tags=[],overlays=new T.Group(),materials=new Map();root.add(overlays);
 const mat=(color,profile='paint')=>{const key=color+profile;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:profile==='metal'?.57:.92,metalness:profile==='metal'?.25:0,flatShading:true}));return materials.get(key)};
 const box=(g,w,h,d,c,x=0,y=0,z=0,profile='paint')=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c,profile));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m};
 const cylinder=(g,r,h,c,x,y,z)=>{const m=new T.Mesh(new T.CylinderGeometry(r,r,h,10),mat(c,'metal'));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};
 const rod=(g,a,b,r,c)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),6),mat(c,'metal'));m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());g.add(m);return m};
 const tag=(text,x,y,z)=>tags.push({text,position:new T.Vector3(x,y,z)});
 const building=window.HUNTER_BUILDINGS.create(T,{material:mat,materialProfile:()=>({roughness:.88}),box});
 const isPort=layout.id==='port'&&!layout.waterfront,coast=layout.waterfront;
 const type=layout.type||layout.id;
 if(coast){
   const depth=coast.shore+layout.size[1]/2;
   box(root,layout.size[0]+12,2,depth,0x498535,0,-1.05,-layout.size[1]/2+depth/2);
   box(root,layout.size[0]+12,.12,8,0xc2b384,0,.02,coast.shore-4);
   const seaDepth=layout.size[1]/2-coast.shore+6;
   box(root,layout.size[0]+12,.22,seaDepth,0x329da8,0,-.28,coast.shore+seaDepth/2);
   for(let z=coast.shore+8;z<layout.size[1]/2;z+=12)for(let x=-layout.size[0]/2+8;x<layout.size[0]/2;x+=23)box(root,6,.025,.14,0x7bcbd0,x,-.15,z);
 }else{
   box(root,layout.size[0]+12,2,isPort?76:layout.size[1]+8,0x498535,0,-1.05,isPort?-25:0);
   if(layout.family!=='civil')box(root,layout.size[0]-6,.18,isPort?61:layout.size[1]-10,0x8e8c75,0,.02,isPort?-24:0);
 }
 box(root,layout.size[0]+14,3,layout.size[1]+12,0x43594e,0,-3.5,0);
 // Solid surfaces remain visible when the circulation overlay is hidden.
 if(layout.phase===4)for(const r of layout.routes)for(let i=1;i<r.points.length;i++){
   const a=r.points[i-1],b=r.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
   if(!len)continue;
   const road=box(root,r.width,.065,len,r.kind==='road'?0x68716c:0xb2a17d,(a[0]+b[0])/2,.16,(a[1]+b[1])/2);road.rotation.y=Math.atan2(dx,dz);
   if(r.kind==='road')for(let d=3;d<len-2;d+=8){const marker=box(root,.16,.016,3,0xe2d9b2,a[0]+dx*d/len,.202,a[1]+dz*d/len);marker.rotation.y=road.rotation.y;}
 }
 for(const p of layout.piers||[]){
   box(root,p.w,.5,p.d,0x927a58,p.x,.38,p.z);
   for(let z=p.z-p.d/2+1;z<p.z+p.d/2;z+=1.6)box(root,p.w-.1,.03,.05,0x554b3c,p.x,.65,z);
   for(let z=p.z-p.d/2+2;z<p.z+p.d/2;z+=8)for(const side of[-1,1]){cylinder(root,.2,2,0x574e3b,p.x+side*(p.w/2-.3),-.3,z);cylinder(root,.22,.5,0x354449,p.x+side*(p.w/2-.6),.9,z);}
 }
 for(const b of layout.barriers||[]){
   box(root,.65,2.2,.65,0x58675e,b.x-b.w/2,1.1,b.z);
   box(root,b.w,.24,.25,0xeee2bc,b.x,1.8,b.z);
   for(let x=-b.w/2+1;x<b.w/2;x+=1.5)box(root,.6,.26,.27,0x9d4235,b.x+x,1.8,b.z);
   tag('Barrera · proposta mòbil',b.x,3,b.z);
 }
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
 if(layout.antenna){const a=layout.antenna,g=structures.antenna(a);g.position.set(a.x,.2,a.z);root.add(g);tag('Antena · '+a.height+' m',a.x,32*(a.scale||1),a.z)}
 for(const b of layout.buildings){
   const shell=b.hangar?building.createHangarShell({width:b.w,depth:b.d,height:b.h,wallColor:0xbab99d,roofColor:0xb7c1b4}):building.createShell({width:b.w,depth:b.d,height:b.h,wallColor:b.bunker?0xb7bdb3:b.wood?0x96714b:0xc9b98d,roofColor:b.bunker?0x929d91:b.wood?0x627e78:layout.friendly?0x547b79:0x79584e});
   const g=shell.group;g.position.set(b.x,.24,b.z);root.add(g);roofs.push(shell.roof);
   if(layout.satellite?.buildingId===b.id){const assembly=structures.satellite(layout.satellite.radius);assembly.position.y=b.h+1.2;shell.roof.add(assembly);tag('Parabòlica · Ø 18 m',b.x,b.h+19,b.z)}
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
     const solid=b.bunker||type==='polvori'&&b.id!=='guard';
     if(layout.throughBuildings?.includes(b.id)){for(const x of[-b.w/2,b.w/2])wall(x,0,.6,b.d)}
     else if(solid){wall(0,-b.d/2,b.w,.6);for(const x of[-b.w/2,b.w/2])wall(x,0,.6,b.d)}else{building.addWindowedWall(g,{lx:0,lz:-b.d/2,sx:b.w,sz:.45,height:b.h,material:shell.walls});for(const x of[-b.w/2,b.w/2])building.addWindowedWall(g,{lx:x,lz:0,sx:.45,sz:b.d,height:b.h,material:shell.walls})}
     const door=layout.throughBuildings?.includes(b.id)?12:4;wall(-(b.w+door)/4,b.d/2,(b.w-door)/2,.45);wall((b.w+door)/4,b.d/2,(b.w-door)/2,.45);
     building.addWall(g,{lx:0,lz:b.d/2,sx:door,sz:.45,height:b.h-4.4,material:shell.walls,y:4.4+(b.h-4.4)/2});
     if(b.bunker){
       // Batter all four exterior walls inward, keeping the full base footprint.
       // Interior partitions and the vertical entrance portal are built afterwards.
       const inset=3.5;
       for(const mesh of g.children.filter(o=>o.isMesh)){
         const positions=mesh.geometry.attributes.position;
         for(let i=0;i<positions.count;i++){
           const y=positions.getY(i)+mesh.position.y,t=Math.max(0,Math.min(1,y/b.h));
           positions.setX(i,(positions.getX(i)+mesh.position.x)*(1-2*inset*t/b.w)-mesh.position.x);
           positions.setZ(i,(positions.getZ(i)+mesh.position.z)*(1-2*inset*t/b.d)-mesh.position.z);
         }
         positions.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
       }
       shell.roof.scale.set((b.w-2*inset)/(b.w+1.35),1,(b.d-2*inset)/(b.d+1.35));
       g.userData.bunkerWallInset=inset;
     }
     box(g,5,.15,3,0xafa88c,0,.1,b.d/2+1.5);
     box(g,5,1.2,1.8,0x776044,-b.w/2+4,.9,-b.d/2+3);
     if(b.id==='barracks')for(const x of[-5,5])for(const z of[-6,0]){box(g,2.5,.65,4,0x4c5b43,x,.6,z);box(g,2.2,.25,3.5,0x939978,x,1.05,z)}
     if(b.id==='clinic'){
       box(shell.roof,4,.06,1.1,0xf3efe3,0,b.h+1.23,0);box(shell.roof,1.1,.06,4,0xf3efe3,0,b.h+1.24,0);
       for(const x of[-6,6]){box(g,2.8,.7,5,0x64796c,x,.8,-2);box(g,2.6,.25,4.8,0xe4e9d9,x,1.27,-2)}
     }
     if(b.bunker){

       // Central corridor: 7 m wide, doors to four side rooms.
       for(const x of[-4,4])for(const [z,d]of[[-12.5,3],[-4,6],[7,10]])wall(x,z,.6,d,8);
       for(const x of[-11,11])wall(x,-7,12,.6,8);
       const gate=box(g,3.8,4.35,.4,0x59635b,0,2.18,b.d/2+.2);gate.userData.previewBunkerGate=true;
       // Projecting trapezoidal entrance surround, as in the original Hunter HQ.
       for(const sign of[-1,1]){const shape=new T.Shape();shape.moveTo(sign*1.9,0);shape.lineTo(sign*3.5,0);shape.lineTo(sign*2.7,5.2);shape.lineTo(sign*1.9,5.2);shape.closePath();const post=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:3.3,bevelEnabled:false}),mat(0x795337));post.position.z=b.d/2-2.8;g.add(post)}
       box(g,5.4,.85,3.3,0x795337,0,4.8,b.d/2-1.15);
       for(const x of[-1.3,0,1.3])box(g,.10,3.5,.08,0x303e36,x,2.2,b.d/2+.45);
       box(g,5,1.1,2.5,0x5a5944,0,.9,-12);tag('Porta · 10 s',b.x,6,b.z+b.d/2+1);
     }
     if(b.wood){
       for(const side of[-1,1])for(let z=-b.d/2+.8;z<b.d/2;z+=1.3)box(g,.08,b.h-.4,.08,0x654f39,side*(b.w/2+.06),b.h/2,z);
       box(g,6,.25,3.6,0x9f835e,0,.28,b.d/2+1.8);
       for(const x of[-2.7,2.7])cylinder(g,.10,4.5,0x67523a,x,2.5,b.d/2+3.2);
       const porch=box(g,6.6,.18,4.2,0x627e78,0,4.8,b.d/2+1.7);roofs.push(porch);
     }
     tag(b.label,b.x,b.h+2,b.z);
   }
 }
 function prop(kind,x,z){
   if(kind==='bench'){box(root,4,.24,1.3,0x806447,x,.85,z);for(const dx of[-1.4,1.4])box(root,.2,.8,1,0x485249,x+dx,.4,z);box(root,4,1,.18,0x806447,x,1.45,z+.55);return}
   if(kind==='well'){const ring=new T.Mesh(new T.CylinderGeometry(1.5,1.7,1.4,12,1,true),mat(0x858976));ring.position.set(x,.8,z);root.add(ring);cylinder(root,1.4,.08,0x284955,x,.15,z);for(const dx of[-1.8,1.8])box(root,.2,3.8,.2,0x66573e,x+dx,1.9,z);box(root,4.4,.22,3.6,0x68766b,x,3.8,z);return}
   if(kind==='lifebuoy'){cylinder(root,.12,2.3,0x5b6050,x,1.15,z);const ring=new T.Mesh(new T.TorusGeometry(.6,.15,6,16),mat(0xe57846));ring.position.set(x,1.5,z);root.add(ring);return}
   if(kind==='flag'){root.add(building.createFlag({x,y:.2,z,color:layout.friendly?0x378adc:0xd62a35}));return}
   if(kind==='crate'){box(root,2.8,2.2,2.6,0x89603b,x,1.25,z);for(const side of[-1,1])box(root,.12,2.25,2.65,0x403e31,x+side*.9,1.27,z);return}
   if(kind==='barrel'){cylinder(root,.75,1.8,0x5f7370,x,1.15,z);for(const h of[.5,1.75])cylinder(root,.79,.15,0x394749,x,h,z);return}
   if(kind==='fuel'){const c=cylinder(root,1.3,5,0x697977,x,2,z);c.rotation.z=Math.PI/2;box(root,6,.5,3,0x4b5757,x,.45,z);return}
   if(kind==='generator'){box(root,7,.4,4.5,0x6d7369,x,.35,z);box(root,5,2.5,3,0x57694f,x,1.8,z);for(let k=-2;k<=2;k++)box(root,.12,1.6,.06,0x29383a,x+k*.55,1.9,z+1.53);cylinder(root,.17,3,0x41484b,x+1.5,3.2,z-.7);box(root,1,.7,.08,0x303b3e,x-1.5,2,z+1.55);return}
   if(kind==='lamp'){cylinder(root,.12,8,0x3f5052,x,4,z);box(root,2,.3,.8,0xebd48a,x,8,z);return}
   if(kind==='sandbag')for(let row=0;row<2;row++)for(let i=0;i<5-row;i++)box(root,1.3,.65,.95,0xaaa17a,x+(i-(4-row)/2)*1.45,.65+row*.6,z);
 }
 layout.props.forEach(([kind,x,z])=>prop(kind,x,z));
 for(const {x,z} of(layout.towers||(layout.tower?[layout.tower]:[]))){const g=new T.Group();g.position.set(x,.2,z);root.add(g);
  for(const a of[-2,2])for(const b of[-2,2]){box(g,.32,9,.32,0x495456,a,4.5,b);rod(g,[a,.3,b],[-a,8,b],.08,0x495456)}
  box(g,5,.45,5,0x5f6657,0,8.5,0);box(g,4,1.5,.3,0x8c5144,0,9.4,-2);for(const a of[-2,2])box(g,.3,1.5,4,0x8c5144,a,9.4,0);
  const roof=box(g,5.8,.3,5.8,0x625d4c,0,11,0);roofs.push(roof);tag('Torre',x,12,z);
  for(let y=.4;y<8.5;y+=.65)rod(g,[-.6,y,2.5],[.6,y,2.5],.08,0x687375);
 }
 const makeVehicle=window.HUNTER_VEHICLES.createFactory(T,{box,material:mat,shadows:true});
 for(const v of layout.vehicles){const model=makeVehicle(v.t);model.position.set(v.x,isPort||coast&&v.z>coast.shore?-.05:.25,v.z);model.rotation.y=v.hd;root.add(model);model.userData.previewVehicle=v.t;
  if(v.t==='tanc')tag('Tanc',v.x,5,v.z);}
 for(const [i,[x,z]] of layout.soldiers.entries()){
  const model=window.HUNTER_CHARACTERS.createCommando(T);model.position.set(x,isPort&&z>12?.68:.25,z);model.rotation.y=i*1.7;root.add(model);
 }
 if(layout.general){const p=layout.general,model=window.HUNTER_GENERAL_MODEL.create(T);model.position.set(p.x,.25,p.z);root.add(model);tag('General',p.x,4,p.z);tags.at(-1).interior=true;}
 if(layout.spawn){const p=layout.spawn,model=window.HUNTER_CHARACTERS.createPlayer(T,{box});model.position.set(p.x,.25,p.z);root.add(model);tag('Inici',p.x,4,p.z);}
 for(const item of layout.loot){
  const group=new T.Group();group.position.set(item.x,.35,item.z);group.userData.previewLoot=item.kind;root.add(group);
  if(item.kind==='franctirador'){const rifle=window.HUNTER_CHARACTERS.createSniperRifle?.(T);if(rifle){group.add(rifle)}else{box(group,3.4,.18,.22,0x364137,0,.8,0);box(group,1,.3,.3,0x62533b,-1,.7,0)}tag('Franctirador garantit',item.x,2,item.z);continue;}
  if(item.kind==='bazooka'){
    box(group,4,.2,1.6,0x786748,0,.45,0);for(const side of[-1,1])box(group,.2,.7,1.3,0x424e46,side*1.4,.1,0);
    const tube=cylinder(group,.22,2.65,0x58664a,0,1,0);tube.rotation.z=Math.PI/2;
    for(const side of[-1,1]){const cap=cylinder(group,.29,.2,0x252b27,side*1.42,1,0);cap.rotation.z=Math.PI/2}box(group,.16,.4,.22,0x252b27,-.35,.72,0);box(group,.12,.2,.3,0x737b74,.35,1.25,0);
    tag('Bazooka garantit',item.x,2,item.z);continue;
  }
  if(item.kind==='explosius'&&window.HUNTER_EXPLOSIVE_VISUALS){const explosive=window.HUNTER_EXPLOSIVE_VISUALS.create(T,false);explosive.scale.setScalar(window.HUNTER_EXPLOSIVE_VISUALS.PICKUP_SCALE);group.add(explosive);continue}
  if((layout.phase===2||type==='comunicacions')&&['mapa','mapa_heli','mapa_tanc'].includes(item.kind)){
    const color={mapa:0xead59b,mapa_heli:0xafd9ef,mapa_tanc:0xc6b06a}[item.kind];
    box(group,3,1.1,2.3,0x6b654b,0,.45,0);box(group,2.6,.07,1.8,color,0,1.04,0);
    for(const x of[-.65,.65])box(group,.03,.015,1.75,0x69775c,x,1.085,0);
    box(group,1.9,.015,.04,0x69775c,0,1.09,0);
    tag({mapa:'Mapa HQ',mapa_heli:'Mapa helicòpters',mapa_tanc:'Mapa tancs'}[item.kind],item.x,2.3,item.z);tags.at(-1).interior=true;continue;
  }
  const colors={'munició':0xc4ad57,'farmaciola':0xf5ede2,'granades':0x66894e,'mapa':0xd9d2ac,'disfressa':0x993838,'explosius':0x58664a,'paracaigudes':0x657f4b};box(group,1.5,.8,1.15,colors[item.kind],0,.55,0);
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
 }else if(!isPort&&layout.boundary!=='open'){const hw=layout.size[0]/2-3,hd=layout.size[1]/2-5;
   for(let x=-hw;x<=hw;x+=6){if(Math.abs(x)>10)box(root,4.5,1.1,.8,0x7e806e,x,.7,hd);box(root,4.5,1.1,.8,0x7e806e,x,.7,-hd)}
   for(let z=-hd+6;z<hd;z+=6)for(const x of[-hw,hw])if(!(layout.id==='outpost'&&x<0&&Math.abs(z-20)<8))box(root,.8,1.1,4.5,0x7e806e,x,.7,z);
 }
 const overlayMaterial=c=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:.28,depthWrite:false});
 function strip(a,b,width,color){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),m=new T.Mesh(new T.BoxGeometry(width,.015,len),overlayMaterial(color));m.rotation.y=Math.atan2(dx,dz);m.position.set((a[0]+b[0])/2,.85,(a[1]+b[1])/2);overlays.add(m)}
 for(const route of layout.routes){for(let i=1;i<route.points.length;i++)strip(route.points[i-1],route.points[i],route.width,0x53dfba)}
 for(const zone of layout.zones){const m=new T.Mesh(new T.PlaneGeometry(zone.w,zone.d),overlayMaterial(0xffc85c));m.rotation.x=-Math.PI/2;m.position.set(zone.x,.91,zone.z);overlays.add(m)}
 for(const patrol of layout.vehiclePatrols||[]){for(let i=1;i<patrol.points.length;i++)strip(patrol.points[i-1],patrol.points[i],patrol.width,0xe79563);tag(patrol.label,patrol.points[0][0],2,patrol.points[0][1]);}
 const line=new T.Line(new T.BufferGeometry().setFromPoints((layout.patrol.length?layout.patrol:[[0,-5],[0,-5]]).map(([x,z])=>new T.Vector3(x,1,z))),new T.LineDashedMaterial({color:0xed6464,dashSize:1.6,gapSize:.9}));line.computeLineDistances();overlays.add(line);
 for(const [x,z] of layout.entrances){const a=new T.Mesh(new T.ConeGeometry(2,4,3),new T.MeshBasicMaterial({color:0xffcf6d}));a.rotation.x=z<0?Math.PI/2:-Math.PI/2;if(Math.abs(x)>Math.abs(z)){a.rotation.z=-Math.PI/2;a.rotation.x=0}a.position.set(x,1,z);overlays.add(a)}
 for(const r of layout.routes)if(layout.phase===4&&!layout.buildings.some(b=>b.label===r.label)){const p=r.points[0];tag(r.label,p[0],1.2,p[1]);}
 // Site scale reference is visible from the plan view too.
 for(let x=-45;x<=-25;x+=5)box(root,.14,.07,1.2,0xeff3cf,x,.28,isPort?-51:48);
 box(root,20,.07,.15,0xeff3cf,-35,.28,isPort?-51:48);tag('20 m',-35,1,isPort?-52:49);
 overlays.visible=false;root.updateMatrixWorld(true);
 return{root,roofs,tags,overlays,layout};
}
