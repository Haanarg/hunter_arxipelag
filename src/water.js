// Sistema visual de l'aigua, desacoblat de la simulació del joc.
window.HUNTER_WATER_SYSTEM=Object.freeze({
  create(THREE,{scene,sunDir,size,segments,heightAt,config}){
    const uniforms={
      time:{value:0},light:{value:sunDir},
      shallow:{value:new THREE.Vector3(...config.shallow)},
      deep:{value:new THREE.Vector3(...config.deep)},
      horizon:{value:new THREE.Vector3(...config.horizon)},
      sunGlint:{value:new THREE.Vector3(...config.sunGlint)},
      foamColor:{value:new THREE.Vector3(...config.foam)},
      fresnelStrength:{value:config.fresnelStrength},
      absorptionDepth:{value:config.absorptionDepth},
      waterFog:{value:config.fogDensity}
    };
    const material=new THREE.ShaderMaterial({
      uniforms,extensions:{derivatives:true},
      vertexShader:`uniform float time;attribute float seabed;varying vec3 worldP;varying float bed;void main(){vec3 p=position;bed=seabed;float amp=clamp((-seabed+.6)/9.,.12,1.);p.y=(sin(p.x*.03+time*1.2)*.9+cos(p.z*.04+time*.9)*.9+sin((p.x+p.z)*.07+time*2.)*.4)*amp;worldP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`uniform vec3 light,shallow,deep,horizon,sunGlint,foamColor;uniform float time,fresnelStrength,absorptionDepth,waterFog;varying vec3 worldP;varying float bed;void main(){if(bed>worldP.y+.12)discard;vec3 n=normalize(cross(dFdx(worldP),dFdy(worldP)));if(n.y<0.)n=-n;vec3 v=normalize(cameraPosition-worldP);float nv=max(dot(n,v),0.);float nd=max(dot(n,light),0.);float fres=pow(1.-nv,3.)*fresnelStrength;float spec=pow(max(dot(reflect(-light,n),v),0.),88.);float depth=max(0.,worldP.y-bed);float absorb=1.-exp(-depth/max(absorptionDepth,.01));vec3 c=mix(shallow,deep,clamp(absorb,0.,1.));c*=.78+nd*.48;c=mix(c,horizon,fres);c+=sunGlint*spec*(.65+fres);float zone=(1.-smoothstep(1.8,4.6,depth))*smoothstep(-.1,.22,depth);float crest=pow(clamp(1.-n.y,0.,1.),1.6);float breaker=pow(.5+.5*sin(depth*5.-time*3.8+sin(worldP.x*.16+worldP.z*.12)*.6),7.);float foam=zone*breaker*.82+crest*zone*.55+(1.-smoothstep(.05,.35,depth))*.36;c=mix(c,foamColor,clamp(foam,0.,.92));float dist=distance(cameraPosition,worldP);float fog=1.-exp(-dist*waterFog);c=mix(c,horizon,fog*.72);gl_FragColor=vec4(c,1.);}`
    });
    const geometry=new THREE.PlaneGeometry(size+2200,size+2200,segments,segments).rotateX(-Math.PI/2);
    geometry.setAttribute('seabed',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count),1));
    const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
    const deep=new THREE.Mesh(new THREE.PlaneGeometry(30000,30000).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x062679}));
    deep.position.y=-90;scene.add(deep);
    const updateSeabed=()=>{const p=geometry.attributes.position,b=geometry.attributes.seabed;for(let i=0;i<p.count;i++)b.setX(i,heightAt(p.getX(i),p.getZ(i)));b.needsUpdate=true};
    const update=t=>{uniforms.time.value=t};
    return {mesh,deep,material,geometry,uniforms,updateSeabed,update};
  }
});
