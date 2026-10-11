const assert=require('node:assert/strict');
(async()=>{
 const g=await require('./harness.cjs')();
 const check=g.run("(()=>{\n    const root=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0xcc9966,transparent:true});\n    const parts=buildingVisual.addWindowedWall(root,{lx:0,lz:0,sx:18,sz:.8,height:8,material:mat});\n    return{batchCount:parts.length,children:root.children.length,\n      mats:parts.map(m=>m.material===mat?'wall':m.material.color.getHexString()),\n      vertices:parts.map(m=>m.geometry.getAttribute('position').count),\n      batchFlag:parts.every(m=>m.userData.windowFacadeBatch)};\n })()");
 assert.equal(check.batchCount,3,'facade has exactly one wall, one glass and one trim mesh');
 assert.equal(check.children,3);
 assert(check.batchFlag);
 assert(check.vertices.every(n=>n>=36));
 g.start('67');
 const world=g.run("(()=>{\n   const groups=Wl.filter(w=>w.parts?.length&&w.parts[0].userData.windowFacadeBatch);\n   const first=groups[0],before=first.parts.length;\n   const beforeVisible=first.parts.every(m=>m.visible);\n   dmgW(first,1000);\n   return{count:groups.length,before,beforeVisible,destroyed:first.parts.every(m=>!m.visible),\n     retainedCollision:Wl.every(w=>w!==first)};\n })()");
 assert(world.count>0&&world.before===3&&world.beforeVisible&&world.destroyed&&world.retainedCollision,JSON.stringify(world));
 console.log('PASS: facades 3 meshes; individual damage and destruction remain intact',JSON.stringify({check,world}));
})().catch(err=>{console.error(err);process.exitCode=1});