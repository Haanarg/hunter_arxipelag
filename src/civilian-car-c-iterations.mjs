// Iteració del familiar C: quatre maquetes de comparació.
 // Només previsualització: no altera el model C actual del joc.
export const FAMILY_C_ITERATIONS=Object.freeze([
 Object.freeze({id:'C1',name:'Familiar clàssic',description:'Silueta setantera, muntants fins, cromats discrets i dues banquetes. Passos de roda nets.',length:5.75,width:2.92,roofY:2.73,roofFront:-.82,roofRear:2.02,frontBase:-1.37,rearBase:2.26,beltY:1.75,rWheel:.70,rArch:.83,trim:0xcbd0c7,upholstery:0x6e5743,rack:false,rails:false}),
 Object.freeze({id:'C2',name:'Familiar quadrat',description:'Habitacle més alt, darrere molt vertical i vidres panoràmics. Interior de tela clara.',length:5.74,width:2.92,roofY:2.88,roofFront:-1.02,roofRear:2.18,frontBase:-1.33,rearBase:2.32,beltY:1.76,rWheel:.70,rArch:.83,trim:0xbfc6c1,upholstery:0x8b8171,rack:true,rails:false}),
 Object.freeze({id:'C3',name:'Familiar elegant',description:'Sostre més baix, parabrisa inclinat, cromats fins i tapisseria color vi.',length:5.93,width:2.90,roofY:2.59,roofFront:-.82,roofRear:1.83,frontBase:-1.51,rearBase:2.30,beltY:1.75,rWheel:.71,rArch:.83,trim:0xe0dcd0,upholstery:0x744f55,rack:false,rails:true}),
 Object.freeze({id:'C4',name:'Familiar utilitari',description:'Línies rectes, passos de roda generosos i para-xocs senzills. Interior resistent.',length:5.70,width:2.95,roofY:2.85,roofFront:-.96,roofRear:2.24,frontBase:-1.28,rearBase:2.36,beltY:1.78,rWheel:.71,rArch:.88,trim:0x919e9d,upholstery:0x536765,rack:true,rails:true})
]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createFamilyCIteration(THREE,variant=0,color=0x4b9fd1){
 const q=FAMILY_C_ITERATIONS[clamp(variant|0,0,3)];
 const g=new THREE.Group();g.name='hunter-civil-family-'+q.id;
 const L=q.length,W=q.width,hw=W/2,top=q.roofY,belt=q.beltY;
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
  const x=side*(hw-.28),pivot=new THREE.Group();
  pivot.position.set(x,wheelY,z);g.add(pivot);
  const rubber=mat(0x202428,'rubber');
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(wheelR,wheelR,.38,18,1),rubber);
  tire.rotation.z=Math.PI/2;pivot.add(tire);
  const hubMat=mat(0xd6d9d5,'metal');
  for(const s of [-1,1]){
   const hub=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.015,14),hubMat);
   hub.rotation.z=Math.PI/2;hub.position.x=s*.2;pivot.add(hub);
   const center=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.024,12),mat(0x757f83,'metal'));
   center.rotation.z=Math.PI/2;center.position.x=s*.216;pivot.add(center);
   for(let a=0;a<6;a++){
    const r=a*Math.PI/3;
    const spoke=new THREE.Mesh(new THREE.BoxGeometry(.025,.32,.046),mat(0x939e9f,'metal'));
    spoke.position.set(s*.223,Math.cos(r)*.24,Math.sin(r)*.24);spoke.rotation.x=-r;pivot.add(spoke);
   }
  }
  g.userData.wheels.push(pivot);
  if(z<0)g.userData.steeringPivots.push(pivot);
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
  // Vores reals de les portes per damunt dels arcs, no cap parafang.
  for(const z of[-.55,1.07]){
   box(.025,.37,.035,0x334044,side*(hw+.008),1.49,z,'metal');
   box(.048,.055,.24,rim,side*(hw+.038),1.60,z-.20,'metal');
  }
  box(.034,.055,L*.70,rim,side*(hw+.027),1.16,0,'metal');
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
 // Darrera gran i practicable, petit llindar; el volum interior és obert.
 box(W-.26,.10,.22,0x3b3f3c,0,.96,q.rearBase-.13);
 // Muntants de l'habitacle. El sostre és únicament una làmina,
 // NO un bloc extruït opac que amagui l'interior.
 const left=-hw+.12,right=hw-.12,roofFront=q.roofFront,roofRear=q.roofRear;
 const roofPanel=box(W-.22,.105,roofRear-roofFront+.15,paint,0,top+.025,(roofFront+roofRear)/2);
 roofPanel.name='civil-c-roof-panel';
 for(const side of[-1,1]){
  const x=side*(hw-.12),outside=side*(hw+.018);
  // Muntants A, B, C i D, amb finestres reals entre ells.
  for(const [loZ,hiZ] of [[q.frontBase,roofFront],[.30,.30],[1.47,1.47],[q.rearBase,roofRear]]){
   const bottom=[x,belt,loZ],upper=[x,top,hiZ];
   bar(bottom,upper,.055,paint);
  }
  bar([x,top,roofFront],[x,top,roofRear],.059,paint);
  bar([x,belt,q.frontBase],[x,belt,q.rearBase],.045,paint);
  // Tres finestrals laterals amb trasparència física (opacity i depthWrite).
  const windows=[
   [[q.frontBase+.10,belt+.09],[roofFront+.08,top-.11],[.24,top-.11],[.24,belt+.09]],
   [[.36,belt+.09],[.36,top-.11],[1.40,top-.11],[1.40,belt+.09]],
   [[1.53,belt+.09],[1.53,top-.11],[roofRear-.08,top-.11],[q.rearBase-.10,belt+.09]]
  ];
  for(const points of windows)panel(points,outside,glassTint);
  // Mirall separat en comptes d'un panell que tapi el finestral.
  const mirror=box(.21,.20,.34,rim,side*(hw+.15),belt+.23,q.frontBase+.21,'metal');
  mirror.rotation.y=side*.18;
 }
 // Davanter i lluna posterior: quadrilàters en el pla real del vidre.
 const frontGlass=face([
  [left,belt+.12,q.frontBase+.03],[right,belt+.12,q.frontBase+.03],
  [right,top-.12,roofFront+.03],[left,top-.12,roofFront+.03]
 ],glassTint);
 const backGlass=face([
  [left,belt+.10,q.rearBase-.03],[right,belt+.10,q.rearBase-.03],
  [right,top-.12,roofRear-.03],[left,top-.12,roofRear-.03]
 ],glassTint);
 for(const x of[left,right]){
  bar([x,belt,q.frontBase],[x,top,roofFront],.06,paint);
  bar([x,belt,q.rearBase],[x,top,roofRear],.06,paint);
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
 // Diferències visibles entre les quatre iteracions.
 if(q.rack){
  for(const side of[-1,1]){
   bar([side*W*.32,top+.15,roofFront+.40],[side*W*.32,top+.15,roofRear-.27],.045,rim);
  }
  if(variant===3)for(const z of[roofFront+.57,roofRear-.30])
   bar([-W*.32,top+.19,z],[W*.32,top+.19,z],.042,rim);
 }
 if(q.rails){
  box(W*.73,.036,.028,rim,0,top+.087,roofFront+.12,'metal');
  box(W*.73,.036,.028,rim,0,top+.087,roofRear-.12,'metal');
 }
 if(variant===2)for(const side of[-1,1])
  box(.035,.035,L*.32,rim,side*(hw+.031),1.63,.22,'metal');
 if(variant===3){
  for(const sign of[-1,1])box(W*.66,.095,.09,0x424c4b,0,1.06,sign*(L/2+.33),'rubber');
 }
 g.userData.civilianVariant=q.id;
 g.userData.civilianColor=color;
 g.userData.hasTransparentGlass=true;
 g.userData.hasWheelArchCutouts=true;
 g.userData.hasVisibleInterior=true;
 return g;
}
