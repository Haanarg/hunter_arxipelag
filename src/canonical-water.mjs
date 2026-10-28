// Canonical point samples for server physics, independent from render mesh LOD.
// Parameters/equations match the existing CPU/shader model in waves.js.
export const WATER_MODEL_VERSION='waves:1';
const components=Object.freeze([
  Object.freeze({kind:'sin',x:.03,z:0,speed:1.2,amplitude:.9}),
  Object.freeze({kind:'cos',x:0,z:.04,speed:.9,amplitude:.9}),
  Object.freeze({kind:'sin',x:.07,z:.07,speed:2,amplitude:.4})
]);
const shore=Object.freeze({offset:.6,depth:9,min:.12,max:1});
const amplitude=bed=>Math.max(shore.min,Math.min(shore.max,(-bed+shore.offset)/shore.depth));
const height=(x,z,time,bed)=>components.reduce((sum,w)=>sum+Math[w.kind](x*w.x+z*w.z+time*w.speed)*w.amplitude,0)*amplitude(bed);
const gl=n=>Number.isInteger(n)?n+'.0':String(n),expression=components.map(w=>`${w.kind}(p.x*${gl(w.x)}+p.y*${gl(w.z)}+time*${gl(w.speed)})*${gl(w.amplitude)}`).join('+');
export const waveModel=Object.freeze({components,shore,amplitude,height,
  glsl:`float hunterWaveHeight(vec2 p,float time,float seabed){return (${expression})*clamp((-seabed+${gl(shore.offset)})/${gl(shore.depth)},${gl(shore.min)},${gl(shore.max)});}`,
  maxDisplacement:components.reduce((sum,w)=>sum+w.amplitude,0)});
export function createCanonicalWater(heightAt){
  if(typeof heightAt!=='function')throw new TypeError('Canonical water requires physical terrain');
  return Object.freeze({version:WATER_MODEL_VERSION,surfaceAt(x,z,time){
    if(![x,z,time].every(Number.isFinite)||time<0)throw new RangeError('Invalid canonical water sample');
    const bed=heightAt(x,z);if(!Number.isFinite(bed))throw new RangeError('Invalid canonical seabed');
    const y=height(x,z,time,bed);if(!Number.isFinite(y))throw new RangeError('Invalid canonical wave');return y;
  }});
}
