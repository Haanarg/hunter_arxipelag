// Construcció visual del terreny. La funció d'altura continua pertanyent a la simulació.
const HUNTER_TERRAIN_PALETTE=Object.freeze([[-75,0x061745],[-12,0x087fa2],[-1.5,0xf4cb64],[.5,0xffda83],[3.5,0xefbb51],[5,0x59ec16],[22,0x16b52f],[30,0x807d9d],[40,0xf4f4fb]]);
window.HUNTER_TERRAIN=Object.freeze({
  palette:HUNTER_TERRAIN_PALETTE,
  colorAt(THREE,h){
    const palette=HUNTER_TERRAIN_PALETTE;let i=0;while(i<palette.length-2&&h>palette[i+1][0])i++;
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
    const wall=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.12,side:THREE.DoubleSide,fog:false,depthWrite:false});
    [[0,-halfSize,0],[0,halfSize,0],[-halfSize,0,1],[halfSize,0,1]].forEach(([x,z,r])=>{
      const bar=new THREE.Mesh(new THREE.BoxGeometry(size,1.2,2.5),solid),plane=new THREE.Mesh(new THREE.PlaneGeometry(size,60),wall);
      bar.position.set(x,1.5,z);plane.position.set(x,30,z);if(r)bar.rotation.y=plane.rotation.y=Math.PI/2;group.add(bar,plane);
    });
    return group;
  }
});
