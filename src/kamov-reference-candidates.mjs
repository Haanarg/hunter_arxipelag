// Original low-poly geometry, based on photographs linked in the lab catalogue.
// Nose = -Z, metres before the lab's uniform comparison scale. No external assets.
export const KAMOV_VERSION='kamov-20261113-ka60-open-doors-2';
export function createKamovCandidate(T,type){
 if(!['ka60','ka52'].includes(type))throw new Error('Kamov desconegut: '+type);
 const combat=type==='ka52',root=new T.Group();
 root.name=combat?'Kamov Ka-52 · candidat 1':'Kamov Ka-60 · candidat 1';
 root.userData.kamovCandidate=type;
 const c={body:combat?0x63725b:0x536655,top:0x75816b,dark:0x252c2c,metal:0x727a76,glass:0x789da5,light:0xe4ddbc,beacon:0xcb5148,navGreen:0x538e74};
 const materials=new Map();
 const material=(color,glass=false)=>{
  const key=color+':'+glass;
  if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:glass?.17:.83,metalness:glass?.08:.12,flatShading:true,side:T.DoubleSide,transparent:glass,opacity:glass?.36:1,depthWrite:!glass}));
  return materials.get(key);
 };
 const mesh=(g,name,geo,color=c.body,glass=false)=>{const m=new T.Mesh(geo,material(color,glass));m.name=name;m.castShadow=!glass;m.receiveShadow=true;g.add(m);return m};
 const box=(g,name,w,h,d,x,y,z,col=c.body)=>{const m=mesh(g,name,new T.BoxGeometry(w,h,d),col);m.position.set(x,y,z);return m};
 const cyl=(g,name,r,d,x,y,z,col=c.dark,axis='y',segments=12)=>{const m=mesh(g,name,new T.CylinderGeometry(r,r,d,segments),col);m.position.set(x,y,z);if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;return m};
 const rod=(g,name,a,b,r=.03,col=c.dark)=>{const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p);const m=cyl(g,name,r,v.length(),0,0,0,col);m.position.copy(p.add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m};
 const poly=(g,name,pts,col=c.body,glass=false)=>{const data=[];for(let i=1;i<pts.length-1;i++)data.push(...pts[0],...pts[i],...pts[i+1]);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data,3));geo.computeVertexNormals();return mesh(g,name,geo,col,glass)};
 // Loft facetat: els vidres substitueixen la xapa, i les obertures
 // laterals són buits REALS, sense cares ocultes al darrere.
 // Rings: [z, half-width, bottom, top]. Angles des de l'espatlla dreta.
 const ring=s=>Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return [Math.cos(a)*s[1],(s[2]+s[3])/2+Math.sin(a)*(s[3]-s[2])/2,s[0]]});
 // Finestra reduïda: quatre tires de carrosseria envolten el vidre.
 // No pintem una finestra damunt d'una paret opaca.
 const smallWindow=(g,name,pts,col)=>{
  const mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
  const at=(u,v)=>mix(mix(pts[0],pts[1],u),mix(pts[3],pts[2],u),v);
  const inner=[at(.17,.21),at(.83,.21),at(.83,.79),at(.17,.79)];
  poly(g,name+' marc longitudinal A',[pts[0],pts[1],inner[1],inner[0]],col);
  poly(g,name+' marc longitudinal B',[inner[3],inner[2],pts[2],pts[3]],col);
  poly(g,name+' xapa anterior',[pts[0],inner[0],inner[3],pts[3]],col);
  poly(g,name+' xapa posterior',[inner[1],pts[1],pts[2],inner[2]],col);
  poly(g,'Vidre reduït '+name,inner,c.glass,true);
  for(let n=0;n<4;n++)rod(g,'Marc petit '+name,inner[n],inner[(n+1)%4],.023,c.dark);
 };
 const loft=(g,name,sections,windowPanel=()=>false,col=c.body)=>{
  const rings=sections.map(ring);
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<12;k++){
   const points=[rings[j][k],rings[j+1][k],rings[j+1][(k+1)%12],rings[j][(k+1)%12]];
   const state=windowPanel(j,k);
   if(state==='open')continue;
   if(state==='small-glass'){smallWindow(g,name+' '+j+' '+k,points,col);continue}
   const glazed=state===true;
   poly(g,glazed?'Vidre '+name+' '+j+' '+k:name+' panell '+j+' '+k,points,glazed?c.glass:col,glazed);
   if(glazed)for(let n=0;n<4;n++)rod(g,'Marc '+name,points[n],points[(n+1)%4],.027,c.dark);
  }
  poly(g,name+' tapa frontal',rings[0].slice().reverse(),col);poly(g,name+' tapa posterior',rings.at(-1),col);
 };
 const fin=(name,profile,thickness,x=0,col=c.body)=>{
  const shape=new T.Shape(profile.map(([z,y])=>new T.Vector2(z,y)));
  const geo=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});geo.rotateY(-Math.PI/2);geo.translate(x+thickness/2,0,0);
  return mesh(root,name,new T.BufferGeometry().copy(geo),col);
 };
 const wheel=(x,y,z,r)=>{
  const g=new T.Group();g.name='Roda tren aterratge';g.position.set(x,y,z);root.add(g);
  cyl(g,'Pneumàtic',r,.23,0,0,0,c.dark,'x',16);cyl(g,'Llanta',r*.57,.245,0,0,0,c.metal,'x');
  rod(root,'Amortidor tren',[x,y+.08,z],[x*(combat?.52:.78),1.22,z-.16],.052,c.metal);
  rod(root,'Tirant tren',[x,y+.12,z],[x*.58,1.10,z+.40],.035,c.dark);
 };
 const seat=(x,z,y=1.25)=>{
  box(root,'Coixí seient',.45,.13,.48,x,y,z,c.dark);
  box(root,'Respatller seient',.45,.59,.13,x,y+.28,z+.25,c.dark);
  box(root,'Reposacaps',.26,.19,.13,x,y+.68,z+.26,c.dark);
 };
 const cockpit=(z,y)=>{
  for(const x of [-.49,.49]){seat(x,z,y);rod(root,'Palanca cíclic',[x,y-.05,z-.28],[x,y+.30,z-.40],.025,c.dark)}
  box(root,'Tauler cabina',1.45,.20,.29,0,y+.32,z-.65,c.dark);
  for(const x of [-.43,.43])box(root,'Pantalla instruments',.29,.12,.025,x,y+.35,z-.495,0x304a4c);
 };
 const mainRotor=(height,count,radius,sign)=>{
  const group=new T.Group();group.name=sign>0?'Rotor principal inferior':'Rotor principal superior';group.position.set(0,height,0);group.userData.kamovRotor={axis:'y',speed:sign*9};root.add(group);
  cyl(group,'Boixa rotor',.24,.17,0,0,0,c.metal);
  for(let i=0;i<count;i++){
   const blade=new T.Group();blade.name='Pala principal '+(i+1);blade.rotation.y=i*Math.PI*2/count+(sign<0?.40:0);group.add(blade);
   rod(blade,'Articulació pala',[.15,0,0],[.9,0,0],.055,c.metal);
   const shape=new T.Shape([new T.Vector2(.75,-.15),new T.Vector2(radius-.28,-.20),new T.Vector2(radius,-.06),new T.Vector2(radius,.14),new T.Vector2(1.1,.21)]);
   const geo=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false});geo.rotateX(-Math.PI/2);
   mesh(blade,'Superfície pala',new T.BufferGeometry().copy(geo),c.dark);
   box(blade,'Punta pala',.18,.037,.29,radius-.13,.018,-.005,0x969e8b);
  }
  return group;
 };
 if(!combat){
  // Ka-60 prototype: 4 main blades, 11-blade fenestron, no coaxial mast.
  loft(root,'Fuselatge Ka-60',[
   [-4.50,.13,1.30,1.65],[-4.05,.65,1.02,2.03],[-3.30,.97,.91,2.57],[-2.30,1.10,.83,3.01],
   [-1.15,1.11,.82,3.06],[.40,1.11,.83,3.02],[1.85,.97,.90,2.78],[3.15,.62,1.13,2.36]
  ],(j,k)=>{
   // Dues portes de transport obertes: buidam els quatre panells laterals
   // (superiors i inferiors) en els dos trams de la zona de passatgers.
   if((j===4||j===5)&&[0,5,6,11].includes(k))return 'open';
   // Parabrisa i finestres de pilot més compactes, amb xapa al voltant.
   if(j===1&&[1,2,3,4].includes(k)||
      (j===2||j===3)&&[0,5].includes(k))return 'small-glass';
   return false;
  });
  loft(root,'Botaló Ka-60',[[2.85,.65,1.16,2.4],[4.65,.39,1.32,2.02],[6.75,.25,1.40,1.92],[6.87,.25,1.39,1.93]]);
  cockpit(-2.65,1.34);
  for(const x of [-.64,.64])for(const z of [-.2,.65,1.45])seat(x,z,1.16);
  box(root,'Terra cabina',1.75,.07,4.0,0,1.01,-.40,c.dark);
  // Marc de les dues grans obertures: només llindar, muntants i llinda.
  // No hi ha cap porta opaca ni vidre al centre; els sis seients són visibles.
  const doorSections=[[-1.15,1.11,.82,3.06],[.40,1.11,.83,3.02],[1.85,.97,.90,2.78]];
  for(const side of [-1,1]){
   const edge=(s,upper)=>[side*s[1]*Math.cos(Math.PI/6),
     (s[2]+s[3])/2+(upper?1:-1)*(s[3]-s[2])/4,s[0]];
   const upper=doorSections.map(s=>edge(s,true)),lower=doorSections.map(s=>edge(s,false));
   for(let i=0;i<2;i++){
    rod(root,'Llinda porta lateral oberta',upper[i],upper[i+1],.035,c.dark);
    rod(root,'Llindar porta lateral oberta',lower[i],lower[i+1],.035,c.dark);
   }
   for(const i of [0,2])rod(root,'Muntant porta lateral oberta',lower[i],upper[i],.040,c.body);
   box(root,'Esglaó accés porta oberta',.16,.065,2.62,side*.94,.99,.40,c.dark);
  }
  // Carenat dorsal continu: un sol conjunt aerodinàmic, no dues nacel·les
  // cilíndriques damunt de la cabina. El pal de rotor hi queda encastat.
  loft(root,'Carenat dorsal motor Ka-60',[
   [-1.73,.47,2.58,3.09],[-1.12,.76,2.61,3.40],[-.38,.85,2.62,3.54],
   [.49,.84,2.58,3.49],[1.27,.69,2.54,3.20],[2.10,.46,2.42,2.81]
  ],()=>false,c.top);
  for(const side of [-1,1]){
   cyl(root,'Entrada aire motor amb contorn',.26,.09,side*.64,2.96,-1.22,c.body,'z',16);
   cyl(root,'Boca fosca entrada aire',.20,.105,side*.64,2.96,-1.274,c.dark,'z',16);
   cyl(root,'Tub escapament dorsal',.20,.47,side*.68,2.85,1.71,c.dark,'z',14);
   cyl(root,'Cèrcol escapament',.225,.06,side*.68,2.85,1.96,c.metal,'z',14);
   for(let i=0;i<3;i++)
    box(root,'Lama refrigeració superior',.27,.025,.045,side*.35,3.30-i*.015,.66+i*.14,c.dark);
   poly(root,'Estabilitzador horitzontal inferior',[
    [side*.27,1.79,5.10],[side*1.50,1.79,5.35],
    [side*1.50,1.79,6.05],[side*.27,1.79,5.80]],c.top);
  }
  // Nervi dorsal afuat damunt el botaló i detalls de la deriva del fenestron.
  loft(root,'Espinada superior cua Ka-60',[
   [2.82,.34,2.20,2.43],[4.30,.22,1.91,2.18],
   [6.16,.15,1.75,2.01],[6.79,.13,1.74,2.05]
  ],()=>false,c.top);
  // Duct is an annular solid with a genuine through-hole along X.
  const shape=new T.Shape(),hole=new T.Path();shape.absarc(7.63,1.94,.91,0,Math.PI*2,false);hole.absarc(7.63,1.94,.70,0,Math.PI*2,true);shape.holes.push(hole);
  const duct=new T.ExtrudeGeometry(shape,{depth:.42,steps:1,bevelEnabled:false,curveSegments:18});duct.rotateY(-Math.PI/2);duct.translate(.21,0,0);
  mesh(root,'Conducte fenestron obert',new T.BufferGeometry().copy(duct),c.body);
  fin('Deriva Ka-60',[[7.04,2.61],[7.98,4.08],[8.46,4.08],[8.38,2.31]],.25);
  box(root,'Capçal deriva',.72,.07,.68,0,4.08,8.19,c.top);
  // T de cua de la fotografia: pla horitzontal al CAPDAMUNT de la deriva.
  for(const side of [-1,1]){
   const wing=[[side*.11,3.94,7.93],[side*1.76,3.91,7.86],
               [side*1.92,3.90,8.36],[side*.11,3.94,8.45]];
   poly(root,'Estabilitzador superior en T',wing,c.top);
   poly(root,'Intrados estabilitzador superior',wing.map(p=>[p[0],p[1]-.055,p[2]]).reverse(),c.body);
   rod(root,'Vora atac estabilitzador superior',wing[0],wing[1],.035,c.dark);
   box(root,'Aleta terminal T de cua',.065,.22,.48,side*1.84,3.98,8.10,c.body);
   cyl(root,'Llum posició cua',.055,.035,side*1.85,4.08,8.13,
       side<0?c.beacon:c.navGreen,'y',8);
  }
  rod(root,'Frontissa timó de cua',[0,2.86,8.34],[0,3.99,8.37],.018,c.dark);
  cyl(root,'Balisa superior deriva',.105,.13,0,4.20,8.19,c.beacon,'y',10);
  rod(root,'Antena dorsal cua',[0,2.02,5.70],[0,2.44,5.96],.018,c.metal);
  const tail=new T.Group();tail.name='Rotor fenestron';tail.position.set(0,1.94,7.63);tail.userData.kamovRotor={axis:'x',speed:19};root.add(tail);
  cyl(tail,'Boixa fenestron',.16,.49,0,0,0,c.metal,'x');
  for(let i=0;i<11;i++){const blade=box(tail,'Pala fenestron',.08,.53,.095,0,Math.cos(i*Math.PI*2/11)*.40,Math.sin(i*Math.PI*2/11)*.40,c.dark);blade.rotation.x=i*Math.PI*2/11}
  wheel(-1.15,.35,-2.22,.35);wheel(1.15,.35,-2.22,.35);
  // Roda posterior sota el botaló: l'amortidor entra realment a la cua.
  const rearGear=new T.Group();rearGear.name='Roda tren aterratge';
  rearGear.position.set(0,.38,3.84);root.add(rearGear);
  cyl(rearGear,'Pneumàtic',.28,.23,0,0,0,c.dark,'x',16);
  cyl(rearGear,'Llanta',.16,.245,0,0,0,c.metal,'x',16);
  rod(root,'Amortidor tren posterior ancorat',[0,.45,3.84],[0,1.48,4.05],.065,c.metal);
  for(const side of [-1,1])
   rod(root,'Tirant tren posterior al botaló',[0,.70,3.81],[side*.24,1.36,3.48],.041,c.dark);
  box(root,'Carenat fixació tren posterior',.34,.23,.62,0,1.25,3.93,c.body);
  cyl(root,'Eix rotor principal',.105,.75,0,3.48,0,c.metal);mainRotor(3.91,4,6.75,1);
  rod(root,'Pitot',[-.35,1.55,-4.12],[-.35,1.55,-4.91],.018,c.metal);
 }else{
  // Ka-52: wide side-by-side canopy, flattened radar nose, short stub wings.
  loft(root,'Fuselatge Ka-52',[
   [-5.45,.20,1.31,1.60],[-4.95,.84,1.02,1.90],[-3.75,1.12,.96,2.08],[-2.70,1.17,.94,2.85],
   [-1.55,1.14,.93,3.02],[-.15,1.03,.89,2.90],[1.70,.91,.98,2.67],[3.30,.52,1.24,2.09]
  ],(j,k)=>j===2&&[0,1,2,3,4,5].includes(k)||j===3&&[0,1,4,5].includes(k));
  loft(root,'Botaló Ka-52',[[2.85,.57,1.20,2.17],[4.90,.35,1.38,1.95],[7.30,.20,1.53,1.88],[8.48,.13,1.60,1.83]]);
  cockpit(-2.63,1.32);box(root,'Terra cabina',1.86,.08,2.0,0,1.04,-2.70,c.dark);
  for(const side of [-1,1]){
   const engine=new T.Group();engine.name='Motor lateral Ka-52';engine.position.x=side*1.02;root.add(engine);
   loft(engine,'Nacel·la motor',[[-1.25,.40,2.13,2.91],[-.65,.43,2.05,3.02],[1.15,.40,2.11,2.94],[1.90,.32,2.15,2.76]]);
   cyl(engine,'Entrada aire',.34,.06,0,2.56,-1.27,c.dark,'z',16);
   cyl(engine,'Escapament',.27,.46,0,2.49,1.96,c.dark,'z');
   const wing=new T.Group();wing.name='Ala curta '+side;root.add(wing);
   const a=[side*.86,1.91,-.30],b=[side*3.64,1.83,.20],d=[side*.86,1.88,1.15],e=[side*3.64,1.79,1.00];
   const upper=[a,b,e,d],lower=upper.map(p=>p.map((v,i)=>i===1?v-.14:v));
   poly(wing,'Ala superior',upper,c.top);poly(wing,'Ala inferior',lower.slice().reverse(),c.body);
   for(let i=0;i<4;i++)poly(wing,'Cantell ala',[upper[i],lower[i],lower[(i+1)%4],upper[(i+1)%4]],c.body);
   rod(wing,'Vora atac ala',a,b,.055,c.body);
   for(const x of [2.10,3.02]){
    box(wing,'Piló',.14,.36,.62,side*x,1.62,.51,c.body);
    if(x<2.5){
     cyl(wing,'Contenidor coets',.29,1.70,side*x,1.23,.12,c.metal,'z',16);
     cyl(wing,'Frontal contenidor',.27,.025,side*x,1.23,-.74,c.dark,'z',16);
     for(let i=0;i<7;i++){const t=i*Math.PI*2/7;cyl(wing,'Boca tub coet',.050,.035,side*x+Math.cos(t)*.17,1.23+Math.sin(t)*.17,-.765,c.metal,'z',8)}
    }else for(const y of [1.16,1.42])for(const dx of [-.13,.13])cyl(wing,'Tub míssil',.075,1.82,side*x+dx,y,.10,c.dark,'z',8);
   }
   box(wing,'Contenidor punta ala',.23,.27,.93,side*3.59,1.93,.63,c.body);
   poly(root,'Estabilitzador cua',[[side*.23,1.77,5.53],[side*1.52,1.77,6.01],[side*1.52,1.77,6.65],[side*.23,1.77,6.26]],c.top);
   wheel(side*1.55,.43,1.50,.43);
  }
  fin('Deriva Ka-52',[[6.60,1.66],[7.46,3.66],[8.14,3.66],[8.49,1.65]],.23);
  // Nose EO sphere and side cannon are characteristic asymmetric equipment.
  const sensor=mesh(root,'Bola electroòptica',new T.SphereGeometry(.34,12,8),c.metal);sensor.position.set(0,.89,-4.40);
  for(const x of [-.13,.13])cyl(root,'Lent electroòptica',.085,.04,x,.91,-4.70,0x243b41,'z');
  box(root,'Suport canó lateral dret',.22,.30,.62,1.15,1.23,-1.15,c.dark);
  rod(root,'Canó lateral dret',[1.25,1.25,-1.10],[1.25,1.25,-3.60],.046,c.dark);
  wheel(-.13,.29,-3.85,.29);wheel(.13,.29,-3.85,.29);
  cyl(root,'Eix coaxial',.12,2.03,0,3.84,0,c.metal);
  cyl(root,'Transmissió coaxial',.24,.48,0,3.50,0,c.body);
  mainRotor(3.87,3,7.25,1);mainRotor(4.85,3,7.25,-1);
  for(const side of [-1,1])rod(root,'Pitot frontal',[side*.8,1.98,-3.75],[side*.8,2.04,-4.49],.018,c.dark);
 }
 root.userData.referenceVersion=KAMOV_VERSION;
 root.userData.rotorDiameter=combat?14.5:13.5;
 root.userData.crewSeats=2;
 return root;
}
// Discover by serializable tags, so imported JSON and symmetry clones still animate.
export function stepKamovRotors(model,dt){
 if(!model||!Number.isFinite(dt)||dt<=0)return;
 model.traverse(node=>{const rotor=node.userData?.kamovRotor;if(rotor)node.rotation[rotor.axis]=(node.rotation[rotor.axis]+rotor.speed*Math.min(dt,.1))%(Math.PI*2)});
}
