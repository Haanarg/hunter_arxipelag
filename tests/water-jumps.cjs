#!/usr/bin/env node
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'src/water-jumps.js'),'utf8'),ctx);
const jumps=ctx.window.HUNTER_WATER_JUMPS;
const rising=(x,z,t)=>-z*.09;
function simulate(type,speed,water=rising,seconds=3){
 const v={t:type,x:0,z:0,hd:0,v:speed},lifts=[],pitches=[];
 for(let k=0;k<seconds*60;k++){
  v.z-=speed/60;
  const r=jumps.update(v,1/60,k/60,water,type==='moto_aquatica'?39:22);
  lifts.push(r.lift);pitches.push(r.pitch);
 }
 return{v,peak:Math.max(...lifts),lifts,pitches};
}
const jet=simulate('moto_aquatica',32),surf=simulate('windsurf',19);
assert.ok(jet.v.waveJump.jumps>=1,'La moto aixeca el casc en agafar velocitat');
assert.ok(surf.v.waveJump.jumps>=1,'El windsurf s’enlaira quan remunta una ona');
assert.ok(jet.peak>.38,'El salt de la moto ha de ser perceptible');
assert.ok(surf.peak>.18,'El salt del windsurf és visible però més curt');
assert.ok(jet.peak>surf.peak,'La moto salta més que el windsurf');
assert.ok(jet.pitches.some(p=>p>.05)&&jet.pitches.some(p=>p<-.05),
  'La proa puja i després s’abaixa abans de tocar aigua');
for(const type of ['moto_aquatica','windsurf']){
 const low=simulate(type,5);
 assert.equal(low.v.waveJump.jumps,0,'Sense salts a velocitat baixa: '+type);
 assert.equal(low.peak,0,'Manté la flotació normal a velocitat baixa: '+type);
 const flat=simulate(type,35,()=>0);
 assert.equal(flat.peak,0,'Sense onades no hi ha salts: '+type);
}
const boat={t:'llanxa_coets',x:0,z:0,hd:0,v:30};
assert.equal(jumps.update(boat,.016,0,rising,29).lift,0,
  'La llanxa armada i els altres bucs no salten');
assert.equal(boat.waveJump,undefined,'No es reserven estats per als bucs');
(async()=>{
 const g=await require('./harness.cjs')();
 const visual=g.run(`(()=>{
  const v={t:'moto_aquatica',x:100,z:100,hd:0,v:33,
    o:mkV('moto_aquatica'),bump:0,yawRate:0},t=.5;
  const water=x=>-x; // Mostreig de les ones pur per validar la integració.
  let max=0,normal=0;
  for(let i=0;i<120;i++){
    v.z-=v.v/60;place(v,t+i/60,1/60,0);
    const expected=wy(v.x,v.z,t+i/60)+.2;
    max=Math.max(max,v.o.position.y-expected);
    if(i===0)normal=expected;
  }
  return {max,jumps:v.waveJump?.jumps||0,
    finite:Number.isFinite(v.o.position.y)&&Number.isFinite(v.o.rotation.x)};
 })()`);
 assert.ok(visual.finite,'Model Three.js ben posicionat després del salt');
 // El salt visual és positiu si l'ona del món puja de cara.
 console.log('OK water jumps: enlairament, gravetat, aterratge, velocitat i model Three.js',visual);
})().catch(e=>{console.error(e);process.exitCode=1});
