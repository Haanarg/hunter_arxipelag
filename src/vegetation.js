// Construcció visual de vegetació instanciada. Col·lisions i destrucció continuen al nucli.
window.HUNTER_VEGETATION=Object.freeze({
  create(THREE,{materialProfile,random}){
    const dum=new THREE.Object3D();
    const palmCrown=(radius,rise,segments=7)=>{const pos=[];for(let j=0;j<segments;j++){const a=j*Math.PI*2/segments;for(let k=0;k<4;k++){const t=k/4,u=(k+1)/4,point=(v,side)=>{const len=radius*v,w=Math.sin(v*Math.PI)*.68*side;return[Math.cos(a)*len-Math.sin(a)*w,6.35+rise+Math.sin(v*Math.PI)*1.05-v*v*1.75,Math.sin(a)*len+Math.cos(a)*w]},p0=point(t,-1),p1=point(t,1),p2=point(u,-1),p3=point(u,1);pos.push(...p0,...p1,...p2,...p1,...p3,...p2)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g};
    const geometry={
      trunk:new THREE.CylinderGeometry(.22,.42,6.2,6).translate(0,3.1,0),
      crown:palmCrown(4.7,0,8),
      crown2:palmCrown(3.1,.65,7),
      bush:new THREE.IcosahedronGeometry(1.15,1).translate(0,.62,0),
      rock:new THREE.DodecahedronGeometry(1.25,0).translate(0,.5,0)
    };
    const inst=(geo,arr,color,scale,opts={})=>{if(!arr.length)return null;const m=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,flatShading:true,side:opts.doubleSide?THREE.DoubleSide:THREE.FrontSide,...materialProfile(opts.profile||'organic')}),arr.length);arr.forEach(([x,y,z,s,r],i)=>{dum.position.set(x,y,z);dum.rotation.set(opts.tilt?random(-.04,.04):0,r,opts.tilt?random(-.04,.04):0);if(scale)scale(dum,s);else dum.scale.setScalar(s);dum.updateMatrix();m.setMatrixAt(i,dum.matrix);m.setColorAt(i,new THREE.Color(color).offsetHSL(random(-.025,.025),random(-.08,.08),random(-.055,.055)))});world.add(m);return m};
    const build=({world,palms,bushes,rocks})=>({
      palms:{
        trunk:inst(geometry.trunk,palms,0x8e6337,null,{profile:'organic',tilt:true}),
        crown:inst(geometry.crown,palms,0x2d9f36,null,{doubleSide:true}),
        crown2:inst(geometry.crown2,palms,0x65c83f,null,{doubleSide:true})
      },
      bushes:inst(geometry.bush,bushes,0x2f8e42,(d,s)=>d.scale.set(s*1.15,s*.72,s),{profile:'organic'}),
      rocks:inst(geometry.rock,rocks,0x777985,(d,s)=>d.scale.set(s*1.25,s*.75,s),{profile:'masonry',tilt:true})
    });
    return {geometry,build};
  }
});
