export const HUMAN_CHECKS=Object.freeze([['walk','Caminar'],['run','Córrer'],['turn','Girar'],['aim','Apuntar'],['vehicle','Pujar i baixar de vehicles'],['death','Morir'],['terrain','Contacte amb terreny']]);
// Exact displayed static geometry. No hidden LOD proxies, no invented rig data.
function visibleMeshes(root){
 if(!root)throw Error('La malla encara no està carregada.');
 root.updateWorldMatrix(true,true);const meshes=[];
 root.traverseVisible(n=>{if(n.isMesh&&n.geometry?.attributes.position){if(n.isSkinnedMesh||n.isInstancedMesh||n.morphTargetInfluences?.some(x=>x!==0))throw Error('OBJ estàtic no compatible amb aquesta malla deformada.');meshes.push(n)}});
 if(!meshes.length)throw Error('No hi ha malles visibles.');
 return meshes;
}
const triCount=m=>Math.floor((m.geometry.index?.count??m.geometry.attributes.position.count)/3);
export function humanSnapshot(T,root,meta){
 const meshes=visibleMeshes(root),materials=new Set(),joints=[],bounds=new T.Box3(),p=new T.Vector3();
 for(const m of meshes){
  for(const mat of Array.isArray(m.material)?m.material:[m.material])if(mat)materials.add(mat);
  const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);bounds.expandByPoint(p)}
 }
 let proposal=null,original=null;root.traverse(n=>{if(n.userData.humanOriginal)original=n.userData.humanOriginal;if(n.userData.humanProposal)proposal=n.userData.humanProposal;if(n.userData.humanRestJoint)joints.push({id:n.userData.humanRestJoint,position:n.getWorldPosition(new T.Vector3()).toArray()})});
 const source=original===meta.role&&meta.variant==='actual'?'game-factory':proposal?.role===meta.role&&proposal?.style===meta.variant?'lab-proposal':'local-import-or-unknown';
 return {...meta,source,integrated:source==='game-factory'?true:source==='lab-proposal'?false:null,proposalVersion:proposal?.version??null,meshes:meshes.length,triangles:meshes.reduce((sum,m)=>sum+triCount(m),0),size:bounds.getSize(new T.Vector3()).toArray(),materials:[...materials].map(m=>({name:m.name||null,color:m.color?.getHexString()??null})),joints,gameplayValidation:'not-performed-by-export',visualEvidence:'not-verified-by-export'};
}
export function humanOBJ(T,root,metadata={}){
 const lines=['# Hunter: Arxipelag - visible static mesh','# '+JSON.stringify(metadata)],p=new T.Vector3();let offset=1;
 for(const [i,m]of visibleMeshes(root).entries()){
  const a=m.geometry.attributes.position,index=m.geometry.index,flip=m.matrixWorld.determinant()<0;
  lines.push('o mesh_'+i+'_'+(m.name||'part').replace(/[^a-zA-Z0-9_-]/g,'_'));
  for(let j=0;j<a.count;j++){p.fromBufferAttribute(a,j).applyMatrix4(m.matrixWorld);lines.push('v '+p.toArray().map(x=>Number(x.toFixed(7))).join(' '))}
  const at=j=>offset+(index?index.getX(j):j),count=index?.count??a.count;
  for(let j=0;j+2<count;j+=3)lines.push('f '+at(j)+' '+at(j+(flip?2:1))+' '+at(j+(flip?1:2)));
  offset+=a.count;
 }
 return lines.join('\n')+'\n';
}
