import './explosive-visuals.js?v=20261008-live-01';

// Propostes visuals per als explosius del Hunter: Arxipèlag.
// Només models de prova: sense temporització, detonació ni mecàniques de joc.
export const explosiveConcepts=[
  {name:'RGB paral·lels',desc:'9 cables (3 vermells, 3 verds i 3 blaus), ordenats en arcs baixos i nets.'},
  {name:'RGB encreuats',desc:'9 cables gruixuts entrecreuats, amb diferents alçades i connectors visibles.'},
  {name:'RGB trenats',desc:'12 cables en quatre feixos tricolors, amb recorreguts ondulats sobre el bloc.'},
  {name:'RGB llaços alts',desc:'12 cables vermells, verds i blaus en llaços elevats, molt visibles de costat.'}
];

export function createExplosiveConcept(T,index=0,armed=false){
  // Proposta 1: exactament el mateix model compartit que fa servir el joc.
  if(index===0)return window.HUNTER_EXPLOSIVE_VISUALS.create(T,armed);
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
  // Els quatre conceptes parteixen de l'antic model 1:
  // un sol bloc compacte amb carcassa verda, visor frontal i fixacions laterals.
  bevelBox(2.24,.82,1.44,.22,green,0,0,0);
  bevelBox(2.16,.70,1.37,.18,lightGreen,0,.03,.04);
  for(const x of[-.87,.87]){
    strap(x,.06,-.731,.16,.73,.075,darkGreen);
    bolt(x,-.25,-.80);
  }
  for(const z of[-.41,.47])strap(0,.44,z,2.17,.064,.12,darkGreen);
  timer({width:1.12,y:.09,z:-.80});
  bevelBox(.48,.17,.30,.06,darkGreen,.71,.50,.18);

  const wireMats=[
    mat(0xe34033,.04,.40), // vermell
    mat(0x28cc64,.04,.40), // verd
    mat(0x267ee6,.04,.40)  // blau
  ];
  const endCap=mat(0x171d1b,.19,.55);

  function wire(points,colorIndex,radius=.046){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    mesh(new T.TubeGeometry(curve,32,radius,8,false),wireMats[colorIndex]);
    const a=points[0],b=points[points.length-1];
    for(const p of[a,b]){
      ball(.065,endCap,p[0],p[1]-.016,p[2]);
      ball(.034,wireMats[colorIndex],p[0],p[1]+.035,p[2]);
    }
  }

  // Tots els recorreguts són purament decoratius. No representen
  // esquemes funcionals d'un artefacte real.
  if(index===0){
    // RGB paral·lels: tres repeticions de cada color al llarg de nou canals.
    for(let i=0;i<9;i++){
      const x=-.79+i*.195,c=i%3,h=.66+(i%3)*.045;
      wire([[x,.54,.41],[x-.025,h,.23],[x+.025,h+.06,-.05],
            [x,.59,-.27],[x,.54,-.35]],c,.044);
    }
    for(const z of[.38,-.31])box(1.82,.055,.065,metal,0,.54,z);
  }else if(index===1){
    // RGB creuats: diferents destinacions i alçades per llegir bé els encreuaments.
    for(let i=0;i<9;i++){
      const x0=-.77+i*.19,x1=-x0*.74,c=i%3;
      const lift=.72+(i%3)*.08;
      wire([[x0,.54,.44],[x0*.75,.63,.28],[x0*.22+x1*.78,lift,.06],
            [x1*.92,lift+.035,-.12],[x1,.54,-.34]],c,.048);
    }
    for(const x of[-.88,.88])box(.12,.13,.82,metal,x,.54,.05);
  }else if(index===2){
    // RGB trenats: quatre feixos que porten els tres colors en paral·lel.
    for(let pack=0;pack<4;pack++){
      const cx=-.69+pack*.46;
      for(let c=0;c<3;c++){
        const d=(c-1)*.082;
        wire([[cx+d,.54,.43],[cx+d+.06,.66,.26],
              [cx+d-.08,.79,-.02],[cx+d+.08,.68,-.19],
              [cx+d,.54,-.36]],c,.046);
      }
      // Brides discretes sobre cada feix.
      box(.30,.055,.085,metal,cx,.78,-.02);
    }
  }else{
    // RGB llaços alts: quatre jocs complets de cables R/G/B,
    // elevats i oberts perquè destaquin també al joc a distància.
    for(let i=0;i<12;i++){
      const x=-.825+i*.15,c=i%3,peak=.89+(i%4)*.043;
      wire([[x,.54,.42],[x-.052,.71,.33],[x,peak,.09],
            [x+.058,peak+.018,-.10],[x,.67,-.26],
            [x,.54,-.34]],c,.048);
    }
    for(const x of[-.94,.94])rod([x,.50,.43],[x,.55,-.36],.035,metal);
  }
  // Les dues versions comparteixen la mateixa geometria; l'estat només modifica el visor.
  root.userData.variant=index;
  root.userData.armed=armed;
  root.userData.bounds={width:2.50,height:index===3?1.58:1.35,depth:1.65};
  return root;
}
