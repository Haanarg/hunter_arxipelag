// Construcció visual d'edificis. Col·lisions, portes, destrucció i navegació romanen al nucli.
window.HUNTER_BUILDINGS=Object.freeze({
  create(THREE,{material,materialProfile,box}){
    const wallMaterial=color=>new THREE.MeshStandardMaterial({color,flatShading:true,transparent:true,...materialProfile('masonry')});
    const doorMaterial=()=>new THREE.MeshStandardMaterial({color:0x6b4a2a,flatShading:true,transparent:true,...materialProfile('paint')});
    const addWall=(group,{lx,lz,sx,sz,height,material:mat,y=height/2})=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,height,sz),mat);mesh.position.set(lx,y,lz);group.add(mesh);return mesh};
    const addDoor=(group,{lx,lz,sx,sz,height,wallMaterial,doorMaterial,doorHeight=3.6})=>{const h=Math.min(doorHeight,Math.max(2.8,height-.8)),door=addWall(group,{lx,lz,sx,sz,height:h,material:doorMaterial,y:h/2}),lintelHeight=Math.max(0,height-h),lintel=lintelHeight>.05?addWall(group,{lx,lz,sx,sz,height:lintelHeight,material:wallMaterial,y:h+lintelHeight/2}):null;return {door,lintel,doorHeight:h}};
    const createShell=({width,depth,height,wallColor,roofColor})=>{
      const group=new THREE.Group(),walls=wallMaterial(wallColor),doors=doorMaterial();
      const floor=new THREE.Mesh(new THREE.BoxGeometry(width+.3,12.3,depth+.3),material(0x7a6f60,'masonry'));
      const roof=new THREE.Mesh(new THREE.BoxGeometry(width+1.2,1.2,depth+1.2),material(roofColor,'masonry'));
      floor.position.y=-5.85;roof.position.y=height+.62;group.add(floor,roof);
      return {group,walls,doors,roof};
    };
    const addWindows=(group,{width,depth,height})=>{const trim=0xc1b18f,glass=0x486e7a;for(const side of[-1,1])for(const wx of[-width*.28,width*.28]){box(group,2.8,.22,.22,trim,wx,height*.62+1.1,side*(depth/2+.08),'masonry');box(group,2.6,1.8,.12,glass,wx,height*.62,side*(depth/2+.1),'glass')}for(const side of[-1,1])for(const wz of[-depth*.27,depth*.27])box(group,.12,1.8,2.5,glass,side*(width/2+.1),height*.62,wz,'glass')};
    const addStep=(group,{alongAxis,riseWidth,height,base,x,y,z,color})=>{const mesh=box(group,alongAxis?riseWidth:4.2,height-base,alongAxis?4.2:riseWidth,color,x,(height+base)/2,z,'masonry');mesh.userData.stair=true;return mesh};
    const createFlag=({x,y,z,color})=>{const group=new THREE.Group(),pole=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,14),material(0xdddddd,'metal')),cloth=new THREE.Mesh(new THREE.BoxGeometry(5,3,.2),new THREE.MeshBasicMaterial({color}));pole.position.set(0,7,0);cloth.position.set(2.6,12,0);group.position.set(x,y,z);group.add(pole,cloth);return group};
    return {createShell,addWall,addDoor,addWindows,addStep,createFlag};
  }
});
