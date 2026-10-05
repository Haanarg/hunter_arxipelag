// Sistema visual de l'aigua, desacoblat de la simulació del joc.
window.HUNTER_WATER_SYSTEM=Object.freeze({
  create(THREE,{scene,sunDir,size,segments,heightAt,config}){
    const model=window.HUNTER_WAVES;
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
      uniforms,
      vertexShader:`uniform float time;attribute float seabed;varying vec3 worldP;varying float bed;
${model.glsl}
void main(){vec3 p=position;bed=seabed;p.y=hunterWaveHeight(p.xz,time,seabed);worldP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`uniform vec3 light,shallow,deep,horizon,sunGlint,foamColor;uniform float time,fresnelStrength,absorptionDepth,waterFog;varying vec3 worldP;varying float bed;void main(){if(bed>worldP.y+.12)discard;vec3 n=normalize(cross(dFdx(worldP),dFdy(worldP)));if(n.y<0.)n=-n;vec3 v=normalize(cameraPosition-worldP);float nv=max(dot(n,v),0.);float nd=max(dot(n,light),0.);float fres=pow(1.-nv,3.)*fresnelStrength;float spec=pow(max(dot(reflect(-light,n),v),0.),88.);float depth=max(0.,worldP.y-bed);float absorb=1.-exp(-depth/max(absorptionDepth,.01));vec3 c=mix(shallow,deep,clamp(absorb,0.,1.));c*=.78+nd*.48;c=mix(c,horizon,fres);c+=sunGlint*spec*(.65+fres);float zone=(1.-smoothstep(1.8,4.6,depth))*smoothstep(-.1,.22,depth);float crest=pow(clamp(1.-n.y,0.,1.),1.6);float breaker=pow(.5+.5*sin(depth*5.-time*3.8+sin(worldP.x*.16+worldP.z*.12)*.6),7.);float foam=zone*breaker*.82+crest*zone*.55+(1.-smoothstep(.05,.35,depth))*.36;c=mix(c,foamColor,clamp(foam,0.,.92));float dist=distance(cameraPosition,worldP);float fog=1.-exp(-dist*waterFog);c=mix(c,horizon,fog*.72);gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`
    });
    let worldSize=size,span=size+2200;
    const makeGeometry=()=>{
      const g=new THREE.PlaneGeometry(span,span,segments,segments).rotateX(-Math.PI/2);
      g.setAttribute('seabed',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count),1));
      g.computeBoundingBox();g.boundingBox.min.y=-model.maxDisplacement;g.boundingBox.max.y=model.maxDisplacement;
      g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Math.hypot(span/Math.sqrt(2),model.maxDisplacement));
      return g;
    };
    let geometry=makeGeometry();
    const mesh=new THREE.Mesh(geometry,material);mesh.name='hunter-water';scene.add(mesh);
    const deep=new THREE.Mesh(new THREE.PlaneGeometry(30000,30000).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x062679}));
    deep.position.y=-90;scene.add(deep);
    const updateSeabed=()=>{const p=geometry.attributes.position,b=geometry.attributes.seabed;for(let i=0;i<p.count;i++)b.setX(i,heightAt(p.getX(i),p.getZ(i)));b.needsUpdate=true};
    const setWorldSize=value=>{
      if(value!==worldSize){worldSize=value;span=value+2200;const old=geometry;geometry=makeGeometry();mesh.geometry=geometry;old.dispose()}
      updateSeabed();
    };
    // Barycentric interpolation of the SAME vertices/triangles displaced by the shader.
    // This avoids floating above/below the rendered surface on coarse mobile meshes.
    const surfaceHeight=(x,z,time)=>{
      if(Math.abs(x)>span/2||Math.abs(z)>span/2)return model.height(x,z,time,heightAt(x,z));
      const p=geometry.attributes.position,b=geometry.attributes.seabed,stride=segments+1;
      const ix=Math.min(segments-1,Math.max(0,Math.floor((x/span+.5)*segments)));
      const iz=Math.min(segments-1,Math.max(0,Math.floor((z/span+.5)*segments)));
      const a=iz*stride+ix,c=a+stride+1,d=a+1,bb=a+stride;
      const fx=Math.max(0,Math.min(1,(x-p.getX(a))/(p.getX(d)-p.getX(a))));
      const fz=Math.max(0,Math.min(1,(z-p.getZ(a))/(p.getZ(bb)-p.getZ(a))));
      const h=i=>model.height(p.getX(i),p.getZ(i),time,b.getX(i));
      return fx+fz<=1?h(a)*(1-fx-fz)+h(d)*fx+h(bb)*fz:h(c)*(fx+fz-1)+h(bb)*(1-fx)+h(d)*(1-fz);
    };
    const update=t=>{uniforms.time.value=t};
    const dispose=()=>{scene.remove(mesh,deep);geometry.dispose();material.dispose();deep.geometry.dispose();deep.material.dispose()};
    return {mesh,deep,material,get geometry(){return geometry},uniforms,updateSeabed,setWorldSize,surfaceHeight,update,dispose};
  }
});

