// Hunter: Arxipèlag · candidats ORIGINALS low-poly per al laboratori.
// Orientació compartida amb el joc: morro cap a -Z, simetria X=0.
// No es publiquen al joc fins que s'aprovi un candidat al laboratori.
export const REFERENCE_CANDIDATE_VERSION='20261112-t90m-tigr-v1';

export function createReferenceVehicle(THREE,type){
 if(type!=='t90m-v1'&&type!=='tigr-v1')throw new Error('Candidat desconegut: '+type);
 const root=new THREE.Group();root.name=type==='t90m-v1'?'T-90M · candidat 1 · geometria pròpia':'GAZ Tigr-M · candidat 1 · geometria pròpia';
 root.userData.referenceCandidate=type;
 const mats=new Map();
 const mat=(color,profile='armor')=>{
  const key=color+':'+profile;
  if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({
   color,flatShading:true,roughness:profile==='glass'?.26:profile==='metal'?.48:.88,
   metalness:profile==='metal'?.42:.05,side:THREE.DoubleSide,
   transparent:profile==='glass',opacity:profile==='glass'?.86:1,depthWrite:profile!=='glass'
  }));
  return mats.get(key);
 };
 const mesh=(group,geometry,color,name,profile='armor')=>{
  const m=new THREE.Mesh(geometry,mat(color,profile));m.name=name;
  m.castShadow=m.receiveShadow=true;group.add(m);return m;
 };
 const block=(g,name,w,h,l,x,y,z,c,profile)=>{
  const m=mesh(g,new THREE.BoxGeometry(w,h,l),c,name,profile);m.position.set(x,y,z);return m;
 };
 const cylinder=(g,name,r,depth,x,y,z,c,axis='x',segments=12)=>{
  const m=mesh(g,new THREE.CylinderGeometry(r,r,depth,segments),c,name,'metal');
  if(axis==='x')m.rotation.z=Math.PI/2;
  else if(axis==='z')m.rotation.x=Math.PI/2;
  m.position.set(x,y,z);return m;
 };
 const line=(g,name,a,b,r,c,segments=8)=>{
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);
  const m=mesh(g,new THREE.CylinderGeometry(r,r,v.length(),segments),c,name,'metal');
  m.position.copy(p).add(q).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
  return m;
 };
 const quad=(g,name,points,color,profile='armor')=>{
  const [a,b,c,d]=points,positions=[...a,...b,...c,...a,...c,...d];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.computeVertexNormals();return mesh(g,geo,color,name,profile);
 };
 // Seccions transversals de 6 punts, morro = -Z; superfícies tancades.
 const armoredLoft=(g,name,sections,color)=>{
  const vertices=[],indices=[];
  for(const s of sections){
   const {z,w,bot,shoulder,roof}=s;
   for(const p of [[-w*.82,bot,z],[w*.82,bot,z],[w,shoulder,z],
                   [w*.83,roof,z],[-w*.83,roof,z],[-w,shoulder,z]])vertices.push(...p);
  }
  for(let j=0;j<sections.length-1;j++)for(let k=0;k<6;k++){
   const a=j*6+k,b=j*6+(k+1)%6,c=(j+1)*6+(k+1)%6,d=(j+1)*6+k;
   indices.push(a,b,d,b,c,d);
  }
  for(let k=1;k<5;k++){indices.push(0,k+1,k);const end=(sections.length-1)*6;indices.push(end,end+k,end+k+1)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);
  geo.computeVertexNormals();return mesh(g,geo,color,name);
 };
 const T={armor:0x67725b,top:0x788365,shadow:0x48543f,plate:0x899272,
          dark:0x242925,metal:0x48534b,rim:0x727a70,glass:0x293b3d,light:0xd3ceb1,red:0xa35d47};

 if(type==='t90m-v1'){
  const chassis=new THREE.Group();chassis.name='Casc inferior T-90M';root.add(chassis);
  // 6 rodes de carretera per banda, ample de cadenes i carrosseria baixa.
  armoredLoft(chassis,'Casc facetat i glacis inclinat',[
   {z:-3.30,w:1.35,bot:.67,shoulder:1.15,roof:1.47},
   {z:-2.68,w:1.79,bot:.53,shoulder:1.43,roof:1.92},
   {z:-1.42,w:1.86,bot:.56,shoulder:1.55,roof:2.01},
   {z:1.84,w:1.82,bot:.61,shoulder:1.60,roof:2.01},
   {z:3.12,w:1.72,bot:.67,shoulder:1.54,roof:1.83}
  ],T.armor);
  block(chassis,'Graella motor posterior',2.75,.05,1.04,0,2.025,2.26,T.metal);
  for(const side of [-1,1]){
   const track=new THREE.Group();track.name='Tren de rodatge '+(side<0?'esquerre':'dret');chassis.add(track);
   const x=side*2.02;
   block(track,'Nervi central de la cadena',.73,.99,5.83,x,.76,.03,T.dark);
   for(const z of [-2.68,2.7])cylinder(track,'Roda tensora / motriu',.68,.76,x,.78,z,T.dark);
   for(let i=0;i<6;i++){
    const z=-2.36+i*.94;
    cylinder(track,'Roda de carretera '+(i+1),.52,.12,x+side*.42,.68,z,T.metal);
    cylinder(track,'Banda interior de roda '+(i+1),.40,.132,x+side*.51,.68,z,T.dark);
    cylinder(track,'Boixa de roda '+(i+1),.12,.14,x+side*.59,.68,z,T.rim);
   }
   for(let i=0;i<18;i++){
    const z=-2.89+i*.34;
    block(track,'Sabata superior cadena '+(i+1),.94,.11,.28,x,1.425,z,T.metal);
    block(track,'Sabata inferior cadena '+(i+1),.94,.10,.28,x,.10,z,T.metal);
   }
   block(chassis,'Faldó lateral blindat',.17,.75,5.78,side*2.17,1.83,.09,T.armor);
   for(let i=0;i<5;i++){
    const z=-2.12+i*1.02;
    block(chassis,'Mòdul blindatge lateral '+(i+1),.14,.39,.92,side*2.278,1.96,z,T.plate);
   }
   block(chassis,'Protecció glacis lateral',.44,.29,.76,side*1.45,1.57,-2.78,T.plate);
   cylinder(chassis,'Far encastat',.12,.12,side*1.42,1.61,-3.265,T.light,'z',10);
   line(chassis,'Cable d’arrossegament',[side*1.39,2.09,-2.29],[side*1.48,2.1,2.50],.035,T.dark);
  }
  const turret=new THREE.Group();turret.name='Torreta giratòria T-90M';turret.position.set(0,0,-.18);root.add(turret);
  armoredLoft(turret,'Torreta soldada angular amb bustle',[
   {z:-1.69,w:.91,bot:1.97,shoulder:2.42,roof:2.69},
   {z:-1.21,w:1.40,bot:2.04,shoulder:2.68,roof:2.91},
   {z:-.20,w:1.62,bot:2.04,shoulder:2.83,roof:3.05},
   {z:1.31,w:1.45,bot:2.01,shoulder:2.81,roof:3.02},
   {z:1.81,w:1.23,bot:2.04,shoulder:2.66,roof:2.88}
  ],T.armor);
  block(turret,'Bustle posterior',2.75,.52,.48,0,2.54,1.77,T.shadow);
  for(const side of [-1,1]){
   for(let i=0;i<3;i++){
    block(turret,'Blocs Relikt frontals '+(i+1),.62,.30,.45,side*(.44+i*.31),2.50,-1.45+i*.25,T.plate);
   }
   for(let i=0;i<3;i++){
    block(turret,'Protecció lateral torreta '+(i+1),.14,.36,.48,side*1.54,2.66,-.48+i*.62,T.plate);
   }
   for(let i=0;i<4;i++){
    line(turret,'Reixa de bustle posterior',[side*1.33,2.21,.62+i*.29],[side*1.44,2.62,.62+i*.29],.025,T.dark);
   }
   cylinder(turret,'Fumígen esquerra/dreta',.10,.38,side*1.30,2.95,-.73,T.dark,'z',8);
  }
  cylinder(turret,'Escotilla comandant',.39,.10,.67,3.10,.69,T.dark,'y');
  cylinder(turret,'Escotilla artiller',.31,.10,-.65,3.09,.54,T.dark,'y');
  block(turret,'Sensor panoràmic',.26,.48,.30,.78,3.37,-.18,T.dark);
  const machine=new THREE.Group();machine.name='Mòdul remot superior';machine.position.set(-.54,3.16,.48);turret.add(machine);
  block(machine,'Carcassa metralladora',.38,.24,.54,0,.10,0,T.dark);
  line(machine,'Canó metralladora',[0,.1,-.18],[0,.10,-1.08],.049,T.dark);
  const gun=new THREE.Group();gun.name='Canó principal 125 mm';gun.position.set(0,2.48,-1.42);turret.add(gun);
  block(gun,'Mantelet',.80,.56,.60,0,0,-.08,T.shadow);
  line(gun,'Tub llarg',[0,0,-.18],[0,0,-4.45],.125,T.metal,12);
  cylinder(gun,'Evacuador de fum',.218,.72,0,0,-2.04,T.shadow,'z',12);
  cylinder(gun,'Anell de boca',.155,.27,0,0,-4.43,T.dark,'z',12);
  root.userData.candidateParts={hull:'Casc inferior T-90M',turret:turret.name,gun:gun.name,wheelsPerSide:6};
 }else{
  const body=new THREE.Group();body.name='Carrosseria GAZ Tigr-M';root.add(body);
  // Tigr-M de patrulla: capó curt, habitacle blindat, popa alta i quatre portes.
  armoredLoft(body,'Xassís 4x4 i quilla',[
   {z:-3.48,w:1.49,bot:1.05,shoulder:1.45,roof:1.91},
   {z:-2.72,w:1.71,bot:1.03,shoulder:1.55,roof:2.04},
   {z:-1.37,w:1.75,bot:1.02,shoulder:1.62,roof:1.97},
   {z:2.96,w:1.78,bot:.96,shoulder:1.64,roof:1.94},
   {z:3.48,w:1.67,bot:1.02,shoulder:1.69,roof:1.91}
  ],T.armor);
  block(body,'Xassís de bigues',2.70,.28,6.65,0,1.07,0,T.dark);
  // Cabina alta i caixa posterior contínua (no un pickup).
  armoredLoft(body,'Cabina blindada i sostre',[
   {z:-1.50,w:1.55,bot:1.80,shoulder:2.28,roof:2.73},
   {z:-1.12,w:1.66,bot:1.78,shoulder:2.43,roof:3.05},
   {z:2.96,w:1.68,bot:1.76,shoulder:2.53,roof:3.08},
   {z:3.45,w:1.54,bot:1.72,shoulder:2.43,roof:3.04}
  ],T.armor);
  block(body,'Capó trapezoïdal',3.14,.22,1.76,0,2.04,-2.46,T.top);
  block(body,'Relleu central capó',1.33,.10,1.14,0,2.20,-2.57,T.plate);
  block(body,'Graella frontal',2.35,.44,.09,0,1.70,-3.515,T.dark);
  for(let i=-3;i<=3;i++)block(body,'Làmina de graella',.085,.35,.10,i*.31,1.70,-3.58,T.rim,'metal');
  block(body,'Para-xocs frontal',3.54,.19,.27,0,1.16,-3.65,T.dark);
  for(const side of [-1,1]){
   const x=side*1.93;
   const wheelGroup=new THREE.Group();wheelGroup.name='Rodes '+(side<0?'esquerres':'dretes');body.add(wheelGroup);
   for(const [i,z] of [-2.38,2.23].entries()){
    cylinder(wheelGroup,'Pneumàtic tot terreny '+(i?'posterior':'davanter'),.71,.47,x,.72,z,T.dark);
    cylinder(wheelGroup,'Llanta ',.44,.49,x+side*.045,.72,z,T.rim);
    cylinder(wheelGroup,'Boixa',.17,.51,x+side*.05,.72,z,T.metal);
    for(let k=0;k<8;k++){
     const theta=k*Math.PI/4;
     const a=[x+side*.29,.72+Math.sin(theta)*.44,z+Math.cos(theta)*.44];
     const b=[x+side*.29,.72+Math.sin(theta+.20)*.43,z+Math.cos(theta+.20)*.43];
     line(wheelGroup,'Tac de goma',a,b,.052,T.dark,6);
    }
    block(body,'Aleta pas roda '+(i?'darrera':'davant'),.35,.18,1.67,side*1.78,1.43,z,T.shadow);
   }
   for(const [i,z] of [-.62,1.28].entries()){
    block(body,'Porta lateral '+(i?'posterior':'davantera'),.105,.91,1.63,side*1.76,1.98,z,T.top);
    block(body,'Junta porta',.13,1.03,.036,side*1.823,1.98,z+.82,T.dark);
    block(body,'Pany i maneta',.07,.08,.29,side*1.84,1.99,z-.33,T.dark);
    // Les finestres són trapezis, al ras del panell i amb marcs angulars.
    const z0=z-.66,z1=z+.67;
    quad(body,'Vidre lateral '+(i?'posterior':'davanter'),[
     [side*1.844,2.49,z0],[side*1.844,2.49,z1],
     [side*1.68,2.94,z1-.12],[side*1.68,2.94,z0+.12]
    ],T.glass,'glass');
   }
   block(body,'Esglaó lateral',.35,.10,3.52,side*1.85,1.09,.20,T.dark);
   block(body,'Retrovisor',.24,.41,.33,side*2.15,2.33,-1.37,T.dark);
   line(body,'Suport retrovisor',[side*1.65,2.32,-1.34],[side*2.15,2.32,-1.37],.048,T.metal);
   cylinder(body,'Far principal rodó',.235,.10,side*1.24,1.80,-3.54,T.light,'z');
   cylinder(body,'Bisel del far',.27,.08,side*1.24,1.80,-3.48,T.dark,'z');
   block(body,'Intermitent davant',.20,.10,.05,side*1.55,1.96,-3.48,T.red);
   block(body,'Pilot posterior',.23,.34,.09,side*1.48,1.42,3.51,T.red);
   line(body,'Baca lateral',[side*1.40,3.13,-.95],[side*1.40,3.13,2.75],.045,T.dark);
  }
  // Parabrisa dividit per l'eix, pla inclinat i amb junta central.
  for(const side of [-1,1]){
   quad(body,'Parabrisa partit '+(side<0?'esquerre':'dret'),[
    [side*.10,2.38,-1.548],[side*1.55,2.38,-1.548],
    [side*1.48,2.94,-1.13],[side*.10,2.94,-1.13]
   ],T.glass,'glass');
  }
  line(body,'Muntant central parabrisa',[0,2.36,-1.55],[0,2.99,-1.10],.035,T.dark);
  block(body,'Portes posteriors dobles',3.00,1.31,.095,0,2.08,3.50,T.top);
  block(body,'Separació portes posterior',.06,1.27,.11,0,2.08,3.57,T.dark);
  for(const side of [-1,1]){
   block(body,'Finestreta porta posterior',.95,.43,.12,side*.76,2.60,3.57,T.glass,'glass');
   block(body,'Maneta posterior',.25,.07,.13,side*.18,1.89,3.61,T.dark);
  }
  cylinder(body,'Escotilla circular sostre',.54,.09,0,3.14,.55,T.dark,'y');
  cylinder(body,'Tapadora escotilla',.43,.07,0,3.20,.55,T.top,'y');
  block(body,'Suport de sostre',2.60,.13,.15,0,3.17,2.48,T.dark);
  line(body,'Antena',[1.15,3.10,2.50],[1.30,4.08,2.61],.022,T.dark);
  root.userData.candidateParts={body:body.name,wheels:4,doors:4,front:-1};
 }
 root.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.position){
  const positions=o.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
   if(!Number.isFinite(positions.getX(i))||!Number.isFinite(positions.getY(i))||!Number.isFinite(positions.getZ(i)))
    throw new Error('Malla invàlida: '+o.name);
  }
 }});
 return root;
}
