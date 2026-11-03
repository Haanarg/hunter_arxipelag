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
  create(THREE,options){
    const steps=this.createSteps(THREE,options);let next;
    while(!(next=steps.next()).done){}return next.value;
  },
  *createSteps(THREE,{size,segments,heightAt,material,startX=0,startZ=0,lowQuality=false,quality=null,shadows=false,cutouts=[],parent=null}){
    const root=new THREE.Group();
    root.name='hunter-terrain-stream';
    if(parent)parent.add(root);
    // Un forat precís al terreny deixa el soterrani sota el búnquer buit:
    // no modificam hAt (ni l'orografia ni les rutes), i funciona amb tots
    // els nivells LOD sense vores esglaonades ni regenerar sectors.
    // El material de retallada s'utilitza només als sectors que travessen
    // el búnquer. La resta conserva el shader ordinari, sense discard.
    const cutoutMaterial=cutouts.length?material.clone():null;
    const cutoutBounds=cutouts.length?cutouts.map(cut=>{
      const c=Math.cos(cut.angle),s=Math.sin(cut.angle);
      return {x:cut.x,z:cut.z,
        hx:Math.abs(c)*cut.halfWidth+Math.abs(s)*cut.halfDepth,
        hz:Math.abs(s)*cut.halfWidth+Math.abs(c)*cut.halfDepth};
    }):[];
    if(cutoutMaterial){
      const cut=cutouts[0],c=Math.cos(cut.angle),s=Math.sin(cut.angle);
      // La textura HD s'actualitza després de generar el món; el material
      // especial ha de rebre el mateix mapa sense tornar-lo a crear.
      material.userData.hunterCutoutMaterial=cutoutMaterial;
      cutoutMaterial.onBeforeCompile=shader=>{
        shader.uniforms.hunterCutout={value:new THREE.Vector4(cut.x,cut.z,c,s)};
        shader.uniforms.hunterCutoutSize={value:new THREE.Vector2(cut.halfWidth,cut.halfDepth)};
        shader.vertexShader='varying vec2 hunterTerrainXZ;\n'+shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n hunterTerrainXZ=(modelMatrix*vec4(position,1.0)).xz;');
        shader.fragmentShader='varying vec2 hunterTerrainXZ;\nuniform vec4 hunterCutout;\nuniform vec2 hunterCutoutSize;\n'+
          shader.fragmentShader.replace('#include <clipping_planes_fragment>',
            '#include <clipping_planes_fragment>\n vec2 hunterD=hunterTerrainXZ-hunterCutout.xy;\n vec2 hunterL=vec2(dot(hunterD,hunterCutout.zw),dot(hunterD,vec2(-hunterCutout.w,hunterCutout.z)));\n if(all(lessThan(abs(hunterL),hunterCutoutSize)))discard;');
      };
      cutoutMaterial.customProgramCacheKey=()=>`hunter-bunker-cutout-v2`;
    }
    const tileSize=800,side=Math.ceil(size/tileSize),cellSize=size/side,half=size/2;
    // Conservam la resolució propera per mantenir el contacte amb peus i
    // rodes, però simplificam molt abans els sectors intermedis i llunyans.
    const profile=quality||(lowQuality?'mobile':'desktop');
    const configs={
      desktop:{levels:[5,10,20,64],ranges:[410,1120,2060]},
      mobile:{levels:[3,6,12,40],ranges:[290,700,1350]},
      ultra:{levels:[2,4,8,24],ranges:[165,440,900]}
    };
    const profileConfig=configs[profile]||configs.desktop,
          levels=profileConfig.levels,ranges=profileConfig.ranges,margin=50;
    const palette=HUNTER_TERRAIN_PALETTE.map(([h,c])=>{
      const rgb=new THREE.Color(c);return {h,r:rgb.r,g:rgb.g,b:rgb.b};
    });
    const tileUsesCutout=tile=>cutoutBounds.some(cut=>
      Math.abs(tile.cx-cut.x)<=cellSize/2+cut.hx&&
      Math.abs(tile.cz-cut.z)<=cellSize/2+cut.hz);
    const tiles=[];
    let surfaceRevision=0,disposed=false,job=null,lastPlayerX=startX,lastPlayerZ=startZ,
        settled=false,lastSettledX=Infinity,lastSettledZ=Infinity,lastFocusKey='';
    const stats={profile,initialTiles:0,visibleTiles:0,generatedTiles:0,upgradedTiles:0,processedVertices:0,totalTiles:side*side,
      lodLevels:[...levels],lodRanges:[...ranges],lodTiles:[0,0,0,0],terrainTriangles:0,terrainShadowTiles:0,
      farTiles:0,viewPriority:false,settledSkips:0,scans:0};
    // The material is shared by all tiles. A single shader compilation is needed.
    function colorAtHeight(h,out,k){
      let i=0;
      while(i<palette.length-2&&h>palette[i+1].h)i++;
      const a=palette[i],b=palette[i+1],
            t=Math.max(0,Math.min(1,(h-a.h)/(b.h-a.h)));
      // Banda de sorra humida en el perfil Alt: fa més natural la
      // transició de l'escuma amb la costa, sense tocar la simulació.
      const wet=profile==='desktop'&&h>-.6&&h<3
        ?Math.max(0,1-Math.abs(h-.65)/2.35)*.12:0;
      out[k]=(a.r+(b.r-a.r)*t)*(1-wet);
      out[k+1]=(a.g+(b.g-a.g)*t)*(1-wet);
      out[k+2]=(a.b+(b.b-a.b)*t)*(1-wet);
    }
    for(let z=0;z<side;z++)for(let x=0;x<side;x++){
      const cx=-half+(x+.5)*cellSize,cz=-half+(z+.5)*cellSize;
      tiles.push({x,z,cx,cz,geometry:null,mesh:null,level:-1});
    }
    // Mostra el relleu una sola vegada per sector. Els sectors amb costa
    // o canvis bruscos de pendent necessiten més geometria que el mar o
    // les planes, fins i tot lluny de la càmera. No canvia heightAt ni
    // les col·lisions: només evita triangles LOD massa grans.
    function detailFloor(tile){
      if(tile.detailFloor!==undefined)return tile.detailFloor;
      const samples=7,step=cellSize/(samples-1),left=tile.cx-cellSize/2,
            front=tile.cz-cellSize/2,values=new Float32Array(samples*samples);
      let min=Infinity,max=-Infinity,maxRise=0,hasCoast=false;
      for(let z=0;z<samples;z++)for(let x=0;x<samples;x++){
        const h=heightAt(left+x*step,front+z*step),i=z*samples+x;
        values[i]=h;min=Math.min(min,h);max=Math.max(max,h);
        // Les travesses de nivell del mar i els talussos de moltes
        // desenes de metres no s'han de representar amb 5 divisions.
        if(x){
          const other=values[i-1];
          maxRise=Math.max(maxRise,Math.abs(h-other));
          if((h<=2&&other>=-2)||(other<=2&&h>=-2))hasCoast=true;
        }
        if(z){
          const other=values[i-samples];
          maxRise=Math.max(maxRise,Math.abs(h-other));
          if((h<=2&&other>=-2)||(other<=2&&h>=-2))hasCoast=true;
        }
      }
      tile.detailFloor=(hasCoast||(min<2&&max>2)||maxRise>22)?2:
        (maxRise>11?1:0);
      return tile.detailFloor;
    }
    function distance2(tile,x,z){
      const dx=Math.max(0,Math.abs(tile.cx-x)-cellSize/2),
            dz=Math.max(0,Math.abs(tile.cz-z)-cellSize/2);
      return dx*dx+dz*dz;
    }
    function targetLevel(tile,x,z,focus=null){
      if(focus?.intersectsXZBox(tile.cx,tile.cz,cellSize/2))return 3;
      const distance=Math.sqrt(distance2(tile,x,z));
      let level=tile.level<0?
        (distance<ranges[0]?3:distance<ranges[1]?2:distance<ranges[2]?1:0):
        tile.level;
      // Histeresi de 50 m: una petita oscil·lació de posició no força
      // a recrear les malles i tornar-les a pujar a la GPU.
      if(tile.level>=0){
        while(level<3&&distance<ranges[2-level]-margin)level++;
        while(level>0&&distance>ranges[3-level]+margin)level--;
      }
      return Math.max(level,detailFloor(tile));
    }
    function appendSkirts(geometry,n){
      // Faldons al límit entre sectors de diferent LOD: amaguen petites
      // escletxes sense canviar les altures emprades per les col·lisions.
      const original=geometry.attributes.position,
            colors=geometry.attributes.color,
            sourceUV=geometry.attributes.uv,
            base=original.count,edges=[],row=n+1;
      for(let i=0;i<=n;i++)edges.push(i);
      for(let i=0;i<=n;i++)edges.push(i*row+n);
      for(let i=n;i>=0;i--)edges.push(n*row+i);
      for(let i=n;i>=0;i--)edges.push(i*row);
      const skirtCount=edges.length*2,
            pos=new Float32Array((base+skirtCount)*3),
            col=new Float32Array((base+skirtCount)*3),
            uv=(material.map||material.userData?.requiresDetailUV)&&sourceUV?new Float32Array((base+skirtCount)*2):null,
            oldIx=geometry.index.array,
            indices=new Uint16Array(oldIx.length+edges.length*6);
      pos.set(original.array);col.set(colors.array);indices.set(oldIx);
      if(uv)uv.set(sourceUV.array);
      let at=oldIx.length;
      for(let i=0;i<edges.length;i++){
        const src=edges[i],a=base+2*i,b=a+1,k=src*3;
        pos.set([pos[k],pos[k+1],pos[k+2]],a*3);
        pos.set([pos[k],pos[k+1]-18,pos[k+2]],b*3);
        col.set([col[k],col[k+1],col[k+2]],a*3);
        col.set([col[k],col[k+1],col[k+2]],b*3);
        if(uv){
          const j=src*2;
          uv.set([uv[j],uv[j+1]],a*2);
          uv.set([uv[j],uv[j+1]],b*2);
        }
        if(i%row===row-1)continue;
        const c=a+2,d=b+2;
        indices[at++]=a;indices[at++]=b;indices[at++]=c;
        indices[at++]=c;indices[at++]=b;indices[at++]=d;
      }
      geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));
      geometry.setAttribute('color',new THREE.BufferAttribute(col,3));
      if(uv)geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
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
      const mesh=new THREE.Mesh(geometry,
        cutoutMaterial&&tileUsesCutout(tile)?cutoutMaterial:material);
      mesh.name='hunter-terrain-tile';
      mesh.position.set(tile.cx,0,tile.cz);
      mesh.userData.terrainTile=true;
      // Sols les malles immediates reben ombres: estalvi de GPU als
      // vessants llunyans, especialment mirant terra endins.
      mesh.userData.terrainNearShadow=shadows&&level===3;
      mesh.receiveShadow=mesh.userData.terrainNearShadow;mesh.castShadow=false;
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
      // Una revisió global només canvia quan hi ha una malla LOD nova.
      surfaceRevision++;
      stats.lodTiles=[0,0,0,0];
      stats.terrainTriangles=0;stats.terrainShadowTiles=0;
      for(const current of tiles)if(current.mesh){
        stats.lodTiles[current.level]++;
        stats.terrainTriangles+=current.geometry.index.count/3;
        if(current.mesh.receiveShadow)stats.terrainShadowTiles++;
      }
    }
    function generateNow(tile,level){
      const task=begin(tile,level);
      while(!process(task,512)){}
      finish(task);
    }
    let initialComplete=false;
    try{
    // A l'arrencada només es prepara el sector inicial i les seves
    // vuit caselles veïnes. Això evita malles buides sota el jugador.
    for(const tile of tiles){
      if(Math.abs(tile.cx-startX)<cellSize*1.5&&Math.abs(tile.cz-startZ)<cellSize*1.5){
        const level=distance2(tile,startX,startZ)<1?3:targetLevel(tile,startX,startZ);
        const task=begin(tile,level);let committed=false;
        try{
          while(!process(task,256))yield {stage:'Terreny inicial',completed:task.next,total:task.p.count,unit:'vèrtexs'};
          finish(task);committed=true;stats.initialTiles++;
        }finally{if(!committed)task.geometry.dispose()}
        yield {stage:'Terreny inicial',completed:stats.initialTiles,total:null,unit:'sectors'};
      }
    }
    function pick(x,z,focus=null){
      let chosen=null,best=-Infinity,desired=0;
      stats.scans++;
      for(const tile of tiles){
        const wanted=targetLevel(tile,x,z,focus);
        if(tile.level===wanted)continue;
        const d=distance2(tile,x,z);
        // Prioritat geogràfica estable, independent dels canvis de càmera.
        // Evitem comprovar la intersecció de tots els sectors a cada fotograma.
        const priority=(focus?.intersectsXZBox(tile.cx,tile.cz,cellSize/2)?22000000:0)+
          (tile.level<0?11000000:0)+
          (wanted===3?8000000:wanted===2?4000000:wanted===1?2000000:0)-
          d+(tile.level>wanted?-2500000:0);
        if(priority>best){chosen=tile;best=priority;desired=wanted}
      }
      return chosen?begin(chosen,desired):null;
    }
    function update(x,z,budgetMs=2,camera=null,focus=null){
      if(disposed)return;
      lastPlayerX=x;lastPlayerZ=z;
      const focusKey=focus?.key||'';
      if(focusKey!==lastFocusKey){
        lastFocusKey=focusKey;settled=false;
        if(job){job.geometry.dispose();job=null}
      }
      // Quan tot el terreny està actualitzat no tornem a escanejar-lo cada
      // fotograma; reavaluem en desplaçar-nos 90 m o si hi ha un treball obert.
      if(!job&&settled&&Math.abs(x-lastSettledX)<90&&Math.abs(z-lastSettledZ)<90){
        stats.settledSkips++;return;
      }
      if(settled){settled=false;}
      const start=performance.now(),budget=Math.max(.5,Math.min(4,budgetMs));
      let loops=0;
      while(performance.now()-start<budget&&loops++<60){
        if(!job)job=pick(lastPlayerX,lastPlayerZ,focus);
        if(!job){settled=true;lastSettledX=x;lastSettledZ=z;break;}
        if(process(job,160)){
          finish(job);job=null;
          // Només pugem una malla nova a GPU per fotograma.
          break;
        }
      }
    }
    // Road decals only refit when their own terrain tile changes LOD.
    function surfaceVersionAt(x,z){
      const ix=Math.max(0,Math.min(side-1,Math.floor((x+half)/cellSize))),iz=Math.max(0,Math.min(side-1,Math.floor((z+half)/cellSize)));
      return tiles[iz*side+ix]?.geometry?.id??0;
    }
    // Alçada real dels triangles visibles (no la funció contínua de física).
    // Una malla LOD interpola els seus vèrtexs: pot quedar per sobre de heightAt.
    function visibleHeightAt(x,z){
      if(disposed||x<-half||x>half||z<-half||z>half)return null;
      // Només examinem les caselles que poden contenir el punt.
      // A les costures el sector de l'altre costat també pot ser visible.
      const tx=Math.floor((x+half)/cellSize),tz=Math.floor((z+half)/cellSize);
      let best=null;
      for(let iz=Math.max(0,tz-1);iz<=Math.min(side-1,tz+1);iz++){
        for(let ix=Math.max(0,tx-1);ix<=Math.min(side-1,tx+1);ix++){
          const tile=tiles[iz*side+ix];
          if(!tile?.geometry||tile.level<0)continue;
          const left=tile.cx-cellSize/2,front=tile.cz-cellSize/2;
          // PlaneGeometry.rotateX(-PI/2): row 0 ends at MINIMUM world Z.
          // Previously Z was reversed, sampling the opposite hillside.
          const uWorld=x-left,vWorld=z-front;
          // Una tolerància petita inclou les dues vores, sense projectar
          // l'altura de sectors distants sobre el jugador.
          if(uWorld<-.0001||uWorld>cellSize+.0001||
             vWorld<-.0001||vWorld>cellSize+.0001)continue;
          const n=levels[tile.level],step=cellSize/n,row=n+1;
          const u=Math.max(0,Math.min(n-1e-8,uWorld/step));
          const v=Math.max(0,Math.min(n-1e-8,vWorld/step));
          const i=Math.floor(u),j=Math.floor(v),fu=u-i,fv=v-j;
          const p=tile.geometry.attributes.position;
          const a=j*row+i,b=(j+1)*row+i,c=b+1,d=a+1;
          // Mateixa diagonal que els índexs de THREE.PlaneGeometry.
          const h=fu+fv<=1
            ?p.getY(a)+(p.getY(d)-p.getY(a))*fu+(p.getY(b)-p.getY(a))*fv
            :p.getY(c)+(p.getY(b)-p.getY(c))*(1-fu)+(p.getY(d)-p.getY(c))*(1-fv);
          if(best===null||h>best)best=h;
        }
      }
      return best;
    }
    function dispose(){
      disposed=true;
      if(job){job.geometry.dispose();job=null}
      for(const tile of tiles)if(tile.geometry){tile.geometry.dispose();tile.geometry=null}
      root.clear();cutoutMaterial?.dispose();material.dispose();
    }
    initialComplete=true;
    return {mesh:root,update,dispose,visibleHeightAt,surfaceVersionAt,stats,tileSize:cellSize,
      get surfaceRevision(){return surfaceRevision},get pending(){return !!job}};
    }finally{
      if(!initialComplete){
        for(const tile of tiles)if(tile.geometry)tile.geometry.dispose();
        root.parent?.remove(root);root.clear();cutoutMaterial?.dispose();material.dispose();
      }
    }
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
