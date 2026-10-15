export function decorateTimber(T,{b,shell,box,rod,cylinder,roofs}){const g=shell.group;
       // Same gable and bundled-branch covering for every civilian timber hut.
       for(const child of [...shell.roof.children]){shell.roof.remove(child);child.traverse(o=>o.geometry?.dispose())}
       const rise=b.w*.24,half=b.w/2+1.1,angle=Math.atan2(rise,half),length=Math.hypot(half,rise);
       const branches=[];
       for(const side of[-1,1]){
         const slab=box(shell.roof,length,.28,b.d+2.2,0x69533a,side*half/2,b.h+rise/2,0);slab.rotation.z=-side*angle;
         // Deterministic relief: branch bundles and forked twigs, grouped into three meshes.
         for(let j=0;j<Math.ceil((b.d+2.2)/.32);j++){
           const z=-b.d/2-1.05+j*.32,shade=[0x887044,0x6d5637,0xa08a57][j%3],jitter=Math.sin(j*9.7)*.09;
           const a=[side*.05,b.h+rise+.22,z],end=[side*(half+.08+jitter),b.h+.2,z+jitter];
           const branch=rod(shell.roof,a,end,.09+(j%4)*.015,shade);branches.push(branch);
           if(j%3===0)branches.push(rod(shell.roof,[side*half*.53,b.h+rise*.47+.22,z],[side*half*.83,b.h+rise*.17+.24,z+.26],.055,shade));
         }
       }
       // Close the two triangular gable ends.
       const eave=rise*(1-b.w/(2*half))-.14,shape=new T.Shape();shape.moveTo(-b.w/2,0);shape.lineTo(b.w/2,0);shape.lineTo(b.w/2,eave);shape.lineTo(0,rise-.14);shape.lineTo(-b.w/2,eave);shape.closePath();
       for(const z of[-b.d/2,b.d/2]){const end=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false}),shell.walls);end.position.set(0,b.h,z-.11);shell.roof.add(end)}
       shell.roof.userData.branchGable=true;
       // Merge the twig relief by colour to keep mobile draw calls bounded.
       for(const material of new Set(branches.map(m=>m.material))){
         const parts=branches.filter(m=>m.material===material),positions=[],normals=[];
         for(const mesh of parts){mesh.updateMatrix();const geo=mesh.geometry.toNonIndexed();geo.applyMatrix4(mesh.matrix);positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);shell.roof.remove(mesh);mesh.geometry.dispose();geo.dispose()}
         const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));const batch=new T.Mesh(geo,material);batch.castShadow=batch.receiveShadow=true;shell.roof.add(batch);
       }
       for(const side of[-1,1])for(let z=-b.d/2+.8;z<b.d/2;z+=1.3)box(g,.08,b.h-.4,.08,0x654f39,side*(b.w/2+.06),b.h/2,z);
       box(g,6,.25,3.6,0x9f835e,0,.28,b.d/2+1.8);
       for(const x of[-2.7,2.7])cylinder(g,.10,4.5,0x67523a,x,2.5,b.d/2+3.2);
       const porch=box(g,6.6,.18,4.2,0x79613f,0,4.8,b.d/2+1.7);roofs.push(porch);
     
}
export function decorateUpper(T,{b,storey,shell,box,rod,roofs}){const g=shell.group;
       // Internal stairs and a real opening in the upper slab; hide slab with roofs for ground-floor inspection.
       const upper=new T.Group();upper.userData.previewUpperFloor=true;g.add(upper);roofs.push(upper);
       const stairW=2.8,run=Math.min(b.d-3,storey*1.05),sx=b.w/2-stairW/2-.7,sz=-b.d/2+2.4;
       box(upper,b.w-stairW-1,.3,b.d-.7,0x948b74,-(stairW+.3)/2,storey,0);
       box(upper,stairW+.3,.3,b.d-run-2.75,0x948b74,sx,storey,(run+2.05)/2);
       const steps=Math.ceil(storey/.35);
       for(let i=0;i<steps;i++)box(g,stairW,storey*(i+1)/steps,run/steps+.02,0xa6a18c,sx,storey*(i+1)/steps/2,sz+run-(i+.5)*run/steps);
       rod(g,[sx-stairW/2,1.1,sz+run],[sx-stairW/2,storey+1.1,sz],.07,0x46534c);
       // A landing across the back joins the stair top to the upper room.
       box(upper,stairW+.4,.3,2.4,0x948b74,sx,storey,-b.d/2+1.2);
       box(upper,3,1.2,1.6,0x776044,-b.w/2+3,storey+.75,0);
       for(const z of[-b.d/2,b.d/2])box(g,b.w+.15,.25,.15,0xa69f88,0,storey,z);
       for(const x of[-b.w/2,b.w/2])box(g,.15,.25,b.d+.15,0xa69f88,x,storey,0);
     
return upper;
}
