// Terreny visible per sectors: mateixa funció d'altura que la simulació,
// però malles amb LOD i construcció repartida entre fotogrames.
const HUNTER_TERRAIN_PALETTE=Object.freeze([
  [-75,0x04143c],[-18,0x075d8a],[-6,0x0d91b0],[-1.5,0xeac45e],
  [.5,0xffd975],[3.5,0xe9b54a],[5,0x66ef1f],[14,0x34c83b],
  [22,0x149f34],[30,0x138d31],[40,0x0f7b2b]
]);
function hunterTerrainBandAt(h){
  const p=HUNTER_TERRAIN_PALETTE;
  let i=0;
  while(i<p.length-2&&h>p[i+1][0])i++;
  return i;
}
window.HUNTER_TERRAIN=Object.freeze({
  palette:HUNTER_TERRAIN_PALETTE,
  colorAt(THREE,h){
    // Aquesta funció també es passa deslligada al minimapa.
    // No ha de dependre del valor de "this".
    const p=HUNTER_TERRAIN_PALETTE,i=hunterTerrainBandAt(h);
    if(i>=p.length-1)return new THREE.Color(p[p.length-1][1]);
    const a=p[i],b=p[i+1],t=Math.max(0,Math.min(1,(h-a[0])/(b[0]-a[0])));
    return new THREE.Color(a[1]).lerp(new THREE.Color(b[1]),t);
  },
  bandAt(h){return hunterTerrainBandAt(h)},
  create(THREE,{size,segments,heightAt,material,startX=0,startZ=0,lowQuality=false}){
    const root=new THREE.Group();
    root.name='hunter-terrain-stream';
    const tileSize=800,side=Math.ceil(size/tileSize),cellSize=size/side,half=size/2;
    // El quart nivell és per a l'horitzó. Els sectors propers mantenen
    // exactament la resolució anterior, sense canviar la física del terreny.
    const levels=lowQuality?[6,10,20,40]:[6,12,28,56];
    const palette=HUNTER_TERRAIN_PALETTE.map(([h,c])=>{
      const rgb=new THREE.Color(c);return {h,r:rgb.r,g:rgb.g,b:rgb.b};
    });
    const tiles=[];
    let disposed=false,job=null,lastPlayerX=startX,lastPlayerZ=startZ,
        settled=false,lastSettledX=Infinity,lastSettledZ=Infinity;
    const stats={initialTiles:0,visibleTiles:0,generatedTiles:0,upgradedTiles:0,processedVertices:0,totalTiles:side*side,
      lodLevels:[...levels],farTiles:0,viewPriority:false,settledSkips:0,scans:0};
    // The material is shared by all tiles. A single shader compilation is needed.
    function colorAtHeight(h,out,k){
      let i=0;
      while(i<palette.length-2&&h>palette[i+1].h)i++;
      const a=palette[i],b=palette[i+1],
            t=Math.max(0,Math.min(1,(h-a.h)/(b.h-a.h)));
      out[k]=a.r+(b.r-a.r)*t;
      out[k+1]=a.g+(b.g-a.g)*t;
      out[k+2]=a.b+(b.b-a.b)*t;
    }
    for(let z=0;z<side;z++)for(let x=0;x<side;x++){
      const cx=-half+(x+.5)*cellSize,cz=-half+(z+.5)*cellSize;
      tiles.push({x,z,cx,cz,geometry:null,mesh:null,level:-1});
    }
    function distance2(tile,x,z){
      const dx=Math.max(0,Math.abs(tile.cx-x)-cellSize/2),
            dz=Math.max(0,Math.abs(tile.cz-z)-cellSize/2);
      return dx*dx+dz*dz;
    }
    function targetLevel(tile,x,z){
      const d=distance2(tile,x,z);
      return d<500*500?3:d<1250*1250?2:d<1700*1700?1:0;
    }
    function appendSkirts(geometry,n){
      // Faldons al límit entre sectors de diferent LOD: amaguen petites
      // escletxes sense canviar les altures emprades per les col·lisions.
      const original=geometry.attributes.position,
            colors=geometry.attributes.color,
            base=original.count,edges=[],row=n+1;
      for(let i=0;i<=n;i++)edges.push(i);
      for(let i=0;i<=n;i++)edges.push(i*row+n);
      for(let i=n;i>=0;i--)edges.push(n*row+i);
      for(let i=n;i>=0;i--)edges.push(i*row);
      const skirtCount=edges.length*2,
            pos=new Float32Array((base+skirtCount)*3),
            col=new Float32Array((base+skirtCount)*3),
            oldIx=geometry.index.array,
            indices=new Uint16Array(oldIx.length+edges.length*6);
      pos.set(original.array);col.set(colors.array);indices.set(oldIx);
      let at=oldIx.length;
      for(let i=0;i<edges.length;i++){
        const src=edges[i],a=base+2*i,b=a+1,k=src*3;
        pos.set([pos[k],pos[k+1],pos[k+2]],a*3);
        pos.set([pos[k],pos[k+1]-18,pos[k+2]],b*3);
        col.set([col[k],col[k+1],col[k+2]],a*3);
        col.set([col[k],col[k+1],col[k+2]],b*3);
        if(i%row===row-1)continue;
        const c=a+2,d=b+2;
        indices[at++]=a;indices[at++]=b;indices[at++]=c;
        indices[at++]=c;indices[at++]=b;indices[at++]=d;
      }
      geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));
      geometry.setAttribute('color',new THREE.BufferAttribute(col,3));
      geometry.setIndex(new THREE.BufferAttribute(indices.slice(0,at),1));
      geometry.computeVertexNormals();
    }
    function begin(tile,level){
      const n=levels[level],geometry=new THREE.PlaneGeometry(cellSize,cellSize,n,n);
      geometry.rotateX(-Math.PI/2);
      const p=geometry.attributes.position,colors=new Float32Array(p.count*3);
      return {tile,level,geometry,p,colors,next:0};
    }
    function process(task,limit){
      const {p,colors,tile}=task;
      const end=Math.min(p.count,task.next+limit);
      for(let i=task.next;i<end;i++){
        const h=heightAt(tile.cx+p.getX(i),tile.cz+p.getZ(i));
        p.setY(i,h);colorAtHeight(h,colors,i*3);
      }
      stats.processedVertices+=end-task.next;task.next=end;
      return end===p.count;
    }
    function finish(task){
      const {tile,geometry,colors,level}=task;
      geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
      appendSkirts(geometry,levels[level]);
      const mesh=new THREE.Mesh(geometry,material);
      mesh.name='hunter-terrain-tile';
      mesh.position.set(tile.cx,0,tile.cz);
      mesh.userData.terrainTile=true;
      mesh.receiveShadow=true;mesh.castShadow=false;
      mesh.frustumCulled=true;
      if(tile.mesh){
        root.remove(tile.mesh);
        tile.geometry.dispose();
        stats.upgradedTiles++;
      }else{
        stats.generatedTiles++;
        stats.visibleTiles++;
      }
      if(tile.level===0)stats.farTiles--;
      tile.mesh=mesh;tile.geometry=geometry;tile.level=level;
      if(level===0)stats.farTiles++;
      root.add(mesh);
    }
    function generateNow(tile,level){
      const task=begin(tile,level);
      while(!process(task,512)){}
      finish(task);
    }
    // A l'arrencada només es prepara el sector inicial i les seves
    // vuit caselles veïnes. Això evita malles buides sota el jugador.
    for(const tile of tiles){
      if(Math.abs(tile.cx-startX)<cellSize*1.5&&Math.abs(tile.cz-startZ)<cellSize*1.5){
        const level=distance2(tile,startX,startZ)<1?3:targetLevel(tile,startX,startZ);
        generateNow(tile,level);stats.initialTiles++;
      }
    }
    function pick(x,z){
      let chosen=null,best=-Infinity,desired=0;
      stats.scans++;
      for(const tile of tiles){
        const wanted=targetLevel(tile,x,z);
        if(tile.level===wanted)continue;
        const d=distance2(tile,x,z);
        // Prioritat geogràfica estable, independent dels canvis de càmera.
        // Evitem comprovar la intersecció de tots els sectors a cada fotograma.
        const priority=(tile.level<0?11000000:0)+
          (wanted===3?8000000:wanted===2?4000000:wanted===1?2000000:0)-
          d+(tile.level>wanted?-2500000:0);
        if(priority>best){chosen=tile;best=priority;desired=wanted}
      }
      return chosen?begin(chosen,desired):null;
    }
    function update(x,z,budgetMs=2,camera=null){
      if(disposed)return;
      lastPlayerX=x;lastPlayerZ=z;
      // Quan tot el terreny està actualitzat no tornem a escanejar-lo cada
      // fotograma; reavaluem en desplaçar-nos 90 m o si hi ha un treball obert.
      if(!job&&settled&&Math.abs(x-lastSettledX)<90&&Math.abs(z-lastSettledZ)<90){
        stats.settledSkips++;return;
      }
      if(settled){settled=false;}
      const start=performance.now(),budget=Math.max(.5,Math.min(4,budgetMs));
      let loops=0;
      while(performance.now()-start<budget&&loops++<60){
        if(!job)job=pick(lastPlayerX,lastPlayerZ);
        if(!job){settled=true;lastSettledX=x;lastSettledZ=z;break;}
        if(process(job,160)){
          finish(job);job=null;
          // Només pugem una malla nova a GPU per fotograma.
          break;
        }
      }
    }
    function dispose(){
      disposed=true;
      if(job){job.geometry.dispose();job=null}
      for(const tile of tiles)if(tile.geometry){tile.geometry.dispose();tile.geometry=null}
      root.clear();material.dispose();
    }
    return {mesh:root,update,dispose,stats,tileSize:cellSize,get pending(){return !!job}};
  },
  createBorder(THREE,{size,halfSize}){
    const group=new THREE.Group();
    const solid=new THREE.MeshBasicMaterial({color:0xffffff,fog:false});
    const wall=new THREE.MeshBasicMaterial({
      color:0xcbe7ff,transparent:true,opacity:.16,
      side:THREE.DoubleSide,fog:false,depthWrite:false
    });
    [[0,-halfSize,0],[0,halfSize,0],[-halfSize,0,1],[halfSize,0,1]].forEach(([x,z,r])=>{
      const bar=new THREE.Mesh(new THREE.BoxGeometry(size,1.2,2.5),solid);
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(size,72),wall);
      bar.position.set(x,1.5,z);plane.position.set(x,36,z);
      if(r)bar.rotation.y=plane.rotation.y=Math.PI/2;
      group.add(bar,plane);
    });
    return group;
  }
});
