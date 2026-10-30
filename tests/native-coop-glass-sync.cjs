#!/usr/bin/env node
'use strict';
// Regressió nativa: un error gràfic puntual en trencar un vidre no pot
// interrompre el frame loop ni impedir la recepció dels snapshots del guest.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/coop-world-runtime.js'),'utf8');
const extract=(start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert.ok(a>=0&&b>a,'No s’ha trobat el codi del runtime: '+start);
  return source.slice(a,b);
};
const reporter=extract('function reportNativeCoopVisualError(','function nativeCoopInput(){');
const effects=extract(' if(s.appliedEffects!==state.combat.effects){',' if(s.appliedRemovedRoofs!==state.removedRoofs){');
const wrapper=extract('function updateNativeCoop(dt){','function updateNativeCoopFrame(dt){');
const session={
  walls:[{windowPanes:[{x:0,y0:8,y1:10}],glassMeshes:[{visible:true}]}],
  seenEffects:new Set(),channel:{stats:{}},buildings:[],
};
const sounds=[],warnings=[];
const ctx=vm.createContext({
  session,s:session,state:null,Dr:[],console:{error:(...args)=>warnings.push(args)},
  // Simula un defecte extern en la presentació de fragments; NO és un
  // error de protocol i el socket ha de mantenir-se obert.
  shatterWindow(){throw Error('visual shader issue');},
  spawnBulletImpact(){},presentExplosion(){},snd:(...args)=>sounds.push(args)
});
vm.runInContext('let nativeCoopSession=session;'+reporter,ctx);
ctx.state={
  combat:{effects:[
    {id:1,kind:'glass',wallIndex:0,paneIndex:0,at:{x:0,y:9,z:2}},
    {id:2,kind:'shot',from:{x:0,y:1,z:0}}
  ]},
  removedWalls:[],doors:[],brokenWindows:['0:0']
};
assert.doesNotThrow(()=>vm.runInContext(effects,ctx));
assert.equal(session.visualErrors,1,'the broken effect was reported');
assert.equal(session.channel.stats.visualErrors,1,'stats expose client failures');
assert.equal(session.walls[0].glassMeshes[0].visible,false,
  'authoritative broken glass is applied even when local fragments fail');
assert.equal(sounds.length,1,'a separate sound effect still runs');
assert.equal(session.seenEffects.size,2,'visual errors are not replayed every frame');
ctx.state={...ctx.state,combat:{effects:[
  ...ctx.state.combat.effects,
  {id:3,kind:'shot',from:{x:1,y:1,z:1}}
]},brokenWindows:['0:0']};
assert.doesNotThrow(()=>vm.runInContext(effects,ctx));
assert.equal(sounds.length,2,'new snapshots keep producing effects');
assert.equal(session.visualErrors,1,'old glass is not processed again');
vm.runInContext(wrapper+'function updateNativeCoopFrame(){throw Error("transient view failure")}',ctx);
assert.doesNotThrow(()=>vm.runInContext('updateNativeCoop(1/30)',ctx),
  'a visual exception cannot kill requestAnimationFrame');
assert.equal(session.visualErrors,2,'frame failure appears in diagnostics');
assert.match(source,/onState\(state\)\{session\.state=state;\s*try\{session\.prediction\?\.receive/,
  'snapshot reception must not close the socket on a prediction error');
const manifest=fs.readFileSync(path.join(__dirname,'../src/runtime-bundle.mjs'),'utf8');
const output=manifest.match(/RUNTIME_BUNDLE_PATH\s*=\s*"([^"]+)"/)?.[1];
assert.ok(output,'compiled bundle path available');
const bundle=fs.readFileSync(path.join(__dirname,'..',output),'utf8');
assert.ok(bundle.includes('function reportNativeCoopVisualError(error,part)'),
  'production bundle contains protected coop presentation');
console.log('OK: guest receives new effects and broken windows after a visual error; frame loop survives');
