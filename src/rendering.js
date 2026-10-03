// Inicialització visual separada del joc i de la simulació.
window.HUNTER_RENDERING = Object.freeze({
  create(THREE, visualQuality) {
    const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});
    renderer.setPixelRatio(Math.min(devicePixelRatio,visualQuality.pixelRatio));
    renderer.outputEncoding=THREE.sRGBEncoding;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=visualQuality.exposure;
    renderer.physicallyCorrectLights=true;
    renderer.shadowMap.enabled=visualQuality.shadows;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;

    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(60,1,.3,12000);
    scene.fog=new THREE.FogExp2(0xdca59d,visualQuality.fog);

    const hemi=new THREE.HemisphereLight(0xb9dcff,0x31562d,.72);
    scene.add(hemi);

    const sunDir=new THREE.Vector3(.3,.24,-1).normalize();
    const sun=new THREE.DirectionalLight(0xffd1a3,2.15);
    sun.position.copy(sunDir).multiplyScalar(500);
    sun.castShadow=visualQuality.shadows;
    sun.shadow.mapSize.set(visualQuality.shadowSize,visualQuality.shadowSize);
    Object.assign(sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,near:1,far:850});
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias=-.0008;
    sun.shadow.normalBias=.08;
    scene.add(sun);
    scene.add(sun.target);

    const skyGeometry=new THREE.SphereGeometry(8000,visualQuality.skySegments[0],visualQuality.skySegments[1]);
    const colors=[],positions=skyGeometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      const t=Math.max(0,positions.getY(i)/8000);
      const color=new THREE.Color(0xff962f).lerp(new THREE.Color(0x633dc6),Math.pow(t,.45));
      colors.push(color.r,color.g,color.b);
    }
    skyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const sky=new THREE.Mesh(skyGeometry,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false}));
    scene.add(sky);

    const sunMesh=new THREE.Mesh(new THREE.SphereGeometry(110,16,12),new THREE.MeshBasicMaterial({color:0xfff2c0,fog:false}));
    scene.add(sunMesh);

    const resize=()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()};
    return {renderer,scene,camera,sunDir,sun,sky,sunMesh,resize};
  }
});
