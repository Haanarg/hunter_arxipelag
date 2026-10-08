// Hunter: Arxipèlag — model visual compartit de l'explosiu plàstic.
// Basat en la proposta 1 (RGB paral·lels) de la pàgina de proves.
// Geometria decorativa: la temporització de la detonació és a combat.js.
(function(){
  'use strict';
  const BLINK_HZ=5; // cinc parpelleigs complets per segon (100 ms encès / 100 ms apagat).

  function create(T,active=false){
    const root=new T.Group(),cache=new Map();
    function material(color,metalness=.03,roughness=.78){
      const key=color+':'+metalness+':'+roughness;
      if(!cache.has(key))cache.set(key,new T.MeshStandardMaterial({
        color,metalness,roughness,flatShading:true
      }));
      return cache.get(key);
    }
    const green=material(0x57674c),lightGreen=material(0x718263),
          darkGreen=material(0x3e503e),metal=material(0x2b3335,.27,.54),
          rim=material(0x171b1c,.12,.45),cap=material(0x171d1b,.19,.55),
          red=material(0xe34033,.04,.4),lime=material(0x28cc64,.04,.4),
          blue=material(0x267ee6,.04,.4),wireColors=[red,lime,blue];

    function mesh(geometry,mat,parent=root){
      const o=new T.Mesh(geometry,mat);
      o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
    }
    function box(w,h,d,mat,x=0,y=0,z=0){
      const o=mesh(new T.BoxGeometry(w,h,d),mat);
      o.position.set(x,y,z);return o;
    }
    function sphere(r,mat,x,y,z){
      const o=mesh(new T.SphereGeometry(r,10,7),mat);
      o.position.set(x,y,z);return o;
    }
    function roundBlock(w,h,d,r,mat,x=0,y=0,z=0){
      const b=Math.min(.045,w*.05,h*.08,d*.05),s=new T.Shape(),
            hw=w/2-r,hh=h/2-r;
      s.moveTo(-hw,-h/2);s.lineTo(hw,-h/2);
      s.quadraticCurveTo(w/2,-h/2,w/2,-hh);
      s.lineTo(w/2,hh);s.quadraticCurveTo(w/2,h/2,hw,h/2);
      s.lineTo(-hw,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,hh);
      s.lineTo(-w/2,-hh);s.quadraticCurveTo(-w/2,-h/2,-hw,-h/2);
      const geo=new T.ExtrudeGeometry(s,{
        depth:d-2*b,bevelEnabled:true,bevelThickness:b,
        bevelSize:b,bevelSegments:2,steps:1,curveSegments:3
      });
      geo.translate(0,0,-d/2+b);
      const o=mesh(geo,mat);o.position.set(x,y,z);return o;
    }

    // Cos de la proposta 1: bloc compacte verd, corretges i cargols.
    roundBlock(2.24,.82,1.44,.22,green);
    roundBlock(2.16,.70,1.37,.18,lightGreen,0,.03,.04);
    for(const x of[-.87,.87]){
      box(.16,.73,.075,darkGreen,x,.06,-.731);
      sphere(.055,material(0xa0a7a2,.56,.4),x,-.25,-.80);
    }
    for(const z of[-.41,.47])box(2.17,.064,.12,darkGreen,0,.44,z);
    roundBlock(.48,.17,.30,.06,darkGreen,.71,.50,.18);

    // Visor digital real amb textura pròpia (compte enrere només un cop col·locat).
    const timerY=.09,timerZ=-.80,timerW=1.12,timerH=.46;
    roundBlock(timerW+.18,timerH+.15,.155,.085,rim,0,timerY,timerZ);
    box(timerW,timerH,.028,metal,0,timerY,timerZ-.095);
    const canvas=document.createElement('canvas');
    canvas.width=512;canvas.height=192;
    const ctx=canvas.getContext('2d'),tex=new T.CanvasTexture(canvas);
    tex.colorSpace=T.SRGBColorSpace;
    const displayMat=new T.MeshStandardMaterial({
      map:tex,emissive:active?0xff1008:0x28452c,
      emissiveMap:tex,emissiveIntensity:active?.9:.2,
      metalness:0,roughness:.25,side:T.DoubleSide
    });
    const face=mesh(new T.PlaneGeometry(timerW*.88,timerH*.79),displayMat);
    face.position.set(0,timerY,timerZ-.114);
    face.rotation.y=Math.PI;
    const draw=(seconds,on)=>{
      ctx.fillStyle=active?'#240605':'#101b1b';
      ctx.fillRect(0,0,512,192);
      ctx.lineWidth=6;ctx.strokeStyle=active?'#8d3029':'#3a5755';
      ctx.strokeRect(7,7,498,178);
      if(on){
        const digits=active?'00:'+String(seconds).padStart(2,'0'):'03:00';
        ctx.fillStyle=active?'#ff4437':'#89c58f';
        ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=active?18:8;
        ctx.font='bold 106px monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(digits,256,101);ctx.shadowBlur=0;
      }
      tex.needsUpdate=true;
    };

    for(const side of[-1,1]){
      sphere(.038,material(0xa0a49b,.42,.38),side*(timerW+.08)/2,
        timerY+timerH*.37,timerZ-.105);
      sphere(.04,material(active?0xff4e38:0x4b604f),side*(timerW+.07)/2,
        timerY-timerH*.34,timerZ-.11);
    }

    // Nou feix RGB: 9 cables en arcs paral·lels (R/G/B repetits tres cops).
    for(let i=0;i<9;i++){
      const x=-.79+i*.195,c=i%3,h=.66+(i%3)*.045;
      const points=[[x,.54,.41],[x-.025,h,.23],[x+.025,h+.06,-.05],
                    [x,.59,-.27],[x,.54,-.35]];
      const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
      mesh(new T.TubeGeometry(curve,32,.044,8,false),wireColors[c]);
      for(const p of[points[0],points[points.length-1]]){
        sphere(.065,cap,p[0],p[1]-.016,p[2]);
        sphere(.034,wireColors[c],p[0],p[1]+.035,p[2]);
      }
    }
    for(const z of[.38,-.31])box(1.82,.055,.065,metal,0,.54,z);

    root.userData.explosiveDisplay={active,draw,lastSecond:-1,lastOn:null,face};
    update(root,active?3:0);
    return root;
  }

  function update(group,remaining){
    const d=group?.userData?.explosiveDisplay;
    if(!d||!d.active)return;
    const t=Math.max(0,Math.min(3,remaining));
    const seconds=Math.ceil(t);
    const blinkOn=Math.floor((3-t)*BLINK_HZ*2)%2===0;
    if(seconds!==d.lastSecond||blinkOn!==d.lastOn){
      d.draw(seconds,blinkOn);
      d.lastSecond=seconds;
      d.lastOn=blinkOn;
    }
  }

  window.HUNTER_EXPLOSIVE_VISUALS={create,update,BLINK_HZ};
})();
