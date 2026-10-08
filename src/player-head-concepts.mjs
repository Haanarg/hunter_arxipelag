// Quatre propostes de cap i coll reduïts: només per a proves.html.
// El model jugable, el rig del cos, les articulacions i les animacions no es toquen.
import './palette.js';
import './player-model.js';
// La proposta D i el joc comparteixen una única definició de proporcions.
const selectedD=window.HUNTER_PLAYER_MODEL.headStyles.compactD;

export const playerHeadConcepts=Object.freeze([
  Object.freeze({
    name:'A · 75% proporcional',
    description:'Cap al 75% uniforme, coll més curt i posició natural lleugerament més baixa.',
    headScale:[.75,.75,.75],neckScale:[.78,.72,.78],headY:3.31,
    visorDepth:1,visorTilt:0,capY:-.01
  }),
  Object.freeze({
    name:'B · 75% estret',
    description:'Cara més estreta i una mica més alta; coll prim i visera escurçada.',
    headScale:[.72,.78,.74],neckScale:[.72,.70,.72],headY:3.29,
    visorDepth:.92,visorTilt:.02,capY:-.015
  }),
  Object.freeze({
    name:'C · 75% compacte ample',
    description:'Cap lleugerament ample i menys alt, coll curt i visera més marcada.',
    headScale:[.79,.72,.76],neckScale:[.82,.68,.82],headY:3.28,
    visorDepth:1.05,visorTilt:0,capY:-.02
  }),
  Object.freeze({
    name:'D · 75% tàctic baix',
    description:'Silueta compacta, coll recollit, cap més baix i gorra enfonsada.',
    headScale:[...selectedD.headScale],neckScale:[...selectedD.neckScale],headY:selectedD.headY,
    visorDepth:selectedD.visorDepth,visorTilt:selectedD.visorTilt,capY:selectedD.capY
  })
]);

// El model original crea el coll com un cilindre de pell a y=3.02.
// El detectem dins d'aquesta còpia, sense modificar la fàbrica original.
function findNeck(model,unitScale){
  const neckY=3.02*unitScale;
  return model.children.find(o=>
    o.isMesh&&o.geometry?.type==='CylinderGeometry'&&
    Math.abs(o.position.x)<1e-6&&Math.abs(o.position.z)<1e-6&&
    Math.abs(o.position.y-neckY)<.06*unitScale&&
    Math.abs(o.geometry.parameters?.height-.28)<1e-5
  )||null;
}

export function createPlayerHeadConcept(THREE,index,opts={}){
  const config=playerHeadConcepts[index];
  if(!config)throw new RangeError('Proposta de cap inexistent: '+index);
  const model=window.HUNTER_PLAYER_MODEL.create(THREE,opts);
  const u=model.userData,head=u.head,unitScale=opts.unitScale??1;
  const neck=findNeck(model,unitScale);
  if(!neck)throw new Error('No s’ha trobat el coll del model original del jugador');

  // Cabell, gorra, ulleres, visera, nas i orelles segueixen l'escala del cap.
  head.scale.set(...config.headScale);
  head.position.y=config.headY*unitScale;

  // Es conserva el cilindre original, però més estret i curt.
  neck.scale.x*=config.neckScale[0];
  neck.scale.y*=config.neckScale[1];
  neck.scale.z*=config.neckScale[2];

  if(u.visor){
    u.visor.scale.z=config.visorDepth;
    u.visor.rotation.x=config.visorTilt;
  }
  if(u.cap)u.cap.position.y+=config.capY*unitScale;

  u.headConcept={
    index,name:config.name,
    headScale:[...config.headScale],neckScale:[...config.neckScale],
    headY:config.headY,neck,visorDepth:config.visorDepth,visorTilt:config.visorTilt
  };
  return model;
}
