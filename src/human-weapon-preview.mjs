// Standalone lab adapter: extracts the EXACT mounted weapon meshes from
// characters.createPlayer, without touching the bundled gameplay source.
import {playerBatching} from './player-batching-core.mjs';
import {playerModel} from './player-model-core.mjs';
import {palette} from './palette-core.mjs';

let source=null;
export const GAME_WEAPON_TYPES=Object.freeze(['pistol','assault','sniper','bazooka','knife','cutters','grenade']);

export function createGameWeaponPreview(T,kind){
 if(!GAME_WEAPON_TYPES.includes(kind))throw Error('Arma del joc no reconeguda: '+kind);
 if(!source){
  globalThis.HUNTER_PLAYER_BATCH=playerBatching;
  globalThis.HUNTER_PLAYER_MODEL=playerModel;
  globalThis.HUNTER_PALETTE=palette;
  const api=globalThis.HUNTER_CHARACTERS;
  if(typeof api?.createPlayer!=='function'||!globalThis.HUNTER_BOLT_CUTTERS)
   throw Error('Cal carregar els models compartits de personatges i cisalles abans de les armes');
  const mat=c=>new T.MeshStandardMaterial({color:c});
  const box=(parent,w,h,d,color,x=0,y=0,z=0)=>{
   const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));
   mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  };
  const player=api.createPlayer(T,{box});
  source=Object.fromEntries(GAME_WEAPON_TYPES.map(type=>[type,player.userData[type==='pistol'?'gun':type==='cutters'?'cisalla':type]]));
  for(const type of GAME_WEAPON_TYPES)if(!source[type]?.isObject3D)
   throw Error('Arma real absent al personatge del joc: '+type);
 }
 const visual=source[kind].clone(true);
 visual.visible=true;visual.position.set(0,0,0);visual.rotation.set(0,0,0);
 visual.name='Arma real del joc · '+kind;
 visual.userData.gameWeaponType=kind;
 // Distinct editable materials/geometries: disposing a switched candidate
 // must never affect the cached game source or another live preview.
 const mats=new Map(),geos=new Map();
 visual.traverse(node=>{
  node.visible=node.name==='flash'||node.name==='Flash'?false:node.visible;
  if(!node.isMesh)return;
  if(!geos.has(node.geometry))geos.set(node.geometry,node.geometry.clone());
  node.geometry=geos.get(node.geometry);
  const own=m=>{
   if(!mats.has(m))mats.set(m,m.clone());
   return mats.get(m);
  };
  node.material=Array.isArray(node.material)?node.material.map(own):own(node.material);
 });
 return visual;
}
