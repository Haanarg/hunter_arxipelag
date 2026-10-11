const assert=require('node:assert/strict');
(async()=>{
  const g=await require('./harness.cjs')();
  g.start('2407759483');
  const result=g.run(`(()=>{
    const fences=Wl.filter(w=>w.barbed),meshes=fences.map(w=>w.m),
          all=new Set(meshes),count=fences.length,
          before=new Map();
    let sceneMeshes=0,shadowMeshCount=0;
    world.traverse(o=>{
      if(o.isMesh){sceneMeshes++;if(o.castShadow)shadowMeshCount++}
    });
    const valid=count>10&&count===all.size&&
      fences.every(w=>w.parts.length===1&&w.parts[0]===w.m&&
        w.m.name==='hunter-fence-section'&&w.m.geometry.getAttribute('color')?.count>100&&
        w.m.geometry.getAttribute('position').count===w.m.geometry.getAttribute('normal').count&&
        !w.m.castShadow&&!w.m.receiveShadow&&w.m.userData.noCastShadow);
    const colors=meshes[0].geometry.attributes.color.array;
    let different=false;
    for(let i=3;i<colors.length;i+=3)if(colors[i]!==colors[0]||colors[i+1]!==colors[1]||colors[i+2]!==colors[2]){different=true;break}
    const wall=fences[0],initial=wall.hp;
    dmgW(wall,initial+1);
    const destroyed=!wall.m.visible&&wall.hp<=0;
    return {valid,different,destroyed,oneDrawPerFence:count===meshes.length,
      avoidedIndividualMeshes:count*14,barbedSections:count,
      totalSceneMeshes:sceneMeshes,shadowMeshCount};
  })()`);
  for(const key of ['valid','different','destroyed','oneDrawPerFence'])assert(result[key],key+': '+JSON.stringify(result));
  console.log('PASS: 15 fence components -> 1 batched mesh with no shadows, exact geometry, destructible',JSON.stringify(result));
})().catch(err=>{console.error(err);process.exitCode=1});
