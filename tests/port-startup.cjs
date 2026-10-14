// Perfil específic de ports (mapa petit) i garantia de complexos funcionals.
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.context.performance.now=()=>Number(process.hrtime.bigint())/1e6;
 const started=performance.now();
 game.start(process.env.SEED||'67',1);
 const stats=game.context.HUNTER_BUILD_STATS;
 const ports=game.run("world.userData.compounds.filter(c=>c.id==='port').map(c=>({x:c.x,z:c.z,vehicles:c.vehicles.length}))");
 assert(ports.length>=1,'el mapa ha de tenir almenys un port');
 assert(ports.every(p=>p.vehicles>=2),'els ports han de tenir embarcacions');
 assert(stats.portSearch.guaranteedPorts>=1,'la cerca garantida ha de situar un port');
 assert(stats.portSearch.fastPortCandidates>0,'s ha executat la cerca ràpida');
 console.log('PORT_STARTUP',JSON.stringify({seed:process.env.SEED||'67',worldMs:Math.round(performance.now()-started),guaranteedPortsMs:stats.stages.guaranteedPorts,portSearch:stats.portSearch,ports}));
})().catch(e=>{console.error(e);process.exitCode=1});
