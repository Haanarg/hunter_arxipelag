// V17-compatible rigid-rig adapter for the latest V18 skin (general cassaca). No gameplay animation,
// seat, IK, collision, physics, weapon anchor or AI state is replaced.
import {createHumanProposal,HUMAN_VERSION,sampleHumanGait} from './human-proposals.mjs?rev=human-game-swim-20261119-2';
import {createGameSwimBridge} from './human-game-swim-bridge.mjs?rev=human-game-swim-v18-native-20261120-1';
import {HUMAN_PLAYER_GAME_NATIVE_HEIGHT,HUMAN_WORLD_UNITS_PER_METER} from './human-model-catalog.mjs';
import {bakeFixedModelScales} from './model-scale-normalization.mjs';

export const GAME_HUMAN_SKIN_VERSION='humans-v18';
// El V18 es genera directament amb la mida final nadiua.
// L'esquelet antic només és un controlador ocult d'armes i física.
// La seva escala original queda en un únic grup; l'arrel del jugador
// i el model de l'editor no hereten cap correcció d'escala.
export const LEGACY_GAME_RIG_SCALE=0.6666666666666666;
const SOURCE_THIGH=.49,SOURCE_SHIN=.49,SOURCE_ARM=.385,SOURCE_FOREARM=.310;
const cache=new Map();
// Reutilitzar les geometries LOD i les malles fusionades entre soldats
// en lloc de clonar la mateixa pell cada vegada que patrullen.
const sharedOnFootGeometryCache=new WeakMap();
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
// Les armes llargues pengen del tors V18; els punts reals de subjecció
// governen LES DUES mans. Mai es resol l'IK des d'una arma que alhora és
// filla d'un canell (dependència circular del controlador V17).
const NATIVE_LONG_GUN_GRIPS=Object.freeze({
 assault:{right:'hunter-assault-trigger-grip',left:'hunter-assault-foregrip'},
 sniper:{right:'hunter-sniper-trigger-grip',left:'hunter-sniper-foregrip'},
 bazooka:{right:'hunter-bazooka-right-underbarrel-grip',
  left:'hunter-bazooka-left-support-grip'}
});
function solveNativeLongGunHand(T,j,grip,side,cache){
 const shoulder=j['shoulder'+side],elbow=j['elbow'+side],wrist=j['wrist'+side];
 if(!shoulder||!elbow||!wrist)throw Error('Rig V18 sense braç '+side);
 const target=grip.getWorldPosition(cache.target);
 shoulder.parent.worldToLocal(target);
 target.sub(shoulder.position);
 const upper=elbow.parent.position.length(),lower=wrist.parent.position.length();
 const distance=target.length();
 if(!(distance>1e-5&&Number.isFinite(distance)))return null;
 const d=Math.min(upper+lower-.0001,Math.max(Math.abs(upper-lower)+.0001,distance));
 const axis=cache.axis.copy(target).normalize();
 const along=(upper*upper+d*d-lower*lower)/(2*d);
 const radius=Math.sqrt(Math.max(0,upper*upper-along*along));
 const pole=cache.pole.set(side==='R'?.48:-.48,-.72,.30).addScaledVector(axis,
  -cache.pole.dot(axis)).normalize();
 const bend=cache.bend.copy(axis).multiplyScalar(along).addScaledVector(pole,radius);
 shoulder.quaternion.setFromUnitVectors(cache.down,cache.bendDirection.copy(bend).normalize());
 const forearm=cache.forearm.copy(target).sub(bend)
  .normalize().applyQuaternion(cache.inverse.copy(shoulder.quaternion).invert());
 elbow.quaternion.setFromUnitVectors(cache.down,forearm);
 const end=wrist.getWorldPosition(cache.wrist);
 return {distance:end.distanceTo(grip.getWorldPosition(cache.worldGrip)),
  inReach:distance<=upper+lower+.0001};
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
 const u=model.userData,visual=createHumanProposal(T,'player','a',{visualOnly:true,nativeHeight:HUMAN_PLAYER_GAME_NATIVE_HEIGHT}),j={};
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
 // La geometria i les articulacions ja tenen la mida final.
 if(visual.scale.x!==1||visual.scale.y!==1||visual.scale.z!==1)throw Error('V18 amb escala externa');
 const swimBridge=createGameSwimBridge(T,visual,j);
 const pelvisY=u.hipHeight,spineY=u.upperBodyPivotHeight,actualSpineY=j.spine.position.y;
 // El desplaçament d'ajupir-se prové del controlador antic.
 // Adaptam el moviment al maluc real de la geometria nativa, mai a 2 m.
 // Les mides de referència provenen del maluc V18 REAL, no d'una
 // segona instància del model de l'editor sense la mida del joc.
 const nativePelvisMeters=j.pelvis.parent.position.y/HUMAN_WORLD_UNITS_PER_METER;
 const crouchRatio=Math.min(1,nativePelvisMeters/pelvisY);
 // La conversió de l'animació vella a les coordenades mundials del V18
 // és una transformació entre dos Object3D, no un corrector numèric 2/3.
 const controlCrouchWorld=new T.Vector3();
 const weapons=[
  // Pivot de la culata dins el puny: centre del mànec (y=-.20)
  // coincideix amb el plec dels dits (y≈-.065) amb escala .40.
  ['gun',.64,.024,-.064],
  ['assault',.432,-.176,-.192],
  ['sniper',.416,-.176,-.192],
  ['bazooka',.704,-.192,-.16],
  ['knife',.64,-.144,-.08],
  ['cisalla',.864,-.144,-.08],
  ['grenade',.608,-.144,-.08]
 ],proxies=new Map();
 const supportCache={
  target:new T.Vector3(),axis:new T.Vector3(),pole:new T.Vector3(),
  bend:new T.Vector3(),bendDirection:new T.Vector3(),forearm:new T.Vector3(),
  down:new T.Vector3(0,-1,0),wrist:new T.Vector3(),
  worldGrip:new T.Vector3(),inverse:new T.Quaternion()
 };
 const mountCache={
  shoulder:new T.Vector3(),desired:new T.Vector3(),before:new T.Vector3(),
  localDesired:new T.Vector3(),localBefore:new T.Vector3(),
  forward:new T.Vector3(),up:new T.Vector3(),inward:new T.Vector3(),
  torsoQ:new T.Quaternion()
 };
 const weaponWorld=new T.Quaternion(),handWorld=new T.Quaternion(),
  cutterGrip=new T.Vector3(),runAxis=new T.Vector3(1,0,0),runTarget=new T.Quaternion(),
  cutterTarget=new T.Vector3(),cutterAxis=new T.Vector3(),cutterDown=new T.Vector3(0,-1,0),
  gunAim=new T.Vector3(),
  // Orientació LOCAL al canell: evita que la pistola es quedi en un eix mundial
  // fix (nord) quan el protagonista gira sense apuntar.
  gunIdleLocal=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2),
  gunAimLocal=new T.Quaternion();
 // Punts de destí del V18: la pistola mai no governa les mans a través
 // de les espatlles del rig antic. El canó real continua al controlador.
 const nativePistolGoals={right:new T.Group(),left:new T.Group()};
 nativePistolGoals.right.name='Pistola V18 · canell dret objectiu';
 nativePistolGoals.left.name='Pistola V18 · palmell esquerre objectiu';
 j.spine.add(nativePistolGoals.right,nativePistolGoals.left);
 const pistolIKRest={
  shoulderR:new T.Quaternion(),elbowR:new T.Quaternion(),
  shoulderL:new T.Quaternion(),elbowL:new T.Quaternion(),
  aimedShoulder:new T.Quaternion(),aimedElbow:new T.Quaternion()
 };
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
   geo.scale(HUMAN_WORLD_UNITS_PER_METER,HUMAN_WORLD_UNITS_PER_METER,HUMAN_WORLD_UNITS_PER_METER);
   mesh.position.set(x*HUMAN_WORLD_UNITS_PER_METER,y*HUMAN_WORLD_UNITS_PER_METER,z*HUMAN_WORLD_UNITS_PER_METER);
   mesh.rotation.set(rx,0,rz);
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
  // The lab's horizontal swimmer is on the VISUAL ONLY. Always restore
  // its canonical upright parent before building the next game frame,
  // otherwise repeated camera/bounding-box updates accumulate a tilt.
  visual.position.set(0,0,0);
  visual.quaternion.identity();
  j.neck.quaternion.identity();
  j.pelvis.position.z=0;
  // La geometria visual està escalada UN sol cop quan es crea.
  // El transform de compatibilitat dels controls antics queda separat
  // i mai altera l'escala del model animat.
  const dy=u.lowerBody.position.y-pelvisY;
  // Projectam el desplaçament real del control ocult dins l'espai
  // propi del V18. Això respecta transformacions de pare, girs i VS
  // sense cap escala correctora explícita a la pell visible.
  if(Math.abs(dy)>1e-9){
   controlCrouchWorld.set(0,dy,0);
   u.lowerBody.parent.localToWorld(controlCrouchWorld);
   model.worldToLocal(controlCrouchWorld);
   visual.position.y=controlCrouchWorld.y*crouchRatio;
  }
  j.pelvis.quaternion.copy(lowerRest).multiply(u.lowerBody.quaternion);
  j.spine.quaternion.copy(j.pelvis.quaternion).invert()
   .multiply(upperRest).multiply(u.upperBody.quaternion);
  j.spine.position.y=actualSpineY+((u.upperBody.position.y-spineY)-dy)*crouchRatio;
  for(const [id,bone]of Object.entries(control))j[id].quaternion.copy(rest[id]).multiply(bone.quaternion);
  // Caminar i córrer pertanyen al mateix motor visible que l'editor.
  // Els pivots antics resten com a controls de física, armes i vehicles.
  const run=Math.max(0,Math.min(1,u.runBlend||0));
  const landMove=Math.max(run,Math.max(0,Math.min(1,u.gameLandMove||0)));
  if(landMove>.001&&!u.gameSwimActive){
   const phase=(u.ph||0)/(Math.PI*2);
   for(const [side,offset]of [['L',0],['R',.5]]){
    const gait=sampleHumanGait(phase+offset,run);
    for(const [joint,angle]of [['hip',gait.hip],['knee',gait.knee],['ankle',gait.ankle]])
     j[joint+side].quaternion.slerp(runTarget.setFromAxisAngle(runAxis,angle),landMove);
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
    // Totes les armes del protagonista es fabriquen en coordenades finals:
    // bake únic per còpia, amb geometria i punts de subjecció solidaris.
    // No es pot tornar a escalar cap arma durant la pose() del joc.
    const report=bakeFixedModelScales(proxy);
    if(report.remainingNonUniform||proxy.scale.toArray().some(v=>Math.abs(v-1)>1e-10))
     throw Error('Arma V18 amb escala residual: '+kind);
    proxy.userData.humanNativeWeaponScale=true;
    (kind==='cisalla'||NATIVE_LONG_GUN_GRIPS[kind]?j.spine:j.wristR)
     .add(proxy);
    proxies.set(kind,proxy);
    // Keep the authoritative gameplay weapon's transforms and state, but
    // render its cloned visual in the native hand rather than old anatomy.
    source.traverse(o=>{if(o.isMesh)o.visible=false});
   }
   const proxy=proxies.get(kind);proxy.visible=true;
   // El canó visible segueix el quaternion de l'arma real i no un angle fix.
   source.getWorldQuaternion(weaponWorld);
   (kind==='cisalla'||NATIVE_LONG_GUN_GRIPS[kind]?j.spine:j.wristR)
    .getWorldQuaternion(handWorld);
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
   }else if(NATIVE_LONG_GUN_GRIPS[kind]){
    // Objectiu anatòmic davant del pit: deriva exclusivament de l'espatlla
    // i de l'abast del V18, no d'una coordenada 3.10 o d'escales V17.
    // L'arma apunta al món, però la mà dreta roman sota el cap en elevar
    // el canó. Les dues mans segueixen els grips reals després.
    const right=proxy.getObjectByName(NATIVE_LONG_GUN_GRIPS[kind].right);
    if(!right)throw Error('Presa dreta V18 absent: '+kind);
    proxy.position.set(0,0,0);
    j.shoulderR.getWorldPosition(mountCache.shoulder);
    j.spine.getWorldQuaternion(mountCache.torsoQ);
    mountCache.up.set(0,1,0).applyQuaternion(mountCache.torsoQ);
    mountCache.inward.set(-1,0,0).applyQuaternion(mountCache.torsoQ);
    mountCache.forward.set(0,0,-1).applyQuaternion(weaponWorld)
     .addScaledVector(mountCache.up,
      -mountCache.forward.dot(mountCache.up));
    if(mountCache.forward.lengthSq()<.01)
     mountCache.forward.set(0,0,-1).applyQuaternion(mountCache.torsoQ);
    mountCache.forward.normalize();
    const reach=j.elbowR.parent.position.length()+j.wristR.parent.position.length();
    mountCache.desired.copy(mountCache.shoulder)
     .addScaledVector(mountCache.forward,reach*.49)
     .addScaledVector(mountCache.up,-reach*.25)
     .addScaledVector(mountCache.inward,reach*.14);
    proxy.updateWorldMatrix(true,true);
    right.getWorldPosition(mountCache.before);
    mountCache.localDesired.copy(mountCache.desired);
    mountCache.localBefore.copy(mountCache.before);
    j.spine.worldToLocal(mountCache.localDesired);
    j.spine.worldToLocal(mountCache.localBefore);
    proxy.position.copy(mountCache.localDesired.sub(mountCache.localBefore));
    proxy.userData.humanLongGunNativeMounted=true;
   }else if(kind==='cisalla'){
    // La cisalla viu en el tors: mai entre les dues mans.
    // La mida 0.864 de les cisalles ja s'ha integrat una sola vegada
    // a la geometria; aquest pivot només determina posició i gir.
    proxy.position.set(0,.24,-.528);
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
  // Els dos braços V18 es resolen amb el mateix referent geomètric:
  // l'arma és filla del tors i els canells ja no la poden arrossegar.
  u.humanGameNativeLongGunSupport=null;
  for(const [kind,names]of Object.entries(NATIVE_LONG_GUN_GRIPS)){
   const proxy=proxies.get(kind);
   if(!proxy?.visible||!u[kind]?.visible)continue;
   const right=proxy.getObjectByName(names.right),left=proxy.getObjectByName(names.left);
   if(!right||!left)throw Error('Preses nadiues incompletes: '+kind);
   const r=solveNativeLongGunHand(T,j,right,'R',supportCache);
   const l=solveNativeLongGunHand(T,j,left,'L',supportCache);
   if(r&&l)u.humanGameNativeLongGunSupport={
    weapon:kind,distance:l.distance,rightDistance:r.distance,
    inReach:l.inReach&&r.inReach
   };
   break;
  }
  // Passa nativa de pistola. L'antic sistema continua controlant el
  // tret i el recoil, però NO decideix la posició visible dels braços.
  // La meta està expressada en distàncies d'espatlla a canell V18,
  // i el segon braç només es resol després de situar el primer.
  u.humanGameNativePistolSupport=null;
  const nativePistol=proxies.get('gun');
  const pistolBlend=nativePistol?.visible&&u.gun?.visible?
   Math.max(0,Math.min(1,u.pistolBlend||0)):0;
  if(pistolBlend>.0001){
   u.gun.getWorldQuaternion(weaponWorld);
   j.shoulderR.getWorldPosition(mountCache.shoulder);
   j.spine.getWorldQuaternion(mountCache.torsoQ);
   mountCache.up.set(0,1,0).applyQuaternion(mountCache.torsoQ).normalize();
   mountCache.forward.set(0,0,-1).applyQuaternion(weaponWorld);
   if(u.visualAimSmoothed?.lengthSq?.()>.1)
    mountCache.forward.copy(u.visualAimSmoothed);
   mountCache.forward.normalize();
   const aimElevation=mountCache.forward.dot(mountCache.up);
   mountCache.forward.addScaledVector(mountCache.up,-aimElevation);
   if(mountCache.forward.lengthSq()<.01)
    mountCache.forward.set(0,0,-1).applyQuaternion(mountCache.torsoQ)
      .addScaledVector(mountCache.up,0);
   mountCache.forward.normalize();
   const reach=j.elbowR.parent.position.length()+j.wristR.parent.position.length();
   mountCache.desired.copy(mountCache.shoulder)
    .addScaledVector(mountCache.forward,reach*.57)
    .addScaledVector(mountCache.up,
      -reach*.20+Math.max(-reach*.22,Math.min(reach*.18,aimElevation*reach*.46)));
   nativePistolGoals.right.position.copy(mountCache.desired);
   j.spine.worldToLocal(nativePistolGoals.right.position);
   pistolIKRest.shoulderR.copy(j.shoulderR.quaternion);
   pistolIKRest.elbowR.copy(j.elbowR.quaternion);
   const right=solveNativeLongGunHand(T,j,nativePistolGoals.right,'R',supportCache);
   pistolIKRest.aimedShoulder.copy(j.shoulderR.quaternion);
   pistolIKRest.aimedElbow.copy(j.elbowR.quaternion);
   j.shoulderR.quaternion.copy(pistolIKRest.shoulderR)
    .slerp(pistolIKRest.aimedShoulder,pistolBlend);
   j.elbowR.quaternion.copy(pistolIKRest.elbowR)
    .slerp(pistolIKRest.aimedElbow,pistolBlend);
   // El canó visible conserva el quaternion de l'arma real fins i tot
   // després que l'IK hagi canviat la rotació anatòmica del canell.
   j.wristR.getWorldQuaternion(handWorld);
   gunAimLocal.copy(handWorld).invert().multiply(weaponWorld);
   nativePistol.quaternion.copy(gunIdleLocal).slerp(gunAimLocal,pistolBlend);
   let left=null;
   if(pistolBlend>.10){
    // Punt físic sota la corredora, derivat de l'arma visible ja fixada
    // al canell dret. La mà esquerra no mou l'arma: no hi ha cicle IK.
    nativePistol.localToWorld(mountCache.desired.set(-.14,-.06,.10));
    nativePistolGoals.left.position.copy(mountCache.desired);
    j.spine.worldToLocal(nativePistolGoals.left.position);
    pistolIKRest.shoulderL.copy(j.shoulderL.quaternion);
    pistolIKRest.elbowL.copy(j.elbowL.quaternion);
    left=solveNativeLongGunHand(T,j,nativePistolGoals.left,'L',supportCache);
    pistolIKRest.aimedShoulder.copy(j.shoulderL.quaternion);
    pistolIKRest.aimedElbow.copy(j.elbowL.quaternion);
    j.shoulderL.quaternion.copy(pistolIKRest.shoulderL)
     .slerp(pistolIKRest.aimedShoulder,pistolBlend);
    j.elbowL.quaternion.copy(pistolIKRest.elbowL)
     .slerp(pistolIKRest.aimedElbow,pistolBlend);
   }
   u.humanGameNativePistolSupport={
    rightDistance:right?.distance??null,
    leftDistance:left?.distance??null,
    inReach:!!right?.inReach&&(left===null||left.inReach),
    rootScale:visual.scale.x
   };
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
 // Consolidació sense escales en cadena: el jugador i el model humà
 // tenen transform d'arrel independent. Els pivots antics es traslladen
 // junts a un únic grup ocult d'escala definitiva; les armes continuen
 // sent filles dels mateixos pivots i mantenen les dimensions d'abans.
 const legacyRig=new T.Group();
 legacyRig.name='hunter-legacy-control-rig · escala física consolidada';
 legacyRig.scale.setScalar(LEGACY_GAME_RIG_SCALE);
 for(const child of [...model.children])legacyRig.add(child);
 model.add(legacyRig,visual);
 u.humanGameLegacyRig=legacyRig;
 // Postura completament determinada pel tick de personatge. Three.js,
 // el shadow map, la càmera i Box3 només calculen matrius: mai no
 // animen ni reinicien les articulacions. Un sol camí per SOLO/COOP.
 u.humanGamePose=()=>{
  sync();
  swimBridge.pose({mode:u.gameSwimMode||'idle',
   previousMode:u.gameSwimPreviousMode||u.gameSwimMode||'idle',
   transition:u.gameSwimTransition??1,
   blend:u.gameSwimBlend||0,
   time:u.gameSwimSeconds||0});
 };
 u.humanGamePose();
 u.humanGameCanonicalRig=visual;
 u.humanGameCanonicalJoints=j;
 // La cota dels peus depèn només de les dues soles V18 reals.
 u.humanGameCanonicalSoles=meshes.filter(m=>m.userData.humanLandmark==='sole');
 if(u.humanGameCanonicalSoles.length!==2)
  throw Error('HUMANS V18: falten les dues soles canòniques');
 u.humanGameV17='player';
 u.humanGameV17NeckMatched=true;
 u.humanGameV17PreservedRig=true;
 u.humanGameV17Counts={removed:old.length,added:meshes.length};
 return model;
}

export function createHumanGameRuntimeV17(){
 let suppressed=0,nativeVisualHeight=null;
 const runtime={
  version:GAME_HUMAN_SKIN_VERSION,
  // Object.freeze(runtime) al final: el valor mesurat s'emmagatzema al
  // tancament i s'exposa amb un getter només lectura.
  get footVisualHeight(){return nativeVisualHeight},
  // La malla del pilot de dues rodes és literalment la del jugador a peu.
  // Cap os s'estira per encaixar mans o peus a manillars i pedals.
  createTwoWheelRider(T){
   const root=createHumanProposal(T,'player','a',{visualOnly:true,nativeHeight:HUMAN_PLAYER_GAME_NATIVE_HEIGHT}),joints={};
   root.traverse(node=>{
    if(node.userData?.humanMotionJoint)joints[node.userData.humanMotionJoint]=node;
   });
   for(const id of ['pelvis','spine','neck','head','hipL','hipR',
     'kneeL','kneeR','ankleL','ankleR','shoulderL','shoulderR',
     'elbowL','elbowR','wristL','wristR'])
    if(!joints[id])throw Error('Pilot de dues rodes: falta articulació '+id);
   // La fàbrica ja genera pivots i geometries a la mida aprovada.
   if(root.scale.x!==1||root.scale.y!==1||root.scale.z!==1)
    throw Error('El pilot no pot tenir escala d’arrel');
   root.updateWorldMatrix(true,true);
   const standingHeight=new T.Box3().setFromObject(root).getSize(new T.Vector3()).y;
   nativeVisualHeight=standingHeight;
   if(Math.abs(standingHeight-HUMAN_PLAYER_GAME_NATIVE_HEIGHT)>.025)
    throw Error('Dimensions no nadiues del pilot');
   root.userData.twoWheelStandingHeight=standingHeight;
   root.userData.twoWheelCanonical=true;
   root.userData.twoWheelNativeHeight=standingHeight;
   return {root,joints,standingHeight};
  },
  suppress(callback){suppressed++;try{return callback()}finally{suppressed--}},
  // Consolida una sola vegada la talla final del tripulant enemic.
  // La postura de braços/genolls, els ancoratges de canó i els
  // ossos V18 mantenen les mateixes coordenades mundials.
  // Aquest helper és compartit pels conductors de terra i de mar:
  // no es modifica el rig del jugador ni l'animació de natació.
  normalizeEnemyCrew(root,size,{geometryCache=null}={}){
   if(!root?.isObject3D||!Number.isFinite(size)||size<=0)
    throw Error('Tripulant V18 o talla invàlida');
   const previous=root.userData.humanCrewNativeScale;
   if(previous!==undefined){
    if(Math.abs(previous-size)>1e-10)throw Error('Tripulant ja normalitzat amb una talla diferent');
    return root;
   }
   // Els comandos actuals ja surten de la fàbrica amb un fit
   // uniforme (normalment 0.8), que l'antic codi de cabina
   // SOBRESCRIVIA amb .31/.43/.52. No multiplicar dues talles.
   const sourceScale=root.scale.toArray();
   if(sourceScale.some(x=>!Number.isFinite(x)||x<=0)||
     Math.abs(sourceScale[0]-sourceScale[1])>1e-10||
     Math.abs(sourceScale[1]-sourceScale[2])>1e-10)
    throw Error('Escala original del comando no uniforme');
   root.userData.humanCrewFactoryScale=sourceScale[0];
   root.scale.setScalar(size);
   bakeFixedModelScales(root,{geometryCache});
   if(root.scale.toArray().some(x=>Math.abs(x-1)>1e-10))
    throw Error('Tripulant amb correcció d’escala restant');
   root.userData.humanCrewNativeScale=size;
   root.userData.humanCrewRootNormalized=true;
   return root;
  },
  // Normalitzar enemics a peu *després* d'afegir les variants LOD:
  // així tant la malla articulada com el proxy de llarga distància
  // conserven exactament la mida visual que abans donava root.scale=.8.
  // Compartim el bake, però NO tocam el rig del protagonista ni COOP.
  normalizeOnFootEnemy(root,{role='general'}={}){
   if(!root?.userData?.enemyFullRoot||
      !root.userData.enemyMidMesh||!root.userData.enemyFarMesh)
    throw Error('Enemic a peu sense els tres nivells LOD');
   if(root.userData.humanOnFootNativeRole!==undefined){
    if(root.userData.humanOnFootNativeRole!==role)
     throw Error('Rol d’enemic a peu canviat després de normalitzar');
    return root;
   }
   const originalScale=root.scale.x;
   if(!Number.isFinite(originalScale)||originalScale<=0||
      Math.abs(root.scale.y-originalScale)>1e-10||
      Math.abs(root.scale.z-originalScale)>1e-10)
    throw Error('Escala base de soldat no uniforme');
   runtime.normalizeEnemyCrew(root,originalScale,{
    geometryCache:sharedOnFootGeometryCache
   });
   root.userData.humanOnFootNativeScale=originalScale;
   root.userData.humanOnFootNativeRole=role;
   root.userData.humanOnFootLodNormalized=true;
   return root;
  },
  // Equipament afegit després del bake del soldat (torres amb bazuca).
  // L'arrel de la peça també queda a 1, sense modificar grip/IK.
  // El constructor és responsable d'escalar-ne la POSICIÓ original
  // perquè la posició d'arrel no és afectada per bakeFixedModelScales.
  normalizeEnemyAttachment(root,size){
   if(!root?.isObject3D||!Number.isFinite(size)||size<=0)
    throw Error('Equipament enemic o dimensió invàlids');
   if(root.userData.humanEnemyAttachmentScale!==undefined){
    if(Math.abs(root.userData.humanEnemyAttachmentScale-size)>1e-10)
     throw Error('Peça enemiga amb talla incompatible');
    return root;
   }
   root.scale.setScalar(size);
   bakeFixedModelScales(root);
   if(root.scale.toArray().some(x=>Math.abs(x-1)>1e-10))
    throw Error('Peça enemiga amb escala residual');
   root.userData.humanEnemyAttachmentScale=size;
   return root;
  },
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
    if(typeof base.createSoldier==='function')wrapped.createSoldier=function(T,...args){
     const model=base.createSoldier.call(wrapped,T,...args);
     // Els soldats a peu, inclosos elit i antitanc, passen a model
     // natiu un cop creades les malles full/mid/far. La fàbrica
     // createCommando directa continua amb l'escala original fins
     // que els conductors/llanxes n'estableixen la talla de cabina.
     const role=model?.userData?.profile==='general-approved-thick-epaulettes'
      ?'general':model?.userData?.profile==='enemy-commando-approved'
      ?'soldier':null;
     if(role)runtime.normalizeOnFootEnemy(model,{role});
     return model;
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
