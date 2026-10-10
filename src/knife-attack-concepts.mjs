// Previsualitzacions exclusives: quatre iteracions de l'atac de la postura 4B.
// No afecten el moviment ni el dany real del joc fins que se'n triï una.
export const knifeAttackConcepts=Object.freeze([
  Object.freeze({
    name:'A · Gir abans de l’estocada',tag:'Precís',
    description:'Primer gira el puny 90° cap al cos; després fa una estocada recta i retorna a la guàrdia.',
    turn:[.04,.27,.66,.90],windup:.14,reach:1.27,open:-.28,extend:.63,
    thrust:[.31,.57,.83],knifeX:-.18,knifeZ:-.16
  }),
  Object.freeze({
    name:'B · Gir i estocada simultanis',tag:'Ràpid',
    description:'La mà gira 90° mentre el braç surt cap endavant. Moviment curt i contundent.',
    turn:[.28,.53,.64,.89],windup:.10,reach:1.40,open:-.30,extend:.66,
    thrust:[.26,.55,.82],knifeX:-.16,knifeZ:-.18
  }),
  Object.freeze({
    name:'C · Estocada lateral',tag:'Lateral',
    description:'Preparació amb el colze separat del cos; el puny gira cap a dins abans de clavar endavant.',
    // Els valors de la 3B activa són la font de veritat de la 3A també.
    ...window.HUNTER_CHARACTERS.knifeAttack3B
  }),
  Object.freeze({
    name:'D · Estocada alta',tag:'Alt',
    description:'Recull una mica la mà, la gira 90° i estira el braç més amunt cap al davant.',
    turn:[.06,.40,.65,.93],windup:.21,reach:1.52,open:-.14,extend:.57,
    thrust:[.31,.57,.83],knifeX:.12,knifeZ:-.13
  })
]);
// Comparació específica de la proposta 3: no canvia la trajectòria del
// braç, només inverteix el gir local del canell (+90° en lloc de -90°).
export const knifeAttackThreeCompare=Object.freeze([
  Object.freeze({
    name:'3A · Estocada lateral original',tag:'Canell cap a dins · −90°',
    description:'Animació 3 original. Preparació lateral i gir del canell cap a dins durant l’estocada.',
    variantIndex:2,reverseWrist:false
  }),
  Object.freeze({
    name:'3B · Estocada lateral invertida',tag:'Canell cap a fora · +90°',
    description:'Mateix braç, colze, temps i estocada de la 3A; únicament el canell gira 90° en el sentit contrari.',
    variantIndex:2,reverseWrist:true
  })
]);
export const knifeAttackDuration=1.25;
const smooth=t=>{const n=Math.max(0,Math.min(1,t));return n*n*(3-2*n)};
const pulse=(p,start,peak,end)=>p<=start||p>=end?0:
  p<peak?smooth((p-start)/(peak-start)):1-smooth((p-peak)/(end-peak));
const heldTurn=(p,start,full,release,end)=>p<=start||p>=end?0:
  p<full?smooth((p-start)/(full-start)):
  p<=release?1:1-smooth((p-release)/(end-release));

export function createKnifeAttackConcept(THREE,index=0,reverseWrist=false){
  if(!knifeAttackConcepts[index])throw new RangeError('Animació de ganivet desconeguda: '+index);
  // Exactament el jugador, el ganivet i el colze del joc (4B).
  const mats=new Map();
  const box=(parent,w,h,d,color,x=0,y=0,z=0)=>{
    let mat=mats.get(color);
    if(!mat){mat=new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.74});mats.set(color,mat)}
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  };
  const model=window.HUNTER_CHARACTERS.createPlayer(THREE,{box});
  const u=model.userData;
  u.gun.visible=false;u.bazooka.visible=false;u.sniper.visible=false;u.grenade.visible=false;
  u.knife.visible=true;
  applyKnifeAttackConcept(model,index,0,reverseWrist);
  return model;
}

export function applyKnifeAttackConcept(model,index,progress,reverseWrist=false){
  const config=knifeAttackConcepts[index];
  if(!config)throw new RangeError('Animació de ganivet desconeguda: '+index);
  const u=model.userData,b=window.HUNTER_CHARACTERS.knifePose4B,
        p=Math.max(0,Math.min(1,progress));
  if(index===2&&reverseWrist){
    // 3B utilitza exactament el calculador del joc, incloent el braç esquerre.
    const pose=window.HUNTER_CHARACTERS.knifeAttack3BTargets(p);
    u.ar.rotation.set(pose.shoulderX,b.shoulder.y,pose.shoulderZ);
    u.aer.rotation.set(pose.elbowX,b.elbow.y,pose.elbowZ);
    u.knife.rotation.set(pose.bladeX,pose.bladeY,pose.bladeZ);
    u.al.rotation.set(-.04+pose.leftShoulderX,0,-.12+pose.leftShoulderZ);
    u.ael.rotation.set(.17+pose.leftElbowX,0,-.04);
    u.knife.visible=true;u.gun.visible=false;
    model.rotation.set(0,0,0);model.position.set(0,0,0);
    return {wristDegrees:-90*pose.wrist,thrust:pose.thrust,preparation:pose.preparation};
  }
  const preparation=pulse(p,.025,.17,.37),
        thrust=pulse(p,...config.thrust),
        // L'eix Y LOCAL mou el canell: original −90°, iteració +90°.
        // X i Z, la mà i la trajectòria del braç queden idèntics.
        wrist=heldTurn(p,...config.turn),
        quarterTurn=Math.PI/2*wrist,
        signedTurn=reverseWrist?quarterTurn:-quarterTurn;
  u.ar.rotation.set(b.shoulder.x-config.windup*preparation+config.reach*thrust,
    b.shoulder.y,b.shoulder.z+config.windup*.65*preparation+config.open*thrust);
  u.aer.rotation.set(b.elbow.x+.18*preparation-config.extend*thrust,
    b.elbow.y,b.elbow.z);
  u.knife.rotation.set(b.blade.x+config.knifeX*thrust,signedTurn,
    b.blade.z+config.knifeZ*thrust);
  u.al.rotation.set(-.04,0,-.12);
  u.ael.rotation.set(.17,0,-.04);
  u.knife.visible=true;
  u.gun.visible=false;
  model.rotation.set(0,0,0);
  model.position.set(0,0,0);
  return {wristDegrees:(reverseWrist?-90:90)*wrist,thrust,preparation};
}
