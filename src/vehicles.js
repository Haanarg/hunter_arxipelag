// Fàbrica visual de vehicles. No conté física, controls ni regles de conducció.
window.HUNTER_VEHICLES=Object.freeze({
  scales:Object.freeze({llanxa:1.95,llanxa_coets:1.95,moto_aquatica:1.08,barca_rems:.98,windsurf:1.05,hover:1.3,ferry:1,cotxe:1.3,moto:1.2,bici:1.2,camio:1.8125,tanqueta:1.8125,tanc:2.25,heli:1.75,heli_combat:1.82}),
  radii:Object.freeze({llanxa:8.25,llanxa_coets:8.6,moto_aquatica:2.1,barca_rems:3.25,windsurf:2.3,hover:4.8,ferry:35,cotxe:3.6,moto:2.2,bici:1.9,camio:4.8,tanqueta:4.5,tanc:5.6,heli:8,heli_combat:8.4}),
  hitboxes:Object.freeze({
    llanxa:[6.6,15.9],llanxa_coets:[6.8,16.1],moto_aquatica:[1.7,3.8],barca_rems:[2.7,6.1],windsurf:[1.9,4.3],hover:[4.2,7.4],ferry:[32,63],
    cotxe:[3.2,5.9],moto:[1.35,2.8],bici:[1.15,2.4],camio:[3.6,7.8],tanqueta:[3.15,5.1],tanc:[4.2,7.1],
    heli:[3.4,11.2],heli_combat:[2.8,11.8]
  }),
  decks:Object.freeze({ferry:Object.freeze({halfW:14.3,halfL:25.6,rampHalfW:6.7,ramp:5.8,y:2.2,rampY:.45,
    cabin:Object.freeze({x:11.5,z:1.8,halfW:1.9,halfL:4.05})})}),
  steeringMax:Object.freeze({bici:.60,moto:.52,cotxe:.44,camio:.36,tanqueta:.34}),
  // Els pivots giren en Y, per separat de les rodes que roden en X.
  animateSteering(model,type,turn,dt){
    const pivots=model?.userData?.steeringPivots;
    if(!pivots?.length)return;
    const max=this.steeringMax[type]||0,target=Math.max(-1,Math.min(1,turn||0))*max,
          a=1-Math.exp(-11*Math.max(0,dt));
    for(const pivot of pivots){
      pivot.rotation.y+=(target-pivot.rotation.y)*a;
      if(Math.abs(pivot.rotation.y)<.0001&&Math.abs(target)<.0001)pivot.rotation.y=0;
    }
  },
  // Torreta independent del xassís; interpolació amb inèrcia i camí angular més curt.
  aimTurret(THREE,model,worldDirection,dt){
    const rig=model?.userData,pivot=rig?.turretPivot,pitch=rig?.turretPitch;
    if(!pivot||!pitch||!worldDirection||worldDirection.lengthSq()<.00001)return false;
    model.updateWorldMatrix(true,false);
    const local=worldDirection.clone().normalize().applyQuaternion(
      model.getWorldQuaternion(new THREE.Quaternion()).invert());
    // Un objectiu pràcticament vertical no ha de fer girar la torre 180°.
    const yaw=Math.hypot(local.x,local.z)<1e-4
            ?pivot.rotation.y:Math.atan2(-local.x,-local.z),
          elev=Math.max(-.42,Math.min(.43,Math.atan2(local.y,Math.hypot(local.x,local.z)))),
          step=Math.min(.08,Math.max(0,Number.isFinite(dt)?dt:0));
    const approach=(angle,target,key,maxSpeed,wrap)=>{
      const delta=wrap?Math.atan2(Math.sin(target-angle),Math.cos(target-angle)):target-angle;
      const desired=Math.max(-maxSpeed,Math.min(maxSpeed,delta*3.8));
      let velocity=rig[key]||0;
      velocity+=(desired-velocity)*(1-Math.exp(-8*step));
      const move=velocity*step;
      if(Math.abs(move)>=Math.abs(delta)){rig[key]=0;return angle+delta}
      rig[key]=velocity;return angle+move;
    };
    pivot.rotation.y=approach(pivot.rotation.y,yaw,'turretYawSpeed',rig.turretYawRate||1.55,true);
    pitch.rotation.x=approach(pitch.rotation.x,elev,'turretPitchSpeed',.85,false);
    const yawError=Math.atan2(Math.sin(yaw-pivot.rotation.y),Math.cos(yaw-pivot.rotation.y));
    return Math.abs(yawError)<.085&&Math.abs(elev-pitch.rotation.x)<.085;
  },
  // L'origen i l'orientació dels projectils són els del canó visible.
  turretShot(THREE,model){
    const muzzle=model?.userData?.turretMuzzle;
    if(!muzzle)return null;
    model.updateWorldMatrix(true,true);
    return {
      origin:muzzle.getWorldPosition(new THREE.Vector3()),
      direction:new THREE.Vector3(0,0,-1)
        .applyQuaternion(muzzle.getWorldQuaternion(new THREE.Quaternion())).normalize()
    };
  },
  createFactory(THREE,{box,material,shadows}){
    const VS=this.scales;
    const rod=(g,a,b,r,c,profile='metal')=>{const v=new THREE.Vector3(...a),w=new THREE.Vector3(...b),delta=w.clone().sub(v),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),material(c,profile));m.position.copy(v.add(w).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());g.add(m);return m};
    const round=(g,r,h,c,x,y,z,axis='y',profile='metal')=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),material(c,profile));m.position.set(x,y,z);if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;g.add(m);return m};
    const roundedPrism=(g,w,h,d,r,c,x,y,z,profile='paint')=>{const hw=w/2,hh=h/2,rr=Math.min(r,hw-.02,hh-.02),s=new THREE.Shape();s.moveTo(-hw+rr,-hh);s.lineTo(hw-rr,-hh);s.quadraticCurveTo(hw,-hh,hw,-hh+rr);s.lineTo(hw,hh-rr);s.quadraticCurveTo(hw,hh,hw-rr,hh);s.lineTo(-hw+rr,hh);s.quadraticCurveTo(-hw,hh,-hw,hh-rr);s.lineTo(-hw,-hh+rr);s.quadraticCurveTo(-hw,-hh,-hw+rr,-hh);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:2});geo.translate(0,0,-d/2);const m=new THREE.Mesh(geo,material(c,profile));m.position.set(x,y,z);g.add(m);return m};
    const wheel=(g,x,y,z,r,width,spokes=false,steer=false,owner=g)=>{
      let parent=g,px=x,py=y,pz=z;
      if(steer){
        const steering=new THREE.Group();steering.position.set(x,y,z);g.add(steering);
        (g.userData.steeringPivots||(g.userData.steeringPivots=[])).push(steering);
        parent=steering;px=0;py=0;pz=0;
      }
      const p=new THREE.Group();p.position.set(px,py,pz);parent.add(p);const tire=new THREE.Mesh(new THREE.TorusGeometry(r*.8,r*.2,6,12),material(0x20252a,'rubber'));tire.rotation.y=Math.PI/2;tire.scale.z=width/(r*.4);p.add(tire);round(p,r*.45,width*.8,0x8b9699,0,0,0,'x','metal');if(spokes)for(let a=0;a<Math.PI;a+=Math.PI/3)rod(p,[0,Math.sin(a)*r*.75,Math.cos(a)*r*.75],[0,-Math.sin(a)*r*.75,-Math.cos(a)*r*.75],.035,0xb6bdc1,'metal');p.userData.radius=r;(owner.userData.wheels||(owner.userData.wheels=[])).push(p);return p};
    const shape=new THREE.Shape();[[-2,-5],[2,-5],[2.2,1],[0,5.5],[-2.2,1]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
    const hull=new THREE.ExtrudeGeometry(shape,{depth:1.4,bevelEnabled:false});hull.rotateX(-Math.PI/2);
    return function createVehicle(t){
      const g=new THREE.Group();g.rotation.order='YXZ';const metal=0x3e4849,glass=0x76acba,rubber=0x252d31;
      if(t==='cotxe'){const col=0xa35b38,trim=0x302f2d;box(g,3,1,5.6,col,0,1.15,0,'paint');box(g,2.92,.42,2.1,col,0,1.82,-1.72,'paint');box(g,2.62,.82,2.72,glass,0,2.04,.48,'glass');box(g,2.88,.18,2.95,col,0,2.52,.48,'paint');box(g,2.45,.1,1.1,0x7d432f,0,2.65,.5,'paint');for(const x of[-1.34,1.34]){box(g,.13,.28,2.9,col,x,1.7,.5,'paint');box(g,.15,.82,.14,col,x,2.04,-.82,'paint');box(g,.15,.82,.14,col,x,2.04,1.82,'paint');box(g,.18,.82,.15,col,x,2.04,.5,'paint');for(const z of[-1.85,1.85])wheel(g,x*1.16,.72,z,.72,.45,false,z<0);box(g,.35,.18,.4,metal,x*1.17,2.08,-.85,'metal')}for(const z of[-2.95,2.95])box(g,3.25,.3,.3,metal,0,.94,z,'metal');box(g,1.6,.45,.08,rubber,0,1.4,-2.84,'rubber');box(g,2.5,.14,.12,trim,0,1.12,-2.88,'rubber');for(const x of[-1.08,1.08]){box(g,.5,.34,.1,0xffedb2,x,1.43,-2.85,'paint');box(g,.38,.24,.1,0x9c2825,x,1.38,2.84,'paint')}for(const x of[-.72,.72])box(g,.5,.1,.16,0xd8d7c9,x,1.03,-2.9,'metal');const spare=wheel(g,0,1.5,3,.65,.45);spare.rotation.y=Math.PI/2;(g.userData.wheels||[]).pop()}
      if(t==='camio'){const col=0x596a48,dark=0x30372e,canvas=0x69765a;
        box(g,3.35,1.05,6.9,col,0,1.35,.35,'paint');box(g,3.2,.28,2.25,dark,0,.88,2.55,'metal');
        box(g,3.05,1.7,2.35,col,0,2.25,-2.25,'paint');box(g,2.7,.78,.12,glass,0,2.45,-3.45,'glass');
        for(const x of[-1.38,1.38]){box(g,.16,.8,.12,col,x,2.35,-3.45,'paint');box(g,.18,.85,2.15,col,x,2.22,-2.25,'paint')}
        box(g,3.08,1.45,3.5,canvas,0,2.3,.95,'paint');for(const x of[-1.45,1.45])for(const z of[1.2,2.55])rod(g,[x,1.2,z],[x,3.05,z],.08,dark);
        for(const x of[-1.52,1.52])for(const z of[-2.3,1.2,2.7])wheel(g,x,.84,z,.72,.46,false,z<0);
        for(const z of[-3.55,3.75])box(g,3.55,.28,.28,dark,0,1.02,z,'metal');
        for(const x of[-1.05,1.05]){box(g,.48,.34,.12,0xffe3a2,x,1.55,-3.48,'paint');box(g,.4,.26,.12,0x9e2924,x,1.35,3.55,'paint')}
        box(g,.18,.22,.55,0xd7d3b7,0,1.2,-3.55,'metal');rod(g,[1.1,3.0,-1.4],[1.1,4.25,-1.4],.035,dark);
      }
      if(t==='bici'||t==='moto'){
        const moto=t==='moto',r=moto?.65:.62,L=moto?1.5:1.22,col=moto?0xbc743d:0x3f9b9d;
        // La forquilla i el manillar pivoten junts amb la roda de davant.
        // Centre de gir al coll de direcció (1.65, -0.95).
        const steering=new THREE.Group();steering.position.set(0,1.65,-.95);g.add(steering);
        (g.userData.steeringPivots||(g.userData.steeringPivots=[])).push(steering);
        wheel(steering,0,r-1.65,-L+.95,r,moto?.35:.15,true,false,g);
        wheel(g,0,r,L,r,moto?.35:.15,true);
        for(const x of[-.15,.15]){
          rod(g,[x,r,L],[x,1.45,.3],.07,col,'paint');
          rod(g,[x,r,L],[x,.72,0],.07,col,'paint');
          rod(g,[x,.72,0],[x,1.45,.3],.07,col,'paint');
          rod(g,[x,1.45,.3],[x,1.6,-.9],.07,col,'paint');
          rod(g,[x,.72,0],[x,1.6,-.9],.07,col,'paint');
          rod(steering,[x,r-1.65,-L+.95],[x,1.95-1.65,0],.06,metal);
        }
        box(g,.55,.16,.75,rubber,0,1.55,.4,'rubber');
        rod(steering,[-.55,1.98-1.65,-.05],[.55,1.98-1.65,-.05],.07,metal);
        round(g,.18,.65,metal,0,.75,0,'x');
        if(moto){
          box(g,.72,.52,1.05,col,0,1.3,-.28,'paint');
          box(g,.56,.64,.66,metal,0,.87,0,'metal');
          box(g,.5,.18,.82,0x2e3133,0,1.6,.52,'rubber');
          round(steering,.2,.18,0xffe4ad,0,.03,-.35,'z','paint');
          box(g,.12,.22,.12,0xc52f24,-.36,1.18,1.35,'paint');
          box(g,.12,.22,.12,0xc52f24,.36,1.18,1.35,'paint');
          rod(g,[.4,.6,.2],[.4,.6,1.3],.12,metal);
          rod(g,[-.4,.6,.2],[-.4,.6,1.3],.12,metal);
        }else{
          for(const x of[-.4,.4])box(g,.22,.1,.35,rubber,x,.73,0,'rubber');
          box(g,.5,.1,.65,0x252a2c,0,1.58,.42,'rubber');
          round(steering,.09,.5,0xcfd5d6,0,.25,-.05,'x','metal');
        }
      }
      if(t==='tanqueta'){
        for(const x of[-1.42,1.42])for(const z of[-1.55,0,1.55])
          wheel(g,x,.68,z,.58,.34,false,z<0);
        box(g,2.75,.42,4.6,0x596343,0,.88,0,'paint');
        box(g,2.55,1.02,3.8,0x667348,0,1.42,.05,'paint');
        const nose=box(g,2.48,.72,1.15,0x727c50,0,1.62,-1.65,'paint');
        nose.rotation.x=-.18;
        for(const x of[-1.05,1.05])box(g,.32,.18,.18,0xffe0a0,x,1.48,-2.24,'paint');
        const turret=new THREE.Group();turret.position.set(0,2.22,-.15);g.add(turret);
        // La base rectangular queda fixa al xassís; només gira la corona cilíndrica.
        box(g,2.08,.58,1.7,0x727c50,0,2.02,-.15,'paint');
        round(turret,.68,.32,0x586543,0,.18,0,'y','paint');
        const elev=new THREE.Group();elev.position.set(0,.26,-.5);turret.add(elev);
        rod(elev,[0,0,0],[0,0,-2.4],.1,metal);
        box(elev,.3,.24,.5,metal,0,0,-2.27,'metal');
        const muzzle=new THREE.Object3D();muzzle.position.set(0,0,-2.4);elev.add(muzzle);
        g.userData.turretPivot=turret;g.userData.turretPitch=elev;
        g.userData.turretMuzzle=muzzle;g.userData.turretYawRate=2.05;
      }
      if(t==='tanc'){
        const trackSide=x=>{
          const side=Math.sign(x),outer=x+side*.02,trackMetal=0x53564d,cy=.78,r=.66,front=-2.62,rear=2.62,straight=rear-front,perimeter=2*straight+2*Math.PI*r;
          box(g,1.05,1.16,5.25,rubber,outer,cy,0,'rubber');
          round(g,r,1.04,rubber,outer,cy,front,'x','rubber');
          round(g,r,1.04,rubber,outer,cy,rear,'x','rubber');
          for(const z of[-2.35,-1.18,0,1.18,2.35]){
            const w=wheel(g,x+side*.52,.76,z,.55,.16);
            w.userData.trackSide=side;
          }
          const links=[],count=Math.round(perimeter/.38);
          for(let i=0;i<count;i++){
            const link=box(g,1.17,.11,.28,trackMetal,outer,cy,0,'metal');
            link.userData.trackOffset=i*perimeter/count;
            links.push(link);
          }
          (g.userData.tracks||(g.userData.tracks=[])).push({side,links,phase:0,cy,r,front,rear,straight,perimeter,x:outer});
        };
        [-2.1,2.1].forEach(trackSide);
        box(g,3.75,1.15,5.9,0x667348,0,1.5,0,'paint');
        const front=box(g,3.65,.72,1.55,0x727c50,0,1.95,-2.05,'paint');front.rotation.x=-.28;
        for(const x of[-1.45,1.45])box(g,.22,.52,4.9,0x56623f,x,1.88,.15,'paint');
        const turret=new THREE.Group();turret.position.set(0,2.54,.1);g.add(turret);
        round(turret,1.62,.82,0x78845b,0,0,0,'y','paint');
        box(turret,2.2,.26,1.65,0x6d7950,0,.38,0,'paint');
        round(turret,.62,.2,metal,.45,.54,.3);
        rod(turret,[-1,.16,.9],[-1,2.66,.9],.025,metal);
        const elev=new THREE.Group();elev.position.set(0,.08,-1.1);turret.add(elev);
        rod(elev,[0,0,0],[0,0,-4.35],.2,metal);
        box(elev,.66,.4,.68,metal,0,0,-4.08,'metal');
        const muzzle=new THREE.Object3D();muzzle.position.set(0,0,-4.35);elev.add(muzzle);
        g.userData.turretPivot=turret;g.userData.turretPitch=elev;
        g.userData.turretMuzzle=muzzle;g.userData.turretYawRate=1.40;
        for(const x of[-1.2,1.2])box(g,.64,.45,1.2,0x596343,x,2.24,2,'paint');
        for(const x of[-1.35,1.35])box(g,.42,.22,.42,0x2f332e,x,2.15,-2.45,'metal');
      }
      if(t==='llanxa'){
        // Stealth A1: model seleccionat a proves.html. Proa neta, casc facetat,
        // cabina oberta i radar compacte. Proa = -Z.
        const L=8.9,B=2.75,half=L/2,free=.98,screenZ=-.65,cockZ=.95,cockL=2.5;
        const hullCol=0x667176,deckCol=0x717c81,trim=0x424b50,glassCol=0x26343c;
        const stations=[
          {z:-half,w:.20,y:.56},
          {z:-half*.78,w:B*.38,y:.46},
          {z:-half*.43,w:B*.78,y:.38},
          {z:.05,w:B*.98,y:.32},
          {z:half*.55,w:B,y:.34},
          {z:half,w:B*.88,y:.44}
        ];
        const verts=[],idx=[],rings=stations.map(s=>[
          [0,-.18,s.z],
          [-s.w*.50,.10,s.z],
          [-s.w*.66,s.y+.20,s.z],
          [-s.w*.50,free,s.z],
          [ s.w*.50,free,s.z],
          [ s.w*.66,s.y+.20,s.z],
          [ s.w*.50,.10,s.z]
        ]);
        for(const ring of rings)for(const p of ring)verts.push(...p);
        const N=7;
        // Tanquem tot el buc, inclosa la cara inferior entre l'última
        // aresta d'estribord (6) i la quilla (0). Ja no cal cap caixa negra.
        for(let j=0;j<rings.length-1;j++)for(let k=0;k<N;k++){
          const next=(k+1)%N,a=j*N+k,b=a+N,c=(j+1)*N+next,d=j*N+next;
          idx.push(a,b,c,a,c,d)
        }
        const base=(rings.length-1)*N;
        // Mirall de popa: normal cap a +Z.
        for(let k=1;k<N-1;k++)idx.push(base,base+k+1,base+k);
        // Tanquem la cara frontal de la proa (-Z), amb normals cap enfora.
        for(let k=1;k<N-1;k++)idx.push(0,k,k+1);

        // La coberta ja forma part dels quads superiors del casc (k===3).
        // No hi afegim cap segona superfície per evitar el z-fighting.
        const geo=new THREE.BufferGeometry();
        geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
        geo.setIndex(idx);geo.computeVertexNormals();
        g.add(new THREE.Mesh(geo,material(hullCol,'paint')));


        // Cabina oberta central.
        const cockFront=screenZ+.18,cockRear=cockZ+cockL*.72,cockLen=cockRear-cockFront;
        for(const side of[-1,1]){
          const wall=box(g,.18,.78,cockLen,hullCol,side*(B*.43),1.38,(cockFront+cockRear)/2,'paint');
          wall.rotation.z=side*.06;
        }
        box(g,B*.86,.74,.18,hullCol,0,1.38,cockRear,'paint');

        // Parabrisa frontal inclinat en tres panells.
        for(const x of[-.72,0,.72]){
          const w=x===0?B*.34:B*.25,
                scr=box(g,w,.64,.10,glassCol,x*(B*.43),1.74,screenZ,'glass');
          scr.rotation.x=-.48;scr.rotation.z=x===0?0:(x<0?-.10:.10);
        }
        {const trimBar=box(g,B*.88,.14,.16,trim,0,1.45,screenZ+.12,'metal');trimBar.rotation.x=-.48}

        // Coberta posterior i bancs.
        const aftStart=cockRear+.14,aftLen=half-aftStart-.10;
        if(aftLen>.4)box(g,B*.84,.15,aftLen,deckCol,0,1.18,aftStart+aftLen/2,'paint');
        for(const z of[cockZ-.15,cockZ+.65])box(g,B*.56,.14,.48,0x3a4245,0,1.08,z,'paint');

        // Radar compacte del model 3, tal com es va seleccionar a la iteració A1.
        const mz=2.18,mh=1.95;
        rod(g,[0,1.15,mz],[0,1.15+mh,mz],.085,trim,'metal');
        {const sensor=box(g,.34,.30,.38,trim,0,2.02,mz-.03,'metal');sensor.rotation.x=-.12}
        box(g,.28,.42,.30,trim,0,2.36,mz,'metal');
        const dome=new THREE.Mesh(new THREE.SphereGeometry(.29,12,6,0,Math.PI*2,0,Math.PI/2),material(0xc5c9c6,'metal'));
        dome.scale.y=.40;dome.position.set(0,1.15+mh+.01,mz);g.add(dome);
        box(g,.54,.08,.54,trim,0,1.15+mh-.03,mz,'metal');

        // Baranes fines de proa i petit detall posterior de l'A1.
        for(const x of[-B*.31,B*.31])rod(g,[x,free+.10,-half*.22],[x,free+.10,-half*.50],.025,trim,'metal');
        box(g,.42,.12,.62,trim,0,1.18,cockRear-.14,'metal');
      }
      if(t==='llanxa_coets'){
        // SeaBaby C4 · Reculat llarg: mateix casc de la llanxa normal actual,
        // sense radar posterior i amb 12 tubs exposats en disposició 3×4.
        const L=8.9,B=2.75,half=L/2,free=.98,screenZ=-.65,cockZ=.95,cockL=2.5;
        const hullCol=0x667176,deckCol=0x717c81,trim=0x424b50,glassCol=0x26343c,
              tubeCol=0x20262a,tubeLipCol=0x725447;
        const stations=[
          {z:-half,w:.20,y:.56},
          {z:-half*.78,w:B*.38,y:.46},
          {z:-half*.43,w:B*.78,y:.38},
          {z:.05,w:B*.98,y:.32},
          {z:half*.55,w:B,y:.34},
          {z:half,w:B*.88,y:.44}
        ];
        const verts=[],idx=[],rings=stations.map(s=>[
          [0,-.18,s.z],
          [-s.w*.50,.10,s.z],
          [-s.w*.66,s.y+.20,s.z],
          [-s.w*.50,free,s.z],
          [ s.w*.50,free,s.z],
          [ s.w*.66,s.y+.20,s.z],
          [ s.w*.50,.10,s.z]
        ]);
        for(const ring of rings)for(const p of ring)verts.push(...p);
        const N=7;
        // Tanquem tot el buc, inclosa la cara inferior entre l'última
        // aresta d'estribord (6) i la quilla (0). Ja no cal cap caixa negra.
        for(let j=0;j<rings.length-1;j++)for(let k=0;k<N;k++){
          const next=(k+1)%N,a=j*N+k,b=a+N,c=(j+1)*N+next,d=j*N+next;
          idx.push(a,b,c,a,c,d)
        }
        const transom=(rings.length-1)*N;
        for(let k=1;k<N-1;k++)idx.push(transom,transom+k+1,transom+k);
        // Tanquem la cara frontal de la proa (-Z), amb normals cap enfora.
        for(let k=1;k<N-1;k++)idx.push(0,k,k+1);

        // La coberta ja forma part dels quads superiors del casc (k===3).
        // No hi afegim cap segona superfície per evitar el z-fighting.
        const geo=new THREE.BufferGeometry();
        geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
        geo.setIndex(idx);geo.computeVertexNormals();
        g.add(new THREE.Mesh(geo,material(hullCol,'paint')));


        // Cabina oberta i parabrisa de la llanxa normal.
        const cockFront=screenZ+.18,cockRear=cockZ+cockL*.72,cockLen=cockRear-cockFront;
        for(const side of[-1,1]){
          const wall=box(g,.18,.78,cockLen,hullCol,side*(B*.43),1.38,(cockFront+cockRear)/2,'paint');
          wall.rotation.z=side*.06;
        }
        box(g,B*.86,.74,.18,hullCol,0,1.38,cockRear,'paint');
        for(const x of[-.72,0,.72]){
          const w=x===0?B*.34:B*.25,
                scr=box(g,w,.64,.10,glassCol,x*(B*.43),1.74,screenZ,'glass');
          scr.rotation.x=-.48;scr.rotation.z=x===0?0:(x<0?-.10:.10);
        }
        {const trimBar=box(g,B*.88,.14,.16,trim,0,1.45,screenZ+.12,'metal');trimBar.rotation.x=-.48}

        const aftStart=cockRear+.14,aftLen=half-aftStart-.10;
        if(aftLen>.4)box(g,B*.84,.15,aftLen,deckCol,0,1.18,aftStart+aftLen/2,'paint');
        for(const z of[cockZ-.15,cockZ+.65])box(g,B*.56,.14,.48,0x3a4245,0,1.08,z,'paint');
        for(const x of[-B*.31,B*.31])rod(g,[x,free+.10,-half*.22],[x,free+.10,-half*.50],.025,trim,'metal');

        // Base giratòria baixa.
        const pedestal=new THREE.Group();pedestal.position.set(0,1.30,2.66);g.add(pedestal);
        const baseDisc=new THREE.Mesh(new THREE.CylinderGeometry(.62,.72,.18,12),material(trim,'metal'));
        baseDisc.position.y=.02;pedestal.add(baseDisc);
        box(pedestal,.92,.24,.72,trim,0,.22,0,'metal');

        // C4: feix recul·lat i llarg. Sense bloc massís: 12 cilindres 3×4.
        const rack=new THREE.Group();rack.position.set(0,.55,.38);rack.rotation.x=.62;pedestal.add(rack);
        const tubeR=.104,rackLen=2.82,pitch=tubeR*2.04,cols=4,rows=3,
              packW=pitch*(cols-1)+tubeR*2,packH=pitch*(rows-1)+tubeR*2,
              tubeCenterZ=-rackLen*.38;

        for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
          const x=(col-(cols-1)/2)*pitch,
                y=(row-(rows-1)/2)*pitch,
                z=tubeCenterZ;
          const tube=new THREE.Mesh(new THREE.CylinderGeometry(tubeR,tubeR,rackLen,12),material(tubeCol,'metal'));
          tube.rotation.x=Math.PI/2;tube.position.set(x,y,z);rack.add(tube);
          const lip=new THREE.Mesh(new THREE.CylinderGeometry(tubeR*1.08,tubeR*1.08,.065,12),material(tubeLipCol,'metal'));
          lip.rotation.x=Math.PI/2;lip.position.set(x,y,z-rackLen*.50);rack.add(lip);
          const rear=new THREE.Mesh(new THREE.CylinderGeometry(tubeR*1.04,tubeR*1.04,.045,12),material(trim,'metal'));
          rear.rotation.x=Math.PI/2;rear.position.set(x,y,z+rackLen*.50);rack.add(rear);
        }

        // Travessers fins: mantenen el paquet unit sense convertir-lo en una caixa.
        for(const z of[tubeCenterZ-rackLen*.22,tubeCenterZ+rackLen*.22]){
          box(rack,packW+.10,.055,.075,trim,0,-packH*.53,z,'metal');
          box(rack,packW+.10,.055,.075,trim,0, packH*.53,z,'metal');
        }
        for(const side of[-1,1])box(rack,.055,packH+.10,.075,trim,side*packW*.53,0,tubeCenterZ+.02,'metal');

        // Bastidor posterior reforçat del model 4.
        for(const side of[-1,1]){
          rod(pedestal,[side*.50,.28,.24],[side*.67,1.03,-.16],.043,trim,'metal');
          rod(pedestal,[side*.67,1.03,-.16],[side*.67,.30,-.72],.043,trim,'metal');
          rod(pedestal,[side*.67,.30,-.72],[side*.50,.28,.24],.043,trim,'metal');
          rod(pedestal,[side*.52,.30,.32],[side*.72,1.08,-.25],.047,trim,'metal');
          rod(pedestal,[side*.52,.30,.32],[side*.70,.32,-.92],.047,trim,'metal');
        }
        rod(pedestal,[-.52,.28,.08],[.52,.28,.08],.046,trim,'metal');

        // Sensor baix separat, sense recuperar el radar posterior.
        const sensor=box(g,.30,.38,.30,trim,-.82,1.42,3.40,'metal');sensor.rotation.z=.04;
        box(g,.22,.12,.22,tubeCol,-.82,1.67,3.40,'metal');
      }
      if(t==='moto_aquatica'){
        const bodyCol=0xc94e3f,dark=0x33383b;
        const nose=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),material(bodyCol,'paint'));nose.scale.set(.72,.42,1.55);nose.position.set(0,.62,-.95);g.add(nose);
        box(g,1.38,.38,2.55,bodyCol,0,.54,.55,'paint');box(g,.72,.22,1.05,dark,0,.88,.6,'rubber');box(g,.82,.16,.56,0x222629,0,1.02,.2,'rubber');
        rod(g,[-.42,1.16,-.35],[.42,1.16,-.35],.055,metal);rod(g,[0,.94,-.2],[0,1.16,-.35],.05,metal);
        for(const x of[-.52,.52])box(g,.16,.13,.7,0xe9e7df,x,.36,.45,'paint');
      }
      if(t==='barca_rems'){
        // Proa = -Z; popa ampla = +Z. Buc buit de fusta, sense tapa sobre la banyera.
        const wood=0x987046,darkWood=0x51351f,trim=0xbd905a;
        const stations=[[-2.9,.025],[-2.55,.48],[-1.95,.88],[-1.1,1.17],[-.15,1.29],[.85,1.28],[1.8,1.17],[2.6,1.02]];
        const sheer=z=>.98+.15*Math.pow(Math.abs(z)/2.9,2);
        const meshFromQuads=(quads,color)=>{
          const positions=[];for(const [a,b,c,d] of quads)positions.push(...a,...b,...c,...a,...c,...d);
          const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
          const mat=material(color,'organic');mat.side=THREE.DoubleSide;
          const m=new THREE.Mesh(geo,mat);g.add(m);return m;
        };
        const levels=[[-.35,.48],[.06,.7],[.52,.9],[1,1]];
        const point=(s,k,side,inner=false)=>{const [z,w]=s,[h,f]=levels[k];return [side*Math.max(.008,w*f-(inner?.085:0)),k===3?sheer(z):h,z]};
        for(let k=0;k<3;k++){
          const quads=[];
          for(const side of[-1,1])for(let j=0;j<stations.length-1;j++)quads.push([point(stations[j],k,side),point(stations[j+1],k,side),point(stations[j+1],k+1,side),point(stations[j],k+1,side)]);
          meshFromQuads(quads,[0x745032,0x89613b,wood][k]);
        }
        const inside=[],rim=[];
        for(const side of[-1,1])for(let j=0;j<stations.length-1;j++){
          const a=stations[j],b=stations[j+1];
          inside.push([point(a,1,side,true),point(a,3,side,true),point(b,3,side,true),point(b,1,side,true)]);
          rim.push([point(a,3,side),point(b,3,side),point(b,3,side,true),point(a,3,side,true)]);
          // Borda contínua i juntes discretes entre taulons.
          rod(g,point(a,3,side),point(b,3,side),.045,trim,'organic');
          for(const k of[1,2])rod(g,point(a,k,side),point(b,k,side),.014,darkWood,'organic');
        }
        meshFromQuads(inside,0xa17c50);meshFromQuads(rim,trim);
        // Mirall de popa pla, inclinat cap endins al fons; proa tancada i estreta.
        for(const index of[0,stations.length-1]){
          const s=stations[index];meshFromQuads([[point(s,0,-1),point(s,0,1),point(s,3,1),point(s,3,-1)]],wood);
          rod(g,point(s,3,-1),point(s,3,1),.05,trim,'organic');
        }
        const floor=[];
        for(let j=0;j<stations.length-1;j++){
          const a=stations[j],b=stations[j+1];
          floor.push([[-a[1]*.69,.075,a[0]],[a[1]*.69,.075,a[0]],[b[1]*.69,.075,b[0]],[-b[1]*.69,.075,b[0]]]);
        }
        meshFromQuads(floor,0x805f3d);
        for(const x of[-.48,-.24,0,.24,.48])box(g,.018,.012,3.8,darkWood,x,.085,.35,'organic');
        for(const z of[-1.12,1.55]){
          const seatWidth=z<0?1.85:2.08;
          box(g,seatWidth,.13,.57,trim,0,.78,z,'organic');
          for(const x of[-.75,.75])box(g,.09,.63,.12,darkWood,x,.4,z,'organic');
          box(g,seatWidth-.04,.013,.018,darkWood,0,.852,z,'organic');
        }
        // Petit reforç triangular de proa, sense tapar l’interior.
        meshFromQuads([[[0,1.1,-2.86],[-.48,1.075,-2.5],[.48,1.075,-2.5],[0,1.1,-2.86]]],trim);
        const oars=new THREE.Group();g.add(oars);g.userData.oars=[];
        g.userData.rowingSeat={y:.855,z:-1.12};
        for(const side of[-1,1]){
          const pivot=new THREE.Group();pivot.position.set(side*1.27,1.08,-.18);oars.add(pivot);
          round(g,.075,.18,metal,side*1.27,1.07,-.18,'y','metal');
          rod(pivot,[-side*.87,0,0],[side*1.85,0,0],.042,trim,'organic');
          box(pivot,.28,.085,.085,darkWood,-side*.77,0,0,'organic');
          const blade=box(pivot,.68,.085,.3,0xb48953,side*2.02,0,0,'organic');blade.rotation.z=.08*side;
          pivot.userData.grip=new THREE.Vector3(-side*.77,0,0);
          g.userData.oars.push(pivot);
        }
        // Fusiona només les peces fixes per material; els dos rems conserven els seus pivots.
        const batches=new Map();
        for(const m of [...g.children])if(m.isMesh){
          m.updateMatrix();const geo=m.geometry.clone().applyMatrix4(m.matrix),flat=geo.index?geo.toNonIndexed():geo;
          const mat=m.material,key=[mat.color.getHex(),mat.roughness,mat.metalness,mat.side].join(':');
          if(!batches.has(key))batches.set(key,{mat,positions:[],normals:[]});
          const batch=batches.get(key);batch.positions.push(...flat.attributes.position.array);batch.normals.push(...flat.attributes.normal.array);
          g.remove(m);m.geometry.dispose();if(mat!==batch.mat)mat.dispose();flat.dispose();if(flat!==geo)geo.dispose();
        }
        for(const batch of batches.values()){
          const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));
          g.add(new THREE.Mesh(geo,batch.mat));
        }
        // Tapa invisible de l'obertura: marca stencil després dels sòlids i abans del mar.
        // Forma part del vehicle i segueix automàticament totes les seves transformacions.
        const maskPositions=[];
        for(let j=0;j<stations.length-1;j++){
          const a=point(stations[j],3,-1,true),b=point(stations[j],3,1,true),c=point(stations[j+1],3,1,true),d=point(stations[j+1],3,-1,true);
          maskPositions.push(...a,...b,...c,...a,...c,...d);
        }
        const maskGeometry=new THREE.BufferGeometry();maskGeometry.setAttribute('position',new THREE.Float32BufferAttribute(maskPositions,3));
        const maskMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:true,side:THREE.DoubleSide,
          stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,
          stencilFail:THREE.KeepStencilOp,stencilZFail:THREE.KeepStencilOp,stencilZPass:THREE.ReplaceStencilOp});
        const mask=new THREE.Mesh(maskGeometry,maskMaterial);mask.name='rowboat-water-mask';mask.userData.waterMask=true;mask.renderOrder=1;g.add(mask);
      }
      if(t==='windsurf'){
        // Taula de surf: proa en punta (-Z), màxima amplada a mig cos
        // i cua una mica més estreta amb el tall final completament recte.
        const outline=new THREE.Shape();
        outline.moveTo(0,2.72);
        outline.quadraticCurveTo(.36,2.58,.49,2.15);
        outline.bezierCurveTo(.69,1.42,.69,.55,.65,0);
        outline.bezierCurveTo(.62,-1.15,.52,-2.22,.42,-2.65);
        outline.lineTo(-.42,-2.65);
        outline.bezierCurveTo(-.52,-2.22,-.62,-1.15,-.65,0);
        outline.bezierCurveTo(-.69,.55,-.69,1.42,-.49,2.15);
        outline.quadraticCurveTo(-.36,2.58,0,2.72);
        outline.closePath();
        const deckGeo=new THREE.ExtrudeGeometry(outline,{
          depth:.16,steps:1,bevelEnabled:true,bevelThickness:.025,
          bevelSize:.035,bevelSegments:1,curveSegments:10
        });
        deckGeo.rotateX(-Math.PI/2);
        const deck=new THREE.Mesh(deckGeo,material(0xf2e2b9,'paint'));
        deck.position.y=.16;g.add(deck);
        // Superfície útil de la vela aproximadament doble: més alta,
        // més ampla i amb la vora de sortida suaument corbada.
        rod(g,[0,.32,.25],[0,5.97,.25],.085,metal);
        const sailPoints=[
          [0,5.82,.25],[0,.83,.25],[1.19,1.02,.25],
          [2.75,1.45,.25],[2.71,2.48,.25],
          [2.22,3.77,.25],[1.18,5.18,.25]
        ];
        const geom=new THREE.BufferGeometry();
        geom.setAttribute('position',new THREE.Float32BufferAttribute(sailPoints.flat(),3));
        geom.setIndex([0,1,2,0,2,3,0,3,4,0,4,5,0,5,6]);
        geom.computeVertexNormals();
        const cloth=material(0xe86d4b,'paint');cloth.side=THREE.DoubleSide;
        const sail=new THREE.Mesh(geom,cloth);g.add(sail);
        rod(g,[0,.83,.25],[2.75,1.45,.25],.036,metal);
        rod(g,[2.75,1.45,.25],[2.71,2.48,.25],.033,metal);
        rod(g,[2.71,2.48,.25],[2.22,3.77,.25],.033,metal);
        rod(g,[2.22,3.77,.25],[1.18,5.18,.25],.033,metal);
        rod(g,[1.18,5.18,.25],[0,5.82,.25],.033,metal);
        // Travesser per davant de la vela, visible des de la càmera (+Z).
        // Les dues mans utilitzen aquests punts exactes de contacte.
        const boomStart=new THREE.Vector3(0,2.85,.70),
              boomEnd=new THREE.Vector3(2,2.10,.70);
        rod(g,boomStart.toArray(),boomEnd.toArray(),.065,metal);
        rod(g,[0,2.85,.25],boomStart.toArray(),.045,metal);
        g.userData.windsurfGrips=[.35,.60].map(k=>
          boomStart.clone().lerp(boomEnd,k));
      }
      if(t==='ferry'){
        const hullCol=0x4e6570,deckCol=0x8f9692,edge=0xd7d2bd,cabin=0xe7e3d5;
        box(g,32,2.25,55,hullCol,0,.7,0,'paint');
        box(g,30.4,.3,51.6,deckCol,0,2.12,0,'metal');
        for(const x of[-15.05,15.05])box(g,.28,1.05,51.4,edge,x,2.58,0,'metal');
        // Les rampes conserven exactament les mides originals.
        const frontRamp=box(g,13.6,.3,6.2,deckCol,0,1.35,-28.4,'metal');frontRamp.rotation.x=-.22;
        const rearRamp=box(g,13.6,.3,6.2,deckCol,0,1.35,28.4,'metal');rearRamp.rotation.x=.22;
        for(const x of[-6.55,6.55]){rod(g,[x,2.3,-25.6],[x,.65,-31.2],.12,edge);rod(g,[x,2.3,25.6],[x,.65,31.2],.12,edge)}
        box(g,3.35,3.7,7.6,cabin,11.5,4.05,1.8,'paint');
        box(g,3.05,1.05,7.1,glass,11.5,4.62,1.8,'glass');
        box(g,3.65,.28,8.05,hullCol,11.5,6.02,1.8,'metal');
        for(const z of[-1.05,1.15,3.35])box(g,.16,1.05,.18,hullCol,9.87,4.62,z,'metal');
        rod(g,[11.5,6.15,3.8],[11.5,9.4,3.8],.11,metal);box(g,1.25,.18,.18,0x30383a,11.5,9.42,3.8,'metal');
        for(const x of[-14.3,14.3])for(const z of[-21,-14,-7,0,7,14,21])round(g,.18,.28,0x252d31,x,1.45,z,'z','rubber');
        for(const z of[-24.5,24.5])for(const x of[-10,-5,0,5,10])box(g,2.2,.08,.28,0xf1e9c5,x,2.32,z,'paint');
        g.userData.ferryDeck=true;
      }
      if(t==='hover'){box(g,5,.85,8,rubber,0,.55,0,'rubber');for(const x of[-2.35,2.35])for(let z=-3.5;z<4;z+=.65)box(g,.2,.7,.48,0x394145,x,.5,z,'rubber');box(g,4.45,.85,6.7,0xcf9e4f,0,1.38,-.2,'paint');box(g,2.75,1.12,2.9,glass,0,2.2,-.92,'glass');box(g,2.98,.22,3.2,0xcda75f,0,2.82,-.92,'paint');for(const x of[-2.05,2.05])box(g,.18,.3,6.7,0xa97835,x,1.25,-.2,'paint');for(const x of[-1.1,1.1])box(g,.42,.22,.16,0xffe09a,x,1.45,-3.55,'paint');const duct=new THREE.Mesh(new THREE.TorusGeometry(1.55,.2,8,20),material(metal,'metal'));duct.position.set(0,2.9,3);g.add(duct);const fan=new THREE.Group();fan.position.copy(duct.position);for(let i=0;i<4;i++){const blade=box(fan,.2,2.8,.12,rubber,0,0,0,'rubber');blade.rotation.z=i*Math.PI/4}g.add(fan);g.userData.fan=fan;round(g,.28,.3,0x7b8588,0,2.9,3,'z','metal');for(const x of[-1.7,1.7]){box(g,.15,2.05,1,0xbe8c43,x,2.68,3.5,'paint');rod(g,[x,1.7,2.65],[x,3.65,3.2],.07,metal)}box(g,1.4,.18,.8,0x5b4939,0,1.88,1.45,'paint')}
      if(t==='heli'||t==='heli_combat'){
        const combat=t==='heli_combat',bodyCol=combat?0x59634f:0x647768;
        if(!combat){
          // Huey 3B-4: la secció central és un PASSADÍS OBERT de banda a
          // banda, no un prisma massís amagat rere els marcs de les portes.
          // Frontal i cua conserven el gruix; al mig, només sòl i sostre.
          const doorFront=-.76,doorRear=1.76,frontEnd=-1.79,rearEnd=2.39;
          roundedPrism(g,2.7,1.74,doorFront-frontEnd,.20,bodyCol,0,2.08,(frontEnd+doorFront)/2,'paint');
          roundedPrism(g,2.7,1.74,rearEnd-doorRear,.16,bodyCol,0,2.08,(doorRear+rearEnd)/2,'paint');
          roundedPrism(g,2.7,.16,doorRear-doorFront,.06,bodyCol,0,1.28,(doorFront+doorRear)/2,'paint');
          roundedPrism(g,2.7,.20,doorRear-doorFront,.06,bodyCol,0,2.88,(doorFront+doorRear)/2,'paint');
          const belly=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),material(bodyCol,'paint'));belly.scale.set(1.24,.24,1.92);belly.position.set(0,1.39,.34);g.add(belly);
          const nose=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),material(glass,'glass'));nose.scale.set(1.28,.9,1.02);nose.position.set(0,2.17,-2.35);g.add(nose);
          roundedPrism(g,2.38,.32,2.12,.13,bodyCol,0,2.91,.04,'paint');
          // Grans obertures laterals de transport.
          const sideX=1.36;
          for(const side of[-1,1]){
            box(g,.1,1.18,.36,bodyCol,side*sideX,2.0,-.76,'paint');
            box(g,.1,1.18,.36,bodyCol,side*sideX,2.0,1.76,'paint');
            box(g,.1,.14,2.05,0x343b35,side*(sideX+.01),1.43,.5,'metal');
            rod(g,[side*sideX,2.58,-.58],[side*sideX,2.58,1.58],.052,bodyCol,'paint');
            // Variant 4: petit carenat arrodonit en lloc dels antics discs laterals.
            const pod=roundedPrism(g,.28,.58,.82,.12,bodyCol,side*1.323,1.86,-2.37,'paint');pod.rotation.z=side*.08;
            box(g,.08,.32,.46,0x343b35,side*1.364,1.88,-2.38,'metal');
          }
          // Bancs interiors visibles a través de les portes.
          for(const x of[-.82,.82])box(g,.4,.46,2.1,0x2d302c,x,1.55,.55,'paint');
          // Boom de cua afinat i estabilitzador.
          {const startZ=2,endZ=7.48,y0=2.58,y1=2.98,L=Math.hypot(endZ-startZ,y1-y0),boom=new THREE.Mesh(new THREE.CylinderGeometry(.176,.42,L,6),material(bodyCol,'paint'));boom.position.set(0,(y0+y1)/2,(startZ+endZ)/2);boom.rotation.x=Math.PI/2-Math.atan2(y1-y0,endZ-startZ);g.add(boom)}
          box(g,.12,1.35,.88,bodyCol,0,3.34,7.36,'paint');box(g,2.25,.1,.58,bodyCol,0,2.9,6.43,'paint');
          // Patins del model 3B.
          for(const x of[-1.458,1.458]){rod(g,[x,.48,-2.12],[x,.48,2.3],.075,metal);rod(g,[x*.45,1.15,-1.05],[x,.48,-1.05],.07,metal);rod(g,[x*.45,1.15,1.0],[x,.48,1.0],.07,metal)}
          roundedPrism(g,1.3,.62,1.8,.17,0x505b49,0,3.12,.82,'paint');
          rod(g,[.494,3.15,1.34],[.845,3.2,1.78],.11,0x343b35,'metal');
        }else{
          // Combat Compacte B3 · Apache: cabines igualades, fuselatge compacte i unió diagonal.
          const fus=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),material(bodyCol,'paint'));fus.scale.set(.86,.86,2.51);fus.position.set(0,2.08,.2);g.add(fus);
          roundedPrism(g,1.38,.48,1.9,.15,0x4f5949,0,2.68,-.12,'paint');

          // Dues cabines de mida equivalent, més angulars, inspirades en l'Apache.
          const front=roundedPrism(g,1.31,.78,.98,.025,glass,0,2.13,-2.45,'glass');front.rotation.x=-.11;
          const rear=roundedPrism(g,1.31,.78,.98,.025,glass,0,2.46,-1.34,'glass');rear.rotation.x=.06;
          box(g,1.45,.2,.3,bodyCol,0,1.84,-2.93,'paint');
          const bridge=box(g,1.38,.56,.76,bodyCol,0,2.5,-1.87,'paint');bridge.rotation.x=-.5;
          box(g,1.31,.26,.62,bodyCol,0,2.83,-.68,'paint');

          // Aletes curtes i barquilles grans.
          for(const x of[-1.57,1.57]){
            const side=Math.sign(x);
            rod(g,[side*.58,2.0,-.08],[x,1.8,.08],.085,metal);
            box(g,.18,.13,1.9,0x4c5749,x,1.79,.18,'paint');
            round(g,.26,1.9,0x39423a,x,1.68,.18,'z','metal');
            box(g,.34,.18,.45,0x303638,x,1.68,-.86,'metal');
          }

          // Canó de morro.
          rod(g,[0,1.72,-2.85],[0,1.72,-4.0],.11,metal);box(g,.3,.26,.52,0x343b35,0,1.72,-3.92,'metal');

          // Patins connectats directament al fuselatge.
          for(const x of[-1.17,1.17]){
            const side=Math.sign(x);
            rod(g,[x,.48,-1.72],[x,.48,1.42],.075,metal);
            rod(g,[side*.55,1.85,-1.0],[x,.48,-1.0],.075,metal);
            rod(g,[side*.62,1.88,.15],[x,.48,.15],.075,metal);
            rod(g,[side*.58,1.82,.95],[x,.48,.95],.075,metal);
          }

          // Boom de cua afinat i estabilitzador del B3.
          {const startZ=.95,endZ=6.99,y0=2.42,y1=2.95,L=Math.hypot(endZ-startZ,y1-y0),boom=new THREE.Mesh(new THREE.CylinderGeometry(.147,.35,L,6),material(bodyCol,'paint'));boom.position.set(0,(y0+y1)/2,(startZ+endZ)/2);boom.rotation.x=Math.PI/2-Math.atan2(y1-y0,endZ-startZ);g.add(boom)}
          box(g,.12,1.35,.88,bodyCol,0,3.34,6.87,'paint');
          box(g,2.25,.1,.58,bodyCol,0,2.9,5.94,'paint');
        }
        const rotorY=combat?3.22:3.82,mastBaseY=combat?2.94:3.02;rod(g,[0,mastBaseY,0],[0,rotorY,0],.14,metal);round(g,.3,.2,metal,0,rotorY,0,'y','metal');const rotor=new THREE.Group();rotor.position.set(0,rotorY,0);for(const a of(combat?[0,Math.PI/3,Math.PI*2/3]:[0,Math.PI/2])){const blade=box(rotor,combat?13.5:14.8,.1,.36,rubber,0,0,0,'rubber');blade.rotation.y=a}g.add(rotor);g.userData.rotor=rotor;
        const tail=new THREE.Group();tail.position.set(.38,3.45,combat?7:7.38);box(tail,.1,1.9,.16,rubber,0,0,0,'rubber');box(tail,.1,.16,1.9,rubber,0,0,0,'rubber');g.add(tail);g.userData.tailRotor=tail;
      }
      if(t==='bici'){const crank=new THREE.Group();crank.position.set(0,.75,0);for(const side of[-1,1]){rod(crank,[side*.3,0,0],[side*.3,0,side*.28],.045,metal);box(crank,.26,.08,.18,rubber,side*.4,0,side*.28,'rubber')}g.add(crank);g.userData.crank=crank}
      // La coordenada Y de l'origen no és l'altura dels patins.
      // Les dues barres inferiors estan centrades a y=.48 i tenen radi .075.
      // Guardam el contacte inferior JA escalat per a la física d'aterratge.
      if(t==='heli'||t==='heli_combat'){
        g.userData.skidContactHeight=(.48-.075)*VS[t];
        g.userData.rotorContactHeight=((t==='heli_combat'?3.22:3.82)+.05)*VS[t];
      }
      g.traverse(o=>{if(o.isMesh&&!o.userData.waterMask){o.castShadow=shadows;o.receiveShadow=shadows}});
      g.scale.setScalar(VS[t]);return g;
    };
  }
});

