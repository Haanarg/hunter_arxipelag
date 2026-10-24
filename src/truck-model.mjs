// Shared A4 chassis; alternative armor belongs to the preview.
const A43={id:'C',name:'A4.3 · Faldons modulars',tag:'Mòduls separats',description:'Faldons modulars alts amb retalls per a les rodes, parafangs perfilats i posterior amb placa central.',
  cab:0x59654a,roof:0x45543e,canvas:0x527c4b,trim:0x303930,top:3.90,style:'a4_modular',armor:4};
export function createTruckModel(T,cfg=A43,decorate=null){
 const g=new T.Group();g.name='Camió expedició 6x6 · '+cfg.id;
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
   // El model del joc ha de poder animar les sis rodes i girar les dues de davant.
   // El pivot és independent de la rotació de rodament (X) de cada pneumàtic.
   const steer=z===-2.68;
   let parent=g;
   if(steer){
     const pivot=new T.Group();pivot.position.set(x,.82,z);
     pivot.name='steering-'+(x<0?'left':'right');
     g.add(pivot);parent=pivot;
     (g.userData.steeringPivots||(g.userData.steeringPivots=[])).push(pivot);
   }
   const w=new T.Group();
   w.position.set(steer?0:x,steer?0:.82,steer?0:z);
   w.name='truck-wheel-'+(x<0?'left':'right')+'-'+z;
   parent.add(w);
   cyl(.80,.47,rubber,0,0,0,w);
   cyl(.46,.485,hub,0,0,0,w,10);
   cyl(.20,.50,trim,0,0,0,w,8);
   w.userData.radius=.80;
   (g.userData.wheels||(g.userData.wheels=[])).push(w);
   return w
 }

 // 6x6: eix central separat de l'eix posterior, igual que al model A aprovat.
 const axles=[-2.68,.82,2.80];
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
 const frontShift=-.19;
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
 // Escala baixa de l'A4 eliminada per deixar lliure la nova porta blindada posterior.
 // Cada variant incorpora una solució posterior pròpia, sense cap roda lateral de recanvi.

 // La presa d'aire queda per fora de la nova cabina A. Sense recanvi lateral en A.
 const intakeX=1.79;
 rod([1.68,1.66,-1.56],[intakeX,3.98,-1.56],.105,trim);
 box(.35,.21,.43,trim,intakeX,4.05,-1.73);
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

 // Volum escombrat de cada pneumàtic: r=0.80 (pla YZ), eix X=±1.63,
 // gruix=0.47; el parafang és fora d'aquest cilindre amb >=0.10 de marge.
 // S'extrudeix un anell de sis facetes des de 0.30 fins a PI-0.30;
 // els extrems dels dos arcs posteriors no es toquen.
 const tireRadius=.80, fenderInner=.925, fenderOuter=1.005;
 const fenderSteps=6, startAngle=.30, finishAngle=Math.PI-.30;
 const wheelSpecs=[];
 const clearanceArmor=[];
 function addFender(sign,zc,extraLayer=false){
   const halfTread=.235, xInner=sign*(1.63-halfTread-.060);
   const xOuter=sign*(1.63+halfTread+(extraLayer?.20:.13));
   const positions=[],indices=[];
   const section=(theta)=>{
     const yIn=.82+fenderInner*Math.sin(theta),zIn=zc+fenderInner*Math.cos(theta);
     const yOut=.82+fenderOuter*Math.sin(theta),zOut=zc+fenderOuter*Math.cos(theta);
     return [[xInner,yIn,zIn],[xOuter,yIn,zIn],[xOuter,yOut,zOut],[xInner,yOut,zOut]];
   };
   const pushQuad=(a,b,c,d)=>{
     indices.push(a,b,c,a,c,d);
   };
   for(let n=0;n<fenderSteps;n++){
     const a=startAngle+(finishAngle-startAngle)*n/fenderSteps;
     const b=startAngle+(finishAngle-startAngle)*(n+1)/fenderSteps;
     const begin=section(a),end=section(b),offset=positions.length/3;
     for(const v of [...begin,...end])positions.push(...v);
     // Inner arc, outer arc, exterior/interior lateral i dues tapes.
     pushQuad(offset,offset+1,offset+5,offset+4);
     pushQuad(offset+3,offset+7,offset+6,offset+2);
     pushQuad(offset+1,offset+2,offset+6,offset+5);
     pushQuad(offset,offset+4,offset+7,offset+3);
     pushQuad(offset,offset+3,offset+2,offset+1);
     pushQuad(offset+4,offset+5,offset+6,offset+7);
   }
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
   geometry.setIndex(indices);
   geometry.computeVertexNormals();
   const mesh=part(geometry,heavyMat);
   mesh.name='fender-arc-'+sign+'-'+zc;
   mesh.userData={wheelArch:true,sign,axleZ:zc,tireRadius,
     innerRadius:fenderInner,outerRadius:fenderOuter,clearance:fenderInner-tireRadius};
   armorParts.push(mesh);
   wheelSpecs.push(mesh);
   return mesh;
 }
 // Blindatge entre el primer i segon eix: els extrems es mantenen
 // a més de 0.2 m de la projecció dels pneumàtics.
 for(const sign of[-1,1]){
   const side=sign*1.72;
   plate('armor-door-'+sign,.22,.57,1.33,heavyMat,side,2.19,-2.25);
   plate('armor-door-inset-'+sign,.055,.22,.79,bevelMat,side+sign*.13,2.29,-2.17);
   plate('armor-step-'+sign,.52,.14,.52,edgeMat,sign*1.60,1.12,-1.10);
   const module=plate('armor-safe-mid-box-'+sign,.28,.44,1.15,heavyMat,sign*1.60,1.29,-.90);
   clearanceArmor.push(module);
   for(const z of axles)addFender(sign,z,cfg.style!=='a4_clear');
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

 // Estructura superior A4 comuna: mai no ocupa el pas de roda.
 plate('command-roof-armor',3.42,.44,2.17,heavyMat,0,4.20,-2.51);
 plate('command-roof-forward',3.51,.34,.46,edgeMat,0,4.17,-3.54);
 plate('command-roof-hatch',1.02,.14,1.00,bevelMat,0,4.51,-2.55);
 for(const sign of[-1,1]){
   plate('command-cab-pillar-'+sign,.40,.34,.42,heavyMat,sign*1.53,3.95,-1.47);
   plate('command-door-lower-'+sign,.31,.55,1.55,heavyMat,sign*1.88,2.06,-2.39);
 }
 plate('command-front-ramp',3.52,.68,.41,heavyMat,0,1.05,-4.29).rotation.x=-.21;
 brace('command-bullbar',[-1.85,1.21,-4.53],[1.85,1.21,-4.53],.104,edgeMat);

 // Posteriors: totes les variants tenen placa central, cantoneres i para-xocs.
 // Estan més enllà de l'últim eix (Z=2.80) i per damunt del seu arc.
 const rearZ=3.94;
 const bumperZ=4.05;
 const bumper=plate('rear-armor-bumper',3.52,.34,.32,edgeMat,0,1.35,bumperZ);
 plate('rear-armor-crossbar',2.75,.23,.20,heavyMat,0,1.57,4.10);
 for(const sign of[-1,1]){
   plate('rear-armor-corner-'+sign,.47,.66,.36,heavyMat,sign*1.49,2.18,rearZ);
 }
 // Plafó posterior superior separat de la lona i de la plataforma.
 plate('rear-armor-upper',2.45,.33,.18,heavyMat,0,2.50,3.88);

 if(decorate)decorate({cfg,T,axles,plate,bevelMat,edgeMat,heavyMat,clearanceArmor});
 else {

   // A4.3: mòduls alts amb obertures per a tres rodes, sense faldó continu baix.
   for(const sign of[-1,1]){
     for(const [zc,len] of [[-1.09,.70], [1.81,.25], [3.78,.22]]){
       // Mòdul entre eixos o per damunt del pneumàtic de l'últim eix.
       const y=zc===1.81?1.98:zc===3.78?2.10:1.20;
       const block=plate('modular-side-'+sign+'-'+zc,.20,.20,len,bevelMat,sign*1.97,y,zc);
       clearanceArmor.push(block);
     }
     plate('modular-over-axles-'+sign,.20,.20,4.38,heavyMat,sign*1.96,2.14,1.45);
   }
   plate('rear-modular-center',2.08,.63,.20,heavyMat,0,2.07,4.15);
   for(const x of[-.70,0,.70])
     plate('rear-modular-rib-'+x,.08,.39,.11,bevelMat,x,2.05,4.28);

 }
 g.userData.archCount=wheelSpecs.length;
 g.userData.wheelClearanceMin=fenderInner*Math.cos((finishAngle-startAngle)/(2*fenderSteps))-tireRadius;
 g.userData.rearArmor=true;
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
