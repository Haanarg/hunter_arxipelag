// Models conceptuals d'hovercraft per a la pàgina de proves. Cap vehicle del joc és substituït.
// Proa: -Z; popa: +Z. Mateixa escala nominal per comparar les quatre alternatives.
export const hovercraftConcepts=Object.freeze([
  {id:'A',name:'Falca blindada',subtitle:'Perfil baix · 1 hèlix',detail:'Proa afuada, cabina integrada i turbina carenada. Basat en la silueta de la primera fotografia.',paint:0x71816a,trim:0x35463c,skirt:0x1a2020,roof:0x7d8d74,height:0.92,front:-1.88,rear:.38,windshield:.72,fan:'duct',radius:.83,armor:1.0,rails:false},
  {id:'B',name:'Assalt fluvial',subtitle:'Cabina alta · 1 hèlix',detail:'Parabrisa frontal gran, faldó inflable molt visible, defenses i hèlix única protegida per una gàbia.',paint:0x526b50,trim:0x303f34,skirt:0x181e1c,roof:0x627b5d,height:1.12,front:-1.96,rear:.45,windshield:1,fan:'cage',radius:1.00,armor:.85,rails:true},
  {id:'C',name:'Reconeixement',subtitle:'Lleuger · 1 hèlix',detail:'Cabina compacta i baixa, coberta posterior oberta, una gran hèlix visible i antenes de reconeixement.',paint:0x849078,trim:0x3d4e42,skirt:0x22282a,roof:0x9da58d,height:.72,front:-1.84,rear:-.27,windshield:.62,fan:'open',radius:.96,armor:.58,rails:true},
  {id:'D',name:'Transport pesant',subtitle:'Blindat · 2 hèlixs',detail:'Cabina ampla, reforços laterals i dues hèlixs posteriors compactes: contrast amb els tres monomotors.',paint:0x566258,trim:0x333e3b,skirt:0x191d1e,roof:0x717f70,height:.96,front:-1.94,rear:.48,windshield:.8,fan:'twin',radius:.65,armor:1.28,rails:false}
]);

export function createHovercraftConcept(THREE,variant=0){
  const c=typeof variant==='number'?hovercraftConcepts[variant]:variant;
  if(!c)throw new Error('Variant d’hovercraft desconeguda');
  const root=new THREE.Group(),parts=new THREE.Group(),rotors=[];
  root.add(parts);
  const mat=(color,metalness=.16,roughness=.75)=>new THREE.MeshStandardMaterial({color,metalness,roughness,side:THREE.DoubleSide});
  const paint=mat(c.paint,.26,.62),roof=mat(c.roof,.22,.68),trim=mat(c.trim,.34,.62),
    skirt=mat(c.skirt,.05,.95),rubber=mat(0x11171a,.02,.9),seam=mat(0x2c3435,.1,.94),
    deck=mat(0x34483e,.24,.82),silver=mat(0x9baba4,.65,.3),
    dark=mat(0x182626,.15,.6),glass=new THREE.MeshPhysicalMaterial({color:0x4d8692,metalness:.05,roughness:.19,transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false}),
    light=mat(0xe7e6ba,.1,.37),orange=mat(0xd6a536,.1,.45);
  const mesh=(geo,m,parent=parts)=>{const o=new THREE.Mesh(geo,m);parent.add(o);return o};
  function box(w,h,d,x,y,z,m,parent=parts){const o=mesh(new THREE.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o}
  function beam(a,b,r,m,segments=8,parent=parts){
    const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p);
    const o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),segments),m,parent);
    o.position.copy(p.add(q).multiplyScalar(.5));
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    return o;
  }
  function ball(r,x,y,z,m,parent=parts){const o=mesh(new THREE.SphereGeometry(r,12,8),m,parent);o.position.set(x,y,z);return o}
  function quad(points,m,parent=parts){
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();return mesh(geo,m,parent);
  }
  function polygonBody(sections,profile,m){
    const pos=[],idx=[],n=profile.length;
    for(const s of sections)for(const p of profile)pos.push(p[0]*s.w,s.y+p[1]*s.h,s.z);
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<n;j++){
      const a=i*n+j,b=i*n+(j+1)%n,d=(i+1)*n+j,e=(i+1)*n+(j+1)%n;
      idx.push(a,b,d,b,e,d);
    }
    for(let j=1;j<n-1;j++){idx.push(0,j+1,j);let a=(sections.length-1)*n;idx.push(a,a+j,a+j+1)}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setIndex(idx);geo.computeVertexNormals();return mesh(geo,m);
  }
  const hullProfile=[[-.73,.72],[-1,.52],[-1,-.11],[-.77,-.30],[.77,-.30],[1,-.11],[1,.52],[.73,.72]];
  const skirtProfile=[[-.78,.72],[-1,.38],[-1,-.30],[-.74,-.78],[.74,-.78],[1,-.30],[1,.38],[.78,.72]];
  polygonBody([
    {z:-3.14,w:.68,y:.58,h:.52},{z:-2.60,w:1.40,y:.55,h:.55},
    {z:-1.55,w:1.62,y:.56,h:.56},{z:.35,w:1.66,y:.56,h:.55},
    {z:2.60,w:1.58,y:.56,h:.56},{z:3.02,w:1.20,y:.58,h:.53}
  ],skirtProfile,skirt);
  polygonBody([
    {z:-3.18,w:.50,y:1.00,h:.44},{z:-2.46,w:1.21,y:1.01,h:.45},
    {z:-1.48,w:1.36,y:1.01,h:.48},{z:1.02,w:1.40,y:1.01,h:.47},
    {z:2.70,w:1.36,y:1.00,h:.45},{z:3.00,w:1.06,y:1.00,h:.44}
  ],hullProfile,paint);
  // Separació contínua entre coixí d'aire i casc rígid.
  for(const side of [-1,1]){
    beam([side*.60,.73,-2.99],[side*1.49,.88,-2.41],.085,trim);
    beam([side*1.49,.88,-2.41],[side*1.55,.89,2.66],.092,trim);
    for(let i=0;i<13;i++){
      const z=-2.46+i*.41,w=1.58+(z>2.25?-(z-2.25)*.3:0);
      beam([side*(w-.04),.40,z],[side*(w-.04),.19,z+.13],.026,seam,5);
    }
  }
  // Coberta i passamans sobre la plataforma rígida.
  box(2.47,.10,3.82,0,1.32,.64,deck);
  box(2.05,.075,.55,0,1.32,-2.38,roof);
  for(const side of [-1,1]){
    box(.10,.095,3.64,side*1.28,1.41,.54,trim);
    for(const z of [-2.36,-1.52,-.57,.49,1.43,2.26]){
      box(.40,.027,.055,side*1.40,1.32,z,silver);
    }
  }
  // Volum de cabina facetat: la superfície frontal inclinada és part de la silueta, no un bloc cúbic.
  const baseY=1.38,topY=baseY+c.height,fw=c.front,rz=c.rear,
    frontBottom=-2.50,backBottom=rz+.30,halfBottom=1.10*c.armor,halfTop=.94*c.armor;
  const v=[
    [-halfBottom,baseY,frontBottom],[halfBottom,baseY,frontBottom],
    [halfBottom,baseY,backBottom],[-halfBottom,baseY,backBottom],
    [-halfTop,topY,fw],[halfTop,topY,fw],
    [halfTop,topY,rz],[-halfTop,topY,rz]
  ];
  const faceList=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7],[0,3,2,1]];
  for(const ids of faceList)quad(ids.map(i=>v[i]),ids[4]===undefined?paint:roof);
  box(halfTop*2+.14,.065,rz-fw+.14,0,topY+.015,(fw+rz)/2,roof);
  // Parabrisa angular amb muntant central i marcs de vidre.
  const w=.76*halfTop,lowY=baseY+c.height*.31,highY=topY-.16,
    lowZ=frontBottom+(fw-frontBottom)*.28,highZ=fw-.014;
  for(const side of [-1,1]){
    const xa=side<0?-w:0,xb=side<0?0:w;
    quad([[xa,lowY,lowZ],[xb,lowY,lowZ],[xb,highY,highZ],[xa,highY,highZ]],glass);
    beam([xa,lowY,lowZ-.014],[xa,highY,highZ-.014],.025,dark);
    beam([xa,highY,highZ-.018],[xb,highY,highZ-.018],.027,dark);
    beam([xa,lowY,lowZ-.018],[xb,lowY,lowZ-.018],.023,dark);
    // Finestres trapezoïdals laterals al costat del conductor.
    const sx=side*(halfBottom*.96),tx=side*(halfTop*.98);
    quad([[sx,baseY+.38,frontBottom*.59+rz*.41],[sx,baseY+.40,rz-.04],
          [tx,topY-.21,rz-.09],[tx,topY-.20,fw+.30]],glass);
    box(.045,.19,.30,side*(halfBottom+.06),baseY+.45,fw+.45,trim);
    // Placa amb punts de rematada del blindatge lateral.
    box(.044,.32,.75,side*(halfBottom+.015),baseY+.27,.45,paint);
    for(const z of [-1.30,-.95,-.60,.1,.45,.8]){
      ball(.021,side*(halfBottom+.04),baseY+.36,z,silver);
    }
  }
  beam([0,lowY,lowZ-.03],[0,highY,highZ-.03],.036,trim);
  // Capó, llums de proa, dos retrovisors i escotilles.
  box(1.35,.11,.47,0,1.40,-2.73,paint);
  for(const side of [-1,1]){
    ball(.105,side*.59,1.42,-2.98,light);
    box(.29,.14,.13,side*(halfBottom+.19),baseY+.56,fw+.16,dark);
    beam([side*.48,topY+.055,-.12],[side*.48,topY+.11,.32],.028,trim);
  }
  box(.54,.048,.42,0,topY+.072,(fw+rz)/2+.27,trim);
  for(let i=0;i<7;i++)box(.39,.019,.028,0,topY+.102,(fw+rz)/2+.09+i*.042,silver);
  // Línies dels registres i respiradors de popa.
  for(const side of [-1,1]){
    box(.047,.25,.70,side*1.32,1.49,1.24,trim);
    for(let j=0;j<6;j++)box(.014,.015,.065,side*1.356,1.40+j*.032,1.01+j*.072,silver);
    if(c.rails) {
      for(const z of [-2.25,.45,1.32,2.28])beam([side*1.38,1.42,z],[side*1.38,1.83,z],.025,silver);
      beam([side*1.38,1.83,-2.25],[side*1.38,1.83,2.28],.025,silver);
    }
  }
  // Defenses i argolles.
  for(const side of [-1,1]){
    beam([side*1.52,.96,-1.58],[side*1.52,.96,2.36],.070,dark);
    for(const z of [-2.48,2.66])ball(.09,side*1.24,1.20,z,silver);
  }
  box(1.02,.075,.19,0,1.31,2.80,trim);
  if(c.id==='C'){
    // Banquetes de la coberta oberta i prestatges de reconeixement.
    box(1.60,.14,.51,0,1.48,.57,paint);
    for(const side of [-1,1])box(.22,.35,.67,side*.85,1.61,.64,trim);
    box(.60,.32,.43,.01,1.52,1.13,trim);
  }else if(c.id==='D'){
    for(const side of [-1,1]){
      box(.24,.48,1.57,side*1.20,1.52,.66,paint);
      for(let k=0;k<3;k++)box(.025,.12,.19,side*1.35,1.52,.15+k*.4,dark);
    }
  }else{
    box(.98,.37,.52,0,1.51,1.25,paint);
    box(.87,.08,.38,0,1.73,1.25,trim);
  }
  function buildFan(x,y,z,r,style){
    const supportZ=z-.05;
    for(const side of [-1,1]){
      beam([x+side*.40,1.34,supportZ-.38],[x+side*.60*r,y-.47*r,z],.068,trim);
      beam([x+side*.42,1.36,supportZ+.33],[x+side*.57*r,y-.48*r,z],.065,trim);
    }
    const duct=mesh(new THREE.CylinderGeometry(r+.13,r+.13,style==='duct'?.61:.32,40,1,true),style==='duct'?paint:trim);
    duct.rotation.x=Math.PI/2;duct.position.set(x,y,z);
    for(const dz of [-.20,.20]){
      const tor=mesh(new THREE.TorusGeometry(r+.09,style==='duct'?.105:.075,10,40),style==='duct'?paint:dark);
      tor.position.set(x,y,z+dz);
    }
    const rotor=new THREE.Group();rotor.position.set(x,y,z);parts.add(rotor);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,ca=Math.cos(a),sa=Math.sin(a);
      const pts=[[.18,-.085],[r*.79,-.23],[r*.92,.17],[.17,.15]];
      const coords=pts.map(p=>[p[0]*ca-p[1]*sa,p[0]*sa+p[1]*ca,.015]);
      quad(coords,silver,rotor);
    }
    const core=mesh(new THREE.CylinderGeometry(.19,.19,.21,14),dark,rotor);
    core.rotation.x=Math.PI/2;
    ball(.115,0,0,-.16,trim,rotor);
    rotors.push(rotor);
    // Els braços de la gàbia queden fixos: només gira el rotor.
    const guardZ=z-.24;
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      beam([x,y,guardZ],[x+Math.cos(a)*r,y+Math.sin(a)*r,guardZ],.024,style==='open'?silver:dark,6);
    }
    if(style==='cage'||style==='open'){
      for(let k=0;k<3;k++){
        const rr=(.40+k*.22)*r;
        const t=mesh(new THREE.TorusGeometry(rr,.018,6,36),silver);
        t.position.set(x,y,guardZ);
      }
    }
    const cap=ball(.17,x,y,guardZ-.015,trim);
    cap.scale.z=.48;
  }
  if(c.fan==='twin'){
    buildFan(-.70,2.52,2.31,c.radius,'duct');
    buildFan(.70,2.52,2.31,c.radius,'duct');
    box(1.35,.26,.55,0,1.65,2.45,paint);
  }else{
    buildFan(0,c.id==='B'?2.68:c.id==='C'?2.48:2.57,2.28,c.radius,c.fan);
    if(c.id==='A'){
      for(const side of [-1,1]){
        box(.24,.38,.75,side*.99,1.52,2.25,paint);
      }
    }
  }
  // Antena, llum taronja i detalls de maniobra.
  beam([-.42,topY+.03,rz-.23],[-.48,topY+1.13,rz-.33],.019,dark);
  ball(.044,-.48,topY+1.13,rz-.33,silver);
  box(.14,.11,.13,.47,topY+.10,rz-.21,orange);
  for(const side of [-1,1]){
    box(.18,.075,.09,side*.83,1.28,-2.81,dark);
  }
  root.userData={concept:c,rotors,animate(time){
    for(let i=0;i<rotors.length;i++)rotors[i].rotation.z=time*19*(i%2? -1:1);
  }};
  return root;
}
