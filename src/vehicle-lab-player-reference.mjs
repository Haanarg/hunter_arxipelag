import {playerModel} from './player-model-core.mjs';
import {playerBatching} from './player-batching-core.mjs';

// Same body, compact-D head and two scale factors as characters.createPlayer.
// Neutral, unarmed pose: the reference measures the protagonist, not his equipment.
// Keep it outside the vehicle root so fit/scale/export never resizes the soldier.
export function createLabPlayerReference(THREE){
 const player=playerModel.create(THREE,{unitScale:1.2,headVariant:'compactD',articulated:true});
 player.name='Protagonista · escala real del joc';
 player.scale.setScalar(2/3);
 player.rotation.order='YZX';
 playerBatching.optimize(THREE,player);
 const bounds=new THREE.Box3().setFromObject(player);
 const reference=new THREE.Group();reference.name='Referència protagonista';
 player.position.y=-bounds.min.y;
 reference.add(player);
 reference.userData.playerReference=true;
 reference.userData.height=bounds.max.y-bounds.min.y;
 return reference;
}
