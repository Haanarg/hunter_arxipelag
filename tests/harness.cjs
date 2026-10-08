const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=async function createGame(root=path.resolve(__dirname,'..')){
  const {runtimeScripts:scripts}=await import(require('url').pathToFileURL(path.join(root,'src/runtime-scripts.mjs')));
  const noop=()=>{},els=new Map(),storage=new Map();let nextFrame,now=1000;
  const ctx2d=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
  function el(id){
    if(!els.has(id)){
      const node={
        style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},
        innerHTML:'',textContent:'',hidden:false,disabled:false,width:170,height:170,
        options:[],selectedIndex:0,children:[],_value:'',
        addEventListener:noop,setPointerCapture:noop,focus:noop,setAttribute:noop,
        querySelector:()=>el('knob'),querySelectorAll:()=>[],
        getContext:()=>ctx2d,toDataURL:()=>'',prepend:noop,
        append(...args){this.children.push(...args)},
        appendChild(child){this.children.push(child);this.options.push(child);return child},
        replaceChildren(...args){this.children=[...args];this.options=[...args];this.selectedIndex=0},
        get value(){return this._value},
        set value(v){this._value=String(v);const i=this.options.findIndex(o=>o.value===this._value);if(i>=0)this.selectedIndex=i},
        getBoundingClientRect:()=>({left:0,top:0,width:510,height:510})
      };
      els.set(id,node);
    }
    return els.get(id);
  }

  const button=el('normal');button.dataset.d='1';el('mapSize').value='1';el('seedRandom').checked=false;el('seedInput').value='12345';el('seedSearchCategory').value='vehicle';
  const document={getElementById:el,querySelector:()=>el('mapSize'),querySelectorAll:s=>s==='#ini button[data-d]'?[button]:[],createElement:()=>el(Symbol()),addEventListener:noop,body:el('body')};
  const c=vm.createContext({Math,console,document,innerWidth:1360,innerHeight:900,devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:noop,performance:{now:()=>now},requestAnimationFrame:fn=>{nextFrame=fn},Uint8ClampedArray,Float32Array,setTimeout:noop,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});c.window=c;
  c.HUNTER_COMPOUND_LAYOUTS=(await import(require("url").pathToFileURL(path.join(root,"src/compound-layouts.mjs")))).compoundLayouts;
  class Renderer{constructor(){this.domElement=el('canvas');this.shadowMap={}}setPixelRatio(){}setSize(){}render(scene,cam){scene.updateMatrixWorld();cam.updateMatrixWorld()}}
  c.THREE={...await import(require('url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs'))),WebGLRenderer:Renderer};
  c.buildingSrc=fs.readFileSync(path.join(root,'src/buildings.js'),'utf8');
  c.worldGenSrc=fs.readFileSync(path.join(root,'src/world-generation.js'),'utf8');
  c.vehSrc=fs.readFileSync(path.join(root,'src/vehicles.js'),'utf8');
  c.riderSrc=fs.readFileSync(path.join(root,'src/rider.js'),'utf8');
  for(const src of scripts)vm.runInContext(fs.readFileSync(path.join(root,src),'utf8'),c,{filename:src,timeout:60000});
  c.VD=c.HUNTER_VEHICLE_DYNAMICS;
  const run=s=>vm.runInContext(s,c,{timeout:120000});
  return {run,el,start(seed='12345',scale=1){el('seedInput').value=seed;el('mapSize').value=String(scale);button.onclick()},frame(ms=16){now+=ms;nextFrame(now)},context:c};
};

