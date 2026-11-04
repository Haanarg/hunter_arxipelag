import {createArcadeBlastFX} from './arcade-blast-fx.mjs?v=0.6.120';
window.HUNTER_CREATE_ARCADE_BLAST_FX=createArcadeBlastFX;
import {createNativePrediction} from './native-coop-prediction.mjs?local=0.6.120';
import {createNativeCoopInterpolation} from './native-coop-interpolation.mjs?smooth=14';
import {createNativeCoopProjectileVisual} from './native-coop-projectile-visual.mjs?shots=4';
import {createNativeCoopGrenadeVisual} from './native-coop-grenade-visual.mjs?ballistic=1';
window.HUNTER_CREATE_NATIVE_PREDICTION=createNativePrediction;
window.HUNTER_CREATE_NATIVE_INTERPOLATION=createNativeCoopInterpolation;
window.HUNTER_CREATE_NATIVE_COOP_PROJECTILE_VISUAL=createNativeCoopProjectileVisual;
window.HUNTER_CREATE_NATIVE_COOP_GRENADE_VISUAL=createNativeCoopGrenadeVisual;
import {SHARED_SHARKS} from './shark-motion-core.mjs?v=0.6.120';
window.HUNTER_SHARED_SHARKS=SHARED_SHARKS;
import * as enemyPerception from './enemy-perception-core.mjs';
window.HUNTER_ENEMY_PERCEPTION=enemyPerception;
import * as enemyCarSteering from './enemy-car-steering.mjs?v=0.6.120';
window.HUNTER_ENEMY_CAR_STEERING=enemyCarSteering;
import * as enemyRequisition from './enemy-vehicle-requisition.mjs?v=0.6.120';
window.HUNTER_ENEMY_REQUISITION=enemyRequisition;
import {createNativeCoopConnection} from './native-coop-connection.mjs?v=0.6.120&net=2';
window.HUNTER_NATIVE_COOP_TRANSPORT=createNativeCoopConnection;
import * as debrisCore from './debris-core.mjs?v=0.6.120';
window.HUNTER_DEBRIS_CORE=debrisCore;
import * as vehicleEnvironment from './vehicle-environment-core.mjs';
window.HUNTER_VEHICLE_ENVIRONMENT=vehicleEnvironment;
import * as fenceVisual from './fence-visual-core.mjs';
window.HUNTER_FENCE_VISUAL=fenceVisual;
import * as vegetationLayout from './vegetation-layout.mjs';
window.HUNTER_VEGETATION_LAYOUT=vegetationLayout;
import * as towerModel from './tower-model.mjs?v=0.6.120';
window.HUNTER_TOWER_MODEL=towerModel;
import * as weapons from './weapon-catalog.mjs?v=0.6.120&rifleCone80=1';
window.HUNTER_SHARED_WEAPONS=weapons;
import * as sharedBatching from './player-batching-core.mjs';
window.HUNTER_SHARED_BATCHING=sharedBatching;
import * as vehicleModels from './vehicle-model-core.mjs?v=0.6.120';
window.HUNTER_SHARED_VEHICLE_MODELS=vehicleModels;
import * as sharedAccuracy from './enemy-accuracy-core.mjs';
window.HUNTER_SHARED_ACCURACY=sharedAccuracy;
import * as projectileModel from './projectile-model.mjs';
window.HUNTER_PROJECTILE_MODEL=projectileModel;
import * as sharedProjectiles from './projectile-core.mjs';
window.HUNTER_SHARED_PROJECTILES=sharedProjectiles;
import * as sharedAiming from './aiming-core.mjs?v=0.6.120&rifleCone80=1';
window.HUNTER_SHARED_AIMING=sharedAiming;
import * as sharedModels from './player-model-core.mjs';
window.HUNTER_SHARED_MODELS=sharedModels;
import * as occupantDamage from './vehicle-occupant-damage-core.mjs?v=0.6.120';
window.HUNTER_VEHICLE_OCCUPANT_DAMAGE=occupantDamage;
import * as sharedCombat from './combat-rules.mjs?v=0.6.120&visual=6&friendlyCover=1';
import * as sharedVehicles from './vehicle-dynamics-core.mjs';
import * as ferryDeck from './ferry-deck-core.mjs';
window.HUNTER_FERRY_DECK=ferryDeck;
window.HUNTER_SHARED_COMBAT=sharedCombat;window.HUNTER_SHARED_VEHICLES=sharedVehicles;
import * as buildingShell from './building-shell.mjs?v=0.6.120';
window.HUNTER_BUILDING_SHELL=buildingShell;
import * as compoundPlanning from './compound-planning.mjs?v=0.6.120';
window.HUNTER_COMPOUND_PLANNING=compoundPlanning;
import * as worldGeneration from './world-generation-core.mjs?v=0.6.120&visual=6';
import * as canonicalWater from './canonical-water.mjs?v=0.6.120';
window.HUNTER_WORLD_GENERATION=worldGeneration;window.HUNTER_CANONICAL_WATER=canonicalWater;
import * as walkSurfaces from './walk-surfaces.mjs?v=0.6.120';
window.HUNTER_WALK_SURFACES=walkSurfaces;
import * as worldPhysics from './world-physics.mjs?v=0.6.120';
import * as worldAdapter from './world-adapter.mjs?v=0.6.120';
window.HUNTER_WORLD_PHYSICS=worldPhysics;window.HUNTER_WORLD_ADAPTER=worldAdapter;
import {createCoopConnection} from './coop-connection.mjs?v=0.6.120';
window.HUNTER_COOP_CONNECTION=createCoopConnection;
import * as playerSimulation from './player-simulation.mjs?v=0.6.120';
window.HUNTER_PLAYER_SIMULATION=playerSimulation;
import * as operationJournal from './operation-journal.mjs?v=0.6.120';
window.HUNTER_JOURNAL=operationJournal;
import {accountConfig} from './account-config.mjs?v=0.6.120';
import {configuredAccounts,createAccountService} from './account-client.mjs?v=0.6.120';
import * as cloudFactory from './operation-cloud.mjs?v=0.6.120';
window.HUNTER_CLOUD_FACTORY=cloudFactory;
try{window.HUNTER_ACCOUNT_SERVICE=await configuredAccounts(accountConfig,{notify:()=>window.HUNTER_AUTH_CHANGED?.()});}
catch(_){window.HUNTER_ACCOUNT_SERVICE=createAccountService();console.warn('Els comptes no estan disponibles; el desament local continua actiu.');}
import * as operationFiles from './operation-files.mjs?v=0.6.120';
window.HUNTER_SAVE_FILES=operationFiles;
import * as operationSaves from './operation-save.mjs?v=0.6.120';
window.HUNTER_SAVES=operationSaves;
import * as compoundPaths from './compound-paths.mjs?v=0.6.120';
window.HUNTER_COMPOUND_PATHS=compoundPaths;
import {runtimeLayouts,chooseCompoundLayout} from './compound-runtime-layouts.mjs?v=0.6.120';
import * as compoundArchitecture from './compound-architecture.mjs?v=0.6.120';
window.HUNTER_RUNTIME_LAYOUTS=runtimeLayouts;window.HUNTER_CHOOSE_COMPOUND=chooseCompoundLayout;window.HUNTER_COMPOUND_ARCHITECTURE=compoundArchitecture;
import {createCompoundStructures} from './compound-structures.mjs';
window.HUNTER_COMPOUND_STRUCTURES=createCompoundStructures;
import {runtimeScripts} from './runtime-scripts.mjs';
import {RUNTIME_BUNDLE_PATH} from './runtime-bundle.mjs?v=0.6.120&visual=8&glassfix=2&smooth=13&friendlyCover=1&rifleCone80=1&bazookaShoulder=1';
import {compoundLayouts} from './compound-layouts.mjs';
window.HUNTER_COMPOUND_LAYOUTS=compoundLayouts;
import {GAME_VERSION} from './version.mjs?v=0.6.120';
import {createTruckModel} from './truck-model.mjs';
import {createCivilianCarModel} from './civilian-car-model.mjs';
window.HUNTER_CIVIL_C1A=createCivilianCarModel;
// Mateixa geometria A4.3 que es mostra a camio-proves.html.
window.HUNTER_TRUCK_CONCEPT=createTruckModel;
import * as rockFields from './rock-fields.mjs';
window.HUNTER_ROCK_FIELDS=rockFields;

const versionBadge=document.getElementById('versionBadge');
if(versionBadge)versionBadge.textContent='v'+GAME_VERSION;
window.HUNTER_VERSION=GAME_VERSION;

// Tres perfils; "Alts" és el predeterminat en qualsevol dispositiu.
// Es respecten sempre la selecció explícita i el paràmetre llegat low.
const graphicsQuality=document.getElementById('graphicsQuality');
const params=new URLSearchParams(location.search);
const requestedQuality=params.get('quality');
const legacyLow=params.get('low')==='1';
const validQualities=['desktop','mobile','ultra'];
const stressAuditRequested=params.get('perfAudit')==='1'&&params.get('stress')==='1';
const quality=stressAuditRequested?'desktop':
  validQualities.includes(requestedQuality)?requestedQuality:
  legacyLow?'mobile':'desktop';
window.HUNTER_GRAPHICS_QUALITY=quality;
window.HUNTER_FORCE_LOW_QUALITY=quality!=='desktop';
if(graphicsQuality){
  graphicsQuality.value=quality;
  graphicsQuality.addEventListener('change',()=>{
    const url=new URL(location.href);
    const selected=validQualities.includes(graphicsQuality.value)?
      graphicsQuality.value:'mobile';
    url.searchParams.delete('low');
    url.searchParams.set('quality',selected);
    // El renderer i els shaders canvien només amb una recàrrega;
    // mai no es redimensionen els buffers durant la partida.
    location.replace(url.toString());
  });
}

// Pont temporal: motor ESM i sistemes clàssics carregats seqüencialment.
try {
  const THREE = await import('../vendor/three-r186.module.mjs');
  THREE.ColorManagement.enabled = true;
  window.THREE = THREE;
  // El model D3.1 del cotxe militar és ara la versió procedural B.
  // La malla, normals, UV i textura es creen a partir de dades JavaScript
  // una sola vegada; no es demana cap GLB durant la partida.
  // Les dades procedurals són la font del model; els GLB s’han retirat.
  // Si les dades no es poden preparar, mantenim la geometria clàssica
  // de reserva per no impedir l'inici de la partida.
  try {
    const {prepareHumveeD31Runtime}=await import('./humvee-d31-runtime.mjs?v=0.6.120');
    window.HUNTER_HUMVEE_D31=await prepareHumveeD31Runtime(THREE,{vehicleScale:1.3});
    console.info('Humvee D3.1 procedural B · 175% carregat al joc',
      window.HUNTER_HUMVEE_D31.dimensions);
  } catch (humveeError) {
    window.HUNTER_HUMVEE_D31=null;
    console.warn('No es pot preparar el Humvee B; geometria clàssica de reserva',humveeError);
  }
  // El bundle inclou els scripts clàssics en el mateix ordre i preserva
  // les variables globals de la versió anterior. Només fem UNA petició.
  // Si el fitxer empaquetat no s'ha desplegat, recuperem el loader antic.
  const loadClassic=(path,versioned=false)=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.async=false;
    const url=new URL('../'+path,import.meta.url);
    if(versioned)url.searchParams.set('v',GAME_VERSION);
    script.src=url.href;
    const cleanup=()=>window.removeEventListener('error',onError);
    const onError=event=>{
      if(event.filename===script.src){cleanup();const error=event.error||new Error(event.message);error.runtimeExecution=true;reject(error)}
    };
    window.addEventListener('error',onError);
    script.onload=()=>{cleanup();resolve()};
    script.onerror=()=>{cleanup();reject(new Error('No es pot carregar '+path))};
    document.head.append(script);
  });
  const loadLegacy=async()=>{for(const path of runtimeScripts)await loadClassic(path,true)};
  const useBundle=params.get('runtime')!=='source'&&params.get('perfAudit')!=='1';
  let runtimeMode='source';
  if(useBundle&&RUNTIME_BUNDLE_PATH){
    try{await loadClassic(RUNTIME_BUNDLE_PATH);runtimeMode='bundle'}
    catch(error){
      // Un paquet parcialment executat no és segur de carregar una segona
      // vegada damunt els mateixos globals. Recarregam una pàgina neta.
      const fallback=new URL(location.href);
      fallback.searchParams.set('runtime','source');
      console.warn('Error amb el runtime agrupat; recarregant els scripts originals',error);
      location.replace(fallback.toString());
      throw error;
    }
  }else await loadLegacy();
  window.HUNTER_RUNTIME_MODE=runtimeMode;
  window.HUNTER_READY = true;
  const coopRoomId=new URLSearchParams(location.search).get('coop');
  if(coopRoomId){const account=window.HUNTER_ACCOUNT_SERVICE.status();if(account.user&&account.approval==='approved'){const result=await window.HUNTER_ACCOUNT_SERVICE.request('coop/current',{headers:{'X-Hunter-User':account.user.id}});if(result.room?.id===coopRoomId)await window.HUNTER_NATIVE_COOP.start(result.room);else openCoopPanel();}else openCoopPanel();}
} catch (error) {
  console.error('No s’ha pogut iniciar Húnter', error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.style.cssText = 'position:fixed;inset:20%;z-index:999;background:#172b36;color:white;padding:24px';
  // Mostrar l'error real: un problema del runtime no és un error de WebGL.
  message.style.cssText += ';inset:15%;overflow:auto;font:16px/1.45 system-ui;white-space:pre-wrap';
  message.textContent = 'Error en iniciar Húnter (v'+GAME_VERSION+').\n'+
    (error?.name||'Error')+': '+(error?.message||'Causa desconeguda')+`\n\nSi persisteix, envia una captura d’aquest missatge.`;
  document.body.append(message);
}


