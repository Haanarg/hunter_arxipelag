const assert=require('node:assert/strict');
(async()=>{
  const g=await require('./harness.cjs')();
  const geometry=g.run("(()=>{\n    const normal=buildingVisual.createShell({width:16,depth:12,height:7,wallColor:0xffffff,roofColor:0xffffff});\n    const hangar=buildingVisual.createHangarShell({width:32,depth:30,height:12,wallColor:0xffffff,roofColor:0xffffff});\n    const rim=normal.roof.children.filter(m=>m.userData.roofBatch),arch=hangar.roof.children.filter(m=>m.userData.roofBatch);\n    return{\n      normal:rim.length===1&&rim[0].geometry.attributes.position.count===144&&normal.roof.children.length===2,\n      hangar:arch.length===2&&hangar.roof.children.length===2&&arch.reduce((s,m)=>s+m.geometry.attributes.position.count,0)===1440&&hangar.roof.userData.hangarRoof&&hangar.roof.userData.hitSegments.length===10\n    }\n  })()");
  assert(geometry.normal&&geometry.hangar,'roof batch geometry remains intact');
  g.start('67');
  const result=g.run("(()=>{\n    const candidates=shadowStats.candidates,active=shadowStats.active,excludedDetail=shadowStats.excludedDetail;\n    const reduced=candidates>0&&active>0&&active<candidates;\n    const clean=shadowCandidates.every(e=>!e.mesh.userData.noCastShadow&&!e.mesh.isInstancedMesh&&!e.mesh.userData.terrainTile);\n    setShadowsDisabled(true);\n    const disabled=shadowsDisabled&&!ren.shadowMap.enabled&&!sun.castShadow&&shadowStats.active===0&&!shadowCandidates.some(e=>e.mesh.castShadow);\n    setShadowsDisabled(false);\n    const restored=!shadowsDisabled&&ren.shadowMap.enabled&&sun.castShadow&&shadowStats.active>0;\n    return{reduced,clean,disabled,restored,candidates,active,excludedDetail};\n  })()");
  for(const key of ['reduced','clean','disabled','restored'])assert(result[key],key+': '+JSON.stringify(result));
  g.run('panel("pause")');
  const pause=g.el('disableShadowsPause');
  assert.equal(pause.checked,false);
  pause.onchange({target:{checked:true}});
  assert(g.run('shadowsDisabled&&!ren.shadowMap.enabled'));
  pause.onchange({target:{checked:false}});
  assert(g.run('!shadowsDisabled&&ren.shadowMap.enabled'));
  console.log('PASS: shadow culling, live switch, safe roof batches',JSON.stringify({geometry,result}));
})().catch(err=>{console.error(err);process.exitCode=1});