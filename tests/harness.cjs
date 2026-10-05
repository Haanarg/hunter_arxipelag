const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=function createGame(root=path.resolve(__dirname,'..')){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  const noop=()=>{},els=new Map(),storage=new Map();let nextFrame,now=1000;
  const ctx2d=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
  function el(id){if(!els.has(id))els.set(id,{style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},innerHTML:'',textContent:'',hidden:false,width:170,height:170,addEventListener:noop,setPointerCapture:noop,focus:noop,querySelector:()=>el('knob'),querySelectorAll:()=>[],getContext:()=>ctx2d,toDataURL:()=>'',prepend:noop,append:noop,getBoundingClientRect:()=>({left:0,top:0,width:510,height:510})});return els.get(id)}
  const button=el('normal');button.dataset.d='1';el('mapSize').value='1';el('seedRandom').checked=false;el('seedInput').value='12345';
  const document={getElementById:el,querySelector:()=>el('mapSize'),querySelectorAll:s=>s==='#ini button[data-d]'?[button]:[],createElement:()=>el(Symbol()),addEventListener:noop,body:el('body')};
  const c=vm.createContext({Math,console,document,innerWidth:1360,innerHeight:900,devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:noop,performance:{now:()=>now},requestAnimationFrame:fn=>{nextFrame=fn},Uint8ClampedArray,Float32Array,setTimeout:noop,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});c.window=c;
  class Renderer{constructor(){this.domElement=el('canvas');this.shadowMap={}}setPixelRatio(){}setSize(){}render(scene,cam){scene.updateMatrixWorld();cam.updateMatrixWorld()}}
  let patched=false;
  for(const match of scripts){const src=match[1].match(/src="([^"]+)"/),code=src?fs.readFileSync(path.join(root,src[1]),'utf8'):match[2];vm.runInContext(code,c,{filename:src?src[1]:'index-inline',timeout:60000});if(c.THREE&&!patched){c.THREE.WebGLRenderer=Renderer;patched=true}}
  const run=s=>vm.runInContext(s,c,{timeout:120000});
  return {run,el,start(seed='12345',scale=1){el('seedInput').value=seed;el('mapSize').value=String(scale);button.onclick()},frame(ms=16){now+=ms;nextFrame(now)},context:c};
};
