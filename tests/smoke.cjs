(async()=>{
// Actual models, generation and simulation. DOM/audio/GPU are mocked.
const assert=require('assert');
const game=await require('./harness.cjs')();const {run}=game;const ok=(s,m)=>assert(run(s),m);
assert.equal(run('THREE.REVISION'),'186');
const start=Date.now();ok('!started&&B.length===0','title screen defers world generation');
game.start();game.frame();
ok('started&&B.length>=6&&E.some(e=>e.t==="general")','menu starts a complete world');
run(`{
  const slowRaw=(x,z)=>{let m=-1;for(const i of islands)m=Math.max(m,1-Math.hypot(x-i.x,z-i.z)/i.r);let h=(m-.25+.6*(fbm(x/520,z/520)-.47))*45;const e=Math.max(Math.abs(x),Math.abs(z));if(e>H-120)h=Math.min(h,-4-(e-(H-120))*.05);if(h>=-1.5)return h;const depth=-h-1.5;return -1.5-Math.min(72,depth*depth*2.8+depth*.8)};
  const pts=[[0,0],[A.x,A.z],[Bi.x,Bi.z],[A.x+A.r*.73,A.z-A.r*.41],[H*.62,-H*.47],[-H+130,H-170]];
  globalThis.islandIndexEquivalent=pts.every(([x,z])=>Math.abs(rawHAt(x,z)-slowRaw(x,z))<1e-9);
  globalThis.islandIndexUsesBuckets=islandGrid.size>0&&pts.some(([x,z])=>islandCandidates(x,z).length<islands.length);
}`);
ok('islandIndexEquivalent','indexed rawHAt matches full island scan');
ok('islandIndexUsesBuckets','island spatial index reduces candidate scans');
const types=['llanxa','moto_aquatica','hover','cotxe','moto','bici','barca_rems','windsurf','camio','tanqueta','llanxa_coets','tanc','heli','heli_combat'];
// Keep combat out of movement fixtures while retaining the actual generated enemies.
run('const savedEnemies=E;E=[];');
for(const t of types){
  ok(`V.some(v=>v.t===${JSON.stringify(t)})`,'generated '+t);
  run(`cv=null;playerFall=null;playerEject=null;{const q=V.find(v=>v.t===${JSON.stringify(t)});P.x=q.x;P.z=q.z;P.y=q.o.position.y;toggle()}`);
  ok(`cv&&cv.t===${JSON.stringify(t)}`,'enter '+t);
  run('stepV(cv,1,.2,1,.04);place(cv,3,.04,.2)');
  ok('cv&&Number.isFinite(cv.o.position.y)','physics '+t);
  run("if(VT[cv.t].m==='a')cv.alt=Math.max(0,hAt(cv.x,cv.z))+.8;toggle()");ok('!cv','exit '+t);
}
run('E=savedEnemies;playerFall=null;playerEject=null;');
ok('V.filter(v=>v.t==="llanxa_coets").length===1','unique rocket boat');
ok('pl.userData.ael&&pl.userData.aer&&pl.userData.lkl&&pl.userData.lkr','articulated player preserved');
ok('V.find(v=>v.t==="tanc").o.userData.tracks.length===2','two animated tank tracks');
ok("buildingSrc.includes('const spring=.12')&&buildingSrc.includes('sideWalls:[]')",'hangar roof reaches the ground without visual side walls');
ok("String(mkB).includes('Sense parets laterals independents')",'hangar collision model omits lateral walls');
ok("worldGenSrc.includes(\"prop('fuel',17,18,Math.PI/2)\")&&worldGenSrc.includes(\"prop('sign',31,26,Math.PI/2)\")",'garage props are redistributed away from the annex');
ok("VD.types.heli_combat.maxF>VD.types.heli.maxF&&VD.types.heli_combat.tu>VD.types.heli.tu&&VD.types.heli_combat.steerResponse>VD.types.heli.steerResponse&&VD.types.heli_combat.yawResponse>VD.types.heli.yawResponse&&VD.types.heli_combat.climb>VD.types.heli.climb",'combat helicopter is faster and more maneuverable than normal helicopter');
ok("vehSrc.includes('const hullShape=new THREE.Shape()')&&vehSrc.includes('quadraticCurveTo(1.12,-1.75,1.12,0)')&&vehSrc.includes('g.userData.oars.push(pivot)')",'rowboat uses a simple pointed brown oval hull and keeps its oars');
ok("String(fire).includes('Math.SQRT1_2')&&String(fire).includes(\"c=='heli'\")&&String(fire).includes(\"c=='heli_combat'\")",'both helicopters fire at a 45 degree downward angle');
ok("String(fire).includes('const a20=Math.PI/9')&&String(fire).includes('fx_*ch,-sv,fz*ch')",'tank fires 20 degrees downward');
ok("String(secondaryWeapon).includes('fx_*d45,-d45,fz*d45')",'combat helicopter missiles also fire 45 degrees downward');
run(`{const q=V.find(v=>v.t==='tanc'),ts=q.o.userData.tracks;ts.forEach(t=>t.phase=t.perimeter/2);q.v=0;q.yawRate=1;place(q,1,.1,0);globalThis.counterRotate=ts.find(t=>t.side<0).phase<ts[0].perimeter/2&&ts.find(t=>t.side>0).phase>ts[0].perimeter/2;q.v=0;q.yawRate=0}`);ok('counterRotate','tracks counter-rotate during pivot');
run(`{const q=V.find(v=>v.t==='cotxe'),a=vehicleBox(q,q.x,q.z,q.hd);globalThis.boxesWork=obbOverlap(a,a)&&!obbOverlap(a,vehicleBox(q,q.x+100,q.z+100,q.hd))}`);ok('boxesWork','vehicle OBB collisions');
run(`{const q=V.find(v=>v.t==='tanc');intelMarks.push({kind:'tanc',ref:q,label:'test'});globalThis.destroyedVehicle=q;explodeVehicle(q)}`);ok('destroyedVehicle.destroyed&&!V.includes(destroyedVehicle)&&!intelMarks.some(m=>m.ref===destroyedVehicle)','destruction cleans active state and map');
// Rendered surface and boat support share the full displacement, retaining hull offset.
run(`{const q=V.find(v=>v.t==='llanxa');place(q,7,0,0);globalThis.boatSurface=q.o.position.y-wy(q.x,q.z,7)}`);assert(Math.abs(run('boatSurface')-.2)<1e-9);
const before=run('water.uniforms.time.value');run("panel('pause')");game.frame(10000);assert.equal(run('water.uniforms.time.value'),before,'pause freezes water clock');
run('resume()');game.frame(16);assert(run('water.uniforms.time.value')>before,'resume advances water clock');
run("panel('map');resume();joystick.state.x=1;joystick.state.y=-1;build()");
ok('joystick.state.x===0&&joystick.state.y===0&&hp===100&&elapsed===0&&water.uniforms.time.value===0','restart resets input, health and clock');ok('PM.t.parent===world','vegetation follows current world');
ok("riderSrc.includes('torso.rotation.set(0,-Math.PI/2,-.035+lean)')",'windsurf torso and inherited head face the sail');
ok("HUNTER_TERRAIN.palette.some(p=>p[0]===30&&p[1]===0x138d31)&&HUNTER_TERRAIN.palette.some(p=>p[0]===40&&p[1]===0x0f7b2b)",'high terrain remains green');
ok("String(vegetate).includes('highPalm=.22+Math.max(0,Math.min(1,(h-28)/14))*.12')&&String(vegetate).includes('h<4)L=q<.12?pm:null')",'high palm density increases while low-altitude chance stays unchanged');
run(`{const a=PM.t.geometry.attributes.position.array;let maxX=0;for(let i=0;i<a.length;i+=3)maxX=Math.max(maxX,Math.abs(a[i]));globalThis.curvedPalmMaxX=maxX}`);ok('curvedPalmMaxX>1.5','palm trunk geometry has a strong curved center deviation');
console.log(JSON.stringify({passed:true,vehicles:types.length,buildings:run('B.length'),seconds:(Date.now()-start)/1000,checks:['deferred startup','real menu','14 vehicles','player joints','tank tracks','OBB','destruction cleanup','boat/water agreement','pause/resume','restart','vegetation','curved palm trunks']}));


})().catch(e=>{console.error(e);process.exitCode=1});
