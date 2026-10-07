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

function combatBase(opts={}){
  const {
    width=1.95,bodyLen=5.6,cockpitLen=2.15,cockpitH=.68,
    canopy='tandem',wing=2.2,pods='rockets',noseGun=true,
    tailEnd=7.35,bodyY=2.08,bodyCol=0x59634f
  }=opts;
  const g=new THREE.Group();

  // Fuselatge estret de combat.
  sphere(g,width*.5,.88,bodyLen*.5,bodyCol,0,bodyY,.2);
  roundedPrism(g,width*.82,.5,2.0,.16,0x4f5949,0,2.7,-.15);

  // Cabina en tàndem tipus Cobra.
  if(canopy==='tandem'){
    sphere(g,width*.47,cockpitH,cockpitLen*.55,C.glass,0,2.25,-2.42);
    sphere(g,width*.41,cockpitH*.9,cockpitLen*.48,C.glass,0,2.55,-1.25);
    box(g,width*.72,.14,.16,bodyCol,0,2.42,-1.72);
  }else if(canopy==='faceted'){
    roundedPrism(g,width*.84,1.12,2.0,.12,C.glass,0,2.3,-2.0);
    box(g,width*.9,.18,.16,bodyCol,0,2.48,-1.9);
  }else{
    sphere(g,width*.45,.64,1.35,C.glass,0,2.28,-2.25);
    box(g,width*.72,.62,1.1,bodyCol,0,2.48,-1.0);
  }

  // Aletes laterals i armament.
  for(const s of[-1,1]){
    rod(g,[s*.62,2.0,-.15],[s*wing,1.78,.15],.09,C.metal);
    box(g,.2,.14,2.8,0x4c5749,s*wing,1.77,.25);
    if(pods==='rockets'){
      for(const z of[-.65,.15,.95]) {
        const p=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.72,8),mat(0x303638,.58,.28));
        p.rotation.x=Math.PI/2;p.position.set(s*wing,1.66,z);g.add(p);
      }
    } else if(pods==='large'){
      const p=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,1.9,10),mat(0x39423a,.64,.2));
      p.rotation.x=Math.PI/2;p.position.set(s*wing,1.68,.2);g.add(p);
      box(g,.34,.18,.45,0x303638,s*wing,1.68,-.86);
    } else if(pods==='missile'){
      for(const z of[-.5,.45])rod(g,[s*wing,1.7,z-.45],[s*wing,1.7,z+.45],.11,0x303638);
    }
  }

  // Canó de morro.
  if(noseGun){
    rod(g,[0,1.72,-2.85],[0,1.72,-4.0],.11,C.metal);
    box(g,.3,.26,.52,C.dark,0,1.72,-3.92);
  }

  // Cua i patins.
  tailBoom(g,2.0,tailEnd,2.55,2.95,.35);
  skids(g,1.25,-1.8,1.55);
  rotorSet(g,13.6,tailEnd-.12);

  return finish(g);
}

export function combatCobra(){
  return combatBase({
    width:1.82,bodyLen:5.5,cockpitLen:2.2,cockpitH:.66,
    canopy:'tandem',wing:2.05,pods:'rockets',tailEnd:7.3
  })
}
export function combatCompact(){
  return combatBase({
    width:1.72,bodyLen:5.05,cockpitLen:1.9,cockpitH:.62,
    canopy:'compact',wing:1.9,pods:'missile',tailEnd:7.0
  })
}
export function combatGunship(){
  return combatBase({
    width:2.02,bodyLen:5.8,cockpitLen:2.25,cockpitH:.7,
    canopy:'tandem',wing:2.35,pods:'large',tailEnd:7.45
  })
}
export function combatModern(){
  return combatBase({
    width:1.9,bodyLen:5.4,cockpitLen:2.0,cockpitH:.68,
    canopy:'faceted',wing:2.15,pods:'missile',tailEnd:7.2
  })
}

export const concepts=[
  {name:'1 · Cobra clàssic',create:combatCobra,desc:'Fuselatge molt estret, cabina tàndem i silueta inspirada en l’AH-1 Cobra.'},
  {name:'2 · Combat compacte',create:combatCompact,desc:'Més curt i àgil visualment, amb morro simple i armament lleuger.'},
  {name:'3 · Gunship',create:combatGunship,desc:'Cos una mica més robust, aletes amples i pods grans de coets.'},
  {name:'4 · Combat modern',create:combatModern,desc:'Cabina facetada low-poly i silueta més moderna, mantenint el llenguatge visual del joc.'}
];
