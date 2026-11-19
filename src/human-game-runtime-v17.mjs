// V17-compatible rigid-rig adapter for the latest V18 skin (general cassaca). No gameplay animation,
// seat, IK, collision, physics, weapon anchor or AI state is replaced.
import {createHumanProposal,HUMAN_VERSION,sampleHumanGait} from './human-proposals.mjs?rev=humans-v18-thin-neck-nape-20261119-1';

export const GAME_HUMAN_SKIN_VERSION='humans-v18';
// Escala exclusivament visual a peu: rig i geometria intactes.
export const FOOT_PLAYER_VISUAL_FACTOR=8/5; // +20% respecte del factor anterior 4/3
const SOURCE_THIGH=.49,SOURCE_SHIN=.49,SOURCE_ARM=.385,SOURCE_FOREARM=.310;
const cache=new Map();
function sourceFor(T,role){
 if(!cache.has(role)){
  // Preview-only weapons are not created: game weapons keep their real mounts.
  const root=createHumanProposal(T,role,'a',{visualOnly:true});
  root.updateWorldMatrix(true,true);
  const joints=new Map(),parts=[];
  root.traverse(node=>{
   if(node.userData?.humanMotionJoint)joints.set(node.userData.humanMotionJoint,node);
   if(node.isMesh)parts.push(node);
  });
  const neckJoint=joints.get('neck'),headJoint=joints.get('head');
  if(!neckJoint||!headJoint)throw Error('Falten els pivots de coll i cap del laboratori');
  // Head pivot in the editor is NOT directly above the neck: it also has a
  // fore/aft offset. Preserve that full vector when fitting the game skin.
  const neckToHead=headJoint.getWorldPosition(new T.Vector3())
   .sub(neckJoint.getWorldPosition(new T.Vector3())).divideScalar(root.scale.x);
  cache.set(role,{root,joints,parts,neckToHead});
 }
 return cache.get(role);
}
function nearestJoint(mesh){
 for(let p=mesh.parent;p;p=p.parent)if(p.userData?.humanMotionJoint)return p.userData.humanMotionJoint;
 return null;
}
function newAnchor(T,parent,name,y){
 const g=new T.Group();g.name='HUMANS V17 · '+name;g.position.y=y;
 g.userData.humanGameV17Anchor=name;parent.add(g);return g;
}
// Skinning by RIGID, joint-local geometry. The old joint owns every new
// polygon, therefore all rotations and vehicle limbBetween() poses are kept.
function copySkin(T,template,resolve){
 const materials=new Map(),added=[];
 template.root.updateWorldMatrix(true,true);
 for(const original of template.parts){
  const joint=nearestJoint(original);if(!joint)continue;
  const info=resolve(joint);if(!info)continue;
  const sourcePivot=template.joints.get(info.source||joint);
  if(!sourcePivot)throw Error('V17: pivot font absent '+joint);
  const relative=new T.Matrix4().copy(sourcePivot.matrixWorld).invert().multiply(original.matrixWorld);
  const scales=info.scales,transform=new T.Matrix4().makeScale(...scales).multiply(relative);
  const geometry=original.geometry.clone();geometry.applyMatrix4(transform);
  let mat=materials.get(original.material);
  if(!mat){mat=original.material.clone();materials.set(original.material,mat)}
  const part=new T.Mesh(geometry,mat);
  part.castShadow=original.castShadow;part.receiveShadow=original.receiveShadow;
  part.userData.humanGameV17Mesh=true;
  // Keep a real source identity for tests, debugging, and selective disposal.
  part.userData.humanGameV17Source=original.name;
  info.parent.add(part);added.push(part);
 }
 return added;
}
function removeOldMeshes(root,keep=()=>false){
 const removed=[];
 root.traverse(node=>{
  if(!node.isMesh||node.userData?.humanGameV17Mesh||keep(node))return;
  removed.push(node);
 });
 for(const node of removed)node.removeFromParent();
 return removed;
}
function belongsTo(node,ancestor){
 for(let p=node;p;p=p.parent)if(p===ancestor)return true;
 return false;
}

/** Render the exact editor rig; old bones remain invisible control inputs. */
function installCanonicalPlayer(T,model){
 const u=model.userData,visual=createHumanProposal(T,'player','a',{visualOnly:true}),j={};
 visual.name='Protagonista · rig exacte de l’editor';
 visual.traverse(o=>{if(o.userData?.humanMotionJoint)j[o.userData.humanMotionJoint]=o});
 for(const id of ['pelvis','spine','neck','head','hipL','hipR','kneeL','kneeR','ankleL','ankleR','shoulderL','shoulderR','elbowL','elbowR','wristL','wristR'])
  if(!j[id])throw Error('Rig de l’editor incomplet: '+id);
 const old=removeOldMeshes(model,node=>u.gun&&belongsTo(node,u.gun));
 const meshes=[];visual.traverse(o=>{
  if(!o.isMesh)return;
  o.userData.humanGameV17Mesh=true;
  o.userData.humanGameV17Source=o.name;
  o.userData.humanCanonicalOriginalGeometry=true;
  meshes.push(o);
 });
 const control={
  hipL:u.ll,hipR:u.lr,kneeL:u.lkl,kneeR:u.lkr,
  shoulderL:u.al,shoulderR:u.ar,elbowL:u.ael,elbowR:u.aer,
  ankleL:u.boots[0],ankleR:u.boots[1],head:u.head
 };
 const rest=Object.fromEntries(Object.entries(control).map(([id,bone])=>[id,bone.quaternion.clone().invert()]));
 const lowerRest=u.lowerBody.quaternion.clone().invert(),upperRest=u.upperBody.quaternion.clone().invert();
 const editorScale=visual.scale.clone();
 const pelvisY=u.hipHeight,spineY=u.upperBodyPivotHeight,actualSpineY=j.spine.position.y;
 // A .72m crouch offset belonged to the old ~4m controller. Scale only
 // that movement distance to the native 2m pelvis; NEVER scale the meshes.
 const canonicalPelvisY=j.pelvis.parent.position.y*visual.scale.y;
 const crouchRatio=Math.min(1,canonicalPelvisY/pelvisY);
 const weapons=[
  // Pivot de la culata dins el puny: centre del mànec (y=-.20)
  // coincideix amb el plec dels dits (y≈-.065) amb escala .40.
  ['gun',.40,.015,-.040],
  ['assault',.27,-.11,-.12],
  ['sniper',.26,-.11,-.12],
  ['bazooka',.44,-.12,-.10],
  ['knife',.40,-.09,-.05],
  ['cisalla',.38,-.09,-.05],
  ['grenade',.38,-.09,-.05]
 ],proxies=new Map();
 const weaponWorld=new T.Quaternion(),handWorld=new T.Quaternion(),
  cutterGrip=new T.Vector3(),runAxis=new T.Vector3(1,0,0),runTarget=new T.Quaternion(),
  cutterTarget=new T.Vector3(),cutterAxis=new T.Vector3(),cutterDown=new T.Vector3(0,-1,0),
  gunAim=new T.Vector3(),
  // Orientació LOCAL al canell: evita que la pistola es quedi en un eix mundial
  // fix (nord) quan el protagonista gira sense apuntar.
  gunIdleLocal=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2),
  gunAimLocal=new T.Quaternion();
 const pistolGrips=[];
 for(const side of ['L','R']){
  const hand=j['wrist'+side].children.find(o=>o.userData?.humanHand===side);
  if(!hand)throw Error('Mà anatòmica '+side+' absent del model canònic');
  const original=[...hand.children],skin=new T.MeshStandardMaterial({
   color:0xc49d79,roughness:.90,flatShading:true});
  const hold=new T.Group();hold.name=side==='R'?'Puny dret sobre la culata':
   'Palmell esquerre pla sota la pistola';
  const part=(geo,x,y,z,rx=0,rz=0)=>{
   const mesh=new T.Mesh(geo,skin);
   mesh.position.set(x,y,z);mesh.rotation.set(rx,0,rz);
   mesh.userData.humanPistolGripPart=side;hold.add(mesh);return mesh;
  };
  if(side==='R'){
   // Puny amb dits doblegats al voltant de l'empunyadura, no un
   // paral·lelepípede posat sota tota la pistola.
   part(new T.BoxGeometry(.093,.086,.045),0,-.032,.035);
   for(let n=0;n<4;n++){
    part(new T.CapsuleGeometry(.014,.051,4,6),
     (n-1.5)*.024,-.073,-.038,-.98);
   }
   part(new T.CapsuleGeometry(.019,.060,4,6),.057,-.036,-.009,-.70,-.43);
  }else{
   // Palmell pla mirant amunt; els dits són estirats i sostenen el
   // costat inferior de la corredora. No es converteix en un segon puny.
   part(new T.BoxGeometry(.12,.024,.105),0,-.018,-.025);
   for(let n=0;n<4;n++)
    part(new T.CapsuleGeometry(.010,.082,3,6),
     (n-1.5)*.025,-.015,-.104,Math.PI/2);
   part(new T.CapsuleGeometry(.012,.044,3,6),-.067,-.027,-.016,.75,.40);
  }
  hold.visible=false;hand.add(hold);
  pistolGrips.push({side,original,hold,hand});
 }
 function sync(){
  // Gameplay rescales its actor ROOT by 2/3; compensate it AND give the
  // unchanged native editor skin another third of size, uniformly. The
  // collision, controls and animations remain exactly the same.
  if(Math.min(Math.abs(model.scale.x),Math.abs(model.scale.y),Math.abs(model.scale.z))<1e-6)
   throw Error('Escala visual del protagonista no vàlida');
  visual.scale.set(FOOT_PLAYER_VISUAL_FACTOR*editorScale.x/model.scale.x,
    FOOT_PLAYER_VISUAL_FACTOR*editorScale.y/model.scale.y,
    FOOT_PLAYER_VISUAL_FACTOR*editorScale.z/model.scale.z);
  const dy=u.lowerBody.position.y-pelvisY;
  visual.position.y=dy*crouchRatio;
  j.pelvis.quaternion.copy(lowerRest).multiply(u.lowerBody.quaternion);
  j.spine.quaternion.copy(j.pelvis.quaternion).invert()
   .multiply(upperRest).multiply(u.upperBody.quaternion);
  j.spine.position.y=actualSpineY+((u.upperBody.position.y-spineY)-dy)*crouchRatio;
  for(const [id,bone]of Object.entries(control))j[id].quaternion.copy(rest[id]).multiply(bone.quaternion);
  // Traslladam la passa de l'editor a les cames i turmells en córrer.
  // El rig del joc encara controla la física, els trets i les interaccions.

  const run=Math.max(0,Math.min(1,u.runBlend||0));
  if(run>.001){
   const phase=(u.ph||0)/(Math.PI*2);
   for(const [side,offset]of [['L',0],['R',.5]]){
    const gait=sampleHumanGait(phase+offset,run);
    for(const [joint,angle]of [['hip',gait.hip],['knee',gait.knee],['ankle',gait.ankle]])
     j[joint+side].quaternion.slerp(runTarget.setFromAxisAngle(runAxis,angle),run);
   }
  }
  for(const [kind,scale,y,z]of weapons){
   const source=u[kind];if(!source||!source.visible) {
    if(proxies.has(kind))proxies.get(kind).visible=false;
    continue;
   }
   if(!proxies.has(kind)){
    const proxy=source.clone(true);
    proxy.name='Arma canònica · '+kind;
    proxy.position.set(0,y,z);
    proxy.scale.setScalar(scale);
    (kind==='cisalla'?j.spine:j.wristR).add(proxy);proxies.set(kind,proxy);
    // Keep the authoritative gameplay weapon's transforms and state, but
    // render its cloned visual in the native hand rather than old anatomy.
    source.traverse(o=>{if(o.isMesh)o.visible=false});
   }
   const proxy=proxies.get(kind);proxy.visible=true;
   // El canó visible segueix el quaternion de l'arma real i no un angle fix.
   source.getWorldQuaternion(weaponWorld);
   (kind==='cisalla'?j.spine:j.wristR).getWorldQuaternion(handWorld);
   gunAimLocal.copy(handWorld).invert().multiply(weaponWorld);
   if(kind==='gun'){
    // Repos local fix al canell i apuntat local de l'arma: cap referència
    // a nord o a un quaternion mundial durant l'animació de repòs.
    const blend=Math.max(0,Math.min(1,u.pistolBlend||0));
    proxy.quaternion.copy(gunIdleLocal).slerp(gunAimLocal,blend);
   }else proxy.quaternion.copy(gunAimLocal);
   if(kind==='gun'){
    // Mai separar la malla visible de la mà que la sosté:
    // l'arma és sempre filla del canell dret i la culata queda
    // centrada dins del puny, tant en repòs com en apuntar.
    proxy.position.set(0,y,z);
    proxy.userData.humanPistolHeldInFist=true;
   }else if(kind==='cisalla'){
    // La cisalla viu en el tors: mai entre les dues mans.
    proxy.scale.setScalar(.54);
    proxy.position.set(0,.15,-.33);
    const arms=source.userData.bladeArms;
    if(arms)for(let i=0;i<2;i++)if(proxy.children[i]&&arms[i])
     proxy.children[i].rotation.copy(arms[i].rotation);
    const grasp=(side)=>{
     const grip=proxy.getObjectByName('hunter-cutter-handle-'+(side==='L'?'left':'right')+'-end');
     const shoulder=j['shoulder'+side],elbow=j['elbow'+side],wrist=j['wrist'+side];
     if(!grip||!shoulder||!elbow||!wrist)return;
     const target=grip.getWorldPosition(cutterTarget);
     shoulder.parent.worldToLocal(target);
     const upper=elbow.parent.position.length(),lower=wrist.parent.position.length()+.068;
     const d=Math.min(upper+lower-.001,Math.max(.001,target.length()));
     cutterAxis.copy(target).normalize();
     const along=(upper*upper+d*d-lower*lower)/(2*d);
     const radius=Math.sqrt(Math.max(0,upper*upper-along*along));
     const pole=new T.Vector3(side==='R'?.40:-.40,-.7,.12);
     pole.addScaledVector(cutterAxis,-pole.dot(cutterAxis)).normalize();
     const bend=cutterAxis.clone().multiplyScalar(along).addScaledVector(pole,radius);
     shoulder.quaternion.setFromUnitVectors(cutterDown,bend.clone().normalize());
     const forearm=target.clone().sub(bend).normalize().applyQuaternion(shoulder.quaternion.clone().invert());
     elbow.quaternion.setFromUnitVectors(cutterDown,forearm);
    };
    grasp('L');grasp('R');
   }else proxy.position.set(0,y,z);
  }
  // Actualitzar la presa DESPRÉS de moure el model visual de l'arma.
  // Tant el puny dret com el palmell esquerre s'orienten amb la
  // pistola real, i l'esquerre només apareix en mode apuntar.
  const pistolVisible=!!u.gun?.visible;
  const pistolAiming=pistolVisible&&(u.pistolBlend||0)>.10;
  const pistolMesh=proxies.get('gun');
  for(const {side,original,hold,hand}of pistolGrips){
   const posed=side==='R'?pistolVisible:pistolAiming;
   hold.visible=posed;
   for(const node of original)node.visible=!posed;
   if(posed&&pistolMesh){
    hand.getWorldQuaternion(handWorld);
    pistolMesh.getWorldQuaternion(weaponWorld);
    hold.quaternion.copy(handWorld).invert().multiply(weaponWorld);
   }else hold.quaternion.identity();
  }
 }
 model.add(visual);
 const update=visual.updateMatrixWorld;
 visual.updateMatrixWorld=function(force){sync();return update.call(this,force)};
 sync();
 u.humanGameCanonicalRig=visual;
 u.humanGameCanonicalJoints=j;
 u.humanGameCanonicalSoles=meshes.filter(m=>m.userData.humanLandmark==='sole');
 u.humanGameV17='player';
 u.humanGameV17NeckMatched=true;
 u.humanGameV17PreservedRig=true;
 u.humanGameV17Counts={removed:old.length,added:meshes.length};
 return model;
}

export function createHumanGameRuntimeV17(){
 let suppressed=0;
 const runtime={
  version:GAME_HUMAN_SKIN_VERSION,
  footVisualHeight:2*FOOT_PLAYER_VISUAL_FACTOR,
  // La malla del pilot de dues rodes és literalment la del jugador a peu.
  // Cap os s'estira per encaixar mans o peus a manillars i pedals.
  createTwoWheelRider(T){
   const root=createHumanProposal(T,'player','a',{visualOnly:true}),joints={};
   root.traverse(node=>{
    if(node.userData?.humanMotionJoint)joints[node.userData.humanMotionJoint]=node;
   });
   for(const id of ['pelvis','spine','neck','head','hipL','hipR',
     'kneeL','kneeR','ankleL','ankleR','shoulderL','shoulderR',
     'elbowL','elbowR','wristL','wristR'])
    if(!joints[id])throw Error('Pilot de dues rodes: falta articulació '+id);
   // Fer explícites les dimensions del jugador a peu a totes les
   // articulacions i malles. El rider ja no té un scale heretat ocult
   // que es pugui combinar amb el del vehicle o l'animació.
   const referenceHeight=2*FOOT_PLAYER_VISUAL_FACTOR;
   const bareHeight=new T.Box3().setFromObject(root).getSize(new T.Vector3()).y;
   if(!(bareHeight>0))throw Error('Malla canònica del pilot buida');
   const factor=referenceHeight/bareHeight;
   // root.scale encapsula l'ajust original de 2 m de l'editor.
   // Se substitueix per geometria i pivots escalats físicament.
   const bakedScale=root.scale.x*factor;
   root.traverse(node=>{
    if(node===root)return;
    node.position.multiplyScalar(bakedScale);
    if(node.isMesh&&node.geometry){
     node.geometry=node.geometry.clone();
     node.geometry.scale(bakedScale,bakedScale,bakedScale);
    }
   });
   root.scale.set(1,1,1);
   root.updateWorldMatrix(true,true);
   const standingHeight=new T.Box3().setFromObject(root).getSize(new T.Vector3()).y;
   if(Math.abs(standingHeight-runtime.footVisualHeight)>.025)
    throw Error('El rig i la malla del pilot no tenen l’alçada del jugador a peu');
   root.userData.twoWheelStandingHeight=standingHeight;
   root.userData.twoWheelCanonical=true;
   root.userData.twoWheelBakedScale=bakedScale;
   return {root,joints,standingHeight};
  },
  suppress(callback){suppressed++;try{return callback()}finally{suppressed--}},
  install(T,model,{role='player'}={}){
   if(suppressed)return model;
   if(model.userData.humanGameV17===role)return model;
   if(HUMAN_VERSION!==GAME_HUMAN_SKIN_VERSION)throw Error('La pell humana i el laboratori no coincideixen');
   const u=model.userData,required=['ll','lr','lkl','lkr','al','ar','ael','aer','head','boots'];
   if(required.some(key=>!u[key])||u.boots.length!==2)throw Error('Rig de joc incompatible amb HUMANS V17');
   if(role==='player'&&u.upperBody&&u.lowerBody)return installCanonicalPlayer(T,model);
   model.updateWorldMatrix(true,true);
   const v=p=>model.worldToLocal(p.getWorldPosition(new T.Vector3()));
   const hipY=(v(u.ll).y+v(u.lr).y)/2;
   const shoulderY=(v(u.al).y+v(u.ar).y)/2;
   const base=Math.abs(u.lkl.position.y)/SOURCE_THIGH;
   const legUpper=Math.abs(u.lkl.position.y)/SOURCE_THIGH;
   const legLower=Math.abs(u.boots[0].position.y)/SOURCE_SHIN;
   const armUpper=Math.abs(u.ael.position.y)/SOURCE_ARM;
   const armLower=(.62*Math.abs(u.ael.position.y)/.63)/SOURCE_FOREARM;
   const torsoScale=[base*1.35,base*1.38,base*1.34];
   const upper=u.upperBody||model,lower=u.lowerBody||model;
   const upperY=u.upperBody?.position.y||0,lowerY=u.lowerBody?.position.y||0;
   const pelvis=newAnchor(T,lower,'malucs i pantalons',hipY-lowerY);
   const spine=newAnchor(T,upper,'tors i armilla',shoulderY-.435*torsoScale[1]-upperY);
   const template=sourceFor(T,role),neckScale=base*1.30;
   const neck=newAnchor(T,upper,'coll',0);
   // The game head's pivot and scale are legacy animation contracts; don't
   // modify either. Instead reproduce the editor's exact 3D relation
   // between the neck and cranium (including its forward offset).
   const headLocal=upper.worldToLocal(u.head.getWorldPosition(new T.Vector3()));
   neck.position.copy(headLocal).addScaledVector(template.neckToHead,-neckScale);
   // compactD heads are scaled by the old game to ~74%, while ordinary
   // heads are unscaled. Independent hardcoded geometry scales made skulls
   // and necks disagree. Cancel that old head scale so both use precisely
   // the SAME final anatomical scale in all three axes.
   const hs=u.head.scale;
   if(Math.min(Math.abs(hs.x),Math.abs(hs.y),Math.abs(hs.z))<.01)
    throw Error('Escala de pivot de cap no vàlida');
   // Source head pivot itself has non-uniform anatomical scaling (notably
   // 0.95 along Y). Its matrix is canceled when copying joint-local mesh
   // geometry; restore that scale before compensating the game head pivot.
   const sourceHeadScale=template.joints.get('head').scale;
   const skinHeadScales=[
    neckScale*sourceHeadScale.x/hs.x,
    neckScale*sourceHeadScale.y/hs.y,
    neckScale*sourceHeadScale.z/hs.z
   ];
   const targets={
    pelvis:{parent:pelvis,scales:[base*1.35,base*1.18,base*1.35]},
    spine:{parent:spine,scales:torsoScale},
    neck:{parent:neck,scales:[neckScale,neckScale,neckScale]},
    head:{parent:u.head,scales:skinHeadScales},
    hipL:{parent:u.ll,scales:[legUpper,legUpper,legUpper]},
    hipR:{parent:u.lr,scales:[legUpper,legUpper,legUpper]},
    kneeL:{parent:u.lkl,scales:[legLower,legLower,legLower]},
    kneeR:{parent:u.lkr,scales:[legLower,legLower,legLower]},
    ankleL:{parent:u.boots[0],scales:[base*1.32,base*1.32,base*1.32]},
    ankleR:{parent:u.boots[1],scales:[base*1.32,base*1.32,base*1.32]},
    shoulderL:{parent:u.al,scales:[armUpper,armUpper,armUpper]},
    shoulderR:{parent:u.ar,scales:[armUpper,armUpper,armUpper]},
    elbowL:{parent:u.ael,scales:[armLower,armLower,armLower]},
    elbowR:{parent:u.aer,scales:[armLower,armLower,armLower]},
    wristL:{parent:u.ael,source:'elbowL',scales:[armLower,armLower,armLower]},
    wristR:{parent:u.aer,source:'elbowR',scales:[armLower,armLower,armLower]}
   };
   const keep=node=>!!u.gun&&belongsTo(node,u.gun);
   // The originals' pivots, contact markers, and combat weapon groups stay.
   const old=removeOldMeshes(model,keep);
   const added=copySkin(T,template,joint=>targets[joint]);
   // This changes newly added parent transforms: force the entire hierarchy
   // up to date immediately. Bounding boxes, renderers and photo-mode
   // captures must see the same pose from the first frame onwards.
   model.updateWorldMatrix(true,true);
   model.userData.humanGameV17NeckMatched=true;
   model.userData.humanGameV17=role;
   model.userData.humanGameV17Counts={removed:old.length,added:added.length};
   model.userData.humanGameV17PreservedRig=true;
   return model;
  },
  installCivilian(T,u){
   const root=u?.o,rig=u?.rig;
   if(!root||!rig||!u.head||u.legs?.length!==2||u.arms?.length!==2)return false;
   if(root.userData.humanGameV17===u.role)return true;
   const role=u.role==='mechanic'?'mechanic':'farmer';
   const old=removeOldMeshes(root,node=>node===u.head);
   // Existing head is the actual animation pivot in the prisoner system.
   // Replace only its old sphere geometry so turning/cheering still rotates
   // the new V17 skull and hat. The shared original geometry is untouched.
   const marker=new T.BufferGeometry();u.head.geometry=marker;
   const pelvis=newAnchor(T,rig,'malucs civils',.82);
   const spine=newAnchor(T,rig,'tors civil',1.01);
   const neck=newAnchor(T,rig,'coll civil',1.41);
   const legMap={L:u.legs[0],R:u.legs[1]},armMap={L:u.arms[0],R:u.arms[1]};
   const flat=(parent,source,s)=>({parent,source,scales:[s,s,s]});
   const targets={
    pelvis:flat(pelvis,'pelvis',.86),
    spine:flat(spine,'spine',.85),
    neck:flat(neck,'neck',.80),
    head:flat(u.head,'head',.78)
   };
   for(const side of ['L','R']){
    targets['hip'+side]=flat(legMap[side],'hip'+side,.78);
    targets['knee'+side]=flat(legMap[side],'hip'+side,.78);
    targets['ankle'+side]=flat(legMap[side],'hip'+side,.78);
    targets['shoulder'+side]=flat(armMap[side],'shoulder'+side,.70);
    targets['elbow'+side]=flat(armMap[side],'shoulder'+side,.70);
    targets['wrist'+side]=flat(armMap[side],'shoulder'+side,.70);
   }
   const added=copySkin(T,sourceFor(T,role),joint=>targets[joint]);
   root.userData.humanGameV17=role;
   root.userData.humanGameV17Counts={removed:old.length,added:added.length};
   root.userData.humanGameV17PreservedRig=true;
   return true;
  },
  installHooks(){
   // Intercept classic global factory registration BEFORE either bundled or
   // individually loaded runtime scripts execute. No classic file or bundle
   // is modified. Do not change factory animation methods.
   const intercept=(name,wrap)=>{
    let current=globalThis[name];
    if(current)current=wrap(current);
    Object.defineProperty(globalThis,name,{
     configurable:true,enumerable:true,get:()=>current,
     set:value=>{current=wrap(value)}
    });
   };
   intercept('HUNTER_CHARACTERS',base=>{
    if(!base||base.__humanGameV17Hook)return base;
    const wrapped={...base,__humanGameV17Hook:true};
    wrapped.createCommando=function(T,...args){
     const soldier=runtime.suppress(()=>base.createCommando.call(wrapped,T,...args));
     return runtime.install(T,soldier,{role:'soldier'});
    };
    return Object.freeze(wrapped);
   });
   intercept('HUNTER_GENERAL_MODEL',base=>{
    if(!base||base.__humanGameV17Hook)return base;
    return Object.freeze({...base,__humanGameV17Hook:true,
     create(T,...args){
      const general=runtime.suppress(()=>base.create.call(base,T,...args));
      return runtime.install(T,general,{role:'general'});
     }
    });
   });
   intercept('HUNTER_PRISONERS',base=>{
    if(!base||base.__humanGameV17Hook)return base;
    return Object.freeze({...base,__humanGameV17Hook:true,
     create(options){
      const api=base.create.call(base,options);
      const wrapped={...api};
      wrapped.configure=function(...args){
       const result=api.configure(...args);
       for(const u of api.entities)if(u.o)runtime.installCivilian(options.THREE,u);
       return result;
      };
      return Object.freeze(wrapped);
     }
    });
   });
  }
 };
 return Object.freeze(runtime);
}
