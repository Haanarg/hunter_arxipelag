// Frozen v0.6.14 wave model; execute in VM with window={}.
// One immutable wave model drives both CPU samples and the vertex shader.
window.HUNTER_WAVES=(()=>{
  const components=Object.freeze([
    Object.freeze({kind:'sin',x:.03,z:0,speed:1.2,amplitude:.9}),
    Object.freeze({kind:'cos',x:0,z:.04,speed:.9,amplitude:.9}),
    Object.freeze({kind:'sin',x:.07,z:.07,speed:2,amplitude:.4})
  ]);
  const shore=Object.freeze({offset:.6,depth:9,min:.12,max:1});
  const amplitude=bed=>Math.max(shore.min,Math.min(shore.max,(-bed+shore.offset)/shore.depth));
  const height=(x,z,time,bed)=>components.reduce((sum,w)=>sum+Math[w.kind](x*w.x+z*w.z+time*w.speed)*w.amplitude,0)*amplitude(bed);
  const gl=n=>Number.isInteger(n)?n+'.0':String(n);
  const expression=components.map(w=>`${w.kind}(p.x*${gl(w.x)}+p.y*${gl(w.z)}+time*${gl(w.speed)})*${gl(w.amplitude)}`).join('+');
  const glsl=`float hunterWaveHeight(vec2 p,float time,float seabed){return (${expression})*clamp((-seabed+${gl(shore.offset)})/${gl(shore.depth)},${gl(shore.min)},${gl(shore.max)});}`;
  return Object.freeze({components,shore,amplitude,height,glsl,maxDisplacement:components.reduce((sum,w)=>sum+w.amplitude,0)});
})();
