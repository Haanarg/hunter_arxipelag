import * as THREE from '../vendor/three-r186.module.mjs';

// Eina de marcatge no destructiva: permet descriure peces mal unides encara
// que el GLB les hagués fusionat dins d'una sola malla de material.
export function createBtr82PartSelector({slots,getType}){
 const panel=document.querySelector('#btrPartTool');
 const enabled=document.querySelector('#btrSelectEnabled');
 const groupInput=document.querySelector('#btrSelectGroup');
 const radiusInput=document.querySelector('#btrBrushRadius');
 const radiusOutput=document.querySelector('#btrBrushRadiusText');
 const note=document.querySelector('#btrSelectNote');
 const results=document.querySelector('#btrSelections');
 const copyButton=document.querySelector('#btrCopySelection');
 const undoButton=document.querySelector('#btrUndoSelection');
 const clearButton=document.querySelector('#btrClearSelection');
 const feedback=document.querySelector('#btrSelectFeedback');
 const raycaster=new THREE.Raycaster();
 const colors=[0xffcf55,0x57ddf2,0xff70ab,0x9af07a];
 const zones=[];
 const format=n=>Number(n).toFixed(3);
 const active=()=>getType()==='tanqueta'&&!!enabled.checked;
 const paint=()=>{
  results.textContent='';
  if(!zones.length){results.textContent='Encara no hi ha cap peça seleccionada.';return}
  for(const [i,z] of zones.entries()){
   const line=document.createElement('div');
   line.className='btr-selection-row';
   const label=document.createElement('span');
   label.textContent='Grup '+z.group+' · '+z.variant+' · '+z.name+' · ('+
     z.point.map(format).join(', ')+')';
   const remove=document.createElement('button');remove.type='button';
   remove.textContent='Treure';remove.title='Eliminar aquesta zona';
   remove.addEventListener('click',()=>removeAt(i));
   line.append(label,remove);results.append(line);
  }
 };
 function removeAt(i){
  const [z]=zones.splice(i,1);
  if(z?.overlay?.parent)z.overlay.parent.remove(z.overlay);
  z?.overlay?.geometry?.dispose();
  paint();
 }
 function reset(){
  while(zones.length)removeAt(zones.length-1);
  feedback.textContent='Marca les peces del model per indicar quines han d’anar juntes.';
 }
 function mark(slot,pointerEvent){
  if(!active()||slot.outer.hidden||!slot.model)return false;
  const rect=slot.viewport.getBoundingClientRect();
  if(rect.width<1||rect.height<1)return false;
  const pointer=new THREE.Vector2(
   (pointerEvent.clientX-rect.left)/rect.width*2-1,
   -(pointerEvent.clientY-rect.top)/rect.height*2+1
  );
  slot.camera.updateMatrixWorld(true);
  slot.model.updateMatrixWorld(true);
  raycaster.setFromCamera(pointer,slot.camera);
  const targets=[];
  slot.model.traverse(o=>{if(o.isMesh&&!o.userData.btrSelectionOverlay)targets.push(o)});
  const hit=raycaster.intersectObjects(targets,false)[0];
  if(!hit||!hit.object.geometry?.getAttribute('position')){
   feedback.textContent='No s’ha detectat cap peça: clica directament sobre el blindat.';
   return false;
  }
  const mesh=hit.object,geo=mesh.geometry,pos=geo.getAttribute('position');
  const index=geo.index;
  const worldScale=mesh.getWorldScale(new THREE.Vector3());
  const scale=(Math.abs(worldScale.x)+Math.abs(worldScale.y)+Math.abs(worldScale.z))/3||1;
  const radius=Number(radiusInput.value);
  const localRadius=radius/scale;
  const center=mesh.worldToLocal(hit.point.clone());
  const hitNormal=hit.face?.normal?.clone().normalize()||new THREE.Vector3(0,0,1);
  const count=(index?.count||pos.count)/3;
  const selected=[];
  const va=new THREE.Vector3(),vb=new THREE.Vector3(),vc=new THREE.Vector3();
  const midpoint=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let face=0;face<count;face++){
   const a=index?index.getX(face*3):face*3;
   const b=index?index.getX(face*3+1):face*3+1;
   const c=index?index.getX(face*3+2):face*3+2;
   va.fromBufferAttribute(pos,a);vb.fromBufferAttribute(pos,b);vc.fromBufferAttribute(pos,c);
   midpoint.copy(va).add(vb).add(vc).multiplyScalar(1/3);
   ab.subVectors(vb,va);ac.subVectors(vc,va);normal.crossVectors(ab,ac).normalize();
   if(face!==hit.faceIndex&&(midpoint.distanceTo(center)>localRadius||normal.dot(hitNormal)<.25))continue;
   selected.push(...va.toArray(),...vb.toArray(),...vc.toArray());
  }
  if(!selected.length)return false;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(selected,3));
  geometry.computeVertexNormals();
  const group=Number(groupInput.value);
  const mat=new THREE.MeshBasicMaterial({
   color:colors[group-1],side:THREE.DoubleSide,transparent:true,opacity:.55,
   depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2
  });
  const overlay=new THREE.Mesh(geometry,mat);
  overlay.name='BTR82_selection_group_'+group;
  overlay.userData.btrSelectionOverlay=true;
  overlay.raycast=()=>{};
  mesh.add(overlay);
  // Coordenades de la base del model: independents del zoom i de la càmera.
  const point=slot.model.worldToLocal(hit.point.clone());
  const variant=slots.indexOf(slot)===0?'Original':'Low-poly';
  zones.push({
   group,variant,name:mesh.name||'malla sense nom',
   face:hit.faceIndex,point:point.toArray(),
   radius,triangles:selected.length/9,overlay
  });
  feedback.textContent='Zona '+zones.length+' seleccionada al grup '+group+
   ' ('+variant+'). Pots seguir afegint peces al mateix grup.';
  paint();
  return true;
 }
 function description(){
  const grouped=new Map();
  for(const z of zones){
   if(!grouped.has(z.group))grouped.set(z.group,[]);
   grouped.get(z.group).push(z);
  }
  const lines=['HUNTER: ARXIPÈLAG — BTR-82 · selecció de peces',
   'Versions: original (base Three.js 25%, rodes A4.3, canó llarg) i low-poly final.',
   'Coordenades XYZ locals respecte del model, en metres aproximats.',
   'Els colors/grups indiquen les peces que vull unir; no s’ha modificat la geometria.',''];
  for(const [group,items] of [...grouped.entries()].sort((a,b)=>a[0]-b[0])){
   lines.push('GRUP '+group+' — peces que han d’anar juntes:');
   for(const [i,z] of items.entries())
    lines.push('  '+(i+1)+'. '+z.variant+' · malla '+z.name+
     ' · triangle '+z.face+' · centre ('+z.point.map(format).join(', ')+
     ') · radi de zona '+z.radius.toFixed(2)+' m · '+z.triangles+' triangles marcats');
   lines.push('');
  }
  lines.push('EXPLICACIÓ:');
  lines.push(note.value.trim()||'(Sense comentaris addicionals)');
  return lines.join('\n');
 }
 copyButton.addEventListener('click',async()=>{
  if(!zones.length){feedback.textContent='Selecciona almenys una zona abans de copiar.';return}
  const text=description();
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
   else{
    const temp=document.createElement('textarea');temp.value=text;
    temp.style.position='fixed';temp.style.top='0';temp.style.opacity='0';
    document.body.append(temp);temp.select();
    if(!document.execCommand('copy'))throw Error('Còpia no disponible');
    temp.remove();
   }
   feedback.textContent='Descripció copiada: enganxa-la al xat per indicar-me quines peces vols unir.';
  }catch(e){
   feedback.textContent='No s’ha pogut copiar automàticament. Selecciona aquest text i copia’l:';
   note.value=description();
   note.focus();note.select();
  }
 });
 undoButton.addEventListener('click',()=>{if(zones.length)removeAt(zones.length-1)});
 clearButton.addEventListener('click',reset);
 enabled.addEventListener('change',()=>{panel.classList.toggle('selecting',enabled.checked);feedback.textContent=enabled.checked?'Clica sobre les superfícies que vols unir. Arrossega per girar.':'Mode selecció desactivat.'});
 radiusInput.addEventListener('input',()=>radiusOutput.textContent=Number(radiusInput.value).toFixed(2)+' m');
 paint();
 return {mark,reset,active};
}
