const assert=require('assert');
(async()=>{
 const game=await require('./harness.cjs')();game.start();
 const spawn=game.run(`({count:E.length,blocked:E.filter(u=>u.t!=='torre'&&!enemyMoveClear(u,u.x,u.z,u.hd)).map(u=>u.t)})`);
 assert.equal(spawn.blocked.length,0,'generated enemies start clear of obstacles and each other');
 const start=Date.now();
 game.run(`globalThis.badMoves=0;globalThis.moved=new Set();
 for(let n=0;n<180;n++){
   const positions=E.map(u=>[u.x,u.z]);updEn(.05);
   for(let i=0;i<E.length;i++){
     const u=E[i];
     if(Math.hypot(u.x-positions[i][0],u.z-positions[i][1])>.001){moved.add(i);if(!enemyMoveClear(u,u.x,u.z,u.hd))badMoves++}
   }
 }`);
 const result=game.run('({badMoves,moved:moved.size})');
 assert.equal(result.badMoves,0,'actual AI never moves into blocked space');assert(result.moved>20,'patrols remain active');
 console.log(JSON.stringify({spawn,result,simulationSeconds:9,testMilliseconds:Date.now()-start}));
})().catch(e=>{console.error(e);process.exitCode=1});
