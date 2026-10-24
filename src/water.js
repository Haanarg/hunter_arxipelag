// Sistema visual de l'aigua, desacoblat de la simulació del joc.
window.HUNTER_WATER_SYSTEM=Object.freeze({
  create(THREE,{scene,sunDir,size,segments,heightAt,config,reflections=true,coastDetail=false,fogColor=0xc99f91,initialSegments=segments}){
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
      waterFog:{value:config.fogDensity},
      fogHorizon:{value:new THREE.Color(fogColor)}
    };
    const material=new THREE.ShaderMaterial({
      uniforms,
      // Només el mar consulta la màscara; la resta del món conserva el depth test habitual.
      stencilWrite:true,stencilRef:0,stencilFunc:THREE.EqualStencilFunc,
      stencilFail:THREE.KeepStencilOp,stencilZFail:THREE.KeepStencilOp,stencilZPass:THREE.KeepStencilOp,
      vertexShader:`uniform float time;attribute float seabed;varying vec3 worldP;varying float bed;
${model.glsl}
void main(){vec3 p=position;bed=seabed;p.y=hunterWaveHeight(p.xz,time,seabed);worldP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:reflections?`uniform vec3 light,shallow,deep,horizon,sunGlint,foamColor;uniform float time,fresnelStrength,absorptionDepth,waterFog;varying vec3 worldP;varying float bed;void main(){if(bed>worldP.y+.12)discard;vec3 n=normalize(cross(dFdx(worldP),dFdy(worldP)));if(n.y<0.)n=-n;vec3 v=normalize(cameraPosition-worldP);float nv=max(dot(n,v),0.);float nd=max(dot(n,light),0.);float fres=pow(1.-nv,3.)*fresnelStrength;float spec=pow(max(dot(reflect(-light,n),v),0.),88.);float depth=max(0.,worldP.y-bed);float absorb=1.-exp(-depth/max(absorptionDepth,.01));vec3 c=mix(shallow,deep,clamp(absorb,0.,1.));c*=.78+nd*.48;c=mix(c,horizon,fres);c+=sunGlint*spec*(.65+fres);float zone=(1.-smoothstep(1.8,4.6,depth))*smoothstep(-.1,.22,depth);float crest=pow(clamp(1.-n.y,0.,1.),1.6);float breaker=pow(.5+.5*sin(depth*5.-time*3.8+sin(worldP.x*.16+worldP.z*.12)*.6),7.);float foam=zone*breaker*.82+crest*zone*.55+(1.-smoothstep(.05,.35,depth))*.36;c=mix(c,foamColor,clamp(foam,0.,.92));float dist=distance(cameraPosition,worldP);float fog=1.-exp(-dist*waterFog);c=mix(c,horizon,fog*.72);gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`: `uniform vec3 shallow,deep,foamColor,fogHorizon;
uniform float absorptionDepth;
varying vec3 worldP;
varying float bed;
void main(){
  if(bed>worldP.y+.12)discard;
  // Perfil mínim: l'aigua té color i escuma lleugera, però no calcula
  // reflexos especulars, Fresnel ni normals derivades per fragment.
  float depth=max(0.,worldP.y-bed);
  float waterDepth=depth/(depth+max(8.,absorptionDepth*.8));
  vec3 c=mix(shallow,deep,waterDepth);
  float shoreline=(1.-smoothstep(0.1,1.8,depth))*.22;
  c=mix(c,foamColor,shoreline);
  float distanceToCamera=distance(cameraPosition,worldP);
  c=mix(c,fogHorizon,smoothstep(720.,1400.,distanceToCamera));
  gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`
    });
    // Un mar inicial més lleuger fa possible el primer fotograma ràpid.
    // La malla completa es prepara per franges, sense substituir la malla
    // visible fins que les dades de batimetria estan acabades.
    let worldSize=size,span=size+2200,
        resolution=Math.min(segments,Math.max(16,Math.floor(initialSegments)));
    const makeGeometry=(n=resolution)=>{
      const g=new THREE.PlaneGeometry(span,span,n,n).rotateX(-Math.PI/2);
      g.setAttribute('seabed',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count),1));
      g.computeBoundingBox();g.boundingBox.min.y=-model.maxDisplacement;g.boundingBox.max.y=model.maxDisplacement;
      g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Math.hypot(span/Math.sqrt(2),model.maxDisplacement));
      return g;
    };
    let geometry=makeGeometry(),refinement=null;
    const mesh=new THREE.Mesh(geometry,material);mesh.name='hunter-water';mesh.renderOrder=2;scene.add(mesh);
    const deep=new THREE.Mesh(new THREE.PlaneGeometry(30000,30000).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x062679}));
    deep.position.y=-90;scene.add(deep);
    const shore=coastDetail?window.HUNTER_COAST_FOAM.create(THREE,{
      scene,model,heightAt,time:uniforms.time,foamColor:config.foam
    }):null;
    const seabedStats={lastSamples:0,totalVertices:0};
    // Exactament el mateix càlcul que el mostreig síncron anterior, però
    // dividit en files per poder-lo repartir entre fotogrames.
    const sampler=(g,nseg)=>{
      const p=g.attributes.position,b=g.attributes.seabed,
            width=nseg+1,stride=nseg>=300?3:2,stops=[];
      for(let i=0;i<nseg;i+=stride)stops.push(i);
      stops.push(nseg);
      const n=stops.length,coarse=new Float32Array(n*n),arr=b.array;
      let coarseRow=0,fillRow=0,samples=0,done=false;
      const step=(units=4)=>{
        for(let unit=0;unit<units&&!done;unit++){
          if(coarseRow<n){
            for(let rx=0;rx<n;rx++){
              const id=stops[coarseRow]*width+stops[rx];
              coarse[coarseRow*n+rx]=heightAt(p.getX(id),p.getZ(id));samples++;
            }
            coarseRow++;continue;
          }
          if(fillRow<n-1){
            const rz=fillRow++;
            for(let rx=0;rx<n-1;rx++){
              const za=stops[rz],zb=stops[rz+1],xa=stops[rx],xb=stops[rx+1],
                    a=coarse[rz*n+rx],bb=coarse[rz*n+rx+1],
                    c=coarse[(rz+1)*n+rx],d=coarse[(rz+1)*n+rx+1],
                    exactCoast=Math.min(a,bb,c,d)<14&&Math.max(a,bb,c,d)>-14;
              for(let iz=za;iz<(rz===n-2?zb+1:zb);iz++){
                const tz=(iz-za)/(zb-za),row=iz*width;
                for(let ix=xa;ix<(rx===n-2?xb+1:xb);ix++){
                  const tx=(ix-xa)/(xb-xa),
                        h=(a*(1-tx)+bb*tx)*(1-tz)+(c*(1-tx)+d*tx)*tz,
                        index=row+ix;
                  if(exactCoast||(h>-14&&h<14)){
                    arr[index]=heightAt(p.getX(index),p.getZ(index));samples++;
                  }else arr[index]=h;
                }
              }
            }
            continue;
          }
          b.needsUpdate=true;done=true;
        }
        return done;
      };
      return {step,get samples(){return samples},vertices:p.count};
    };
    function* updateSeabedSteps(){
      const job=sampler(geometry,resolution);let rows=0;
      while(!job.step(1))yield {stage:'Fons marí',completed:++rows,total:null,unit:'files'};
      seabedStats.lastSamples=job.samples;seabedStats.totalVertices=job.vertices;
      if(shore)yield* shore.regenerateSteps(geometry,resolution);
    }
    const updateSeabed=()=>{const steps=updateSeabedSteps();while(!steps.next().done){}};
    const queueResolutionUpgrade=()=>{
      if(resolution>=segments||refinement)return false;
      const nextGeometry=makeGeometry(segments);
      refinement={geometry:nextGeometry,task:sampler(nextGeometry,segments)};
      return true;
    };
    const stepResolutionUpgrade=(budget=3)=>{
      if(!refinement)return resolution>=segments;
      if(!refinement.task.step(Math.max(1,Math.floor(budget))))return false;
      const old=geometry;
      geometry=refinement.geometry;resolution=segments;mesh.geometry=geometry;
      seabedStats.lastSamples=refinement.task.samples;
      seabedStats.totalVertices=refinement.task.vertices;
      refinement=null;old.dispose();
      if(shore)shore.regenerate(geometry,resolution);
      return true;
    };
    const cancelRefinement=()=>{
      if(refinement){refinement.geometry.dispose();refinement=null}
    };
    function* setWorldSizeSteps(value){
      cancelRefinement();
      if(value!==worldSize){
        worldSize=value;span=value+2200;
        const old=geometry;geometry=makeGeometry();mesh.geometry=geometry;old.dispose();
      }
      yield* updateSeabedSteps();
    }
    const setWorldSize=value=>{const steps=setWorldSizeSteps(value);while(!steps.next().done){}};
    // Barycentric interpolation of the SAME vertices/triangles displaced by the shader.
    // This avoids floating above/below the rendered surface on coarse mobile meshes.
    const surfaceHeight=(x,z,time)=>{
      if(Math.abs(x)>span/2||Math.abs(z)>span/2)return model.height(x,z,time,heightAt(x,z));
      const p=geometry.attributes.position,b=geometry.attributes.seabed,stride=resolution+1;
      const ix=Math.min(resolution-1,Math.max(0,Math.floor((x/span+.5)*resolution)));
      const iz=Math.min(resolution-1,Math.max(0,Math.floor((z/span+.5)*resolution)));
      const a=iz*stride+ix,c=a+stride+1,d=a+1,bb=a+stride;
      const fx=Math.max(0,Math.min(1,(x-p.getX(a))/(p.getX(d)-p.getX(a))));
      const fz=Math.max(0,Math.min(1,(z-p.getZ(a))/(p.getZ(bb)-p.getZ(a))));
      const h=i=>model.height(p.getX(i),p.getZ(i),time,b.getX(i));
      return fx+fz<=1?h(a)*(1-fx-fz)+h(d)*fx+h(bb)*fz:h(c)*(fx+fz-1)+h(bb)*(1-fx)+h(d)*(1-fz);
    };
    const update=t=>{uniforms.time.value=t};
    const dispose=()=>{cancelRefinement();if(shore)shore.dispose();scene.remove(mesh,deep);geometry.dispose();material.dispose();deep.geometry.dispose();deep.material.dispose()};
    return {mesh,deep,shore:shore?.mesh||null,shoreStats:shore?.stats||{segments:0},
      material,get geometry(){return geometry},get resolution(){return resolution},uniforms,updateSeabed,updateSeabedSteps,setWorldSize,setWorldSizeSteps,queueResolutionUpgrade,stepResolutionUpgrade,surfaceHeight,update,dispose,seabedStats};
  }
});

