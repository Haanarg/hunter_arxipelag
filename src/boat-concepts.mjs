export function createBoatConcept(THREE,variant=0){
  const g=new THREE.Group();

  // Totes quatre variants parteixen del model 1 (Stealth A).
  // Diferències: tractament de la proa i lleus ajustos del radar compacte heretat del model 3.
  const cfg=[
    {name:'Stealth A1 · Radar compacte',len:8.9,beam:2.75,bow:.20,deckY:1.16,cockZ:.95,cockL:2.5,screenZ:-.65,free:.98,radarZ:2.18,radarH:1.95,radarScale:1.00},
    {name:'Stealth A2 · Proa neta',len:8.9,beam:2.75,bow:.20,deckY:1.16,cockZ:.95,cockL:2.5,screenZ:-.65,free:.98,radarZ:2.12,radarH:1.95,radarScale:.95},
    {name:'Stealth A3 · Proa rasa',len:8.9,beam:2.75,bow:.20,deckY:1.16,cockZ:.95,cockL:2.5,screenZ:-.65,free:.98,radarZ:2.15,radarH:2.00,radarScale:1.00},
    {name:'Stealth A4 · Radar avançat',len:8.9,beam:2.75,bow:.20,deckY:1.16,cockZ:.95,cockL:2.5,screenZ:-.65,free:.98,radarZ:2.05,radarH:2.08,radarScale:1.08}
  ][variant];

  const mat=(c,metal=.03)=>new THREE.MeshStandardMaterial({color:c,roughness:.76,metalness:metal,flatShading:true});
  const hullMat=mat(0x667176,.08),
        darkMat=mat(0x2f383d,.1),
        deckMat=mat(0x717c81,.06),
        glassMat=new THREE.MeshStandardMaterial({color:0x26343c,roughness:.25,metalness:.05,transparent:true,opacity:.82,flatShading:true}),
        trimMat=mat(0x424b50,.12);

  const mesh=(geo,m)=>{const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=true;g.add(o);return o};
  const box=(w,h,d,c,x,y,z,rotX=0)=>{const o=mesh(new THREE.BoxGeometry(w,h,d),c);o.position.set(x,y,z);o.rotation.x=rotX;return o};
  const rod=(a,b,r,c)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),L=d.length(),o=mesh(new THREE.CylinderGeometry(r,r,L,7),c);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o};

  const L=cfg.len,B=cfg.beam,half=L/2;
  const stations=[
    {z:-half,w:cfg.bow,y:.56},
    {z:-half*.78,w:B*.38,y:.46},
    {z:-half*.43,w:B*.78,y:.38},
    {z:.05,w:B*.98,y:.32},
    {z:half*.55,w:B,y:.34},
    {z:half,w:B*.88,y:.44}
  ];

  const verts=[],idx=[];
  const rings=stations.map(s=>[
    [0,-.18,s.z],
    [-s.w*.50,.10,s.z],
    [-s.w*.66,s.y+.20,s.z],
    [-s.w*.50,cfg.free,s.z],
    [ s.w*.50,cfg.free,s.z],
    [ s.w*.66,s.y+.20,s.z],
    [ s.w*.50,.10,s.z]
  ]);
  for(const ring of rings)for(const p of ring)verts.push(...p);
  const N=7;
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<N-1;k++){const a=j*N+k,b=a+N,c=b+1,d=a+1;idx.push(a,b,c,a,c,d)}
  const base=(rings.length-1)*N;for(let k=1;k<N-1;k++)idx.push(base,base+k+1,base+k);

  // Tanquem el pla frontal de la proa, amb normals cap a -Z.
  for(let k=1;k<N-1;k++)idx.push(0,k,k+1);

  // La cara superior dels quads del casc ja fa de coberta, sense duplicats.
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(idx);geo.computeVertexNormals();
  mesh(geo,hullMat);

  // Franja fosca del casc inferior.
  box(B*.93,.25,L*.72,darkMat,0,.06,.35);

  // Proa completament neta: sense cap plataforma o llosa grisa damunt del casc.
  // La forma frontal queda definida només pel casc facetat.

  // Cabina oberta central.
  const cockFront=cfg.screenZ+.18,cockRear=cfg.cockZ+cfg.cockL*.72,cockLen=cockRear-cockFront;
  for(const side of[-1,1]){
    const sideWall=box(.18,.78,cockLen,hullMat,side*(B*.43),1.38,(cockFront+cockRear)/2);
    sideWall.rotation.z=side*.06;
  }
  box(B*.86,.74,.18,hullMat,0,1.38,cockRear);

  // Parabrisa frontal inclinat, tres panells.
  for(const x of[-.72,0,.72]){
    const w=x===0?B*.34:B*.25;
    const scr=box(w,.64,.10,glassMat,x*(B*.43),1.74,cfg.screenZ,-.48);
    scr.rotation.z=x===0?0:(x<0?-.10:.10);
  }
  box(B*.88,.14,.16,trimMat,0,1.45,cfg.screenZ+.12,-.48);

  // Coberta posterior.
  const aftStart=cockRear+.14,aftLen=half-aftStart-.10;
  if(aftLen>.4)box(B*.84,.15,aftLen,deckMat,0,cfg.deckY+.02,aftStart+aftLen/2);

  // Bancs.
  for(const z of[cfg.cockZ-.15,cfg.cockZ+.65])box(B*.56,.14,.48,mat(0x3a4245,.02),0,1.08,z);

  // Radar del model 3: més compacte, amb bloc sensor baix i radom curt.
  const mz=cfg.radarZ,mh=cfg.radarH,rs=cfg.radarScale;
  rod([0,1.15,mz],[0,1.15+mh,mz],.085*rs,trimMat);
  box(.34*rs,.30*rs,.38*rs,trimMat,0,2.02,mz-.03,-.12);
  box(.28*rs,.42*rs,.30*rs,trimMat,0,2.36,mz);
  const dome=mesh(new THREE.SphereGeometry(.29*rs,12,6,0,Math.PI*2,0,Math.PI/2),mat(0xc5c9c6,.06));
  dome.scale.y=.40;dome.position.set(0,1.15+mh+.01,mz);
  box(.54*rs,.08,.54*rs,trimMat,0,1.15+mh-.03,mz);

  // Proa neta: només es conserven les baranes fines laterals.
  for(const x of[-B*.31,B*.31])rod([x,cfg.free+.10,-half*.22],[x,cfg.free+.10,-half*.50],.025,trimMat);

  // Petites diferències entre iteracions, sempre mantenint la base del model 1.
  if(variant===0){
    box(.42,.12,.62,trimMat,0,1.18,cockRear-.14);
  }else if(variant===1){
    box(.34,.10,.52,trimMat,0,1.17,cockRear-.12);
  }else if(variant===2){
    box(.28,.08,.44,trimMat,0,1.16,cockRear-.10);
  }else if(variant===3){
    for(const side of[-1,1])box(.20,.18,.92,trimMat,side*(B*.41),1.34,cfg.cockZ+.38);
    box(.38,.12,.56,trimMat,0,1.18,cockRear-.12);
  }

  g.userData.name=cfg.name;
  g.userData.variant=variant;
  return g;
}
