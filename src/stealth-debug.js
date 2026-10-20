// Volums de percepció, només creats quan el jugador activa el depurador.
window.HUNTER_STEALTH_DEBUG=(()=>{
  let group=null,cone=null,sphere=null,noiseSphere=null,materialSight=null,
    materialHearing=null,materialNoise=null,entries=new Map(),pulses=[];
  const ring=(T,color,n=64)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3));return new T.LineLoop(g,new T.LineBasicMaterial({color,depthWrite:false}))};
  const trace=(line,x,z,r,hd=0,half=null)=>{const a=line.geometry.attributes.position,n=a.count;for(let i=0;i<n;i++){const t=half===null?i*2*Math.PI/n:i===0?null:-half+(i-1)*2*half/(n-2),px=x+(t===null?0:Math.sin(t+hd)*r),pz=z+(t===null?0:-Math.cos(t+hd)*r);a.setXYZ(i,px,Math.max(0,hAt(px,pz))+.25,pz)}a.needsUpdate=true;line.geometry.computeBoundingSphere()};
  function create(THREE,world){
    group=new THREE.Group();group.name='stealth-debug-volumes';world.add(group);
    const cfg=window.HUNTER_STEALTH.CONFIG,vertices=[],r=cfg.sightRange,
          horizontal=r*Math.cos(cfg.sightVerticalAngle),
          vertical=r*Math.sin(cfg.sightVerticalAngle),segments=18;
    // Con cònic truncat per un arc de 85 m: no excedeix la distància
    // màxima de detecció als costats com faria ConeGeometry.
    for(let i=0;i<segments;i++){
      const a=-cfg.sightHalfAngle+cfg.sightHalfAngle*2*i/segments,
            b=-cfg.sightHalfAngle+cfg.sightHalfAngle*2*(i+1)/segments,
            ax=Math.sin(a)*horizontal,az=-Math.cos(a)*horizontal,
            bx=Math.sin(b)*horizontal,bz=-Math.cos(b)*horizontal;
      vertices.push(0,0,0,ax,vertical,az,bx,vertical,bz,
        0,0,0,bx,-vertical,bz,ax,-vertical,az,
        ax,vertical,az,ax,-vertical,az,bx,vertical,bz,
        bx,vertical,bz,ax,-vertical,az,bx,-vertical,bz);
    }
    cone=new THREE.BufferGeometry();cone.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));cone.computeVertexNormals();
    sphere=new THREE.SphereGeometry(1,12,8);noiseSphere=new THREE.SphereGeometry(1,10,6);
    materialSight=new THREE.MeshBasicMaterial({color:0x49f28b,transparent:true,opacity:.19,
      depthWrite:false,side:THREE.DoubleSide});
    materialHearing=new THREE.MeshBasicMaterial({color:0xf6b740,transparent:true,opacity:.14,
      depthWrite:false,side:THREE.DoubleSide});
    materialNoise=new THREE.MeshBasicMaterial({color:0xff6556,transparent:true,opacity:.075,
      depthWrite:false,side:THREE.DoubleSide});
  }
  function reset(){
    if(group?.parent)group.parent.remove(group);
    for(const g of [cone,sphere,noiseSphere])g?.dispose();
    for(const v of entries.values()){v.sl.geometry.dispose();v.hl.geometry.dispose();v.sl.material.dispose();v.hl.material.dispose()}
    for(const p of pulses){p.line.geometry.dispose();p.line.material.dispose()}
    for(const m of [materialSight,materialHearing,materialNoise])m?.dispose();
    group=cone=sphere=noiseSphere=null;entries.clear();pulses=[];
  }
  function update(THREE,world,enemies,player){
    const active=window.HUNTER_STEALTH.enabled();
    if(!active){if(group)group.visible=false;return}
    if(!group||group.parent!==world){reset();create(THREE,world)}
    group.visible=true;
    const layers=window.HUNTER_STEALTH.layers(),visible=new Set(),maxD=210;
    for(const u of enemies){
      if(u.t!=='soldat'||Math.hypot(u.x-player.x,u.z-player.z)>maxD)continue;
      visible.add(u);
      let v=entries.get(u);
      if(!v){
        const sight=new THREE.Mesh(cone,materialSight),hearing=new THREE.Mesh(sphere,materialHearing);
        const sl=ring(THREE,0x49f28b,38),hl=ring(THREE,0xf6b740);
        sight.renderOrder=10;hearing.renderOrder=10;group.add(sight,hearing,sl,hl);
        v={sight,hearing,sl,hl};entries.set(u,v);
      }
      v.sight.visible=v.sl.visible=layers.sight;v.hearing.visible=v.hl.visible=layers.hearing;
      v.sight.position.set(u.x,u.o.position.y+2.2,u.z);
      v.sight.rotation.y=u.hd;
      v.hearing.position.set(u.x,u.o.position.y+1.5,u.z);
      v.hearing.scale.setScalar(window.HUNTER_STEALTH.CONFIG.hearingReference);
      if(layers.sight)trace(v.sl,u.x,u.z,window.HUNTER_STEALTH.CONFIG.sightRange*Math.cos(window.HUNTER_STEALTH.CONFIG.sightVerticalAngle),u.hd,window.HUNTER_STEALTH.CONFIG.sightHalfAngle);
      if(layers.hearing)trace(v.hl,u.x,u.z,window.HUNTER_STEALTH.CONFIG.hearingReference);
    }
    for(const [u,v] of entries){
      if(visible.has(u))continue;
      group.remove(v.sight,v.hearing,v.sl,v.hl);v.sl.geometry.dispose();v.hl.geometry.dispose();v.sl.material.dispose();v.hl.material.dispose();entries.delete(u);
    }
    const events=layers.noise?window.HUNTER_STEALTH.events().filter(e=>e.age<.85).slice(-8):[];
    while(pulses.length<events.length){
      const mesh=new THREE.Mesh(noiseSphere,materialNoise);mesh.renderOrder=11;
      const line=ring(THREE,0xff6556);group.add(mesh,line);pulses.push({mesh,line});
    }
    pulses.forEach(({mesh,line},i)=>{
      const e=events[i];mesh.visible=line.visible=!!e;
      if(e){mesh.position.set(e.x,e.y,e.z);mesh.scale.setScalar(e.radius);trace(line,e.x,e.z,e.radius)}
    });
  }
  return Object.freeze({update,reset});
})();
