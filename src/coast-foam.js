// Escuma de litoral adaptativa, només per a la qualitat Alt.
// Les franges ressegueixen les corbes hAt(x,z)=0 amb mostres fines:
// les ones mantenen exactament la funció que també usa la física.
window.HUNTER_COAST_FOAM=Object.freeze({
 create(T,{scene,model,heightAt,time,foamColor}){
   const mat=new T.ShaderMaterial({
     uniforms:{time,foamColor:{value:new T.Vector3(...foamColor)}},
     transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,
     stencilWrite:true,stencilRef:0,stencilFunc:T.EqualStencilFunc,
     stencilFail:T.KeepStencilOp,stencilZFail:T.KeepStencilOp,
     stencilZPass:T.KeepStencilOp,
     vertexShader:[
       'uniform float time;',
       'attribute float seabed,shoreSide;',
       'varying float vSide;varying vec3 worldP;',
       model.glsl,
       'void main(){',
       '  vec3 p=position;',
       '  vSide=shoreSide;',
       '  p.y=hunterWaveHeight(p.xz,time,seabed)+.09;',
       '  worldP=p;',
       '  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);',
       '}'
     ].join('\n'),
     fragmentShader:[
       'uniform float time;',
       'uniform vec3 foamColor;',
       'varying float vSide;varying vec3 worldP;',
       'void main(){',
       '  float edge=1.-smoothstep(.12,1.,abs(vSide));',
       '  float swell=pow(.5+.5*sin(time*2.3-worldP.x*.21+worldP.z*.14),2.);',
       '  float lace=.5+.5*sin(worldP.x*.73+worldP.z*.59+time*1.45);',
       '  float breakup=.5+.5*sin(worldP.x*.47-worldP.z*.64-time*1.8);',
       '  float alpha=edge*(.19+.52*swell)*(.55+.27*lace+.18*breakup);',
       '  float distanceToCamera=distance(cameraPosition,worldP);',
       '  alpha*=1.-smoothstep(980.,1670.,distanceToCamera);',
       '  if(alpha<.012)discard;',
       '  gl_FragColor=vec4(foamColor,clamp(alpha,0.,.72));',
       '#include <tonemapping_fragment>',
       '#include <colorspace_fragment>',
       '}'
     ].join('\n')
   });
   let geo=new T.BufferGeometry();
   const mesh=new T.Mesh(geo,mat);
   mesh.name='hunter-shore-breakers';mesh.renderOrder=3;
   mesh.frustumCulled=true;mesh.visible=false;scene.add(mesh);
   const stats={segments:0,vertices:0,triangles:0,coastCells:0,sampledPoints:0};
   function regenerate(ocean,segments){const steps=regenerateSteps(ocean,segments);while(!steps.next().done){}}
   function* regenerateSteps(ocean,segments){
     const p=ocean.attributes.position,b=ocean.attributes.seabed,
       row=segments+1,pos=[],beds=[],sides=[],indices=[],
       subdivision=3,halfWidth=5.4,maxSegments=26000;
     let coastCells=0,samples=0,limit=false;
     const H=(x,z)=>{samples++;return heightAt(x,z)};
     function segment(a,c){
       if(pos.length/18>=maxSegments){limit=true;return}
       const dx=c.x-a.x,dz=c.z-a.z,l=Math.hypot(dx,dz);
       if(l<.04)return;
       const nx=-dz/l,nz=dx/l,start=pos.length/3;
       for(const endpoint of[a,c])for(const side of[-1,0,1]){
         const x=endpoint.x+nx*halfWidth*side,
           z=endpoint.z+nz*halfWidth*side;
         pos.push(x,0,z);beds.push(H(x,z));sides.push(side);
       }
       for(let t=0;t<2;t++){
         const a=start+t,b=a+3,c=a+1,d=a+4;
         indices.push(a,b,c,c,b,d);
       }
     }
     function contour(points,heights){
       const edges=[[0,1],[1,2],[2,3],[3,0]],hits=[];
       for(const [a,b] of edges){
         const h0=heights[a],h1=heights[b];
         if((h0>0)===(h1>0))continue;
         const t=Math.max(0,Math.min(1,h0/(h0-h1)));
         hits.push({
           x:points[a].x+(points[b].x-points[a].x)*t,
           z:points[a].z+(points[b].z-points[a].z)*t
         });
       }
       if(hits.length===2)segment(hits[0],hits[1]);
       else if(hits.length===4){segment(hits[0],hits[1]);segment(hits[2],hits[3]);}
     }
     for(let iz=0;iz<segments&&!limit;iz++)for(let ix=0;ix<segments&&!limit;ix++){
       if((iz*segments+ix)%64===0)yield {stage:'Escuma de costa',completed:iz*segments+ix,total:segments*segments,unit:'cel·les'};
       const k=iz*row+ix,
         h0=b.getX(k),h1=b.getX(k+1),
         h2=b.getX(k+row+1),h3=b.getX(k+row),
         min=Math.min(h0,h1,h2,h3),max=Math.max(h0,h1,h2,h3);
       if(min>3||max< -3)continue;
       coastCells++;
       const x0=p.getX(k),x1=p.getX(k+1),
         z0=p.getZ(k),z1=p.getZ(k+row),local=[];
       for(let iy=0;iy<=subdivision;iy++){
         const line=[];
         for(let ix=0;ix<=subdivision;ix++){
           const x=x0+(x1-x0)*ix/subdivision,
             z=z0+(z1-z0)*iy/subdivision;
           line.push({x,z,h:H(x,z)});
         }
         local.push(line);
       }
       for(let iy=0;iy<subdivision&&!limit;iy++)
         for(let ix=0;ix<subdivision&&!limit;ix++){
           const a=local[iy][ix],c=local[iy][ix+1],
             d=local[iy+1][ix+1],e=local[iy+1][ix];
           contour([a,c,d,e],[a.h,c.h,d.h,e.h]);
         }
     }
     const next=new T.BufferGeometry();
     next.setAttribute('position',new T.Float32BufferAttribute(pos,3));
     next.setAttribute('seabed',new T.Float32BufferAttribute(beds,1));
     next.setAttribute('shoreSide',new T.Float32BufferAttribute(sides,1));
     next.setIndex(indices);
     if(pos.length){
       next.computeBoundingBox();
       next.boundingBox.min.y=-model.maxDisplacement-.1;
       next.boundingBox.max.y=model.maxDisplacement+.1;
       next.computeBoundingSphere();
       next.boundingSphere.radius+=model.maxDisplacement+.1;
     }
     geo.dispose();geo=next;mesh.geometry=geo;
     stats.segments=pos.length/18;
     stats.vertices=pos.length/3;
     stats.triangles=indices.length/3;
     stats.coastCells=coastCells;stats.sampledPoints=samples;
     mesh.visible=stats.segments>0;
   }
   function dispose(){scene.remove(mesh);geo.dispose();mat.dispose()}
   return {mesh,stats,regenerate,regenerateSteps,dispose};
 }
});
