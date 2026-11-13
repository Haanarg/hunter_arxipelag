import {turretSpecs,advanceTurret} from './vehicle-turret-core.mjs';
import {prepareGazTigrRuntime} from './gaz-tigr-runtime.mjs';
import {installBtr82Model3B} from './btr82-3b-native.mjs';
import {vehicleSpecs} from './vehicle-specs.mjs';
import {createJetSki25,JET_SKI_25_META} from './jet-ski-25-geometry.mjs?rev=vivid-engine-cover-2';
import {createStreetfighter25,STREETFIGHTER_25_META} from './streetfighter-25-geometry.mjs';
import {createDistantVehicleFactory,setDistantVehicleLOD,shouldSimplifyVehicle} from './vehicle-distant-lod.mjs?v=0.6.170';
import {createHovercraftConcept,hovercraftConcepts} from './hovercraft-concepts.mjs?v=0.6.81';
// Fàbrica visual de vehicles. No conté física, controls ni regles de conducció.
export const vehicleModels=Object.freeze({
  ...vehicleSpecs,
  steeringMax:Object.freeze({bici:.60,moto:.52,cotxe:.44,cotxe_civil:.43,camio:.36,tanqueta:25*Math.PI/180}),
  // LOD purament visual de les barques de rems. Ni la física, ni els
  // ocupants, ni la posició del vehicle es veuen alterats.
  setDistantVehicleLOD,shouldSimplifyVehicle,
  setRowboatVisualLod(model,far){
    const lod=model?.userData?.rowboatVisualLod;
    if(!lod||lod.far.visible===!!far)return false;
    lod.far.visible=!!far;
    for(const node of lod.full)node.visible=!far;
    return true;
  },
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
    const result=advanceTurret(rig,pivot.rotation.y,pitch.rotation.x,local,dt);
    pivot.rotation.y=result.yaw;pitch.rotation.x=result.pitch;return result.aligned;
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
  createFactory(THREE,{box,material,shadows,resources=null,civilianCar=null,gazTigr:gazTigrFactory=null,truck:truckFactory=null,batching=null}){
    const VS=this.scales,templates=new Map(),distant=createDistantVehicleFactory(THREE,resources);
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
    return function createVehicle(t,appearance={}){
      const cacheKey=t==='cotxe'?'gaz-tigr':t==='camio'?'camio':t==='cotxe_civil'?'civil:'+String(appearance.color??0x4b9fd1):null;
      if(resources&&cacheKey&&templates.has(cacheKey))return resources.cloneModel(templates.get(cacheKey));
      const g=new THREE.Group();g.rotation.order='YXZ';const metal=0x3e4849,glass=0x76acba,rubber=0x252d31;
      if(t==='cotxe_civil'){
        // Model definitiu C1A aprovat a la preview: mateixos passos de roda,
        // vidres, habitacle i maleter. La geometria s'instancia per cotxe.
        const factory=civilianCar;
        if(typeof factory!=='function')throw new Error('Falta el model civil C1A');
        const car=factory(THREE,appearance.color??0x4b9fd1);
        g.add(car);
        g.userData.wheels=car.userData.wheels;
        g.userData.steeringPivots=car.userData.steeringPivots;
        // Distància rodada = velocitat × dt / radi real escalat.
        // Evitam que el pneumàtic sembli relliscar per un radi genèric.
        for(const wheel of g.userData.wheels)
          wheel.userData.radius*=VS.cotxe_civil;
        g.userData.civilianModel='C1A';
        g.userData.civilianColor=appearance.color??0x4b9fd1;
        // Agrupació per shader i propietats de material, sense canviar
        // els colors originals: s'emmagatzemen com atribut RGB per vèrtex.
        // Les rodes animades i els vidres transparents no s'agrupen.
        const batches=new Map();
        for(const mesh of car.children.filter(o=>o.isMesh&&!o.material.transparent)){
          const mat=mesh.material;
          const colored=mat.isMeshStandardMaterial&&mat.color&&!mat.vertexColors&&
            !mat.map&&!mat.normalMap&&!mat.alphaMap&&!mat.emissiveMap&&
            !mat.roughnessMap&&!mat.metalnessMap&&mat.opacity===1;
          const key=colored?[
            'opaque-rgb',mat.roughness,mat.metalness,mat.flatShading,
            mat.side,mat.depthTest,mat.depthWrite,mat.blending,
            mesh.renderOrder,mesh.castShadow,mesh.receiveShadow
          ].join(':'):mat;
          let batch=batches.get(key);
          if(!batch){
            const mergedMat=colored?mat.clone():mat;
            if(colored){mergedMat.color.setRGB(1,1,1);mergedMat.vertexColors=true;}
            batch={pos:[],norm:[],rgb:[],material:mergedMat,colored};
            batches.set(key,batch);
          }
          mesh.updateMatrix();
          const transformed=mesh.geometry.clone();
          transformed.applyMatrix4(mesh.matrix);
          if(!transformed.getAttribute('normal'))transformed.computeVertexNormals();
          const flat=transformed.index?transformed.toNonIndexed():transformed;
          const vertices=flat.getAttribute('position'),normals=flat.getAttribute('normal');
          for(let i=0;i<vertices.count;i++){
            batch.pos.push(vertices.getX(i),vertices.getY(i),vertices.getZ(i));
            batch.norm.push(normals.getX(i),normals.getY(i),normals.getZ(i));
            if(colored)batch.rgb.push(mat.color.r,mat.color.g,mat.color.b);
          }
          car.remove(mesh);
          mesh.geometry.dispose();transformed.dispose();
          if(flat!==transformed)flat.dispose();
        }
        let count=0;
        for(const b of batches.values()){
          const geo=new THREE.BufferGeometry();
          geo.setAttribute('position',new THREE.Float32BufferAttribute(b.pos,3));
          geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.norm,3));
          if(b.colored)geo.setAttribute('color',new THREE.Float32BufferAttribute(b.rgb,3));
          const mesh=new THREE.Mesh(geo,b.material);
          mesh.name='civil-c1a-batch-'+count++;
          car.add(mesh);
        }
        g.userData.staticBatches=count;
      }
      if(t==='cotxe'){
        // El GAZ Tigr-M natiu substitueix del tot el Humvee, també en COOP.
        const runtime=gazTigrFactory||(gazTigrFactory=prepareGazTigrRuntime(THREE));
        const gaz=runtime.create();
        resources?.retainModel(gaz);
        g.add(gaz);
        g.userData.wheels=gaz.userData.wheels;
        g.userData.steeringPivots=gaz.userData.steeringPivots;
        g.userData.militaryCarModel='GAZ Tigr-M';
        g.userData.staticBatches=runtime.staticBatches;
      }
      if(t==='camio'){
        // A4.3: el mateix low-poly de la preview, adaptat a la
        // caixa de col·lisió física existent (3.6 × 7.8, abans de VS).
        const factory=truckFactory;
        if(typeof factory!=='function')throw new Error('Falta el model A4.3');
        const truck=factory(THREE),fit=.82;
        // Les sis rodes són animades; fusionam només malles estàtiques.
        // Una malla per material evita 140+ draw calls per camió.
        const groups=new Map();
        for(const mesh of truck.children.filter(o=>o.isMesh)){
          mesh.updateMatrix();
          const geometry=mesh.geometry.clone();
          geometry.applyMatrix4(mesh.matrix);
          if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
          const flat=geometry.index?geometry.toNonIndexed():geometry;
          const grp=groups.get(mesh.material)||{pos:[],norm:[],material:mesh.material};
          const positions=flat.getAttribute('position'),normals=flat.getAttribute('normal');
          for(let i=0;i<positions.count;i++){
            grp.pos.push(positions.getX(i),positions.getY(i),positions.getZ(i));
            grp.norm.push(normals.getX(i),normals.getY(i),normals.getZ(i));
          }
          groups.set(mesh.material,grp);
          truck.remove(mesh);
          mesh.geometry.dispose();geometry.dispose();
          if(flat!==geometry)flat.dispose();
        }
        let batches=0;
        for(const grp of groups.values()){
          const geometry=new THREE.BufferGeometry();
          geometry.setAttribute('position',new THREE.Float32BufferAttribute(grp.pos,3));
          geometry.setAttribute('normal',new THREE.Float32BufferAttribute(grp.norm,3));
          const merged=new THREE.Mesh(geometry,grp.material);
          merged.name='truck-static-batch-'+batches++;
          truck.add(merged);
        }
        truck.scale.setScalar(fit);
        g.add(truck);
        g.userData.wheels=truck.userData.wheels||[];
        g.userData.steeringPivots=truck.userData.steeringPivots||[];
        for(const w of g.userData.wheels)w.userData.radius=.80*fit*VS.camio;
        g.userData.truckModel='A4.3';
        g.userData.truckStaticBatches=batches;
        g.userData.truckVisualFit=fit;
      }
      if(t==='moto'){
        // Naked streetfighter CC0 (candidat 2), versió 25% del banc de
        // proves: rodes amb radis intactes, forquilla i manillar units.
        // Malla precompilada; sense GLB ni meshoptimizer en temps de joc.
        const color=appearance.color??0x228fef;
        const bike=createStreetfighter25(THREE,{color,material});
        // Retorn a la mida de la v0.6.187: 50% més gran que el model inicial.
        // Conservam la connexió del manillar, la geometria i l'escala general.
        const visualScale=1.5;
        bike.scale.setScalar(visualScale);
        g.add(bike);
        g.userData.wheels=bike.userData.wheels;
        g.userData.steeringPivots=bike.userData.steeringPivots;
        // El radi físic de rodament ha d'incloure també el nou factor
        // visual; els pivots de direcció continuen compartint el mateix gir.
        for(const w of g.userData.wheels)w.userData.radius*=visualScale*VS.moto;
        g.userData.motorcycleVisualScale=visualScale;
        g.userData.motorcycleModel='naked-streetfighter-25';
        g.userData.motorcycleColor=color;
        g.userData.motorcycleTriangles=STREETFIGHTER_25_META.triangles;
        g.userData.motorcycleFit=STREETFIGHTER_25_META.fit;
      }
      if(t==='bici'){
        // Bicicleta de carretera procedural: quadre de doble triangle central,
        // rodes primes i unions compactes. Conserva els pivots, radi de
        // rodament, animacio de les rodes i pedalier originals.
        const r=.62,L=1.22,col=appearance.color??0x3f9b9d;
        const rear=[0,r,L],bb=[0,.73,0],seatTop=[0,1.67,.34],
              headTop=[0,1.73,-.85],headBottom=[0,1.48,-.94];
        const tube=(a,b,radius=.042)=>rod(g,a,b,radius,col,'paint');
        // El triangle principal es troba al pla central, no duplicat
        // als dos costats com al prototip anterior.
        tube(bb,seatTop,.057);
        tube(seatTop,headTop,.043);
        tube(headBottom,bb,.064);
        tube(headTop,headBottom,.069);
        // Tirants de darrere curts, units a unes punteres petites.
        for(const x of[-.11,.11]){
          tube([x,r,L],[x*.35,1.60,.36],.034);
          tube([x,r,L],[x*.4,.73,.02],.041);
          round(g,.066,.052,metal,x,r,L,'x','metal');
        }
        const steering=new THREE.Group();
        steering.position.set(0,1.68,-L);g.add(steering);
        (g.userData.steeringPivots||(g.userData.steeringPivots=[])).push(steering);
        const frontZ=0,frontY=r-1.68;
        // Roda, forquilla i manillar giren conjuntament.
        for(const x of[-.085,.085]){
          rod(steering,[x,frontY,frontZ],[x,1.51-1.68,.28],.041,col,'paint');
          round(steering,.065,.047,metal,x,frontY,frontZ,'x','metal');
        }
        rod(steering,[0,-.20,.28],[0,.24,.32],.055,metal);
        rod(steering,[-.42,.29,.32],[.42,.29,.32],.041,metal);
        for(const x of[-.42,.42])
          rod(steering,[x,.29,.32],[x,.29,.48],.035,rubber,'rubber');
        // Llantes metal·liques i pneumàtics de perfil molt més estret.
        // Les rodes continuen sent grups animables independents.
        function roadWheel(parent,z,y,owner){
          const p=new THREE.Group();p.position.set(0,y,z);parent.add(p);
          const tire=new THREE.Mesh(new THREE.TorusGeometry(r-.047,.047,8,28),
            material(0x20252a,'rubber'));
          tire.rotation.y=Math.PI/2;p.add(tire);
          const rim=new THREE.Mesh(new THREE.TorusGeometry(r-.092,.016,6,28),
            material(0xaeb9be,'metal'));
          rim.rotation.y=Math.PI/2;p.add(rim);
          round(p,.077,.103,metal,0,0,0,'x','metal');
          for(let i=0;i<10;i++){
            const a=i*Math.PI/10;
            rod(p,[0,Math.sin(a)*(r-.105),Math.cos(a)*(r-.105)],
              [0,-Math.sin(a)*(r-.105),-Math.cos(a)*(r-.105)],
              .010,0xb8c2c6,'metal');
          }
          p.userData.radius=r;
          (owner.userData.wheels||(owner.userData.wheels=[])).push(p);
        }
        roadWheel(g,L,r,g);
        roadWheel(steering,0,r-1.68,g);
        // Selló estret de planta triangular, amb la punta cap al davant.
        const saddleShape=new THREE.Shape();
        saddleShape.moveTo(0,.32);
        saddleShape.lineTo(-.24,-.22);
        saddleShape.quadraticCurveTo(0,-.34,.24,-.22);
        saddleShape.closePath();
        const saddle=new THREE.Mesh(
          new THREE.ExtrudeGeometry(saddleShape,{depth:.065,bevelEnabled:false}),
          material(0x252a2c,'rubber'));
        saddle.rotation.x=-Math.PI/2;
        saddle.position.set(0,1.84,.33);g.add(saddle);
        rod(g,[0,1.65,.34],[0,1.80,.33],.035,metal);
        round(g,.105,.14,metal,0,.73,0,'x','metal');
        // Els pedals animats continuen definits al bloc de pedalier comu.
        g.userData.bicycleModel='road-frame-v2';
      }
      if(t==='tanqueta'){
        // BTR-82 3B aprovat al comparador: casc angular simètric,
        // torreta corbada al davant, canó rebaixat i vuit rodes A4.3.
        // La física, les col·lisions i les regles de combat no canvien.
        installBtr82Model3B(THREE,g,{resources});
        g.userData.turretYawRate=turretSpecs.tanqueta.turretYawRate;
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
        const turret=new THREE.Group();turret.position.set(...turretSpecs.tanc.pivot);g.add(turret);
        round(turret,1.62,.82,0x78845b,0,0,0,'y','paint');
        box(turret,2.2,.26,1.65,0x6d7950,0,.38,0,'paint');
        round(turret,.62,.2,metal,.45,.54,.3);
        rod(turret,[-1,.16,.9],[-1,2.66,.9],.025,metal);
        const elev=new THREE.Group();elev.position.set(...turretSpecs.tanc.pitch);turret.add(elev);
        rod(elev,[0,0,0],[0,0,-4.35],.2,metal);
        box(elev,.66,.4,.68,metal,0,0,-4.08,'metal');
        const muzzle=new THREE.Object3D();muzzle.position.set(...turretSpecs.tanc.muzzle);elev.add(muzzle);
        g.userData.turretPivot=turret;g.userData.turretPitch=elev;
        g.userData.turretMuzzle=muzzle;g.userData.turretYawRate=turretSpecs.tanc.turretYawRate;
        // El tanc pot apuntar a casetes altes i a objectius sota un turó.
        g.userData.turretMinPitch=turretSpecs.tanc.turretMinPitch;g.userData.turretMaxPitch=turretSpecs.tanc.turretMaxPitch;
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
          scr.userData.boatWindshieldPane=x<0?0:x>0?2:1;
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
          scr.userData.boatWindshieldPane=x<0?0:x>0?2:1;
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
        // Recreational Jet Ski definitiu: 2.578 triangles (~25% del GLB CC0
        // original), ja descodificats com a dades geomètriques locals.
        // No carregam fitxers GLB ni executam meshoptimizer durant la missió.
        // La coberta del motor (node jetski-engine-cover) es pinta per instància amb el color viu
        // determinat pel generador del món; totes les llavors es conserven.
        const bodyColor=appearance.color??0x228fef;
        g.add(createJetSki25(THREE,{color:bodyColor,material}));
        g.userData.jetSkiModel='recreational-jet-ski-25';
        g.userData.jetSkiColor=bodyColor;
        g.userData.jetSkiTriangles=JET_SKI_25_META.triangles;
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
        // Rigg amb pivot al peu del pal. La vela és ara un 40% més alta,
        // s'inclina cap a proa (-Z) en navegar i es pot abatre sobre la
        // sorra, paral·lela a l'eix longitudinal de la taula.
        // Orientació en mirall: drap a babord (-X), rider a estribord (+X).
        const rig=new THREE.Group();
        rig.name='windsurf-sail-rig';
        rig.position.set(0,.34,.20);g.add(rig);
        const mastTop=8.35;
        rod(rig,[0,0,0],[0,mastTop,0],.075,metal);
        const sailPoints=[
          [0,8.18,0],[0,.55,0],[-1.05,.73,0],
          [-2.92,1.54,0],[-2.84,3.12,0],
          [-2.19,5.30,0],[-1.12,7.34,0]
        ];
        const geom=new THREE.BufferGeometry();
        geom.setAttribute('position',new THREE.Float32BufferAttribute(sailPoints.flat(),3));
        geom.setIndex([0,1,2,0,2,3,0,3,4,0,4,5,0,5,6]);
        geom.computeVertexNormals();
        // Same vivid body palette as the jet skis. The main membrane and
        // the contrasting upper/lower panels are colored per instance;
        // neither depends on renderer randomness or a shared cached model.
        const sailColor=appearance.color??0xc94e3f;
        const sailAccents={
          0xc94e3f:0xffdf18, // red / vivid yellow
          0xa4ec24:0x228fef, // lime / electric blue
          0xffdf18:0xef35a8, // yellow / magenta
          0xef35a8:0xffdf18, // magenta / yellow
          0x228fef:0xa4ec24, // blue / lime
          0xff7b19:0x12c9e4, // orange / cyan
          0x181c1e:0xffdf18  // black / luminous yellow
        };
        const sailAccent=sailAccents[sailColor]??0xf3f2db;
        const cloth=material(sailColor,'paint');cloth.side=THREE.DoubleSide;
        const sail=new THREE.Mesh(geom,cloth);
        sail.name='windsurf-sail';
        rig.add(sail);
        g.userData.windsurfSailColor=sailColor;
        g.userData.windsurfSailAccent=sailAccent;
        // Contrast panels make the mirrored sail clearly readable.
        const detail=new THREE.BufferGeometry();
        detail.setAttribute('position',new THREE.Float32BufferAttribute([
          0,8.18,.017, -1.12,7.34,.017, -2.19,5.30,.017,
          0,.55,.017, -1.05,.73,.017, -2.92,1.54,.017
        ],3));
        detail.setIndex([0,1,2,3,4,5]);detail.computeVertexNormals();
        const trim=material(sailAccent,'paint');trim.side=THREE.DoubleSide;
        const contrast=new THREE.Mesh(detail,trim);
        contrast.name='windsurf-sail-panels';
        rig.add(contrast);
        for(const [a,b] of [
          [[0,.55,0],[-2.92,1.54,0]],
          [[-2.92,1.54,0],[-2.84,3.12,0]],
          [[-2.84,3.12,0],[-2.19,5.30,0]],
          [[-2.19,5.30,0],[-1.12,7.34,0]],
          [[-1.12,7.34,0],[0,8.18,0]]
        ])rod(rig,a,b,.031,metal);
        // Botavara sobre la cara del rider (+Z). Les dues mans segueixen
        // punts diferents del travesser; la dreta es pot alliberar per disparar.
        const boomStart=new THREE.Vector3(0,2.66,.57),
              boomEnd=new THREE.Vector3(-1.85,2.45,.57);
        rod(rig,boomStart.toArray(),boomEnd.toArray(),.055,metal);
        rod(rig,[0,2.66,0],boomStart.toArray(),.044,metal);
        g.userData.windsurfRig=rig;
        // Anatomia: índex 0 = mà esquerra (més exterior);
        // índex 1 = dreta, que empunya la pistola quan dispara.
        g.userData.windsurfGrips=[.37,.12].map(k=>
          boomStart.clone().lerp(boomEnd,k));
        g.userData.windsurfLay=null;
        rig.rotation.x=-.14;
        rig.rotation.z=.055;
      }
      if(t==='ferry'){
        const hullCol=0x4e6570,deckCol=0x8f9692,edge=0xd7d2bd,cabin=0xe7e3d5;
        box(g,32,2.25,55,hullCol,0,.7,0,'paint');
        box(g,30.4,.3,51.6,deckCol,0,2.12,0,'metal');
        for(const x of[-15.05,15.05])box(g,.28,1.05,51.4,edge,x,2.58,0,'metal');
        // Les rampes articulades pivoteixen al cantell de la coberta.
        g.userData.ferryRamps=[];
        for(const side of [-1,1]){
          const hinge=new THREE.Group();hinge.position.set(0,2.2,side*25.6);
          hinge.rotation.x=side*Math.atan2(2.2-.45,6.2);g.add(hinge);
          box(hinge,13.6,.3,6.2,deckCol,0,-.15,side*3.1,'metal');
          for(const x of[-6.55,6.55])box(hinge,.22,.24,6.0,edge,x,.07,side*3.1,'metal');
          g.userData.ferryRamps.push({hinge,side});
        }
        box(g,3.35,3.7,7.6,cabin,11.5,4.05,1.8,'paint');
        box(g,3.05,1.05,7.1,glass,11.5,4.62,1.8,'glass');
        box(g,3.65,.28,8.05,hullCol,11.5,6.02,1.8,'metal');
        g.userData.damageSmokeOrigin=[11.5,6.35,1.8]; // sobre el sostre de la cabina
        for(const z of[-1.05,1.15,3.35])box(g,.16,1.05,.18,hullCol,9.87,4.62,z,'metal');
        rod(g,[11.5,6.15,3.8],[11.5,9.4,3.8],.11,metal);box(g,1.25,.18,.18,0x30383a,11.5,9.42,3.8,'metal');
        for(const x of[-14.3,14.3])for(const z of[-21,-14,-7,0,7,14,21])round(g,.18,.28,0x252d31,x,1.45,z,'z','rubber');
        for(const z of[-24.5,24.5])for(const x of[-10,-5,0,5,10])box(g,2.2,.08,.28,0xf1e9c5,x,2.32,z,'paint');
        g.userData.ferryDeck=true;
      }
      if(t==='hover'){
        // Variant D «Comandament» validada a hovercraft-proves.html.
        // Font única per a mode individual i cooperatiu (tots dos usen createFactory).
        const hover=createHovercraftConcept(THREE,hovercraftConcepts[3]);
        // El prototip original és més compacte que el collider existent.
        // Ajustam només el dibuix per mantenir la mida de col·lisió i el pilotatge.
        hover.scale.set(1.28,1,1.20);
        g.add(hover);
        // Conservam el contracte antic d'animació del ventilador.
        g.userData.fan=hover.userData.rotors[0];
        g.userData.hovercraftModel='D-model-3';
        g.userData.hovercraftSeats=hover.userData.cockpitSeats;
        g.userData.hovercraftSeatPositions=hover.userData.seatStations.map(p=>new THREE.Vector3(p.x*1.28,p.y,p.z*1.20));
        g.userData.hovercraftSteeringPosition=new THREE.Vector3(hover.userData.steeringStation.x*1.28,hover.userData.steeringStation.y,hover.userData.steeringStation.z*1.20);
        g.userData.hovercraftWindows=hover.userData.windowPanes;
      }
      if(t==='heli'||t==='heli_combat'){
        const combat=t==='heli_combat',bodyCol=combat?0x59634f:0x647768;
        // Huey i Apache natius de Three.js: geometria d'accessors / APG2.
        // No es carrega cap GLB; preservam els dos pivots de rotor i les
        // geometries compartides entre instàncies, SOLO i COOP.
        // La reserva procedural només s'usa si falla la construcció.
        const approvedHuey=!combat?globalThis.HUNTER_HUEY_DUANE?.create?.():null;
        const apacheRuntime=combat?globalThis.HUNTER_APACHE_ARAON:null;
        const approvedApache=apacheRuntime?.create?.()||null;
        const approvedModel=approvedHuey||approvedApache;
        if(approvedModel){
          resources?.retainModel(approvedModel);
          g.add(approvedModel);
          g.userData.rotor=approvedModel.userData.rotor;
          g.userData.tailRotor=approvedModel.userData.tailRotor;
          if(approvedHuey){
            g.userData.hueyModel='duane-100-open-engine-native-110';
            g.userData.cockpitSeatCount=2;
          }else{
            g.userData.apacheModel=approvedApache.userData.apacheModel||'araon-50-engine-native-round-wheels-150';
            g.userData.roundWheelCount=3;
          }
        }else if(!combat){
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
        if(!approvedModel){
          const rotorY=combat?3.22:3.82,mastBaseY=combat?2.94:3.02;
          rod(g,[0,mastBaseY,0],[0,rotorY,0],.14,metal);
          round(g,.3,.2,metal,0,rotorY,0,'y','metal');
          const rotor=new THREE.Group();rotor.position.set(0,rotorY,0);
          for(const a of(combat?[0]:[0,Math.PI/2])){
            const blade=box(rotor,combat?13.5:14.8,.1,.36,rubber,0,0,0,'rubber');
            blade.rotation.y=a;
          }
          g.add(rotor);g.userData.rotor=rotor;
          const tail=new THREE.Group();tail.position.set(.38,3.45,combat?7:7.38);
          box(tail,.1,1.9,.16,rubber,0,0,0,'rubber');
          box(tail,.1,.16,1.9,rubber,0,0,0,'rubber');
          g.add(tail);g.userData.tailRotor=tail;
        }
      }
      if(t==='bici'){
        const crank=new THREE.Group();crank.position.set(0,.75,0);
        // Eix del pedalier: uneix les dues bieles i gira amb els pedals.
        rod(crank,[-.3,0,0],[.3,0,0],.058,metal,'metal');
        for(const side of[-1,1]){
          rod(crank,[side*.3,0,0],[side*.3,0,side*.28],.045,metal);
          box(crank,.26,.08,.18,rubber,side*.4,0,side*.28,'rubber');
        }
        g.add(crank);g.userData.crank=crank;
      }
      if(t==='bici'){
        // Escala visual al 75% de l'original (+50% sobre el model anterior).
        // El grup inclou rodes, manillar i pedalier; la col.lisio i
        // la conduccio continuen regides per les dimensions existents.
        const visual=new THREE.Group();
        for(const child of [...g.children])visual.add(child);
        visual.scale.setScalar(.75);
        g.add(visual);
        for(const w of g.userData.wheels||[])w.userData.radius*=.75*VS.bici;
        g.userData.bicycleVisualScale=.75;
      }
      // La coordenada Y de l'origen no és l'altura dels patins.
      // Les dues barres inferiors estan centrades a y=.48 i tenen radi .075.
      // Guardam el contacte inferior JA escalat per a la física d'aterratge.
      if(t==='heli'||t==='heli_combat'){
        const aircraft=t==='heli_combat'?globalThis.HUNTER_APACHE_ARAON:globalThis.HUNTER_HUEY_DUANE;
        g.userData.skidContactHeight=
          (aircraft?.skidContactHeight??(.48-.075))*VS[t];
        g.userData.rotorContactHeight=
          (aircraft?.rotorContactHeight??((t==='heli_combat'?3.22:3.82)+.05))*VS[t];
      }
      g.traverse(o=>{if(o.isMesh&&!o.userData.waterMask){o.castShadow=shadows;o.receiveShadow=shadows}});
      // Fusionam només malles rígides germanes amb el mateix material.
      // Els pivots animats (rodes, direcció, rems, rotor, vela i torretes),
      // les malles referenciades i les transparències queden intactes.
      // C1A: els 12 radis i els dos jocs de tapaboques/centres de
      // cada roda passen a una malla per material, sense perdre cap radi.
      const batchStats=batching.optimize(THREE,g,{
        batchName:'hunter-vehicle-rigid-batch'
      });
      g.userData.vehicleBatchStats=batchStats;
      if(t==='barca_rems'){
        // A distància el model complex, els dos rems i l'estèncil de
        // la banyera se substitueixen per un únic oval marró.
        const full=[...g.children];
        const far=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),
          material(0x88613b,'organic'));
        far.name='rowboat-far-oval';
        far.scale.set(1.25,.43,2.84);far.position.y=.57;
        far.visible=false;far.castShadow=false;far.receiveShadow=false;
        far.userData.noCastShadow=true;
        g.add(far);
        g.userData.rowboatVisualLod={full,far};
        // Les estadístiques inclouen també la malla nova, sense atribuir
        // cap estalvi de batching a l'oval afegit després de l'agrupació.
        batchStats.before++;batchStats.after++;
      }
      if(t!=='barca_rems'){
        if(distant.attach(g,t)){
          // El proxy queda ocult en qualitat propera però és una malla
          // real. El recompte de batching ha de seguir sent exacte.
          batchStats.before++;batchStats.after++;
        }
      }
      g.scale.setScalar(VS[t]);
      if(resources&&cacheKey){
        resources.retainModel(g);templates.set(cacheKey,g);
        return resources.cloneModel(g);
      }
      return g;
    };
  }
});

