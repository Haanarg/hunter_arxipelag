// Construcció visual d'edificis. Col·lisions, portes, destrucció i navegació romanen al nucli.
window.HUNTER_BUILDINGS=Object.freeze({
  create(THREE,{material,materialProfile,box}){
    const wallMaterial=color=>new THREE.MeshStandardMaterial({color,flatShading:true,transparent:true,...materialProfile('masonry')});
    const doorMaterial=()=>new THREE.MeshStandardMaterial({color:0x704829,flatShading:true,transparent:true,...materialProfile('paint')});
    const addWall=(group,{lx,lz,sx,sz,height,material:mat,y=height/2})=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,height,sz),mat);mesh.position.set(lx,y,lz);group.add(mesh);return mesh};
    const addDoor=(group,{lx,lz,sx,sz,height,wallMaterial,doorMaterial,doorHeight=3.6})=>{const h=Math.min(doorHeight,Math.max(2.8,height-.8)),door=addWall(group,{lx,lz,sx,sz,height:h,material:doorMaterial,y:h/2}),lintelHeight=Math.max(0,height-h),lintel=lintelHeight>.05?addWall(group,{lx,lz,sx,sz,height:lintelHeight,material:wallMaterial,y:h+lintelHeight/2}):null;return {door,lintel,doorHeight:h}};
    const createShell=({width,depth,height,wallColor,roofColor})=>{
      const group=new THREE.Group(),walls=wallMaterial(wallColor),doors=doorMaterial();
      const floor=new THREE.Mesh(new THREE.BoxGeometry(width+.35,12.3,depth+.35),material(0x756b5d,'masonry'));
      const roof=new THREE.Mesh(new THREE.BoxGeometry(width+1.35,1.15,depth+1.35),material(roofColor,'masonry'));
      floor.position.y=-5.85;roof.position.y=height+.62;group.add(floor,roof);
      const rimMat=material(0x3f4650,'masonry'),rimH=.34;
      const rimN=new THREE.Mesh(new THREE.BoxGeometry(width+1.5,rimH,.36),rimMat),rimS=rimN.clone(),rimE=new THREE.Mesh(new THREE.BoxGeometry(.36,rimH,depth+1.5),rimMat),rimW=rimE.clone();
      rimN.position.set(0,height+1.24,-depth/2-.48);rimS.position.set(0,height+1.24,depth/2+.48);rimE.position.set(width/2+.48,height+1.24,0);rimW.position.set(-width/2-.48,height+1.24,0);group.add(rimN,rimS,rimE,rimW);
      return {group,walls,doors,roof};
    };
    const addWindows=(group,{width,depth,height})=>{const trim=0xd0bf9c,glass=0x3e7185,shade=0x26343d;for(const side of[-1,1])for(const wx of[-width*.28,width*.28]){box(group,3.05,.28,.28,trim,wx,height*.62+1.1,side*(depth/2+.08),'masonry');box(group,2.72,1.9,.13,glass,wx,height*.62,side*(depth/2+.1),'glass');box(group,2.92,.16,.22,shade,wx,height*.62-.98,side*(depth/2+.12),'masonry')}for(const side of[-1,1])for(const wz of[-depth*.27,depth*.27]){box(group,.13,1.9,2.62,glass,side*(width/2+.1),height*.62,wz,'glass');box(group,.22,.16,2.82,shade,side*(width/2+.12),height*.62-.98,wz,'masonry')}};
    const addStep=(group,{alongAxis,riseWidth,height,base,x,y,z,color})=>{const mesh=box(group,alongAxis?riseWidth:4.2,height-base,alongAxis?4.2:riseWidth,color,x,(height+base)/2,z,'masonry');mesh.userData.stair=true;return mesh};
    const createFlag=({x,y,z,color})=>{const group=new THREE.Group(),pole=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,14,8),material(0xc9d1d6,'metal')),cloth=new THREE.Mesh(new THREE.BoxGeometry(5.2,3,.16),new THREE.MeshStandardMaterial({color,flatShading:true,...materialProfile('paint')}));pole.position.set(0,7,0);cloth.position.set(2.65,12,0);group.position.set(x,y,z);group.add(pole,cloth);return group};
    return {createShell,addWall,addDoor,addWindows,addStep,createFlag};
  }
});
