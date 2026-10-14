const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('12345',1);
 const report=game.run(`(()=>{
   const result=[];
   for(const c of world.userData.compounds.filter(c=>c.id==='outpost')){
     const u={t:'soldat'};
     for(let i=1;i<c.patrol.length;i++){
       const a=c.patrol[i-1],b=c.patrol[i];
       if(enemySweep(u,...a,...b,0,0,false))continue;
       const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.45);
       let reason=null;
       for(let j=0;j<=n;j++){
         const t=j/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
         if(enemySolidAt(u,x,z,0))continue;
         const y=groundAt(x,z),walls=wallCandidates(x,z,3).filter(w=>
           !w.open&&w.playerBlock!==false&&w.y1>=y+.15&&w.y0<=y+3.4&&
           x>w.x0-1.05&&x<w.x1+1.05&&z>w.z0-1.05&&z<w.z1+1.05);
         const tree=treeAt(x,z,1.05);
         reason={x,z,terrain:hAt(x,z),floor:y,tree:tree?{x:tree.x,z:tree.z}:null,
           walls:walls.map(w=>({cx:w.cx,cz:w.cz,x0:w.x0,x1:w.x1,z0:w.z0,z1:w.z1,
             barbed:w.barbed,kind:w.owner?.kind||'unknown'}))};
         break;
       }
       result.push({outpost:[c.x,c.z],angle:c.angle,leg:i,from:a,to:b,reason});
     }
   }
   return result;
 })()`);
 console.log('OUTPOST_PATH_DIAG',JSON.stringify(report));
 assert.equal(report.length,0,'Una avançada generada té un circuit de patrulla inviable');
})().catch(err=>{console.error(err);process.exitCode=1});
