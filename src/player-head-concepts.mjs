// Propostes de reducció del cap del jugador (només per a la web de proves).
// Conservem exactament el rig, el vestit, les articulacions i les animacions.
import './palette.js';
import './player-model.js';

export const playerHeadConcepts=Object.freeze([
  Object.freeze({
    name:'A · Proporcional',
    description:'Reducció uniforme d’un 33%. Conserva el cap i la gorra originals, sense alterar-ne la forma.',
    scale:[.67,.67,.67],headY:3.35,visorDepth:1,visorTilt:0,capY:0
  }),
  Object.freeze({
    name:'B · Estret',
    description:'Cara més estreta i un punt més alta. Visera una mica més curta per equilibrar el perfil.',
    scale:[.62,.70,.66],headY:3.32,visorDepth:.88,visorTilt:.025,capY:0
  }),
  Object.freeze({
    name:'C · Compacte ample',
    description:'Cap lleugerament més ample i menys alt, amb la visera clàssica una mica més marcada.',
    scale:[.71,.63,.68],headY:3.32,visorDepth:1.06,visorTilt:0,capY:-.022
  }),
  Object.freeze({
    name:'D · Tàctic baix',
    description:'Silueta més recollida, clatell estret, gorra baixa i visera més curta.',
    scale:[.65,.65,.62],headY:3.29,visorDepth:.91,visorTilt:.07,capY:-.040
  })
]);

export function createPlayerHeadConcept(THREE,index,opts={}){
  const config=playerHeadConcepts[index];
  if(!config)throw new RangeError('Proposta de cap inexistent: '+index);
  const model=window.HUNTER_PLAYER_MODEL.create(THREE,opts);
  const u=model.userData,head=u.head;
  // Head pivots at the original skull center: glasses, ears, nose, cap and hair
  // are scaled together so no feature is left outside of the new head.
  head.scale.set(...config.scale);
  head.position.y=config.headY;
  if(u.visor){
    u.visor.scale.z=config.visorDepth;
    u.visor.rotation.x=config.visorTilt;
  }
  if(u.cap)u.cap.position.y+=config.capY;
  model.userData.headConcept={
    index, name:config.name, scale:[...config.scale],headY:config.headY,
    visorDepth:config.visorDepth, visorTilt:config.visorTilt
  };
  return model;
}
