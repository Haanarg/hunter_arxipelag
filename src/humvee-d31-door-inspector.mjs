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
 const counter=document.getElementById('selectedCount');
 const btnMerge=document.getElementById('mergeFaces');
 const btnClear=document.getElementById('clearFaces');
 const btnSide=document.getElementById('inspectSide');
 const btnReset=document.getElementById('resetD31');
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
  currentTriangles=triangles;centerZ=axis;
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
 function setSide(next){side=next;camera.position.set(0,1.16,side*6);camera.lookAt(0,1.16,0);btnSide.textContent=side>0?'Veure l’altra banda':'Tornar al costat inicial';}
 setSide(1);
 renderer.domElement.addEventListener('pointerdown',e=>{
  if(!model||!currentTriangles)return;
  const box=renderer.domElement.getBoundingClientRect();
  mouse.x=((e.clientX-box.left)/box.width)*2-1;
  mouse.y=-((e.clientY-box.top)/box.height)*2+1;
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObject(model,false);
  const hit=hits.find(h=>sideDoorCandidate(currentTriangles[h.faceIndex],centerZ,side));
  if(!hit){info('Clica una de les facetes de la porta, al lateral del vehicle.');return;}
  const idx=hit.faceIndex;
  if(selected.has(idx))selected.delete(idx);
  else if(selected.size<4)selected.add(idx);
  else{info('Ja tens quatre cares seleccionades. Fusiona-les o desselecciona’n una.');return;}
  updateSelection();
  info('Triangles seleccionats: '+selected.size+'/4. Clica una cara destacada per desseleccionar-la.');
 });
 btnClear.onclick=()=>{selected.clear();updateSelection();info('Selecció netejada.');};
 btnSide.onclick=()=>{setSide(-side);selected.clear();updateSelection();};
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
  if(renderer.getSize(new T.Vector2()).x!==w||renderer.getSize(new T.Vector2()).y!==h){
   renderer.setSize(w,h,false);camera.left=-1.19*w/h;camera.right=1.19*w/h;
   camera.top=1.19;camera.bottom=-1.19;
   // Keep width useful on narrow screens.
   const aspect=w/h,extent=aspect>1.8?1.16:1.36;
   camera.left=-extent;camera.right=extent;
   camera.top=extent/aspect;camera.bottom=-extent/aspect;
   camera.updateProjectionMatrix();
  }
  renderer.render(scene,camera);
 }
 return {setGeometry,render};
}
