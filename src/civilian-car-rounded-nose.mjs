// C1A definitiu: geometria del morro aprovada el 2026-11-15.
const W=2.92,L=5.75,hw=W/2,frontZ=-L/2,rearZ=L/2,belt=1.75,
 hoodEnd=-1.425,wheelY=.72,archR=.83,wheelFront=-L*.33,wheelRear=L*.33;
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
// Corba simètrica en planta i alçat, sense moure cabina ni eixos.
function nose(x,y,z){
 const t=smooth((frontZ+.58-z)/.58),long=smooth((hoodEnd-z)/(hoodEnd-frontZ));
 const e=Math.min(1,Math.abs(x)/hw),outer=e**4,upper=clamp((y-1.30)/.45);
 return [x*(1-.065*t*e*e),y-upper*(.095*t+.065*long*outer),z+.12*t*outer];
}
export function applyCivilianRoundedNose(THREE,car){
 car.name='hunter-civil-family-iteration-C1A';
 const children=car.children.slice();
 const find=(predicate,label)=>{
  const all=children.filter(predicate);
  if(all.length!==1)throw Error('C1A: peça '+label+' no identificada');
  return all[0];
 };
 const close=(a,b)=>Math.abs(a-b)<1e-6;
 const boxAt=(x,y,z)=>o=>o.isMesh&&o.geometry.type==='BoxGeometry'&&
  close(o.position.x,x)&&close(o.position.y,y)&&close(o.position.z,z);
 function reshape(mesh,geometry,label){
  const old=mesh.geometry;
  // ObjectLoader ha de recuperar els vèrtexs editats, no regenerar la caixa original.
  if(geometry.type!=='BufferGeometry'){
   const source=geometry;geometry=new THREE.BufferGeometry().copy(source);source.dispose();
  }
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   const a=nose(p.getX(i)+mesh.position.x,p.getY(i)+mesh.position.y,p.getZ(i)+mesh.position.z);
   p.setXYZ(i,a[0]-mesh.position.x,a[1]-mesh.position.y,a[2]-mesh.position.z);
  }
  p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  mesh.geometry=geometry;mesh.name=label;old.dispose();
 }
 function segmented(mesh,label){
  const {width,height,depth}=mesh.geometry.parameters;
  reshape(mesh,new THREE.BoxGeometry(width,height,depth,8,2,2),label);
 }
 // Xapa tancada, corona transversal i pendent. La vora inferior
 // encavalca el panell frontal per mantenir la junta.
 const hood=find(boxAt(0,belt-.01,(frontZ+hoodEnd)/2),'capó');
 reshape(hood,new THREE.BoxGeometry(W-.08,.16,hoodEnd-frontZ,12,2,16),'civil-rounded-hood');
 const front=find(boxAt(0,1.34,frontZ+.045),'xapa frontal');
 reshape(front,new THREE.BoxGeometry(W-.12,.70,.13,12,6,2),'civil-rounded-front-panel');
 // Laterals tancats: estacions addicionals al morro, arcs reals de roda.
 for(const side of [-1,1]){
  const mesh=find(o=>o.name==='lateral-retallat-'+side,'lateral '+side);
  const zs=[frontZ,frontZ+.08,frontZ+.14,frontZ+.24,frontZ+.36,frontZ+.48,frontZ+.58,frontZ+.75,hoodEnd,rearZ];
  for(const center of [wheelFront,wheelRear])for(let i=0;i<=24;i++)
   zs.push(center+archR*Math.cos(Math.PI-i*Math.PI/24));
  zs.sort((a,b)=>a-b);
  const stations=zs.filter((z,i)=>i===0||z-zs[i-1]>1e-7);
  const low=z=>wheelY+Math.max(0,...[wheelFront,wheelRear].map(c=>Math.sqrt(Math.max(0,archR**2-(z-c)**2))));
  const rows=stations.map(z=>[
   [side*hw,low(z),z],[side*hw,belt,z],
   [side*(hw-.075),belt,z],[side*(hw-.075),low(z),z]
  ]);
  const positions=[];
  const quad=(a,b,c,d,reverse=false)=>{
   const vs=reverse?[a,c,b,a,d,c]:[a,b,c,a,c,d];
   positions.push(...vs.flat());
  };
  for(let i=0;i<rows.length-1;i++)for(let k=0;k<4;k++){
   const n=(k+1)%4;quad(rows[i][k],rows[i+1][k],rows[i+1][n],rows[i][n],side===1);
  }
  quad(...rows[0],side===1);quad(...rows.at(-1),side===-1);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  mesh.position.set(0,0,0);
  reshape(mesh,geo,'civil-rounded-side-'+side);
 }
 // La graella, els fars i el para-xocs segueixen la mateixa deformació.
 for(const mesh of children){
  if(!mesh.isMesh||mesh.geometry.type!=='BoxGeometry'||mesh.position.z>=frontZ-.02)continue;
  const label=mesh.name==='paraxocs-separat-davant'?'civil-rounded-bumper':'civil-rounded-front-trim';
  segmented(mesh,label);
 }
 car.userData.roundedNose=true;
 return car;
}
