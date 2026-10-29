'use strict';
// Regressió de cost visual compartit. Extreu les funcions REALS de producció
// perquè una còpia de les fórmules en el test no falsegi els resultats.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8');
const vegetation=fs.readFileSync(path.join(root,'src/vegetation.js'),'utf8');
const between=(source,a,b)=>{
  const i=source.indexOf(a),j=source.indexOf(b,i+a.length);
  assert(i>=0&&j>i,'No es troben les funcions visuals originals');
  return source.slice(i,j);
};
const vehicleSource=between(core,'function animateTankTracks(v,dt){','// Única cadència');
const visuals={
  landSamples:0,trackPositions:0,trackRotations:0,steering:0
};
const position={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}},
      rotation={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}};
const vehicle={
  t:'cotxe',x:5,z:8,hd:0,v:0,sideV:0,yawRate:0,strafeV:0,
  o:{position,rotation,userData:{wheels:[]}}
};
const env={
  VT:{cotxe:{m:'l'}},VS:{cotxe:1,tanc:1},cv:null,
  hAt(){visuals.landSamples++;return 3;},
  groundAt(){visuals.landSamples++;return 3;},
  window:{HUNTER_VEHICLES:{animateSteering(){visuals.steering++;}}},
  animateTankTracks(){},wy(){throw Error('No hi ha d’haver ones en un vehicle terrestre aparcat')},
};
const real=new Function('env','with(env){'+vehicleSource+';return {place,animateTankTracks}}')(env);
real.place(vehicle,0,1/60,0);
const baseline=visuals.landSamples;
assert(baseline>0,'La primera col·locació mostreja el relleu');
for(let i=0;i<120;i++)real.place(vehicle,i/60,1/60,0);
assert.equal(visuals.landSamples,baseline,'Cap nova mostra de relleu en un vehicle aparcat');
assert.equal(visuals.steering,1,'No recalcula animació de direcció aturada');
vehicle.x++;
real.place(vehicle,3,1/60,0);
assert(visuals.landSamples>baseline,'Un desplaçament invalida la memòria cau');
const afterMove=visuals.landSamples;
vehicle.o.position.y+=2;
real.place(vehicle,3.1,1/60,0);
assert(visuals.landSamples>afterMove,'Una correcció externa de pose invalida la memòria cau');
vehicle.v=10;
const beforeDriving=visuals.landSamples;
real.place(vehicle,3.2,1/60,0);real.place(vehicle,3.3,1/60,0);
assert(visuals.landSamples>beforeDriving+1,'Els vehicles en moviment continuen actualitzant-se');
vehicle.v=0;
real.place(vehicle,3.4,1/60,0);
const stopped=visuals.landSamples;
real.place(vehicle,3.5,1/60,0);
assert.equal(visuals.landSamples,stopped,'Torna a estalviar mostres en aturar-se');
env.cv=vehicle;
real.place(vehicle,3.6,1/60,0);
assert(visuals.landSamples>stopped,'El vehicle local sempre manté l’actualització original');
env.cv=null;
const treads={
  phase:0,perimeter:12,side:1,straight:2,r:1,cy:1,front:0,rear:2,x:.2,
  links:[{userData:{trackOffset:0},position:{set(){visuals.trackPositions++;}},rotation:{set(){visuals.trackRotations++;}}}]
};
const tank={t:'tanc',v:0,yawRate:0,o:{userData:{tracks:[treads]}}};
real.animateTankTracks(tank,1/60);
const firstLinks=visuals.trackPositions;
real.animateTankTracks(tank,1/60);
assert.equal(visuals.trackPositions,firstLinks,'Les erugues aturades no transformen cap esglaó');
tank.v=6;
real.animateTankTracks(tank,1/60);
assert(visuals.trackPositions>firstLinks,'En circular, les erugues recuperen l’animació original');

// Sortint de la mira sense moure el personatge, els sectors han de tornar
// del LOD detallat al normal per no gastar triangles innecessaris.
const vegetationSource=between(vegetation,
  '      function update(x,z,force=false,skipPalms=false,focus=null){',
  '      for(const ch of sections)ch.count');
const stats={visibleSectors:0,visiblePalms:0,lodSwitches:0};
const mesh=()=>({visible:false,count:1});
const chunk={x:1000,z:0,lod:null,count:10,trunk:mesh(),primary:[mesh()],secondary:[mesh()],
  midTrunk:mesh(),midCrown:mesh(),farTrunk:mesh(),farCrown:mesh()};
chunk.meshes=[chunk.trunk,...chunk.primary,...chunk.secondary,
  chunk.midTrunk,chunk.midCrown,chunk.farTrunk,chunk.farCrown];
const group=()=>({sectors:[]});
const vegEnv={sections:[chunk],bushGroup:group(),rockGroup:group(),extraRanges:{bush:1300,rock:1900},
  stats,CHUNK:160,distances:[485,1240,3080],margin:55};
const veg=new Function('env','with(env){let lastX=Infinity,lastZ=Infinity,lastFocus=false,lastSkipPalms=false;'
  +'const tierFor=(d,old)=>old==null?(d<485?0:d<1240?1:d<3080?2:3):d<485?0:d<1240?1:d<3080?2:3;'
  +vegetationSource+';return update;}')(vegEnv);
const sniperFocus={intersectsXZBox(){return true;}};
veg(0,0,true,false,sniperFocus);
assert.equal(chunk.lod,0,'La mira activa el sector detallat');
veg(0,0,false,false,null);
assert.equal(chunk.lod,1,'Sense moure el jugador, sortir de la mira restaura el LOD mitjà');
assert(chunk.midCrown.visible&&!chunk.primary[0].visible,
  'Les malles detallades es deixen de dibuixar immediatament');
// La selecció de castShadow es recalcula ocasionalment; els vectors de
// transformacions mundials dels mateixos propietaris es reutilitzen.
const shadowSource=between(core,'function updateShadowCasters(force=false){',
  'function setShadowsDisabled(disabled){');
let vectors=0,worldReads=0;
class ShadowVec{
  constructor(x=0,y=0,z=0){vectors++;Object.assign(this,{x,y,z});}
  set(x,y,z){Object.assign(this,{x,y,z});return this;}
}
const owner={parent:null,getWorldPosition(out){worldReads++;return out.set(20,0,20);}},
  candidate=()=>({isMesh:true,parent:owner,castShadow:false});
const shadowEntries=[{mesh:candidate(),owner,point:null},{mesh:candidate(),owner,point:null}];
const shadowStats={updates:0},shadowEnv={
  visualQuality:{shadows:true,shadowDistance:225},shadowsDisabled:false,
  P:{x:0,z:0},performance:{now(){return 4000;}},
  shadowLastX:Infinity,shadowLastZ:Infinity,shadowLastMs:-Infinity,
  shadowCandidates:shadowEntries,shadowOwnerPositionCache:new WeakMap(),
  shadowBoatProxyCache:new WeakMap(),shadowNodeOwners:new WeakMap(),
  shadowOwnerKinds:new WeakMap(),shadowStats,shadowPoseNodes:[],shadowBoatNodes:[],
  THREE:{Vector3:ShadowVec}
};
const updateShadows=new Function('env','with(env){'+shadowSource+';return updateShadowCasters;}')(shadowEnv);
updateShadows(true);
updateShadows(true);
assert.equal(worldReads,2,'Dos refrescs consulten la posició del propietari un cop cadascun');
assert.equal(vectors,1,'Els dos refrescs i les dues malles comparteixen un sol vector');
assert(shadowEntries.every(e=>e.mesh.castShadow),'Les ombres visibles continuen actives');
console.log('OK visuals compartits: vehicles aparcats, erugues immòbils, invalidació i LOD de palmeres i vectors d’ombres');
