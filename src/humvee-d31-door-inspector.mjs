// D3.1 preview-only close-up editor. Select real (unindexed) mesh faces and merge on confirmation.
export function createD31DoorInspector(T, options){
 const {host,geometryFromTriangles,sideDoorCandidate,onMerge,onReset,message}=options;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.setClearColor(0x000000,0);
 host.prepend(renderer.domElement);
 const scene=new T.Scene();
 scene.add(new T.HemisphereLight(0xffffff,0x66776d,2.6));
 const light=new T.DirectionalLight(0xffffff,2);
 light.position.set(2,5,6);scene.add(light);
 const camera=new T.OrthographicCamera(-1.21,1.21,.70,-.70,.01,30);
 const raycaster=new T.Raycaster(),mouse=new T.Vector2();
 const selected=new Set();
 const marker=new T.MeshBasicMaterial({color:0xf5b45d,side:T.DoubleSide,transparent:true,opacity:.78,
  depthTest:false,depthWrite:false});
 const lineMaterial=new T.LineBasicMaterial({color:0x071718,transparent:true,opacity:.68,depthTest:false});
 const selectionGroup=new T.Group();scene.add(selectionGroup);
 let model=null,wires=null,currentTriangles=null,centerZ=0,side=1,material=null;
 let focusedDoor='front',viewScale=1;
 const doorCenterX=()=>focusedDoor==='front' ? -.425 : .425;
 const focusedSideFace=triangle=>{
  if(!sideDoorCandidate(triangle,centerZ,side))return false;
  const x=triangle.reduce((sum,v)=>sum+v.p[0],0)/3;
  return focusedDoor==='front' ? x<-.035 : x>.045;
 };
 function frameDoor(){
  const focusX=doorCenterX(),focusY=1.14;
  camera.position.set(focusX,focusY,centerZ+side*6);
  camera.lookAt(focusX,focusY,centerZ);
 }
 const counter=document.getElementById('selectedCount');
 const btnMerge=document.getElementById('mergeFaces');
 const btnClear=document.getElementById('clearFaces');
 const btnSide=document.getElementById('inspectSide');
 const btnReset=document.getElementById('resetD31');
 const btnDoor=document.getElementById('inspectDoor');
 const btnZoomIn=document.getElementById('doorZoomIn');
 const btnZoomOut=document.getElementById('doorZoomOut');
 const btnFit=document.getElementById('doorFit');
 function info(text){message.textContent=text;}
 function updateSelection(){
  counter.textContent=selected.size+' / 4 cares';
  btnMerge.disabled=selected.size!==4;
  for(const child of [...selectionGroup.children]){selectionGroup.remove(child);child.geometry.dispose();}
  if(!currentTriangles)return;
  for(const index of selected){
   const geom=geometryFromTriangles([currentTriangles[index]]);
   const mesh=new T.Mesh(geom,marker);selectionGroup.add(mesh);
  }
 }
 function setGeometry(triangles,axis,sourceMaterial){
  currentTriangles=triangles;centerZ=axis;frameDoor();
  selected.clear();
  if(model){scene.remove(model);model.geometry.dispose();}
  if(wires){scene.remove(wires);wires.geometry.dispose();}
  material=sourceMaterial.clone();material.side=T.DoubleSide;material.wireframe=false;
  const geom=geometryFromTriangles(triangles);
  model=new T.Mesh(geom,material);scene.add(model);
  wires=new T.LineSegments(new T.WireframeGeometry(geom),lineMaterial);scene.add(wires);
  updateSelection();
  const loading=document.getElementById('doorStatus');
  if(loading)loading.classList.add('done');
 }
 function setSide(next){
  side=next;frameDoor();
  btnSide.textContent=side>0?'Veure l’altra banda':'Tornar al costat inicial';
 }
 function adjustZoom(factor){
  viewScale=T.MathUtils.clamp(viewScale*factor,.52,2.8);
 }
 setSide(1);
 renderer.domElement.addEventListener('pointerdown',e=>{
  if(!model||!currentTriangles)return;
  const box=renderer.domElement.getBoundingClientRect();
  mouse.x=((e.clientX-box.left)/box.width)*2-1;
  mouse.y=-((e.clientY-box.top)/box.height)*2+1;
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObject(model,false);
  const hit=hits.find(h=>focusedSideFace(currentTriangles[h.faceIndex]));
  if(!hit){info('Clica una faceta de la porta '+(focusedDoor==='front'?'davantera':'posterior')+'. Pots apropar la imatge amb + o la roda del ratolí.');return;}
  const idx=hit.faceIndex;
  if(selected.has(idx))selected.delete(idx);
  else if(selected.size<4)selected.add(idx);
  else{info('Ja tens quatre cares seleccionades. Fusiona-les o desselecciona’n una.');return;}
  updateSelection();
  info('Triangles seleccionats: '+selected.size+'/4. Clica una cara destacada per desseleccionar-la.');
 });
 renderer.domElement.addEventListener('wheel',e=>{
  e.preventDefault();adjustZoom(e.deltaY>0?1.12:1/1.12);
 },{passive:false});
 btnZoomIn.onclick=()=>adjustZoom(.80);
 btnZoomOut.onclick=()=>adjustZoom(1.25);
 btnFit.onclick=()=>{viewScale=1;frameDoor();};
 btnDoor.onclick=()=>{
  focusedDoor=focusedDoor==='front'?'rear':'front';
  btnDoor.textContent=focusedDoor==='front'?'Porta davantera · canviar a posterior':'Porta posterior · canviar a davantera';
  selected.clear();updateSelection();viewScale=1;frameDoor();
  info('Mostrant la porta '+(focusedDoor==='front'?'davantera':'posterior')+' completa. Selecciona les quatre cares que vols fusionar.');
 };
 btnClear.onclick=()=>{selected.clear();updateSelection();info('Selecció netejada.');};
 btnSide.onclick=()=>{setSide(-side);selected.clear();updateSelection();info('Mostrant l’altre costat, mateixa porta.');};
 btnMerge.onclick=()=>{
  try{
   const output=onMerge([...selected]);
   if(output){setGeometry(output.triangles,centerZ,material);info('Fusionades: '+output.removed+' cares eliminades i 4 triangles nous (2 per costat).');}
  }catch(e){info('No s’ha pogut fusionar: '+e.message);}
 };
 btnReset.onclick=()=>{try{onReset();info('Geometria D3.1 revisada restablerta.');}catch(e){info(e.message);}};
 function render(){
  if(!model)return;
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  const actual=renderer.getSize(new T.Vector2());
  if(actual.x!==w||actual.y!==h)renderer.setSize(w,h,false);
  // Keep the COMPLETE selected door in frame at every aspect ratio.
  // Its face is roughly .80 wide x .70 high, plus safe margins.
  const aspect=w/h;
  const halfHeight=Math.max(.49,.54/aspect)*viewScale;
  const halfWidth=halfHeight*aspect;
  if(camera.left!==-halfWidth||camera.top!==halfHeight){
   camera.left=-halfWidth;camera.right=halfWidth;
   camera.top=halfHeight;camera.bottom=-halfHeight;
   camera.updateProjectionMatrix();
  }
  renderer.render(scene,camera);
 }
 return {setGeometry,render};
}
