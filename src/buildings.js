// Construcció visual d'edificis. Col·lisions, portes, destrucció i navegació romanen al nucli.
window.HUNTER_BUILDINGS=Object.freeze({
  create(THREE,{material,materialProfile,box}){
    const wallMaterial=color=>new THREE.MeshStandardMaterial({color,flatShading:true,transparent:true,...materialProfile('masonry')});
    const doorMaterial=()=>new THREE.MeshStandardMaterial({color:0x704829,flatShading:true,transparent:true,...materialProfile('paint')});
    const addWall=(group,{lx,lz,sx,sz,height,material:mat,y=height/2})=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,height,sz),mat);
      mesh.position.set(lx,y,lz);group.add(mesh);return mesh
    };

    // Unifica només decoració immòbil dins el mateix grup de coberta.
    // Els murs, les portes, els graons i les peces destructibles continuen independents.
    const batchStaticRoof=(roof,parts)=>{
      if(!parts.length)return null;
      const buffers=[],counts=[];let total=0;
      for(const mesh of parts){
        mesh.updateMatrix();
        const geom=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
        geom.applyMatrix4(mesh.matrix);
        buffers.push(geom);
        const n=geom.attributes.position.count;counts.push(n);total+=n;
      }
      const mergedGeometry=new THREE.BufferGeometry();
      for(const [name,width] of [['position',3],['normal',3],['uv',2]]){
        const data=new Float32Array(total*width);let offset=0;
        for(let i=0;i<buffers.length;i++){
          const attr=buffers[i].getAttribute(name);
          if(attr)data.set(attr.array,offset);
          offset+=counts[i]*width;
        }
        mergedGeometry.setAttribute(name,new THREE.BufferAttribute(data,width));
      }
      mergedGeometry.computeBoundingSphere();
      const combined=new THREE.Mesh(mergedGeometry,parts[0].material);
      combined.name='hunter-roof-static-batch';combined.userData.roofBatch=true;
      for(const m of parts)roof.remove(m);
      roof.add(combined);
      for(const g of buffers)g.dispose();
      return combined;
    };
    // Porta visual: més estreta i alta, amb llinda real a sobre.
    const addDoor=(group,{lx,lz,sx,sz,height,wallMaterial,doorMaterial,doorHeight=4.4})=>{
      const h=Math.min(doorHeight,Math.max(3.8,height-.65));
      const door=addWall(group,{lx,lz,sx,sz,height:h,material:doorMaterial,y:h/2});
      const lintelHeight=Math.max(0,height-h);
      const lintel=lintelHeight>.05?addWall(group,{
        lx,lz,sx,sz,height:lintelHeight,material:wallMaterial,y:h+lintelHeight/2
      }):null;
      return {door,lintel,doorHeight:h}
    };


    // Batched per material: tres dibuixos (paret, vidre, marcs) en lloc
    // de desenes. Cada façana encara és un únic objectiu destructible.
    const batchWindowWall=(group,parts)=>{
      const byMat=new Map();
      for(const mesh of parts){
        if(!byMat.has(mesh.material))byMat.set(mesh.material,[]);
        byMat.get(mesh.material).push(mesh);
      }
      const batched=[];
      for(const [mat,meshes] of byMat){
        const geos=[],sizes=[];let total=0;
        for(const mesh of meshes){
          mesh.updateMatrix();
          const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
          geo.applyMatrix4(mesh.matrix);
          geos.push(geo);
          const n=geo.attributes.position.count;sizes.push(n);total+=n;
        }
        const merged=new THREE.BufferGeometry();
        for(const [attr,width] of [['position',3],['normal',3],['uv',2]]){
          const data=new Float32Array(total*width);let offset=0;
          for(let i=0;i<geos.length;i++){
            const a=geos[i].getAttribute(attr);
            if(a)data.set(a.array,offset);
            offset+=sizes[i]*width;
          }
          merged.setAttribute(attr,new THREE.BufferAttribute(data,width));
        }
        merged.computeBoundingSphere();
        const result=new THREE.Mesh(merged,mat);
        result.name='hunter-window-facade-batch';
        result.userData.windowFacadeBatch=true;
        for(const mesh of meshes){group.remove(mesh);mesh.geometry.dispose()}
        for(const geo of geos)geo.dispose();
        group.add(result);batched.push(result);
      }
      return batched;
    };

    // Façana amb obertures de finestra reals. La paret es construeix al voltant
    // dels buits; el vidre queda lleugerament endins de la cara exterior.
    const addWindowedWall=(group,{lx,lz,sx,sz,height,material:mat})=>{
      const alongX=sx>=sz,L=alongX?sx:sz,T=alongX?sz:sx;
      const count=L>=14?2:1;
      const winW=Math.min(2.7,L/(count*2.65));
      const winH=Math.min(2.15,Math.max(1.75,height*.31));
      const bottom=Math.min(2.35,Math.max(1.75,height*.32));
      const top=bottom+winH;
      const centers=count===2?[-L*.255,L*.255]:[0];
      const parts=[];

      const piece=(center,len,y,h)=>{
        if(len<=.05||h<=.05)return null;
        const x=alongX?lx+center:lx,z=alongX?lz:lz+center;
        const m=addWall(group,{
          lx:x,lz:z,
          sx:alongX?len:T,sz:alongX?T:len,
          height:h,material:mat,y
        });
        parts.push(m);return m
      };

      // Ampit inferior i llinda superior continus.
      piece(0,L,bottom/2,bottom);
      if(height>top)piece(0,L,top+(height-top)/2,height-top);

      // Pilars entre les obertures.
      const intervals=[];
      let cursor=-L/2;
      for(const c of centers){
        const a=c-winW/2,b=c+winW/2;
        intervals.push([cursor,a]);cursor=b
      }
      intervals.push([cursor,L/2]);
      for(const [a,b] of intervals)if(b-a>.05)piece((a+b)/2,b-a,bottom+winH/2,winH);

      // Vidres i marcs: hi ha buit de paret real darrere.
      const glassMat=material(0x3e7185,'glass'),trimMat=material(0xd0bf9c,'masonry');
      const frame=.13,depth=Math.max(.09,T*.18);
      const faceOffset=T*.08;
      for(const c of centers){
        const wx=alongX?lx+c:lx,wz=alongX?lz:lz+c;
        const glass=new THREE.Mesh(
          new THREE.BoxGeometry(alongX?winW-.18:depth,winH-.18,alongX?depth:winW-.18),
          glassMat
        );
        glass.position.set(
          alongX?wx:lx-faceOffset,
          bottom+winH/2,
          alongX?lz-faceOffset:wz
        );
        group.add(glass);parts.push(glass);

        const addFrame=(center,span,horizontal,offset)=>{
          const m=new THREE.Mesh(
            new THREE.BoxGeometry(
              alongX?(horizontal?span:frame):(horizontal?frame:depth*1.5),
              horizontal?frame:winH+frame*2,
              alongX?(horizontal?depth*1.5:depth*1.5):(horizontal?span:frame)
            ),
            trimMat
          );
          if(alongX)m.position.set(lx+center,bottom+winH/2+(horizontal?offset:0),lz-faceOffset*1.4);
          else m.position.set(lx-faceOffset*1.4,bottom+winH/2+(horizontal?offset:0),lz+center);
          group.add(m);parts.push(m)
        };
        addFrame(c,winW+frame*2,true,winH/2+frame/2);
        addFrame(c,winW+frame*2,true,-winH/2-frame/2);

        for(const side of[-1,1]){
          const m=new THREE.Mesh(
            new THREE.BoxGeometry(alongX?frame:depth*1.5,winH+frame*2,alongX?depth*1.5:frame),
            trimMat
          );
          if(alongX)m.position.set(lx+c+side*(winW/2+frame/2),bottom+winH/2,lz-faceOffset*1.4);
          else m.position.set(lx-faceOffset*1.4,bottom+winH/2,lz+c+side*(winW/2+frame/2));
          group.add(m);parts.push(m)
        }
      }
      return batchWindowWall(group,parts)
    };

    const createShell=({width,depth,height,wallColor,roofColor})=>{
      const group=new THREE.Group(),roofGroup=new THREE.Group(),walls=wallMaterial(wallColor),doors=doorMaterial();
      const floor=new THREE.Mesh(new THREE.BoxGeometry(width+.35,12.3,depth+.35),material(0x756b5d,'masonry'));
      const roof=new THREE.Mesh(new THREE.BoxGeometry(width+1.35,1.15,depth+1.35),material(roofColor,'masonry'));
      floor.position.y=-5.85;roof.position.y=height+.62;group.add(floor,roofGroup);roofGroup.add(roof);

      const rimMat=material(0x3f4650,'masonry'),rimH=.34;
      const rimN=new THREE.Mesh(new THREE.BoxGeometry(width+1.5,rimH,.36),rimMat);
      const rimS=rimN.clone();
      const rimE=new THREE.Mesh(new THREE.BoxGeometry(.36,rimH,depth+1.5),rimMat);
      const rimW=rimE.clone();
      rimN.position.set(0,height+1.24,-depth/2-.48);
      rimS.position.set(0,height+1.24,depth/2+.48);
      rimE.position.set(width/2+.48,height+1.24,0);
      rimW.position.set(-width/2-.48,height+1.24,0);
      roofGroup.add(rimN,rimS,rimE,rimW);
      batchStaticRoof(roofGroup,[rimN,rimS,rimE,rimW]);
      roofGroup.userData.color=roofColor;
      return {group,walls,doors,roof:roofGroup};
    };

    // Hangar de gran llum amb coberta arquejada low-poly.
    // L'eix llarg és Z i la volta creua l'amplada X.
    const createHangarShell=({width,depth,height,wallColor,roofColor})=>{
      const group=new THREE.Group(),roofGroup=new THREE.Group(),walls=wallMaterial(wallColor),doors=doorMaterial();group.add(roofGroup);
      const floor=new THREE.Mesh(new THREE.BoxGeometry(width+.5,.35,depth+.5),material(0x6f6d67,'masonry'));
      floor.position.y=.02;group.add(floor);

      // La volta arrenca pràcticament des de terra: el sostre forma també els laterals.
      const spring=.12,radius=Math.max(width*.5,2),segments=10,da=Math.PI/segments;
      const roofMat=material(roofColor,'metal'),slabs=[];
      for(let i=0;i<segments;i++){
        const a0=i*da,a1=(i+1)*da,a=(a0+a1)/2;
        const x=Math.cos(a)*radius,y=spring+Math.sin(a)*radius;
        const chord=2*radius*Math.sin(da/2);
        const slab=new THREE.Mesh(new THREE.BoxGeometry(chord,.24,depth+1.15),roofMat);
        slab.position.set(x,y,0);
        slab.rotation.z=a-Math.PI/2;
        roofGroup.add(slab);slabs.push(slab);
      }
      batchStaticRoof(roofGroup,slabs);

      // Nervis exteriors per donar una lectura més propera a un hangar real.
      const frameMat=material(0x5c6366,'metal'),ribs=[];
      for(const z of[-depth/2+.7,0,depth/2-.7]){
        for(let i=0;i<segments;i++){
          const a=(i+.5)*da,x=Math.cos(a)*radius,y=spring+Math.sin(a)*radius,chord=2*radius*Math.sin(da/2);
          const rib=new THREE.Mesh(new THREE.BoxGeometry(chord,.1,.12),frameMat);
          rib.position.set(x,y,z);rib.rotation.z=a-Math.PI/2;roofGroup.add(rib);ribs.push(rib);
        }
      }
      batchStaticRoof(roofGroup,ribs);
      roofGroup.userData.color=roofColor;
      roofGroup.userData.hangarRoof=true;
      roofGroup.userData.hitSegments=Array.from({length:segments},(_,i)=>{
        const a=(i+.5)*da,chord=2*radius*Math.sin(da/2);
        return {x:Math.cos(a)*radius,y:spring+Math.sin(a)*radius,a,chord,depth:depth+1.15}
      });
      return {group,walls,doors,roof:roofGroup,sideWalls:[],spring,archTop:spring+radius};
    };

    const addRamp=(group,{alongAxis,length,width,top,bottom,x,z,color,direction=1})=>{
      const rise=top-bottom,mid=(top+bottom)/2,angle=Math.atan2(rise,length);
      const mesh=new THREE.Mesh(
        new THREE.BoxGeometry(alongAxis?length:width,.28,alongAxis?width:length),
        material(color,'masonry')
      );
      mesh.position.set(x,mid,z);
      if(alongAxis)mesh.rotation.z=-direction*angle;
      else mesh.rotation.x=direction*angle;
      mesh.userData.ramp=true;group.add(mesh);return mesh
    };

    const addStep=(group,{alongAxis,riseWidth,height,base,x,y,z,color})=>{
      const mesh=box(group,alongAxis?riseWidth:4.2,height-base,alongAxis?4.2:riseWidth,color,x,(height+base)/2,z,'masonry');
      mesh.userData.stair=true;return mesh
    };
    const createFlag=({x,y,z,color})=>{
      const group=new THREE.Group();
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,14,8),material(0xc9d1d6,'metal'));
      const cloth=new THREE.Mesh(
        new THREE.BoxGeometry(5.2,3,.16),
        new THREE.MeshStandardMaterial({color,flatShading:true,...materialProfile('paint')})
      );
      pole.position.set(0,7,0);cloth.position.set(2.65,12,0);
      group.position.set(x,y,z);group.add(pole,cloth);return group
    };
    return {createShell,createHangarShell,addWall,addDoor,addWindowedWall,addRamp,addStep,createFlag};
  }
});
