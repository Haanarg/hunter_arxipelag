// Construcció visual de fauna. Moviment, dany i spawning continuen al nucli.
window.HUNTER_FAUNA = Object.freeze({
  createGull(THREE,{box,material,palette=window.HUNTER_PALETTE}){
    const p=palette.fauna,g=new THREE.Group();
    box(g,.62,.32,1.25,p.gull,0,0,0);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.28,7,5),material(p.gull));
    head.position.set(0,.13,-.63);g.add(head);
    const beak=new THREE.Mesh(new THREE.ConeGeometry(.11,.42,4),material(p.beak));
    beak.rotation.x=-Math.PI/2;beak.position.set(0,.08,-.9);g.add(beak);
    const wl=new THREE.Group(),wr=new THREE.Group();wl.position.set(-.28,.06,0);wr.position.set(.28,.06,0);g.add(wl,wr);
    box(wl,1.75,.08,.5,p.gull,-.85,0,0);box(wl,.72,.07,.42,p.gullShade,-1.72,0,.03);
    box(wr,1.75,.08,.5,p.gull,.85,0,0);box(wr,.72,.07,.42,p.gullShade,1.72,0,.03);
    return {o:g,wl,wr};
  },
  createShark(THREE,{material,palette=window.HUNTER_PALETTE}){
    const p=palette.fauna,g=new THREE.Group();
    // Només l'aleta dorsal és visible: un prisma triangular baix que emergeix de les ones.
    const geom=new THREE.BufferGeometry();
    const v=new Float32Array([
      -.09,0,-.72,  .09,0,-.72,  -.09,0,.72,  .09,0,.72,
      -.09,1.12,.08, .09,1.12,.08
    ]);
    const idx=[0,2,4, 1,5,3, 0,4,5, 0,5,1, 2,3,5, 2,5,4, 0,1,3, 0,3,2];
    geom.setAttribute('position',new THREE.BufferAttribute(v,3));geom.setIndex(idx);geom.computeVertexNormals();
    const fin=new THREE.Mesh(geom,material(p.shark));fin.castShadow=true;fin.receiveShadow=true;g.add(fin);
    g.userData.finOnly=true;
    return g;
  }
});
