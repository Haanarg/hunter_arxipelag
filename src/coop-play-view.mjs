const colors=[0x5fc5ff,0xffc85f],css=['#5fc5ff','#ffc85f'];
export async function createMissionView(container,meta,geometry,{three=null,makeRenderer=null}={}){
  const b=meta.bounds,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
  const canvas=document.createElement('canvas');let displayed=canvas;container.replaceChildren(canvas);
  let state=null,last=performance.now(),destroyed=false,draw=()=>{},dispose=()=>{},resize=()=>{};
  try{
    const T=three||await import('../vendor/three-r186.module.mjs'),renderer=makeRenderer?makeRenderer({canvas}):new T.WebGLRenderer({canvas,antialias:true});
    renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.setClearColor(0x273b32);
    const scene=new T.Scene(),camera=new T.OrthographicCamera(-70,70,60,-60,.1,500);
    camera.position.set(cx,meta.floor+110,cz+75);camera.lookAt(cx,meta.floor,cz);scene.add(new T.AmbientLight(0xffffff,2));
    const light=new T.DirectionalLight(0xffedcd,3);light.position.set(cx-40,100,cz+30);scene.add(light);
    const box=(w,h,d,x,y,z,color)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:1}));mesh.position.set(x,y,z);scene.add(mesh);return mesh;};
    box(b.x1-b.x0,.3,b.z1-b.z0,cx,meta.floor-.16,cz,0x607b50);
    for(const wall of geometry.walls)if(!wall.open)box(Math.max(.1,wall.x1-wall.x0),Math.max(.1,wall.y1-wall.y0),Math.max(.1,wall.z1-wall.z0),(wall.x0+wall.x1)/2,(wall.y0+wall.y1)/2,(wall.z0+wall.z1)/2,wall.playerBlock===false?0xb4b5a3:0xa0a795);
    for(const s of geometry.stairs){
      const height=s.ramp?(s.top+s.bottom)/2:s.top-(s.steps-1)*s.rise/2,
        mesh=box(s.width,.16,s.length,s.x+s.nx*s.length/2,height,s.z+s.nz*s.length/2,0xa99870);
      mesh.rotation.y=Math.atan2(s.nx,s.nz);
      if(s.ramp)mesh.rotation.x=Math.atan2(s.top-s.bottom,s.length);
    }
    const line=(points,color,opacity=1)=>{const material=new T.LineBasicMaterial({color,transparent:opacity<1,opacity}),mesh=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(p.x,p.y??meta.floor+.15,p.z))),material);scene.add(mesh);return mesh;};
    line([{x:b.x0,z:b.z0},{x:b.x1,z:b.z0},{x:b.x1,z:b.z1},{x:b.x0,z:b.z1},{x:b.x0,z:b.z0}],0xffdfa0,.65);
    meta.routes.forEach((route,i)=>line(route.map(p=>({...p,y:meta.floor+.12})),colors[i],.3));
    meta.terminals.forEach((p,i)=>{box(2.5,2.5,2.5,p.x,p.y+1.2,p.z,colors[i]);box(1.8,.15,1.8,p.x,p.y+2.5,p.z,0xe9fff3);});
    const ring=new T.Mesh(new T.TorusGeometry(3,.18,8,32),new T.MeshBasicMaterial({color:0x99ff9b}));ring.rotation.x=-Math.PI/2;ring.position.set(meta.extraction.x,meta.extraction.y+.1,meta.extraction.z);scene.add(ring);
    const pawns=meta.members.map((m,i)=>{
      const group=new T.Group(),body=new T.Mesh(new T.CapsuleGeometry(.65,1.3,4,8),new T.MeshStandardMaterial({color:colors[i]}));body.position.y=1.3;group.add(body);
      const arrow=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,1.4,0),new T.Vector3(0,1.4,-2.5)]),new T.LineBasicMaterial({color:0xffffff}));group.add(arrow);scene.add(group);return group;
    });
    let initialized=false;
    resize=()=>{const w=container.clientWidth,h=container.clientHeight,aspect=w/Math.max(1,h),half=Math.max((b.z1-b.z0)*.7,(b.x1-b.x0)/aspect*.6,40);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    draw=dt=>{
      if(state){for(let i=0;i<2;i++){const p=state.players.find(p=>p.id===meta.members[i].id),pawn=pawns[i];if(!p)continue;
        if(!initialized)pawn.position.set(p.x,p.y,p.z);else pawn.position.lerp(new T.Vector3(p.x,p.y,p.z),1-Math.exp(-dt/65));pawn.rotation.y=p.hd;
      }initialized=true;ring.material.color.setHex(state.phase==='won'?0xffe98c:0x99ff9b);}
      renderer.render(scene,camera);
    };
    dispose=()=>{scene.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});renderer.dispose();};
  }catch(_){
    // A Canvas map keeps the same mission playable on devices without WebGL.
    const flat=document.createElement('canvas');displayed=flat;container.replaceChildren(flat);const ctx=flat.getContext('2d');
    resize=()=>{flat.width=Math.max(1,container.clientWidth)*Math.min(2,devicePixelRatio||1);flat.height=Math.max(1,container.clientHeight)*Math.min(2,devicePixelRatio||1);};
    draw=()=>{
      if(!ctx)return;const w=flat.width,h=flat.height,scale=Math.min(w/(b.x1-b.x0+10),h/(b.z1-b.z0+10)),x=v=>w/2+(v-cx)*scale,z=v=>h/2+(v-cz)*scale;
      ctx.fillStyle='#314f3e';ctx.fillRect(0,0,w,h);ctx.fillStyle='#70835b';ctx.fillRect(x(b.x0),z(b.z0),(b.x1-b.x0)*scale,(b.z1-b.z0)*scale);
      for(const wall of geometry.walls)if(!wall.open){ctx.fillStyle=wall.playerBlock===false?'#bbb998':'#c2c7b7';ctx.fillRect(x(wall.x0),z(wall.z0),Math.max(1,(wall.x1-wall.x0)*scale),Math.max(1,(wall.z1-wall.z0)*scale));}
      meta.routes.forEach((path,i)=>{ctx.beginPath();path.forEach((p,j)=>j?ctx.lineTo(x(p.x),z(p.z)):ctx.moveTo(x(p.x),z(p.z)));ctx.strokeStyle=css[i];ctx.globalAlpha=.3;ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;});
      const circle=(p,r,color,label)=>{ctx.beginPath();ctx.arc(x(p.x),z(p.z),r*scale,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(label){ctx.fillStyle='#132327';ctx.font='bold '+Math.max(12,2*scale)+'px system-ui';ctx.textAlign='center';ctx.fillText(label,x(p.x),z(p.z)+scale*.7);}};
      circle(meta.extraction,3,'#a2efa2','E');meta.terminals.forEach((p,i)=>circle(p,2,css[i],String(i+1)));
      if(state)state.players.forEach(p=>{const i=meta.members.findIndex(m=>m.id===p.id);circle(p,1,css[i]);ctx.beginPath();ctx.moveTo(x(p.x),z(p.z));ctx.lineTo(x(p.x-Math.sin(p.hd)*3),z(p.z-Math.cos(p.hd)*3));ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();});
    };
  }
  resize();const observer=new ResizeObserver(resize);observer.observe(container);let frame;
  function loop(now){if(destroyed)return;draw(Math.min(100,now-last));last=now;frame=requestAnimationFrame(loop);}frame=requestAnimationFrame(loop);
  return {setState(value){state=value;},destroy(){destroyed=true;cancelAnimationFrame(frame);observer.disconnect();dispose();if(displayed.parentNode===container)displayed.remove();}};
}
