// Preview-only comparison; production imports method B directly.
export {loadHumveeMethodB,describeHumvee3D} from './humvee-procedural-b.mjs';
const PARAM={
 width:5.22,length:8.15,
 wheelRadius:.875,wheelWidth:.514,
 wheelCenters:[-2.925,2.727],wheelSides:[-1.785,1.785],
 bodyColor:0x687450,roofColor:0x586448
};
// A: parametric shapes; no imported model, source vertices or baked GLB data.
// All pieces are built from explicit dimensions, editable parameters and Three.js.
export function createHumveeMethodA(THREE){
 const model=new THREE.Group();
 model.name='Humvee A · malla procedural paramètrica';
 model.userData.method='A';
 const mats=new Map();
 function material(hex,metal=0,glass=false){
  const key=hex+'_'+metal+'_'+glass;
  if(mats.has(key))return mats.get(key);
  const m=new THREE.MeshStandardMaterial({color:hex,
   metalness:metal,roughness:glass?.17:.83,
   transparent:glass,opacity:glass?.38:1,depthWrite:!glass,
   side:THREE.DoubleSide,flatShading:true});
  mats.set(key,m);return m;
 }
 const body=material(PARAM.bodyColor,.03),hood=material(0x71805a,.04),
  roof=material(PARAM.roofColor,.01),frame=material(0x364237,.1),
  black=material(0x252e2a,.05),tire=material(0x252b28,.03),
  rim=material(0x788078,.28),hub=material(0x414841,.24),
  glass=material(0x91b1b4,0,true),lights=material(0xf2dfa1,0),
  red=material(0x9e3c32,0),chrome=material(0x8a928b,.34),
  shadow=material(0x414b39,.1);
 function mesh(parent,g,mat,name){
  const m=new THREE.Mesh(g,mat);m.name=name||'piece';
  m.castShadow=true;m.receiveShadow=true;
  parent.add(m);return m;
 }
 function block(parent,mat,size,position,name){
  const [w,h,l]=size,[x,y,z]=position;
  const m=mesh(parent,new THREE.BoxGeometry(w,h,l),mat,name);
  m.position.set(x,y,z);return m;
 }
 function prism(parent,mat,shape,thickness,axis,name){
  // Procedural polygon extrusion; local 2D outline defines the shape.
  const s=new THREE.Shape();
  shape.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{
   depth:thickness,steps:1,bevelEnabled:false,curveSegments:1
  });
  const m=mesh(parent,g,mat,name);
  if(axis==='xz')m.rotation.x=-Math.PI/2;
  if(axis==='yz')m.rotation.y=Math.PI/2;
  return m;
 }
 function surface(parent,mat,points,name){
  const verts=[];
  for(const p of [points[0],points[1],points[2],points[0],points[2],points[3]])
   verts.push(...p);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.computeVertexNormals();
  return mesh(parent,g,mat,name);
 }
 function shaft(parent,mat,a,b,r,segments=8,name){
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);
  const m=mesh(parent,new THREE.CylinderGeometry(r,r,d.length(),segments,1),mat,name);
  m.position.copy(p).add(q).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  return m;
 }
 // Strong ladder frame, recessed between the four wheel openings.
 block(model,frame,[3.7,.24,7.65],[0,1.08,0],'Main-frame');
 for(const side of [-1,1])
  block(model,black,[.18,.26,7.60],[side*1.40,1.00,0],'Chassis-beam');
 for(const z of [-3.02,2.72])
  shaft(model,black,[-1.84,.85,z],[1.84,.85,z],.10,8,'Axle');
 // Low main body between axles; 3 discrete lower panels keep the wheel
 // surrounds visible. The wheel arches are cut from 2D fender profiles.
 block(model,body,[3.65,.72,7.87],[0,1.53,0],'Lower-unibody');
 const fenderProfile=[[-1.27,1.15],[-1.25,1.85],[-1.10,2.10],
  [1.20,2.10],[1.40,1.72],[1.30,1.15]];
 for(const side of [-1,1]){
  const flank=prism(model,body,fenderProfile,.15,'yz','Door-lower-side-'+side);
  flank.position.x=side*1.76;flank.position.z=0;
 }
 // Front hood: clipped/angled long 4×4 bonnet, not just a box.
 block(model,body,[3.83,.68,2.48],[0,1.62,-2.66],'Front-engine-bay');
 surface(model,hood,[[-1.90,2.0,-4.00],[1.90,2.0,-4.00],
   [1.91,2.12,-1.38],[-1.91,2.12,-1.38]],'Sloped-hood');
 block(model,black,[3.68,.30,.31],[0,1.11,-4.12],'Front-bumper');
 block(model,body,[3.81,.30,.28],[0,1.34,-4.01],'Front-bar');
 block(model,frame,[2.68,.58,.07],[0,1.70,-4.039],'Grille-recess');
 for(let i=-4;i<=4;i++)
  block(model,chrome,[.043,.47,.10],[i*.283,1.70,-4.09],'Radiator-grille-slot');
 for(const x of [-1.42,1.42]){
  block(model,lights,[.53,.31,.055],[x,1.73,-4.055],'Headlight');
  block(model,red,[.52,.31,.06],[x,1.53,4.06],'Rear-lamp');
 }
 // Rear cargo body: enclosed wedge from the roof down to the tail.
 // At z=1.49, the roof starts its descent at y=3.09; at z=4.01
 // the solid rear lid finishes at y=2.08. There is NO rear window.
 block(model,body,[3.84,.64,2.53],[0,1.74,2.84],'Rear-utility-shell');
 block(model,frame,[3.70,.28,.28],[0,1.05,4.11],'Rear-bumper');
 // Hollow-looking four-door cabin: 2 separate doors per side with seams.
 block(model,frame,[3.30,.14,3.19],[0,1.22,.04],'Cabin-floor');
 block(model,roof,[3.46,.22,2.95],[0,3.09,.06],'Military-roof');
 for(const side of [-1,1]){
  const x=side*1.76;
  for(const [z0,z1] of [[-1.42,-.03],[.05,1.44]]){
   const center=(z0+z1)/2,l=z1-z0;
   block(model,body,[.14,.92,l-.024],[x,1.77,center],'Flat-door-panel');
   block(model,frame,[.016,.028,l],[x+side*.092,2.24,center],'Door-window-sill');
   block(model,black,[.09,.075,.24],[x+side*.14,2.21,z1-.29],'Door-handle');
   surface(model,glass,[[x+side*.056,2.29,z0+.035],
     [x+side*.056,2.29,z1-.045],
     [x-side*.20,2.92,z1-.18],
     [x-side*.20,2.92,z0+.09]],'Door-glass');
  }
  for(const z of [-1.39,.02,1.48]){
   shaft(model,frame,[x,2.22,z],[x-side*.17,3.02,z+.065],.048,7,'Cabin-pillar');
  }
  // Door sill and running board.
  block(model,shadow,[.38,.11,3.26],[side*1.91,1.29,.02],'Door-step');
  // Frameless angular side mirrors.
  shaft(model,black,[side*1.67,2.22,-1.22],[side*2.26,2.28,-1.40],.06,7,'Mirror-arm');
  block(model,frame,[.17,.46,.48],[side*2.30,2.28,-1.39],'Mirror');
 }
 // Tapered windshield and rear window; front of vehicle faces -Z.
 surface(model,glass,[[-1.49,2.28,-1.55],[1.49,2.28,-1.55],
   [1.47,2.95,-1.25],[-1.47,2.95,-1.25]],'Windshield');
 // Continuous opaque tailback: a real sloped roof, not a window cover.
 // The broad slope meets the rear edge of the cabin roof without gaps.
 const cargoTopZ=1.49,cargoTailZ=4.05;
 const cargoRoofY=3.09,cargoTailY=2.075;
 surface(model,roof,[
  [-1.73,cargoRoofY,cargoTopZ],
  [ 1.73,cargoRoofY,cargoTopZ],
  [ 1.90,cargoTailY,cargoTailZ],
  [-1.90,cargoTailY,cargoTailZ]
 ],'Rear-cargo-sloping-roof');
 // Solid triangular metal panels on both sides close the cargo space.
 // Their upper edges follow the slope; the thick angled seams give the
 // body a continuous, robust profile rather than a "covered window".
 for(const sign of [-1,1]){
  const x=sign*1.815;
  surface(model,body,[
   [x,2.06,cargoTopZ],
   [x,cargoRoofY,cargoTopZ],
   [sign*1.90,cargoTailY,cargoTailZ],
   [x,2.06,cargoTopZ]
  ],'Rear-cargo-solid-wedge-'+sign);
  shaft(model,frame,
   [sign*1.73,cargoRoofY,cargoTopZ],
   [sign*1.90,cargoTailY,cargoTailZ],
   .070,8,'Rear-cargo-angled-edge-'+sign);
  block(model,shadow,[.11,.13,2.55],
   [sign*1.88,2.01,2.78],'Rear-cargo-side-sill-'+sign);
 }
 // Tailgate closes the wedge at the rear, behind the ramp.
 block(model,body,[3.79,.20,.14],[0,2.005,4.02],'Rear-cargo-tailgate-top');
 for(const sign of [-1,1])
  shaft(model,frame,[sign*1.53,2.22,-1.59],
   [sign*1.47,3.02,-1.26],.065,8,'Windscreen-pillar');
 block(model,roof,[3.48,.11,.14],[0,3.13,-1.39],'Front-roof-rail');
 block(model,roof,[3.48,.11,.14],[0,3.13,1.51],'Rear-roof-to-cargo-seam');
 // Four real A4.3-style wheels at the correct approved dimensions.
 const steering=[],rolling=[];
 for(const z of PARAM.wheelCenters)for(const side of [-1,1]){
  const x=side*1.785,center=[x,.865,z];
  const steer=new THREE.Group();steer.position.set(...center);
  steer.name=(z<0?'front':'rear')+'-steering-'+side;
  model.add(steer);
  const spin=new THREE.Group();spin.name='wheel-roll';steer.add(spin);
  const wheelPart=(mat,r,len,sides,name)=>{
   const o=mesh(spin,new THREE.CylinderGeometry(r,r,len,sides),mat,name);
   o.rotation.z=Math.PI/2;
   return o;
  };
  wheelPart(tire,.875,.514,12,'A4.3-tire');
  wheelPart(rim,.50,.53,10,'A4.3-rim');
  wheelPart(hub,.22,.55,8,'A4.3-hub');
  spin.userData.radius=.875;
  rolling.push(spin);
  if(z<0)steering.push(steer);
  // Raised arched fender surround: the tire remains freely visible.
  const outer=side*1.85;
  for(let i=0;i<6;i++){
   const a=Math.PI*i/6,b=Math.PI*(i+1)/6;
   const x0=z-1.00*Math.cos(a),y0=.865+1.00*Math.sin(a);
   const x1=z-1.00*Math.cos(b),y1=.865+1.00*Math.sin(b);
   shaft(model,shadow,[outer,y0,x0],[outer,y1,x1],.055,6,'Wheel-arch');
  }
 }
 model.userData.wheels=rolling;
 model.userData.steeringPivots=steering;
 // Approved rear antenna: left rear corner, matching the B silhouette.
 block(model,shadow,[.24,.20,.25],[-1.38,2.78,3.46],'Antenna-housing');
 shaft(model,frame,[-1.38,2.81,3.46],[-1.38,3.31,3.46],.065,8,'Antenna-base');
 shaft(model,chrome,[-1.38,3.29,3.46],[-1.40,4.15,3.40],.026,8,'Antenna-whip');
 const tip=mesh(model,new THREE.SphereGeometry(.06,7,5),chrome,'Antenna-tip');
 tip.position.set(-1.40,4.15,3.40);
 // Do not change actual 175% physical size: all dimensions above are
 // in world units (same as the already baked B model at scale 1.75).
 return model;
}
