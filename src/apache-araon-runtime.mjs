// Apache AH-64 original d'Araon · CC BY 4.0.
// Prioritat al GLB DEFINITIU de 2.193 triangles, recuperat íntegrament de
// l'historial Git (4.123.680 bytes, pintat sàlvia/negre, rodes 75%,
// quatre textures). Només si no es pot carregar, recorrem a la malla
// compacta d'Araon 50% (2.173 triangles, textures reduïdes a color de vèrtex).
// APG2 precompilat en el propi mòdul; cap GLB ni cap petició de xarxa.
const APG2_DEFLATED='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';
export const APACHE_MODEL_SOURCE='https://sketchfab.com/3d-models/ah-64-apache-df0993ee21e74a759cd0519f6fc51cf8';
export const APACHE_TRIANGLES=2193;
export const APACHE_PACKED_TRIANGLES=2173;
export const APACHE_MODEL_ID='araon-50-wheels75-salvia-black';
const TARGET_LENGTH=10.725; // +50% visual respecte al model anterior (7.15)
const WHEEL_CONTACT=.405;
const PARTS=['hull','cockpit','glass','main_rotor','tail_rotor'];
const VERTICES=[1518,178,53,164,144];
const FACES=[1481,153,45,264,230];
const RAW_BYTES=27481;
const COMPRESSED_BYTES=18862;

function triangles(root){
 let result=0;
 root.traverse(node=>{
  if(node.isMesh&&node.geometry?.getAttribute('position'))
   result+=Math.floor((node.geometry.getIndex()?.count??node.geometry.getAttribute('position').count)/3);
 });
 return result;
}

async function loadAraonCompact(THREE){
 if(typeof DecompressionStream!=='function')
  throw Error('Aquest navegador no admet descompressió deflate de l’Apache');
 const raw=atob(APG2_DEFLATED);
 const compressed=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)compressed[i]=raw.charCodeAt(i);
 if(compressed.byteLength!==COMPRESSED_BYTES)
  throw Error('Mida de la geometria Apache incorporada incorrecta: '+compressed.byteLength);
 const expanded=await new Response(
  new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate'))
 ).arrayBuffer();
 if(expanded.byteLength!==RAW_BYTES)
  throw Error('Geometria Apache incompleta: '+expanded.byteLength);
 const dv=new DataView(expanded);
 if(String.fromCharCode(...new Uint8Array(expanded,0,4))!=='APG2')
  throw Error('Format de geometria Apache desconegut');
 const root=new THREE.Group();root.name='Apache_Araon_50_compact';
 let offset=4;
 for(let part=0;part<PARTS.length;part++){
  const nVerts=dv.getUint32(offset,true),nFaces=dv.getUint32(offset+4,true);
  offset+=8;
  if(nVerts!==VERTICES[part]||nFaces!==FACES[part])
   throw Error('Malla Apache '+PARTS[part]+' incompleta');
  const coords=new Float32Array(nVerts*3);
  for(let i=0;i<coords.length;i++,offset+=2)coords[i]=dv.getInt16(offset,true)/1000;
  const indices=new Uint16Array(nFaces*3);
  for(let i=0;i<indices.length;i++,offset+=2)indices[i]=dv.getUint16(offset,true);
  const shade=new Uint8Array(expanded,offset,nVerts);offset+=nVerts;
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  geo.setIndex(new THREE.BufferAttribute(indices,1));
  geo.computeVertexNormals();
  geo.computeBoundingBox();geo.computeBoundingSphere();
  const rotor=part===3||part===4,glass=part===2;
  let material;
  if(rotor){
   material=new THREE.MeshStandardMaterial({
    color:0x171c1b,roughness:.92,metalness:.06,side:THREE.DoubleSide
   });
  }else if(glass){
   material=new THREE.MeshStandardMaterial({
    color:0x6f949d,transparent:true,opacity:.37,depthWrite:false,
    roughness:.29,metalness:.04,side:THREE.DoubleSide
   });
  }else{
   const base=new THREE.Color(part===1?0x66725f:0x9ca98b);
   const colors=new Float32Array(nVerts*3);
   const detail=new THREE.Color(0x242c27);
   for(let i=0;i<nVerts;i++){
    // Les zones més fosques de l'atles original continuen dibuixant
    // respiradors, joints, marcs de les finestres i pneumàtics.
    const v=shade[i];
    const col=(v<5?detail:base).clone();
    if(v>=5)col.multiplyScalar(.60+.98*Math.pow(v/255,.72));
    colors[i*3]=col.r;colors[i*3+1]=col.g;colors[i*3+2]=col.b;
   }
   geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
   material=new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:true,roughness:.90,metalness:.035,
    side:THREE.DoubleSide
   });
  }
  const mesh=new THREE.Mesh(geo,material);
  mesh.name=PARTS[part];
  root.add(mesh);
 }
 if(offset!==RAW_BYTES)throw Error('Dades sobrants al model Apache');
 if(triangles(root)!==APACHE_PACKED_TRIANGLES)throw Error('Triangles originals Apache compactat inesperats');
 return rebuildLandingGear(THREE,root);
}

// Les rodes de l'Apache simplificat es varen convertir en manyocs. En retiram
// les cares danyades de la part baixa del fuselatge i les recream com cilindres
// de perfil circular, amb cubs i tirants, tots natius de Three.js.
// Coordenades del model Araon abans d'escalar i orientar l'helicòpter.
function rebuildLandingGear(THREE,root){
 const hull=root.getObjectByName('hull'),geo=hull?.geometry;
 if(!geo?.getIndex()||!geo.getAttribute('position'))
  throw Error('No es pot reparar el tren d’aterratge de l’Apache');
 const ix=geo.getIndex(),pos=geo.getAttribute('position'),keep=[];
 let removed=0;
 for(let n=0;n<ix.count;n+=3){
  const a=ix.getX(n),b=ix.getX(n+1),c=ix.getX(n+2);
  const x=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3;
  const y=(pos.getY(a)+pos.getY(b)+pos.getY(c))/3;
  const z=(pos.getZ(a)+pos.getZ(b)+pos.getZ(c))/3;
  const rear=Math.abs(x)>.70&&Math.abs(x)<1.35&&y<1.01&&z>.55&&z<1.83;
  const nose=Math.abs(x)<.34&&y<1.08&&z>2.08&&z<4.06;
  if(rear||nose){removed++;continue}
  keep.push(a,b,c);
 }
 if(removed<10||removed>300)
  throw Error('No s’han pogut delimitar les rodes deformades: '+removed);
 geo.setIndex(keep);
 geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
 const rubber=new THREE.MeshStandardMaterial({color:0x161a19,metalness:.02,roughness:.97});
 const hubMat=new THREE.MeshStandardMaterial({color:0x5b635f,metalness:.40,roughness:.75});
 const strutMat=new THREE.MeshStandardMaterial({color:0x434b47,metalness:.32,roughness:.72});
 const tyreG=new THREE.CylinderGeometry(.34,.34,.25,20,1,false);
 const hubG=new THREE.CylinderGeometry(.125,.125,.27,12,1,false);
 function strut(parent,from,to,r=.035){
  const p=new THREE.Vector3(...from),q=new THREE.Vector3(...to),dir=q.clone().sub(p);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),9),strutMat);
  mesh.position.copy(p.add(q).multiplyScalar(.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
  parent.add(mesh);return mesh;
 }
 for(const [id,x,y,z]of[['left',-1.04,.43,1.0],['right',1.04,.43,1.0],['nose',0,.43,3.32]]){
  const holder=new THREE.Group();
  holder.name='Apache_Round_Wheel_'+id;
  holder.position.set(x,y,z);
  const tyre=new THREE.Mesh(tyreG,rubber),hub=new THREE.Mesh(hubG,hubMat);
  tyre.rotation.z=Math.PI/2;hub.rotation.z=Math.PI/2;
  tyre.name='Circular_Tyre_'+id;hub.name='Wheel_Hub_'+id;
  holder.add(tyre,hub);root.add(holder);
  if(id==='nose'){
   strut(root,[0,1.42,2.85],[0,.60,3.32],.05);
  }else{
   strut(root,[x*.6,1.40,.87],[x,.58,z],.043);
  }
 }
 root.userData.roundWheelCount=3;
 root.userData.replacedWheelFaces=removed;
 return root;
}
function placePivot(THREE,scene,name,pivotName){
 let node=scene.getObjectByName(name)||scene.getObjectByName(name+'_lambert2_0');
 if(!node){
  scene.traverse(candidate=>{
   if(!node&&candidate.isMesh&&candidate.name.toLowerCase().includes(name.toLowerCase()))node=candidate;
  });
 }
 if(!node?.parent||!node.getObjectByProperty('isMesh',true))
  throw Error('Falta la malla '+name);
 scene.updateMatrixWorld(true);
 const parent=node.parent;
 const center=new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
 const pivot=new THREE.Group();pivot.name=pivotName;
 pivot.position.copy(parent.worldToLocal(center.clone()));
 parent.add(pivot);
 pivot.attach(node);
 return pivot;
}
function pivots(root){
 const main=root.getObjectByName('Apache_Main_Rotor_Pivot');
 const tail=root.getObjectByName('Apache_Tail_Rotor_Pivot');
 if(!main?.children.length||!tail?.children.length)
  throw Error('L’Apache no conserva els dos rotors independents');
 return {main,tail};
}

// Fàbrica del model de combat íntegrament natiu. Descoda APG2 (18,9 kB
// incorporats al JS), crea BufferGeometry, refà les rodes i prepara pivots.
export async function prepareApacheAraonRuntime(THREE){
 const template=await loadAraonCompact(THREE);
 const count=triangles(template);
 if(!(count>2000&&count<2800))
  throw Error('Triangles Apache inesperats: '+count);
 if(template.userData.roundWheelCount!==3)
  throw Error('El tren d’aterratge de l’Apache no té les tres rodes circulars');
 placePivot(THREE,template,'main_rotor','Apache_Main_Rotor_Pivot');
 placePivot(THREE,template,'tail_rotor','Apache_Tail_Rotor_Pivot');
 const shell=template.clone(true);
 shell.rotation.y=Math.PI; // Araon apunta a +Z; Hunter cap a -Z.
 const originalLength=new THREE.Box3().setFromObject(shell).getSize(new THREE.Vector3()).z;
 if(!(originalLength>8&&originalLength<20))
  throw Error('Dimensions originals Apache invàlides: '+originalLength);
 shell.scale.setScalar(TARGET_LENGTH/originalLength);
 const aircraft=new THREE.Group();aircraft.add(shell);
 aircraft.updateMatrixWorld(true);
 const bounds0=new THREE.Box3().setFromObject(aircraft);
 shell.position.y+=WHEEL_CONTACT-bounds0.min.y;
 aircraft.updateMatrixWorld(true);
 const dims=new THREE.Box3().setFromObject(aircraft).getSize(new THREE.Vector3());
 if(!(dims.z>9&&dims.z<14&&dims.x>6&&dims.x<9))
  throw Error('Dimensions Apache 150% incompatibles: '+JSON.stringify(dims.toArray()));
 const rotorHeight=aircraft.worldToLocal(pivots(shell).main.getWorldPosition(new THREE.Vector3())).y;
 if(!(rotorHeight>1.4&&rotorHeight<6))
  throw Error('Altura del rotor Apache incorrecta: '+rotorHeight);
 let instances=0;
 return Object.freeze({
  name:'AH-64 Apache · Araon · Three.js +50% amb rodes circulars',
  visualVariant:'50% natiu, tren d’aterratge circular, mida 150%',
  source:APACHE_MODEL_SOURCE,license:'CC BY 4.0',triangles:count,
  dimensions:Object.freeze({width:dims.x,height:dims.y,length:dims.z}),
  skidContactHeight:WHEEL_CONTACT,rotorContactHeight:rotorHeight,
  roundWheelCount:3,
  create(){
   const root=new THREE.Group(),visual=shell.clone(true);
   root.add(visual);
   const p=pivots(visual);
   root.userData.rotor=p.main;
   root.userData.tailRotor=p.tail;
   root.userData.apacheModel='araon-50-engine-native-round-wheels-150';
   root.userData.roundWheelCount=3;
   root.name='Apache_Araon_Native_'+(++instances);
   return root;
  }
 });
}
// Històricament el banc visual tenia una altra funció per forçar l'APG2.
// Ara el model principal i el compacte són el mateix i no s'utilitza cap GLB.
export async function prepareApacheCompactNative(THREE){
 return prepareApacheAraonRuntime(THREE);
}
