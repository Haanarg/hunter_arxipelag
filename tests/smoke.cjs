const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
process.chdir(path.resolve(__dirname,'..'));
// Real Three.js geometry and game simulation; DOM, audio and GPU rendering are mocked.
const html=fs.readFileSync('index.html','utf8');const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
const noop=()=>{},els=new Map(),handlers={};const ctx2d=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){if(!els.has(id))els.set(id,{style:{},dataset:{},classList:{add:noop,remove:noop},innerHTML:'',textContent:'',hidden:false,width:170,height:170,addEventListener:noop,setPointerCapture:noop,querySelector:()=>el("knob"),querySelectorAll:()=>[],getContext:()=>ctx2d,prepend:noop,append:noop,getBoundingClientRect:()=>({left:0,top:0,width:510,height:510})});return els.get(id)}
const document={getElementById:el,querySelectorAll:()=>[],createElement:()=>el(Math.random()),addEventListener:noop,body:el('body')};let now=1000;
const c=vm.createContext({console,document,innerWidth:1360,innerHeight:900,devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:(k,v)=>handlers[k]=v,performance:{now:()=>now},requestAnimationFrame:noop,Uint8ClampedArray,Float32Array,setTimeout:noop});c.window=c;
vm.runInContext(scripts[0][2],c);
class Renderer{constructor(){this.domElement=el('canvas');this.shadowMap={}}setPixelRatio(){}setSize(){}render(scene,cam){scene.updateMatrixWorld();cam.updateMatrixWorld()}}
c.THREE.WebGLRenderer=Renderer;
const start=Date.now();for(const match of scripts){const src=match[1].match(/src="([^"]+)"/);if(!src&&match[2].includes('Copyright'))continue;vm.runInContext(src?fs.readFileSync(src[1],'utf8'):match[2],c,{filename:src?src[1]:'index-inline',timeout:60000})}
const run=s=>vm.runInContext(s,c);const ok=(s,msg)=>assert(run(s),msg);
run('started=1;update(.016,1)');ok('B.length>10&&V.length>50','world starts');
console.log('Startup passed');
run('world.updateMatrixWorld(true)');
ok('B.filter(b=>b.stair).every(b=>b.o.children.filter(m=>m.userData.stair).every((m,i)=>Math.abs(m.getWorldPosition(new THREE.Vector3()).y+m.geometry.parameters.height/2-(b.stair.top-i*b.stair.rise))<.001))','visible steps match walkable height');

ok('E.some(e=>e.t==="general")&&E.some(e=>e.t==="soldat")','enemy models built');
ok('Dr.every(d=>d.m.geometry.parameters.height<5)&&Wl.some(w=>w.playerBlock===false)','doors have lintels');
run('const savedEnemies=E;E=[];');
for(const [nx,nz] of [[0,1],[0,-1],[1,0],[-1,0]]){
run(`{const st=stairs.find(s=>s.nx===${nx}&&s.nz===${nz});if(!st)throw Error('Missing stair direction');P.x=st.x+st.nx*(st.length+.2);P.z=st.z+st.nz*(st.length+.2);P.hd=Math.atan2(st.nx,st.nz);K.KeyW=1;for(let i=0;i<Math.ceil((st.length+2)/(.016*12));i++)update(.016,4);K.KeyW=0;}`);
ok('!!ib','walk through doorway below lintel');}
run('E=savedEnemies;');
for(const type of ['cotxe','moto','bici','tanc','heli','llanxa','hover']){run(`cv=null;P.x=V.find(v=>v.t==='${type}').x;P.z=V.find(v=>v.t==='${type}').z;toggle()`);ok(`cv&&cv.t==='${type}'`,'enter '+type);run('stepV(cv,1,.2,1,.04);place(cv,3,.04,.2)');ok('Number.isFinite(cv.o.position.y)','vehicle '+type);run('cv.alt=Math.max(0,hAt(cv.x,cv.z))+.8;toggle()');ok('!cv','exit '+type)}
run("panel('map');resume();joystick.state.x=1;joystick.state.y=-1;build();update(.016,20)");ok('joystick.state.x===0&&joystick.state.y===0&&hp===100','restart resets joystick and world');
ok('PM.t.parent===world','vegetation attached to rebuilt world');
console.log(JSON.stringify({passed:true,buildings:run('B.length'),vehicles:run('V.length'),checks:['startup','enemy models','stair geometry','4 door orientations','7 vehicles','minimap','restart','joystick','vegetation'],seconds:(Date.now()-start)/1000}));
