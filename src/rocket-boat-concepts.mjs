export function createRocketBoatConcept(THREE,variant=0){
  const g=new THREE.Group();

  // Mateixa base geomètrica que la llanxa normal actual del joc.
  // Només substituïm el radar posterior per un llançacoets multitub.
  const cfg=[
    {name:'SeaBaby A · 12 tubs',cols:6,rows:2,tubeR:.095,rackLen:2.95,rackW:1.48,rackH:.58,elev:.68,baseZ:2.18,baseY:1.30,frame:'truss'},
    {name:'SeaBaby B · 16 tubs',cols:8,rows:2,tubeR:.088,rackLen:3.25,rackW:1.70,rackH:.58,elev:.76,baseZ:2.12,baseY:1.30,frame:'long'},
    {name:'SeaBaby C · 12 tubs compacta',cols:4,rows:3,tubeR:.10,rackLen:2.55,rackW:1.42,rackH:.76,elev:.62,baseZ:2.35,baseY:1.30,frame:'compact'},
    {name:'SeaBaby D · 18 tubs pesada',cols:6,rows:3,tubeR:.09,rackLen:3.10,rackW:1.62,rackH:.76,elev:.82,baseZ:2.05,baseY:1.30,frame:'heavy'}
  ][variant]||null;
  if(!cfg)throw new Error('Variant de llanxa llançacoets no vàlida');

  const mat=(c,metal=.03,rough=.76)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal,flatShading:true});
  const hullMat=mat(0x667176,.08),darkMat=mat(0x2f383d,.10),deckMat=mat(0x717c81,.06),
        glassMat=new THREE.MeshStandardMaterial({color:0x26343c,roughness:.25,metalness:.05,transparent:true,opacity:.82,flatShading:true}),
        trimMat=mat(0x424b50,.12),tubeMat=mat(0x20262a,.15,.63),tubeLipMat=mat(0x725447,.10,.68),seatMat=mat(0x3a4245,.02);

  const mesh=(geo,m,parent=g)=>{const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=true;parent.add(o);return o};
  const box=(w,h,d,m,x,y,z,parent=g)=>{const o=mesh(new THREE.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o};
  const rod=(a,b,r,m,parent=g)=>{
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),L=d.length(),
          o=mesh(new THREE.CylinderGeometry(r,r,L,7),m,parent);
    o.position.copy(A).add(B).multiplyScalar(.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
    return o
  };

  const L=8.9,B=2.75,half=L/2,free=.98,screenZ=-.65,cockZ=.95,cockL=2.5;
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
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<N-1;k++){
    const a=j*N+k,b=a+N,c=b+1,d=a+1;idx.push(a,b,c,a,c,d)
  }
  const transom=(rings.length-1)*N;
  for(let k=1;k<N-1;k++)idx.push(transom,transom+k+1,transom+k);
  const hullGeo=new THREE.BufferGeometry();
  hullGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  hullGeo.setIndex(idx);hullGeo.computeVertexNormals();
  mesh(hullGeo,hullMat);

  // Franja inferior fosca, sense plataforma sobre la proa.
  box(B*.93,.25,L*.72,darkMat,0,.06,.35);

  // Cabina oberta central.
  const cockFront=screenZ+.18,cockRear=cockZ+cockL*.72,cockLen=cockRear-cockFront;
  for(const side of[-1,1]){
    const wall=box(.18,.78,cockLen,hullMat,side*(B*.43),1.38,(cockFront+cockRear)/2);
    wall.rotation.z=side*.06;
  }
  box(B*.86,.74,.18,hullMat,0,1.38,cockRear);

  // Parabrisa de tres panells.
  for(const x of[-.72,0,.72]){
    const w=x===0?B*.34:B*.25,scr=box(w,.64,.10,glassMat,x*(B*.43),1.74,screenZ);
    scr.rotation.x=-.48;scr.rotation.z=x===0?0:(x<0?-.10:.10);
  }
  {const b=box(B*.88,.14,.16,trimMat,0,1.45,screenZ+.12);b.rotation.x=-.48}

  // Coberta posterior i bancs de la llanxa normal.
  const aftStart=cockRear+.14,aftLen=half-aftStart-.10;
  if(aftLen>.4)box(B*.84,.15,aftLen,deckMat,0,1.18,aftStart+aftLen/2);
  for(const z of[cockZ-.15,cockZ+.65])box(B*.56,.14,.48,seatMat,0,1.08,z);
  for(const x of[-B*.31,B*.31])rod([x,free+.10,-half*.22],[x,free+.10,-half*.50],.025,trimMat);

  // Base giratòria baixa del llançador.
  const pedestal=new THREE.Group();pedestal.position.set(0,cfg.baseY,cfg.baseZ);g.add(pedestal);
  const baseDisc=mesh(new THREE.CylinderGeometry(.62,.72,.18,12),trimMat,pedestal);baseDisc.position.y=.02;
  const cradle=box(.92,.24,.72,trimMat,0,.22,0,pedestal);
  const pivotY=.55;

  // Bastidor inclinable: apunta cap a proa (-Z) i amunt.
  const rack=new THREE.Group();rack.position.set(0,pivotY,-.04);rack.rotation.x=cfg.elev;pedestal.add(rack);
  box(cfg.rackW+.18,cfg.rackH+.16,cfg.rackLen+.16,trimMat,0,0,-cfg.rackLen*.38,rack);
  box(cfg.rackW,cfg.rackH,cfg.rackLen,tubeMat,0,0,-cfg.rackLen*.38,rack);

  // Tubs reals visibles al frontal i a la part posterior del paquet.
  const usableW=cfg.rackW*.78,usableH=cfg.rackH*.72;
  for(let row=0;row<cfg.rows;row++)for(let col=0;col<cfg.cols;col++){
    const x=cfg.cols===1?0:-usableW/2+usableW*col/(cfg.cols-1),
          y=cfg.rows===1?0:-usableH/2+usableH*row/(cfg.rows-1),
          z=-cfg.rackLen*.38;
    const tube=mesh(new THREE.CylinderGeometry(cfg.tubeR,cfg.tubeR,cfg.rackLen*.94,10),tubeMat,rack);
    tube.rotation.x=Math.PI/2;tube.position.set(x,y,z);
    const lip=mesh(new THREE.CylinderGeometry(cfg.tubeR*1.16,cfg.tubeR*1.16,.075,10),tubeLipMat,rack);
    lip.rotation.x=Math.PI/2;lip.position.set(x,y,z-cfg.rackLen*.49);
    const rear=mesh(new THREE.CylinderGeometry(cfg.tubeR*1.08,cfg.tubeR*1.08,.055,10),trimMat,rack);
    rear.rotation.x=Math.PI/2;rear.position.set(x,y,z+cfg.rackLen*.49);
  }

  // Travessers laterals i estructura triangulada inspirada en la referència.
  for(const side of[-1,1]){
    const sx=side*(cfg.rackW*.58);
    box(.065,cfg.rackH+.32,cfg.rackLen+.12,trimMat,sx,0,-cfg.rackLen*.38,rack);
    rod([side*.52,.28,.20],[side*.72,1.17,-.28],.045,trimMat,pedestal);
    rod([side*.72,1.17,-.28],[side*.72,.32,-.82],.045,trimMat,pedestal);
    rod([side*.72,.32,-.82],[side*.52,.28,.20],.045,trimMat,pedestal);
  }
  rod([-.55,.28,.05],[.55,.28,.05],.05,trimMat,pedestal);

  if(cfg.frame==='long'){
    // Variant B: suport posterior més llarg i reforçat.
    for(const side of[-1,1]){
      rod([side*.58,.28,.34],[side*.78,1.30,-.42],.05,trimMat,pedestal);
      rod([side*.58,.28,.34],[side*.74,.34,-1.02],.05,trimMat,pedestal);
    }
  }else if(cfg.frame==='compact'){
    // Variant C: carenat compacte sobre la base.
    box(1.22,.26,.92,deckMat,0,.32,.06,pedestal);
  }else if(cfg.frame==='heavy'){
    // Variant D: doble bastidor i caixa de mecanisme més robusta.
    box(1.34,.34,.84,trimMat,0,.30,.08,pedestal);
    for(const side of[-1,1])rod([side*.60,.36,.24],[side*.82,1.34,-.38],.06,trimMat,pedestal);
  }else{
    // Variant A: entramat lleuger similar al de la fotografia.
    for(const side of[-1,1])rod([side*.54,.30,.28],[side*.70,.95,-.70],.04,trimMat,pedestal);
  }

  // Sensor baix separat: conserva lectura militar sense recuperar el radar gran.
  const sensor=box(.30,.38,.30,trimMat,-.82,1.42,3.40);
  sensor.rotation.z=.04;
  box(.22,.12,.22,tubeMat,-.82,1.67,3.40);

  g.userData.name=cfg.name;
  g.userData.variant=variant;
  return g;
}
