// V17 visual skin for the EXISTING game skeleton. No gameplay animation,
// seat, IK, collision, physics, weapon anchor or AI state is replaced.
import {createHumanProposal,HUMAN_VERSION} from './human-proposals.mjs';

export const GAME_HUMAN_SKIN_VERSION='humans-v17';
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
  cache.set(role,{root,joints,parts});
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
export function createHumanGameRuntimeV17(){
 let suppressed=0;
 const runtime={
  version:GAME_HUMAN_SKIN_VERSION,
  suppress(callback){suppressed++;try{return callback()}finally{suppressed--}},
  install(T,model,{role='player'}={}){
   if(suppressed)return model;
   if(model.userData.humanGameV17===role)return model;
   if(HUMAN_VERSION!==GAME_HUMAN_SKIN_VERSION)throw Error('La pell V17 i el laboratori no coincideixen');
   const u=model.userData,required=['ll','lr','lkl','lkr','al','ar','ael','aer','head','boots'];
   if(required.some(key=>!u[key])||u.boots.length!==2)throw Error('Rig de joc incompatible amb HUMANS V17');
   model.updateWorldMatrix(true,true);
   const v=p=>model.worldToLocal(p.getWorldPosition(new T.Vector3()));
   const hipY=(v(u.ll).y+v(u.lr).y)/2;
   const shoulderY=(v(u.al).y+v(u.ar).y)/2;
   const headY=v(u.head).y;
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
   const neck=newAnchor(T,upper,'coll',headY-.095*base*1.30-upperY);
   const targets={
    pelvis:{parent:pelvis,scales:[base*1.35,base*1.18,base*1.35]},
    spine:{parent:spine,scales:torsoScale},
    neck:{parent:neck,scales:[base*1.30,base*1.30,base*1.30]},
    head:{parent:u.head,scales:[base*1.73,base*1.73,base*1.73]},
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
   const added=copySkin(T,sourceFor(T,role),joint=>targets[joint]);
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
