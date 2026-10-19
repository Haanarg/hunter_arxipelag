// Quatre camions militars 6x6, derivats del model D (expedició).
// Geometria simplificada al nivell visual del joc. Només són previews.
export const truckConcepts=Object.freeze([
  {id:'A',name:'D1 · Expedició clàssica',tag:'Lona verda + 6×6',description:'Sis rodes separades, cabina ampliada i buida amb vidres transparents, lona verda i sense recanvi lateral.',
    cab:0x576b4b,roof:0x45593e,canvas:0x507b48,trim:0x303a2d,top:3.82,style:'classic'},
  {id:'B',name:'D2 · Camuflat de bosc',tag:'Camuflatge + 6×6',description:'Lona en dos tons de verd, bagul d’eines, barres de sostre i equipament d’expedició.',
    cab:0x4d6447,roof:0x41543e,canvas:0x4b7240,trim:0x2a362c,top:3.91,style:'forest'},
  {id:'C',name:'D3 · Patrulla robusta',tag:'Proteccions + 6×6',description:'Sis rodes grans, para-xocs reforçat, protecció dels fars i lona baixa de verd intens.',
    cab:0x465c44,roof:0x394e37,canvas:0x406e3f,trim:0x28362d,top:3.65,style:'patrol'},
  {id:'D',name:'D4 · Expedició llarga',tag:'Lona alta + 6×6',description:'Lona verda més alta, reforços simples, equipament lateral i recanvi per a rutes llargues.',
    cab:0x68744e,roof:0x4e6244,canvas:0x56844d,trim:0x303e32,top:4.03,style:'long'}
]);

export function createTruckConcept(T,variant=0){
 const cfg=truckConcepts[variant];
 if(!cfg)throw new Error('Proposta de camió desconeguda');
 const g=new T.Group();g.name='Camió expedició 6x6 · '+cfg.id;
 const classic=cfg.style==='classic';
 const mat=(hex,metalness=0)=>new T.MeshStandardMaterial({color:hex,roughness:.86,metalness,flatShading:true,side:T.DoubleSide});
 const body=mat(cfg.cab),roof=mat(cfg.roof),trim=mat(cfg.trim,.14),
   tarp=mat(cfg.canvas),tarpDark=mat(new T.Color(cfg.canvas).multiplyScalar(.77).getHex()),
   tarpLight=mat(new T.Color(cfg.canvas).multiplyScalar(1.16).getHex()),
   glass=mat(0x365661,.16),rubber=mat(0x242924),hub=mat(0x717b70,.25),
   silver=mat(0x899288,.2),lamp=mat(0xe7dcae),amber=mat(0xd59645),red=mat(0xa33e36);
 // Material de vidre clar que revela l'interior; no escriu profunditat.
 const transparentGlass=new T.MeshStandardMaterial({
   color:0xaacbd4,roughness:.16,metalness:.02,transparent:true,
   opacity:.32,depthWrite:false,flatShading:true,side:T.DoubleSide
 });
 const seatMat=mat(0x394138),floorMat=mat(0x333b35);

 function part(geometry,material,parent=g){
   const o=new T.Mesh(geometry,material);o.castShadow=o.receiveShadow=true;parent.add(o);return o
 }
 function box(w,h,d,m,x,y,z,parent=g){
   const o=part(new T.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o
 }
 function cyl(r,h,m,x,y,z,parent=g,segments=12){
   const o=part(new T.CylinderGeometry(r,r,h,segments),m,parent);
   o.position.set(x,y,z);o.rotation.z=Math.PI/2;return o
 }
 function rod(a,b,r,m,parent=g){
   const aa=new T.Vector3(...a),bb=new T.Vector3(...b),delta=bb.clone().sub(aa);
   const o=part(new T.CylinderGeometry(r,r,delta.length(),5),m,parent);
   o.position.copy(aa.add(bb).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o
 }
 function face(points,m,parent=g){
   const coords=points.flat(),indices=[];
   for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(coords,3));
   geometry.setIndex(indices);geometry.computeVertexNormals();return part(geometry,m,parent)
 }
 function wheel(x,z){
   const w=new T.Group();w.position.set(x,.82,z);g.add(w);
   cyl(.80,.47,rubber,0,0,0,w);
   cyl(.46,.485,hub,0,0,0,w,10);
   cyl(.20,.50,trim,0,0,0,w,8);
   return w
 }

 // 6x6: un eix davanter i dos eixos posteriors junts.
 const axles=classic?[-2.68,.82,2.80]:[-2.68,1.58,2.73];
 for(const z of axles)for(const x of[-1.63,1.63])wheel(x,z);
 for(const x of[-1.02,1.02])box(.19,.26,7.45,trim,x,1.23,.03);
 for(const z of axles)rod([-1.65,.83,z],[1.65,.83,z],.10,trim);
 box(3.12,.22,4.64,body,0,1.66,1.32); // Pis de càrrega.
 for(const x of[-1.51,1.51])box(.13,.31,4.56,body,x,1.89,1.33);
 for(const x of[-1.19,1.19]){
   box(.57,.42,.89,trim,x,1.29,-.16); // Dipòsits i caixes auxiliars.
   box(.55,.075,.70,silver,x,1.04,-1.13); // Graons.
 }

 // A: cabina de volum realment buit, ampliada cap enrere.
 // Els panells sòlids queden exclusivament a terra, baixos, paret posterior i sostre.
 if(classic){
   const front=-3.66,rear=-1.13,width=3.23,center=(front+rear)/2,length=rear-front;
   box(width,.16,length,floorMat,0,1.67,center).name='A-cabin-floor';
   box(width,.92,.14,body,0,2.10,front+.07).name='A-lower-windscreen-panel';
   box(width,2.04,.13,body,0,2.73,rear-.07).name='A-cabin-back';
   for(const sign of[-1,1]){
     const sx=sign*(width/2);
     box(.12,.91,length-.13,body,sign*(width/2-.055),2.115,center).name='A-lower-door';
     const pane=face([
       [sx+.018*sign,2.64,front-.105],[sx+.018*sign,3.74,front+.12],
       [sx+.018*sign,3.74,rear-.16],[sx+.018*sign,2.64,rear-.16]
     ],transparentGlass);
     pane.name='A-side-window';
     rod([sx,2.57,front-.10],[sx,3.76,front+.12],.070,body);
     rod([sx,2.58,rear-.16],[sx,3.77,rear-.16],.065,body);
     rod([sx,2.61,front-.10],[sx,2.61,rear-.16],.033,trim);
     rod([sx,3.76,front+.12],[sx,3.76,rear-.16],.034,trim);
     rod([sx,2.65,-2.40],[sx,3.73,-2.40],.035,body);
     box(.08,.065,.30,trim,sign*1.67,2.18,-2.11);
     rod([sign*1.64,3.22,-3.26],[sign*1.99,3.20,-3.29],.036,trim);
     box(.17,.49,.34,trim,sign*2.04,3.16,-3.29);
     box(.31,.22,.10,lamp,sign*1.26,1.96,front-.17);
     box(.13,.12,.07,amber,sign*1.29,1.65,front-.18);
     // Cabina sense conductor; seients molt simples i terra visibles a través dels vidres.
     box(.70,.16,.66,seatMat,sign*.77,2.04,-1.93);
     box(.70,.56,.15,seatMat,sign*.77,2.38,-1.56);
   }
   box(3.40,.17,length+.12,roof,0,3.89,center).name='A-cabin-roof';
   const windscreen=face([
     [-1.49,2.64,front-.15],[1.49,2.64,front-.15],
     [1.49,3.73,front+.105],[-1.49,3.73,front+.105]
   ],transparentGlass);
   windscreen.name='A-front-windscreen';
   for(const sign of[-1,1])
     rod([sign*1.50,2.62,front-.16],[sign*1.50,3.75,front+.11],.066,body);
   rod([-1.51,2.61,front-.16],[1.51,2.61,front-.16],.048,trim);
   rod([-1.51,3.76,front+.11],[1.51,3.76,front+.11],.046,body);
   rod([0,2.66,front-.17],[0,3.73,front+.11],.030,trim);
   // Volant poligonal, però cap persona a dins.
   const steering=part(new T.TorusGeometry(.25,.03,5,10),trim);
   steering.position.set(-.77,2.60,-2.90);steering.name='A-steering-wheel';
   rod([-.77,2.60,-2.90],[-.77,2.28,-2.75],.035,trim);
 }else{
 // Cabina avançada, gairebé vertical: tres peces estructurals.
 box(2.92,1.06,2.12,body,0,1.92,-2.52);
 box(2.92,1.28,2.04,body,0,3.01,-2.54);
 box(3.07,.19,2.17,roof,0,3.71,-2.54);
 // Parabrisa inclinat i finestres laterals: només tres superfícies.
 face([[-1.27,2.59,-3.59],[1.27,2.59,-3.59],[1.27,3.46,-3.43],[-1.27,3.46,-3.43]],glass);
 rod([0,2.59,-3.60],[0,3.46,-3.44],.030,trim);
 for(const sign of[-1,1]){
   const sx=sign*1.475;
   face([[sx,2.58,-3.28],[sx,3.40,-3.21],[sx,3.40,-2.10],[sx,2.60,-2.14]],glass);
   rod([sx,1.58,-1.54],[sx,3.53,-1.54],.030,trim);
   box(.08,.065,.30,trim,sx,2.18,-2.26); // Maneta.
   rod([sx,3.12,-3.18],[sign*1.75,3.13,-3.25],.038,trim);
   box(.17,.45,.31,trim,sign*1.79,3.07,-3.25); // Retrovisor.
   box(.31,.22,.10,lamp,sign*1.20,1.95,-3.65);
   box(.13,.12,.07,amber,sign*1.23,1.64,-3.64);
 }

 }
 const frontShift=classic?-.19:0;
 box(2.08,.69,.09,trim,0,1.96,-3.65+frontShift); // Reixa frontal.
 for(const y of[1.76,1.96,2.16])box(1.96,.045,.11,silver,0,y,-3.73+frontShift);
 box(3.20,.21,.34,trim,0,1.32,-3.85+frontShift); // Para-xocs.
 box(.77,.29,.20,hub,0,1.34,-4.06+frontShift); // Cabrestant.

 // Caixa i lona arrodonida de geometria molt baixa: set plafons + dos extrems.
 const begin=-.89,end=3.62,top=cfg.top;
 const profile=[[-1.51,2.15],[-1.51,3.31],[-1.19,top-.09],[-.54,top],[.54,top],[1.19,top-.09],[1.51,3.31],[1.51,2.15]];
 for(let i=0;i<profile.length-1;i++){
   const a=profile[i],b=profile[i+1];
   face([[a[0],a[1],begin],[b[0],b[1],begin],[b[0],b[1],end],[a[0],a[1],end]],i===0||i===6?tarpDark:i===2||i===4?tarpLight:tarp);
 }
 for(const z of[begin,end])face(profile.map(p=>[p[0],p[1],z]),tarpDark);
 for(const x of[-1.52,1.52]){
   for(const z of[-.35,.80,1.95,3.10])rod([x,2.17,z],[x,3.27,z],.024,trim);
   rod([x,2.18,begin],[x,2.18,end],.045,trim);
 }
 for(const x of[-1.23,1.23]){
   box(.32,.20,.09,red,x,1.74,3.72); // Llums posteriors.
   rod([x,1.55,3.85],[x,3.42,3.85],.046,trim);
 }
 // Escala posterior i esglaons amplis, com al model D original.
 for(const y of[1.74,2.20,2.66,3.12,3.55])rod([.80,y,3.90],[1.47,y,3.90],.046,silver);

 // La presa d'aire queda per fora de la nova cabina A. Sense recanvi lateral en A.
 const intakeX=classic?1.79:1.55;
 rod([classic?1.68:1.44,1.66,-1.56],[intakeX,3.98,-1.56],.105,trim);
 box(.35,.21,.43,trim,intakeX,4.05,-1.73);
 if(!classic){
   const spare=new T.Group();spare.name='lateral-spare-wheel';
   spare.position.set(-1.66,2.77,2.44);spare.rotation.z=.12;g.add(spare);
   cyl(.62,.24,rubber,0,0,0,spare,12);
   cyl(.34,.26,hub,0,0,0,spare,10);
 }

 if(cfg.style==='forest'){
   // Camuflatge de blocs grans; cap textura de milions de triangles.
   for(const z of[-.42,1.20,2.86]){
     face([[-1.521,2.46,z],[-1.522,3.07,z+.22],[-1.522,2.98,z+.87],[-1.522,2.43,z+.64]],tarpDark);
     face([[1.521,2.63,z],[1.522,3.17,z+.22],[1.522,2.93,z+.90],[1.522,2.53,z+.74]],tarpLight);
   }
   box(1.37,.12,.65,roof,0,3.90,-2.49); // Porta-equipatge pla.
   box(.48,.46,.73,trim,-1.25,1.42,.30);
 }else if(cfg.style==='patrol'){
   for(const x of[-1.46,1.46])rod([x,1.31,-4.09],[x,2.11,-3.86],.092,trim);
   for(const y of[1.42,1.91])rod([-1.52,y,-4.13],[1.52,y,-4.13],.078,trim);
   box(2.66,.10,.19,trim,0,3.87,-2.85);
   for(const x of[-.92,0,.92])box(.30,.13,.17,lamp,x,3.94,-2.89);
 }else if(cfg.style==='long'){
   // Els reforços de la lona alta tenen menys trams que el model inicial.
   for(const z of[.18,2.07]){
     rod([-1.20,top-.08,z],[0,top+.015,z],.025,tarpDark);
     rod([0,top+.015,z],[1.20,top-.08,z],.025,tarpDark);
   }
   for(const x of[-1.22,1.22])box(.43,.53,.53,trim,x,1.47,.47);
 }

 g.userData.truckVariant=cfg.id;
 g.userData.axles=axles;
 g.userData.wheelCount=6;
 g.userData.cabinHollow=classic;
 g.userData.frontGlazingTransparent=classic;
 g.userData.cabin='cab-over 6x6';
 return g;
}
