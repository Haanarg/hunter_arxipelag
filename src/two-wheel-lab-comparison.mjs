// Comparador de pilotatge basat en les mateixes fàbriques i IK del joc.
// Un sol enquadrament, una sola escala i tres rigs: peu, bicicleta, moto.
import {playerModel} from './player-model-core.mjs';
import {createHumanGameRuntimeV17} from './human-game-runtime-v17.mjs';

const BONES=[
 ['pelvis','spine'],['spine','neck'],['neck','head'],
 ...['L','R'].flatMap(side=>[
  ['pelvis','hip'+side],['hip'+side,'knee'+side],
  ['knee'+side,'ankle'+side],
  ['spine','shoulder'+side],['shoulder'+side,'elbow'+side],
  ['elbow'+side,'wrist'+side]
 ])
].filter(pair=>Array.isArray(pair)&&pair.length===2);

function jointsOf(root){
 const joints={};
 root.traverse(n=>{if(n.userData?.humanMotionJoint)
  joints[n.userData.humanMotionJoint]=n});
 return joints;
}
function visibleBounds(T,root){
 root.updateWorldMatrix(true,true);
 const box=new T.Box3(),temp=new T.Box3();
 const walk=(node,visible=true)=>{
  if(!visible||!node.visible)return;
  if(node.isMesh){
   temp.setFromObject(node,true);
   box.union(temp);
  }
  for(const child of node.children)walk(child,visible&&node.visible);
 };
 walk(root);
 return box;
}
function addGuide(T,model,joints,extra=[]){
 const overlay=new T.Group();overlay.name='Guies del rig · mateixa escala';
 const positions=new Float32Array(BONES.length*6);
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const lines=new T.LineSegments(geometry,new T.LineBasicMaterial({
  color:0x63f5e3,depthTest:false,transparent:true,opacity:.95
 }));
 lines.frustumCulled=false;lines.renderOrder=20;overlay.add(lines);
 const markers={};
 for(const id of Object.keys(joints)){
  if(!/^(pelvis|spine|head|hip|knee|ankle|shoulder|elbow|wrist)/.test(id))continue;
  const color=/^(hip|knee|ankle)/.test(id)?0xf4cf6c:
   /^(shoulder|elbow|wrist)/.test(id)?0x9ce6ff:0xf59e88;
  const m=new T.Mesh(new T.SphereGeometry(.034,8,6),
   new T.MeshBasicMaterial({color,depthTest:false}));
  m.renderOrder=21;markers[id]=m;overlay.add(m);
 }
 const targets=extra.filter(x=>x?.node);
 for(const target of targets){
  const marker=new T.Mesh(new T.OctahedronGeometry(.065),
   new T.MeshBasicMaterial({color:target.color??0xff6590,depthTest:false}));
  marker.name='Punt real · '+target.label;
  marker.renderOrder=21;target.marker=marker;overlay.add(marker);
 }
 model.add(overlay);
 const update=()=>{
  model.updateWorldMatrix(true,true);
  const local=node=>model.worldToLocal(node.getWorldPosition(new T.Vector3()));
  for(let i=0;i<BONES.length;i++){
   const [a,b]=BONES[i],p=joints[a]&&local(joints[a]),
      q=joints[b]&&local(joints[b]);
   const off=i*6;
   positions.set(p?p.toArray():[0,0,0],off);
   positions.set(q?q.toArray():p?p.toArray():[0,0,0],off+3);
  }
  geometry.attributes.position.needsUpdate=true;
  for(const [id,mesh]of Object.entries(markers))
   mesh.position.copy(local(joints[id]));
  for(const target of targets)
   target.marker.position.copy(local(target.node));
 };
 return {overlay,update};
}
function mockPistol(T,group){
 const slide=new T.Group(),flash=new T.Group();flash.visible=false;
 group.add(slide,flash);return {slide,flash};
}
export async function createTwoWheelLabComparison(T,{makeVehicle,box,material,
 shadows=false}={}){
 if(typeof makeVehicle!=='function')throw Error('Cal la fàbrica real de vehicles');
 if(typeof globalThis.window==='undefined')globalThis.window=globalThis;
 globalThis.HUNTER_PLAYER_MODEL=playerModel;
 globalThis.HUNTER_HUMAN_V17=createHumanGameRuntimeV17();
 await import('./rider.js');
 const foot=new T.Group(),avatar=playerModel.create(T,{
  unitScale:1.2,headVariant:'compactD',articulated:true
 });
 avatar.scale.setScalar(2/3);
 avatar.rotation.order='YZX';
 foot.add(avatar);
 const footJoints=avatar.userData.humanGameCanonicalJoints;
 if(!footJoints?.hipL)throw Error('Jugador a peu sense rig anatòmic real');
 const footBounds=visibleBounds(T,avatar);
 avatar.position.y-=footBounds.min.y;
 const footGuide=addGuide(T,foot,footJoints);
 footGuide.update();
 const footHeight=globalThis.HUNTER_HUMAN_V17.footVisualHeight;
 const makeDriver=type=>{
  const root=new T.Group();
  root.name=type==='bici'?'Bicicleta i ciclista · joc':'Moto i motorista · joc';
  const vehicle=makeVehicle(type);root.add(vehicle);
  const rider=globalThis.HUNTER_RIDER.create(T,{
   scene:root,box,material,scales:{bici:1.2,moto:1.2},
   heightAt:()=>0,shadows,createPistol:mockPistol
  });
  const canonical=rider.object.children.find(
   n=>n.userData?.twoWheelCanonical);
  if(!canonical)throw Error('Pilot sense pell HUMANS V18: '+type);
  const joints=jointsOf(canonical),anchors=vehicle.userData.twoWheelAnchors;
  if(!anchors?.seat||!anchors?.gripL||!anchors?.pedalL)
   throw Error('Vehicle sense ancoratges reals: '+type);
  const targetNames=['seat','gripL','gripR','pedalL','pedalR'];
  const guide=addGuide(T,root,joints,targetNames.map(label=>({
   label,node:anchors[label],color:label==='seat'?0xffcc77:0xff6f9c
  })));
  let seconds=0;
  const state={t:type,o:vehicle,v:0,pedalPhase:0};
  const step=(dt=1/60,speed=0)=>{
   seconds+=dt;
   state.v=speed;
   if(type==='bici'){
    state.pedalPhase=speed?seconds*3:state.pedalPhase;
    if(vehicle.userData.crank)
     vehicle.userData.crank.rotation.x=-state.pedalPhase;
   }
   rider.update(state,dt);
   guide.update();
  };
  step();
  return {model:root,vehicle,rider,joints,guide,step,type,
   getStandingHeight:()=>rider.object.userData.twoWheelCanonicalHeight};
 };
 const bicycle=makeDriver('bici'),motorcycle=makeDriver('moto');
 return {foot:{model:foot,joints:footJoints,guide:footGuide,
   step:()=>footGuide.update(),getStandingHeight:()=>footHeight},
  bicycle,motorcycle,views:[],footHeight,
  setGuides(visible){for(const g of [footGuide,bicycle.guide,motorcycle.guide])
   g.overlay.visible=visible;},
  step(dt,speed=0){footGuide.update();bicycle.step(dt,speed);motorcycle.step(dt,speed);},
  metrics(){
   const point=(j,id)=>j[id].getWorldPosition(new T.Vector3());
   const len=(j,a,b)=>point(j,a).distanceTo(point(j,b));
   return {
    referenceHeight:footHeight,
    footThigh:len(footJoints,'hipL','kneeL'),
    bicycleThigh:len(bicycle.joints,'hipL','kneeL'),
    motorcycleThigh:len(motorcycle.joints,'hipL','kneeL'),
    bicycleScale:bicycle.rider.object.scale.x,
    motorcycleScale:motorcycle.rider.object.scale.x,
    bicycleSeat:bicycle.vehicle.userData.twoWheelAnchors.seat
      .getWorldPosition(new T.Vector3()).y,
    motorcycleSeat:motorcycle.vehicle.userData.twoWheelAnchors.seat
      .getWorldPosition(new T.Vector3()).y
   };
  }
 };
}
