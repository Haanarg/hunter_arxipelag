// LOD visual dels enemics. La física i l'IA sempre conserven el model original.
(()=>{
const fullCache=new Map(),proxyCache=new Map(),proxyMaterials=new Map();
const material=T=>new T.MeshLambertMaterial({color:0xffffff,vertexColors:true,flatShading:true,side:T.DoubleSide});
function bake(T,parts,cacheKey){
  if(cacheKey&&fullCache.has(cacheKey))return fullCache.get(cacheKey);
  const geos=[];let count=0;
  for(const {geometry,material:mat,matrix} of parts){
    if(!geometry?.attributes?.position||!mat?.color)continue;
    const g=geometry.index?geometry.toNonIndexed():geometry.clone();
    g.applyMatrix4(matrix);
    if(!g.attributes.normal)g.computeVertexNormals();
    geos.push({g,color:mat.color});count+=g.attributes.position.count;
  }
  if(!count)return null;
  const p=new Float32Array(count*3),n=new Float32Array(count*3),c=new Float32Array(count*3);
  let start=0;
  for(const {g,color} of geos){
    const pos=g.attributes.position,norm=g.attributes.normal,local=g.attributes.color;
    for(let i=0;i<pos.count;i++){
      const k=(start+i)*3;
      p[k]=pos.getX(i);p[k+1]=pos.getY(i);p[k+2]=pos.getZ(i);
      n[k]=norm.getX(i);n[k+1]=norm.getY(i);n[k+2]=norm.getZ(i);
      c[k]=color.r*(local?local.getX(i):1);
      c[k+1]=color.g*(local?local.getY(i):1);
      c[k+2]=color.b*(local?local.getZ(i):1);
    }
    start+=pos.count;g.dispose();
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.BufferAttribute(p,3));
  g.setAttribute('normal',new T.BufferAttribute(n,3));
  g.setAttribute('color',new T.BufferAttribute(c,3));
  g.computeBoundingSphere();
  if(cacheKey)fullCache.set(cacheKey,g);
  return g;
}
function mergeRig(T,model,type){
  const groups=[];model.traverse(o=>{if(o.isGroup)groups.push(o)});
  const sharedMaterial=material(T);
  let before=0,after=0,batchIndex=0;
  for(const pivot of groups){
    const meshes=pivot.children.filter(o=>o.isMesh&&!o.isSkinnedMesh&&o.material?.color&&
      !Array.isArray(o.material)&&!o.material.map);
    before+=meshes.length;
    if(meshes.length<2){after+=meshes.length;continue}
    const data=meshes.map(m=>{m.updateMatrix();return {geometry:m.geometry,material:m.material,matrix:m.matrix}});
    const geo=bake(T,data,type+':pivot:'+batchIndex++);
    if(!geo){after+=meshes.length;continue}
    const merged=new T.Mesh(geo,sharedMaterial);
    merged.name='hunter-enemy-articulated-batch';merged.userData.enemyBatched=true;
    merged.castShadow=merged.receiveShadow=true;
    for(const mesh of meshes)pivot.remove(mesh);
    pivot.add(merged);after++;
    for(const geo of new Set(meshes.map(m=>m.geometry)))geo.dispose();
  }
  return {before,after};
}
function proxy(T,type,level){
  const key=type+':'+level;
  if(proxyCache.has(key))return proxyCache.get(key);
  const parts=[],mid=level==='mid';
  const box=(x,y,z,w,h,d,color)=>parts.push({
    geometry:new T.BoxGeometry(w,h,d),
    material:{color:new T.Color(color)},
    matrix:new T.Matrix4().makeTranslation(x,y,z)
  });
  if(type==='soldat'||type==='general'){
    const officer=type==='general',body=officer?0x681d30:0x546b48,
      trim=officer?0x812735:0x667b50,skin=officer?0xc99370:0xd6ad86;
    box(0,2.28,0,1,1.17,.65,body);
    box(0,3.18,0,.62,.62,.62,skin);
    box(0,3.52,0,.73,.18,.7,officer?0x7e2030:0x526349);
    for(const side of [-1,1]){
      box(side*.3,.88,0,.31,1.7,.39,trim);
      if(mid)box(side*.65,2.33,-.02,.27,1.12,.3,body);
    }
    if(mid){
      box(0,2.3,.43,.61,.85,.2,0x2b3530);
      box(.51,2.36,-.53,.12,.15,1.05,0x2a3030);
      if(officer)box(0,2.88,-.37,.67,.13,.09,0xd8b557);
    }
  }else if(type==='torre'){
    const metal=0x4c5358;
    for(const x of [-2.3,2.3])for(const z of (mid?[-1.9,1.9]:[0]))
      box(x,3.98,z,.44,7.95,.44,metal);
    box(0,8.04,0,6.4,.44,5.5,metal);
    for(const x of [-3.02,3.02])box(x,8.7,0,.18,.85,5.1,0x812f35);
    box(0,8.7,2.5,6,.85,.18,0x812f35);
    box(0,12.32,0,6.95,.32,6.05,0x373c40);
  }else if(type==='patrulla_marina'){
    box(0,.54,0,3.2,1.03,8.9,0x626e71);
    box(0,1.38,.85,2.45,.52,2.8,0x556166);
    box(0,1.71,-.65,2.25,.58,.12,0x313e48);
    if(mid)for(const x of[-.65,.65]){
      box(x,2.05,1.22,.52,1.3,.52,0x586549);
      box(x,2.85,1.22,.44,.46,.44,0xc18b64);
      box(x,2.08,-.65,.44,.35,1.4,0x363c39);
    }
  }else{
    const heavy=type==='tanc'||type==='tanqueta',
      humvee=type==='jeep',
      // Enemy jeep maps to the exact same cotxe D3.1 at 175% as the player.
      // Distant proxy must preserve its ~4.6 × 8.2 metre footprint.
      w=type==='tanc'?5.8:type==='tanqueta'?4.2:humvee?4.65:3.1,
      l=type==='tanc'?7:type==='tanqueta'?5.2:humvee?8.18:5.2;
    if(humvee){
      box(0,1.10,0,w,1.6,l,0x687658);
      box(0,2.55,.35,w*.80,1.15,l*.43,0x56654e);
      if(mid){
        for(const x of [-w*.46,w*.46])for(const z of [-l*.32,l*.32])
          box(x,.88,z,.57,1.55,.70,0x232c28);
        box(0,1.30,-l*.485,w*.36,.35,.12,0x343d38);
      }
    }else{
      box(0,.88,0,w,1.25,l,heavy?0x626a48:0x656f59);
      box(0,1.84,0,w*.73,heavy?.9:1.3,l*.46,heavy?0x536047:0x3e4d46);
      if(mid){
        for(const x of [-w*.47,w*.47]){
          if(heavy)box(x,.59,0,.48,1.03,l*.9,0x242e2a);
          else for(const z of [-l*.31,l*.31])box(x,.53,z,.42,.98,.66,0x232a28);
        }
        if(heavy)box(0,2.17,-l*.38,.2,.2,l*.8,0x3e4540);
      }
    }
  }
  const geo=bake(T,parts);
  for(const p of parts)p.geometry.dispose();
  proxyCache.set(key,geo);
  return geo;
}
// Distintiu visible a qualsevol distància: la bandera queda fora del grup
// que es substitueix pel LOD. El jeep i la tanqueta NO porten cap barra vermella.
function attachEnemyFlag(T,model,type){
  if(type!=='jeep'&&type!=='tanqueta')return;
  const root=new T.Group(),jeep=type==='jeep',
    x=jeep?-1.14:-1.05,z=jeep?1.42:1.04,
    base=jeep?2.50:1.83,height=jeep?1.67:1.73;
  root.name='hunter-enemy-red-flag';
  root.position.set(x,0,z);
  // El morro de tots dos vehicles apunta cap a -Z. El drap s'estén
  // cap a +X dins el seu model local: girar el suport -90° el fa
  // projectar-se cap a +Z (la part POSTERIOR), mai cap al lateral.
  root.rotation.y=-Math.PI/2;
  const metal=new T.MeshStandardMaterial({color:0x11191b,metalness:.58,roughness:.49}),
        clothMaterial=new T.MeshStandardMaterial({
          color:0xc82a27,roughness:.92,metalness:0,side:T.DoubleSide
        });
  const pole=new T.Mesh(new T.CylinderGeometry(.027,.033,height,8),metal);
  pole.name='hunter-enemy-flag-mast';pole.position.y=base+height*.5;
  const arm=new T.Mesh(new T.CylinderGeometry(.018,.018,.78,7),metal);
  arm.name='hunter-enemy-flag-arm';
  arm.position.set(.39,base+height-.055,0);arm.rotation.z=Math.PI/2;
  // Tela penjada, arrugada i amb la vora inferior inclinada.
  // La barra horitzontal és NEGRA i prima: el vermell només és la roba.
  const points=[],indices=[],segments=4;
  for(let row=0;row<3;row++)for(let col=0;col<=segments;col++){
    const a=col/segments,b=row/2;
    points.push(.055+.71*a,base+height-.10-b*(.70+.11*a),
      Math.sin(a*Math.PI*1.5+b*1.1)*.075);
  }
  for(let row=0;row<2;row++)for(let col=0;col<segments;col++){
    const a=row*(segments+1)+col,b=a+1,c=a+segments+1,d=c+1;
    indices.push(a,c,b,b,c,d);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const cloth=new T.Mesh(geometry,clothMaterial);
  cloth.name='hunter-enemy-hanging-red-flag';
  for(const item of [pole,arm,cloth]){
    item.castShadow=false;item.receiveShadow=false;
    item.userData.noCastShadow=true;root.add(item);
  }
  model.add(root);
  model.userData.enemyFlag=root;
}
function optimize(T,model,type){
  // La metralladora i les plaques del soldat d'elit no poden compartir
  // la geometria fusionada en memòria amb els soldats normals.
  const reduction=(type==='soldat'||type==='general')?mergeRig(T,model,type+(model.userData.eliteSoldier?'-elite':'')):null;
  const full=new T.Group();full.name='hunter-enemy-full';
  for(const child of [...model.children])full.add(child);
  model.add(full);
  let mat=proxyMaterials.get(type);
  if(!mat){mat=material(T);proxyMaterials.set(type,mat)}
  const mid=new T.Mesh(proxy(T,type,'mid'),mat),far=new T.Mesh(proxy(T,type,'far'),mat);
  mid.name='hunter-enemy-mid';far.name='hunter-enemy-far';
  if(type==='soldat'&&model.userData.eliteSoldier){
    const armor=new T.MeshLambertMaterial({color:0x303a34}),mark=new T.MeshLambertMaterial({color:0xb83f38});
    for(const lod of [mid,far]){
      const plate=new T.Mesh(new T.BoxGeometry(1.18,.78,.21),armor);
      plate.position.set(0,2.45,-.4);lod.add(plate);
      const stripe=new T.Mesh(new T.BoxGeometry(.58,.13,.04),mark);
      stripe.position.set(0,2.75,-.53);lod.add(stripe);
      const gun=new T.Mesh(new T.BoxGeometry(.16,.17,1.65),armor);
      gun.position.set(.4,2.25,-.85);lod.add(gun);
    }
  }
  mid.userData.noCastShadow=true;far.userData.noCastShadow=true;
  mid.castShadow=far.castShadow=mid.receiveShadow=far.receiveShadow=false;
  mid.visible=far.visible=false;
  model.add(mid,far);
  attachEnemyFlag(T,model,type);
  model.userData.enemyFullRoot=full;
  model.userData.enemyMidMesh=mid;
  model.userData.enemyFarMesh=far;
  model.userData.enemyLOD='full';
  model.userData.enemyLODCounts=reduction;
  return model;
}
function setLevel(model,level){
  const u=model?.userData;
  if(!u?.enemyFullRoot||u.enemyLOD===level)return false;
  u.enemyLOD=level;
  u.enemyFullRoot.visible=level==='full';
  u.enemyMidMesh.visible=level==='mid';
  u.enemyFarMesh.visible=level==='far';
  return true;
}
window.HUNTER_ENEMY_LOD=Object.freeze({
  optimize,setLevel,
  reset(){fullCache.clear();proxyCache.clear();},
  stats(){return {fullGroups:fullCache.size,proxyGeometries:proxyCache.size}}
});
})();
