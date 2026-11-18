import {HUMAN_PROFILES,HUMAN_STYLES} from './human-model-catalog.mjs?rev=humans-v5';
import * as THREE from '../vendor/three-r186.module.mjs';
import {createGameWeaponPreview} from './human-weapon-preview.mjs';
export const HUMAN_VERSION='humans-v18';
// V18 general only: elaborate classical officer moustache and a split,
// knee-length dress coat. The joints, weapon mounts and gait are unchanged.
export const HUMAN_GENERAL_V18=Object.freeze({moustacheHalfWidth:.111,oldMoustacheHalfWidth:.062,coatHem:-.425,coatRings:5,coatSegments:8});
// Pants are a desaturated counterpart of the V15 protagonist jacket.
export const HUMAN_PLAYER_TROUSERS_GREEN=0x50aa49;
export const HUMAN_GROIN_V17=Object.freeze({low:-.13,frontRaise:.022,thighTop:.033});
export const HUMAN_SHOULDER_V16=Object.freeze({pivotWidth:.202,previousPivotWidth:.211,previousDeltoidRadius:.078,medialOffsets:Object.freeze([.034,.025,.016,.008,0])});;
// Reduce only the protagonist's thigh cross-section; preserve length, hip and knee pivots.
export const HUMAN_PLAYER_THIGH_FACTOR=.94;
export const HUMAN_PREVIEW_WEAPONS=Object.freeze(['pistol','assault','sniper','bazooka','knife','cutters']);
// Anatomical adjustment for every A/B human candidate. -Z faces forward.
export const HUMAN_HEAD_ADVANCE=.020;
// The straight cervical column follows halfway, so the throat remains tucked
// inside the jaw while the head remains one centimetre ahead of the neck.
export const HUMAN_NECK_FOLLOW=.010;

// Eight-head anatomical template, before role-specific headwear and game scaling.
// Reference image: knee slightly above division 6; elbows near 5 heads from floor;
// fingertips below crotch. Sole 0; ankle .07; knee .56; crotch .96; crown 1.92.
// V11: the ankle hinge is at the instep/leg junction rather than high inside
// the boot. A longer lower leg is balanced by a shallower, shorter shoe.
export const HUMAN_BOOT_SPEC=Object.freeze({ankleHeight:.07,soleBottom:-.070,heelBack:.060,toeFront:-.162,halfWidth:.057,bootTop:.085});
const BODY=Object.freeze({pelvis:1.09,hip:-.04,thigh:.49,shin:.49,sole:HUMAN_BOOT_SPEC.ankleHeight,spine:.075,shoulder:.435,upperArm:.385,forearm:.310,handGrip:.068});
// Sample the actual triangulated, faceted torso/vest surface in torso-local
// coordinates. Intersect the vertical Z line with each projected triangle;
// take the outermost hit. This includes the vest taper and width variants.
export function humanChestSurfaceZ(meshes,x,y,side=-1){
 let z=side<0?Infinity:-Infinity;
 for(const m of meshes){
  m.updateMatrix();const a=m.geometry.attributes.position,index=m.geometry.index;
  const v=[new m.position.constructor(),new m.position.constructor(),new m.position.constructor()];
  const count=index?.count??a.count;
  for(let i=0;i+2<count;i+=3){
   for(let k=0;k<3;k++)v[k].fromBufferAttribute(a,index?index.getX(i+k):i+k).applyMatrix4(m.matrix);
   const [p,q,r]=v,den=(q.y-r.y)*(p.x-r.x)+(r.x-q.x)*(p.y-r.y);
   if(Math.abs(den)<1e-10)continue;
   const u=((q.y-r.y)*(x-r.x)+(r.x-q.x)*(y-r.y))/den;
   const w=((r.y-p.y)*(x-r.x)+(p.x-r.x)*(y-r.y))/den;
   const t=1-u-w;
   if(Math.min(u,w,t)<-1e-6)continue;
   const hit=u*p.z+w*q.z+t*r.z;z=side<0?Math.min(z,hit):Math.max(z,hit);
  }
 }
 return Number.isFinite(z)?z:null;
}
// One continuous closed hand mesh: wrist, metacarpals, knuckles and
// joined fingers with shallow channels and individually rounded distal tips.
// Local X is hand width, -Z is the dorsum; reflect the anatomy for the other hand.
export function createHumanHandGeometry(T,side){
 const cols=16,n=cols*2,points=[],indices=[];
 const rings=[
  [.012,.030,.020,0,0],[-.012,.034,.022,0,0],[-.039,.038,.022,0,0],
  [-.065,.036,.020,.12,0],[-.082,.034,.018,.65,0],[-.103,.034,.015,1,0],
  [-.120,.032,.012,1,.45],[-.132,.030,.006,1,1],[-.136,.028,.002,0,1]
 ];
 for(const [y,w,d,groove,tip] of rings){
  const sample=(i,face)=>{
   const u=i/cols,x=2*u-1;
   // Rounded sides, shallow interdigital grooves and a gradual dorsal slope.
   const ridge=(1-Math.cos(8*Math.PI*u))/2;
   const round=Math.sqrt(Math.max(0,1-x*x));
   const thickness=d*round*(1-.23*groove*(1-ridge));
   const shorter=.010*Math.max(0,1-u*4)+.014*Math.max(0,(u-.75)*4);
   const end=tip*(shorter+.005*(1-ridge));
   points.push(side*x*w,y+end,face*thickness);
  };
  for(let i=0;i<=cols;i++)sample(i,-1);
  for(let i=cols-1;i>=1;i--)sample(i,1);
 }
 // The two skin surfaces share the side vertices: no seam at the
 // metacarpo-phalangeal junction, or on the outside of the little finger.
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){
  const a=r*n+i,b=r*n+(i+1)%n;indices.push(a,b,a+n,b,b+n,a+n);
 }
 // Cap the wrist and rounded fingertips with a central vertex per cap;
 // the terminal ring is not planar because individual digits differ in length.
 for(const r of [0,rings.length-1]){
  const start=r*n,center=points.length/3;let y=0;
  for(let i=0;i<n;i++)y+=points[(start+i)*3+1];points.push(0,y/n,0);
  for(let i=0;i<n;i++){const a=start+i,b=start+(i+1)%n;if(r===0)indices.push(center,b,a);else indices.push(center,a,b)}
 }
 if(side<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
// Native articulated mesh assemblies, facing -Z. Motion pivots are separate
// from editable rest pivots, so playing a clip never overwrites a body edit.
export function createHumanProposal(T,role,style='a',{visualOnly=false}={}){
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
 const loft=(g,name,rings,c,n=s.segments,mirrorX=false)=>{
  const points=[],indices=[];
  for(const [y,rx,rz,z=0,rearRise=0]of rings)for(let i=0;i<n;i++){const a=i*Math.PI*2/n,back=Math.max(0,Math.sin(a));points.push(Math.cos(a)*rx,y+rearRise*back,Math.sin(a)*rz+z)}
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){const a=r*n+i,b=r*n+(i+1)%n;if(mirrorX&&Math.cos((i+.5)*Math.PI*2/n)<0)indices.push(a,a+n,b+n,a,b+n,b);else indices.push(a,a+n,b,b,a+n,b+n)}
  for(let i=1;i<n-1;i++)indices.push(0,i,i+1,(rings.length-1)*n,(rings.length-1)*n+i+1,(rings.length-1)*n+i);
  if(rings.at(-1)[0]<rings[0][0])indices.reverse();
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(g,name,geo,c);
 };
 const limb=(g,name,length,top,middle,bottom,c)=>{
  const calf=name==='Panxell',thigh=name==='Cuixa',forearm=name==='Avantbraç';
  const back=calf ? .018 : thigh ? .008 : 0;
  if(calf){
   // V12: leave the upper calf and gastrocnemius bulge EXACTLY as in V11.
   // Below 65% of the shin, the Achilles/tendon zone narrows gradually
   // toward the ankle instead of keeping an almost cylindrical silhouette.
   const rings=[
    [.018,top*.81,top*.84],
    [-length*.13,top,top*.96],
    [-length*.34,(top+middle)*.54,Math.max(top,middle)*.97,back],
    [-length*.65,middle,middle*.91,back*.7],
    [-length*.77,top*.90,top*.85,.009],
    [-length*.88,top*.70,top*.67,.005],
    [-length*.96,bottom*1.14,bottom*1.10,.002],
    [-length-.008,bottom,bottom*.92,0]
   ];
   const calfMesh=loft(g,name,rings,c);
   calfMesh.userData.humanCalfProfile={version:12,length,top,middle,bottom};
   return calfMesh;
  }
  if(thigh){
   // The cloth at the groin starts inside the pelvis, then eases from
   // the trouser seat into the thigh before following the normal leg shape.
   return loft(g,name,[
    [HUMAN_GROIN_V17.thighTop,top*.72,top*.78,.003],
    [-length*.045,top*.92,top*.93,.005],
    [-length*.17,top,top*.98,.007],
    [-length*.34,(top+middle)*.54,Math.max(top,middle)*.97,back],
    [-length*.65,middle,middle*.91,back*.7],
    [-length-.008,bottom,bottom*.94,0]
   ],c);
  }
  return loft(g,name,[[.018,top*.81,top*.84],[-length*.13,top,top*.96],[-length*.34,(top+middle)*.54,Math.max(top,middle)*.97,back],[-length*.65,middle,middle*.91,back*.7],[-length-.008,bottom,bottom*.94,forearm ? -.003 : 0]],c);
 };
 // Broader shoulders and fuller limbs for the protagonist; joint heights stay anatomical.
 const W=s.width*(role==='player'?1.18:1),L=s.limbs*(role==='player'?1.22:1),D=role==='player'?1.16:1,bodySegments=role==='player'?Math.ceil(s.segments/4)*4:s.segments;
 const pelvis=joint(root,'pelvis','Pelvis',[0,BODY.pelvis,0]);
 const trouserColor=role==='player'?HUMAN_PLAYER_TROUSERS_GREEN:p.uniform;
 const hipFabric=role==='farmer'?0x746c59:trouserColor;
 // Six smoothly expanding sections replace the hard-edged hip cylinder.
 // Preserve its lowest height: the 8-head guides and groin landmark stay fixed.
 const hipShell=loft(pelvis,'Malucs i cintura',[
  [HUMAN_GROIN_V17.low,.114*W,.091,.002],
  [-.108,.138*W,.111,.006],
  [-.072,.163*W,.127,.010],
  [-.028,.176*W,.139,.013],
  [.027,.166*W,.125,.012],
  [.080,.146*W,.111]
 ],hipFabric);
 // A very shallow inverted arch follows each leg opening: higher at the
 // middle of the crotch, lower at the outer hips. No separate rigid diaper.
 const hipPositions=hipShell.geometry.attributes.position;
 for(let i=0;i<s.segments;i++){
  const theta=i*Math.PI*2/s.segments;
  hipPositions.setY(i,HUMAN_GROIN_V17.low+HUMAN_GROIN_V17.frontRaise*(1-Math.abs(Math.cos(theta))));
 }
 hipPositions.needsUpdate=true;hipShell.geometry.computeVertexNormals();
 hipShell.userData.humanLandmark='pelvis';
 hipShell.userData.humanGroinV17={role,segments:s.segments};
 // The player reads as wearing trousers, not another bare torso:
 // a distinct fabric shade, real tucked leg tops, and a fitted fly seam.
 if(role==='player'){
  const anchors=[[0,.030],[-.003,.008],[-.004,-.028],[.002,-.064],[.011,-.091]].map(([x,y])=>{
   const z=humanChestSurfaceZ([hipShell],x,y,-1);
   if(z===null)throw Error('Costura dels pantalons fora de la pelvis');
   return new T.Vector3(x,y,z-.005);
  });
  const fly=mesh(pelvis,'Costura central dels pantalons',
   new T.TubeGeometry(new T.CatmullRomCurve3(anchors),16,.0025,5,false),0x397c37);
  fly.userData.humanPantsFly={anchors:anchors.map(v=>v.toArray())};
 }
 const torso=joint(pelvis,'spine','Tors',[0,BODY.spine,0]);
 const torsoShell=loft(torso,'Tronc anatòmic',[[0,.145*W,.105],[.08,.143*W,.108],[.17,.164*W,.116],[.28,.193*W,.132,.006],[.36,.207*W,.128,.009],[.425,.196*W,.117,.012],[.468,.145*W,.092,.012],[.490,.084*W,.073,.012]].map(([y,x,z,offset=0])=>[y,x,z*D,offset]),p.uniform,bodySegments,role==='player');
 const belt=loft(pelvis,'Cinturó',[[.048,.158*W,.122],[.085,.158*W,.122]],dark);
 box(pelvis,'Sivella',[.052,.04,.015],[0,.066,-.127],role==='general'?gold:0x9a9c85);
 for(const side of [-1,1]){
  const collar=box(torso,'Coll de camisa',[.073,.073,.027],[side*.055,.458,-.092*D],p.trim);collar.rotation.z=-side*.38;
  if(s.detail===2){
   for(const y of [.13,.18,.24])box(torso,'Plec lateral',[.055,.012,.012],[side*.15*W,y,-.101],p.trim);
   box(torso,'Costura lateral',[.008,.20,.012],[side*.19*W,.27,.065],p.trim);
  }
 }
 // Positive Z is posterior. The cervical axis meets the occiput behind
 // the chin; sloped jaw rings leave a natural submandibular contour.
 const neck=joint(torso,'neck','Coll',[0,.480,.012-HUMAN_NECK_FOLLOW]);
 // A vertical cervical column: every cross-section shares the same Z centre.
 // The throat continues into the underside of the jaw, while the upper
 // rings are buried in the cranium. Do not bow the neck back toward the pivot.
 loft(neck,'Coll anatòmic i clatell',[[-.050,.090,.080,.002],[-.018,.078,.072,.002],[.012,.065,.063,.002],[.040,.063,.062,.002],[.068,.063,.062,.002],[.096,.061,.059,.002],[.124,.055,.055,.002],[.148,.040,.040,.002]],p.skin).userData.humanLandmark='neck';
 // Move the pivot forward, bringing the entire head, face and headwear with it.
 // Preserve the vertical cervical column and its connection beneath the jaw.
 const head=joint(neck,'head','Cap',[0,.095,.065-(HUMAN_HEAD_ADVANCE-HUMAN_NECK_FOLLOW)]);
 head.scale.set(s.head,.95,s.head);
 loft(head,'Mandíbula i crani',[[0,.032,.033,-.062,.046],[.018,.055,.056,-.041,.039],[.043,.075,.079,-.019,.031],[.081,.086,.095,.003,.017],[.128,.093,.104,.010],[.174,.094,.103,.012],[.216,.076,.082,.016],[.242,.047,.049,.015],[.252,.012,.015,.014]],p.skin,Math.max(10,s.segments)).userData.humanLandmark='skull';
 // Closed five-vertex nose with outward winding (-Z is the face front).
 // The rear rim penetrates the cheek surface so the nose cannot float.
 // Keep FrontSide materials; the fix belongs to the mesh, not double-sided rendering.
 const noseGeo=new T.BufferGeometry();
 noseGeo.setAttribute('position',new T.Float32BufferAttribute([-.020,.135,-.077,0,.075,-.145,.020,.135,-.077,-.022,.077,-.078,.022,.077,-.078],3));
 noseGeo.setIndex([0,2,1,0,1,3,2,4,1,3,1,4,0,3,4,0,4,2]);noseGeo.computeVertexNormals();
 mesh(head,'Nas',noseGeo,p.skin).userData.humanLandmark='nose';
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
 if(role==='player'){
  const glasses=group(head,'Ulleres quadrades');glasses.userData.humanGlasses='square';
  for(const side of [-1,1]){
   box(glasses,'Muntura quadrada',[.074,.048,.014],[side*.044,.143,-.108],dark);
   box(glasses,'Vidre quadrat',[.060,.034,.006],[side*.044,.143,-.117],0x182923);
   box(glasses,'Patilla ulleres',[.008,.010,.085],[side*.085,.148,-.062],dark);
  }
  box(glasses,'Pont ulleres',[.025,.010,.012],[0,.150,-.111],dark);
 }else if(role==='general'){
  for(const side of [-1,1]){oval(head,'Ulleres',[.035,.022,.008],[side*.044,.143,-.108],dark);box(head,'Patilla ulleres',[.008,.010,.085],[side*.085,.148,-.062],dark)}
  box(head,'Pont ulleres',[.025,.008,.009],[0,.15,-.111],gold);
 }
 if(role==='general')for(const side of [-1,1]){
  // The curled outer tips extend almost twice as far as the V17 moustache.
  // Keep the centre close to the philtrum rather than floating off the lip.
  const body=oval(head,'Bigoti principal',[.055,.022,.024],[side*.040,.066,-.113],hair);
  body.rotation.z=side*.10;body.userData.humanGeneralMoustacheV18={side,part:'body'};
  const curl=oval(head,'Punta corbada del bigoti',[.026,.017,.019],[side*.085,.086,-.111],hair);
  curl.rotation.z=side*.40;curl.userData.humanGeneralMoustacheV18={side,part:'curl'};
}
 // Move the complete face, skull and headwear as one assembly in
 // relation to the atlanto-occipital pivot. The chin now hangs below
 // and well in front of the pivot; the rear cranium envelops the neck.
 for(const part of head.children){part.position.y-=.060;part.position.z-=.070}
 const feet=[];
 for(const side of [-1,1]){
  const suffix=side<0?'L':'R',label=side<0?'esquerre':'dret';
  const hip=joint(pelvis,'hip'+suffix,'Maluc '+label,[side*.103*W,BODY.hip,0]);
  // V15: slightly slimmer protagonist thighs (~6% in width and depth).
  // Other roles and the hip/knee positions retain their previous proportions.
  const thighFactor=role==='player'?HUMAN_PLAYER_THIGH_FACTOR:1;
  const thigh=limb(hip,'Cuixa',BODY.thigh,.104*L*thighFactor,.083*L*thighFactor,.064*L*thighFactor,role==='farmer'?0x746c59:trouserColor);
  thigh.userData.humanThighFactor=thighFactor;
  if(role==='player')thigh.userData.humanTrouserLeg=true;
  const knee=joint(hip,'knee'+suffix,'Genoll '+label,[0,-BODY.thigh,0]);
  oval(knee,'Ròtula',[.067*L,.063,.065*L],[0,0,-.005],trouserColor);
  limb(knee,'Panxell',BODY.shin,.064*L,.076*L,.029*L,role==='farmer'?0x746c59:trouserColor);
  const ankle=joint(knee,'ankle'+suffix,'Turmell '+label,[0,-BODY.shin,0]);feet.push(ankle);
  // The boot follows the lower shin. The pivot sits at the real instep
  // junction; the heel no longer protrudes far behind the Achilles tendon.
  const bootSegments=Math.ceil(s.segments/4)*4; // Exact lateral/toe/heel silhouette at 90° intervals.
  const boot=loft(ankle,'Bota',[[.085,.038,.038,.006],[.042,.041,.048,.003],[.007,.046,.066,-.017],[-.030,.055,.102,-.051],[-.054,.055,.109,-.051]],shoe,bootSegments);
  boot.userData.humanBootShell=true;
  const sole=loft(ankle,'Sola',[[-.054,.057,.111,-.051],[-.070,.057,.111,-.051]],0x1d2521,bootSegments);
  sole.userData.humanLandmark='sole';
  if(s.detail===2)for(let j=0;j<4;j++)box(ankle,'Cordons',[.058,.006,.012],[0,.045-j*.010,-.052-j*.011],0x8b8b74);
  // V16: narrow the upper silhouette and pull the shoulder into the
  // clavicle. Keep its height and the animated elbow/wrist chain unchanged.
  const shoulder=joint(torso,'shoulder'+suffix,'Espatlla '+label,[side*HUMAN_SHOULDER_V16.pivotWidth*W,BODY.shoulder,.006]);
  const deltoid=loft(shoulder,'Deltoide',[
   [.048,.032*L,.039*L],  // Narrow shoulder root: no raised spherical cap
   [.010,.048*L,.054*L],  // Clavicle flows into the torso
   [-.040,.061*L,.069*L],
   [-.095,.061*L,.064*L], // Blend into the upper arm instead of bulging
   [-.148,.054*L,.051*L]
  ],p.uniform);
  const shoulderVertices=deltoid.geometry.attributes.position,ringSize=s.segments;
  for(let ring=0;ring<HUMAN_SHOULDER_V16.medialOffsets.length;ring++){
   const inward=-side*HUMAN_SHOULDER_V16.medialOffsets[ring]*W;
   for(let k=ring*ringSize;k<(ring+1)*ringSize;k++)shoulderVertices.setX(k,shoulderVertices.getX(k)+inward);
  }
  shoulderVertices.needsUpdate=true;
  deltoid.geometry.computeVertexNormals();
  deltoid.userData.humanShoulderV16={side,width:W,limb:L};
  const bare=p.civilian&&role!=='mechanic';
  limb(shoulder,'Braç',BODY.upperArm,.063*L,.058*L,.046*L,bare?p.skin:p.uniform);
  if(bare)limb(shoulder,'Màniga curta',.13,.069*L,.063*L,.058*L,p.uniform);
  const elbow=joint(shoulder,'elbow'+suffix,'Colze '+label,[0,-BODY.upperArm,0]);
  oval(elbow,'Articulació colze',[.048*L,.044,.047*L],[0,0,0],p.civilian?p.skin:p.uniform);
  limb(elbow,'Avantbraç',BODY.forearm,.049*L,.052*L,.030*L,p.civilian?p.skin:p.uniform);
  if(!p.civilian)tube(elbow,'Punys de màniga',.035*L,.037*L,.038,[0,-BODY.forearm+.017,0],p.trim);
  const wrist=joint(elbow,'wrist'+suffix,'Canell '+label,[0,-BODY.forearm,0]);
  // Rotate only the anatomical hand assembly, not the motion pivot or
  // weapon socket. Neutral palms face the thighs and both thumbs face -Z.
  const hand=group(wrist,'Mà '+label);hand.rotation.y=-side*Math.PI/2;hand.userData.humanHand=suffix;
  mesh(hand,'Palmell i dits continus',createHumanHandGeometry(T,side),p.skin).userData.humanHandSurface=true;
  const thumb=oval(hand,'Polze',[.013,.033,.014],[-side*.034,-.037,-.003],p.skin);
  thumb.rotation.z=-side*.30;thumb.userData.humanThumb=true;
  if(!p.civilian&&role!=='general'){
   // Anatomical elongated oval, convex toward the front, not a box.
   const pad=oval(knee,'Genollera ovalada',[.071*L,.090,.032],[0,-.008,-.064*L],p.trim);
   pad.userData.humanKneePad=true;
   if(s.detail===2){box(elbow,'Colzera',[.078*L,.087,.031],[0,.0,.047*L],p.trim);box(hip,'Butxaca lateral',[.04*L,.14,.10*L],[side*.102*L,-.20,.005],p.trim)}
  }
  if(role==='general'){
   box(shoulder,'Musclera',[.115,.025,.095],[0,.022,0],gold);
   for(const y of [-.20,-.22])tube(elbow,'Galó',.04,.04,.01,[0,y,0],gold,8);
   loft(hip,'Faldó jaqueta',[[.09,.115,.135],[-.22,.118,.145]],p.uniform,8);
  }
  if(role==='mechanic'){box(torso,'Tirant granota',[.034,.32,.016],[side*.10,.27,-.123],p.trim);box(hip,'Butxaca pantaló',[.074,.10,.018],[side*.04,-.12,-.092],p.trim)}
 }
 if(!p.civilian&&role!=='general'){
  const vest=loft(torso,'Armilla',[[.06,.158*W,.128],[.13,.183*W,.145],[.32,.207*W,.145],[.38,.166*W,.116]].map(([y,x,z])=>[y,x,z*D]),p.trim,bodySegments,role==='player');
  vest.userData.humanChestSurface=true;
  if(role==='player'){
   const shells=[torsoShell,vest];for(const shell of shells)shell.userData.humanChestSurface=true;
   const surface=(x,y,side)=>humanChestSurfaceZ(shells,x,y,side);
   // Every back-face vertex penetrates the outer shell by embed; every
   // outward face follows the same actual surface. No floating corners,
   // fixed front plane, or equal Z across different chest widths.
   const fitted=(name,dim,x,y,c,side=-1,embed=.009)=>{
    const [w,h,d]=dim,center=surface(x,y,side);if(center===null)throw Error('Centre fora del tors: '+name);
    const geo=new T.BoxGeometry(w,h,d,4,3,1),pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){
     const px=x+pos.getX(i),py=y+pos.getY(i),z=surface(px,py,side);
     if(z===null)throw Error('Accessori fora del tors: '+name+' '+px+' '+py);
     pos.setZ(i,pos.getZ(i)+z-center);
    }
    pos.needsUpdate=true;geo.computeVertexNormals();
    const part=mesh(torso,name,geo,c,[x,y,center+side*(d/2-embed)]);
    part.userData.humanChestFit={side,depth:d,embed};return part;
   };
   // Keep the central pocket's thickness and match the surface-relative
   // depth of both lateral pockets to it, not its absolute world Z.
   for(const i of [-1,0,1]){
    const x=i*.108*W,label=i<0?'esquerra':i>0?'dreta':'central';
    fitted('Butxaca armilla '+label,[.093,.115,.045],x,.15,p.uniform);
    fitted('Solapa butxaca '+label,[.098,.021,.048],x,.213,p.trim);
   }
   for(const side of [-1,1]){
    fitted('Tirant posterior',[.034,.30,.025],side*.106*W,.26,dark,1,.008);
    fitted('Sivella tirant',[.039,.028,.014],side*.14*W,.30,0x979883,-1,.006);
   }
   if(s.detail===2){
    const x=.135*W,y=.315,top=y+.095/2,ax=x+.012*W;
    fitted('Ràdio',[.055,.095,.038],x,y,dark);
    const antenna=tube(torso,'Antena',.004,.004,.14,[ax,top+.066,surface(ax,top,-1)-.010],dark,5);
    antenna.userData.humanChestAntenna=true;
    for(const y of [.27,.30,.33])fitted('Cinta armilla',[.26*W,.012,.012],0,y,p.uniform,-1,.005);
   }
  }else{
   for(const x of [-.115,0,.115]){box(torso,'Butxaca armilla',[.093,.115,.045],[x,.15,-.148],p.uniform);box(torso,'Solapa butxaca',[.098,.021,.048],[x,.213,-.151],p.trim)}
   for(const side of [-1,1]){box(torso,'Tirant',[.034,.30,.025],[side*.14,.26,.125],dark);box(torso,'Sivella tirant',[.039,.028,.014],[side*.14,.30,-.139],0x979883)}
   if(s.detail===2){box(torso,'Ràdio',[.055,.095,.038],[.145,.315,-.145],dark);tube(torso,'Antena',.004,.004,.14,[.16,.42,-.15],dark,5);for(const y of [.27,.30,.33])box(torso,'Cinta armilla',[.26,.012,.012],[0,y,-.145],p.uniform)}
  }
  const backpack=group(torso,'Motxilla');
  const bag=loft(backpack,'Bossa',[[.07,.125,.065,.18],[.16,.142,.078,.19],[.37,.126,.07,.18]],p.trim);
  // Broad load-bearing shoulder webbing follows the front vest, arches over
  // each clavicle and joins the REAR surface of the backpack. Both endpoints
  // are sampled from actual meshes, avoiding floating straps.
  const shoulderHarness=(side)=>{
   const frontX=side*.108*W,crestX=side*.112*W,rearX=side*.095*W;
   const shells=[torsoShell,vest],frontY=.292,upperY=.357,rearY=.318;
   const frontZ=humanChestSurfaceZ(shells,frontX,frontY,-1);
   const upperZ=humanChestSurfaceZ(shells,frontX,upperY,-1);
   const rearZ=humanChestSurfaceZ([bag],rearX,rearY,1);
   if([frontZ,upperZ,rearZ].some(v=>v===null))throw Error('No es pot ancorar la cinta de l’espatlla');
   const path=[
    [frontX,frontY,frontZ+.007],
    [frontX,upperY,upperZ+.005],
    [crestX,.423,-.082*D],
    [crestX,.475,-.029*D],
    [crestX,.493,.041*D],
    [crestX,.447,.137*D],
    [rearX,rearY,rearZ-.010]
   ];
   const width=.064*W,thickness=.021,half=width/2,points=[],indices=[];
   for(let i=0;i<path.length;i++){
    const prev=path[Math.max(0,i-1)],next=path[Math.min(path.length-1,i+1)];
    const dy=next[1]-prev[1],dz=next[2]-prev[2],length=Math.hypot(dy,dz);
    const ny=dz/length,nz=-dy/length,[x,y,z]=path[i];
    // Four corners per station: closed curved solid webbing, not flat boxes.
    points.push(x-half,y-ny*.004,z-nz*.004,
                x+half,y-ny*.004,z-nz*.004,
                x+half,y+ny*thickness,z+nz*thickness,
                x-half,y+ny*thickness,z+nz*thickness);
    if(i===0)continue;
    const a=(i-1)*4,b=i*4;
    for(let k=0;k<4;k++){
     const k2=(k+1)%4;
     indices.push(a+k,a+k2,b+k,a+k2,b+k2,b+k);
    }
   }
   const end=(path.length-1)*4;
   indices.push(0,2,1,0,3,2,end,end+1,end+2,end,end+2,end+3);
   const geo=new T.BufferGeometry();
   geo.setAttribute('position',new T.Float32BufferAttribute(points,3));
   geo.setIndex(indices);geo.computeVertexNormals();
   const label=side<0?'esquerra':'dreta';
   const strap=mesh(torso,'Cinta ampla espatlla '+label,geo,role==='player'?0x344638:role==='elite'?0x27372e:0x493336);
   strap.userData.humanHarnessStrap={
    side,width,thickness,
    front:{x:frontX,y:frontY,z:path[0][2]},
    rear:{x:rearX,y:rearY,z:path.at(-1)[2]}
   };
  };
  for(const side of [-1,1])shoulderHarness(side);
  if(p.armor)for(const side of [-1,1])box(torso,'Placa blindatge',[.14,.18,.028],[side*.08,.30,-.16],0x34443e);
 }else if(role==='general'){
  // A military frock coat: long contrasting lapels, double-breasted buttons
  // and a tailored waist flowing into four independent, split coat tails.
  for(const side of [-1,1]){
   const lapel=box(torso,'Solapa llarga de cassaca',[.075,.29,.025],[side*.084,.255,-.136],p.trim);
   lapel.rotation.z=side*.20;
   for(const y of [.12,.22,.31])oval(torso,'Botó daurat cassaca',[.011,.012,.009],[side*.045,y,-.150],gold);
  }
  for(let i=0;i<(s.detail===2?6:3);i++){
   const x=.055+(i%3)*.035,y=.33-Math.floor(i/3)*.06;
   box(torso,'Cinta medalla',[.025,.028,.012],[x,y,-.159],[0xb64b41,0x4b7b8a,0xc8c5a4][i%3]);
   oval(torso,'Medalla',[.012,.015,.007],[x,y-.024,-.176],gold);
  }
  const waist=loft(pelvis,'Cintura entallada de cassaca',[
   [.109,.153*W,.117,.003],
   [.069,.174*W,.133,.007],
   [.015,.188*W,.148,.010],
   [-.066,.175*W,.150,.011],
   [-.123,.151*W,.135,.010]
  ],p.uniform,bodySegments);
  waist.userData.humanGeneralCoatWaistV18=true;
  for(const side of [-1,1]){
   for(const y of [.055,-.018])oval(pelvis,'Botó daurat cintura',[.010,.011,.009],[side*.044,y,-.155],gold);
  }
  const tails=[
   [.045,.105,.132,0],[-.083,.115,.141,.002],[-.195,.127,.149,.004],
   [-.322,.139,.158,.008],[HUMAN_GENERAL_V18.coatHem,.151,.169,.012]
  ];
  // The tails are attached to the EXISTING hip pivots. Walking, running,
  // sitting and combat use their original joint rotations; the coat splits
  // and follows each thigh rather than cutting through bent knees.
  for(const side of [-1,1]){
   const hip=root.getObjectByName('Maluc '+(side<0?'esquerre':'dret'));
   if(!hip)throw Error('Articulació de maluc absent per a cassaca');
   for(const front of [true,false]){
    const positions=[],indices=[],cols=HUMAN_GENERAL_V18.coatSegments+1;
    const hem=[];
    for(let row=0;row<tails.length;row++){
     const [y,rX,rZ,shift]=tails[row];
     for(let k=0;k<cols;k++){
      const theta=-Math.PI*.43+(k/(cols-1))*Math.PI*.86;
      const inner=Math.sign(Math.sin(theta))===-side;
      const x=Math.sin(theta)*(inner?Math.min(rX,.080*W):rX);
      const z=(front?-1:1)*Math.cos(theta)*rZ+shift;
      positions.push(x,y,z);
      if(row===tails.length-1)hem.push(new T.Vector3(x,y,z));
      if(row===0||k===cols-1)continue;
      const a=(row-1)*cols+k,b=row*cols+k;
      if(front)indices.push(a-1,a,b-1,a,b,b-1);
      else indices.push(a-1,b-1,a,a,b-1,b);
     }
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geo.setIndex(indices);geo.computeVertexNormals();
    const name='Faldó cassaca '+(front?'frontal ':'posterior ')+(side<0?'esquerre':'dret');
    const tail=mesh(hip,name,geo,p.uniform);
    tail.userData.humanGeneralCoatV18={side,front,hem:HUMAN_GENERAL_V18.coatHem,rows:tails.length};
    const piping=mesh(hip,'Vora de cassaca '+name,
     new T.TubeGeometry(new T.CatmullRomCurve3(hem),12,.0035,4,false),p.trim);
    piping.userData.humanGeneralCoatTrimV18={side,front};
   }
  }
 }else{
  box(torso,'Butxaca camisa',[.085,.09,.016],[-.096,.29,-.123],p.trim);
  for(const y of [.12,.19,.26,.34])oval(torso,'Botó camisa',[.005,.005,.004],[0,y,-.126],0xc6c0aa);
  if(role==='mechanic'){
   box(torso,'Pitrera granota',[.22,.20,.020],[0,.23,-.126],p.trim);box(torso,'Identificació',[.055,.034,.009],[-.055,.28,-.141],0xc6cbbb);
   box(pelvis,'Eina al cinturó',[.018,.17,.016],[.175,-.05,-.04],0x9ba6a0);for(const side of [-1,1])box(pelvis,'Boca clau',[.012,.035,.016],[.175+side*.018,.05,-.04],0x9ba6a0);
  }
 }
 // Decorative game props distinguish the existing roles; no functional parts.
 if(p.weapon&&!visualOnly){
  let parent;root.traverse(n=>{if(n.userData.humanMotionJoint==='wristR')parent=n});
  const weapon=group(parent,role==='player'?'Arma del joc':p.weapon==='rocket'?'Bazuca':p.weapon==='rifle'?'Fusell':'Pistola');
  weapon.position.set(0,-.055,role==='player'?-.09:-.015);
  // Enlarged launcher starts in its safe angled carry pose before sizing the human.
  weapon.rotation.x=role==='player'?0:p.weapon==='rocket'?-0.695:-Math.PI/2;
  weapon.userData.humanWeapon=p.weapon;
  if(role==='player'){
   // Meshes installed after batching so they stay individually selectable.
   weapon.userData.humanPreviewWeapon=true;
  }else if(p.weapon==='rocket'){
   const body=tube(weapon,'Tub bazuca',.056,.065,.96,[0,.04,-.18],0x566149,10);body.rotation.x=Math.PI/2;
   for(const z of [-.68,.30]){const rim=tube(weapon,'Extrem bazuca',.074,.074,.04,[0,.04,z],dark,10);rim.rotation.x=Math.PI/2}
   box(weapon,'Empunyadura bazuca',[.045,.10,.06],[0,-.04,0],dark);
   // Larger launcher, including both the barrel and its handholds.
   weapon.scale.setScalar(1.5);weapon.userData.humanBazookaSize=1.5;
   const seat=group(weapon,'Recolzament espatlla dreta');
   seat.position.set(0,-.055,.19);seat.userData.humanBazookaShoulderSeat=true;
   const right=group(weapon,'Presa dreta bazuca');
   right.position.set(0,-.070,.01);right.userData.humanBazookaRightGrip=true;
  }else{
   const rifle=p.weapon==='rifle';
   box(weapon,'Cos arma',[.052,.065,rifle?.29:.14],[0,.018,rifle?-.10:-.045],dark);
   box(weapon,'Empunyadura arma',[.04,.08,.05],[0,-.038,.012],p.trim);
   if(rifle){box(weapon,'Culata',[.043,.07,.17],[0,.012,.13],p.trim);box(weapon,'Carregador',[.033,.10,.06],[0,-.06,-.10],dark);const barrel=tube(weapon,'Canó visual',.012,.014,.27,[0,.018,-.36],dark,8);barrel.rotation.x=Math.PI/2}
  }
  if(p.weapon==='rocket'||p.weapon==='rifle'){
   const grip=group(weapon,'Presa esquerra de cursa');
   grip.position.set(p.weapon==='rocket'?-.095:-.044,-.03,p.weapon==='rocket'?-.14:-.205);
   grip.userData.humanRunSupportGrip=true;
  }
 }
 // Batch only within each rigid assembly; joints, clothing and accessories
 // remain addressable in the editor and in JSON drafts.
 const merge=g=>{
  for(const child of [...g.children])if(child.isGroup)merge(child);
  const batches=new Map();for(const m of g.children)if(m.isMesh&&!m.userData.humanLandmark&&!m.userData.humanChestFit&&!m.userData.humanChestSurface&&!m.userData.humanHarnessStrap&&!m.userData.humanChestAntenna&&!m.userData.humanHandSurface&&!m.userData.humanThumb&&!m.userData.humanKneePad&&!m.userData.humanCalfProfile&&!m.userData.humanThighFactor&&!m.userData.humanShoulderV16&&!m.userData.humanPantsFly&&!m.userData.humanGeneralMoustacheV18&&!m.userData.humanGeneralCoatV18&&!m.userData.humanGeneralCoatWaistV18&&!m.userData.humanGeneralCoatTrimV18){if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(m)}
  for(const [material,items]of batches){if(items.length<2)continue;const positions=[],normals=[],names=[];
   for(const m of items){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);names.push(m.name);g.remove(m);geo.dispose();m.geometry.dispose()}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.userData.labOwned=true;
   const m=new T.Mesh(geo,material);m.name=g.name+' · '+names.slice(0,3).join(', ');m.userData.batchedParts=names;m.castShadow=m.receiveShadow=true;g.add(m);
  }
 };merge(root);
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),height=bounds.max.y-bounds.min.y;
 root.scale.setScalar(p.height/height);
 root.userData={humanProposal:{role,style,version:HUMAN_VERSION,iteration:18},humanHeight:p.height,labAssemblies:true};
 if(role==='player'&&!visualOnly)setHumanPreviewWeapon(T,root,'pistol');
 return root;
}

/** Switch the player's actual game weapon mesh without rebuilding the body. */
export function setHumanPreviewWeapon(T,root,kind){
 if(!HUMAN_PREVIEW_WEAPONS.includes(kind))throw Error('Arma no reconeguda: '+kind);
 let mount=null;
 root.traverse(o=>{if(o.userData.humanPreviewWeapon)mount=o});
 if(!mount)return false;
 const visual=createGameWeaponPreview(T,kind);
 visual.scale.setScalar({pistol:.25,assault:.22,sniper:.18,bazooka:.375,knife:.28,cutters:.30}[kind]);
 for(const child of [...mount.children]){
  child.traverse(obj=>{
   if(obj.isMesh){
    obj.geometry?.dispose();
    for(const mat of Array.isArray(obj.material)?obj.material:[obj.material])mat?.dispose();
   }
  });
  mount.remove(child);
 }
 visual.traverse(obj=>{
  if(obj.isMesh){
   obj.userData.humanGameWeaponPart=kind;
   obj.geometry.userData.labOwned=true;
   for(const mat of Array.isArray(obj.material)?obj.material:[obj.material])mat.userData.labOwned=true;
  }
 });
 if(['assault','sniper','bazooka'].includes(kind)){
  const grip=new T.Object3D();
  grip.name='Presa esquerra de cursa';
  grip.position.set(...{assault:[-.11,-.12,-.48],sniper:[-.13,-.17,-.58],bazooka:[-.22,-.31,-.35]}[kind]);
  grip.userData.humanRunSupportGrip=true;
  visual.add(grip);
 }
 if(kind==='bazooka'){
  // Shoulder seat measured at the underside of the tube's rear section.
  const seat=new T.Object3D();seat.name='Recolzament espatlla dreta';
  seat.position.set(0,-.077,.29);seat.userData.humanBazookaShoulderSeat=true;
  const right=new T.Object3D();right.name='Presa dreta bazuca';
  right.position.set(.015,-.132,.12);right.userData.humanBazookaRightGrip=true;
  mount.add(seat,right);mount.userData.humanBazookaSize=1.5;
 }
 mount.add(visual);
 mount.userData.humanWeapon=kind;
 mount.userData.humanGameWeaponSource='characters.js';
 root.userData.equippedPreviewWeapon=kind;
 return true;
}

// Gait angles (radians): hip, knee, foot pitch in the body sagittal plane.
// Both cycles start at forward foot contact; negative foot pitch is toe-down.
// Walk: heel strike, flat support, toe-off, swing. Run: shorter stance,
// rearward-pointing trailing toe during the final push-off, folded swing
// and a brief aerial phase. Local -Z is the toe and the character's front.
const WALK_GAIT=[
 [0,.36,-.06,.21],[.115,.22,-.25,0],[.30,-.05,-.07,0],
 [.50,-.34,-.12,-.30],[.62,-.40,-.48,-.55],[.74,-.02,-1.0,-.48],
 [.87,.38,-.40,.10],[1,.36,-.06,.21]
];
const RUN_GAIT=[
 [0,.60,-.22,.07],[.13,.15,-.53,-.12],
 [.29,-.43,-.38,-1.45],           // The trailing foot begins to point rearward.
 [.39,-.55,-.85,-2.68],           // Last push-off: toe backward, only slightly downward.
 [.48,-.40,-1.38,-2.48],          // Continue the rearward extension into flight.
 [.53,-.15,-1.80,-2.10],          // Knee folds; foot follows the recovering shin.
 [.69,.55,-1.45,-.55],[.85,.78,-.62,.10],[1,.60,-.22,.07]
];
const mix=(a,b,t)=>a+(b-a)*t,clamp01=x=>Math.max(0,Math.min(1,x));
const cycle=x=>((x%1)+1)%1;
function sampleGait(keys,phase){
 const p=cycle(phase);let i=0;while(i<keys.length-2&&p>=keys[i+1][0])i++;
 const a=keys[i],b=keys[i+1],h=b[0]-a[0],t=(p-a[0])/h;
 const prev=i===0?[keys.at(-2)[0]-1,...keys.at(-2).slice(1)]:keys[i-1];
 const next=i===keys.length-2?[1+keys[1][0],...keys[1].slice(1)]:keys[i+2];
 // Periodic monotone cubic interpolation. No overshoot at toe-off or
 // sudden velocity jump through the cycle seam.
 const slope=(l,r)=>l*r<=0?0:2*l*r/(l+r);
 return [1,2,3].map(k=>{
  const d=(b[k]-a[k])/h,m0=slope((a[k]-prev[k])/(a[0]-prev[0]),d),m1=slope(d,(next[k]-b[k])/(next[0]-b[0]));
  return (2*t*t*t-3*t*t+1)*a[k]+(t*t*t-2*t*t+t)*h*m0+(-2*t*t*t+3*t*t)*b[k]+(t*t*t-t*t)*h*m1;
 });
}
export function sampleHumanGait(phase,blend){
 const t=clamp01(blend),walk=sampleGait(WALK_GAIT,phase),run=sampleGait(RUN_GAIT,phase),[hip,knee,foot]=walk.map((v,i)=>mix(v,run[i],t));
 // The ankle adds its own flexion rather than cancelling hip and knee.
 // Only sprinting allows the stronger plantar-flexion needed to align the
 // trailing shoe with the rearward shin; walking retains its original limit.
 const minAnkle=mix(-.75,-1.40,t);
 const ankle=Math.max(minAnkle,Math.min(.82,foot-hip-knee));
 return {hip,knee,ankle,footPitch:hip+knee+ankle};
}
const gaitRate=blend=>mix(5.5,9,blend)/(2*Math.PI);
export function createHumanGaitClock(mode='walk'){return {phase:0,blend:mode==='run'?1:0}}
export function advanceHumanGait(clock,dt,mode){
 const elapsed=Math.max(0,dt),goal=mode==='run'?1:0;
 if(elapsed===0)return {...clock};
 const next=goal+(clock.blend-goal)*Math.exp(-elapsed/.145);
 return {phase:cycle(clock.phase+elapsed*gaitRate((clock.blend+next)/2)),blend:Math.abs(next-goal)<.0001?goal:next};
}
function flightLift(phase,blend){
 // Both feet are off the ground in the running stride from .39 to .50
 // (and again half a cycle later); fade the lift with gait blending.
 const p=cycle(phase*2)/2;
 if(p<=.39||p>=.50)return 0;
 return .012*blend*blend*Math.sin(Math.PI*(p-.39)/.11)**2;
}
// Correct weapon axis in the model's frame, independent of wrist and elbow
// rotations. Game firearm muzzles are along local -Z; the real game knife's
// blade runs along local -Y. This also handles crouching and running without
// a separate hard-coded +/-90 degree wrist compensation.
function orientHumanEquippedWeapon(model,weapon,mode,rig,j){
 if(!weapon)return;
 const type=weapon.userData.humanWeapon;
 const blade=type==='knife',tool=type==='cutters';
 const long=['rocket','bazooka','sniper','assault','rifle'].includes(type);
 const source=rig.source.set(0,blade||tool?-1:0,blade||tool?0:-1);
 const lowered=long&&(mode==='crouch'||mode==='work');
 // Oversized bazookas must not drag their muzzles on the ground in idle.
 const bazookaCarry=['bazooka','rocket'].includes(type)&&['rest','idle','walk','wave'].includes(mode);
 const target=rig.direction;
 if(mode==='run'&&type==='pistol'&&j?.elbowR&&j.wristR){
  // Right-arm swing drives the pistol. No frozen model-space barrel axis.
  target.copy(j.wristR.getWorldPosition(rig.wrist)).sub(j.elbowR.getWorldPosition(rig.elbow)).normalize();
 }else{
  target.set(mode==='run'&&long?-.28:0,
   blade?1:mode==='aim'&&!tool?0:mode==='run'&&long?-.72:lowered?-.20:bazookaCarry?-.64:-1,
   blade||tool?0:mode==='aim'?-1:mode==='run'&&long?-.64:lowered?-.9797958971:bazookaCarry?-.7683749085:0)
   .normalize().applyQuaternion(model.getWorldQuaternion(rig.modelQ));
 }
 weapon.parent.getWorldQuaternion(rig.parentQ);
 target.applyQuaternion(rig.parentQ.invert()).normalize();
 weapon.quaternion.setFromUnitVectors(source,target);
 weapon.updateMatrixWorld(true);
}

// The left hand tracks an actual fore-end anchor; right wrist remains the
// primary grip and weapon parent. Both arms follow the running skeleton.
function supportHumanRunningLongGun(model,weapon,j,rig){
 let grip=null;weapon.traverse(n=>{if(n.userData.humanRunSupportGrip)grip=n});
 if(!grip||!j.shoulderL||!j.elbowL||!j.wristL)return;
 model.updateMatrixWorld(true);
 const target=grip.getWorldPosition(rig.gripWorld);
 j.shoulderL.parent.worldToLocal(target);
 const upper=j.elbowL.parent.position.length();
 const lower=j.wristL.parent.position.length()+BODY.handGrip;
 const d=Math.min(upper+lower-.001,Math.max(.001,target.length()));
 const axis=target.clone().normalize(),along=(upper*upper+d*d-lower*lower)/(2*d);
 const radius=Math.sqrt(Math.max(0,upper*upper-along*along));
 const pole=new THREE.Vector3(-.48,-.72,.30);
 pole.addScaledVector(axis,-pole.dot(axis)).normalize();
 const bend=axis.clone().multiplyScalar(along).addScaledVector(pole,radius);
 const down=rig.down.set(0,-1,0);
 j.shoulderL.quaternion.setFromUnitVectors(down,bend.clone().normalize());
 const direction=target.clone().sub(bend).normalize().applyQuaternion(j.shoulderL.quaternion.clone().invert());
 j.elbowL.quaternion.setFromUnitVectors(down,direction);
 j.wristL.rotation.set(0,0,-.14);
 model.updateMatrixWorld(true);
}
// Separate the rocket from the wrist during aiming so it can rest on the
// right shoulder and both arms can be solved to its handles, with no IK loop.
function placeHumanBazookaOnShoulder(model,weapon,j,rig){
 let seat=null,right=null,left=null;
 weapon.traverse(n=>{
  if(n.userData.humanBazookaShoulderSeat)seat=n;
  if(n.userData.humanBazookaRightGrip)right=n;
  if(n.userData.humanRunSupportGrip)left=n;
 });
 if(!seat||!right||!left||!j.shoulderR)return;
 model.updateMatrixWorld(true);
 const target=j.shoulderR.getWorldPosition(rig.shoulderGoal);
 rig.shoulderOffset.set(0,.045,-.015).applyQuaternion(model.getWorldQuaternion(rig.modelQ));
 target.add(rig.shoulderOffset);
 weapon.parent.worldToLocal(target);
 const current=seat.getWorldPosition(rig.seatWorld);
 weapon.parent.worldToLocal(current);
 weapon.position.add(target.sub(current));
 model.updateMatrixWorld(true);
 solveHumanBazookaGrip(model,j,right,'R',rig);
 solveHumanBazookaGrip(model,j,left,'L',rig);
}
function solveHumanBazookaGrip(model,j,grip,side,rig){
 const shoulder=j['shoulder'+side],elbow=j['elbow'+side],wrist=j['wrist'+side];
 if(!shoulder||!elbow||!wrist)return;
 const target=grip.getWorldPosition(rig.gripWorld);
 shoulder.parent.worldToLocal(target);
 const upper=elbow.parent.position.length(),lower=wrist.parent.position.length()+BODY.handGrip;
 const d=Math.min(upper+lower-.001,Math.max(.001,target.length())),axis=target.clone().normalize();
 const along=(upper*upper+d*d-lower*lower)/(2*d);
 const radius=Math.sqrt(Math.max(0,upper*upper-along*along));
 const pole=new THREE.Vector3(side==='R'?.48:-.48,-.85,.19);
 pole.addScaledVector(axis,-pole.dot(axis)).normalize();
 const bend=axis.clone().multiplyScalar(along).addScaledVector(pole,radius);
 const down=rig.down.set(0,-1,0);
 shoulder.quaternion.setFromUnitVectors(down,bend.clone().normalize());
 const forearm=target.clone().sub(bend).normalize().applyQuaternion(shoulder.quaternion.clone().invert());
 elbow.quaternion.setFromUnitVectors(down,forearm);
 wrist.rotation.set(0,0,side==='R'?.06:-.10);
 model.updateMatrixWorld(true);
}
const rigCache=new WeakMap();
export function poseHumanProposal(root,time=0,mode='idle',locomotion=null){
 let rigs=rigCache.get(root);
 if(!rigs){rigs=[];root.traverse(n=>{if(!n.userData.humanProposal)return;const joints={},soles=[];let weapon;n.traverse(j=>{const id=j.userData.humanMotionJoint;if(id)joints[id]=j;if(j.userData.humanWeapon)weapon=j;if(j.userData.humanLandmark==='sole')soles.push(j)});rigs.push({model:n,joints,soles,weapon,orientation:{
 source:new THREE.Vector3(),direction:new THREE.Vector3(),
 modelQ:new THREE.Quaternion(),parentQ:new THREE.Quaternion(),
 wrist:new THREE.Vector3(),elbow:new THREE.Vector3(),gripWorld:new THREE.Vector3(),down:new THREE.Vector3(),footPoint:new THREE.Vector3(),shoulderGoal:new THREE.Vector3(),shoulderOffset:new THREE.Vector3(),seatWorld:new THREE.Vector3()
 }})});rigCache.set(root,rigs)}
 for(const {model,joints:j,soles,weapon,orientation}of rigs){
  const set=(id,x=0,y=0,z=0)=>{if(j[id])j[id].rotation.set(x,y,z)};
  if(weapon&&j.wristR&&j.spine){
   const shoulderAim=mode==='aim'&&['bazooka','rocket'].includes(weapon.userData.humanWeapon);
   const parent=shoulderAim?j.spine:j.wristR;
   if(weapon.parent!==parent)parent.add(weapon);
   if(!shoulderAim)weapon.position.set(0,-.055,model.userData.humanProposal.role==='player'?-.09:-.015);
  }
  for(const n of Object.values(j)){n.rotation.set(0,0,0);n.position.set(0,0,0)}
  if(mode==='rest'){model.updateMatrixWorld(true);orientHumanEquippedWeapon(model,weapon,mode,orientation,j);continue}
  const walk=mode==='walk'||mode==='run',blend=walk?clamp01(locomotion?.blend??(mode==='run'?1:0)):0;
  const cyclePhase=walk?(locomotion?.phase??time*gaitRate(blend)):0,phase=cyclePhase*Math.PI*2,breath=Math.sin(time*1.8);
  // Facing -Z, negative spine X bends the shoulders FORWARD.
  set('spine',walk?mix(-.028,-.145,blend):.008*breath,walk?Math.sin(phase)*mix(.020,.030,blend):Math.sin(time*.7)*.015);
  set('neck',0,mode==='idle'?Math.sin(time*.6)*.08:0);set('head',-.015*breath);
  for(const [i,side]of ['L','R'].entries()){
   const sign=i?-1:1,a=phase+i*Math.PI,gait=walk?sampleHumanGait(cyclePhase+i*.5,blend):{hip:0,knee:0,ankle:0};
   set('hip'+side,gait.hip);set('knee'+side,gait.knee);set('ankle'+side,gait.ankle);
   set('shoulder'+side,walk?-gait.hip*mix(.72,.86,blend):.025*breath,0,-sign*.06);
   set('elbow'+side,walk?mix(.18+.16*Math.max(0,Math.sin(a)),1.15+.17*Math.sin(a),blend):.10);
   set('wrist'+side,0,0,sign*.035);
  }
  // A braced two-handed pose develops as the gait transitions to running.
  // Pistols keep the normal right-arm swing instead of a fixed cross-body pose.
  const carrying=mode==='run'&&weapon&&['rocket','bazooka','sniper','assault','rifle'].includes(weapon.userData.humanWeapon);
  if(carrying){
   const hold=clamp01((blend-.20)/.80);
   const sr=j.shoulderR?.rotation.x??0,er=j.elbowR?.rotation.x??0;
   const sl=j.shoulderL?.rotation.x??0,el=j.elbowL?.rotation.x??0;
   // Fold both elbows toward the chest, preserving the moving gait.
   set('shoulderR',mix(sr,.30,hold),0,-.14*hold);
   set('elbowR',mix(er,1.38,hold));
   set('wristR',0,0,-.09*hold);
   set('shoulderL',mix(sl,.53,hold),0,.16*hold);
   set('elbowL',mix(el,1.15,hold));
  }
  if(mode==='crouch'){
   set('spine',-.24);for(const side of ['L','R']){set('hip'+side,1.02);set('knee'+side,-1.78);set('ankle'+side,.76);set('shoulder'+side,.30);set('elbow'+side,.60)}
  }else if(mode==='aim'){
   if(weapon&&['bazooka','rocket'].includes(weapon.userData.humanWeapon)){
    set('spine',-.035,-.045);set('head',0,.08);
    set('shoulderR',.50,.04,-.14);set('elbowR',1.18);set('wristR',0,0,-.05);
    set('shoulderL',.65,0,.15);set('elbowL',.90);
   }else{
    const pistol=weapon?.userData.humanWeapon==='pistol',upper=pistol?.90:.45,lower=pistol?.90:2.0;
    set('spine',-.045,-.12);set('head',0,.12);set('shoulderR',upper,.20,-.10);set('elbowR',lower);set('wristR',Math.PI/2-upper-lower);
   }
  }else if(mode==='work'){
   set('spine',-.32);set('neck',.10);set('hipL',.24);set('hipR',.24);set('kneeL',-.42);set('kneeR',-.42);
   set('ankleL',.18);set('ankleR',.18);set('shoulderL',1.10,0,.15);set('shoulderR',.90,0,-.12);
   set('elbowL',.32);set('elbowR',.50+Math.sin(time*5)*.23);set('wristR',Math.sin(time*5)*.12,0,.08);
  }else if(mode==='wave'){
   set('shoulderR',.12,0,2.5);set('elbowR',.35,0,Math.sin(time*4)*.28);set('wristR',0,0,Math.sin(time*4)*.20);set('head',0,-.10);
  }
  // Ground clearance follows the actual tilted boot soles, with a brief
  // true aerial phase in the running cycle.
  if(j.pelvis)set('pelvis',0,walk?-Math.sin(phase)*.008:0,walk?Math.cos(phase)*.006:0);
  model.updateMatrixWorld(true);
  // V11: sample the actual outsole vertices, not the V3 ellipse.
  // This remains correct when the boot profile, pivot or stride is edited.
  let lowest=Infinity;
  for(const sole of soles){
   const positions=sole.geometry.attributes.position;
   for(let k=0;k<positions.count;k++){
    const point=orientation.footPoint.fromBufferAttribute(positions,k);
    sole.localToWorld(point);model.worldToLocal(point);
    lowest=Math.min(lowest,point.y);
   }
  }
  // Avoid using the swing-foot's height as the whole body's vertical
  // position during running; only correct penetration below the floor.
  if(j.pelvis&&Number.isFinite(lowest)){
   const planted=-lowest,stableRun=Math.max(0,planted);
   j.pelvis.position.y=walk?mix(planted,stableRun,blend)+flightLift(cyclePhase,blend):planted;
  }
  model.updateMatrixWorld(true);
  orientHumanEquippedWeapon(model,weapon,mode,orientation,j);
  if(carrying&&blend>.8)supportHumanRunningLongGun(model,weapon,j,orientation);
  const shoulderBazooka=mode==='aim'&&weapon&&['bazooka','rocket'].includes(weapon.userData.humanWeapon);
  if(shoulderBazooka)placeHumanBazookaOnShoulder(model,weapon,j,orientation);
  if(mode==='aim'&&weapon&&!shoulderBazooka&&!['knife','cutters'].includes(weapon.userData.humanWeapon)&&j.shoulderL&&j.elbowL){
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
  const b=new T.Box3();for(const child of wrist.children)if(child.isMesh||child.userData.humanHand)b.union(bounds(child));
  if(!b.isEmpty()){const t=b.getCenter(new T.Vector3());t.y=b.min.y;tips[side]=t;points['tip'+side]=t}
 }
 const middle=s.getCenter(new T.Vector3());points.chin=new T.Vector3(middle.x,s.min.y,middle.z);points.crown=new T.Vector3(middle.x,crown,middle.z);points.crotch=new T.Vector3(middle.x,p.min.y,p.getCenter(new T.Vector3()).z);
 const ratio=id=>(points[id].y-floor)/unit;
 return {proposal,floor,crown,unit,points,headUnits:(crown-floor)/(s.max.y-s.min.y),ratios:Object.fromEntries(Object.keys(points).map(id=>[id,ratio(id)])),skullBounds:s,neckBounds:n};
}
