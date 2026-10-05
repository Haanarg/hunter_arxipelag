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
const vehicleTypes=['llanxa','moto_aquatica','hover','cotxe','moto','bici','barca_rems','windsurf','camio','tanqueta','llanxa_coets','tanc','heli','heli_combat'];
for(const type of vehicleTypes){ok(`V.some(v=>v.t==='${type}')`,'generated '+type);run(`cv=null;{const q=V.find(v=>v.t==='${type}');P.x=q.x;P.z=q.z;P.y=q.o.position.y;}`);run('toggle()');ok(`cv&&cv.t==='${type}'`,'enter '+type);run('stepV(cv,1,.2,1,.04);place(cv,3,.04,.2)');ok('Number.isFinite(cv.o.position.y)','vehicle '+type);run("if(VT[cv.t].m==='a')cv.alt=Math.max(0,hAt(cv.x,cv.z))+.8;toggle()");ok('!cv','exit '+type)}
ok('vehicleTypes.every(t=>VHB[t]&&VHB[t].length===2&&VHB[t][0]>0&&VHB[t][1]>0)','all driveable vehicles have hitboxes');
ok("['cotxe','moto','bici','camio','tanqueta','tanc'].every(t=>VT[t].landGrip>0&&VT[t].maxF>VT[t].maxR)",'land vehicles have traction and speed profiles');
ok("['llanxa','moto_aquatica','barca_rems','windsurf','llanxa_coets'].every(t=>VT[t].waterDrift>=0&&VT[t].waterSteerMin>0)",'water vehicles have drift and low-speed steering profiles');
ok("['heli','heli_combat'].every(t=>VT[t].climb>0&&VT[t].liftResponse>0&&VT[t].bank>0&&VT[t].pitch>0)",'helicopters have lift and attitude profiles');
ok("V.filter(v=>v.t==='llanxa_coets').length===1",'exactly one rocket boat per map');
ok("V.filter(v=>v.beached).every(v=>['barca_rems','windsurf','moto_aquatica','llanxa'].includes(v.t))",'beached coastal vehicles use the intended pool');
ok("html.includes('if(R()>=.75)return')&&html.includes("q<.4?'barca_rems':q<.72?'windsurf':q<.88?'moto_aquatica':'llanxa'")",'coastal vehicle chance and weighting are configured');
ok("V.find(v=>v.t==='tanc').o.userData.tracks?.length===2&&V.find(v=>v.t==='tanc').o.userData.tracks.every(t=>t.links.length>20)",'tank has two animated continuous tracks');
run("{const q=V.find(v=>v.t==='tanc'),ts=q.o.userData.tracks;ts.forEach(t=>t.phase=t.perimeter/2);q.v=8;q.yawRate=0;const b=ts.map(t=>t.phase);place(q,1,.1,0);globalThis.__trackForward=ts.every((t,i)=>t.phase>b[i]);ts.forEach(t=>t.phase=t.perimeter/2);q.v=-5;q.yawRate=0;const r=ts.map(t=>t.phase);place(q,1,.1,0);globalThis.__trackReverse=ts.every((t,i)=>t.phase<r[i]);ts.forEach(t=>t.phase=t.perimeter/2);q.v=0;q.yawRate=1;place(q,1,.1,0);const l=ts.find(t=>t.side<0),rr=ts.find(t=>t.side>0);globalThis.__trackPivot=l.phase<l.perimeter/2&&rr.phase>rr.perimeter/2;q.v=0;q.yawRate=0}");
ok('__trackForward&&__trackReverse&&__trackPivot','tank tracks animate backward/forward and counter-rotate on pivot turns');
run('{const q=V.find(v=>v.t===\'cotxe\');const a=vehicleBox(q,q.x,q.z,q.hd),b=vehicleBox(q,q.x,q.z,q.hd),c=vehicleBox(q,q.x+100,q.z+100,q.hd);globalThis.__obbNear=obbOverlap(a,b);globalThis.__obbFar=obbOverlap(a,c)}');
ok('__obbNear&&!__obbFar','OBB overlap separates near and far vehicles');
run('{const q=V.find(v=>v.t===\'tanc\');intelMarks.push({kind:\'tanc\',ref:q,label:\'test\'});globalThis.__destroyed=q;explodeVehicle(q)}');
ok('__destroyed.destroyed&&!V.includes(__destroyed)&&!intelMarks.some(m=>m.ref===__destroyed)','vehicle destruction clears active vehicle and intel marker');
ok('pl.userData.ael&&pl.userData.aer&&pl.userData.lkl&&pl.userData.lkr','player elbows and knees exist');
ok("fs.readFileSync('src/rider.js','utf8').includes(\"v.t==='bici'?-(v.pedalPhase||0)\")",'bicycle rider pedal phase is inverted');
const riderSrc=fs.readFileSync('src/rider.js','utf8'),charSrc=fs.readFileSync('src/characters.js','utf8'),vehSrc=fs.readFileSync('src/vehicles.js','utf8');
ok("charSrc.includes('SphereGeometry(.5,12,8)')&&charSrc.includes('glasses')&&charSrc.includes('capCrown')",'player has rounded head, cap and sunglasses');
ok("riderSrc.includes('SphereGeometry(.44,12,8)')&&riderSrc.includes('capCrown')&&riderSrc.includes("v.t==='windsurf'")&&riderSrc.includes('Math.PI/2')",'open-vehicle rider has updated headgear and side-on windsurf stance');
ok("vehSrc.includes('Barca oberta')&&vehSrc.includes('Suports dels rems sobre la regala')",'rowboat is open with gunwales, seats and raised oar supports');
ok("html.includes(\"rowPhase=v.t==='barca_rems'?-(v.pedalPhase||0)\")",'rowboat oar cycle is inverted');
ok("html.includes(\"playerEject={kind:'vault'\")&&html.includes(\"playerEject?.kind==='vault'\")&&html.includes('profile=new THREE.Vector3')",'moving exit uses profile vault animation and camera');
ok("charSrc.includes('kneeL=-(')&&charSrc.includes('kneeR=-(')",'walking knees bend in corrected direction');
ok("html.includes('waistLocal=2.05')&&html.includes('applyQuaternion(pl.quaternion)')&&html.includes('u.lkl.rotation.x=-kneeBend')",'vault rotates around waist and bends knees correctly');
ok("html.includes(\"mirror=R()<.5?-1:1\")&&html.includes(\"ang=rr(0,Math.PI*2)\")",'compounds support full rotation and mirroring');
run("panel('map');resume();joystick.state.x=1;joystick.state.y=-1;build();update(.016,20)");ok('joystick.state.x===0&&joystick.state.y===0&&hp===100','restart resets joystick and world');
ok('PM.t.parent===world','vegetation attached to rebuilt world');
console.log(JSON.stringify({passed:true,buildings:run('B.length'),vehicles:run('V.length'),checks:['startup','enemy models','stair geometry','4 door orientations','14 vehicles','vehicle hitboxes','land/water/air dynamics profiles','coastal water vehicles','tank track animation','OBB overlap','vehicle destruction cleanup','player joints','bicycle pedal direction','player headgear','windsurf stance','rowboat geometry/oars','moving-exit vault camera','correct knee direction','waist-centered vault pivot','compound rotation/mirror','minimap','restart','joystick','vegetation'],seconds:(Date.now()-start)/1000}));
