import * as THREE from './vendor/three-r186.module.mjs';

const mat=(color,rough=.72,metal=.08)=>new THREE.MeshStandardMaterial({color,flatShading:true,roughness:rough,metalness:metal});
const C={body:0x66745c,dark:0x343b35,glass:0x416a79,metal:0x485155,seat:0x2d302c,accent:0xc5a15b};

function box(g,w,h,d,c,x,y,z,metal=.08){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,.72,metal));
  m.position.set(x,y,z);g.add(m);return m
}
function rod(g,a,b,r,c=C.metal){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),D=B.clone().sub(A);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,D.length(),7),mat(c,.58,.3));
  m.position.copy(A.add(B).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),D.normalize());
  g.add(m);return m
}
function sphere(g,sx,sy,sz,c,x,y,z){
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),mat(c,.5,.06));
  m.scale.set(sx,sy,sz);m.position.set(x,y,z);g.add(m);return m
}
function rotorSet(g,span=14.4,tailZ=7.15){
  rod(g,[0,3.05,0],[0,3.82,0],.13);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.18,8),mat(C.metal,.5,.5));
  hub.position.set(0,3.82,0);g.add(hub);
  const rotor=new THREE.Group();rotor.position.set(0,3.82,0);
  for(const a of[0,Math.PI/2]){
    const b=box(rotor,span,.08,.34,C.dark,0,0,0,.25);b.rotation.y=a;
  }
  g.add(rotor);
  const tail=new THREE.Group();tail.position.set(.36,3.42,tailZ);
  box(tail,.1,1.85,.14,C.dark,0,0,0,.25);
  box(tail,.1,.14,1.85,C.dark,0,0,0,.25);
  g.add(tail);
  g.userData.rotor=rotor;g.userData.tailRotor=tail;
}
function skids(g,width=1.55,z0=-1.9,z1=2.0){
  for(const x of[-width,width]){
    rod(g,[x,.48,z0],[x,.48,z1],.075);
    rod(g,[x*.45,1.15,-1.05],[x,.48,-1.05],.07);
    rod(g,[x*.45,1.15,1.0],[x,.48,1.0],.07);
  }
}
function seats(g,zs=[-.25,.7]){
  for(const z of zs)for(const x of[-.72,.72]){box(g,.55,.55,.48,C.seat,x,1.55,z);box(g,.55,.6,.12,C.seat,x,1.88,z+.18)}
}
function tailBoom(g,startZ=1.7,endZ=7.25,y0=2.52,y1=2.9,width=.38){
  const boom=new THREE.Mesh(new THREE.CylinderGeometry(width*.42,width,Math.hypot(endZ-startZ,y1-y0),6),mat(C.body,.72,.08));
  boom.position.set(0,(y0+y1)/2,(startZ+endZ)/2);
  boom.rotation.x=Math.PI/2-Math.atan2(y1-y0,endZ-startZ);
  g.add(boom);
  box(g,.12,1.35,.88,C.body,0,3.34,endZ-.12);
  box(g,2.25,.1,.58,C.body,0,2.9,endZ-1.05);
}
function finish(g){
  g.rotation.order='YXZ';
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return g
}

export function hueyClassic(){
  const g=new THREE.Group();
  // Cabin: tall, square-sided Huey silhouette.
  box(g,2.9,1.55,3.55,C.body,0,2.05,.15);
  sphere(g,1.42,.92,1.05,C.glass,0,2.18,-2.08);
  // Windshield dividers and roof frame.
  rod(g,[0,1.55,-2.92],[0,2.72,-2.62],.045,C.dark);
  for(const x of[-1.15,1.15])rod(g,[x,1.55,-2.55],[x*.9,2.72,-2.25],.05,C.body);
  box(g,2.65,.28,2.0,C.body,0,2.86,-.2);
  // Open sliding doors.
  for(const side of[-1,1]){
    box(g,.1,1.18,.4,C.body,side*1.46,2.0,-.55);
    box(g,.1,1.18,.4,C.body,side*1.46,2.0,1.35);
    rod(g,[side*1.48,1.42,-.35],[side*1.48,2.58,-.35],.045,C.dark);
    rod(g,[side*1.48,1.42,1.15],[side*1.48,2.58,1.15],.045,C.dark);
  }
  seats(g,[-.35,.75]);tailBoom(g,1.8,7.35,2.58,2.98,.42);skids(g,1.58,-2.0,2.0);rotorSet(g,14.6,7.25);
  // Roof engine doghouse.
  box(g,1.25,.52,1.65,0x525e4b,0,3.08,.72);box(g,.9,.18,.55,C.dark,0,3.39,.85);
  return finish(g);
}

export function hueyShort(){
  const g=new THREE.Group();
  box(g,2.75,1.5,3.15,C.body,0,2.02,.25);
  sphere(g,1.36,.98,1.28,C.glass,0,2.12,-1.95);
  // More rounded early-Huey nose and compact rear cabin.
  sphere(g,1.25,.68,.72,C.body,0,1.7,-2.55);
  for(const x of[-1.18,1.18])box(g,.1,1.0,1.0,0x4b5a50,x,2.05,.25);
  box(g,2.5,.25,1.65,C.body,0,2.83,.2);
  for(const side of[-1,1]){
    box(g,.12,1.18,.88,C.glass,side*1.38,2.08,-.58);
    box(g,.12,1.18,.72,C.dark,side*1.4,2.0,.92);
  }
  seats(g,[.35]);tailBoom(g,1.55,6.95,2.52,2.92,.4);skids(g,1.5,-1.9,1.85);rotorSet(g,14.0,6.86);
  box(g,1.35,.58,1.35,0x515b49,0,3.06,.68);rod(g,[-.55,3.28,.18],[.55,3.28,.18],.07,C.metal);
  return finish(g);
}

export function hueyTransport(){
  const g=new THREE.Group();
  box(g,3.05,1.62,4.15,C.body,0,2.05,.3);
  sphere(g,1.48,.92,1.08,C.glass,0,2.2,-2.35);
  box(g,2.72,.3,2.15,C.body,0,2.9,.05);
  // Large open cargo doors and bench seats.
  for(const side of[-1,1]){
    box(g,.12,1.25,.42,C.body,side*1.54,2.0,-.72);
    box(g,.12,1.25,.42,C.body,side*1.54,2.0,1.72);
    box(g,.12,.16,2.0,C.dark,side*1.55,1.42,.5);
  }
  for(const x of[-.92,.92]){box(g,.42,.48,2.15,C.seat,x,1.55,.55);box(g,.42,.48,2.15,C.seat,-x,1.55,.55)}
  tailBoom(g,2.05,7.65,2.6,3.0,.45);skids(g,1.68,-2.15,2.35);rotorSet(g,15.0,7.55);
  // Bigger engine enclosure and exhaust.
  box(g,1.45,.62,1.8,0x505b49,0,3.12,.82);
  rod(g,[.58,3.15,1.35],[.98,3.2,1.8],.12,C.dark);
  return finish(g);
}

export function hueyBlocky(){
  const g=new THREE.Group();
  // Deliberately more game-like: strong planes, fewer rounded pieces.
  box(g,2.9,1.5,3.75,C.body,0,2.02,.15);
  box(g,2.55,1.18,1.25,C.glass,0,2.15,-2.28);
  box(g,2.25,.42,.55,C.body,0,1.55,-2.9);
  for(const side of[-1,1]){
    const cheek=box(g,.32,1.15,1.35,C.body,side*1.32,2.03,-1.55);cheek.rotation.z=-side*.08;
    box(g,.12,1.12,1.15,C.glass,side*1.46,2.1,.15);
    box(g,.12,1.12,.82,C.dark,side*1.46,2.0,1.35);
  }
  box(g,2.7,.34,2.15,C.body,0,2.92,.15);
  box(g,1.5,.62,1.65,0x505a47,0,3.15,.75);
  tailBoom(g,1.95,7.3,2.58,2.95,.4);skids(g,1.62,-2.05,2.05);rotorSet(g,14.5,7.2);
  // Strong Huey tail fin / stabilizer silhouette.
  box(g,.15,1.7,.9,C.body,0,3.35,7.18);
  box(g,2.55,.12,.66,C.body,0,2.88,6.15);
  return finish(g);
}

export const concepts=[
  {name:'1 · Huey clàssic',create:hueyClassic,desc:'Cabina alta, morro vidrat i portes laterals obertes.'},
  {name:'2 · Huey curt',create:hueyShort,desc:'Més compacte i arrodonit, inspirat en els primers Huey.'},
  {name:'3 · Huey transport',create:hueyTransport,desc:'Cabina llarga, grans portes obertes i volum de transport.'},
  {name:'4 · Huey low-poly',create:hueyBlocky,desc:'Silueta Huey simplificada per encaixar amb els vehicles actuals.'}
];
