// Shared C1 body; the default configuration is the in-game C1A.
const C1A={id:'C1A',name:'Maleter clàssic',description:'C1 original depurat: maleter baix, passadors interiors foscos i cromats fins.',length:5.75,width:2.92,roofY:2.73,roofFront:-.82,roofRear:2.02,frontBase:-1.37,rearBase:2.26,beltY:1.75,rWheel:.70,rArch:.83,trim:0xcbd0c7,upholstery:0x6e5743,rack:false,rails:false,cargoY:1.06,liner:0x414440,cargo:0x494e49,bumper:0xcbd0c7};
export function createCivilianCarModel(THREE,color=0x4b9fd1,q=C1A,decorate=null,accessories=null){
 const g=new THREE.Group();g.name='hunter-civil-family-iteration-'+q.id;
 const L=q.length,W=q.width,hw=W/2,top=q.roofY,belt=q.beltY;
 // Els C1A aprovats no canvien. El candidat del laboratori redueix
 // l'amplada del sostre i inclina tota la superfície envidrada.
 const roofInset=Math.max(0,Math.min(.4,q.roofInset||0));
 const insetAtY=y=>roofInset*Math.max(0,Math.min(1,(y-belt)/(top-belt)));
 const frontZ=-L/2,rearZ=L/2;
 const wheelFront=-L*.33,wheelRear=L*.33,wheelY=.72,wheelR=q.rWheel,archR=q.rArch;
 const rim=q.trim,paint=color,black=0x252b2c,interior=0x303539,glassTint=0x8ac6d7;
 const materials=new Map();
 function mat(c,type='paint'){
  const key=c+':'+type;
  if(!materials.has(key)){
   const m=new THREE.MeshStandardMaterial({
    color:c,roughness:type==='glass'?.10:type==='rubber'?.94:type==='metal'?.31:.7,
    metalness:type==='metal'?.72:type==='paint'?.14:0,
    flatShading:type!=='glass'
   });
   if(type==='glass'){m.transparent=true;m.opacity=.23;m.depthWrite=false;m.side=THREE.DoubleSide;}
   materials.set(key,m);
  }
  return materials.get(key);
 }
 const add=(geo,c,type='paint',x=0,y=0,z=0)=>{
  const obj=new THREE.Mesh(geo,mat(c,type));obj.position.set(x,y,z);
  obj.castShadow=true;obj.receiveShadow=true;g.add(obj);return obj;
 };
 const box=(w,h,d,c,x,y,z,type='paint')=>
  add(new THREE.BoxGeometry(w,h,d),c,type,x,y,z);
 function bar(a,b,r,c,type='metal',segments=7){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),
        delta=end.clone().sub(start);
  const m=add(new THREE.CylinderGeometry(r,r,delta.length(),segments),c,type);
  m.position.copy(start.add(end).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  return m;
 }
 const panel=(points,x,c,type='glass')=>{
  // Plano vertical (z,y) -> coordenadas del món (x,y,z).
  const shape=new THREE.Shape();
  points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));
  shape.closePath();
  const geo=new THREE.ShapeGeometry(shape);
  geo.rotateY(-Math.PI/2);
  const m=add(geo,c,type,x,0,0);
  m.material.side=THREE.DoubleSide;
  if(type==='glass')m.renderOrder=6;
  return m;
 };
 const face=(points,c,type='glass')=>{
  // Quatre punts 3D en ordre, sense superfícies fictícies al darrere.
  const positions=[];
  for(const idx of [0,1,2,0,2,3])positions.push(...points[idx]);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.computeVertexNormals();
  const m=add(geo,c,type);
  m.material.side=THREE.DoubleSide;
  if(type==='glass')m.renderOrder=6;
  return m;
 };
 function wheel(z,side){
  const x=side*(hw-.28),steering=new THREE.Group(),
        axle=new THREE.Group();
  // La direcció gira al voltant de Y, el pneumàtic roda sobre X.
  // Mai animam tots dos eixos al mateix Object3D: això feia ballar
  // les rodes davanteres en combinar velocitat i gir.
  steering.position.set(x,wheelY,z);g.add(steering);
  steering.add(axle);
  axle.userData.radius=wheelR;
  const rubber=mat(0x202428,'rubber');
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(wheelR,wheelR,.38,18,1),rubber);
  tire.rotation.z=Math.PI/2;axle.add(tire);
  const hubMat=mat(0xd6d9d5,'metal');
  for(const s of [-1,1]){
   const hub=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.015,14),hubMat);
   hub.rotation.z=Math.PI/2;hub.position.x=s*.2;axle.add(hub);
   const center=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.024,12),mat(0x757f83,'metal'));
   center.rotation.z=Math.PI/2;center.position.x=s*.216;axle.add(center);
   for(let a=0;a<6;a++){
    const r=a*Math.PI/3;
    const spoke=new THREE.Mesh(new THREE.BoxGeometry(.025,.32,.046),mat(0x939e9f,'metal'));
    spoke.position.set(s*.223,Math.cos(r)*.24,Math.sin(r)*.24);spoke.rotation.x=-r;axle.add(spoke);
   }
  }
  g.userData.wheels.push(axle);
  if(z<0)g.userData.steeringPivots.push(steering);
 }
 g.userData.wheels=[];
 g.userData.steeringPivots=[];
 // Bastidor interior més estret que la via. Cap caixa massissa tapa les rodes.
 box(W-1.13,.19,L-.42,0x303737,0,.60,0,'metal');
 box(W-.56,.11,L-.48,0x444a49,0,.75,0,'metal');
 for(const z of [wheelFront,wheelRear])for(const side of[-1,1])wheel(z,side);
 // Els laterals són malles amb un retall REAL: l'arc forma part del
 // contorn inferior. No hi ha cap xapa rectangular al darrere.
 for(const side of[-1,1]){
  const sideShape=new THREE.Shape();
  sideShape.moveTo(frontZ,.72);
  for(const center of [wheelFront,wheelRear]){
   sideShape.lineTo(center-archR,.72);
   sideShape.absarc(center,.72,archR,Math.PI,0,true);
  }
  sideShape.lineTo(rearZ,.72);
  sideShape.lineTo(rearZ,belt);
  sideShape.lineTo(frontZ,belt);
  sideShape.closePath();
  const geo=new THREE.ExtrudeGeometry(sideShape,{
   depth:.075,bevelEnabled:false,curveSegments:12
  });
  geo.rotateY(-Math.PI/2);
  // Extreu cap a l'interior de la carroceria: la roda queda
  // pràcticament arran del lateral però mai fora de l'amplada.
  const panelX=side>0?hw:-hw+.075;
  const m=add(geo,paint,'paint',panelX,0,0);
  m.name='lateral-retallat-'+side;
  // Portes netes, sense barres verticals ni motllures horitzontals
  // a la xapa. Només hi queden les manetes petites i discretes.
  for(const z of[-.58,1.03]){
   const handle=box(.041,.047,.22,rim,side*(hw+.051),1.58,z-.17,'metal');
   handle.name='maneta-porta-'+side+'-'+z;
  }
 }
 // Capó i portó posterior estan al nivell de la cintura i no creuen rodes.
 const hoodEnd=q.frontBase-.055,tailStart=q.rearBase+.08;
 const hoodLength=hoodEnd-frontZ;
 box(W-.095,.12,hoodLength,paint,0,belt-.01,(frontZ+hoodEnd)/2);
 box(W-.075,.12,rearZ-tailStart,paint,0,belt-.01,(rearZ+tailStart)/2);
 box(W-.12,.67,.13,paint,0,1.34,frontZ+.045);
 box(W-.12,.67,.13,paint,0,1.34,rearZ-.045);
 // Interior complet visible: túnel, catifa, quadre i dos bancs.
 box(W-.32,.065,q.rearBase-q.frontBase+.06,0x292c2b,0,.83,(q.rearBase+q.frontBase)/2);
 box(W-.35,.23,.38,0x333c41,0,1.56,q.frontBase+.20,'metal');
 box(W*.33,.035,.18,0x646960,0,1.77,q.frontBase+.26);
 box(.21,.20,.24,0x677978,-W*.23,1.72,q.frontBase+.25);
 box(.28,.055,.31,0x1c2226,W*.20,1.71,q.frontBase+.25,'rubber');
 const wheelCentre=new THREE.Group();
 wheelCentre.position.set(-W*.21,1.65,q.frontBase+.43);
 wheelCentre.rotation.x=-.36;g.add(wheelCentre);
 const steering=new THREE.Mesh(new THREE.TorusGeometry(.275,.047,7,18),mat(0x22272a,'rubber'));
 wheelCentre.add(steering);
 bar([-W*.21,1.47,q.frontBase+.40],[-W*.21,1.65,q.frontBase+.43],.055,0x555c5e,'metal');
 for(const z of [q.frontBase+.77,q.frontBase+2.21]){
  const wide=W*.38;
  for(const side of[-1,1]){
   const seatX=side*(W*.21);
   box(wide,.21,.81,q.upholstery,seatX,1.03,z);
   box(wide,.77,.17,q.upholstery,seatX,1.48,z+.37);
   for(const xOff of[-wide*.32,wide*.32])
     box(.035,.38,.025,0x3e4240,seatX+xOff,1.62,z+.27,'metal');
   box(wide*.58,.22,.18,q.upholstery,seatX,1.92,z+.38);
  }
 }
 // Passos de roda interiors: hem de poder veure la xapa exterior amb
 // els arcs retallats, però des de dins NO s'han de veure els pneumàtics.
 // Cada caixa interior inclou una cara corbada, una tapa superior en forma
 // de semicilindre i dues parets de tancament.
 function wheelHousing(z,side,rear){
  const r=archR+.055,innerX=side*(hw-.67),outerX=side*(hw-.17);
  const innerWall=new THREE.Shape();
  innerWall.moveTo(z-r,wheelY-.02);
  for(let i=0;i<=24;i++){
   const a=Math.PI-i*Math.PI/24;
   innerWall.lineTo(z+Math.cos(a)*r,wheelY+Math.sin(a)*r);
  }
  innerWall.lineTo(z+r,wheelY-.02);
  innerWall.closePath();
  const geo=new THREE.ShapeGeometry(innerWall);
  geo.rotateY(-Math.PI/2);
  const shield=add(geo,q.liner,'interior',innerX,0,0);
  shield.material.side=THREE.DoubleSide;
  shield.name='tapeta-interior-'+(rear?'maleter-':'davantera-')+side;
  const positions=[];
  for(let i=0;i<24;i++){
   const a=Math.PI-i*Math.PI/24,b=Math.PI-(i+1)*Math.PI/24;
   const za=z+Math.cos(a)*r,zb=z+Math.cos(b)*r;
   const ya=wheelY+Math.sin(a)*r,yb=wheelY+Math.sin(b)*r;
   // Dos triangles per fragment de la volta, entre el parament interior
   // i la paret exterior de la carrosseria, sense xapes sota la roda.
   const aa=[innerX,ya,za],ab=[innerX,yb,zb],
         ba=[outerX,ya,za],bb=[outerX,yb,zb];
   positions.push(...aa,...ba,...bb,...aa,...bb,...ab);
  }
  const shellGeo=new THREE.BufferGeometry();
  shellGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  shellGeo.computeVertexNormals();
  const shell=add(shellGeo,q.liner,'interior');
  shell.material.side=THREE.DoubleSide;
  shell.name='volta-pas-roda-'+(rear?'posterior':'davanter')+'-'+side;
  for(const edge of[-1,1]){
   // Tanca visualment els extrems longitudinalment. Queda sota
   // la cintura de la carrosseria, lluny de la superfície del vidre.
   const endPanel=box(Math.abs(innerX-outerX),.25,.055,q.liner,
    (innerX+outerX)/2,wheelY+.115,z+edge*r,'interior');
   endPanel.name='tancament-pas-roda';
  }
 }
 for(const z of[wheelFront,wheelRear])
  for(const side of[-1,1])wheelHousing(z,side,z===wheelRear);

 // Revestiment del maleter: la càrrega queda per sobre de les rodes,
 // i els compartiments laterals fan de passos de roda interiors opacs.
 const loadStart=q.frontBase+2.68,loadEnd=q.rearBase+.05;
 const loadLength=Math.max(.4,loadEnd-loadStart);
 const luggageFloor=box(W-.30,.09,loadLength,q.cargo,0,q.cargoY,
  (loadStart+loadEnd)/2,'interior');
 luggageFloor.name='terra-maleter';
 for(const side of[-1,1]){
  const panel=box(.10,.63,loadLength,q.liner,
   side*(hw-.28),q.cargoY+.30,(loadStart+loadEnd)/2,'interior');
  panel.name='folre-lateral-maleter-'+side;
  box(.17,.075,loadLength,q.cargo,side*(hw-.36),q.cargoY+.60,
   (loadStart+loadEnd)/2,'interior');
 }
 // La porta posterior també té una cara interior opaca: el maleter
 // és un volum real i no un espai obert al darrere del vehicle.
 box(W-.30,.55,.10,q.liner,0,1.34,q.rearBase-.055,'interior').name='interior-porta-maleter';
 if(decorate)decorate({box,q,W,hw,loadStart,loadEnd,loadLength,rim});
 // Darrera gran i practicable, petit llindar; el volum interior és obert.
 box(W-.26,.10,.22,0x3b3f3c,0,.96,q.rearBase-.13);
 // Muntants de l'habitacle. El sostre és únicament una làmina,
 // NO un bloc extruït opac que amagui l'interior.
 const left=-hw+.12,right=hw-.12,roofFront=q.roofFront,roofRear=q.roofRear;
 const roofPanel=box(W-.22-2*roofInset,.105,roofRear-roofFront+.15,paint,0,top+.025,(roofFront+roofRear)/2);
 roofPanel.name='civil-c-roof-panel';
 for(const side of[-1,1]){
  const x=side*(hw-.12),topX=side*(hw-.12-roofInset),outside=side*(hw+.018);
  // Els quatre muntants convergeixen lleugerament cap al sostre.
  for(const [loZ,hiZ] of [[q.frontBase,roofFront],[.30,.30],[1.47,1.47],[q.rearBase,roofRear]]){
   const bottom=[x,belt,loZ],upper=[topX,top,hiZ];
   bar(bottom,upper,.055,paint);
  }
  bar([topX,top,roofFront],[topX,top,roofRear],.059,paint);
  bar([x,belt,q.frontBase],[x,belt,q.rearBase],.045,paint);
  // Els vidres segueixen el mateix pla inclinat que els muntants:
  // una geometria 3D, no un panell vertical separat del marc.
  const windows=[
   [[q.frontBase+.10,belt+.09],[roofFront+.08,top-.11],[.24,top-.11],[.24,belt+.09]],
   [[.36,belt+.09],[.36,top-.11],[1.40,top-.11],[1.40,belt+.09]],
   [[1.53,belt+.09],[1.53,top-.11],[roofRear-.08,top-.11],[q.rearBase-.10,belt+.09]]
  ];
  for(const [i,points] of windows.entries()){
   if(!roofInset){panel(points,outside,glassTint);continue}
   const vertices=points.map(([z,y])=>[outside-side*insetAtY(y),y,z]);
   face(vertices,glassTint).name='civil-c-side-glass-'+side+'-'+i;
  }
  // Mirall separat en comptes d'un panell que tapi el finestral.
  const mirror=box(.21,.20,.34,rim,side*(hw+.15),belt+.23,q.frontBase+.21,'metal');
  mirror.rotation.y=side*.18;
 }
 // Davanter i lluna posterior: quadrilàters en el pla real del vidre.
 const frontGlass=face([
  [left+insetAtY(belt+.12),belt+.12,q.frontBase+.03],[right-insetAtY(belt+.12),belt+.12,q.frontBase+.03],
  [right-insetAtY(top-.12),top-.12,roofFront+.03],[left+insetAtY(top-.12),top-.12,roofFront+.03]
 ],glassTint);
 frontGlass.name='civil-c-front-glass';
 const backGlass=face([
  [left+insetAtY(belt+.10),belt+.10,q.rearBase-.03],[right-insetAtY(belt+.10),belt+.10,q.rearBase-.03],
  [right-insetAtY(top-.12),top-.12,roofRear-.03],[left+insetAtY(top-.12),top-.12,roofRear-.03]
 ],glassTint);
 backGlass.name='civil-c-rear-glass';
 for(const side of[-1,1]){
  const bottomX=side*(hw-.12),upperX=side*(hw-.12-roofInset);
  bar([bottomX,belt,q.frontBase],[upperX,top,roofFront],.06,paint);
  bar([bottomX,belt,q.rearBase],[upperX,top,roofRear],.06,paint);
 }
 // Graella, llums i pilots amb separació profunda de les cares.
 box(W*.64,.33,.075,0x445156,0,1.34,frontZ-.11,'metal');
 for(let i=-3;i<=3;i++)box(.047,.28,.035,rim,i*.19,1.34,frontZ-.175,'metal');
 for(const side of [-1,1]){
  box(.49,.34,.07,0xe4e7cd,side*W*.34,1.47,frontZ-.123);
  box(.24,.18,.075,0xe2a33f,side*W*.39,1.19,frontZ-.126);
  box(.44,.33,.078,0xc3332b,side*W*.36,1.45,rearZ+.124);
 }
 // Para-xocs: caixa pròpia, 13 cm d'aire des de la carrosseria.
 // Cap superfície coplanària, per tant sense z-fighting.
 for(const sign of[-1,1]){
  const z=sign*(L/2+.245);
  const bumper=box(W+.19,.21,.18,rim,0,.99,z,'metal');
  bumper.name='paraxocs-separat-'+(sign<0?'davant':'darrere');
  for(const side of[-1,1])
   box(.14,.33,.22,0x3b4141,side*W*.30,.99,z,'rubber');
 }
 if(accessories)accessories({box,bar,q,W,hw,L,top,roofFront,roofRear,rim});
 g.userData.civilianVariant=q.id;
 g.userData.wheelHousings=true;
 g.userData.hasTrunkLining=true;
 g.userData.noDoorMouldings=true;
 g.userData.civilianColor=color;
 g.userData.hasTransparentGlass=true;
 g.userData.hasWheelArchCutouts=true;
 g.userData.hasVisibleInterior=true;
 return g;
}

/** Només laboratori: no modifica el C1A de producció fins a l'aprovació. */
export function createCivilianCarRoofCandidate(THREE,color=0x4b9fd1){
 const model=createCivilianCarModel(THREE,color,{...C1A,roofInset:.15});
 model.name='hunter-civil-c1a-narrow-roof-candidate';
 model.userData.roofInset=.15;
 model.userData.labOnly=true;
 return model;
}
