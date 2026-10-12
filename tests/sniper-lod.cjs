const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
(async()=>{
 const game=await require('./harness.cjs')();
 const focus=game.run("window.HUNTER_SCOPE_FOCUS.create(0,2,0,0,0)");
 assert(focus.contains(0,2,-950,1),'center of sight is in full detail');
 assert(!focus.contains(850,2,-950,2),'off-axis geometry keeps its normal LOD');
 assert(!focus.contains(0,2,650,5),'objects behind the camera are excluded');
 assert(focus.intersectsXZBox(0,-1000,400),'terrain corridor intersects distant sectors');
 assert(!focus.intersectsXZBox(1600,-1000,400),'terrain outside the scope stays simplified');
 // Exposició real del visor: enemic llunyà recupera el model complet.
 game.start('2407759483');
 const target=game.run(`(()=>{
   const far=E.filter(e=>e.t==='soldat'||e.t==='general').find(e=>{
     const d=Math.hypot(e.x-P.x,e.z-P.z);
     return d>190&&d<1850
   });
   if(!far)return {found:false};
   sniperEquipped=true;inv.franctirador=1;
   setSniperScope(true);
   const d=Math.hypot(far.x-P.x,far.z-P.z);
   scopeYaw=Math.atan2(-(far.x-P.x),-(far.z-P.z));
   scopePitch=Math.atan2(far.o.position.y+2-(P.y+1.76),d);
   updateDistanceVisibility();
   const inFocus=currentSniperFocus().contains(far.x,far.o.position.y+2,far.z,1.5);
   const full=far.o.userData.enemyLOD==='full'&&far.o.userData.enemyFullRoot.visible;
   const other=E.find(e=>e!==far&&Math.hypot(e.x-P.x,e.z-P.z)>200&&
     !currentSniperFocus().contains(e.x,e.o.position.y+2,e.z,3));
   const offAxis=other?other.o.userData.enemyLOD!=='full':true;
   setSniperScope(false);updateDistanceVisibility();
   const recovered=far.o.userData.enemyLOD!=='full';
   return {found:true,inFocus,full,offAxis,recovered,distance:d};
 })()`);
 for(const key of ['found','inFocus','full','offAxis','recovered'])assert(target[key],key+': '+JSON.stringify(target));
 // Validar el LOD del terreny i que retrocedeix sense mira.
 const terrain=game.run(`(()=>{
   const T=THREE,p=window.HUNTER_SCOPE_FOCUS.create(0,2,0,0,0);
   const stream=window.HUNTER_TERRAIN.create(T,{size:2400,segments:200,heightAt:(x,z)=>x*.002+z*.003,
     material:new T.MeshBasicMaterial({vertexColors:true}),startX:0,startZ:0,quality:'desktop'});
   const tile=()=>stream.mesh.children.find(m=>m.position.x===0&&m.position.z===-800);
   const before=tile().geometry.attributes.position.count;
   let loops=0;
   while(tile().geometry.attributes.position.count===before&&loops++<350)
     stream.update(0,0,4,null,p);
   const scoped=tile().geometry.attributes.position.count;
   let off=0;
   while(tile().geometry.attributes.position.count===scoped&&off++<600)
     stream.update(0,0,4,null,null);
   const regular=tile().geometry.attributes.position.count;
   stream.dispose();
   return {before,scoped,regular,upgraded:scoped>before,restored:regular<scoped};
 })()`);
 assert(terrain.upgraded&&terrain.restored,'terrain resolution must increase and restore '+JSON.stringify(terrain));
 // Vegetació instanciada: forçar la copa detallada sense reubicar les palmeres.
 const src=fs.readFileSync(path.join(__dirname,'../src/vegetation.js'),'utf8');
 const ctx=vm.createContext({console,Math,Float32Array});ctx.window=ctx;vm.runInContext(src,ctx);
 const T=game.context.THREE;
 const world=new T.Group(),palms=ctx.HUNTER_VEGETATION.create(T,{materialProfile:()=>({}),random:(a,b)=>a+(b-a)*.5})
   .build({world,palms:[[0,6,-900,1,0,0,0]],bushes:[],rocks:[],playerX:0,playerZ:0}).palms;
 const section=palms.variants[0],usual=section.lod;
 palms.update(0,0,true,false,focus);
 assert.equal(section.lod,0,'sniper upgrades distant palms');
 palms.update(0,0,true,false,null);
 assert.equal(section.lod,usual,'palms recover ordinary distance LOD when scope ends');
 console.log('PASS: x8 scope focuses enemy models, terrain meshes, and palm variants',JSON.stringify({target,terrain,usual}));
})().catch(err=>{console.error(err);process.exitCode=1});