import {HUMAN_PROFILES,HUMAN_STYLES} from './human-model-catalog.mjs';
export const HUMAN_VERSION='humans-v1';

// Eight-head anatomical template, before role-specific headwear and game scaling.
// Reference image: knee slightly above division 6; elbows near 5 heads from floor;
// fingertips below crotch. Sole 0; ankle .11; knee .56; crotch .96; crown 1.92.
const BODY=Object.freeze({pelvis:1.09,hip:-.04,thigh:.49,shin:.45,sole:.11,spine:.075,shoulder:.435,upperArm:.385,forearm:.310,handGrip:.068});
// Native articulated mesh assemblies, facing -Z. Motion pivots are separate
// from editable rest pivots, so playing a clip never overwrites a body edit.
export function createHumanProposal(T,role,style='a'){
 const p=HUMAN_PROFILES[role],s=HUMAN_STYLES[style];if(!p||!s)throw Error('Proposta humana desconeguda');
 const root=new T.Group();root.name=p.name+' · '+s.name;
 const materials=new Map(),dark=0x26302d,shoe=0x303631,hair=role==='general'?0x42352f:0x443b30,gold=0xd0b46b;
 const mat=c=>{if(!materials.has(c)){const m=new T.MeshStandardMaterial({color:c,roughness:.88,flatShading:style!=='b'});m.userData.labOwned=true;materials.set(c,m)}return materials.get(c)};
 const mesh=(g,name,geo,c,pos=[0,0,0])=>{geo.userData.labOwned=true;const m=new T.Mesh(geo,mat(c));m.name=name;m.position.set(...pos);m.castShadow=m.receiveShadow=true;g.add(m);return m};
 const box=(g,name,dim,pos,c)=>mesh(g,name,new T.BoxGeometry(...dim),c,pos);
 const oval=(g,name,r,pos,c)=>{const m=mesh(g,name,new T.SphereGeometry(1,s.segments,style==='b'?9:6),c,pos);m.scale.set(...r);return m};
 const tube=(g,name,top,bottom,h,pos,c,n=s.segments)=>mesh(g,name,new T.CylinderGeometry(top,bottom,h,n),c,pos);
 const group=(g,name)=>{const n=new T.Group();n.name=name;g.add(n);return n};
 const joint=(parent,id,name,pos)=>{
  const rest=group(parent,name);rest.position.set(...pos);rest.userData.humanRestJoint=id;
  const motion=group(rest,'Moviment · '+name);motion.userData.humanMotionJoint=id;return motion;
 };
 // Elliptical rings define waist, rib cage, jaw, tapered limbs and hands.
 // Anatomical curves come from multiple cross sections, not stretched boxes.
 const loft=(g,name,rings,c,n=s.segments)=>{
  const points=[],indices=[];
  for(const [y,rx,rz,z=0,rearRise=0]of rings)for(let i=0;i<n;i++){const a=i*Math.PI*2/n,back=Math.max(0,Math.sin(a));points.push(Math.cos(a)*rx,y+rearRise*back,Math.sin(a)*rz+z)}
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){const a=r*n+i,b=r*n+(i+1)%n;indices.push(a,a+n,b,b,a+n,b+n)}
  for(let i=1;i<n-1;i++)indices.push(0,i,i+1,(rings.length-1)*n,(rings.length-1)*n+i+1,(rings.length-1)*n+i);
  if(rings.at(-1)[0]<rings[0][0])indices.reverse();
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(g,name,geo,c);
 };
 const limb=(g,name,length,top,middle,bottom,c)=>{
  const calf=name==='Panxell',thigh=name==='Cuixa',forearm=name==='Avantbraç';
  const back=calf ? .018 : thigh ? .008 : 0;
  return loft(g,name,[[.018,top*.81,top*.84],[-length*.13,top,top*.96],[-length*.34,(top+middle)*.54,Math.max(top,middle)*.97,back],[-length*.65,middle,middle*.91,back*.7],[-length-.008,bottom,bottom*.94,forearm ? -.003 : 0]],c);
 };
 const W=s.width,L=s.limbs;
 const pelvis=joint(root,'pelvis','Pelvis',[0,BODY.pelvis,0]);
 loft(pelvis,'Malucs i cintura',[[-.13,.132*W,.10],[-.08,.165*W,.13,.014],[-.01,.174*W,.137,.014],[.08,.146*W,.111]],role==='farmer'?0x746c59:p.uniform).userData.humanLandmark='pelvis';
 const torso=joint(pelvis,'spine','Tors',[0,BODY.spine,0]);
 loft(torso,'Tronc anatòmic',[[0,.145*W,.105],[.08,.143*W,.108],[.17,.164*W,.116],[.28,.193*W,.132,.006],[.36,.207*W,.128,.009],[.425,.196*W,.117,.012],[.468,.128*W,.092,.012],[.490,.084*W,.073,.012]],p.uniform);
 const belt=loft(pelvis,'Cinturó',[[.048,.158*W,.122],[.085,.158*W,.122]],dark);
 box(pelvis,'Sivella',[.052,.04,.015],[0,.066,-.127],role==='general'?gold:0x9a9c85);
 for(const side of [-1,1]){
  const collar=box(torso,'Coll de camisa',[.073,.073,.027],[side*.055,.458,-.092],p.trim);collar.rotation.z=-side*.38;
  if(s.detail===2){
   for(const y of [.13,.18,.24])box(torso,'Plec lateral',[.055,.012,.012],[side*.15*W,y,-.101],p.trim);
   box(torso,'Costura lateral',[.008,.20,.012],[side*.19*W,.27,.065],p.trim);
  }
 }
 // Positive Z is posterior. The cervical axis meets the occiput behind
 // the chin; sloped jaw rings leave a natural submandibular contour.
 const neck=joint(torso,'neck','Coll',[0,.480,.012]);
 // The visible section is short; the upper cervical volume is embedded
 // in the rear of the skull, not exposed as a cylinder under the jaw.
 loft(neck,'Coll anatòmic i clatell',[[-.050,.090,.079,-.004],[-.018,.080,.070,.001],[.012,.065,.055,.013],[.038,.056,.048,.025],[.064,.053,.045,.037],[.092,.050,.040,.045],[.118,.038,.031,.051],[.140,.018,.020,.052]],p.skin).userData.humanLandmark='neck';
 const head=joint(neck,'head','Cap',[0,.095,.065]);
 head.scale.set(s.head,.95,s.head);
 loft(head,'Mandíbula i crani',[[0,.032,.033,-.062,.046],[.018,.055,.056,-.041,.039],[.043,.075,.079,-.019,.031],[.081,.086,.095,.003,.017],[.128,.093,.104,.010],[.174,.094,.103,.012],[.216,.076,.082,.016],[.242,.047,.049,.015],[.252,.012,.015,.014]],p.skin,Math.max(10,s.segments)).userData.humanLandmark='skull';
 const noseGeo=new T.BufferGeometry();noseGeo.setAttribute('position',new T.Float32BufferAttribute([-.020,.135,-.094,0,.075,-.145,.020,.135,-.094,-.020,.135,-.094,-.022,.077,-.105,0,.075,-.145,.020,.135,-.094,0,.075,-.145,.022,.077,-.105,-.022,.077,-.105,.022,.077,-.105,0,.075,-.145],3));noseGeo.computeVertexNormals();mesh(head,'Nas',noseGeo,p.skin);
 for(const side of [-1,1]){
  oval(head,'Orella',[.022,.037,.020],[side*.089,.115,.012],p.skin);
  oval(head,'Ull',[.022,.009,.008],[side*.042,.143,-.085],0xd7cfba);
  oval(head,'Iris',[.008,.008,.006],[side*.041,.143,-.092],0x3b3e32);
  const brow=box(head,'Cella',[.046,.010,.008],[side*.045,.167,-.082],hair);brow.rotation.z=side*.06;
  if(s.detail===2){oval(head,'Pavelló orella',[.008,.021,.012],[side*.104,.115,.008],0xa97659);box(head,'Parpella',[.043,.005,.008],[side*.043,.153,-.092],p.skin)}
 }
 box(head,'Boca',[.047,.007,.007],[0,.050,-.099],0x8e6451);
 const hairCap=mesh(head,'Cabells',new T.SphereGeometry(1,s.segments,5,0,Math.PI*2,0,Math.PI*.53),hair,[0,.153,.014]);hairCap.scale.set(.096,.103,.105);
 const hat=group(head,'Barret');hat.scale.set(.94,1,.98);
 if(p.hat==='straw'){
  const brim=tube(hat,'Ala del capell',.19,.195,.018,[0,.211,0],0xb49c6d);brim.scale.z=.88;
  const crown=tube(hat,'Copa del capell',.095,.122,.09,[0,.255,0],0xc4ad7a);crown.scale.z=.9;
  tube(hat,'Cinta capell',.12,.123,.02,[0,.221,0],p.trim);
 }else if(p.hat==='beret'){
  tube(hat,'Vora boina',.104,.105,.027,[0,.214,0],p.trim);
  const beret=oval(hat,'Boina',[.129,.052,.110],[.025,.242,0],p.uniform);beret.rotation.z=-.18;
  box(hat,'Insígnia',[.027,.032,.012],[-.052,.236,-.091],gold);
 }else if(p.hat==='helmet'){
  const helmet=mesh(hat,'Casc',new T.SphereGeometry(1,s.segments,6,0,Math.PI*2,0,Math.PI*.56),p.trim,[0,.166,.004]);helmet.scale.set(.122,.124,.115);
  for(const side of [-1,1])box(head,'Corretja casc',[.012,.106,.013],[side*.079,.086,.019],dark);
 }else{
  const officer=p.hat==='officer';
  tube(hat,'Banda gorra',.105,.106,.028,[0,.211,0],officer?dark:p.trim);
  const cap=tube(hat,'Copa gorra',officer?.137:.103,.107,officer?.062:.054,[0,.249,.006],p.uniform);cap.scale.z=.95;
  const peak=oval(hat,'Visera',[.093,.011,officer?.073:.063],[0,.212,-.101],officer?dark:p.trim);peak.rotation.x=.10;
  if(officer)box(hat,'Emblema gorra',[.028,.032,.012],[0,.249,-.113],gold);
 }
 if(role==='player'||role==='general'){
  for(const side of [-1,1]){const lens=oval(head,'Ulleres',[.035,.022,.008],[side*.044,.143,-.108],dark);box(head,'Patilla ulleres',[.008,.010,.085],[side*.085,.148,-.062],dark)}
  box(head,'Pont ulleres',[.025,.008,.009],[0,.15,-.111],role==='general'?gold:dark);
 }
 if(role==='general')for(const side of [-1,1])oval(head,'Bigoti',[.035,.014,.014],[side*.027,.068,-.095],hair);
 // Move the complete face, skull and headwear as one assembly in
 // relation to the atlanto-occipital pivot. The chin now hangs below
 // and well in front of the pivot; the rear cranium envelops the neck.
 for(const part of head.children){part.position.y-=.060;part.position.z-=.070}
 const feet=[];
 for(const side of [-1,1]){
  const suffix=side<0?'L':'R',label=side<0?'esquerre':'dret';
  const hip=joint(pelvis,'hip'+suffix,'Maluc '+label,[side*.103*W,BODY.hip,0]);
  limb(hip,'Cuixa',BODY.thigh,.104*L,.083*L,.064*L,role==='farmer'?0x746c59:p.uniform);
  const knee=joint(hip,'knee'+suffix,'Genoll '+label,[0,-BODY.thigh,0]);
  oval(knee,'Ròtula',[.067*L,.063,.065*L],[0,0,-.005],p.uniform);
  limb(knee,'Panxell',BODY.shin,.064*L,.076*L,.040*L,role==='farmer'?0x746c59:p.uniform);
  const ankle=joint(knee,'ankle'+suffix,'Turmell '+label,[0,-BODY.shin,0]);feet.push(ankle);
  loft(ankle,'Bota',[[.10,.049,.050,.01],[.015,.055,.065,.003],[-.035,.062,.125,-.055],[-.087,.064,.134,-.057]],shoe);
  loft(ankle,'Sola',[[ -.086,.065,.135,-.057],[-.11,.065,.135,-.057]],0x1d2521).userData.humanLandmark='sole';
  if(s.detail===2)for(let j=0;j<4;j++)box(ankle,'Cordons',[.066,.008,.014],[0,.015-j*.010,-.045-j*.021],0x8b8b74);
  const shoulder=joint(torso,'shoulder'+suffix,'Espatlla '+label,[side*.211*W,BODY.shoulder,.006]);
  loft(shoulder,'Deltoide',[[.035,.038*L,.045*L],[.007,.066*L,.072*L],[-.047,.078*L,.081*L],[-.103,.065*L,.064*L],[-.14,.046*L,.046*L]],p.uniform);
  const bare=p.civilian&&role!=='mechanic';
  limb(shoulder,'Braç',BODY.upperArm,.068*L,.060*L,.046*L,bare?p.skin:p.uniform);
  if(bare)limb(shoulder,'Màniga curta',.13,.078*L,.072*L,.070*L,p.uniform);
  const elbow=joint(shoulder,'elbow'+suffix,'Colze '+label,[0,-BODY.upperArm,0]);
  oval(elbow,'Articulació colze',[.048*L,.044,.047*L],[0,0,0],p.civilian?p.skin:p.uniform);
  limb(elbow,'Avantbraç',BODY.forearm,.049*L,.052*L,.030*L,p.civilian?p.skin:p.uniform);
  if(!p.civilian)tube(elbow,'Punys de màniga',.035,.037,.038,[0,-BODY.forearm+.017,0],p.trim);
  const wrist=joint(elbow,'wrist'+suffix,'Canell '+label,[0,-BODY.forearm,0]);
  loft(wrist,'Palmell',[[.012,.032,.024],[-.04,.039,.023],[-.09,.034,.020]],p.skin,8);
  for(let i=0;i<4;i++){
   const finger=oval(wrist,'Dit '+(i+1),[.0085,.031-(i===3?.007:0),.009],[(i-1.5)*.017,-.106,0],p.skin);
   if(s.detail===2)box(wrist,'Artell',[.014,.006,.008],[(i-1.5)*.017,-.085,-.017],0xb88969);
  }
  const thumb=oval(wrist,'Polze',[.012,.032,.013],[-side*.043,-.035,-.006],p.skin);thumb.rotation.z=-side*.4;
  if(!p.civilian&&role!=='general'){
   box(knee,'Genollera',[.12,.125,.037],[0,-.008,-.061],p.trim);
   if(s.detail===2){box(elbow,'Colzera',[.078,.087,.031],[0,.0,.047],p.trim);box(hip,'Butxaca lateral',[.04,.14,.10],[side*.102,-.20,.005],p.trim)}
  }
  if(role==='general'){
   box(shoulder,'Musclera',[.115,.025,.095],[0,.022,0],gold);
   for(const y of [-.20,-.22])tube(elbow,'Galó',.04,.04,.01,[0,y,0],gold,8);
   loft(hip,'Faldó jaqueta',[[.09,.115,.135],[-.22,.118,.145]],p.uniform,8);
  }
  if(role==='mechanic'){box(torso,'Tirant granota',[.034,.32,.016],[side*.10,.27,-.123],p.trim);box(hip,'Butxaca pantaló',[.074,.10,.018],[side*.04,-.12,-.092],p.trim)}
 }
 if(!p.civilian&&role!=='general'){
  loft(torso,'Armilla',[[.06,.158*W,.128],[.13,.183*W,.145],[.32,.207*W,.145],[.38,.166*W,.116]],p.trim);
  for(const x of [-.115,0,.115]){box(torso,'Butxaca armilla',[.093,.115,.045],[x,.15,-.148],p.uniform);box(torso,'Solapa butxaca',[.098,.021,.048],[x,.213,-.151],p.trim)}
  const backpack=group(torso,'Motxilla');loft(backpack,'Bossa',[[.07,.125,.065,.18],[.16,.142,.078,.19],[.37,.126,.07,.18]],p.trim);
  for(const side of [-1,1]){box(torso,'Tirant',[.034,.30,.025],[side*.14,.26,.125],dark);box(torso,'Sivella tirant',[.039,.028,.014],[side*.14,.30,-.139],0x979883)}
  if(s.detail===2){box(torso,'Ràdio',[.055,.095,.038],[.145,.315,-.145],dark);tube(torso,'Antena',.004,.004,.14,[.16,.42,-.15],dark,5);for(const y of [.27,.30,.33])box(torso,'Cinta armilla',[.26,.012,.012],[0,y,-.145],p.uniform)}
  if(p.armor)for(const side of [-1,1])box(torso,'Placa blindatge',[.14,.18,.028],[side*.08,.30,-.16],0x34443e);
 }else if(role==='general'){
  for(const side of [-1,1]){const lapel=box(torso,'Solapa',[.065,.19,.023],[side*.07,.34,-.119],p.trim);lapel.rotation.z=side*.28;for(const y of [.12,.18,.24])oval(torso,'Botó',[.009,.009,.006],[side*.045,y,-.126],gold)}
  for(let i=0;i<(s.detail===2?6:3);i++){const x=.055+(i%3)*.035,y=.33-Math.floor(i/3)*.06;box(torso,'Cinta medalla',[.025,.028,.012],[x,y,-.125],[0xb64b41,0x4b7b8a,0xc8c5a4][i%3]);oval(torso,'Medalla',[.012,.015,.007],[x,y-.024,-.128],gold)}
 }else{
  box(torso,'Butxaca camisa',[.085,.09,.016],[-.096,.29,-.123],p.trim);
  for(const y of [.12,.19,.26,.34])oval(torso,'Botó camisa',[.005,.005,.004],[0,y,-.126],0xc6c0aa);
  if(role==='mechanic'){
   box(torso,'Pitrera granota',[.22,.20,.020],[0,.23,-.126],p.trim);box(torso,'Identificació',[.055,.034,.009],[-.055,.28,-.141],0xc6cbbb);
   box(pelvis,'Eina al cinturó',[.018,.17,.016],[.175,-.05,-.04],0x9ba6a0);for(const side of [-1,1])box(pelvis,'Boca clau',[.012,.035,.016],[.175+side*.018,.05,-.04],0x9ba6a0);
  }
 }
 // Decorative game props distinguish the existing roles; no functional parts.
 if(p.weapon){
  let parent;root.traverse(n=>{if(n.userData.humanMotionJoint==='wristR')parent=n});
  const weapon=group(parent,p.weapon==='rocket'?'Bazuca':p.weapon==='rifle'?'Fusell':'Pistola');weapon.position.set(0,-.055,-.015);weapon.rotation.x=-Math.PI/2;weapon.userData.humanWeapon=p.weapon;
  if(p.weapon==='rocket'){
   const body=tube(weapon,'Tub bazuca',.056,.065,.96,[0,.04,-.18],0x566149,10);body.rotation.x=Math.PI/2;
   for(const z of [-.68,.30]){const rim=tube(weapon,'Extrem bazuca',.074,.074,.04,[0,.04,z],dark,10);rim.rotation.x=Math.PI/2}
   box(weapon,'Empunyadura bazuca',[.045,.10,.06],[0,-.04,0],dark);
  }else{
   const rifle=p.weapon==='rifle';
   box(weapon,'Cos arma',[.052,.065,rifle?.29:.14],[0,.018,rifle?-.10:-.045],dark);
   box(weapon,'Empunyadura arma',[.04,.08,.05],[0,-.038,.012],p.trim);
   if(rifle){box(weapon,'Culata',[.043,.07,.17],[0,.012,.13],p.trim);box(weapon,'Carregador',[.033,.10,.06],[0,-.06,-.10],dark);const barrel=tube(weapon,'Canó visual',.012,.014,.27,[0,.018,-.36],dark,8);barrel.rotation.x=Math.PI/2}
  }
 }
 // Batch only within each rigid assembly; joints, clothing and accessories
 // remain addressable in the editor and in JSON drafts.
 const merge=g=>{
  for(const child of [...g.children])if(child.isGroup)merge(child);
  const batches=new Map();for(const m of g.children)if(m.isMesh&&!m.userData.humanLandmark){if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(m)}
  for(const [material,items]of batches){if(items.length<2)continue;const positions=[],normals=[],names=[];
   for(const m of items){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);names.push(m.name);g.remove(m);geo.dispose();m.geometry.dispose()}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.userData.labOwned=true;
   const m=new T.Mesh(geo,material);m.name=g.name+' · '+names.slice(0,3).join(', ');m.userData.batchedParts=names;m.castShadow=m.receiveShadow=true;g.add(m);
  }
 };merge(root);
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),height=bounds.max.y-bounds.min.y;
 root.scale.setScalar(p.height/height);
 root.userData={humanProposal:{role,style,version:HUMAN_VERSION,iteration:1},humanHeight:p.height,labAssemblies:true};
 return root;
}

const rigCache=new WeakMap();
export function poseHumanProposal(root,time=0,mode='idle'){
 let rigs=rigCache.get(root);
 if(!rigs){rigs=[];root.traverse(n=>{if(!n.userData.humanProposal)return;const joints={};let weapon;n.traverse(j=>{const id=j.userData.humanMotionJoint;if(id)joints[id]=j;if(j.userData.humanWeapon)weapon=j});rigs.push({model:n,joints,weapon})});rigCache.set(root,rigs)}
 for(const {model,joints:j,weapon}of rigs){
  const set=(id,x=0,y=0,z=0)=>{if(j[id])j[id].rotation.set(x,y,z)};
  for(const n of Object.values(j)){n.rotation.set(0,0,0);n.position.set(0,0,0)}
  if(mode==='rest'){model.updateMatrixWorld(true);continue}
  const walk=mode==='walk'||mode==='run',run=mode==='run',phase=time*(run?9:5.5),breath=Math.sin(time*1.8),stride=run?.88:.5;
  set('spine',walk?(run?.13:.035):.008*breath,walk?Math.sin(phase)*.055:Math.sin(time*.7)*.02);
  set('neck',0,mode==='idle'?Math.sin(time*.6)*.08:0);set('head',-.015*breath);
  for(const [i,side]of ['L','R'].entries()){
   const sign=i?-1:1,a=phase+i*Math.PI,swing=walk?Math.sin(a)*stride:0;
   set('hip'+side,swing,0,0);set('knee'+side,walk?-(.05+Math.max(0,-Math.sin(a))*(run?1.45:.85)):0);
   set('ankle'+side,-swing-(j['knee'+side]?.rotation.x||0));
   set('shoulder'+side,walk?-swing*.65:.025*breath,0,-sign*.06);
   set('elbow'+side,run?1.0:walk?.18+.16*Math.max(0,Math.sin(a)):.10);
   set('wrist'+side,0,0,sign*.035);
  }
  if(mode==='crouch'){
   set('spine',.20);for(const side of ['L','R']){set('hip'+side,1.02);set('knee'+side,-1.78);set('ankle'+side,.76);set('shoulder'+side,.30);set('elbow'+side,.60)}
  }else if(mode==='aim'){
   const pistol=weapon?.userData.humanWeapon==='pistol',upper=pistol?.90:.45,lower=pistol?.90:2.0;
   set('spine',.045,-.12);set('head',0,.12);set('shoulderR',upper,.20,-.10);set('elbowR',lower);set('wristR',Math.PI/2-upper-lower);
  }else if(mode==='work'){
   set('spine',.35);set('neck',.15);set('hipL',.24);set('hipR',.24);set('kneeL',-.42);set('kneeR',-.42);
   set('ankleL',.18);set('ankleR',.18);set('shoulderL',1.10,0,.15);set('shoulderR',.90,0,-.12);
   set('elbowL',.32);set('elbowR',.50+Math.sin(time*5)*.23);set('wristR',Math.sin(time*5)*.12,0,.08);
  }else if(mode==='wave'){
   set('shoulderR',.12,0,2.5);set('elbowR',.35,0,Math.sin(time*4)*.28);set('wristR',0,0,Math.sin(time*4)*.20);set('head',0,-.10);
  }
  // Pelvis follows the lowest sole. Knees bend backwards, and ankles keep
  // the sole flat during the planted phase instead of swinging rigid legs.
  if(j.pelvis)set('pelvis',0,walk?-Math.sin(phase)*.035:0,walk?Math.cos(phase)*.018:0);
  model.updateMatrixWorld(true);
  // Measure actual transformed sole contact points, including editable
  // leg lengths and pelvis roll. No previous fixed skeleton dimensions.
  let lowest=Infinity;
  for(const side of ['L','R']){
   const ankle=j['ankle'+side];if(!ankle)continue;
   for(let k=0;k<12;k++){
    const a=k*Math.PI/6,point=ankle.position.clone().set(.065*Math.cos(a),-BODY.sole,-.057+.135*Math.sin(a));
    ankle.localToWorld(point);model.worldToLocal(point);lowest=Math.min(lowest,point.y);
   }
  }
  if(j.pelvis&&Number.isFinite(lowest))j.pelvis.position.y=-lowest;
  model.updateMatrixWorld(true);
  if(mode==='aim'&&weapon&&j.shoulderL&&j.elbowL){
   // Geometric support-hand IK follows the actual decorative prop, including
   // edits to its position. The palm stays on the grip as the torso turns.
   const target=weapon.position.clone().set(0,-.035,weapon.userData.humanWeapon==='pistol'?.015:-.17);
   weapon.localToWorld(target);j.shoulderL.parent.worldToLocal(target);
   const upper=j.elbowL.parent.position.length(),lower=j.wristL.parent.position.length()+BODY.handGrip,d=Math.min(upper+lower-.001,Math.max(.001,target.length())),axis=target.clone().normalize();
   const along=(upper*upper+d*d-lower*lower)/(2*d),radius=Math.sqrt(Math.max(0,upper*upper-along*along));
   const pole=axis.clone().set(-.35,-1,.15);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
   const bend=axis.clone().multiplyScalar(along).addScaledVector(pole,radius),down=axis.clone().set(0,-1,0);
   j.shoulderL.quaternion.setFromUnitVectors(down,bend.clone().normalize());
   const direction=target.clone().sub(bend).normalize().applyQuaternion(j.shoulderL.quaternion.clone().invert());
   j.elbowL.quaternion.setFromUnitVectors(down,direction);set('wristL',0,0,-.2);
   model.updateMatrixWorld(true);
  }
 }
}

// Measurements are based on isolated actual meshes and rig positions, never hair, hat or weapon.
export function measureHumanAnatomy(T,root){
 if(!root)return null;
 let proposal=null,skull=null,neck=null,pelvis=null;const soles=[],j={},tips={};
 root.updateWorldMatrix(true,true);
 root.traverse(n=>{if(n.userData.humanProposal)proposal=n.userData.humanProposal;
  if(n.userData.humanMotionJoint)j[n.userData.humanMotionJoint]=n;
  if(n.userData.humanLandmark==='skull')skull=n;
  if(n.userData.humanLandmark==='neck')neck=n;
  if(n.userData.humanLandmark==='pelvis')pelvis=n;
  if(n.userData.humanLandmark==='sole')soles.push(n);
 });
 if(!proposal||!skull||!neck||!pelvis||soles.length!==2)return null;
 const bounds=n=>new T.Box3().setFromObject(n,true);
 const s=bounds(skull),n=bounds(neck),p=bounds(pelvis),floor=Math.min(...soles.map(x=>bounds(x).min.y)),crown=s.max.y,unit=(crown-floor)/8;
 if(!(unit>0))return null;
 const points={};
 for(const [id,obj] of Object.entries(j))points[id]=obj.getWorldPosition(new T.Vector3());
 for(const side of ['L','R']){
  const wrist=j['wrist'+side];if(!wrist)continue;
  const b=new T.Box3();for(const child of wrist.children)if(child.isMesh)b.union(bounds(child));
  if(!b.isEmpty()){const t=b.getCenter(new T.Vector3());t.y=b.min.y;tips[side]=t;points['tip'+side]=t}
 }
 const middle=s.getCenter(new T.Vector3());points.chin=new T.Vector3(middle.x,s.min.y,middle.z);points.crown=new T.Vector3(middle.x,crown,middle.z);points.crotch=new T.Vector3(middle.x,p.min.y,p.getCenter(new T.Vector3()).z);
 const ratio=id=>(points[id].y-floor)/unit;
 return {proposal,floor,crown,unit,points,headUnits:(crown-floor)/(s.max.y-s.min.y),ratios:Object.fromEntries(Object.keys(points).map(id=>[id,ratio(id)])),skullBounds:s,neckBounds:n};
}
