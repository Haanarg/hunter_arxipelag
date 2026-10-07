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

function combatCompactVariant(opts={}){
  const {
    width=1.72,bodyLen=5.05,cockpit='compact',cockpitH=.62,
    wing=1.62,tailEnd=7.0,skidWidth=1.18,skidZ0=-1.72,skidZ1=1.42,
    bodyCol=0x59634f
  }=opts;
  const g=new THREE.Group();

  // Base directa del model 2: fuselatge compacte i estret.
  sphere(g,width*.5,.86,bodyLen*.5,bodyCol,0,2.08,.2);
  roundedPrism(g,width*.8,.48,1.9,.15,0x4f5949,0,2.68,-.12);

  // Cabina: variants entre compacta, tàndem i angular tipus Apache.
  if(cockpit==='compact'){
    sphere(g,width*.45,.64,1.35,C.glass,0,2.28,-2.25);
    box(g,width*.72,.62,1.1,bodyCol,0,2.48,-1.0);
  }else if(cockpit==='tandem'){
    sphere(g,width*.46,cockpitH,1.08,C.glass,0,2.18,-2.45);
    sphere(g,width*.39,cockpitH*.9,.92,C.glass,0,2.5,-1.45);
    box(g,width*.7,.14,.16,bodyCol,0,2.4,-1.92);
  }else if(cockpit==='apache'){
    // Cabina angular amb dos volums facetats, inspirada en la lectura visual de l'Apache.
    const front=roundedPrism(g,width*.82,.92,1.25,.08,C.glass,0,2.18,-2.5);
    front.rotation.x=-.08;
    const rear=roundedPrism(g,width*.74,.86,1.05,.07,C.glass,0,2.48,-1.42);
    rear.rotation.x=.05;
    box(g,width*.86,.16,.18,bodyCol,0,2.38,-1.95);
    box(g,width*.72,.2,.65,bodyCol,0,2.76,-1.1);
  }else if(cockpit==='apacheLow'){
    // Versió encara més low-poly: grans plans i morro més dur.
    roundedPrism(g,width*.8,.86,1.16,.04,C.glass,0,2.14,-2.5);
    roundedPrism(g,width*.7,.78,.92,.04,C.glass,0,2.47,-1.46);
    box(g,width*.88,.22,.35,bodyCol,0,1.83,-2.95);
    box(g,width*.76,.24,.72,bodyCol,0,2.78,-1.0);
  }

  // Aletes més curtes que el model 2 original + barquilles grans del model 3.
  for(const s of[-1,1]){
    rod(g,[s*.58,2.0,-.08],[s*wing,1.8,.08],.085,C.metal);
    box(g,.18,.13,1.9,0x4c5749,s*wing,1.79,.18);

    const pod=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,1.9,10),mat(0x39423a,.64,.2));
    pod.rotation.x=Math.PI/2;pod.position.set(s*wing,1.68,.18);g.add(pod);
    box(g,.34,.18,.45,0x303638,s*wing,1.68,-.86);
  }

  // Canó de morro, conservat del model 2.
  rod(g,[0,1.72,-2.85],[0,1.72,-4.0],.11,C.metal);
  box(g,.3,.26,.52,C.dark,0,1.72,-3.92);

  // Patins connectats clarament al fuselatge.
  for(const x of[-skidWidth,skidWidth]){
    rod(g,[x,.48,skidZ0],[x,.48,skidZ1],.075,C.metal);
    const s=Math.sign(x);
    rod(g,[s*.55,1.85,-1.0],[x,.48,-1.0],.075,C.metal);
    rod(g,[s*.62,1.88,.15],[x,.48,.15],.075,C.metal);
    rod(g,[s*.58,1.82,.95],[x,.48,.95],.075,C.metal);
  }

  tailBoom(g,2.0,tailEnd,2.55,2.95,.35);
  rotorSet(g,13.6,tailEnd-.12);
  return finish(g);
}

export function compactA(){
  return combatCompactVariant({
    width:1.72,bodyLen:5.05,cockpit:'compact',
    wing:1.58,tailEnd:7.0,skidWidth:1.18
  })
}
export function compactB(){
  return combatCompactVariant({
    width:1.7,bodyLen:5.0,cockpit:'tandem',cockpitH:.6,
    wing:1.56,tailEnd:6.98,skidWidth:1.16
  })
}
export function compactC(){
  return combatCompactVariant({
    width:1.74,bodyLen:5.08,cockpit:'apache',
    wing:1.6,tailEnd:7.02,skidWidth:1.18
  })
}
export function compactD(){
  return combatCompactVariant({
    width:1.76,bodyLen:5.1,cockpit:'apacheLow',
    wing:1.62,tailEnd:7.04,skidWidth:1.2
  })
}

export const concepts=[
  {name:'1 · Compacte A',create:compactA,desc:'Model 2 refinat: patins connectats, aletes més curtes i barquilles grans del Gunship.'},
  {name:'2 · Compacte B · Tàndem',create:compactB,desc:'Mateixa base, però amb cabina tàndem més marcada i fuselatge lleugerament més fi.'},
  {name:'3 · Compacte C · Apache',create:compactC,desc:'Cabina angular inspirada en l’Apache, mantenint la base compacta i les barquilles grans.'},
  {name:'4 · Compacte D · Apache low-poly',create:compactD,desc:'Versió més geomètrica i agressiva, amb grans plans angulars i lectura més moderna.'}
];
