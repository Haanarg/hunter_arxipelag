import * as THREE from '../vendor/three-r186.module.mjs';
import {getHoleBrushTarget,closeHoleUnderBrush} from './vehicle-hole-brush.mjs';

// Editor d'anotacions 3D reutilitzable. Mai no altera les malles originals:
// els pinzells són visuals i s'exporten com instruccions i coordenades.
export function createVehicleAnnotationEditor({slots,getType}){
 const $=id=>document.getElementById(id);
 const panel=$('btrPartTool'),enabled=$('btrSelectEnabled'),modeControl=$('btrSelectMode');
 const groupControl=$('btrSelectGroup'),size=$('btrBrushRadius');
 const sizeLabel=$('btrBrushRadiusText'),notes=$('btrSelectNote');
 const feedback=$('btrSelectFeedback'),list=$('btrSelections');
 const liveStatus=$('btrRepairLiveStatus'),liveCount=$('btrRepairLiveCount');
 const largeHole=$('btrLargeHoleMode');
 const raycaster=new THREE.Raycaster(),cursor=new THREE.Vector2();
 const COLORS={join:[0xffcf55,0x57ddf2,0xff70ab,0x9af07a],fill:0x2ee6e9,remove:0xff5e64};
 const NAMES={join:'UNIR PECES',fill:'TAPAR FORAT',remove:'ELIMINAR PEÇA'};
 const strokes=[];let current=null;
 const previewMaterial=new THREE.MeshBasicMaterial({color:COLORS.fill,side:THREE.DoubleSide,depthTest:false,depthWrite:false,transparent:true,opacity:.78});
 const preview=new THREE.Mesh(new THREE.RingGeometry(.91,1,32),previewMaterial);
 preview.name='Vehicle_hole_brush_surface_cursor';preview.visible=false;
 preview.userData.vehicleAnnotationOverlay=true;preview.raycast=()=>{};
 let previewSlot=null,previewPatch=null,previewKey=null;
 const repairCounts=()=>strokes.reduce((acc,stroke)=>{
  if(stroke.mode!=='fill')return acc;
  for(const mark of stroke.marks){
   if(mark.status?.startsWith('REPARAT:')){acc.repaired++;acc.triangles+=mark.triangles||0}
   else if(mark.status?.startsWith('pendent:'))acc.pending++;
  }
  return acc;
 },{repaired:0,triangles:0,pending:0});
 function updateLiveStatus(message){
  const {repaired,triangles,pending}=repairCounts();
  if(liveCount)liveCount.textContent=repaired+' reparacions · +'+triangles+' triangles · '+pending+' pendents';
  if(liveStatus&&message)liveStatus.textContent=message;
 }
 function clearPatchPreview(){
  if(previewPatch){
   previewPatch.removeFromParent();previewPatch.geometry.dispose();previewPatch.material.dispose();previewPatch=null;
  }
  previewKey=null;
 }
 function showPatchPreview(target){
  if(!target){clearPatchPreview();return}
  const identifier=target.mesh.geometry.uuid+':'+target.path.map(p=>p.i).join(',');
  if(previewKey===identifier)return;
  clearPatchPreview();
  const coordinates=target.points.flatMap(p=>[p.x,p.y,p.z]),indices=target.triangles.flat();
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshBasicMaterial({color:0x44ffae,side:THREE.DoubleSide,
   transparent:true,opacity:.62,depthWrite:false,depthTest:true,
   polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  previewPatch=new THREE.Mesh(geometry,material);
  previewPatch.name='Vehicle_hole_repair_live_preview';
  previewPatch.userData.vehicleAnnotationOverlay=true;
  previewPatch.raycast=()=>{};
  // Local al mesh: exactament els triangles que s'afegiran en confirmar.
  target.mesh.add(previewPatch);
  previewKey=identifier;
 }

 const fmt=x=>Number(x).toFixed(3);
 const isEnabled=()=>enabled.checked&&!panel.hidden;
 const mode=()=>modeControl.value;
 function rayAt(slot,x,y){
  const rect=slot.viewport.getBoundingClientRect();
  if(!slot.model||rect.width<=0||rect.height<=0)return false;
  cursor.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);
  slot.camera.updateMatrixWorld(true);slot.model.updateMatrixWorld(true);
  raycaster.setFromCamera(cursor,slot.camera);
  return true;
 }
 function findHit(slot,x,y){
  if(!rayAt(slot,x,y))return null;
  const targets=[];
  slot.model.traverse(mesh=>{
   if(mesh.isMesh&&!mesh.userData.vehicleAnnotationOverlay)targets.push(mesh);
  });
  return raycaster.intersectObjects(targets,false)[0]||null;
 }
 function nearestHit(slot,x,y){
  let hit=findHit(slot,x,y);if(hit)return hit;
  // Un forat pot no tenir cap triangle sota el cursor. Busquem les vores
  // properes i hi fixem el pla del pinzell, sense fingir que hem trobat una cara.
  for(const r of [10,24,42,65]){
   for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    hit=findHit(slot,x+Math.cos(a)*r,y+Math.sin(a)*r);
    if(hit)return hit;
   }
  }
  return null;
 }
 function updateList(){
  list.textContent='';
  if(!strokes.length){list.textContent='Encara no hi ha marques.';return}
  strokes.forEach((stroke,i)=>{
   const row=document.createElement('div');row.className='btr-selection-row';
   const label=document.createElement('span');
   label.textContent=NAMES[stroke.mode]+(stroke.mode==='join'?' · grup '+stroke.group:'')+
    ' · '+stroke.vehicle+' · '+stroke.variant+' · '+stroke.marks.length+' punts';
   const button=document.createElement('button');button.type='button';button.textContent='Treure';
   button.addEventListener('click',()=>remove(i));row.append(label,button);list.append(row);
  });
 }
 function remove(i){
  const [stroke]=strokes.splice(i,1);
  if(stroke)for(const edit of [...(stroke.edits||[])].reverse()){
   if(edit.mesh.geometry===edit.current){
    edit.mesh.geometry=edit.previous;
    edit.mesh.material=edit.previousMaterial;
    edit.current.dispose();
    const mats=Array.isArray(edit.repairedMaterial)?edit.repairedMaterial:[edit.repairedMaterial];
    for(const mat of mats)mat.dispose();
   }
  }
  if(stroke)for(const v of stroke.visuals){
   v.removeFromParent();v.geometry?.dispose();v.material?.dispose();
  }
  updateList();updateLiveStatus('Acció desfeta: el model s’ha actualitzat.');
 }
 function reset(){
  current=null;preview.visible=false;clearPatchPreview();
  while(strokes.length)remove(strokes.length-1);
  feedback.textContent='Selecciona una eina i marca les zones del model.';
  updateLiveStatus('Sense reparacions interactives en aquesta sessió.');
 }
 function makeStroke(slot){
  const stroke={mode:mode(),group:Number(groupControl.value),vehicle:getType(),
   variant:slots.indexOf(slot)===0?'Model 1':'Model '+(slots.indexOf(slot)+1),
   marks:[],visuals:[],edits:[],last:null,slot,plane:null,anchor:null};
  strokes.push(stroke);updateList();return stroke;
 }
 function surfacePaint(stroke,hit){
  const mesh=hit.object,geo=mesh.geometry,pos=geo?.getAttribute('position');
  if(!pos)return false;
  const index=geo.index;
  const center=mesh.worldToLocal(hit.point.clone());
  const scale=mesh.getWorldScale(new THREE.Vector3());
  const localRadius=Number(size.value)/Math.max(.0001,(Math.abs(scale.x)+Math.abs(scale.y)+Math.abs(scale.z))/3);
  const faceNormal=hit.face?.normal?.clone().normalize()||new THREE.Vector3(0,0,1);
  const va=new THREE.Vector3(),vb=new THREE.Vector3(),vc=new THREE.Vector3();
  const mid=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3(),normal=new THREE.Vector3();
  const triangles=[];
  const total=Math.floor((index?.count??pos.count)/3);
  for(let i=0;i<total;i++){
   const a=index?index.getX(i*3):i*3,b=index?index.getX(i*3+1):i*3+1,c=index?index.getX(i*3+2):i*3+2;
   va.fromBufferAttribute(pos,a);vb.fromBufferAttribute(pos,b);vc.fromBufferAttribute(pos,c);
   mid.copy(va).add(vb).add(vc).multiplyScalar(1/3);
   normal.crossVectors(ab.subVectors(vb,va),ac.subVectors(vc,va)).normalize();
   if(i!==hit.faceIndex&&(mid.distanceTo(center)>localRadius||normal.dot(faceNormal)<.16))continue;
   triangles.push(...va.toArray(),...vb.toArray(),...vc.toArray());
  }
  if(!triangles.length)return false;
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(triangles,3));
  g.computeVertexNormals();
  const color=stroke.mode==='join'?COLORS.join[stroke.group-1]:COLORS[stroke.mode];
  const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:stroke.mode==='remove'?.77:.60,
   side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const overlay=new THREE.Mesh(g,mat);
  overlay.userData.vehicleAnnotationOverlay=true;overlay.raycast=()=>{};
  mesh.add(overlay);stroke.visuals.push(overlay);
  return {mesh:mesh.name||'(sense nom)',face:hit.faceIndex,triangles:triangles.length/9};
 }
 // El cercle segueix la superfície real o el contorn obert detectat,
 // i mai no s'ancora en un pla virtual de profunditat inventada.
 function placeCursor(slot,x,y){
  if(!isEnabled()||mode()!=='fill'||slot.outer.hidden||!slot.model){
   preview.visible=false;clearPatchPreview();return null;
  }
  const hit=nearestHit(slot,x,y);
  if(!hit){preview.visible=false;clearPatchPreview();return null}
  const radius=Number(size.value);
  const target=getHoleBrushTarget(hit.object,hit.point,radius,{large:largeHole?.checked===true});
  const worldPoint=target?hit.object.localToWorld(target.center.clone()):hit.point.clone();
  showPatchPreview(target);
  let normal;
  if(target)normal=target.normal.clone().transformDirection(hit.object.matrixWorld);
  else normal=(hit.face?.normal?.clone()||new THREE.Vector3(0,0,1)).transformDirection(hit.object.matrixWorld);
  const scale=target?Math.min(radius*1.2,.48):radius;
  preview.position.copy(worldPoint).addScaledVector(normal,.012);
  preview.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal.normalize());
  preview.scale.setScalar(scale);
  previewMaterial.color.setHex(target?0x32efaa:COLORS.fill);
  if(previewSlot!==slot){
   preview.removeFromParent();slot.scene.add(preview);previewSlot=slot;
  }
  preview.visible=true;
  if(target)updateLiveStatus('Previsualització verda: '+target.triangles.length+' triangles, contorn '+(target.span*2).toFixed(2)+' m. Clica per aplicar-los.');
  else updateLiveStatus(largeHole?.checked?'Sense contorn tancat compatible. Si la carrosseria té una vora oberta, cal reconstruir-ne el panell per contorn.':'Contorn incompatible: prova «Forats grans» per buscar llaços més amplis.');
  return {hit,target,worldPoint};
 }
 function markPendingOnSurface(stroke,hit){
  // Anotació visible, enganxada a la cara real: no hi ha cap pla fictici.
  const normal=(hit.face?.normal?.clone()||new THREE.Vector3(0,0,1))
   .transformDirection(hit.object.matrixWorld).normalize();
  const mark=new THREE.Mesh(new THREE.RingGeometry(.73,1,24),
   new THREE.MeshBasicMaterial({color:COLORS.fill,side:THREE.DoubleSide,
    transparent:true,opacity:.66,depthWrite:false,polygonOffset:true,
    polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  mark.position.copy(hit.point).addScaledVector(normal,.008);
  mark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
  mark.scale.setScalar(Number(size.value)*.72);
  mark.userData.vehicleAnnotationOverlay=true;mark.raycast=()=>{};
  stroke.slot.scene.add(mark);stroke.visuals.push(mark);
 }
 function sample(stroke,x,y,force=false){
  if(!stroke||!stroke.slot.model)return false;
  if(!force&&stroke.last&&Math.hypot(stroke.last[0]-x,stroke.last[1]-y)<10)return false;
  const hit=stroke.mode==='fill'||stroke.mode==='remove'?nearestHit(stroke.slot,x,y):findHit(stroke.slot,x,y);
  // Les malles GLB poden tenir forats, triangles d'una sola cara o parts
  // no col·lisionables. El mode d'eliminar no pot perdre la selecció
  // simplement perquè el primer raig no hagi trobat una cara.
  if(!hit&&stroke.mode==='join'){
   feedback.textContent='No he trobat cap cara en aquest punt. Prova més a prop del model.';
   return false;
  }
  let point,normal,meta={mesh:'(forat / espai buit)',face:null,triangles:0};
  if(stroke.mode==='fill'){
   const placement=placeCursor(stroke.slot,x,y);
   if(!placement){feedback.textContent='Acosta el cursor a una vora real del model.';return false}
   const {target,hit:surfaceHit,worldPoint}=placement;
   point=worldPoint;
   if(!target){
    feedback.textContent='Sense contorn tancat sota el pinzell. El cercle blau marca la superfície, però encara no s’ha reparat res.';
    // Conservem el punt sobre la superfície real com a anotació.
    meta.mesh=surfaceHit.object.name||'(sense nom)';
    meta.status='pendent: sense contorn compatible';
    markPendingOnSurface(stroke,surfaceHit);
   }else{
    clearPatchPreview();
    const edit=closeHoleUnderBrush(target);
    if(!edit)return false;
    stroke.edits.push(edit);
    meta.mesh=edit.mesh.name||'(sense nom)';
    meta.face=surfaceHit.faceIndex;
    meta.triangles=edit.triangles;
    meta.status='REPARAT: '+edit.triangles+' triangles afegits';
    preview.visible=false;
    updateLiveStatus('Reparació aplicada al model 3D: +'+edit.triangles+' triangles. Pots girar la vista o desfer.');
   }
  }else if(hit){
   point=hit.point.clone();
   meta=surfacePaint(stroke,hit);
   if(!meta){
    feedback.textContent='La cara no té una malla seleccionable.';
    return false;
   }
  }else{
   // Eliminar: conserva una marca espacial encara que el model tingui
   // una cara buida o la malla no respongui al raycast.
   if(!rayAt(stroke.slot,x,y))return false;
   const modelCenter=new THREE.Box3().setFromObject(stroke.slot.model).getCenter(new THREE.Vector3());
   const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(
    stroke.slot.camera.getWorldDirection(new THREE.Vector3()).negate(),modelCenter);
   point=new THREE.Vector3();
   if(!raycaster.ray.intersectPlane(plane,point))return false;
   const sphere=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.055,Number(size.value)*.25),10,8),
    new THREE.MeshBasicMaterial({color:COLORS.remove,transparent:true,opacity:.75,depthTest:false}));
   sphere.position.copy(point);
   sphere.userData.vehicleAnnotationOverlay=true;
   sphere.raycast=()=>{};
   stroke.slot.scene.add(sphere);
   stroke.visuals.push(sphere);
   meta={mesh:'(espai buit / cap cara detectada)',face:null,triangles:0};
  }
  const local=stroke.slot.model.worldToLocal(point.clone()).toArray();
  stroke.marks.push({point:local,radius:Number(size.value),...meta});
  stroke.last=[x,y];
  updateList();updateLiveStatus();
  feedback.textContent=meta.status||NAMES[stroke.mode]+' · '+stroke.marks.length+' punts a la traçada.';
  return true;
 }
 function begin(slot,e){
  if(!isEnabled()||slot.outer.hidden||!slot.model)return false;
  current=makeStroke(slot);
  sample(current,e.clientX,e.clientY,true);
  return true;
 }
 function move(slot,e){
  if(!current||current.slot!==slot)return false;
  if(mode()==='fill'){placeCursor(slot,e.clientX,e.clientY);return true}
  if(mode()==='join')return true; // reparació: un forat per clic
  sample(current,e.clientX,e.clientY);
  return true;
 }
 function end(slot,e){
  if(!current||current.slot!==slot)return false;
  if(mode()!=='fill'&&(!current.marks.length||!current.last||Math.hypot(current.last[0]-e.clientX,current.last[1]-e.clientY)>9))
   sample(current,e.clientX,e.clientY,true);
  if(!current.marks.length){
   // No eliminem silenciosament les marques: així l'usuari sap què ha passat.
   const index=strokes.indexOf(current);
   if(index>=0)remove(index);
   feedback.textContent='No s’ha pogut marcar aquesta zona. Prova amb un pinzell més gros o una altra vista.';
  }
  current=null;return true;
 }
 function description(){
  const lines=[
   'HUNTER: ARXIPÈLAG — editor de models 3D · anotacions',
   'Vehicle: '+getType(),
   'Marques no destructives. Coordenades XYZ locals del model, aproximades.',
   'Modes: UNIR PECES, TAPAR FORAT (traçada a l’espai, fins i tot sense triangles) i ELIMINAR PEÇA.',
   ''
  ];
  for(const [i,s] of strokes.entries()){
   lines.push('ANOTACIÓ '+(i+1)+' — '+NAMES[s.mode]+
    (s.mode==='join'?' · GRUP '+s.group:'')+' · '+s.variant+':');
   for(const [j,m] of s.marks.entries())
    lines.push(' '+(j+1)+'. malla '+m.mesh+' · triangle '+(m.face??'sense cara')+
     ' · centre ('+m.point.map(fmt).join(', ')+') · radi '+m.radius.toFixed(2)+
     ' m'+(s.mode==='remove'?' · triangles pintats '+m.triangles:'')+
     (m.status?' · '+m.status:''));
   lines.push('');
  }
  lines.push('EXPLICACIÓ:');
  lines.push(notes.value.trim()||'(Sense comentaris addicionals)');
  return lines.join('\n');
 }
 async function copy(){
  if(!strokes.length){feedback.textContent='Marca almenys una zona abans de copiar.';return}
  const text=description();
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
   else{
    const temp=document.createElement('textarea');temp.value=text;
    document.body.append(temp);temp.select();
    if(!document.execCommand('copy'))throw Error('No es pot copiar');
    temp.remove();
   }
   feedback.textContent='Anotacions copiades. Enganxa-les al xat.';
  }catch{
   notes.value=text;notes.focus();notes.select();
   feedback.textContent='Selecciona i copia manualment el text del camp.';
  }
 }
 $('btrCopySelection').addEventListener('click',copy);
 $('btrUndoSelection').addEventListener('click',()=>{if(strokes.length)remove(strokes.length-1)});
 $('btrClearSelection').addEventListener('click',reset);
 modeControl.addEventListener('change',()=>{
  preview.visible=false;clearPatchPreview();
  updateLiveStatus(mode()==='fill'?'Mou el cursor sobre el model per veure la reparació en verd abans de clicar.':'Mode d’anotació: la geometria no es modifica.');
  feedback.textContent=mode()==='fill'?'Mou el cercle sobre una vora del forat. Verd = contorn detectable; clica per tancar-lo. Blau = encara no reparable.':
   mode()==='remove'?'Arrossega per marcar les cares que vols eliminar.':
   'Clica les peces que vols unir; selecciona un mateix grup per relacionar-les.';
  groupControl.disabled=mode()!=='join';
 });
 enabled.addEventListener('change',()=>{
  panel.classList.toggle('selecting',enabled.checked);
  if(!enabled.checked){preview.visible=false;clearPatchPreview()}
  feedback.textContent=enabled.checked?'Editor actiu: selecciona una eina i pinta o clica sobre el model.':'Editor desactivat.';
 });
 size.addEventListener('input',()=>{sizeLabel.textContent=Number(size.value).toFixed(2)+' m';preview.visible=false;clearPatchPreview()});
 largeHole?.addEventListener('change',()=>{
  if(largeHole.checked&&Number(size.value)<1.0){size.value='1.0';sizeLabel.textContent='1.00 m'}
  preview.visible=false;clearPatchPreview();
  updateLiveStatus(largeHole.checked?'Forats grans: contorns tancats fins a uns 4 m de radi. Previsualitza abans de clicar.':'Forats petits: comprovació estricta de contorns.');
 });
 updateList();updateLiveStatus('Mou el cursor per previsualitzar la reparació; clica per aplicar-la.');
 return {active:isEnabled,begin,move,end,reset,hover:(slot,e)=>placeCursor(slot,e.clientX,e.clientY),hideCursor:()=>{preview.visible=false;clearPatchPreview()},mark:(slot,e)=>{begin(slot,e);end(slot,e)}};
}
