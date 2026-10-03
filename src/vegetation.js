// Construcció visual de vegetació instanciada. Col·lisions i destrucció continuen al nucli.
window.HUNTER_VEGETATION=Object.freeze({
  create(THREE,{world,materialProfile,random}){
    const dum=new THREE.Object3D();
    const palmCrown=(radius,rise)=>{const pos=[];for(let j=0;j<7;j++){const a=j*Math.PI*2/7;for(let k=0;k<4;k++){const t=k/4,u=(k+1)/4,point=(v,side)=>{const len=radius*v,w=Math.sin(v*Math.PI)*.62*side;return[Math.cos(a)*len-Math.sin(a)*w,6.35+rise+Math.sin(v*Math.PI)*.9-v*v*1.6,Math.sin(a)*len+Math.cos(a)*w]},p0=point(t,-1),p1=point(t,1),p2=point(u,-1),p3=point(u,1);pos.push(...p0,...p1,...p2,...p1,...p3,...p2)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g};
    const geometry={trunk:new THREE.CylinderGeometry(.25,.35,6,5).translate(0,3,0),crown:palmCrown(4.3,0),crown2:palmCrown(2.7,.6)};
    const inst=(geo,arr,color,scale)=>{if(!arr.length)return null;const m=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,flatShading:true,side:THREE.DoubleSide,...materialProfile('organic')}),arr.length);arr.forEach(([x,y,z,s,r],i)=>{dum.position.set(x,y,z);dum.rotation.set(0,r,0);if(scale)scale(dum,s);else dum.scale.setScalar(s);dum.updateMatrix();m.setMatrixAt(i,dum.matrix);m.setColorAt(i,new THREE.Color(color).offsetHSL(random(-.03,.03),random(-.1,.1),random(-.06,.06)))});world.add(m);return m};
    const build=({palms,bushes,rocks})=>({
      palms:{trunk:inst(geometry.trunk,palms,0x8a6a3a),crown:inst(geometry.crown,palms,0x4fa03a),crown2:inst(geometry.crown2,palms,0x6fbf3a)},
      bushes:inst(new THREE.IcosahedronGeometry(1.1,0).translate(0,.6,0),bushes,0x2f7a3a,(d,s)=>d.scale.set(s,s*.75,s)),
      rocks:inst(new THREE.DodecahedronGeometry(1.2,0).translate(0,.5,0),rocks,0x8b8494,(d,s)=>d.scale.set(s*1.2,s*.8,s))
    });
    return {geometry,build};
  }
});
