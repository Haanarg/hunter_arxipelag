// Única escala de punteria per a soldats, guàrdies, vehicles i patrulleres.
// La desviació és transversal a la línia de tir i creix amb la distància.
window.HUNTER_ENEMY_ACCURACY=(()=>{
  const profiles=Object.freeze({
    rifle:1,elite:.8,pistol:1.15,jeep:1.15,tower:1.1,
    tankette:1.4,tank:2.5,towerHeavy:2.2,bazooka:2.5,
    marineMG:2.1,marineRocket:2.4
  });
  const explosive=new Set(['tank','towerHeavy','bazooka','marineRocket']);
  const difficultyScale=difficulty=>{
    const d=Math.max(.6,Math.min(1.5,Number.isFinite(difficulty)?difficulty:1));
    // Fàcil = 3; Normal = 1,5; Difícil = 1.
    return d<=1?1.5+(1-d)*3.75:1+(1.5-d);
  };
  const distanceScale=distance=>Math.max(.65,Math.min(3,Math.max(0,distance)/80));
  function spread(difficulty,weapon='rifle',distance=80){
    const skill=difficultyScale(difficulty),
          weaponFactor=profiles[weapon]??profiles.rifle,
          splashFactor=explosive.has(weapon)?1+.45*(skill-1):1,
          horizontal=.8*skill*weaponFactor*splashFactor*distanceScale(distance);
    return {horizontal,vertical:horizontal*.45};
  }
  function sample(difficulty,weapon,dx,dy,dz,random){
    const d=Math.hypot(dx,dy,dz),flat=Math.hypot(dx,dz),
          s=spread(difficulty,weapon,d),
          lateral=random(-s.horizontal,s.horizontal);
    // Un únic error lateral perpendicular al tir (no dos errors X/Z).
    return {x:flat>1e-6?-dz/flat*lateral:lateral,
      y:random(-s.vertical,s.vertical),
      z:flat>1e-6?dx/flat*lateral:0};
  }
  // Probabilitat teòrica sobre una silueta immòbil de cara,
  // sense cobertures, moviment, projectils ni col·lisions.
  function estimateHitChance(difficulty,weapon='rifle',distance=80,width=1.2,height=1.8){
    const s=spread(difficulty,weapon,distance);
    return Math.min(1,Math.max(0,width)/(2*s.horizontal))*
      Math.min(1,Math.max(0,height)/(2*s.vertical));
  }
  return Object.freeze({profiles,difficultyScale,distanceScale,spread,sample,estimateHitChance});
})();
