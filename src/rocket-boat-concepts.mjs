export function createRocketBoatConcept(THREE,variant=0){
  const g=new THREE.Group();

  // Mateixa base geomètrica que la llanxa normal actual del joc.
  // Només substituïm el radar posterior per un llançacoets multitub.
  const cfg=[
    {name:'SeaBaby C1 · Reculat',cols:4,rows:3,tubeR:.112,rackLen:2.52,elev:.58,baseZ:2.62,baseY:1.30,packBack:.34,frame:'open'},
    {name:'SeaBaby C2 · Reculat baix',cols:4,rows:3,tubeR:.112,rackLen:2.46,elev:.50,baseZ:2.72,baseY:1.30,packBack:.42,frame:'low'},
    {name:'SeaBaby C3 · Reculat elevat',cols:4,rows:3,tubeR:.108,rackLen:2.56,elev:.70,baseZ:2.58,baseY:1.30,packBack:.30,frame:'high'},
    {name:'SeaBaby C4 · Reculat llarg',cols:4,rows:3,tubeR:.104,rackLen:2.82,elev:.62,baseZ:2.66,baseY:1.30,packBack:.38,frame:'long'}
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

  // Tanquem el pla frontal de la proa, amb normals cap a -Z.
  for(let k=1;k<N-1;k++)idx.push(0,k,k+1);

  // La cara superior dels quads del casc ja fa de coberta, sense duplicats.
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

  // Feix inclinable desplaçat cap a popa (+Z), basat en l'antic model 3.
  // El paquet no té cap bloc massís: són 12 cilindres 3×4 pràcticament enganxats.
  const rack=new THREE.Group();rack.position.set(0,pivotY,cfg.packBack);rack.rotation.x=cfg.elev;pedestal.add(rack);
  const pitch=cfg.tubeR*2.04,packW=pitch*(cfg.cols-1)+cfg.tubeR*2,packH=pitch*(cfg.rows-1)+cfg.tubeR*2,
        tubeCenterZ=-cfg.rackLen*.38;

  for(let row=0;row<cfg.rows;row++)for(let col=0;col<cfg.cols;col++){
    const x=(col-(cfg.cols-1)/2)*pitch,
          y=(row-(cfg.rows-1)/2)*pitch,
          z=tubeCenterZ;
    const tube=mesh(new THREE.CylinderGeometry(cfg.tubeR,cfg.tubeR,cfg.rackLen,12),tubeMat,rack);
    tube.rotation.x=Math.PI/2;tube.position.set(x,y,z);

    // Anells mínims: marquen les boques però no converteixen el feix en una caixa.
    const lip=mesh(new THREE.CylinderGeometry(cfg.tubeR*1.08,cfg.tubeR*1.08,.065,12),tubeLipMat,rack);
    lip.rotation.x=Math.PI/2;lip.position.set(x,y,z-cfg.rackLen*.50);
    const rear=mesh(new THREE.CylinderGeometry(cfg.tubeR*1.04,cfg.tubeR*1.04,.045,12),trimMat,rack);
    rear.rotation.x=Math.PI/2;rear.position.set(x,y,z+cfg.rackLen*.50);
  }

  // Dos travessers molt fins mantenen units els 12 tubs sense tapar-ne la lectura.
  for(const z of[tubeCenterZ-cfg.rackLen*.22,tubeCenterZ+cfg.rackLen*.22]){
    box(packW+.10,.055,.075,trimMat,0,-packH*.53,z,rack);
    box(packW+.10,.055,.075,trimMat,0, packH*.53,z,rack);
  }
  for(const side of[-1,1])box(.055,packH+.10,.075,trimMat,side*packW*.53,0,tubeCenterZ+.02,rack);

  // Estructura triangular de suport a la coberta.
  for(const side of[-1,1]){
    rod([side*.50,.28,.24],[side*.67,1.03,-.16],.043,trimMat,pedestal);
    rod([side*.67,1.03,-.16],[side*.67,.30,-.72],.043,trimMat,pedestal);
    rod([side*.67,.30,-.72],[side*.50,.28,.24],.043,trimMat,pedestal);
  }
  rod([-.52,.28,.08],[.52,.28,.08],.046,trimMat,pedestal);

  if(cfg.frame==='low'){
    // Paquet més baix i més enrere, amb base molt discreta.
    box(1.02,.16,.68,deckMat,0,.27,.10,pedestal);
    for(const side of[-1,1])rod([side*.46,.28,.20],[side*.60,.78,-.42],.038,trimMat,pedestal);
  }else if(cfg.frame==='high'){
    // Paquet més elevat, amb braços verticals una mica més llargs.
    for(const side of[-1,1]){
      rod([side*.50,.30,.26],[side*.70,1.22,-.25],.047,trimMat,pedestal);
      rod([side*.70,1.22,-.25],[side*.66,.34,-.80],.043,trimMat,pedestal);
    }
  }else if(cfg.frame==='long'){
    // Tubs lleugerament més llargs, bastidor posterior reforçat.
    for(const side of[-1,1]){
      rod([side*.52,.30,.32],[side*.72,1.08,-.25],.047,trimMat,pedestal);
      rod([side*.52,.30,.32],[side*.70,.32,-.92],.047,trimMat,pedestal);
    }
  }else{
    // Variant base: suport obert i lleuger, el més proper al model 3 original.
    for(const side of[-1,1])rod([side*.48,.28,.24],[side*.62,.90,-.56],.038,trimMat,pedestal);
  }

  // Sensor baix separat: conserva lectura militar sense recuperar el radar gran.
  const sensor=box(.30,.38,.30,trimMat,-.82,1.42,3.40);
  sensor.rotation.z=.04;
  box(.22,.12,.22,tubeMat,-.82,1.67,3.40);

  g.userData.name=cfg.name;
  g.userData.variant=variant;
  return g;
}
