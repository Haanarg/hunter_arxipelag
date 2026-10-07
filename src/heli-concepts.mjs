import * as THREE from '../vendor/three-r186.module.mjs';

const mat=(color,rough=.72,metal=.08)=>new THREE.MeshStandardMaterial({color,flatShading:true,roughness:rough,metalness:metal});
const C={body:0x66745c,dark:0x343b35,glass:0x416a79,metal:0x485155,seat:0x2d302c,accent:0xc5a15b};

function box(g,w,h,d,c,x,y,z,metal=.08){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,.72,metal));
  m.position.set(x,y,z);g.add(m);return m
}
function roundedPrism(g,w,h,d,r,c,x,y,z){
  const hw=w/2,hh=h/2,rr=Math.min(r,hw-.02,hh-.02),s=new THREE.Shape();
  s.moveTo(-hw+rr,-hh);
  s.lineTo(hw-rr,-hh);s.quadraticCurveTo(hw,-hh,hw,-hh+rr);
  s.lineTo(hw,hh-rr);s.quadraticCurveTo(hw,hh,hw-rr,hh);
  s.lineTo(-hw+rr,hh);s.quadraticCurveTo(-hw,hh,-hw,hh-rr);
  s.lineTo(-hw,-hh+rr);s.quadraticCurveTo(-hw,-hh,-hw+rr,-hh);
  s.closePath();
  const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:2});
  geo.translate(0,0,-d/2);
  const m=new THREE.Mesh(geo,mat(c,.72,.08));m.position.set(x,y,z);g.add(m);return m
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

function hueyTransportVariant(opts={}){
  const {
    width=2.82,noseGlassW=1.34,noseGlassH=.92,noseGlassD=1.08,
    belly=.28,roofW=2.52,doorZ0=-.76,doorZ1=1.76,
    windshieldSlope=.72,cheek=.0,sideDetail='cheek',tailEnd=7.55,engineW=1.38
  }=opts;
  const g=new THREE.Group(),sideX=width/2+.01;
  roundedPrism(g,width,1.74,4.18,.31,C.body,0,2.08,.3);
  sphere(g,width*.46,belly,1.92,C.body,0,1.39,.34);

  // Cabina frontal més propera al Huey original: vidres grans, frontals i poc bulbosos.
  sphere(g,noseGlassW,noseGlassH,noseGlassD,C.glass,0,2.17,-2.35);
  const wx=width*.23;
  for(const x of[-wx,wx])rod(g,[x,1.53,-3.08],[x*windshieldSlope,2.82,-2.48],.045,C.body);
  rod(g,[0,1.48,-3.11],[0,2.84,-2.5],.05,C.dark);
  if(sideDetail==='cheek'&&cheek>0)for(const s of[-1,1])sphere(g,cheek,.5,.68,C.body,s*(width*.43),1.82,-2.44);
  else if(sideDetail==='cylinderLarge'||sideDetail==='cylinderSmall'){
    const rr=sideDetail==='cylinderLarge'?.34:.27,len=sideDetail==='cylinderLarge'?.34:.28;
    for(const s of[-1,1]){
      const m=new THREE.Mesh(new THREE.CylinderGeometry(rr,rr,len,12),mat(C.body,.66,.12));
      m.rotation.z=Math.PI/2;m.position.set(s*(width/2+len*.38),1.84,-2.38);g.add(m);
    }
  }else if(sideDetail==='fairing'){
    for(const s of[-1,1]){
      const pod=roundedPrism(g,.28,.58,.82,.12,C.body,s*(width*.49),1.86,-2.37);
      pod.rotation.z=s*.08;
      box(g,.08,.32,.46,C.dark,s*(width*.505),1.88,-2.38);
    }
  }

  roundedPrism(g,roofW,.32,2.12,.13,C.body,0,2.91,.04);

  // Portes laterals grans, com al model 3 original.
  for(const side of[-1,1]){
    box(g,.1,1.18,.36,C.body,side*sideX,2.0,doorZ0);
    box(g,.1,1.18,.36,C.body,side*sideX,2.0,doorZ1);
    box(g,.1,.14,2.05,C.dark,side*(sideX+.01),1.43,.5);
    rod(g,[side*sideX,2.58,-.58],[side*sideX,2.58,1.58],.052,C.body);
  }

  for(const x of[-.82,.82]){box(g,.4,.46,2.1,C.seat,x,1.55,.55);box(g,.4,.46,2.1,C.seat,-x,1.55,.55)}
  tailBoom(g,2.0,tailEnd,2.58,2.98,.42);
  skids(g,width*.54,-2.12,2.3);
  rotorSet(g,14.8,tailEnd-.1);
  roundedPrism(g,engineW,.62,1.8,.17,0x505b49,0,3.12,.82);
  rod(g,[engineW*.38,3.15,1.34],[engineW*.65,3.2,1.78],.11,C.dark);
  return finish(g)
}

export function huey3BCylinderLarge(){
  return hueyTransportVariant({
    width:2.7,noseGlassW:1.28,noseGlassH:.9,noseGlassD:1.02,
    belly:.24,roofW:2.38,windshieldSlope:.68,sideDetail:'cylinderLarge',engineW:1.3,tailEnd:7.48
  })
}
export function huey3BCylinderSmall(){
  return hueyTransportVariant({
    width:2.7,noseGlassW:1.28,noseGlassH:.9,noseGlassD:1.02,
    belly:.24,roofW:2.38,windshieldSlope:.68,sideDetail:'cylinderSmall',engineW:1.3,tailEnd:7.48
  })
}
export function huey3BNoDiscs(){
  return hueyTransportVariant({
    width:2.7,noseGlassW:1.28,noseGlassH:.9,noseGlassD:1.02,
    belly:.24,roofW:2.38,windshieldSlope:.68,sideDetail:'none',engineW:1.3,tailEnd:7.48
  })
}
export function huey3BFairing(){
  return hueyTransportVariant({
    width:2.7,noseGlassW:1.28,noseGlassH:.9,noseGlassD:1.02,
    belly:.24,roofW:2.38,windshieldSlope:.68,sideDetail:'fairing',engineW:1.3,tailEnd:7.48
  })
}

export const concepts=[
  {name:'1 · 3B · Cilindre gran',create:huey3BCylinderLarge,desc:'Els dos discs passen a ser cilindres complets, més visibles i robusts.'},
  {name:'2 · 3B · Cilindre petit',create:huey3BCylinderSmall,desc:'Mateixa idea, però amb cilindres complets més compactes i integrats.'},
  {name:'3 · 3B · Net',create:huey3BNoDiscs,desc:'Sense discs ni volums laterals: cabina més neta i fidel al cos del Huey.'},
  {name:'4 · 3B · Carenat',create:huey3BFairing,desc:'Substitueix els discs per petits carenats rectangulars arrodonits amb entrada fosca.'}
];
