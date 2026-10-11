const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const start=html.slice(html.indexOf('<div id="startMenu"'),html.indexOf('<div id="performanceScreen"'));
 const screen=html.slice(html.indexOf('<div id="performanceScreen"'),html.indexOf('<div id="seedSearchScreen"'));
 for(const id of ['disablePalms','disableWater','disableShadows']){
   assert(!start.includes('id="'+id+'"'),'toggle '+id+' must not clutter landing screen');
   assert(screen.includes('id="'+id+'"'),'toggle '+id+' must be in performance screen');
   assert(!new RegExp('id="'+id+'"[^>]*checked').test(screen),'toggle '+id+' must be unchecked by default');
 }
 const g=await require('./harness.cjs')();
 g.start('2407759483');
 const output=g.run("(()=>{\n    const initial={seed:seed>>>0,buildings:B.length,vehicles:V.length,enemies:E.length,\n      fences:Wl.filter(w=>w.barbed).length,decoration:staticVisualBatches.length};\n    const original={x:P.x,z:P.z,y:P.y};\n    const one=B[0],baseVisible=one.o.visible;\n    P.x=50000;P.z=50000;updateDistanceVisibility();\n    const far={\n      buildings:B.every(b=>!b.o.visible),\n      fences:Wl.filter(w=>w.barbed).every(w=>!w.m.visible),\n      vehicles:V.every(v=>!v.o.visible),\n      enemies:E.every(e=>!e.o?.visible),\n      props:staticVisualBatches.every(m=>!m.visible),\n      stats:visibilityStats.buildings>0&&visibilityStats.fences>0&&visibilityStats.vehicles>0\n    };\n    P.x=original.x;P.z=original.z;P.y=original.y;updateDistanceVisibility();\n    const returned=one.o.visible===baseVisible&&V.some(v=>v.o.visible)&&\n      Wl.some(w=>w.barbed&&w.m.visible);\n    const preserved=seed>>>0===initial.seed&&B.length===initial.buildings&&\n      V.length===initial.vehicles&&E.length===initial.enemies;\n    const totalProfiler=Object.keys(renderCategories).length>=8&&\n      B.some(b=>b.o.children.some(c=>c.isMesh&&typeof c.onBeforeRender==='function'));\n    return {initial,far,returned,preserved,totalProfiler};\n })()");
 for(const [name,passed] of Object.entries(output.far))assert(passed,name+': '+JSON.stringify(output));
 assert(output.returned&&output.preserved&&output.totalProfiler,'near objects and game world must survive distance culling');
 g.run('panel("pause")');
 assert(typeof g.el('performanceMenu').onclick==='function');
 g.el('performanceMenu').onclick();
 assert.equal(g.el('panelTitle').textContent,'Rendiment');
 assert.equal(g.el('disablePalmsPause').checked,false);
 g.el('disablePalmsPause').onchange({target:{checked:true}});
 assert(g.run('palmsDisabled'));
 g.el('disablePalmsPause').onchange({target:{checked:false}});
 g.el('performanceRefresh').onclick();
 assert(g.el('performanceBreakdown').textContent.includes('edificis:'));
 console.log('PASS: menu independent, distance culling, profiler categories and gameplay',JSON.stringify(output));
})().catch(e=>{console.error(e);process.exitCode=1});