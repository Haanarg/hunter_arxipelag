// Construcció visual del terreny. La funció d'altura continua pertanyent a la simulació.
window.HUNTER_TERRAIN=Object.freeze({
  palette:Object.freeze([[-75,0x04143c],[-18,0x075d8a],[-6,0x0d91b0],[-1.5,0xeac45e],[.5,0xffd975],[3.5,0xe9b54a],[5,0x66ef1f],[14,0x34c83b],[22,0x149f34],[30,0x6f6c79],[40,0xececf2]]),
  colorAt(THREE,h){
    const palette=this.palette;let i=0;while(i<palette.length-2&&h>palette[i+1][0])i++;
    const a=palette[i],b=palette[i+1];return new THREE.Color(a[1]).lerp(new THREE.Color(b[1]),Math.min(1,Math.max(0,(h-a[0])/(b[0]-a[0]))));
  },
  create(THREE,{size,segments,heightAt,material}){
    const colorAt=h=>this.colorAt(THREE,h);
    const geometry=new THREE.PlaneGeometry(size,size,segments,segments);geometry.rotateX(-Math.PI/2);
    const p=geometry.attributes.position,colors=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){const h=heightAt(p.getX(i),p.getZ(i));p.setY(i,h);const c=colorAt(h);colors.set([c.r,c.g,c.b],i*3)}
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);
    return {mesh,geometry,colorAt};
  },
  createBorder(THREE,{size,halfSize}){
    const group=new THREE.Group();
    const solid=new THREE.MeshBasicMaterial({color:0xffffff,fog:false});
    const wall=new THREE.MeshBasicMaterial({color:0xcbe7ff,transparent:true,opacity:.16,side:THREE.DoubleSide,fog:false,depthWrite:false});
    [[0,-halfSize,0],[0,halfSize,0],[-halfSize,0,1],[halfSize,0,1]].forEach(([x,z,r])=>{
      const bar=new THREE.Mesh(new THREE.BoxGeometry(size,1.2,2.5),solid),plane=new THREE.Mesh(new THREE.PlaneGeometry(size,72),wall);
      bar.position.set(x,1.5,z);plane.position.set(x,36,z);if(r)bar.rotation.y=plane.rotation.y=Math.PI/2;group.add(bar,plane);
    });
    return group;
  }
});
