// Quatre camions blindats 6x6, derivats exclusivament del model A de previsualització.
// Geometria simplificada al nivell visual del joc. Només són previews.
export const truckConcepts=Object.freeze([
  {id:'A',name:'A1 · Blindatge de camp',tag:'Protecció reforçada',description:'Cabina més massissa, plaques a les portes, defensa frontal gruixuda i parafangs protegits.',
    cab:0x566548,roof:0x44553b,canvas:0x507b48,trim:0x303a2d,top:3.82,style:'armor_field',armor:1},
  {id:'B',name:'A2 · Escut frontal',tag:'Frontal fortificat',description:'Gran escut angular al davant, reixa de protecció, defensa més ampla i reforços laterals.',
    cab:0x526047,roof:0x404b38,canvas:0x507746,trim:0x292f28,top:3.82,style:'armor_shield',armor:2},
  {id:'C',name:'A3 · Bastió logístic',tag:'Protecció integral',description:'Cabina blindada, faldons laterals, caixes protegides i plaques gruixudes als laterals de càrrega.',
    cab:0x58664e,roof:0x43533c,canvas:0x4b7749,trim:0x303c33,top:3.89,style:'armor_bastion',armor:3},
  {id:'D',name:'A4 · Comandament pesant',tag:'Cabina superblindada',description:'Caputxa reforçada, mòdul superior de blindatge, morro massís i parafangs angulars de gran volum.',
    cab:0x60674b,roof:0x49563e,canvas:0x537b49,trim:0x31382f,top:3.90,style:'armor_command',armor:4}
]);
export function createTruckConcept(T,variant=0){
 const cfg=truckConcepts[variant];
 if(!cfg)throw new Error('Proposta de camió desconeguda');
 const g=new T.Group();g.name='Camió expedició 6x6 · '+cfg.id;
 const classic=true; // Totes les variants hereten la cabina buida i ampliada del model A.
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

 // 6x6: eix central separat de l'eix posterior, igual que al model A aprovat.
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

 // Blindatge geomètric: cada proposta parteix del mateix model A, no són renders.
 // Les finestres i el parabrisa continuen oberts i transparents.
 const heavyMat=mat(new T.Color(cfg.cab).multiplyScalar(.80).getHex(),.15);
 const edgeMat=mat(new T.Color(cfg.cab).multiplyScalar(.67).getHex(),.16);
 const bevelMat=mat(new T.Color(cfg.cab).multiplyScalar(1.10).getHex(),.12);
 const armorParts=[];
 const plate=(name,w,h,d,m,x,y,z)=>{
   const mesh=box(w,h,d,m,x,y,z);mesh.name=name;armorParts.push(mesh);return mesh;
 };
 const brace=(name,a,b,r,m)=>{
   const mesh=rod(a,b,r,m);mesh.name=name;armorParts.push(mesh);return mesh;
 };
 const level=cfg.armor;

 // Reforços de porta i faldons; es mantenen sota la vora inferior de les finestres.
 for(const sign of[-1,1]){
   const side=sign*1.72;
   plate('armor-door-'+sign,.22,.57,1.33,heavyMat,side,2.19,-2.25);
   plate('armor-door-inset-'+sign,.055,.22,.79,bevelMat,side+sign*.13,2.29,-2.17);
   plate('armor-step-'+sign,.54,.15,.91,edgeMat,sign*1.59,1.13,-1.54);
   plate('armor-chassis-box-'+sign,.39,.64,1.38,heavyMat,sign*1.47,1.36,.05);
   // Para-xocs lateral entre cabina i caixa sense tapar el pneumàtic.
   plate('armor-side-runner-'+sign,.18,.21,2.14,edgeMat,sign*1.77,.97,-.25);
   for(const z of[-2.68,.82,2.80]){
     // Tres peces angulars per arc, sense sobreposar-se al pneumàtic.
     const x=sign*1.96;
     plate('armor-fender-upper-'+sign+'-'+z,.27,.17,.84,heavyMat,x,1.71,z);
     const fore=plate('armor-fender-front-'+sign+'-'+z,.27,.34,.23,heavyMat,x,1.52,z-.69);
     const aft=plate('armor-fender-rear-'+sign+'-'+z,.27,.34,.23,heavyMat,x,1.52,z+.69);
     fore.rotation.x=-.35;aft.rotation.x=.35;
   }
 }
 // Cabina i front resistents, sense cobrir els vidres.
 plate('armor-front-shield',3.41,.44,.24,heavyMat,0,2.34,-4.00);
 plate('armor-bumper',3.75,.37,.47,edgeMat,0,1.29,-4.11);
 plate('armor-bumper-upper',3.55,.17,.30,heavyMat,0,1.52,-4.04);
 for(const sign of[-1,1]){
   plate('armor-front-corner-'+sign,.33,.71,.29,heavyMat,sign*1.60,1.91,-3.99);
   plate('armor-headlight-guard-'+sign,.46,.37,.12,edgeMat,sign*1.27,1.91,-4.20);
   plate('armor-roof-corner-'+sign,.42,.19,.46,heavyMat,sign*1.49,3.96,-3.38);
 }
 // Línia superior de blindatge. No toca la línia de visió del parabrisa.
 plate('armor-roof-viser',3.42,.19,.32,edgeMat,0,3.99,-3.59);

 if(cfg.style==='armor_shield'){
   // B: frontal tècnic molt desenvolupat, protector del radiador i barra antibarricades.
   plate('shield-center',2.55,.57,.35,heavyMat,0,2.06,-4.31);
   for(const sign of[-1,1]){
     const w=plate('shield-wing-'+sign,.60,.71,.40,bevelMat,sign*1.39,1.96,-4.24);
     w.rotation.y=sign*.13;
     brace('shield-vertical-'+sign,[sign*1.72,1.09,-4.48],[sign*1.72,2.54,-4.28],.082,edgeMat);
   }
   brace('shield-rail-lower',[-1.77,1.15,-4.51],[1.77,1.15,-4.51],.085,edgeMat);
   brace('shield-rail-upper',[-1.77,2.38,-4.36],[1.77,2.38,-4.36],.083,edgeMat);
   for(const sign of[-1,1])plate('shield-chassis-'+sign,.31,.60,1.22,heavyMat,sign*1.66,1.37,1.57);
 }else if(cfg.style==='armor_bastion'){
   // C: carro blindat logístic amb laterals de la caixa i faldons reforçats.
   for(const sign of[-1,1]){
     plate('bastion-cargo-wall-'+sign,.24,.72,4.29,heavyMat,sign*1.63,1.99,1.33);
     plate('bastion-cargo-rail-'+sign,.30,.15,4.29,edgeMat,sign*1.68,2.40,1.33);
     for(const z of[.04,1.68,3.29]){
       plate('bastion-buckle-'+sign+'-'+z,.07,.33,.12,bevelMat,sign*1.79,2.01,z);
     }
     plate('bastion-box-'+sign,.39,.52,1.23,edgeMat,sign*1.48,1.26,1.42);
   }
   plate('bastion-front-belly',3.38,.44,.62,heavyMat,0,.98,-4.07);
   plate('bastion-roof-block',2.76,.29,1.10,heavyMat,0,4.12,-1.77);
 }else if(cfg.style==='armor_command'){
   // D: gran protecció superior de cabina, costats i blindatge angulat frontal.
   plate('command-roof-armor',3.42,.44,2.17,heavyMat,0,4.20,-2.51);
   plate('command-roof-forward',3.51,.34,.46,edgeMat,0,4.17,-3.54);
   plate('command-roof-hatch',1.02,.14,1.00,bevelMat,0,4.51,-2.55);
   for(const sign of[-1,1]){
     plate('command-cab-pillar-'+sign,.40,.34,.42,heavyMat,sign*1.53,3.95,-1.47);
     plate('command-door-lower-'+sign,.33,.60,1.72,heavyMat,sign*1.88,2.05,-2.33);
     plate('command-skirt-'+sign,.30,.62,1.78,heavyMat,sign*1.73,1.17,.04);
     plate('command-rear-box-'+sign,.39,.65,.89,edgeMat,sign*1.43,1.35,1.74);
   }
   plate('command-front-ramp',3.52,.68,.41,heavyMat,0,1.05,-4.29).rotation.x=-.21;
   brace('command-bullbar',[-1.85,1.21,-4.53],[1.85,1.21,-4.53],.104,edgeMat);
 }else{
   // A: reforç de camp equilibrat: mantenim ben visible l'aspecte de camió.
   for(const sign of[-1,1]){
     plate('field-toolbox-'+sign,.38,.47,1.05,heavyMat,sign*1.48,1.33,1.52);
     plate('field-door-bolster-'+sign,.12,.45,.42,bevelMat,sign*1.85,2.14,-2.87);
   }
   plate('field-underbody',2.62,.26,.77,heavyMat,0,1.01,-3.79);
 }
 g.userData.armorLevel=level;
 g.userData.armorPartCount=armorParts.length;

 g.userData.truckVariant=cfg.id;
 g.userData.axles=axles;
 g.userData.wheelCount=6;
 g.userData.cabinHollow=true;
 g.userData.frontGlazingTransparent=true;
 g.userData.cabin='cab-over 6x6';
 return g;
}
