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
    const geometry={
      trunk:curvedPalmTrunk(6.2,.42,.22,6,8,.25),
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
    const inst=(world,geo,arr,color,scale,opts={})=>{
      if(!arr.length)return null;
      const m=new THREE.InstancedMesh(
        geo,
        new THREE.MeshStandardMaterial({
          color:0xffffff,flatShading:true,
          side:opts.doubleSide?THREE.DoubleSide:THREE.FrontSide,
          ...materialProfile(opts.profile||'organic')
        }),
        arr.length
      );
      arr.forEach((row,i)=>{
        const [x,y,z,s,r]=row;
        dum.position.set(x,y,z);
        dum.rotation.set(
          opts.tilt?random(-.04,.04):0,
          r,
          opts.tilt?random(-.04,.04):0
        );
        if(scale)scale(dum,s);else dum.scale.setScalar(s);
        dum.updateMatrix();m.setMatrixAt(i,dum.matrix);
        m.setColorAt(i,colorFor(color,row))
      });
      m.computeBoundingSphere();
      world.add(m);
      return m
    };
    const build=({world,palms,bushes,rocks})=>{
      const trunk=inst(world,geometry.trunk,palms,0x8e6337,null,{profile:'organic',tilt:true});
      const groups=[[],[],[]],variantMap=new Array(palms.length);
      palms.forEach((row,originalIndex)=>{
        const vi=Math.max(0,Math.min(2,(row[5]??0)+1)),index=groups[vi].length;
        groups[vi].push(row);variantMap[originalIndex]={variant:vi,index}
      });
      const variants=groups.map((arr,vi)=>({
        crown:inst(world,geometry.palmVariants[vi].crown,arr,0x2d9f36,null,{doubleSide:true}),
        crown2:inst(world,geometry.palmVariants[vi].crown2,arr,0x65c83f,null,{doubleSide:true})
      }));
      return {
        palms:{trunk,crown:variants[1].crown,crown2:variants[1].crown2,variants,variantMap},
        bushes:inst(world,geometry.bush,bushes,0x2f8e42,(d,s)=>d.scale.set(s*1.15,s*.72,s),{profile:'organic'}),
        rocks:inst(world,geometry.rock,rocks,0x777985,(d,s)=>d.scale.set(s*1.25,s*.75,s),{profile:'masonry',tilt:true})
      }
    };
    return {geometry,build};
  }
});
