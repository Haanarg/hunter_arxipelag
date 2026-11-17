import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three-r186.module.mjs';
import {HUMAN_PROFILES,HUMAN_CATALOG,HUMAN_STYLES} from '../src/human-model-catalog.mjs';
import {createHumanProposal,setHumanPreviewWeapon,HUMAN_PREVIEW_WEAPONS,poseHumanProposal,HUMAN_VERSION,HUMAN_HEAD_ADVANCE,HUMAN_NECK_FOLLOW,measureHumanAnatomy,humanChestSurfaceZ,sampleHumanGait,createHumanGaitClock,advanceHumanGait} from '../src/human-proposals.mjs';
import {createCurrentHuman} from '../src/human-current-models.mjs';
globalThis.window=globalThis;
assert.equal(HUMAN_CATALOG.length,7);assert(HUMAN_CATALOG.every(c=>!c.validated&&c.kind==='huma'&&c.options.length===2));
const choices=new Set();let count=0;
for(const blend of [0,.25,.5,.75,1]){
 const samples=Array.from({length:201},(_,i)=>sampleHumanGait(i/200,blend));
 assert(samples.every(p=>p.knee<=.00001&&p.ankle>=-.751&&p.ankle<=.821));
 assert(Math.abs(samples[0].footPitch-samples.at(-1).footPitch)<1e-9);
 for(let i=1;i<samples.length;i++)assert(Math.abs(samples[i].footPitch-samples[i-1].footPitch)<.15,'Peu sense salts');
 assert(Math.max(...samples.map(p=>p.footPitch))>.01&&Math.min(...samples.map(p=>p.footPitch))<-.35,'Taló i punta no paral·lels al terra');
}
let clock=createHumanGaitClock('walk');clock.phase=.37;
const before=sampleHumanGait(clock.phase,clock.blend);
for(const mode of ['run','walk']){
 const prior=clock;clock=advanceHumanGait(clock,0,mode);assert.deepEqual(clock,prior);
 for(let i=0;i<60;i++){const next=advanceHumanGait(clock,1/60,mode);assert(Math.abs(next.blend-clock.blend)<.12);assert(((next.phase-clock.phase+1)%1)<.03,'Fase contínua');clock=next}
 assert(Math.abs(clock.blend-(mode==='run'?1:0))<.002);
}
assert(Number.isFinite(before.ankle));
console.log('PASS transició caminar/córrer, fase contínua i flexió de turmell');
for(const [role,p]of Object.entries(HUMAN_PROFILES)){
 assert.throws(()=>createHumanProposal(T,role,'c'),/desconeguda/,'Variant C retirada');
 const actual=await createCurrentHuman(T,role);assert.equal(actual.userData.humanOriginal,role);
 assert(Math.abs(new T.Box3().setFromObject(actual).getSize(new T.Vector3()).y-2)<.002,'Original normalitzat proporcionalment a 2 m');
 assert(actual.userData.previewOnlyScale>0&&actual.userData.previewHeight===2);
 assert.doesNotThrow(()=>new T.ObjectLoader().parse(actual.toJSON()),'Original serialitzable '+role);
 const shapes=new Set();
 for(const style of Object.keys(HUMAN_STYLES)){
  const model=createHumanProposal(T,role,style),joints={},rest={},meshes=[];choices.add(role+style);
  model.traverse(n=>{if(n.userData.humanMotionJoint)joints[n.userData.humanMotionJoint]=n;if(n.userData.humanRestJoint)rest[n.userData.humanRestJoint]=n;if(n.isMesh)meshes.push(n)});
  assert.equal(Object.keys(joints).length,16);
  assert.equal(rest.neck.position.z,.012-HUMAN_NECK_FOLLOW,'Coll vertical avançat 1 cm per mantenir la gola sota la mandíbula');
  assert.equal(rest.head.position.z,.065-(HUMAN_HEAD_ADVANCE-HUMAN_NECK_FOLLOW),'Pivot del cap avançat respecte del coll');
  assert(Math.abs((.012-rest.neck.position.z)+(.065-rest.head.position.z)-HUMAN_HEAD_ADVANCE)<1e-9,'Cap avançat 2 cm en conjunt');
  assert.equal(rest.kneeL.parent,joints.hipL);assert.equal(rest.ankleR.parent,joints.kneeR);
  assert.equal(rest.elbowL.parent,joints.shoulderL);assert.equal(rest.wristR.parent,joints.elbowR);
  poseHumanProposal(model,0,'rest');
  assert.equal(model.userData.humanProposal.version,HUMAN_VERSION);
  const anatomy=measureHumanAnatomy(T,model);assert(anatomy);
  const {ratios:r,headUnits,points,unit,skullBounds,neckBounds}=anatomy;
  assert(Math.abs(headUnits-8)<.10,'Vuit caps reals '+role+style);
  for(const [id,target,tolerance]of [['shoulderL',6.66,.09],['elbowL',5.06,.09],['wristL',3.77,.09],['crotch',4,.07],['tipL',3.20,.10],['kneeL',2.33,.08],['ankleL',.46,.04]])assert(Math.abs(r[id]-target)<tolerance,id+' '+r[id]+' '+role+style);
  for(const id of ['shoulder','elbow','wrist','hip','knee','ankle','tip'])assert(Math.abs(r[id+'L']-r[id+'R'])<.015,id+' simetria');
  assert((points.chin.y-points.shoulderL.y)/unit<.37,'Coll perceptiblement més curt');
  assert((points.head.y-points.chin.y)/unit>.20,'Pivot dins del crani, no sota el mentó');
  assert(points.head.z>(skullBounds.min.z+skullBounds.max.z)/2,'Pivot posterior');
  assert(neckBounds.max.y-points.head.y>unit*.12&&neckBounds.intersectsBox(skullBounds),'Clatell dins el crani');
  assert(rest.elbowL.position.length()+rest.wristL.position.length()>.69,'Braços allargats');
  assert(rest.ankleL.position.length()>.44&&rest.kneeL.position.length()<.50,'Genolls elevats');
  console.log('ANATOMY',role,style,JSON.stringify({heads:headUnits,knee:8-r.kneeL,elbow:8-r.elbowL,wrist:8-r.wristL,tip:8-r.tipL,neckGap:(points.chin.y-points.shoulderL.y)/unit}));
  // Front-face culling must show the nose from the front and both sides.
  const nose=meshes.find(m=>m.userData.humanLandmark==='nose');
  assert(nose&&nose.material.side===T.FrontSide,'Nas amb cares exteriors');
  const np=nose.geometry.attributes.position,ni=nose.geometry.index,center=new T.Vector3(),edges=new Map();
  for(let i=0;i<np.count;i++)center.add(new T.Vector3().fromBufferAttribute(np,i));center.divideScalar(np.count);
  for(let i=0;i<ni.count;i+=3){
   const ids=[ni.getX(i),ni.getX(i+1),ni.getX(i+2)],v=ids.map(k=>new T.Vector3().fromBufferAttribute(np,k));
   const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
   assert(normal.dot(v[0].clone().sub(center))>1e-10,'Tots els triangles del nas cap enfora');
   for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)||0)+1)}
  }
  assert([...edges.values()].every(n=>n===2),'Nas tancat, sense vores obertes');
  for(const x of [-.20,0,.20]){
   const origin=nose.localToWorld(new T.Vector3(x,.100,-.40)),target=nose.localToWorld(new T.Vector3(0,.100,-.120));
   assert(new T.Raycaster(origin,target.sub(origin).normalize()).intersectObject(nose,false).length>0,'Nas visible de front i tres quarts');
  }
  const neckMesh=meshes.find(m=>m.userData.humanLandmark==='neck'),skull=meshes.find(m=>m.userData.humanLandmark==='skull'),rings=new Map();
  const na=neckMesh.geometry.attributes.position;
  for(let i=0;i<na.count;i++){const key=na.getY(i).toFixed(5);if(!rings.has(key))rings.set(key,[]);rings.get(key).push(na.getZ(i))}
  const centers=[...rings.values()].map(z=>z.reduce((a,b)=>a+b,0)/z.length);
  assert(Math.max(...centers)-Math.min(...centers)<1e-6,'Eix cervical vertical, sense corba');
  // The actual front neck surface must enter the jaw volume, not merely
  // overlap its bounding box behind the chin.
  const level=neckMesh.localToWorld(new T.Vector3(0,.068,0));
  const frontRay=new T.Raycaster(new T.Vector3(level.x,level.y,-10),new T.Vector3(0,0,1));
  const throat=frontRay.intersectObject(neckMesh,false)[0],jawFront=frontRay.intersectObject(skull,false)[0];
  const jawRear=new T.Raycaster(new T.Vector3(level.x,level.y,10),new T.Vector3(0,0,-1)).intersectObject(skull,false)[0];
  assert(throat&&jawFront&&jawRear&&throat.point.z>jawFront.point.z&&throat.point.z<jawRear.point.z,'Gola connectada sota la mandíbula');
  if(role==='player'){
   const glasses=model.getObjectByName('Ulleres quadrades');assert(glasses?.userData.humanGlasses==='square');
   const lenses=glasses.children.find(m=>m.userData.batchedParts?.includes('Vidre quadrat'));
   assert(lenses,'Dos vidres quadrats');assert.equal(lenses.geometry.attributes.position.count,72,'Vidres rectangulars amb sis cares');
   assert(Math.abs(rest.shoulderL.position.x)>.245,'Protagonista més ample d’espatlles');
  }
  // Only military roles receive two broad, solid, independently editable
  // straps joining the front vest to the actual backpack surface.
  const straps=meshes.filter(m=>m.userData.humanHarnessStrap);
  if(['player','soldier','rocket','elite'].includes(role)){
   assert.equal(straps.length,2,'Dues cintes a les espatlles '+role+style);
   assert.deepEqual(straps.map(m=>m.userData.humanHarnessStrap.side).sort(),[-1,1]);
   const vest=meshes.find(m=>m.name==='Armilla');
   const bag=meshes.find(m=>m.name==='Bossa');
   assert(vest&&bag,'Armilla i motxilla amb malles reals '+role+style);
   for(const strap of straps){
    const {width,thickness,front,rear}=strap.userData.humanHarnessStrap;
    assert(width>=.063&&thickness>=.020,'Cinta ampla i amb gruix');
    assert(front.z<-.06&&rear.z>.17&&rear.y<front.y+.08,'Cinta travessa l’espatlla fins a la motxilla');
    const frontSurface=humanChestSurfaceZ([vest],front.x,front.y,-1);
    const rearSurface=humanChestSurfaceZ([bag],rear.x,rear.y,1);
    assert(frontSurface!==null&&rearSurface!==null,'Ancoratges sobre malles');
    assert(Math.abs(front.z-frontSurface)<.026,'Cinta enganxada a l’armilla');
    assert(Math.abs(rear.z-rearSurface)<.026,'Cinta enganxada a la motxilla');
    assert(new T.Box3().setFromObject(strap,true).intersectsBox(new T.Box3().setFromObject(vest,true)),'Contacte amb l’armilla');
    assert(new T.Box3().setFromObject(strap,true).intersectsBox(new T.Box3().setFromObject(bag,true)),'Contacte amb la motxilla');
    const attr=strap.geometry.attributes.position,index=strap.geometry.index,edges=new Map();
    assert(index?.count>80&&attr.count>20,'Cinta corbada amb cos 3D');
    for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){
     const a=index.getX(i+j),b=index.getX(i+(j+1)%3),key=Math.min(a,b)+':'+Math.max(a,b);
     edges.set(key,(edges.get(key)||0)+1);
    }
    assert([...edges.values()].every(v=>v===2),'Cinta tancada sense cares obertes');
   }
  }else assert.equal(straps.length,0,'Sense cintes militars a '+role);
  const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());
  assert(Math.abs(size.y-p.height)<.002,'Alçada del joc '+role+style);
  assert(size.x/size.y<.40,'Proporcions estretes, braços i cap humans '+role+style);
  let triangles=0;for(const m of meshes){assert([...m.geometry.attributes.position.array].every(Number.isFinite));assert(m.geometry.userData.labOwned);triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3}
  const bodyMeshes=meshes.filter(m=>!m.userData.humanGameWeaponPart);
  const bodyTriangles=bodyMeshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0);
  assert(bodyTriangles<13000&&bodyMeshes.length<(role==='player'?65:55));
  const pads=meshes.filter(m=>m.userData.humanKneePad);
  assert.equal(pads.length,['player','soldier','rocket','elite'].includes(role)?2:0,'Genolleres ovalades als soldats i al protagonista');
  for(const pad of pads){
   assert(pad.geometry.type==='SphereGeometry','Genollera no rectangular');
   assert(pad.scale.y>pad.scale.x&&pad.scale.z<pad.scale.y*.6,'Genollera ovalada, vertical i convexa');
  }
  if(role==='player'){
   const gameGun=meshes.filter(m=>m.userData.humanGameWeaponPart);
   assert(gameGun.length>=5,'Pistola real del joc, no rectangle (malles agrupades per material)');
   assert(gameGun.some(m=>m.geometry.attributes.position.count>30),'Pistola real del joc, incloent canó silenciador agrupat');
   const mount=model.getObjectByName('Arma del joc');
   assert(mount?.userData.humanGameWeaponSource==='characters.js');
   assert(!readFileSync(new URL('../src/characters.js',import.meta.url),'utf8').includes('createLabWeapon(T,kind)'),'No modificar el runtime del joc per a un visor');
   assert.equal(mount.userData.humanWeapon,'pistol');
   for(const type of HUMAN_PREVIEW_WEAPONS){
    assert.equal(setHumanPreviewWeapon(T,model,type),true,'Es pot seleccionar '+type);
    assert.equal(mount.userData.humanWeapon,type);
    assert(mount.children.some(c=>c.userData.gameWeaponType===type),'Arma del joc carregada');
    const expected=(mode)=>{
     if(type==='knife')return new T.Vector3(0,1,0);
     if(mode==='aim'&&type!=='cutters')return new T.Vector3(0,0,-1);
     if(['bazooka','assault','sniper'].includes(type)&&['crouch','work'].includes(mode))
      return new T.Vector3(0,-.20,-.9797958971).normalize();
     return new T.Vector3(0,-1,0);
    };
    const axis=()=>['knife','cutters'].includes(type)?new T.Vector3(0,-1,0):new T.Vector3(0,0,-1);
    const checkDirection=(mode)=>{
     const forward=axis().applyQuaternion(mount.getWorldQuaternion(new T.Quaternion())).normalize();
     const target=expected(mode).applyQuaternion(model.getWorldQuaternion(new T.Quaternion()));
     assert(forward.dot(target)>.999,'Orientació '+type+'/'+mode+'; dir='+forward.toArray());
    };
    for(const mode of ['rest','idle','walk','run','crouch','work','wave','aim']){
     const gait=['walk','run'].includes(mode)?{phase:.25,blend:mode==='run'?1:0}:null;
     assert.doesNotThrow(()=>poseHumanProposal(model,.33,mode,gait),mode+' amb '+type);
     checkDirection(mode);
    }
   }
   setHumanPreviewWeapon(T,model,'pistol');poseHumanProposal(model,0,'rest');
  }
  if(role==='player'){
   const shells=meshes.filter(m=>m.userData.humanChestSurface),fitted=meshes.filter(m=>m.userData.humanChestFit);
   assert.equal(shells.length,2);assert.equal(fitted.length,style==='b'?14:10);
   for(const m of fitted){
    const {side,depth,embed}=m.userData.humanChestFit,attr=m.geometry.attributes.position;
    let min=Infinity,max=-Infinity;const q=new T.Vector3();m.updateMatrix();
    for(let i=0;i<attr.count;i++){
     q.fromBufferAttribute(attr,i).applyMatrix4(m.matrix);
     const z=humanChestSurfaceZ(shells,q.x,q.y,side);assert(z!==null,m.name+' superfície');
     const gap=side*(q.z-z);min=Math.min(min,gap);max=Math.max(max,gap);
     assert(gap>=-embed-1e-5&&gap<=depth-embed+1e-5,m.name+' segueix superficie');
    }
    assert(Math.abs(min+embed)<1e-5&&Math.abs(max-depth+embed)<1e-5,m.name+' encastat i profunditat');
   }
   const center=fitted.find(m=>m.name==='Butxaca armilla central'),left=fitted.find(m=>m.name==='Butxaca armilla esquerra'),right=fitted.find(m=>m.name==='Butxaca armilla dreta');
   assert(left.position.z>center.position.z+.008&&right.position.z>center.position.z+.008,'Butxaques laterals segueixen la curvatura');
   assert(Math.abs(left.position.z-right.position.z)<1e-6,'Simetria de les butxaques');
   if(style==='b'){
    const antenna=meshes.find(m=>m.userData.humanChestAntenna),radio=fitted.find(m=>m.name==='Ràdio');
    assert(new T.Box3().setFromObject(antenna,true).intersectsBox(new T.Box3().setFromObject(radio,true)),'Antena connectada a la ràdio');
   }
   console.log('CHEST FIT',style,fitted.length,'peces','centre/laterals',center.position.z,left.position.z,right.position.z);
  }
  shapes.add(JSON.stringify(meshes.map(m=>Array.from(m.geometry.attributes.position.array))));
  const restPos=rest.elbowL.position.clone(),headRotation=rest.head.rotation.clone();
  // Measure the actual excursion across the stride, not a single instant
  // that can coincide with the neutral foot pose in the new gait.
  poseHumanProposal(model,0,'walk',{phase:0,blend:0});
  const footBefore=joints.ankleL.getWorldPosition(new T.Vector3());
  let excursion=0;
  for(let step=1;step<=20;step++){
   poseHumanProposal(model,0,'walk',{phase:step/20,blend:0});
   excursion=Math.max(excursion,footBefore.distanceTo(joints.ankleL.getWorldPosition(new T.Vector3())));
   assert(joints.kneeL.rotation.x<=0&&joints.kneeR.rotation.x<=0);
  }
  assert(excursion>.05,'El turmell es desplaça durant la gambada '+role+style);
  poseHumanProposal(model,.25,'crouch');assert(joints.pelvis.position.y<-.25);assert.equal(joints.kneeL.rotation.x,-1.78);
  assert(joints.spine.rotation.x<-.15,'Ajupir-se: inclinar el cos endavant');
  poseHumanProposal(model,.25,'work');assert(joints.spine.rotation.x<-.20,'Treballar: inclinar-se endavant');
  poseHumanProposal(model,.25,'run',{phase:.25,blend:1});assert(joints.spine.rotation.x<-.08,'Córrer: inclinar-se endavant');
  for(const mode of ['idle','walk','run','crouch','aim','work','wave'])for(const t of [0,.25,.5,1]){
   poseHumanProposal(model,t,mode);model.updateMatrixWorld(true);
   model.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite),role+style+mode));
   assert(new T.Box3().setFromObject(model).min.y>-.12,'Peus o accessoris sota terra '+role+style+mode);
  }
  // Read the actual transformed soles, not the keyframe intentions.
  const soles=meshes.filter(m=>m.userData.humanLandmark==='sole');assert.equal(soles.length,2);
  const localSoles=()=>soles.map(m=>{const pos=m.geometry.attributes.position,v=new T.Vector3();let low=Infinity;for(let k=0;k<pos.count;k++){v.fromBufferAttribute(pos,k);m.localToWorld(v);model.worldToLocal(v);low=Math.min(low,v.y)}return low});
  let minPitch=Infinity,maxPitch=-Infinity,maxAir=0,minPelvis=Infinity,maxPelvis=-Infinity;
  for(let k=0;k<80;k++){
   poseHumanProposal(model,0,'run',{phase:k/80,blend:1});
   const foot=joints.ankleL.localToWorld(new T.Vector3(0,0,-.18)).sub(joints.ankleL.getWorldPosition(new T.Vector3())).normalize();
   minPitch=Math.min(minPitch,foot.y);maxPitch=Math.max(maxPitch,foot.y);
   const lows=localSoles();assert(Math.min(...lows)>-.002,'Soles above ground');maxAir=Math.max(maxAir,Math.min(...lows));
   const y=joints.pelvis.getWorldPosition(new T.Vector3()).y;
   minPelvis=Math.min(minPelvis,y);maxPelvis=Math.max(maxPelvis,y);
  }
  assert(minPitch<-.35&&maxPitch>.02&&maxAir>.05,'Peu gira i ambdós peus deixen el terra');
  assert(maxPelvis-minPelvis<.055,'Cos que rebota massa en córrer: '+(maxPelvis-minPelvis));
  // Every soldier/rocket/general weapon also follows the same correct
  // muzzle axis, not the old fixed -90-degree offset in aiming poses.
  if(role!=='player'&&p.weapon){
   const held=meshes.find(m=>m.parent?.userData.humanWeapon)?.parent;
   assert(held,'Arma subjecta al canell de '+role);
   for(const mode of ['rest','aim']){
    poseHumanProposal(model,0,mode);
    const dir=new T.Vector3(0,0,-1).applyQuaternion(held.getWorldQuaternion(new T.Quaternion()));
    const desired=new T.Vector3(0,mode==='aim'?0:-1,mode==='aim'?-1:0);
    assert(dir.dot(desired)>.999,'Canó de '+role+' en '+mode);
   }
  }
  poseHumanProposal(model,0,'rest');
  for(const [side,sign] of [['L',-1],['R',1]]){
   const wrist=joints['wrist'+side],hand=wrist.children.find(x=>x.userData.humanHand===side);
   assert(hand,'Mà articulada');const skin=hand.children.find(x=>x.userData.humanHandSurface),thumb=hand.children.find(x=>x.userData.humanThumb);
   assert(skin&&thumb,'Superfície contínua i polze');
   const origin=wrist.getWorldPosition(new T.Vector3()),thumbWorld=thumb.getWorldPosition(new T.Vector3());
   const wscale=model.scale.x;assert(thumbWorld.z<origin.z-.025*wscale,'Polze endavant');
   const dorsal=hand.localToWorld(new T.Vector3(0,-.039,-.02));assert(sign*(dorsal.x-origin.x)>.015*wscale,'Dors cap enfora');
   const bounds=new T.Box3().setFromObject(skin,true),size=bounds.getSize(new T.Vector3());
   assert(size.z>size.x*1.45&&size.y>size.z,'Mà vertical paral·lela a cuixa');
   // Closed, connected skin: every indexed edge belongs to exactly two
   // triangles. Four fingertip contours share the same skin as the dorsum.
   const idx=skin.geometry.index,edges=new Map(),used=new Set();
   for(let k=0;k<idx.count;k+=3){const tri=[idx.getX(k),idx.getX(k+1),idx.getX(k+2)];
    assert.equal(new Set(tri).size,3);for(let l=0;l<3;l++){const a=tri[l],b=tri[(l+1)%3],key=Math.min(a,b)+':'+Math.max(a,b);used.add(a);edges.set(key,(edges.get(key)||0)+1)}}
   assert.equal(used.size,skin.geometry.attributes.position.count);assert([...edges.values()].every(n=>n===2),'Pell tancada sense vores obertes');
   assert(!wrist.children.some(x=>x.userData.humanWeapon&&x.parent!==wrist),'Arma independent de la rotació de la mà');
  }
  assert.deepEqual(rest.elbowL.position.toArray(),restPos.toArray());assert.deepEqual(rest.head.rotation.toArray(),headRotation.toArray());
  // Edits belong to rest pivots; playback and JSON round-tripping preserve them.
  rest.head.rotation.y=.22;poseHumanProposal(model,.4,'walk');assert.equal(rest.head.rotation.y,.22);
  const copy=new T.ObjectLoader().parse(model.toJSON());poseHumanProposal(copy,.6,'run');poseHumanProposal(model,.6,'run');
  assert(new T.Box3().setFromObject(copy).getSize(new T.Vector3()).distanceTo(new T.Box3().setFromObject(model).getSize(new T.Vector3()))<1e-6);
  console.log('PASS',role,style,meshes.length,'malles',triangles,'triangles');count++;
 }
 assert.equal(shapes.size,2);
}
assert.equal(count,14);assert.equal(choices.size,14);
const lab=readFileSync(new URL('../src/vehicles-externs-proves.mjs',import.meta.url),'utf8'),html=readFileSync(new URL('../proves.html',import.meta.url),'utf8');
assert(html.includes('id="humanGuides"')&&html.includes('HUMANS V9'));assert(lab.includes('measureHumanAnatomy(THREE,slot.model)'));assert(lab.includes('if(continuous)return')&&lab.includes('advanceHumanGait(humanGait,elapsed,mode)'));
assert(html.indexOf('id="humanList"')>html.indexOf('id="vehicleList"'));
assert(html.includes(':is(#vehicleList,#humanList) button[data-validation=\'pending\']'));
assert(lab.includes('(config.human?humanList:list).append(button)'));
assert(lab.includes('config.human?await createCurrentHuman(THREE,config.human)'));
assert(lab.includes('!original&&!currentType.human&&'),'Les proporcions humanes no s’ajusten a l’amplada antiga');
for(const mode of ['walk','run','crouch','aim','work','wave'])assert(html.includes('value="'+mode+'"'));
assert(!readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8').includes('human-proposals'),'Candidats fora del joc');
const evidenceUI=readFileSync(new URL('../src/human-lab-evidence-ui.mjs',import.meta.url),'utf8');
assert(html.includes('id="humanWeapon"')&&html.includes('id="humanWeaponControl"'));
assert(html.includes('id="humanGuides" type="checkbox">'),'Guies desmarcades');
assert(!html.includes('C · Àgil')&&!html.includes('A/B/C')&&!evidenceUI.includes("'c'"),'Sense C al selector ni als informes');
assert(html.includes('id="sectionTabs"')&&html.includes('data-section="characters"'),'Editor humà a la pàgina principal de proves');
const liveDetails=html.match(/<details\s+id="liveEditor"[^>]*>/)?.[0];
assert(liveDetails&&!/\sopen(?:\s|=|>)/.test(liveDetails),'Refinat plegat per defecte');
console.log('PASS 7 originals, 14 candidats, 16 articulacions, moviment, edició i JSON');
