'use strict';
// Un procés independent per mode: vm executa exactament el mateix codi clàssic
// que el navegador (70 scripts solts o el bundle concatenat).
const path=require('node:path');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const {createHumanGameRuntimeV17}=await import('../src/human-game-runtime-v17.mjs');
  // Les malles del jugador les crea player-model-core.mjs, un mòdul ESM
  // importat pel harness. El rig V18 s'instal·la a la mateixa fàbrica real.
  globalThis.HUNTER_HUMAN_V17=createHumanGameRuntimeV17();
  const game=await require('./harness.cjs')(root);
  game.start('67',1);
  game.frame(16);
  function capture(){
    return JSON.parse(game.run(`JSON.stringify((()=>{
      const u=pl.userData,rig=u.humanGameCanonicalRig,
        joints=u.humanGameCanonicalJoints;
      let meshes=0,casters=0;
      rig?.traverse(o=>{if(o.isMesh){meshes++;if(o.castShadow)casters++}});
      const angle=id=>joints?.[id]?Number(joints[id].rotation.x.toFixed(4)):null;
      return {
        rig:!!rig,pose:typeof u.humanGamePose,meshes,casters,
        selectedCasters:shadowStats.playerCasters,
        landMove:Number((u.gameLandMove||0).toFixed(3)),
        phase:Number((u.ph||0).toFixed(4)),
        swim:u.gameSwimStyle||null,swimMode:u.gameSwimMode||null,
        swimBlend:Number((u.gameSwimBlend||0).toFixed(3)),
        hipL:angle('hipL'),hipR:angle('hipR'),
        kneeL:angle('kneeL'),kneeR:angle('kneeR'),
        shoulderL:angle('shoulderL'),shoulderR:angle('shoulderR'),
        shadowMap:!!ren.shadowMap.enabled,sunShadow:!!sun.castShadow,
        shadowDisabled:!!shadowsDisabled
      };
    })())`));
  }
  const idle=capture();
  game.run('for(let i=0;i<24;i++){animPl(1,1/60,false,0);pl.userData.humanGamePose?.()}');
  const walking=capture();
  game.run('swimming=true;for(let i=0;i<24;i++){animPl(1,1/60,false,0);pl.userData.humanGamePose?.()}');
  const breast=capture();
  game.run('for(let i=0;i<24;i++){animPl(1,1/60,true,0);pl.userData.humanGamePose?.()}');
  const crawl=capture();
  const snapshot={idle,walking,breast,crawl};
  console.log('HUNTER_PARITY_SNAPSHOT '+JSON.stringify(snapshot));
})().catch(error=>{console.error(error);process.exitCode=1});
