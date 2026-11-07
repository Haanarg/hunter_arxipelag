const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=async function createGame(root=path.resolve(__dirname,'..'),options={}){
  const {runtimeScripts:scripts}=await import(require('url').pathToFileURL(path.join(root,'src/runtime-scripts.mjs')));
  const noop=()=>{},els=new Map(),storage=new Map();let nextFrame,now=1000,timerId=0;const timers=[];const gameMath=Object.create(Math);
  function eventTarget(target){
    const listeners=new Map(),captured=new Set();
    Object.assign(target,{
      addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn)},
      removeEventListener(type,fn){listeners.get(type)?.delete(fn)},
      dispatchEvent(event){
        event.target??=this;event.currentTarget=this;event.preventDefault??=()=>{event.defaultPrevented=true};event.stopPropagation??=()=>{};
        for(const fn of [...listeners.get(event.type)||[]])fn.call(this,event);
        return !event.defaultPrevented;
      },
      setPointerCapture(id){captured.add(id)},
      hasPointerCapture(id){return captured.has(id)},
      releasePointerCapture(id){if(captured.delete(id))this.dispatchEvent({type:'lostpointercapture',pointerId:id})}
    });
    return target;
  }
  const ctx2d=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
  function el(id){
    if(!els.has(id)){
      const node=eventTarget({
        style:{},dataset:{},classList:{
          names:new Set(),
          add(...names){for(const name of names)this.names.add(name)},
          remove(...names){for(const name of names)this.names.delete(name)},
          contains(name){return this.names.has(name)},
          toggle(name,force){
            const enable=force===undefined?!this.names.has(name):!!force;
            if(enable)this.names.add(name);else this.names.delete(name);
            return enable
          }
        },
        innerHTML:'',textContent:'',hidden:false,disabled:false,width:170,height:170,
        options:[],selectedIndex:0,children:[],_value:'',
        focus:noop,remove:noop,attributes:new Map(),
        setAttribute(k,v){this.attributes.set(k,String(v))},
        getAttribute(k){return this.attributes.get(k)??null},
        removeAttribute(k){this.attributes.delete(k);delete this[k]},
        querySelector:()=>el('knob'),querySelectorAll:()=>[],
        getContext:()=>ctx2d,toDataURL:()=>'',prepend:noop,
        append(...args){this.children.push(...args)},
        appendChild(child){this.children.push(child);this.options.push(child);return child},
        replaceChildren(...args){this.children=[...args];this.options=[...args];this.selectedIndex=0},
        get value(){return this._value},
        set value(v){this._value=String(v);const i=this.options.findIndex(o=>o.value===this._value);if(i>=0)this.selectedIndex=i},
        getBoundingClientRect:()=>({left:0,top:0,width:510,height:510})
      });
      els.set(id,node);
    }
    return els.get(id);
  }

  const button=el('normal');button.dataset.d='1';el('mapSize').value='1';el('seedRandom').checked=false;el('seedInput').value='12345';el('seedSearchCategory').value='vehicle';
  const touchControls=options.controls?[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<b\b([^>]*\bdata-k="([^"]+)"[^>]*)>/g)].map(([,attrs,key])=>{const id=attrs.match(/\bid="([^"]+)"/);const node=el(id?id[1]:Symbol());node.dataset.k=key;return node;}):[];
  const document=eventTarget({getElementById:el,querySelector:()=>el('mapSize'),querySelectorAll:s=>s==='#ini button[data-d]'?[button]:s==='[data-k]'?touchControls:[],createElement:()=>el(Symbol()),body:el('body')});
  const c=vm.createContext(eventTarget({Math:gameMath,console,document,innerWidth:1360,innerHeight:900,devicePixelRatio:1,matchMedia:()=>({matches:false}),performance:{now:()=>options.realPerformance?performance.now():now},requestAnimationFrame:fn=>{nextFrame=fn},Uint8ClampedArray,Float32Array,setTimeout:(fn,delay=0)=>{const id=++timerId;timers.push({id,fn,delay});return id},clearTimeout:id=>{const i=timers.findIndex(t=>t.id===id);if(i>=0)timers.splice(i,1)},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}}));c.window=c;c.HUNTER_GAME_STATE=await import(require('url').pathToFileURL(path.join(root,'src/game-state-core.mjs')));c.HUNTER_GAME_INTEL=await import(require('url').pathToFileURL(path.join(root,'src/game-intel-core.mjs')));c.HUNTER_PLAYER_INPUT=await import(require('url').pathToFileURL(path.join(root,'src/player-input-core.mjs')));c.HUNTER_GAME_CATALOG=await import(require('url').pathToFileURL(path.join(root,'src/game-catalog-core.mjs')));c.HUNTER_START_LIFECYCLE=await import(require('url').pathToFileURL(path.join(root,'src/start-lifecycle-core.mjs')));c.HUNTER_FRAME_TICK=await import(require('url').pathToFileURL(path.join(root,'src/frame-tick-core.mjs')));c.HUNTER_FRAME_DIAGNOSTICS=await import(require('url').pathToFileURL(path.join(root,'src/frame-diagnostics-core.mjs')));c.HUNTER_SPATIAL_GRID=await import(require('url').pathToFileURL(path.join(root,'src/spatial-grid-core.mjs')));c.HUNTER_CREATE_NATIVE_PREDICTION=(await import(require('url').pathToFileURL(path.join(root,'src/native-coop-prediction.mjs')))).createNativePrediction;c.HUNTER_CREATE_NATIVE_INTERPOLATION=(await import(require('url').pathToFileURL(path.join(root,'src/native-coop-interpolation.mjs')))).createNativeCoopInterpolation;c.HUNTER_ENEMY_PERCEPTION=await import(require('url').pathToFileURL(path.join(root,'src/enemy-perception-core.mjs')));c.HUNTER_ENEMY_CAR_STEERING=await import(require('url').pathToFileURL(path.join(root,'src/enemy-car-steering.mjs')));c.HUNTER_DEBRIS_CORE=await import(require('url').pathToFileURL(path.join(root,'src/debris-core.mjs')));c.HUNTER_VEHICLE_ENVIRONMENT=await import(require('url').pathToFileURL(path.join(root,'src/vehicle-environment-core.mjs')));c.HUNTER_FENCE_VISUAL=await import(require('url').pathToFileURL(path.join(root,'src/fence-visual-core.mjs')));c.HUNTER_VEGETATION_LAYOUT=await import(require('url').pathToFileURL(path.join(root,'src/vegetation-layout.mjs')));c.HUNTER_TOWER_MODEL=await import(require('url').pathToFileURL(path.join(root,'src/tower-model.mjs')));c.HUNTER_SHARED_WEAPONS=await import(require('url').pathToFileURL(path.join(root,'src/weapon-catalog.mjs')));c.HUNTER_SHARED_BATCHING=await import(require('url').pathToFileURL(path.join(root,'src/player-batching-core.mjs')));c.HUNTER_SHARED_VEHICLE_MODELS=await import(require('url').pathToFileURL(path.join(root,'src/vehicle-model-core.mjs')));c.HUNTER_SHARED_ACCURACY=await import(require('url').pathToFileURL(path.join(root,'src/enemy-accuracy-core.mjs')));c.HUNTER_PROJECTILE_MODEL=await import(require('url').pathToFileURL(path.join(root,'src/projectile-model.mjs')));c.HUNTER_SHARED_PROJECTILES=await import(require('url').pathToFileURL(path.join(root,'src/projectile-core.mjs')));c.HUNTER_SHARED_AIMING=await import(require('url').pathToFileURL(path.join(root,'src/aiming-core.mjs')));c.HUNTER_SHARED_MODELS=await import(require('url').pathToFileURL(path.join(root,'src/player-model-core.mjs')));c.HUNTER_VEHICLE_OCCUPANT_DAMAGE=await import(require('url').pathToFileURL(path.join(root,'src/vehicle-occupant-damage-core.mjs')));c.HUNTER_SHARED_COMBAT=await import(require('url').pathToFileURL(path.join(root,'src/combat-rules.mjs')));c.HUNTER_SHARED_VEHICLES=await import(require('url').pathToFileURL(path.join(root,'src/vehicle-dynamics-core.mjs')));c.HUNTER_BUILDING_SHELL=await import(require('url').pathToFileURL(path.join(root,'src/building-shell.mjs')));c.HUNTER_COMPOUND_PLANNING=await import(require('url').pathToFileURL(path.join(root,'src/compound-planning.mjs')));c.HUNTER_WORLD_GENERATION=await import(require('url').pathToFileURL(path.join(root,'src/world-generation-core.mjs')));c.HUNTER_CANONICAL_WATER=await import(require('url').pathToFileURL(path.join(root,'src/canonical-water.mjs')));c.HUNTER_WALK_SURFACES=await import(require('url').pathToFileURL(path.join(root,'src/walk-surfaces.mjs')));c.HUNTER_WORLD_PHYSICS=await import(require('url').pathToFileURL(path.join(root,'src/world-physics.mjs')));c.HUNTER_WORLD_ADAPTER=await import(require('url').pathToFileURL(path.join(root,'src/world-adapter.mjs')));c.HUNTER_PLAYER_SIMULATION=await import(require('url').pathToFileURL(path.join(root,'src/player-simulation.mjs')));c.HUNTER_JOURNAL=await import(require('url').pathToFileURL(path.join(root,'src/operation-journal.mjs')));c.HUNTER_ACCOUNT_SERVICE=(await import(require('url').pathToFileURL(path.join(root,'src/account-client.mjs')))).createAccountService();c.HUNTER_CLOUD_FACTORY=await import(require('url').pathToFileURL(path.join(root,'src/operation-cloud.mjs')));c.HUNTER_SAVE_FILES=await import(require('url').pathToFileURL(path.join(root,'src/operation-files.mjs')));c.TextEncoder=TextEncoder;c.crypto=require('node:crypto').webcrypto;
  const saveSource=fs.readFileSync(path.join(root,'src/operation-save.mjs'),'utf8').replace(/export /g,'');
  vm.runInContext('(function(){'+saveSource+';window.HUNTER_SAVES={SAVE_FORMAT,ENTITY_KINDS,SaveError,entityId,newOperationId,validateSnapshot,createOperation,createOperationStore};})()',c);
  c.HUNTER_COMPOUND_LAYOUTS=(await import(require("url").pathToFileURL(path.join(root,"src/compound-layouts.mjs")))).compoundLayouts;
  const runtime=await import(require('url').pathToFileURL(path.join(root,'src/compound-runtime-layouts.mjs')));c.HUNTER_RUNTIME_LAYOUTS=runtime.runtimeLayouts;c.HUNTER_CHOOSE_COMPOUND=runtime.chooseCompoundLayout;c.HUNTER_COMPOUND_ARCHITECTURE=await import(require('url').pathToFileURL(path.join(root,'src/compound-architecture.mjs')));
  c.HUNTER_COMPOUND_PATHS=await import(require('url').pathToFileURL(path.join(root,'src/compound-paths.mjs')));
  c.HUNTER_COMPOUND_STRUCTURES=(await import(require('url').pathToFileURL(path.join(root,'src/compound-structures.mjs')))).createCompoundStructures;
  c.HUNTER_TRUCK_CONCEPT=(await import(require('url').pathToFileURL(path.join(root,'src/truck-model.mjs')))).createTruckModel;
  c.HUNTER_CIVIL_C1A=(await import(require('url').pathToFileURL(path.join(root,'src/civilian-car-model.mjs')))).createCivilianCarModel;
  c.HUNTER_ROCK_FIELDS=await import(require('url').pathToFileURL(path.join(root,'src/rock-fields.mjs')));
  class Renderer{constructor(){this.domElement=el('canvas');this.shadowMap={}}setPixelRatio(){}setSize(){}render(scene,cam){scene.updateMatrixWorld();cam.updateMatrixWorld()}}
  c.THREE={...await import(require('url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs'))),WebGLRenderer:Renderer};
  c.buildingSrc=fs.readFileSync(path.join(root,'src/buildings.js'),'utf8');
  c.worldGenSrc=fs.readFileSync(path.join(root,'src/world-generation.js'),'utf8');
  c.vehSrc=fs.readFileSync(path.join(root,'src/vehicles.js'),'utf8');
  c.riderSrc=fs.readFileSync(path.join(root,'src/rider.js'),'utf8');
  if(process.env.HUNTER_TEST_BUNDLE==='1'){
    const {RUNTIME_BUNDLE_PATH}=await import(require('url').pathToFileURL(path.join(root,'src/runtime-bundle.mjs')).href);
    if(!RUNTIME_BUNDLE_PATH)throw new Error('El manifest del runtime no conté cap paquet');
    vm.runInContext(fs.readFileSync(path.join(root,RUNTIME_BUNDLE_PATH),'utf8'),c,
      {filename:RUNTIME_BUNDLE_PATH,timeout:60000});
  }else for(const src of scripts)
    vm.runInContext(fs.readFileSync(path.join(root,src),'utf8'),c,{filename:src,timeout:60000});
  c.VD=c.HUNTER_VEHICLE_DYNAMICS;
  const run=s=>vm.runInContext(s,c,{timeout:120000});
  const microtasks=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
  const selectStart=(seed,scale)=>{el('seedInput').value=seed;el('mapSize').value=String(scale)};
  return {run,el,dispatch(target,type,init={}){const node=target==='window'?c:target==='document'?document:typeof target==='string'?el(target):target;const e={type,...init};node.dispatchEvent(e);return e},
    // Existing regression suites intentionally exercise the sync compatibility
    // API. startAsync invokes exactly the production button's onclick handler.
    start(seed='12345',scale=1){selectStart(seed,scale);return run('startGameSynchronously(readGameStartOptions(1))')},
    startAsync(seed='12345',scale=1){selectStart(seed,scale);return button.onclick()},
    async runTask(ms=0){await microtasks();const task=timers.shift();if(!task)return false;now+=ms;task.fn();await microtasks();return true},
    async flushTasks(limit=100000){let n=0;while(await this.runTask()){if(++n>limit)throw new Error('Generation scheduler did not settle')}return n},
    get pendingTasks(){return timers.length},microtasks,
    frame(ms=16){now+=ms;nextFrame(now)},get now(){return now},advanceTime(ms){now+=ms},frameAt(ms){now=ms;nextFrame(now)},context:c};
};
