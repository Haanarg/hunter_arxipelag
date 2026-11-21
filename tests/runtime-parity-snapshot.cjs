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
  // Prova de la mateixa ruta de l'autoapuntat que usa combat.js:
  // la pistola té un objectiu actiu i el controlador respon durant 36 ticks.
  // La meta de les mans surt del V18, no d'un punt 3.10 del rig 2/3.
  const pistolAim=JSON.parse(game.run(`JSON.stringify((()=>{
    swimming=false;
    const u=pl.userData;
    u.visualAimTargetLocked=true;
    u.visualAimDirection=new THREE.Vector3(0,0,-1).applyQuaternion(
      pl.getWorldQuaternion(new THREE.Quaternion()));
    u.pistolAimTime=2;
    u.pistolShotAge=10;
    for(let i=0;i<36;i++){
      animPl(0,1/60,false,0);
      u.humanGamePose?.();
    }
    pl.updateMatrixWorld(true);
    const joints=u.humanGameCanonicalJoints;
    const head=joints.head.getWorldPosition(new THREE.Vector3());
    const right=joints.wristR.getWorldPosition(new THREE.Vector3());
    const left=joints.wristL.getWorldPosition(new THREE.Vector3());
    if(!u.pistolRig.nativeGoal)throw Error('Autoapuntat sense objectiu V18 natiu');
    const mount=u.humanGameLogicalWeaponRoot;
    if(!mount||u.gun.parent!==mount)
      throw Error('Pistola V18 sense ancoratge independent del tors antic');
    const expected=u.pistolRig.nativeGoal.clone();
    mount.worldToLocal(expected);
    return {
      blend:Number(u.pistolBlend.toFixed(3)),
      nativeAim:true,
      aimWorldY:Number(u.pistolRig.nativeGoal.y.toFixed(4)),
      targetError:Number(u.pistolRig.aim.distanceTo(expected).toFixed(5)),
      headY:Number(head.y.toFixed(4)),
      wristRY:Number(right.y.toFixed(4)),
      wristLY:Number(left.y.toFixed(4)),
      aimLocalY:Number(u.pistolRig.aim.y.toFixed(4)),
      shoulderR:Number(joints.shoulderR.rotation.x.toFixed(4)),
      shoulderL:Number(joints.shoulderL.rotation.x.toFixed(4))
    };
  })())`));
  const snapshot={idle,walking,breast,crawl,pistolAim};
  console.log('HUNTER_PARITY_SNAPSHOT '+JSON.stringify(snapshot));
})().catch(error=>{console.error(error);process.exitCode=1});
