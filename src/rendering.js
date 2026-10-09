// Inicialització visual separada del joc i de la simulació.
window.HUNTER_RENDERING = Object.freeze({
  create(THREE, visualQuality) {
    const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false,stencil:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,visualQuality.pixelRatio));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=visualQuality.exposure;
    renderer.shadowMap.enabled=visualQuality.shadows;
    renderer.shadowMap.type=THREE.PCFShadowMap;

    const scene=new THREE.Scene();
    const viewDistance=visualQuality.viewDistance||12000;
    const camera=new THREE.PerspectiveCamera(58,1,.3,viewDistance);
    scene.fog=new THREE.FogExp2(0xc99f91,visualQuality.fog);

    const hemi=new THREE.HemisphereLight(0xc6e7ff,0x27451e,.82);
    scene.add(hemi);

    const fill=new THREE.DirectionalLight(0x7eb2ff,.32);
    fill.position.set(-250,180,220);
    scene.add(fill);

    const sunDir=new THREE.Vector3(.3,.24,-1).normalize();
    const sun=new THREE.DirectionalLight(0xffcf9a,2.35);
    sun.position.copy(sunDir).multiplyScalar(500);
    sun.castShadow=visualQuality.shadows;
    sun.shadow.mapSize.set(visualQuality.shadowSize,visualQuality.shadowSize);
    Object.assign(sun.shadow.camera,{left:-95,right:95,top:95,bottom:-95,near:1,far:900});
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias=-.0007;
    sun.shadow.normalBias=.07;
    scene.add(sun);
    scene.add(sun.target);

    // La cúpula ha de quedar dins del pla llunyà en el perfil mínim.
    const skyRadius=Math.min(8000,viewDistance*.78);
    const skyGeometry=new THREE.SphereGeometry(
      skyRadius,visualQuality.skySegments[0],visualQuality.skySegments[1]
    );
    const colors=[],positions=skyGeometry.attributes.position;
    const horizon=new THREE.Color(0xffa646);
    const mid=new THREE.Color(0xc76bb6);
    const zenith=new THREE.Color(0x5147b8);
    for(let i=0;i<positions.count;i++){
      const t=Math.max(0,positions.getY(i)/skyRadius);
      const color=t<.35
        ?horizon.clone().lerp(mid,t/.35)
        :mid.clone().lerp(zenith,(t-.35)/.65);
      colors.push(color.r,color.g,color.b);
    }
    skyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const sky=new THREE.Mesh(
      skyGeometry,
      new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false})
    );
    scene.add(sky);

    const sunMesh=new THREE.Mesh(
      new THREE.SphereGeometry(120,20,14),
      new THREE.MeshBasicMaterial({color:0xfff0b0,fog:false})
    );
    scene.add(sunMesh);

    const glow=new THREE.Mesh(
      new THREE.SphereGeometry(175,18,12),
      new THREE.MeshBasicMaterial({
        color:0xffbd65,transparent:true,opacity:.12,depthWrite:false,fog:false
      })
    );
    scene.add(glow);

    const resize=()=>{
      renderer.setSize(innerWidth,innerHeight);
      camera.aspect=innerWidth/innerHeight;
      camera.updateProjectionMatrix()
    };
    return {renderer,scene,camera,sunDir,sun,sky,sunMesh,glow,resize,viewDistance};
  }
});

