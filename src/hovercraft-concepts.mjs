// Models conceptuals d'hovercraft per a la pàgina de proves. Cap vehicle del joc és substituït.
// Proa: -Z; popa: +Z. Mateixa escala nominal per comparar les quatre alternatives.
// Iteració del model 3 («Reconeixement»): una hèlix, flotador net i cabina oberta a la vista.
// Les quatre versions mantenen la mateixa escala i un interior idèntic de dues places.
export const hovercraftConcepts=Object.freeze([
  {id:'A',name:'Reconeixement refinat',subtitle:'Model 3 · perfil original',detail:'Cabina baixa, una sola hèlix descoberta i coberta posterior oberta. El model 3 original, netejat i amb interior.',paint:0x849078,trim:0x3d4e42,skirt:0x22282a,roof:0x9da58d,height:.72,front:-1.84,rear:-.27,windshield:.80,fan:'open',radius:.96,armor:.58,rails:true,style:'recon'},
  {id:'B',name:'Patrulla fluvial',subtitle:'Model 3 · reforçat',detail:'Cabina una mica més alta, defensa de proa i proteccions baixes. Manté l’hèlix única i el flotador llis.',paint:0x63775d,trim:0x344a3c,skirt:0x1b2323,roof:0x89947c,height:.83,front:-1.89,rear:-.17,windshield:.88,fan:'open',radius:.96,armor:.67,rails:true,style:'patrol'},
  {id:'C',name:'Interceptor',subtitle:'Model 3 · esportiu',detail:'Teca baixa i afuada, preses d’aire i aletes de popa. Una sola hèlix amb gàbia lleugera.',paint:0x899582,trim:0x384941,skirt:0x23292b,roof:0xa4ad97,height:.66,front:-1.96,rear:-.32,windshield:.76,fan:'open',radius:.98,armor:.56,rails:false,style:'interceptor'},
  {id:'D',name:'Comandament',subtitle:'Model 3 · panoràmic',detail:'Vidres grans, cabina elevada i equipament de comunicacions a la coberta. Manté una sola hèlix.',paint:0x718572,trim:0x40564a,skirt:0x20272a,roof:0x9aaa91,height:.91,front:-1.78,rear:-.05,windshield:.92,fan:'open',radius:.96,armor:.68,rails:true,style:'command'}
]);

export function createHovercraftConcept(THREE,variant=0){
  const c=typeof variant==='number'?hovercraftConcepts[variant]:variant;
  if(!c)throw new Error('Variant d’hovercraft desconeguda');
  const root=new THREE.Group(),parts=new THREE.Group(),rotors=[],windowPanes=[],cockpitSeats=[];
  root.add(parts);
  const mat=(color,metalness=.16,roughness=.75)=>new THREE.MeshStandardMaterial({color,metalness,roughness,side:THREE.DoubleSide});
  const paint=mat(c.paint,.26,.62),roof=mat(c.roof,.22,.68),trim=mat(c.trim,.34,.62),
    skirt=mat(c.skirt,.05,.95),
    deck=mat(0x34483e,.24,.82),silver=mat(0x9baba4,.65,.3),
    dark=mat(0x182626,.15,.6),
    // Tint suau: la transparència serveix de debò perquè ara NO hi ha plaques opaques darrere.
    glass=new THREE.MeshPhysicalMaterial({color:0xa7dbe1,metalness:0,roughness:.12,transparent:true,opacity:.27,side:THREE.DoubleSide,depthWrite:false}),
    upholstery=mat(0x364941,.06,.91),seatTrim=mat(0x9faa92,.10,.78),
    instruments=mat(0x253b3c,.1,.78),screen=mat(0x7dc7bd,.05,.42),
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
    // Flotador continu i llis: sense barres ni filaments penjants.
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
  // Cabina REALMENT buida: retallem les parets per crear obertures; no superposem vidres
  // a una caixa sòlida (el defecte de la primera comparativa).
  const baseY=1.38,topY=baseY+c.height,fw=c.front,rz=c.rear,
    frontBottom=-2.50,backBottom=rz+.30,halfBottom=1.10*c.armor,halfTop=.94*c.armor;
  const v=[
    [-halfBottom,baseY,frontBottom],[halfBottom,baseY,frontBottom],
    [halfBottom,baseY,backBottom],[-halfBottom,baseY,backBottom],
    [-halfTop,topY,fw],[halfTop,topY,fw],
    [halfTop,topY,rz],[-halfTop,topY,rz]
  ];
  const mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
  // Paret quad: u va d'esquerra a dreta i t de terra a sostre.
  // Cada panell és parcial: les finestres ocupen forats físics al blindatge.
  function wallPanel(corners){
    const [bl,br,tr,tl]=corners;
    const at=(u,t)=>mix(mix(bl,br,u),mix(tl,tr,u),t);
    return (u0,u1,t0,t1,m,windowType=null)=>{
      const o=quad([at(u0,t0),at(u1,t0),at(u1,t1),at(u0,t1)],m);
      if(windowType){o.userData.windowPane=windowType;windowPanes.push(o)}
      return o;
    };
  }
  function windowedWall(corners,position){
    const panel=wallPanel(corners);
    // Plaques opaques només a la part BAIXA i al marc superior.
    panel(0,1,0,.31,paint);
    panel(0,1,.91,1,roof);
    if(position==='front'){
      panel(0,.065,.31,.91,trim);
      panel(.935,1,.31,.91,trim);
      panel(.478,.522,.31,.91,trim);
      panel(.065,.478,.345,.885,glass,'front');
      panel(.522,.935,.345,.885,glass,'front');
      panel(.065,.935,.31,.345,trim);
      panel(.065,.935,.885,.91,trim);
    }else{
      panel(0,.095,.31,.91,trim);
      panel(.915,1,.31,.91,trim);
      panel(.505,.552,.31,.91,trim);
      panel(.095,.505,.35,.88,glass,'side');
      panel(.552,.915,.35,.88,glass,'side');
      panel(.095,.915,.31,.35,trim);
      panel(.095,.915,.88,.91,trim);
    }
  }
  windowedWall([v[0],v[1],v[5],v[4]],'front');
  windowedWall([v[1],v[2],v[6],v[5]],'side');
  windowedWall([v[3],v[0],v[4],v[7]],'side');
  // Mampara de popa de la cabina (parcial); la coberta continua oberta.
  const rear=wallPanel([v[2],v[3],v[7],v[6]]);
  rear(0,1,0,.72,paint);
  rear(0,.10,.72,1,trim);rear(.90,1,.72,1,trim);
  rear(.10,.90,.72,.92,glass,'rear');
  rear(0,1,.92,1,roof);
  const canopyRoof=box(halfTop*2+.12,.063,rz-fw+.12,0,topY+.025,(fw+rz)/2,roof);

  // L'habitacle és real: seients, seients amb respatller, terres, consoles i controls.
  // Totes les peces queden entre les finestres, amb els dos passatgers costat a costat.
  box(halfBottom*1.75,.065,1.77,0,baseY+.035,-1.22,instruments);
  for(const x of [-.235,.235]){
    const seat=new THREE.Group();parts.add(seat);cockpitSeats.push(seat);
    box(.33,.12,.43,x,baseY+.20,-.90,upholstery,seat);
    box(.33,.34,.09,x,baseY+.39,-.68,upholstery,seat);
    box(.30,.04,.30,x,baseY+.275,-.91,seatTrim,seat);
    for(const dx of [-.11,.11])box(.035,.11,.035,x+dx,baseY+.105,-.91,dark,seat);
    box(.26,.075,.065,x,baseY+.57,-.67,seatTrim,seat);
  }
  box(halfBottom*1.67,.21,.35,0,baseY+.27,-1.88,dark);
  box(halfBottom*1.45,.065,.22,0,baseY+.40,-1.83,instruments);
  for(const x of [-.38,-.20,-.03,.14,.31]){
    box(.085,.033,.02,x,baseY+.47,-1.82,x<0?screen:silver);
  }
  // Manillar a la banda esquerra i palanca de potència central.
  beam([-.235,baseY+.35,-1.55],[-.235,baseY+.49,-1.65],.019,silver);
  const steering=mesh(new THREE.TorusGeometry(.115,.018,8,20),dark);
  steering.position.set(-.235,baseY+.50,-1.65);
  beam([0,baseY+.28,-1.28],[0,baseY+.55,-1.40],.019,silver);
  ball(.04,0,baseY+.55,-1.40,trim);
  box(.33,.23,.29,.38,baseY+.10,-1.49,upholstery);
  // Marcs discrets dels laterals: de metall, no barres al flotador.
  for(const side of [-1,1]){
    const xb=side*halfBottom,xt=side*halfTop;
    beam([xb,baseY,frontBottom],[xt,topY,fw],.038,trim);
    beam([xt,topY,fw],[xt,topY,rz],.038,trim);
  }
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
  // Coberta posterior comuna del model 3: oberta, amb banqueta compacta.
  box(1.60,.14,.51,0,1.48,.57,paint);
  for(const side of [-1,1])box(.22,.35,.67,side*.85,1.61,.64,trim);
  box(.60,.32,.43,.01,1.52,1.13,trim);
  // Quatre estils de la mateixa barca, sense alterar l'interior ni la motorització.
  if(c.style==='patrol'){
    // Defensa frontal reforçada, falques laterals i projector de patrulla.
    beam([-.94,1.29,-3.01],[.94,1.29,-3.01],.10,dark,10);
    for(const side of [-1,1]){
      box(.15,.29,1.08,side*1.25,1.46,-.53,paint);
      box(.09,.22,.68,side*1.29,1.60,-.49,trim);
    }
    const searchlight=mesh(new THREE.CylinderGeometry(.16,.17,.21,14),dark);
    searchlight.rotation.x=Math.PI/2;searchlight.position.set(.31,topY+.19,rz-.19);
    ball(.125,.31,topY+.19,rz-.305,light);
    box(.19,.13,.17,.31,topY+.08,rz-.19,trim);
  }else if(c.style==='interceptor'){
    // Capó nervat i dues aletes aerodinàmiques a la coberta de popa.
    for(const x of [-.54,-.32,-.10,.12,.34,.56])
      box(.045,.065,.80,x,1.43,-2.48,trim);
    for(const side of [-1,1]){
      const fin=quad([[side*1.22,1.40,.69],[side*1.26,1.43,2.04],
        [side*1.17,1.95,1.91],[side*1.09,1.70,.84]],paint);
      fin.userData.styleFin=true;
      beam([side*1.26,1.43,2.04],[side*1.17,1.95,1.91],.025,trim);
    }
  }else if(c.style==='command'){
    // Equip de comandament i electrònica; vidres més grans per la cabina elevada.
    box(.56,.12,.47,0,topY+.09,rz-.02,trim);
    box(.44,.055,.31,0,topY+.16,rz-.02,silver);
    for(const side of [-1,1]){
      beam([side*.66,topY+.05,rz-.06],[side*.85,topY+.64,rz+.07],.025,trim);
      ball(.04,side*.85,topY+.64,rz+.07,orange);
    }
    box(.50,.32,.35,.70,1.56,1.36,trim);
    for(let i=0;i<4;i++)box(.07,.018,.20,.48+i*.14,1.73,1.36,silver);
  }else{
    // Versió refinada: només les escotilles i la banqueta originals.
    box(.38,.075,.29,0,1.77,.82,roof);
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
  // Totes les variants són monomotor, tal com el model 3.
  buildFan(0,c.style==='command'?2.60:2.48,2.28,c.radius,'open');
  // Antena, llum taronja i detalls de maniobra.
  beam([-.42,topY+.03,rz-.23],[-.48,topY+1.13,rz-.33],.019,dark);
  ball(.044,-.48,topY+1.13,rz-.33,silver);
  box(.14,.11,.13,.47,topY+.10,rz-.21,orange);
  for(const side of [-1,1]){
    box(.18,.075,.09,side*.83,1.28,-2.81,dark);
  }
  root.userData={concept:c,rotors,windowPanes,cockpitSeats,canopyRoof,
    seatStations:[new THREE.Vector3(-.235,baseY+.20,-.90),new THREE.Vector3(.235,baseY+.20,-.90)],
    steeringStation:new THREE.Vector3(-.235,baseY+.50,-1.65),
    skirtFilamentsRemoved:true,animate(time){
    for(let i=0;i<rotors.length;i++)rotors[i].rotation.z=time*19*(i%2? -1:1);
  }};
  return root;
}
