// Hunter: Arxipèlag · candidats ORIGINALS low-poly per al laboratori.
// Orientació compartida amb el joc: morro cap a -Z, simetria X=0.
// No es publiquen al joc fins que s'aprovi un candidat al laboratori.
export const REFERENCE_CANDIDATE_VERSION='20261113-t90m-animated-150-tigr-interior-v3';

export function createReferenceVehicle(THREE,type){
 if(type!=='t90m-v1'&&type!=='tigr-v1')throw new Error('Candidat desconegut: '+type);
 const root=new THREE.Group();root.name=type==='t90m-v1'?'T-90M · model propi · escala 150 %':'GAZ Tigr-M · candidat 3 · interior visible';
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

 // Extrusió d'un perfil longitudinal: coordenades del perfil = (Z,Y).
 const profile=(g,name,points,width,x,color,hole)=>{
  const shape=new THREE.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();
  if(hole)for(const loop of (Array.isArray(hole[0][0])?hole:[hole])){const path=new THREE.Path();loop.forEach(([z,y],i)=>i?path.lineTo(z,y):path.moveTo(z,y));path.closePath();shape.holes.push(path)}
  const geo=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false,steps:1});
  geo.rotateY(-Math.PI/2);geo.translate(x+width/2,0,0);
  return mesh(g,type==='tigr-v1'?new THREE.BufferGeometry().copy(geo):geo,color,name);
 };
 if(type==='t90m-v1'){
  const chassis=new THREE.Group();chassis.name='Casc inferior T-90M';root.add(chassis);
  armoredLoft(chassis,'Casc facetat i glacis inclinat',[
   {z:-3.45,w:1.43,bot:.58,shoulder:.94,roof:1.04},
   {z:-2.18,w:1.62,bot:.48,shoulder:1.22,roof:1.53},
   {z:1.80,w:1.62,bot:.48,shoulder:1.27,roof:1.53},
   {z:3.30,w:1.55,bot:.63,shoulder:1.26,roof:1.49}
  ],T.armor);
  block(chassis,'Graella motor posterior',2.35,.035,1.18,0,1.55,2.48,T.dark);
  for(let i=0;i<10;i++)block(chassis,'Lama motor',2.29,.035,.038,0,1.578,1.98+i*.105,T.metal);
  cylinder(chassis,'Escotilla conductor',.29,.055,0,1.57,-1.96,T.top,'y');
  // Cinturó buit: les rodes queden dins la cadena, no sobre un bloc massís.
  const capsule=r=>{const p=[];for(let i=0;i<=10;i++){const t=-Math.PI/2+i*Math.PI/10;p.push([2.65+Math.cos(t)*r,.75+Math.sin(t)*r])}for(let i=0;i<=10;i++){const t=Math.PI/2+i*Math.PI/10;p.push([-2.65+Math.cos(t)*r,.75+Math.sin(t)*r])}return p};
  for(const side of [-1,1]){
   const x=side*1.52;
   profile(chassis,'Cadena contínua buida',capsule(.65),.59,x,T.dark,capsule(.55).reverse());
   for(let i=0;i<6;i++){
    const z=-2.30+i*.92;
    const pivot=new THREE.Group();pivot.name='Pivot rodatge '+(i+1);
    pivot.position.set(x,.58,z);pivot.userData.t90RoadWheel={side,radius:.43};
    chassis.add(pivot);
    cylinder(pivot,'Roda de carretera '+(i+1),.43,.50,0,0,0,T.dark);
    cylinder(pivot,'Disc de roda '+(i+1),.35,.035,side*.26,0,0,T.armor);
    cylinder(pivot,'Boixa de roda '+(i+1),.105,.06,side*.29,0,0,T.shadow);
   }
   for(const z of [-2.84,2.84])cylinder(chassis,'Roda tensora / motriu',.43,.50,x,.80,z,T.metal);
   // Sabates independents repartides per arc de longitud, com l'animador
   // del tanc del joc. Cada costat es pot moure en sentit oposat al girar.
   const front=-2.65,rear=2.65,cy=.75,r=.66,straight=rear-front;
   const perimeter=2*straight+2*Math.PI*r;
   const belt=new THREE.Group();
   belt.name=side<0?'Eruga mòbil esquerra':'Eruga mòbil dreta';
   belt.userData.t90Belt={side,x,front,rear,cy,r,straight,perimeter};
   chassis.add(belt);
   const count=Math.round(perimeter/.24);
   for(let i=0;i<count;i++){
    const shoe=block(belt,'Sabata mòbil '+(i+1),.63,.055,.18,x,cy+r,front,T.metal);
    shoe.userData.trackOffset=i*perimeter/count;
   }
   for(let i=0;i<6;i++){
    const z=-2.43+i*.90;
    block(chassis,'Faldó lateral segmentat',.09,.59,.87,side*1.85,1.22,z,T.armor);
    block(chassis,'Mòdul Relikt lateral',.12,.27,.84,side*1.88,1.51,z,T.top);
   }
   const glacis=block(chassis,'Blindatge glacis frontal',1.02,.065,1.05,side*.94,1.32,-2.78,T.top);glacis.rotation.x=-.37;
   cylinder(chassis,'Far encastat',.095,.10,side*1.31,1.31,-2.99,T.light,'z');
   line(chassis,'Protecció far',[side*1.16,1.41,-3.03],[side*1.45,1.41,-3.03],.025,T.dark);
   cylinder(chassis,'Dipòsit posterior',.29,.91,side*.91,1.22,3.51,T.shadow,'x');
  }
  const turret=new THREE.Group();turret.name='Torreta giratòria T-90M';turret.position.set(0,1.62,-.24);root.add(turret);
  cylinder(turret,'Anell de torreta',1.08,.17,0,-.045,0,T.shadow,'y',24);
  armoredLoft(turret,'Torreta soldada baixa',[
   {z:-1.40,w:.61,bot:.02,shoulder:.29,roof:.53},
   {z:-.73,w:1.39,bot:.01,shoulder:.39,roof:.69},
   {z:.43,w:1.39,bot:.01,shoulder:.40,roof:.73},
   {z:1.46,w:1.17,bot:.05,shoulder:.40,roof:.66}
  ],T.armor);
  block(turret,'Bustle posterior',2.38,.49,.72,0,.34,1.51,T.shadow);
  for(const side of [-1,1]){
   // Falques angulars contigües, en lloc de cubs apilats.
   for(let i=0;i<3;i++){
    const plate=block(turret,'Falca Relikt frontal',.48,.25,.63,side*(.48+i*.35),.34,-1.23+i*.23,T.top);
    plate.rotation.set(-.30,side*-.54,side*-.08);
   }
   for(let i=0;i<3;i++)block(turret,'Blindatge lateral torreta',.13,.35,.48,side*1.40,.32,-.40+i*.50,T.top);
   for(let i=0;i<4;i++)line(turret,'Llançador fumigen',[side*1.22,.47,-.43+i*.16],[side*1.46,.65,-.60+i*.16],.065,T.dark);
   for(let i=0;i<6;i++)line(turret,'Muntant cistella',[side*1.29,.04,.70+i*.22],[side*1.38,.50,.70+i*.22],.016,T.metal);
   for(const y of [.06,.22,.39,.52])line(turret,'Reixa lateral cistella',[side*1.38,y,.70],[side*1.38,y,1.96],.016,T.metal);
   cylinder(turret,'Escotilla',.31,.055,side*.60,.77,.39,T.top,'y');
  }
  for(const y of [.06,.22,.39,.52])line(turret,'Reixa posterior cistella',[-1.38,y,1.96],[1.38,y,1.96],.016,T.metal);
  block(turret,'Visor artiller',.34,.24,.40,-.62,.83,-.48,T.shadow);
  block(turret,'Lent visor',.25,.12,.015,-.62,.85,-.688,T.glass,'glass');
  cylinder(turret,'Base panoràmica',.18,.22,.65,.88,.10,T.shadow,'y');
  block(turret,'Sensor panoràmic',.25,.21,.26,.65,1.07,.10,T.dark);
  block(turret,'Mòdul remot superior',.28,.20,.40,-.43,1.00,.48,T.shadow);
  line(turret,'Canó metralladora',[-.43,1.03,.35],[-.43,1.03,-.58],.028,T.dark);
  line(turret,'Antena',[-.93,.68,1.23],[-.93,1.85,1.23],.012,T.dark);
  const gun=new THREE.Group();gun.name='Canó principal 125 mm';gun.position.set(0,.36,-1.22);turret.add(gun);
  block(gun,'Mantelet',.55,.41,.49,0,0,-.02,T.shadow);
  line(gun,'Tub llarg',[0,0,-.15],[0,0,-4.80],.086,T.armor,12);
  cylinder(gun,'Evacuador de fum',.135,.58,0,0,-2.15,T.shadow,'z',12);
  for(const z of [-.50,-1.24,-2.53,-3.34,-4.65])cylinder(gun,'Anell camisa tèrmica',.098,.055,0,0,z,T.metal,'z');
  cylinder(gun,'Boca del canó',.088,.09,0,0,-4.80,T.metal,'z');
  cylinder(gun,'Ànima fosca',.065,.005,0,0,-4.848,T.dark,'z');
  root.userData.candidateParts={hull:chassis.name,turret:turret.name,gun:gun.name,wheelsPerSide:6};
  // L'escala és del model sencer, també canó i animacions. No altera el GAZ.
  root.scale.setScalar(1.5);
  root.userData.t90Animation={turret:turret.name,pitch:gun.name,
   leftTrack:'Eruga mòbil esquerra',rightTrack:'Eruga mòbil dreta',
   movement:'differential',scale:1.5};
 }else{
  const body=new THREE.Group();body.name='Carrosseria GAZ Tigr-M';root.add(body);
  const rect=(a,b,c,d)=>[[a,c],[b,c],[b,d],[a,d]];
  // Panells amb obertures geomètriques; cap superfície opaca rere el vidre.
  const panel=(name,outline,holes,map,color)=>{
   const shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(...p)));
   for(const loop of holes)shape.holes.push(new THREE.Path(loop.map(p=>new THREE.Vector2(...p))));
   const geo=new THREE.ShapeGeometry(shape),pos=geo.attributes.position;
   for(let i=0;i<pos.count;i++)pos.setXYZ(i,...map(pos.getX(i),pos.getY(i)));
   geo.computeVertexNormals();return mesh(body,new THREE.BufferGeometry().copy(geo),color,name);
  };
  const glass=(name,points)=>{
   const pane=quad(body,name,points,0xa6c7c9,'glass');
   pane.material=pane.material.clone();pane.material.opacity=.22;pane.material.roughness=.16;
   pane.castShadow=false;pane.renderOrder=2;return pane;
  };
  const windowHoles=[...[-.24,.89].map(z=>rect(z-.34,z+.34,1.77,2.17)),rect(1.72,2.24,1.805,2.155)];

  block(body,'Bastidor central',1.45,.22,4.96,0,.59,0,T.dark);
  // Carrosseria amb retalls reals als dos passos de roda.
  const sideProfile=[[-2.65,1.48],[-.91,1.63],[-.56,2.37],[2.53,2.37],[2.61,.77],[2.29,.77]];
  for(let i=0;i<=12;i++){const t=i*Math.PI/12;sideProfile.push([1.60+Math.cos(t)*.69,.56+Math.sin(t)*.69])}
  sideProfile.push([.91,.73],[-1.01,.73]);
  for(let i=0;i<=12;i++){const t=i*Math.PI/12;sideProfile.push([-1.70+Math.cos(t)*.69,.56+Math.sin(t)*.69])}
  sideProfile.push([-2.65,.77]);
  for(const side of [-1,1])profile(body,'Panell lateral amb passos de roda',sideProfile,.055,side*1.075,T.armor,windowHoles);
  block(body,'Sostre blindat',2.15,.09,3.09,0,2.37,.985,T.armor);
  const windZ=y=>-.91+(y-1.63)*.35/.74;
  const windHoles=[rect(-.93,-.075,1.77,2.23),rect(.075,.93,1.77,2.23)];
  panel('Mampara parabrisa oberta',rect(-1.075,1.075,1.63,2.37),windHoles,(x,y)=>[x,y,windZ(y)],T.armor);
  quad(body,'Capó inclinat',[[-1.075,1.48,-2.65],[1.075,1.48,-2.65],[1.075,1.63,-.91],[-1.075,1.63,-.91]],T.top);
  armoredLoft(body,'Relleu del capó',[
   {z:-2.30,w:.64,bot:1.51,shoulder:1.55,roof:1.59},
   {z:-1.04,w:.72,bot:1.61,shoulder:1.68,roof:1.73}
  ],T.armor);
  block(body,'Frontal vertical',2.15,.56,.08,0,1.17,-2.64,T.armor);
  block(body,'Graella frontal ampla',1.12,.36,.04,0,1.21,-2.69,T.dark);
  for(let i=0;i<8;i++)block(body,'Lama graella',1.04,.014,.018,0,1.06+i*.042,-2.716,T.metal);
  block(body,'Para-xocs frontal',2.32,.16,.24,0,.70,-2.73,T.dark);
  block(body,'Cabrestant',.52,.18,.22,0,.86,-2.74,T.metal);
  for(const side of [-1,1]){
   for(const [i,z] of [-1.70,1.60].entries()){
    const wheels=new THREE.Group();wheels.name='Conjunt roda '+side+' '+i;wheels.position.set(side*1.025,.56,z);body.add(wheels);
    cylinder(wheels,'Pneumàtic tot terreny '+(i?'posterior':'davanter'),.55,.35,0,0,0,T.dark,'x',16);
    cylinder(wheels,'Llanta enfonsada',.30,.035,side*.18,0,0,T.metal,'x');
    cylinder(wheels,'Anell llanta',.23,.04,side*.202,0,0,T.dark,'x');
    cylinder(wheels,'Boixa',.105,.07,side*.23,0,0,T.metal,'x');
    for(let k=0;k<16;k++){
     const t=k*Math.PI/8;
     const tread=block(wheels,'Tac pneumàtic',.37,.055,.13,0,Math.cos(t)*.542,Math.sin(t)*.542,T.dark);tread.rotation.x=t;
    }
    const outer=[],inner=[];
    for(let k=0;k<=10;k++){const t=.05+k*(Math.PI-.10)/10;outer.push([z+Math.cos(t)*.74,.56+Math.sin(t)*.74]);inner.unshift([z+Math.cos(t)*.68,.56+Math.sin(t)*.68])}
    profile(body,'Aleta arquejada',outer.concat(inner),.21,side*1.105,T.shadow);
   }
   for(const [i,z] of [-.24,.89].entries()){
    // Portes planes i estretes; els vidres queden sobre el mateix pla.
    const opening=rect(z-.34,z+.34,1.77,2.17);
    panel('Porta lateral '+(i?'posterior':'davantera'),rect(z-.52,z+.52,.97,2.24),[opening],(u,y)=>[side*1.13,y,u],T.top);
    panel('Marc finestra lateral',rect(z-.39,z+.39,1.725,2.215),[opening],(u,y)=>[side*1.15,y,u],T.shadow);
    glass('Vidre lateral',opening.map(([u,y])=>[side*1.155,y,u]));
    block(body,'Maneta lateral',.047,.045,.19,side*1.145,1.57,z+.31,T.dark);
    for(const y of [1.20,1.68])block(body,'Frontissa porta',.055,.095,.07,side*1.145,y,z-.49,T.shadow);
   }
   glass('Finestreta posterior lateral',windowHoles[2].map(([u,y])=>[side*1.12,y,u]));
   block(body,'Esglaó lateral',.22,.065,1.80,side*1.14,.62,-.03,T.dark);
   cylinder(body,'Bisel del far',.17,.07,side*.79,1.21,-2.72,T.dark,'z');
   cylinder(body,'Far principal rodó',.13,.025,side*.79,1.21,-2.765,T.light,'z');
   cylinder(body,'Intermitent rodó',.065,.025,side*.98,1.33,-2.75,T.red,'z');
   line(body,'Muntant defensa frontal',[side*.68,.77,-2.84],[side*.68,1.59,-2.84],.038,T.shadow);
   line(body,'Defensa lateral',[side*.68,.97,-2.84],[side*1.13,.97,-2.84],.038,T.shadow);
   line(body,'Defensa exterior',[side*1.13,.97,-2.84],[side*1.13,1.45,-2.84],.038,T.shadow);
   block(body,'Retrovisor',.12,.36,.18,side*1.30,1.94,-.73,T.dark);
   line(body,'Suport retrovisor',[side*1.09,1.86,-.65],[side*1.30,1.86,-.73],.025,T.metal);
   block(body,'Pilot posterior',.14,.24,.045,side*.92,1.05,2.69,T.red);
  }
  line(body,'Barra superior defensa',[-.68,1.59,-2.84],[.68,1.59,-2.84],.038,T.shadow);
  for(const side of [-1,1]){
   glass('Parabrisa partit '+side,rect(side*.075,side*.93,1.77,2.23).map(([x,y])=>[x,y,windZ(y)-.008]));
   line(body,'Eixugaparabrisa',[side*.12,1.78,-.872],[side*.65,1.94,-.797],.012,T.dark);
  }
  const rearHoles=[rect(-.795,-.185,1.81,2.17),rect(.185,.795,1.81,2.17)];
  panel('Panell posterior obert',rect(-1.075,1.075,.77,2.33),rearHoles,(x,y)=>[x,y,2.58],T.armor);
  for(const side of [-1,1]){
   const opening=rect(side*.49-.305,side*.49+.305,1.81,2.17);
   panel('Porta posterior',rect(side*.49-.465,side*.49+.465,.855,2.245),[opening],(x,y)=>[x,y,2.63],T.top);
   glass('Vidre posterior',opening.map(([x,y])=>[x,y,2.66]));
   block(body,'Maneta posterior',.13,.045,.045,side*.13,1.46,2.67,T.dark);
  }
  block(body,'Para-xocs posterior',2.24,.14,.24,0,.70,2.73,T.dark);
  block(body,'Marc escotilla sostre',.94,.075,1.04,0,2.44,.54,T.shadow);
  block(body,'Escotilla rectangular tancada',.85,.045,.95,0,2.49,.54,T.armor);
  line(body,'Antena',[.89,2.41,2.15],[.89,3.17,2.15],.012,T.dark);
  const interior=new THREE.Group();interior.name='Interior Tigr-M';body.add(interior);
  block(interior,'Terra habitacle',2.04,.07,3.25,0,.94,.91,0x53594d);
  block(interior,'Tauler de comandament',1.96,.20,.36,0,1.54,-.67,0x42483f);
  block(interior,'Consola central',.30,.30,.72,0,1.15,-.21,0x555c50);
  for(const z of [.12,1.28])for(const x of [-.53,.53]){
   const seat=new THREE.Group();seat.name='Seient '+(z<1?'davanter':'posterior')+' '+(x<0?'conductor':'dret');interior.add(seat);
   block(seat,'Base seient',.47,.17,.48,x,1.15,z,0x737461);
   const back=block(seat,'Respatller',.47,.52,.12,x,1.46,z+.23,0x737461);back.rotation.x=-.10;
   block(seat,'Reposacaps',.27,.18,.12,x,1.80,z+.25,0x626553);
   block(seat,'Suport seient',.30,.12,.31,x,1.01,z,0x353b34);
  }
  const steering=new THREE.Group();steering.name='Volant';steering.position.set(-.53,1.62,-.32);steering.rotation.x=-.48;interior.add(steering);
  mesh(steering,new THREE.TorusGeometry(.18,.022,6,16),0x30372f,'Cèrcol volant');
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;line(steering,'Radi volant',[0,0,0],[Math.cos(a)*.16,Math.sin(a)*.16,0],.014,0x30372f)}
  cylinder(steering,'Centre volant',.045,.06,0,0,0,0x30372f,'z');
  line(interior,'Columna direcció',[-.53,1.62,-.32],[-.53,1.38,-.67],.033,0x30372f);
  block(interior,'Quadre instruments',.45,.12,.025,-.53,1.61,-.475,0x1d292a);
  root.userData.candidateParts={body:body.name,wheels:4,doors:4,front:-1,wheelbase:3.3,seats:4,interior:interior.name};

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
