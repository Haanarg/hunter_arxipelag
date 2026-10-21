'use strict';
// Una explosió no pot fer desaparèixer parets que encara tenen vida.
// Especialment important amb murs semitransparents en interiors.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const combat=fs.readFileSync(path.join(root,'src/combat.js'),'utf8');
const core=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8');
assert.match(core,/blastRingG=new THREE\.RingGeometry\(/,
  'L’ona expansiva no ha de tornar a ser una esfera que tapi murs');
assert.doesNotMatch(combat,/new THREE\.Mesh\(sphG,/,
  'L’ona expansiva volumètrica antiga ocultava les parets');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('12345');game.frame();
 const result=game.run(`(()=>{
   const x=H+5000,z=H+5000;
   const m=new THREE.Mesh(new THREE.BoxGeometry(4,4,.6),
     new THREE.MeshBasicMaterial({
       color:0x9e9991,transparent:true,opacity:.18,depthWrite:false
     }));
   m.position.set(x,2,z);m.visible=true;world.add(m);
   const wall={x0:x-2,x1:x+2,z0:z-.3,z1:z+.3,
     y0:0,y1:4,cx:x,cz:z,hp:12,door:false,open:false,
     rammable:true,m};
   Wl.push(wall);wallGridCount=-1;
   const initialFx=fx.length;
   boom(x,2,z,8,3,'p',{skipPlayer:true});
   const pulse=fx[fx.length-1],initialHp=wall.hp;
   const report={
     generated:fx.length===initialFx+1,
     survived:initialHp>0&&Wl.includes(wall),
     wallVisibleInitially:m.visible,
     depthWrite:pulse.o.material.depthWrite,
     depthTest:pulse.o.material.depthTest,
     transparent:pulse.o.material.transparent,
     ring:pulse.o.geometry.type==='RingGeometry',
     initialOpacity:pulse.o.material.opacity,
     maxOpacity:pulse.o.material.opacity
   };
   for(let i=0;i<7;i++){
     updFx(.1);
     report.survived=report.survived&&wall.hp===initialHp&&Wl.includes(wall);
     report.wallVisibleInitially=report.wallVisibleInitially&&m.visible;
     report.maxOpacity=Math.max(report.maxOpacity,pulse.o.material.opacity);
   }
   report.expired=!fx.includes(pulse);
   const index=Wl.indexOf(wall);if(index>=0)Wl.splice(index,1);
   wallGridCount=-1;world.remove(m);m.geometry.dispose();m.material.dispose();
   return report;
 })()`);
 assert.equal(result.generated,true);
 assert.equal(result.survived,true,'Una ona de baix dany no destrueix el mur');
 assert.equal(result.wallVisibleInitially,true,
   'Una ona expansiva no amaga visualment una paret que resisteix');
 assert.equal(result.ring,true,'L’ona ha de ser anular, sense volum opac');
 assert.equal(result.transparent,true);
 assert.equal(result.depthTest,true);
 assert.equal(result.depthWrite,false,
   'La visualització de l’ona no pot ocultar per profunditat el mur');
 assert(result.initialOpacity>0&&result.maxOpacity<=.4,
   'L’opacitat no pot pujar sobtadament al 100% al fotograma següent');
 assert.equal(result.expired,true,'L’efecte es retira després de sis dècimes');
 console.log('OK explosions: el mur conserva visibilitat i vida; ona anular translúcida');
})().catch(err=>{console.error(err);process.exitCode=1});
