// Hunter: Arxipèlag — D3.1 inspection only. The editor uses the SAME raw
// derived mesh as the vehicle preview. Nothing is merged, recoloured or saved.
// The user can mark exactly the faces to edit and share a reproducible URL.
export function createD31DoorInspector(T, options){
 const {host,geometryFromTriangles,sideDoorCandidate,onSelection,message}=options;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.setClearColor(0x000000,0);
 host.prepend(renderer.domElement);

 const scene=new T.Scene();
 scene.add(new T.HemisphereLight(0xffffff,0x66776d,2.6));
 const light=new T.DirectionalLight(0xffffff,1.9);
 light.position.set(2,5,6);scene.add(light);

 const camera=new T.OrthographicCamera(-1,1,1,-1,.01,30);
 const raycaster=new T.Raycaster(),pointer=new T.Vector2();
 const highlightMat=new T.MeshBasicMaterial({
  color:0xffa73c,side:T.DoubleSide,transparent:true,opacity:.82,
  depthTest:false,depthWrite:false
 });
 const lineMat=new T.LineBasicMaterial({
  color:0x051515,transparent:true,opacity:.65,depthTest:false
 });
 const highlights=new T.Group();
 highlights.renderOrder=10;scene.add(highlights);

 const selected=new Set();
 let currentTriangles=null,model=null,wires=null,material=null,axis=0;
 let side=1,focusedDoor='front',viewScale=1,restored=false;
 const count=document.getElementById('selectedCount');
 const infoOutput=document.getElementById('selectionData');
 const linkOutput=document.getElementById('selectionLink');
 const copyBtn=document.getElementById('copyFaces');
 const sideBtn=document.getElementById('inspectSide');
 const doorBtn=document.getElementById('inspectDoor');
 const clearBtn=document.getElementById('clearFaces');
 const zoomIn=document.getElementById('doorZoomIn');
 const zoomOut=document.getElementById('doorZoomOut');
 const fitBtn=document.getElementById('doorFit');
 const centerX=()=>focusedDoor==='front' ? -.425 : .425;
 const subject=()=> (focusedDoor==='front'?'porta davantera':'porta posterior')+
  (side>0?' · costat +Z':' · costat −Z');
 function notify(text){message.textContent=text;}
 function frameDoor(){
  const cx=centerX(),cy=1.13;
  camera.position.set(cx,cy,axis+side*6);
  camera.lookAt(cx,cy,axis);
 }
 function isDoorTriangle(triangle,faceSide=side){
  return sideDoorCandidate(triangle,axis,faceSide);
 }
 function isFocusedTriangle(triangle){
  if(!isDoorTriangle(triangle))return false;
  const x=triangle.reduce((sum,v)=>sum+v.p[0],0)/3;
  return focusedDoor==='front' ? x<-.025 : x>=-.025;
 }
 function linkForSelection(){
  const url=new URL(window.location.href);
  url.searchParams.delete('faces');
  url.searchParams.delete('door');
  url.searchParams.delete('side');
  if(selected.size){
   url.searchParams.set('faces',[...selected].sort((a,b)=>a-b).join(','));
   url.searchParams.set('door',focusedDoor);
   url.searchParams.set('side',String(side));
  }
  return url.toString();
 }
 function refresh(){
  if(!currentTriangles)return;
  for(const old of [...highlights.children]){
   highlights.remove(old);
   old.geometry.dispose();
  }
  const indices=[...selected].sort((a,b)=>a-b);
  for(const index of indices){
   if(index<0||index>=currentTriangles.length)continue;
   const mesh=new T.Mesh(geometryFromTriangles([currentTriangles[index]]),highlightMat);
   mesh.renderOrder=10;
   highlights.add(mesh);
  }
  count.textContent=indices.length+' cares seleccionades';
  infoOutput.textContent=indices.length?'Triangles D3.1: '+indices.join(', '):
    'Encara no hi ha cap triangle seleccionat.';
  linkOutput.value=indices.length?linkForSelection():'';
  copyBtn.disabled=!indices.length;
  onSelection?.(indices);
 }
 function setGeometry(triangles,centerZ,sourceMaterial){
  currentTriangles=triangles;
  axis=centerZ;
  selected.clear();
  if(model){scene.remove(model);model.geometry.dispose();model.material.dispose();}
  if(wires){scene.remove(wires);wires.geometry.dispose();}
  material=sourceMaterial.clone();
  material.side=T.DoubleSide;
  material.wireframe=false;
  const geometry=geometryFromTriangles(triangles);
  model=new T.Mesh(geometry,material);
  scene.add(model);
  wires=new T.LineSegments(new T.WireframeGeometry(geometry),lineMat);
  scene.add(wires);
  if(!restored){
   restored=true;
   const url=new URL(window.location.href);
   const incomingSide=Number(url.searchParams.get('side'));
   const incomingDoor=url.searchParams.get('door');
   if(incomingSide===-1)side=-1;
   if(incomingDoor==='rear')focusedDoor='rear';
   const faceList=(url.searchParams.get('faces')||'').split(',');
   for(const id of faceList){
    if(!/^\d+$/.test(id))continue;
    const index=Number(id);
    if(index<triangles.length&&
       (isDoorTriangle(triangles[index],1)||isDoorTriangle(triangles[index],-1))){
     selected.add(index);
    }
   }
  }
  sideBtn.textContent=side>0?'Veure l’altra banda':'Tornar al costat +Z';
  doorBtn.textContent=focusedDoor==='front'?
   'Porta davantera · canviar a posterior':'Porta posterior · canviar a davantera';
  frameDoor();
  refresh();
  const loading=document.getElementById('doorStatus');
  if(loading)loading.classList.add('done');
  notify('Mostrant el mateix D3.1 de la vista superior. Selecciona les cares que vols dividir o pintar; no es farà cap canvi fins que m’indiquis què vols.');
 }
 renderer.domElement.addEventListener('pointerdown',event=>{
  if(!model||!currentTriangles)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=(event.clientX-rect.left)/rect.width*2-1;
  pointer.y=-(event.clientY-rect.top)/rect.height*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObject(model,false);
  const hit=hits.find(h=>h.faceIndex!==null&&h.faceIndex!==undefined&&
    isFocusedTriangle(currentTriangles[h.faceIndex]));
  if(!hit){
   notify('Selecciona un triangle visible de la '+subject()+'. Pots canviar de porta o fer zoom.');
   return;
  }
  const id=hit.faceIndex;
  if(selected.has(id))selected.delete(id);else selected.add(id);
  refresh();
  notify('Has marcat '+selected.size+' cares. Clica una cara taronja per desseleccionar-la. Pots copiar l’enllaç de la selecció i enviar-me’l.');
 });
 renderer.domElement.addEventListener('wheel',event=>{
  event.preventDefault();
  viewScale=T.MathUtils.clamp(viewScale*(event.deltaY>0?1.12:1/1.12),.50,3);
 },{passive:false});
 sideBtn.onclick=()=>{
  side=-side;frameDoor();refresh();
  sideBtn.textContent=side>0?'Veure l’altra banda':'Tornar al costat +Z';
  notify('Ara es mostra '+subject()+'. Les cares que ja has seleccionat es conserven.');
 };
 doorBtn.onclick=()=>{
  focusedDoor=focusedDoor==='front'?'rear':'front';
  viewScale=1;
  frameDoor();refresh();
  doorBtn.textContent=focusedDoor==='front'?
   'Porta davantera · canviar a posterior':'Porta posterior · canviar a davantera';
  notify('Ara es mostra '+subject()+'. Les cares seleccionades es conserven.');
 };
 zoomIn.onclick=()=>{viewScale=T.MathUtils.clamp(viewScale*.80,.5,3);};
 zoomOut.onclick=()=>{viewScale=T.MathUtils.clamp(viewScale*1.25,.5,3);};
 fitBtn.onclick=()=>{viewScale=1;frameDoor();};
 clearBtn.onclick=()=>{
  selected.clear();refresh();notify('Selecció netejada. El model D3.1 no s’ha modificat.');
 };
 copyBtn.onclick=async()=>{
  const ids=[...selected].sort((a,b)=>a-b);
  if(!ids.length)return;
  const detail='Hunter: Arxipèlag | Humvee D3.1 original | '+subject()+
   ' | triangles: '+ids.join(', ')+'\n'+linkForSelection();
  try{
   await navigator.clipboard.writeText(detail);
   notify('Referència copiada! Enganxa-la al xat per indicar-me quins triangles vols modificar.');
  }catch(_){
   window.prompt('Copia aquesta referència i envia-me-la:',detail);
  }
 };
 function render(){
  if(!model)return;
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  const actual=renderer.getSize(new T.Vector2());
  if(actual.x!==w||actual.y!==h)renderer.setSize(w,h,false);
  const aspect=w/h;
  const halfHeight=Math.max(.50,.56/aspect)*viewScale;
  const halfWidth=halfHeight*aspect;
  if(camera.top!==halfHeight||camera.right!==halfWidth){
   camera.left=-halfWidth;camera.right=halfWidth;
   camera.top=halfHeight;camera.bottom=-halfHeight;
   camera.updateProjectionMatrix();
  }
  renderer.render(scene,camera);
 }
 return {setGeometry,render,getSelection:()=>[...selected].sort((a,b)=>a-b)};
}
