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
    const body=new THREE.Mesh(new THREE.ConeGeometry(.7,2.8,5),material(p.shark));
    body.rotation.x=Math.PI/2;g.add(body);
    const fin=new THREE.Mesh(new THREE.ConeGeometry(.34,.9,3),material(p.shark));
    fin.position.set(0,.52,.15);fin.rotation.z=Math.PI;g.add(fin);
    const tail=new THREE.Mesh(new THREE.ConeGeometry(.48,.9,3),material(p.shark));
    tail.position.z=1.55;tail.rotation.x=Math.PI/2;tail.scale.x=.45;g.add(tail);
    return g;
  }
});
