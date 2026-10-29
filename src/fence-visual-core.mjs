export function createFenceVisual(THREE,{heightAt:hAt}){
const fenceMaterial=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,flatShading:true});
const fencePostTemplate=new THREE.CylinderGeometry(.12,.16,1,6).toNonIndexed();
const fenceWireTemplate=new THREE.CylinderGeometry(1,1,1,6).toNonIndexed();
const fenceUp=new THREE.Vector3(0,1,0);
return function(x1,z1,x2,z2){

  const y1=Math.max(hAt(x1,z1),0),y2=Math.max(hAt(x2,z2),0),
        dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L,
        px=-uz,pz=ux,Hw=4.9,cx=(x1+x2)/2,cz=(z1+z2)/2,parts=[];
  const posA=new THREE.Vector3(),posB=new THREE.Vector3(),
        direction=new THREE.Vector3(),center=new THREE.Vector3(),
        rotation=new THREE.Quaternion(),size=new THREE.Vector3(),
        transform=new THREE.Matrix4();
  const items=[];
  const addCylinder=(ax,ay,az,bx,by,bz,r,color,post=false)=>{
    posA.set(ax,ay,az);posB.set(bx,by,bz);
    direction.subVectors(posB,posA);const len=direction.length();
    if(len<.001)return;
    center.copy(posA).add(posB).multiplyScalar(.5);
    rotation.setFromUnitVectors(fenceUp,direction.multiplyScalar(1/len));
    size.set(post?1:r,len,post?1:r);
    transform.compose(center,rotation,size);
    items.push({geo:post?fencePostTemplate:fenceWireTemplate,matrix:transform.clone(),color:new THREE.Color(color)});
  };
  for(const [x,z,y] of [[x1,z1,y1],[x2,z2,y2]])
    addCylinder(x,y,z,x,y+Hw,z,1,0x4a4f52,true);
  for(const h of [.55,1.55,2.55,3.55,4.35])
    addCylinder(x1,y1+h,z1,x2,y2+h,z2,.028,0x30363a);
  for(const [a,b] of [[.6,2.5],[2.5,4.35],[4.35,2.5],[2.5,.6]])
    addCylinder(x1,y1+a,z1,x2,y2+b,z2,.024,0x353b3e);
  for(let n=0;n<4;n++){
    const a=(n+.12)/4,b=(n+.88)/4,
          xa=x1+dx*a,za=z1+dz*a,xb=x1+dx*b,zb=z1+dz*b,
          ya=Math.max(hAt(xa,za),0)+4.72,
          yb=Math.max(hAt(xb,zb),0)+4.72,
          side=n%2?-.22:.22;
    addCylinder(xa+px*side,ya,za+pz*side,xb-px*side,yb,zb-pz*side,.024,0x292f32);
  }
  const vertices=items.reduce((sum,item)=>sum+item.geo.attributes.position.count,0),
        positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3),
        colors=new Float32Array(vertices*3);
  const p=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
  let offset=0;
  for(const {geo,matrix,color} of items){
    const srcPos=geo.attributes.position,srcNorm=geo.attributes.normal;
    normalMatrix.getNormalMatrix(matrix);
    for(let v=0;v<srcPos.count;v++){
      const at=(offset+v)*3;
      p.fromBufferAttribute(srcPos,v).applyMatrix4(matrix);
      normal.fromBufferAttribute(srcNorm,v).applyMatrix3(normalMatrix).normalize();
      positions[at]=p.x-cx;positions[at+1]=p.y;positions[at+2]=p.z-cz;
      normals[at]=normal.x;normals[at+1]=normal.y;normals[at+2]=normal.z;
      colors[at]=color.r;colors[at+1]=color.g;colors[at+2]=color.b;
    }
    offset+=srcPos.count;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,fenceMaterial);
  mesh.name='hunter-fence-section';
  mesh.position.set(cx,0,cz);
  mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.userData.noCastShadow=true;
  mesh.userData.noReceiveShadow=true;
  return mesh;
};
}
