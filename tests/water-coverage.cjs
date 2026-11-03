// Regression: the marine shader must not carve holes with interpolated seabed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/water.js'),'utf8');
const scene={add(){},remove(){}};
class Geometry {
  constructor(){this.attributes={position:{count:4}};}
  rotateX(){return this;}
  setAttribute(n,v){this.attributes[n]=v;return this;}
  computeBoundingBox(){this.boundingBox={min:{y:0},max:{y:0}};}
  dispose(){}
}
class Mesh {constructor(geometry,material){this.geometry=geometry;this.material=material;this.position={y:0};}}
class ShaderMaterial {constructor(options){Object.assign(this,options);}}
class Vector3 {constructor(...v){this.values=v;}}
class Color {constructor(v){this.value=v;}}
class Attribute {constructor(v){this.array=v;}}
class Sphere {constructor(){}}
const THREE={Vector3,Color,ShaderMaterial,PlaneGeometry:Geometry,Mesh,MeshBasicMaterial:class{},Float32BufferAttribute:Attribute,
  EqualStencilFunc:1,KeepStencilOp:0,Sphere};
const context={window:{HUNTER_WAVES:{glsl:'float hunterWaveHeight(vec2 p,float time,float bed){return 0.;}',maxDisplacement:1}}};
vm.runInNewContext(source,context);
for(const reflections of [true,false]){
  const water=context.window.HUNTER_WATER_SYSTEM.create(THREE,{scene,sunDir:{},size:100,segments:20,initialSegments:20,heightAt:()=>20,
    config:{shallow:[0,1,1],deep:[0,0,1],horizon:[1,1,1],sunGlint:[1,1,1],foam:[1,1,1],fresnelStrength:1,absorptionDepth:25,fogDensity:0.001},
    reflections,coastDetail:false});
  assert.equal(water.material.depthTest,true);
  assert.equal(water.material.depthWrite,true);
  assert.doesNotMatch(water.material.fragmentShader,/if\s*\(\s*bed\s*>\s*worldP\.y/);
  assert.doesNotMatch(water.material.fragmentShader,/discard/);
}
console.log('water coverage shader: both quality modes use GPU depth, no bathymetry holes');
