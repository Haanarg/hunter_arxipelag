// Fàbrica visual de vehicles. No conté física, controls ni regles de conducció.
window.HUNTER_VEHICLES=Object.freeze({
  scales:Object.freeze({llanxa:1.3,llanxa_coets:1.35,moto_aquatica:1.08,barca_rems:.98,windsurf:1.05,hover:1.3,cotxe:1.3,moto:1.2,bici:1.2,camio:1.45,tanqueta:1.45,tanc:1.8,heli:1.75,heli_combat:1.82}),
  radii:Object.freeze({llanxa:5.5,llanxa_coets:5.8,moto_aquatica:2.1,barca_rems:3.25,windsurf:2.3,hover:4.8,cotxe:3.6,moto:2.2,bici:1.9,camio:4.8,tanqueta:4.5,tanc:5.6,heli:8,heli_combat:8.4}),
  hitboxes:Object.freeze({
    llanxa:[4.4,10.6],llanxa_coets:[4.5,10.8],moto_aquatica:[1.7,3.8],barca_rems:[2.7,6.1],windsurf:[1.9,4.3],hover:[4.2,7.4],
    cotxe:[3.2,5.9],moto:[1.35,2.8],bici:[1.15,2.4],camio:[3.6,7.8],tanqueta:[3.15,5.1],tanc:[4.2,7.1],
    heli:[3.4,11.2],heli_combat:[2.8,11.8]
  }),
  createFactory(THREE,{box,material,shadows}){
    const VS=this.scales;
    const rod=(g,a,b,r,c,profile='metal')=>{const v=new THREE.Vector3(...a),w=new THREE.Vector3(...b),delta=w.clone().sub(v),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),material(c,profile));m.position.copy(v.add(w).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());g.add(m);return m};
    const round=(g,r,h,c,x,y,z,axis='y',profile='metal')=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),material(c,profile));m.position.set(x,y,z);if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;g.add(m);return m};
    const wheel=(g,x,y,z,r,width,spokes=false)=>{const p=new THREE.Group();p.position.set(x,y,z);g.add(p);const tire=new THREE.Mesh(new THREE.TorusGeometry(r*.8,r*.2,6,12),material(0x20252a,'rubber'));tire.rotation.y=Math.PI/2;tire.scale.z=width/(r*.4);p.add(tire);round(p,r*.45,width*.8,0x8b9699,0,0,0,'x','metal');if(spokes)for(let a=0;a<Math.PI;a+=Math.PI/3)rod(p,[0,Math.sin(a)*r*.75,Math.cos(a)*r*.75],[0,-Math.sin(a)*r*.75,-Math.cos(a)*r*.75],.035,0xb6bdc1,'metal');p.userData.radius=r;(g.userData.wheels||(g.userData.wheels=[])).push(p);return p};
    const shape=new THREE.Shape();[[-2,-5],[2,-5],[2.2,1],[0,5.5],[-2.2,1]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
    const hull=new THREE.ExtrudeGeometry(shape,{depth:1.4,bevelEnabled:false});hull.rotateX(-Math.PI/2);
    return function createVehicle(t){
      const g=new THREE.Group();g.rotation.order='YXZ';const metal=0x3e4849,glass=0x76acba,rubber=0x252d31;
      if(t==='cotxe'){const col=0xa35b38,trim=0x302f2d;box(g,3,1,5.6,col,0,1.15,0,'paint');box(g,2.92,.42,2.1,col,0,1.82,-1.72,'paint');box(g,2.62,.82,2.72,glass,0,2.04,.48,'glass');box(g,2.88,.18,2.95,col,0,2.52,.48,'paint');box(g,2.45,.1,1.1,0x7d432f,0,2.65,.5,'paint');for(const x of[-1.34,1.34]){box(g,.13,.28,2.9,col,x,1.7,.5,'paint');box(g,.15,.82,.14,col,x,2.04,-.82,'paint');box(g,.15,.82,.14,col,x,2.04,1.82,'paint');box(g,.18,.82,.15,col,x,2.04,.5,'paint');for(const z of[-1.85,1.85])wheel(g,x*1.16,.72,z,.72,.45);box(g,.35,.18,.4,metal,x*1.17,2.08,-.85,'metal')}for(const z of[-2.95,2.95])box(g,3.25,.3,.3,metal,0,.94,z,'metal');box(g,1.6,.45,.08,rubber,0,1.4,-2.84,'rubber');box(g,2.5,.14,.12,trim,0,1.12,-2.88,'rubber');for(const x of[-1.08,1.08]){box(g,.5,.34,.1,0xffedb2,x,1.43,-2.85,'paint');box(g,.38,.24,.1,0x9c2825,x,1.38,2.84,'paint')}for(const x of[-.72,.72])box(g,.5,.1,.16,0xd8d7c9,x,1.03,-2.9,'metal');const spare=wheel(g,0,1.5,3,.65,.45);spare.rotation.y=Math.PI/2;(g.userData.wheels||[]).pop()}
      if(t==='camio'){const col=0x596a48,dark=0x30372e,canvas=0x69765a;
        box(g,3.35,1.05,6.9,col,0,1.35,.35,'paint');box(g,3.2,.28,2.25,dark,0,.88,2.55,'metal');
        box(g,3.05,1.7,2.35,col,0,2.25,-2.25,'paint');box(g,2.7,.78,.12,glass,0,2.45,-3.45,'glass');
        for(const x of[-1.38,1.38]){box(g,.16,.8,.12,col,x,2.35,-3.45,'paint');box(g,.18,.85,2.15,col,x,2.22,-2.25,'paint')}
        box(g,3.08,1.45,3.5,canvas,0,2.3,.95,'paint');for(const x of[-1.45,1.45])for(const z of[1.2,2.55])rod(g,[x,1.2,z],[x,3.05,z],.08,dark);
        for(const x of[-1.52,1.52])for(const z of[-2.3,1.2,2.7])wheel(g,x,.84,z,.72,.46);
        for(const z of[-3.55,3.75])box(g,3.55,.28,.28,dark,0,1.02,z,'metal');
        for(const x of[-1.05,1.05]){box(g,.48,.34,.12,0xffe3a2,x,1.55,-3.48,'paint');box(g,.4,.26,.12,0x9e2924,x,1.35,3.55,'paint')}
        box(g,.18,.22,.55,0xd7d3b7,0,1.2,-3.55,'metal');rod(g,[1.1,3.0,-1.4],[1.1,4.25,-1.4],.035,dark);
      }
      if(t==='bici'||t==='moto'){const moto=t==='moto',r=moto?.65:.62,L=moto?1.5:1.22,col=moto?0xbc743d:0x3f9b9d;wheel(g,0,r,-L,r,moto?.35:.15,true);wheel(g,0,r,L,r,moto?.35:.15,true);for(const x of[-.15,.15]){rod(g,[x,r,L],[x,1.45,.3],.07,col,'paint');rod(g,[x,r,L],[x,.72,0],.07,col,'paint');rod(g,[x,.72,0],[x,1.45,.3],.07,col,'paint');rod(g,[x,1.45,.3],[x,1.6,-.9],.07,col,'paint');rod(g,[x,.72,0],[x,1.6,-.9],.07,col,'paint');rod(g,[x,r,-L],[x,1.95,-.95],.06,metal)}box(g,.55,.16,.75,rubber,0,1.55,.4,'rubber');rod(g,[-.55,1.98,-1],[.55,1.98,-1],.07,metal);round(g,.18,.65,metal,0,.75,0,'x');if(moto){box(g,.72,.52,1.05,col,0,1.3,-.28,'paint');box(g,.56,.64,.66,metal,0,.87,0,'metal');box(g,.5,.18,.82,0x2e3133,0,1.6,.52,'rubber');round(g,.2,.18,0xffe4ad,0,1.68,-1.3,'z','paint');box(g,.12,.22,.12,0xc52f24,-.36,1.18,1.35,'paint');box(g,.12,.22,.12,0xc52f24,.36,1.18,1.35,'paint');rod(g,[.4,.6,.2],[.4,.6,1.3],.12,metal);rod(g,[-.4,.6,.2],[-.4,.6,1.3],.12,metal)}else{for(const x of[-.4,.4])box(g,.22,.1,.35,rubber,x,.73,0,'rubber');box(g,.5,.1,.65,0x252a2c,0,1.58,.42,'rubber');round(g,.09,.5,0xcfd5d6,0,1.9,-1,'x','metal')}}
      if(t==='tanqueta'){for(const x of[-1.42,1.42])for(const z of[-1.55,0,1.55])wheel(g,x,.68,z,.58,.34);box(g,2.75,.42,4.6,0x596343,0,.88,0,'paint');box(g,2.55,1.02,3.8,0x667348,0,1.42,.05,'paint');const nose=box(g,2.48,.72,1.15,0x727c50,0,1.62,-1.65,'paint');nose.rotation.x=-.18;box(g,2.08,.58,1.7,0x727c50,0,2.02,-.15,'paint');round(g,.68,.32,0x586543,0,2.4,-.15,'y','paint');rod(g,[0,2.48,-.65],[0,2.48,-3.05],.1,metal);box(g,.3,.24,.5,metal,0,2.48,-2.92,'metal');for(const x of[-1.05,1.05])box(g,.32,.18,.18,0xffe0a0,x,1.48,-2.24,'paint')}
      if(t==='tanc'){
        const trackSide=x=>{
          const side=Math.sign(x),outer=x+side*.02,trackMetal=0x53564d;
          // Nucli de goma tipus càpsula: tram central + rodes extremes arrodonides.
          box(g,1.05,1.16,5.25,rubber,outer,.78,0,'rubber');
          round(g,.66,1.04,rubber,outer,.78,-2.62,'x','rubber');
          round(g,.66,1.04,rubber,outer,.78,2.62,'x','rubber');
          // Rodes de rodament internes, visibles sota les baules.
          for(const z of[-2.35,-1.18,0,1.18,2.35])wheel(g,x+side*.52,.76,z,.55,.16);
          // Baules rectes superior i inferior.
          for(let z=-2.25;z<=2.25;z+=.45){
            box(g,1.17,.11,.28,trackMetal,outer,1.44,z,'metal');
            box(g,1.17,.11,.28,trackMetal,outer,.12,z,'metal');
          }
          // Baules que envolten les rodes davantera i posterior.
          for(let i=0;i<=6;i++){
            const phi=i*Math.PI/6,cy=.78,r=.66;
            const yf=cy+r*Math.cos(phi),zf=-2.62-r*Math.sin(phi);
            const yr=cy+r*Math.cos(phi),zr=2.62+r*Math.sin(phi);
            const front=box(g,1.17,.11,.28,trackMetal,outer,yf,zf,'metal');
            front.rotation.x=Math.PI-phi;
            const rear=box(g,1.17,.11,.28,trackMetal,outer,yr,zr,'metal');
            rear.rotation.x=phi;
          }
        };
        [-2.1,2.1].forEach(trackSide);
        box(g,3.75,1.15,5.9,0x667348,0,1.5,0,'paint');const front=box(g,3.65,.72,1.55,0x727c50,0,1.95,-2.05,'paint');front.rotation.x=-.28;for(const x of[-1.45,1.45])box(g,.22,.52,4.9,0x56623f,x,1.88,.15,'paint');round(g,1.62,.82,0x78845b,0,2.54,.1,'y','paint');box(g,2.2,.26,1.65,0x6d7950,0,2.92,.1,'paint');round(g,.62,.2,metal,.45,3.08,.4);rod(g,[0,2.62,-1],[0,2.62,-5.35],.2,metal);box(g,.66,.4,.68,metal,0,2.62,-5.08,'metal');for(const x of[-1.2,1.2])box(g,.64,.45,1.2,0x596343,x,2.24,2,'paint');for(const x of[-1.35,1.35])box(g,.42,.22,.42,0x2f332e,x,2.15,-2.45,'metal');rod(g,[-1,2.7,1],[-1,5.2,1],.025,metal)}
      if(t==='llanxa'||t==='llanxa_coets'){g.add(new THREE.Mesh(hull,material(t==='llanxa'?0xe7e1d5:0xc9cfbd,'paint')));box(g,3.25,.18,5.55,t==='llanxa'?0xb9885f:0x66705c,0,1.32,.75,'paint');box(g,2.45,.65,1.15,t==='llanxa'?0xe2d2b7:0x707b65,0,1.75,-1.25,'paint');box(g,2.25,.58,.12,glass,0,2.02,-1.82,'glass');box(g,.82,1.28,.72,metal,0,1.18,4.65,'metal');round(g,.2,.42,rubber,0,.15,4.95,'z','rubber');box(g,1.55,.15,.7,0x5a4638,0,1.62,2.75,'paint');
        if(t==='llanxa_coets'){for(const x of[-1.05,1.05]){box(g,.36,.3,1.55,0x59664a,x,1.98,.35,'paint');rod(g,[x,2.1,.95],[x,2.1,-.9],.11,0x30383a,'metal')}box(g,.78,.22,.62,0x46513f,0,1.9,-.35,'paint')}
      }
      if(t==='moto_aquatica'){
        const bodyCol=0xc94e3f,dark=0x33383b;
        const nose=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),material(bodyCol,'paint'));nose.scale.set(.72,.42,1.55);nose.position.set(0,.62,-.95);g.add(nose);
        box(g,1.38,.38,2.55,bodyCol,0,.54,.55,'paint');box(g,.72,.22,1.05,dark,0,.88,.6,'rubber');box(g,.82,.16,.56,0x222629,0,1.02,.2,'rubber');
        rod(g,[-.42,1.16,-.35],[.42,1.16,-.35],.055,metal);rod(g,[0,.94,-.2],[0,1.16,-.35],.05,metal);
        for(const x of[-.52,.52])box(g,.16,.13,.7,0xe9e7df,x,.36,.45,'paint');
      }
      if(t==='barca_rems'){const wood=0x9b7048,darkWood=0x6d4b32,inside=0xd7b27d;
        const boatShape=new THREE.Shape();boatShape.moveTo(-1.05,-2.45);boatShape.lineTo(1.05,-2.45);boatShape.quadraticCurveTo(1.5,-1.2,1.42,.55);boatShape.quadraticCurveTo(1.28,2.15,0,2.72);boatShape.quadraticCurveTo(-1.28,2.15,-1.42,.55);boatShape.quadraticCurveTo(-1.5,-1.2,-1.05,-2.45);
        const boatHull=new THREE.ExtrudeGeometry(boatShape,{depth:.72,bevelEnabled:false});boatHull.rotateX(-Math.PI/2);const shell=new THREE.Mesh(boatHull,material(wood,'organic'));shell.position.y=.22;g.add(shell);
        const innerShape=new THREE.Shape();innerShape.moveTo(-.78,-2.05);innerShape.lineTo(.78,-2.05);innerShape.quadraticCurveTo(1.05,-.9,1,.45);innerShape.quadraticCurveTo(.9,1.65,0,2.08);innerShape.quadraticCurveTo(-.9,1.65,-1,.45);innerShape.quadraticCurveTo(-1.05,-.9,-.78,-2.05);
        const innerGeom=new THREE.ExtrudeGeometry(innerShape,{depth:.12,bevelEnabled:false});innerGeom.rotateX(-Math.PI/2);const inner=new THREE.Mesh(innerGeom,material(inside,'organic'));inner.position.y=.7;g.add(inner);
        for(const z of[-1.18,0,1.15])box(g,1.92,.14,.34,darkWood,0,.9,z,'organic');
        const oars=new THREE.Group();oars.position.set(0,.9,-.05);g.add(oars);g.userData.oars=[];
        for(const side of[-1,1]){const og=new THREE.Group();og.position.x=side*.88;oars.add(og);const len=3.05,shaft=box(og,2.2,.08,.08,darkWood,side*1.1,0,0,'organic');const blade=box(og,.85,.11,.34,darkWood,side*2.62,0,0,'organic');g.userData.oars.push(og)}
        box(g,2.05,.2,.2,darkWood,0,.76,-2.35,'organic');box(g,1.45,.18,.18,darkWood,0,.8,2.35,'organic')
      }
      if(t==='windsurf'){box(g,.72,.18,4.8,0xf2e2b9,0,.18,0,'paint');rod(g,[0,.28,.25],[0,4.7,.25],.08,metal);const sail=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,4.55,.25),new THREE.Vector3(0,.8,.25),new THREE.Vector3(2.15,1.2,.25)]),new THREE.MeshBasicMaterial({color:0xe86d4b,side:THREE.DoubleSide}));const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute([0,4.55,.25,0,.8,.25,2.15,1.2,.25],3));geom.setIndex([0,1,2]);geom.computeVertexNormals();const sm=new THREE.Mesh(geom,material(0xe86d4b,'paint'));g.add(sm);rod(g,[0,2.4,.25],[1.65,1.7,.25],.05,metal)}
      if(t==='hover'){box(g,5,.85,8,rubber,0,.55,0,'rubber');for(const x of[-2.35,2.35])for(let z=-3.5;z<4;z+=.65)box(g,.2,.7,.48,0x394145,x,.5,z,'rubber');box(g,4.45,.85,6.7,0xcf9e4f,0,1.38,-.2,'paint');box(g,2.75,1.12,2.9,glass,0,2.2,-.92,'glass');box(g,2.98,.22,3.2,0xcda75f,0,2.82,-.92,'paint');for(const x of[-2.05,2.05])box(g,.18,.3,6.7,0xa97835,x,1.25,-.2,'paint');for(const x of[-1.1,1.1])box(g,.42,.22,.16,0xffe09a,x,1.45,-3.55,'paint');const duct=new THREE.Mesh(new THREE.TorusGeometry(1.55,.2,8,20),material(metal,'metal'));duct.position.set(0,2.9,3);g.add(duct);const fan=new THREE.Group();fan.position.copy(duct.position);for(let i=0;i<4;i++){const blade=box(fan,.2,2.8,.12,rubber,0,0,0,'rubber');blade.rotation.z=i*Math.PI/4}g.add(fan);g.userData.fan=fan;round(g,.28,.3,0x7b8588,0,2.9,3,'z','metal');for(const x of[-1.7,1.7]){box(g,.15,2.05,1,0xbe8c43,x,2.68,3.5,'paint');rod(g,[x,1.7,2.65],[x,3.65,3.2],.07,metal)}box(g,1.4,.18,.8,0x5b4939,0,1.88,1.45,'paint')}
      if(t==='heli'||t==='heli_combat'){
        const combat=t==='heli_combat',bodyCol=combat?0x59634f:0x647768;
        if(!combat){
          box(g,2.9,1.55,4.4,bodyCol,0,2.05,-.25,'paint');const nose=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),material(glass,'glass'));nose.scale.set(1.35,.95,1.25);nose.position.set(0,2.15,-2.25);g.add(nose);
          for(const x of[-1.48,1.48])box(g,.12,1.05,1.55,0x3f4d45,x,2.05,-.2,'paint');rod(g,[0,2.55,1.65],[0,2.8,7.1],.22,bodyCol,'paint');box(g,.12,1.45,1.1,bodyCol,0,3.35,6.85,'paint');box(g,2.7,.12,.7,bodyCol,0,2.85,5.95,'paint');
          for(const x of[-1.55,1.55]){rod(g,[x,.5,-2],[x,.5,2.1],.09,metal);for(const z of[-1.1,1.2])rod(g,[x,.5,z],[x*.65,1.2,z],.08,metal)}
        }else{
          const fus=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),material(bodyCol,'paint'));fus.scale.set(1.15,.92,3.2);fus.position.set(0,2.05,.25);g.add(fus);
          const cockpit=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),material(glass,'glass'));cockpit.scale.set(.92,.72,1.5);cockpit.position.set(0,2.28,-2.35);g.add(cockpit);
          box(g,1.15,.58,1.35,0x4c5749,0,2.65,-.55,'paint');rod(g,[0,2.55,2.3],[0,2.85,7.25],.16,bodyCol,'paint');box(g,.1,1.35,.9,bodyCol,0,3.35,7.05,'paint');
          for(const x of[-2.15,2.15]){box(g,.22,.16,3.25,0x4c5749,x,1.75,.2,'paint');for(const z of[-.85,.1,.95])round(g,.11,.62,0x303638,x,1.63,z,'z','metal')}
          rod(g,[0,1.72,-2.95],[0,1.72,-4.15],.11,metal);box(g,.28,.24,.5,0x252b2d,0,1.72,-4.05,'metal');
          for(const x of[-1.3,1.3])rod(g,[x,.5,-1.7],[x,.5,1.6],.08,metal);
        }
        rod(g,[0,3.02,0],[0,3.82,0],.14,metal);round(g,.3,.2,metal,0,3.82,0,'y','metal');const rotor=new THREE.Group();rotor.position.set(0,3.82,0);for(const a of[0,Math.PI/2]){const blade=box(rotor,combat?13.5:14.5,.1,.36,rubber,0,0,0,'rubber');blade.rotation.y=a}g.add(rotor);g.userData.rotor=rotor;
        const tail=new THREE.Group();tail.position.set(.38,3.45,7);box(tail,.1,1.9,.16,rubber,0,0,0,'rubber');box(tail,.1,.16,1.9,rubber,0,0,0,'rubber');g.add(tail);g.userData.tailRotor=tail;
      }
      if(t==='bici'){const crank=new THREE.Group();crank.position.set(0,.75,0);for(const side of[-1,1]){rod(crank,[side*.3,0,0],[side*.3,0,side*.28],.045,metal);box(crank,.26,.08,.18,rubber,side*.4,0,side*.28,'rubber')}g.add(crank);g.userData.crank=crank}
      g.traverse(o=>{if(o.isMesh){o.castShadow=shadows;o.receiveShadow=shadows}});
      g.scale.setScalar(VS[t]);return g;
    };
  }
});