// V17-compatible rigid-rig adapter for the latest V18 skin (general cassaca). No gameplay animation,
// seat, IK, collision, physics, weapon anchor or AI state is replaced.
import {createHumanProposal,HUMAN_VERSION} from './human-proposals.mjs';

export const GAME_HUMAN_SKIN_VERSION='humans-v18';
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
  ['gun',.40,-.095,-.085,-Math.PI/2],
  ['assault',.27,-.11,-.12,-.35],
  ['sniper',.26,-.11,-.12,-.35],
  ['bazooka',.44,-.12,-.10,-.3],
  ['knife',.40,-.09,-.05,0],
  ['cisalla',.38,-.09,-.05,0],
  ['grenade',.38,-.09,-.05,0]
 ],proxies=new Map();
 function sync(){
  // Gameplay resizes its actor ROOT to 2/3 after creation. Cancel only that
  // outer scale on the unmodified, uniformly scaled lab visual: its world
  // silhouette and height remain exactly the editor's 2.00 m.
  if(Math.min(Math.abs(model.scale.x),Math.abs(model.scale.y),Math.abs(model.scale.z))<1e-6)
   throw Error('Escala visual del protagonista no vàlida');
  visual.scale.set(editorScale.x/model.scale.x,editorScale.y/model.scale.y,editorScale.z/model.scale.z);
  const dy=u.lowerBody.position.y-pelvisY;
  visual.position.y=dy*crouchRatio;
  j.pelvis.quaternion.copy(lowerRest).multiply(u.lowerBody.quaternion);
  j.spine.quaternion.copy(j.pelvis.quaternion).invert()
   .multiply(upperRest).multiply(u.upperBody.quaternion);
  j.spine.position.y=actualSpineY+((u.upperBody.position.y-spineY)-dy)*crouchRatio;
  for(const [id,bone]of Object.entries(control))j[id].quaternion.copy(rest[id]).multiply(bone.quaternion);
  for(const [kind,scale,y,z,pitch]of weapons){
   const source=u[kind];if(!source||!source.visible) {
    if(proxies.has(kind))proxies.get(kind).visible=false;
    continue;
   }
   if(!proxies.has(kind)){
    const proxy=source.clone(true);
    proxy.name='Arma canònica · '+kind;
    proxy.position.set(0,y,z);proxy.rotation.set(pitch,0,0);
    proxy.scale.setScalar(scale);
    j.wristR.add(proxy);proxies.set(kind,proxy);
    // Keep the authoritative gameplay weapon's transforms and state, but
    // render its cloned visual in the native hand rather than old anatomy.
    source.traverse(o=>{if(o.isMesh)o.visible=false});
   }
   const proxy=proxies.get(kind);proxy.visible=true;
   if(kind==='gun')proxy.rotation.x=-Math.PI/2*(1-(u.pistolBlend||0));
  }
 }
 model.add(visual);
 const update=visual.updateMatrixWorld;
 visual.updateMatrixWorld=function(force){sync();return update.call(this,force)};
 sync();
 u.humanGameCanonicalRig=visual;
 u.humanGameCanonicalJoints=j;
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
