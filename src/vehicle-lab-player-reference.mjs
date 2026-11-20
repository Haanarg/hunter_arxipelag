import {createHumanProposal,HUMAN_VERSION} from './human-proposals.mjs';
import {HUMAN_PLAYER_GAME_NATIVE_HEIGHT} from './human-model-catalog.mjs';

// Referència de vehicles: malla HUMANS V18 i escala del protagonista del joc.
// Fora de l'arbre del vehicle perquè no hereti cap escala del xassís.
export function createLabPlayerReference(THREE){
 const player=createHumanProposal(THREE,'player','a',{visualOnly:true,nativeHeight:HUMAN_PLAYER_GAME_NATIVE_HEIGHT});
 player.name='Protagonista · HUMANS V18 · model nou';
 player.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(player);
 const reference=new THREE.Group();
 reference.name='Referència protagonista · '+HUMAN_VERSION;
 player.position.y=-bounds.min.y;
 reference.add(player);
 reference.userData.playerReference=true;
 reference.userData.modelVersion=HUMAN_VERSION;
 reference.userData.nativeHeight=HUMAN_PLAYER_GAME_NATIVE_HEIGHT;
 reference.userData.height=bounds.max.y-bounds.min.y;
 return reference;
}
