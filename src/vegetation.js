// Construcció visual de vegetació instanciada. Col·lisions i destrucció continuen al nucli.
window.HUNTER_VEGETATION=Object.freeze({
  create(THREE,{materialProfile,random}){
    const dum=new THREE.Object3D();
    const palmCrown=(radius,rise,segments=8,phase=0)=>{
      const pos=[];
      for(let j=0;j<segments;j++){
        const a=phase+j*Math.PI*2/segments;
        for(let k=0;k<4;k++){
          const t=k/4,u=(k+1)/4;
          const point=(v,side)=>{
            const len=radius*v,w=Math.sin(v*Math.PI)*.68*side;
            return [
              Math.cos(a)*len-Math.sin(a)*w,
              6.35+rise+Math.sin(v*Math.PI)*1.05-v*v*1.75,
              Math.sin(a)*len+Math.cos(a)*w
            ]
          };
          const p0=point(t,-1),p1=point(t,1),p2=point(u,-1),p3=point(u,1);
          pos.push(...p0,...p1,...p2,...p1,...p3,...p2)
        }
      }
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      g.computeVertexNormals();
      return g
    };
    const curvedPalmTrunk=(height=6.2,baseRadius=.42,topRadius=.22,radial=6,vertical=8,bend=.25)=>{
      const pos=[],idx=[];
      for(let iy=0;iy<=vertical;iy++){
        const t=iy/vertical,y=height*t,r=baseRadius+(topRadius-baseRadius)*t,
              // Arc suau: arrel i copa tornen a l'eix; desviació màxima al centre.
              cx=Math.sin(Math.PI*t)*height*bend;
        for(let j=0;j<radial;j++){
          const a=j*Math.PI*2/radial;
          pos.push(cx+Math.cos(a)*r,y,Math.sin(a)*r)
        }
      }
      for(let iy=0;iy<vertical;iy++)for(let j=0;j<radial;j++){
        const a=iy*radial+j,b=iy*radial+(j+1)%radial,
              c=(iy+1)*radial+j,d=(iy+1)*radial+(j+1)%radial;
        idx.push(a,c,b,b,c,d)
      }
      // Tapes inferior i superior.
      const bottom=pos.length/3;pos.push(0,0,0);
      const top=pos.length/3;pos.push(0,height,0);
      for(let j=0;j<radial;j++){
        const n=(j+1)%radial;
        idx.push(bottom,n,j);
        const a=vertical*radial+j,b=vertical*radial+n;
        idx.push(top,a,b)
      }
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      g.setIndex(idx);g.computeVertexNormals();
      return g
    };
    // Caps simplificats sense transparències, billboards ni actualitzacions
    // per fotograma. Els grups distant són InstancedMesh per sector.
    const reducedCrown=(fronds,radius=4.65)=>{
      const pos=[];
      for(let j=0;j<fronds;j++){
        const a=j*Math.PI*2/fronds;
        const point=(v,side)=>{
          const len=radius*v,width=Math.sin(v*Math.PI)*.62*side;
          const y=6.35+Math.sin(v*Math.PI)*.7-v*v*1.65;
          return [Math.cos(a)*len-Math.sin(a)*width,y,
                  Math.sin(a)*len+Math.cos(a)*width];
        };
        for(let k=0;k<2;k++){
          const v0=k/2,v1=(k+1)/2,
                a0=point(v0,-1),a1=point(v0,1),
                b0=point(v1,-1),b1=point(v1,1);
          pos.push(...a0,...a1,...b0,...a1,...b1,...b0);
        }
      }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      geo.computeVertexNormals();
      return geo;
    };
    const crossedCrown=()=>{
      // Tres bandes planes creuades: 6 triangles en total i silueta verda
      // recognoscible de qualsevol angle, sense orientar-les a la càmera.
      const pos=[],r=4.25;
      for(let i=0;i<3;i++){
        const a=i*Math.PI/3,dx=Math.cos(a),dz=Math.sin(a),
              wx=-dz*.72,wz=dx*.72;
        const left=[-dx*r+wx,4.95,-dz*r+wz],
              right=[dx*r+wx,4.95,dz*r+wz],
              left2=[-dx*r-wx,4.95,-dz*r-wz],
              right2=[dx*r-wx,4.95,dz*r-wz],
              middle=[0,6.6,0];
        pos.push(...left,...middle,...left2,...right2,...middle,...right);
      }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      geo.computeVertexNormals();
      return geo;
    };
    const geometry={
      trunk:curvedPalmTrunk(6.2,.42,.22,6,8,.25),
      // LOD 1: 4 cares, 3 seccions i 6 fulles planes.
      midTrunk:curvedPalmTrunk(6.2,.42,.22,4,3,.25),
      midCrown:reducedCrown(6),
      // LOD 2: 3 cares, 2 seccions i 3 plans de copa creuats.
      farTrunk:curvedPalmTrunk(6.2,.42,.22,3,2,.25),
      farCrown:crossedCrown(),
      crown:palmCrown(4.7,0,8),
      crown2:palmCrown(3.1,.65,7,.18),
      palmVariants:[
        {crown:palmCrown(4.7,0,6),crown2:palmCrown(3.1,.65,5,.18)},
        {crown:palmCrown(4.7,0,8),crown2:palmCrown(3.1,.65,7,.18)},
        {crown:palmCrown(4.7,0,10),crown2:palmCrown(3.1,.65,9,.18)}
      ],
      bush:new THREE.IcosahedronGeometry(1.15,1).translate(0,.62,0),
      rock:new THREE.DodecahedronGeometry(1.25,0).translate(0,.5,0)
    };
    const colorFor=(base,row)=>{
      const c=new THREE.Color(base),tone=Math.max(-.25,Math.min(.25,row?.[6]||0));
      c.multiplyScalar(1+tone);
      c.offsetHSL(random(-.018,.018),random(-.045,.045),random(-.025,.025));
      return c
    };
    // Reutilitzem materials entre sectors perquè cada grup no generi
    // programes i materials nous innecessàriament.
    const cache=new Map();
    const mat=(color,opts={})=>{
      const key=color+':'+(opts.doubleSide?1:0)+':'+(opts.profile||'organic');
      if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({
        color:0xffffff,flatShading:true,
        side:opts.doubleSide?THREE.DoubleSide:THREE.FrontSide,
        ...materialProfile(opts.profile||'organic')
      }));
      return cache.get(key);
    };
    const inst=(parent,geo,arr,color,scale,opts={})=>{
      if(!arr.length)return null;
      const m=new THREE.InstancedMesh(geo,mat(color,opts),arr.length);
      arr.forEach((row,i)=>{
        const [x,y,z,s,r]=row;
        dum.position.set(x,y,z);
        dum.rotation.set(
          opts.tilt?random(-.04,.04):0,
          r,
          opts.tilt?random(-.04,.04):0
        );
        if(scale)scale(dum,s);else dum.scale.setScalar(s);
        dum.updateMatrix();
        m.setMatrixAt(i,dum.matrix);
        m.setColorAt(i,colorFor(color,row));
      });
      m.computeBoundingSphere();
      m.castShadow=false;
      m.receiveShadow=true;
      m.frustumCulled=true;
      parent.add(m);
      return m;
    };
    // Reutilitzem exactament les transformacions i colors de les instàncies
    // completes. Cap crida nova a random(): llavors i spawns idèntics.
    const cloneInstances=(parent,geo,source,{crown=false,shadows=false}={})=>{
      if(!source)return null;
      const mesh=new THREE.InstancedMesh(geo,source.material,source.count),
            matrix=new THREE.Matrix4(),color=new THREE.Color();
      for(let i=0;i<source.count;i++){
        source.getMatrixAt(i,matrix);mesh.setMatrixAt(i,matrix);
        if(source.instanceColor){source.getColorAt(i,color);mesh.setColorAt(i,color)}
      }
      mesh.computeBoundingSphere();
      mesh.castShadow=false;mesh.receiveShadow=shadows;
      mesh.frustumCulled=true;
      parent.add(mesh);return mesh;
    };
    const cloneCrowns=(parent,geo,rows,ch,refs)=>{
      if(!rows.length)return null;
      const mesh=new THREE.InstancedMesh(geo,mat(0x2d9f36,{doubleSide:true}),rows.length),
            matrix=new THREE.Matrix4(),color=new THREE.Color();
      for(let i=0;i<rows.length;i++){
        const ref=refs[rows[i].i],source=ch.primary[ref.variant];
        source.getMatrixAt(ref.index,matrix);mesh.setMatrixAt(i,matrix);
        source.getColorAt(ref.index,color);mesh.setColorAt(i,color);
      }
      mesh.computeBoundingSphere();
      mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=true;
      parent.add(mesh);return mesh;
    };
    const CHUNK=420;
    const build=({world,palms,bushes,rocks,playerX=0,playerZ=0,lowQuality=false})=>{
      const root=new THREE.Group();
      root.name='hunter-palm-sectors';
      world.add(root);
      const chunks=new Map();
      const variantMap=new Array(palms.length);
      palms.forEach((row,i)=>{
        const cx=Math.floor(row[0]/CHUNK),cz=Math.floor(row[2]/CHUNK),
              key=cx+','+cz;
        let ch=chunks.get(key);
        if(!ch){
          ch={cx,cz,x:(cx+.5)*CHUNK,z:(cz+.5)*CHUNK,rows:[],mesh:null,primary:[],secondary:[]};
          chunks.set(key,ch);
        }
        const vi=Math.max(0,Math.min(2,(row[5]??0)+1));
        ch.rows.push({row,i,vi});
      });
      const sections=[];
      for(const ch of chunks.values()){
        // Les posicions i rotacions continuen en coordenades mundials:
        // els límits de l'InstancedMesh es calculen només per aquest sector.
        const rows=ch.rows;
        rows.forEach((p,trunkIndex)=>{
          variantMap[p.i]={chunk:ch,trunkIndex,variant:p.vi,index:-1};
        });
        ch.trunk=inst(root,geometry.trunk,rows.map(p=>p.row),0x8e6337,null,{profile:'organic',tilt:true});
        ch.primary=[];ch.secondary=[];
        for(let v=0;v<3;v++){
          const selected=rows.filter(p=>p.vi===v);
          const crowns=selected.map(p=>p.row);
          const primary=inst(root,geometry.palmVariants[v].crown,crowns,0x2d9f36,null,{doubleSide:true});
          const secondary=inst(root,geometry.palmVariants[v].crown2,crowns,0x65c83f,null,{doubleSide:true});
          ch.primary.push(primary);ch.secondary.push(secondary);
          selected.forEach((p,i)=>{variantMap[p.i].index=i});
        }
        // LOD 1 i 2 comparteixen posicions i colors del model detallat,
        // però es dibuixen amb només dos InstancedMesh per sector.
        ch.midTrunk=cloneInstances(root,geometry.midTrunk,ch.trunk);
        ch.midCrown=cloneCrowns(root,geometry.midCrown,rows,ch,variantMap);
        ch.farTrunk=cloneInstances(root,geometry.farTrunk,ch.trunk);
        ch.farCrown=cloneCrowns(root,geometry.farCrown,rows,ch,variantMap);
        // Bounding spheres separades per sector, no una esfera de tota l'illa.
        ch.meshes=[ch.trunk,...ch.primary,...ch.secondary,
          ch.midTrunk,ch.midCrown,ch.farTrunk,ch.farCrown].filter(Boolean);
        ch.rows=null;
        sections.push(ch);
      }
      const distances=lowQuality?[460,870,1250]:[500,1100,1900],
            margin=65;
      const stats={sectors:sections.length,totalPalms:palms.length,
        visibleSectors:0,visiblePalms:0,detailSectors:0,mediumSectors:0,
        farSectors:0,hiddenSectors:0,lodSwitches:0,
        nearDistance:distances[0],midDistance:distances[1],
        farDistance:distances[2]};
      let lastX=Infinity,lastZ=Infinity;
      const tierFor=(d,previous)=>{
        if(previous==null)return d<distances[0]?0:d<distances[1]?1:d<distances[2]?2:3;
        let tier=previous;
        // Histeresi de 65 m evita canvis de malla a cada moviment.
        while(tier<3&&d>distances[tier]+margin)tier++;
        while(tier>0&&d<distances[tier-1]-margin)tier--;
        return tier;
      };
      function update(x,z,force=false){
        if(!force&&Math.abs(x-lastX)<45&&Math.abs(z-lastZ)<45)return;
        lastX=x;lastZ=z;
        let visible=0,count=0,detailed=0,middle=0,far=0,hidden=0;
        for(const ch of sections){
          // La distància és a la vora del sector, per evitar salts visibles
          // quan el jugador passa a tocar d'una cantonada.
          const dx=Math.max(0,Math.abs(ch.x-x)-CHUNK/2),
                dz=Math.max(0,Math.abs(ch.z-z)-CHUNK/2),
                d=Math.hypot(dx,dz),tier=tierFor(d,ch.lod);
          if(ch.lod!==tier){
            if(ch.lod!=null)stats.lodSwitches++;
            ch.lod=tier;
            for(const mesh of ch.meshes)mesh.visible=false;
            const show=m=>{if(m)m.visible=true};
            if(tier===0){
              show(ch.trunk);
              for(const mesh of ch.primary)show(mesh);
              for(const mesh of ch.secondary)show(mesh);
            }else if(tier===1){show(ch.midTrunk);show(ch.midCrown)}
            else if(tier===2){show(ch.farTrunk);show(ch.farCrown)}
          }
          if(tier===3){hidden++;continue}
          visible++;count+=ch.count;
          if(tier===0)detailed++;
          else if(tier===1)middle++;
          else far++;
        }
        stats.visibleSectors=visible;
        stats.visiblePalms=count;
        stats.detailSectors=detailed;
        stats.mediumSectors=middle;
        stats.farSectors=far;
        stats.hiddenSectors=hidden;
      }
      for(const ch of sections)ch.count=ch.primary.reduce((sum,m)=>sum+(m?.count||0),0);
      function remove(index,zeroMatrix){
        const ref=variantMap[index];
        if(!ref)return;
        const ch=ref.chunk;
        const meshes=[
          [ch.trunk,ref.trunkIndex],
          [ch.primary[ref.variant],ref.index],
          [ch.secondary[ref.variant],ref.index],
          [ch.midTrunk,ref.trunkIndex],[ch.midCrown,ref.trunkIndex],
          [ch.farTrunk,ref.trunkIndex],[ch.farCrown,ref.trunkIndex]
        ];
        for(const [m,i] of meshes)if(m){
          m.setMatrixAt(i,zeroMatrix);
          m.instanceMatrix.needsUpdate=true;
        }
      }
      update(playerX,playerZ,true);
      return {
        palms:{trunk:root,variants:sections,variantMap,update,remove,stats},
        bushes:inst(world,geometry.bush,bushes,0x2f8e42,(d,s)=>d.scale.set(s*1.15,s*.72,s),{profile:'organic'}),
        rocks:inst(world,geometry.rock,rocks,0x777985,(d,s)=>d.scale.set(s*1.25,s*.75,s),{profile:'masonry',tilt:true})
      };
    };
    return {geometry,build};
  }
});
