(async()=>{
  // Three.js real: perfils, pla llunyà, cúpula, mar sense reflexos i selector.
  const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
  const root=path.resolve(__dirname,'..');
  const THREE=await import(require('url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
  const configContext=vm.createContext({console,Math});configContext.window=configContext;
  for(const file of ['src/visual-config.js','src/water-config.js','src/waves.js','src/water.js','src/rendering.js'])
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),configContext,{filename:file});
  const configs=configContext.HUNTER_VISUAL_CONFIG;
  assert(configs.ultra&&configs.mobile&&configs.desktop);
  assert(configs.ultra.pixelRatio<configs.mobile.pixelRatio);
  assert(configs.ultra.waterSegments<configs.mobile.waterSegments);
  assert(configs.ultra.viewDistance===1500&&configs.ultra.waterReflections===false);
  assert(!configs.ultra.shadows);
  class MockRenderer {
    constructor(){this.domElement={};this.shadowMap={};}
    setPixelRatio(value){this.pixelRatio=value}
    setSize(width,height){this.width=width;this.height=height}
  }
  const T=Object.assign({},THREE,{WebGLRenderer:MockRenderer});
  const render=profile=>vm.runInContext('window.HUNTER_RENDERING',configContext).create(T,profile);
  const rc=vm.createContext({
    window:configContext,console,Math,THREE:T,
    devicePixelRatio:2,innerWidth:800,innerHeight:600
  });
  // Evaluate rendering.js in this context so browser globals are available.
  vm.runInContext(fs.readFileSync(path.join(root,'src/rendering.js'),'utf8'),rc);
  const rendererFactory=rc.window.HUNTER_RENDERING;
  const low=rendererFactory.create(T,configs.ultra);
  const normal=rendererFactory.create(T,configs.mobile);
  assert.equal(low.camera.far,1500,'ultra far plane shortens drawing distance');
  assert.equal(normal.camera.far,12000,'original mobile far plane unchanged');
  assert(low.sky.geometry.parameters.radius<low.camera.far,'sky stays inside short far plane');
  assert.equal(normal.sky.geometry.parameters.radius,8000,'original sky unaffected');
  assert.equal(low.renderer.pixelRatio,.8,'ultra starts with fixed lower pixel ratio');
  assert.equal(low.renderer.shadowMap.enabled,false);
  const water=opts=>configContext.HUNTER_WATER_SYSTEM.create(THREE,{
    scene:new THREE.Scene(),sunDir:new THREE.Vector3(.3,.24,-1).normalize(),
    size:4800,segments:opts.segments,heightAt:()=>-20,
    config:configContext.HUNTER_WATER,reflections:opts.reflections,
    fogColor:low.scene.fog.color
  });
  const ultraWater=water({segments:configs.ultra.waterSegments,reflections:false});
  const mobileWater=water({segments:configs.mobile.waterSegments,reflections:true});
  assert(!ultraWater.material.fragmentShader.includes('reflect(-light,n)'),
    'ultra must not compile reflection calculations');
  assert(!ultraWater.material.fragmentShader.includes('dFdx('),
    'ultra avoids expensive per-fragment normals');
  assert(!ultraWater.material.fragmentShader.includes('fresnelStrength'),
    'ultra removes Fresnel calculations');
  assert(ultraWater.material.fragmentShader.includes('smoothstep(720.,1400.,distanceToCamera)'),
    'ocean fades into fog before the 1500m far plane');
  assert(mobileWater.material.fragmentShader.includes('reflect(-light,n)'),
    'regular mobile water reflections preserved');
  assert(ultraWater.material.vertexShader.includes('hunterWaveHeight('),
    'ultra keeps physically consistent wave vertices');
  assert.equal(ultraWater.geometry.attributes.position.count,121*121);
  assert.equal(mobileWater.geometry.attributes.position.count,201*201);
  ultraWater.updateSeabed();
  assert(Number.isFinite(ultraWater.surfaceHeight(0,0,1.5)));
  for(const mat of [ultraWater.material,mobileWater.material])
    for(const match of mat.fragmentShader.matchAll(/#include <([^>]+)>/g))
      assert(THREE.ShaderChunk[match[1]],'unavailable shader chunk');
  ultraWater.dispose();mobileWater.dispose();

  const bootstrap=fs.readFileSync(path.join(root,'src/bootstrap.mjs'),'utf8');
  const beginning=bootstrap.indexOf("const graphicsQuality=document.getElementById('graphicsQuality')");
  const end=bootstrap.indexOf('// Pont temporal:',beginning);
  assert(beginning>=0&&end>beginning,'bootstrap quality controls exist');
  const selectionCode=bootstrap.slice(beginning,end);
  function selection(search,coarse=false){
    const element={value:'',listeners:{},addEventListener(event,fn){this.listeners[event]=fn}};
    const loc={href:'https://hunter.invalid/'+search,search,replaced:null,
      replace(url){this.replaced=url}};
    const ctx=vm.createContext({window:{},location:loc,document:{
      getElementById:id=>id==='graphicsQuality'?element:null
    },matchMedia:()=>({matches:coarse}),URL,URLSearchParams});
    vm.runInContext(selectionCode,ctx);
    return {element,loc,quality:ctx.window.HUNTER_GRAPHICS_QUALITY};
  }
  assert.equal(selection('',false).quality,'desktop');
  assert.equal(selection('',true).quality,'mobile');
  assert.equal(selection('?low=1').quality,'mobile','old URL is supported');
  const ultraselect=selection('?quality=ultra',true);
  assert.equal(ultraselect.quality,'ultra');
  assert.equal(ultraselect.element.value,'ultra');
  ultraselect.element.value='mobile';ultraselect.element.listeners.change();
  assert(ultraselect.loc.replaced.includes('quality=mobile'),
    'selector updates quality and reloads');
  assert(!ultraselect.loc.replaced.includes('low=1'),
    'selector removes legacy flag');
  console.log(JSON.stringify({passed:true,profiles:3,ultraViewDistance:low.camera.far,
    ultraWaterTriangles:ultraWater.geometry.index.count/3,
    oldMobileReflections:true,qualitySelector:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
