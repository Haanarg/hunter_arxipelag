// Propostes visuals per als explosius del Hunter: Arxipèlag.
// Només models de prova: sense temporització, detonació ni mecàniques de joc.
export const explosiveConcepts=[
  {name:'Bloc compacte',desc:'Una càrrega compacta de to verd oliva, visor frontal i fixacions laterals.'},
  {name:'Doble càrrega',desc:'Dos blocs baixos units per corretges amb un rellotge digital al centre.'},
  {name:'Càrrega blindada',desc:'Cos robust amb proteccions a les cantonades i visor digital gran.'},
  {name:'Càrrega adhesiva',desc:'Bloc pla amb cantonades arrodonides, adhesius inferiors i pantalla ampla.'}
];

export function createExplosiveConcept(T,index=0,armed=false){
  const root=new T.Group();
  const materials={};
  function mat(color,metalness=.03,roughness=.78){
    const key=[color,metalness,roughness].join('_');
    return materials[key]||(materials[key]=new T.MeshStandardMaterial({color,metalness,roughness,flatShading:true}));
  }
  const metal=mat(0x2b3335,.27,.54),edge=mat(0x172022,.18,.7),
        screenRim=mat(0x171b1c,.12,.45),sand=mat(0x9a927b),
        amber=mat(0xd99d42,.18,.61),black=mat(0x262b2a,.11,.77),
        green=mat(0x57674c),lightGreen=mat(0x718263),
        darkGreen=mat(0x3e503e),grey=mat(0x6d756e),
        cable=mat(0xbc503b,.12,.49);

  function mesh(geo,m,parent=root){
    const o=new T.Mesh(geo,m);
    o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  function box(w,h,d,m,x=0,y=0,z=0,parent=root){
    const o=mesh(new T.BoxGeometry(w,h,d),m,parent);
    o.position.set(x,y,z);return o;
  }
  function ball(r,m,x,y,z,parent=root,segments=10){
    const o=mesh(new T.SphereGeometry(r,segments,7),m,parent);
    o.position.set(x,y,z);return o;
  }
  function bevelBox(w,h,d,r,m,x=0,y=0,z=0,parent=root){
    const b=Math.min(.045,w*.05,h*.08,d*.05);
    const sh=new T.Shape(),hw=w/2-r,hh=h/2-r;
    sh.moveTo(-hw,-h/2);sh.lineTo(hw,-h/2);
    sh.quadraticCurveTo(w/2,-h/2,w/2,-hh);
    sh.lineTo(w/2,hh);sh.quadraticCurveTo(w/2,h/2,hw,h/2);
    sh.lineTo(-hw,h/2);sh.quadraticCurveTo(-w/2,h/2,-w/2,hh);
    sh.lineTo(-w/2,-hh);sh.quadraticCurveTo(-w/2,-h/2,-hw,-h/2);
    const geo=new T.ExtrudeGeometry(sh,{
      depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,
      bevelSegments:2,steps:1,curveSegments:3
    });
    geo.translate(0,0,-d/2+b);
    const o=mesh(geo,m,parent);o.position.set(x,y,z);return o;
  }
  function rod(a,b,r,m,parent=root){
    const A=new T.Vector3(...a),B=new T.Vector3(...b),dir=B.clone().sub(A);
    const o=mesh(new T.CylinderGeometry(r,r,dir.length(),8),m,parent);
    o.position.copy(A).add(B).multiplyScalar(.5);
    o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());
    return o;
  }
  function strap(x,y,z,w,h,d,m=black,parent=root){
    box(w,h,d,m,x,y,z,parent);
  }
  function labelFace(w,h,x,y,z,txt,bg='#111f23',fg='#b4e7a2'){
    const cvs=document.createElement('canvas');
    cvs.width=640;cvs.height=240;
    const ctx=cvs.getContext('2d');
    ctx.fillStyle=bg;ctx.fillRect(0,0,640,240);
    ctx.strokeStyle='#3a5755';ctx.lineWidth=7;ctx.strokeRect(12,12,616,216);
    ctx.fillStyle=fg;ctx.shadowColor=fg;ctx.shadowBlur=12;
    ctx.font='bold 122px ui-monospace, monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(txt,320,128);ctx.shadowBlur=0;
    const tex=new T.CanvasTexture(cvs);
    tex.colorSpace=T.SRGBColorSpace;
    tex.anisotropy=8;
    const sm=new T.MeshStandardMaterial({
      map:tex,emissive:armed?0x75b277:0x30452f,emissiveMap:tex,
      emissiveIntensity:armed?.30:.15,roughness:.28,metalness:0,
      side:T.DoubleSide
    });
    const face=mesh(new T.PlaneGeometry(w,h),sm);
    face.position.set(x,y,z);face.rotation.y=Math.PI;
    return face;
  }
  function timer({width=1.12,y=.13,z=-.75,scale=1}={}){
    const w=width,h=.46*scale;
    bevelBox(w+.18,h+.15,.155,.085,screenRim,0,y,z);
    box(w,h,.028,metal,0,y,z-.095);
    labelFace(w*.88,h*.79,0,y,z-.114,armed?'00:03':'03:00',
      armed?'#0b1716':'#101b1b',armed?'#a2f6a0':'#73ad80');
    for(const side of[-1,1]){
      ball(.038,mat(0xa0a49b,.42,.38),side*(w+.08)/2,y+h*.37,z-.105);
      ball(.040,armed?mat(0xff4e38,.05,.37):mat(0x4b604f,.02,.74),
        side*(w+.07)/2,y-h*.34,z-.11);
    }
  }
  function bolt(x,y,z){ball(.055,mat(0xa0a7a2,.56,.4),x,y,z);}
  function topCable(d){
    const c=new T.CatmullRomCurve3([
      new T.Vector3(-.65,.50,-.05),
      new T.Vector3(-.42,.60,-.31),
      new T.Vector3(.10,.61,-.29),
      new T.Vector3(.58,.49,.02)
    ]);
    mesh(new T.TubeGeometry(c,20,.029,6,false),d||cable);
  }
  if(index===0){
    // Un sol bloc compacte, fàcil de distingir quan és un pickup.
    bevelBox(2.24,.82,1.44,.22,green,0,0,0);
    bevelBox(2.16,.70,1.37,.18,lightGreen,0,.03,.04);
    for(const x of[-.87,.87]){
      strap(x,.06,-.731,.16,.73,.075,darkGreen);
      bolt(x,-.25,-.80);
    }
    for(const z of[-.41,.47])strap(0,.44,z,2.17,.064,.12,darkGreen);
    timer({width:1.12,y:.09,z:-.80});
    topCable();
    bevelBox(.48,.17,.30,.06,darkGreen,.71,.50,.18);
  }else if(index===1){
    // Dues peces diferenciades, sense cartutxos cilíndrics.
    for(const x of[-.60,.60]){
      bevelBox(1.16,.70,1.39,.18,x<0?sand:green,x,-.06,0);
      strap(x,-.03,-.733,.11,.65,.052,edge);
    }
    for(const x of[-.86,.86]){
      strap(x,.34,0,.23,.12,1.44,metal);
      box(.24,.05,1.43,amber,x,.43,0);
    }
    bevelBox(1.24,.45,.20,.09,screenRim,0,.13,-.84);
    timer({width:1.05,y:.13,z:-.97,scale:.91});
    ball(.06,armed?mat(0xe94331):mat(0x63896b),.73,.25,-.84);
  }else if(index===2){
    // Variant més reforçada, ben llegible en dimensions reduïdes.
    bevelBox(2.32,.88,1.43,.17,darkGreen);
    bevelBox(2.16,.73,1.32,.16,grey,0,.025,0);
    for(const x of[-1.12,1.12]){
      box(.22,.99,1.54,metal,x,0,0);
      for(const z of[-.59,.59])bolt(x,.40,z);
    }
    for(const z of[-.67,.67])box(2.21,.16,.18,metal,0,.43,z);
    timer({width:1.37,y:.13,z:-.84,scale:1.07});
    for(const x of[-.80,.80]){
      box(.12,.31,.041,amber,x,-.22,-.77);
      ball(.036,mat(0x252d26),x,-.31,-.81);
    }
    const handle=rod([-.32,.44,.48],[.32,.44,.48],.045,metal);
  }else{
    // Forma ampla i plana per a una càrrega adhesiva; visera digital gran.
    bevelBox(2.52,.57,1.53,.22,black,0,-.06,0);
    bevelBox(2.41,.49,1.42,.20,lightGreen,0,0,.02);
    for(const x of[-.87,.87]){
      box(.32,.20,1.36,darkGreen,x,.26,.02);
      for(const z of[-.45,.45])ball(.045,amber,x,.39,z);
    }
    timer({width:1.52,y:.055,z:-.83,scale:1.0});
    for(const x of[-.8,0,.8]){
      for(const z of[-.48,.48]){
        const pad=bevelBox(.45,.085,.38,.075,edge,x,-.40,z);
      }
    }
    for(const x of[-.42,.42])strap(x,.30,.37,.17,.045,.60,amber);
  }
  // Les dues versions comparteixen la mateixa geometria; l'estat només modifica el visor.
  root.userData.variant=index;
  root.userData.armed=armed;
  root.userData.bounds={width:index===3?2.55:2.50,height:index===3?.70:1.12,depth:1.65};
  return root;
}
