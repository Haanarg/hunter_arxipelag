// Previsualitzacions exclusives: quatre iteracions de l'atac de la postura 4B.
// No afecten el moviment ni el dany real del joc fins que se'n triï una.
export const knifeAttackConcepts=Object.freeze([
  Object.freeze({
    name:'A · Gir abans de l’estocada',tag:'Precís',
    description:'Primer gira el puny 90° cap al cos; després fa una estocada recta i retorna a la guàrdia.',
    turn:[.04,.27,.86],windup:.14,reach:1.27,open:-.28,extend:.63,
    thrust:[.31,.57,.83],knifeX:-.18,knifeZ:-.16
  }),
  Object.freeze({
    name:'B · Gir i estocada simultanis',tag:'Ràpid',
    description:'La mà gira 90° mentre el braç surt cap endavant. Moviment curt i contundent.',
    turn:[.28,.55,.85],windup:.10,reach:1.40,open:-.30,extend:.66,
    thrust:[.26,.55,.82],knifeX:-.16,knifeZ:-.18
  }),
  Object.freeze({
    name:'C · Estocada lateral',tag:'Lateral',
    description:'Preparació amb el colze separat del cos; el puny gira cap a dins abans de clavar endavant.',
    turn:[.14,.45,.88],windup:.30,reach:1.12,open:-.45,extend:.58,
    thrust:[.32,.57,.83],knifeX:-.07,knifeZ:-.25
  }),
  Object.freeze({
    name:'D · Estocada alta',tag:'Alt',
    description:'Recull una mica la mà, la gira 90° i estira el braç més amunt cap al davant.',
    turn:[.06,.41,.92],windup:.21,reach:1.52,open:-.14,extend:.57,
    thrust:[.31,.57,.83],knifeX:.12,knifeZ:-.13
  })
]);
export const knifeAttackDuration=1.25;
const smooth=t=>{const n=Math.max(0,Math.min(1,t));return n*n*(3-2*n)};
const pulse=(p,start,peak,end)=>p<=start||p>=end?0:
  p<peak?smooth((p-start)/(peak-start)):1-smooth((p-peak)/(end-peak));

export function createKnifeAttackConcept(THREE,index=0){
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
  applyKnifeAttackConcept(model,index,0);
  return model;
}

export function applyKnifeAttackConcept(model,index,progress){
  const config=knifeAttackConcepts[index];
  if(!config)throw new RangeError('Animació de ganivet desconeguda: '+index);
  const u=model.userData,b=window.HUNTER_CHARACTERS.knifePose4B,
        p=Math.max(0,Math.min(1,progress)),
        preparation=pulse(p,.025,.17,.37),
        thrust=pulse(p,...config.thrust),
        // La rotació sobre l'eix Y LOCAL és cap a dins (−90°).
        // L'eix X faria girar la punta lluny de l'enemic.
        wrist=pulse(p,...config.turn),
        quarterTurn=Math.PI/2*wrist;
  u.ar.rotation.set(b.shoulder.x-config.windup*preparation+config.reach*thrust,
    b.shoulder.y,b.shoulder.z+config.windup*.65*preparation+config.open*thrust);
  u.aer.rotation.set(b.elbow.x+.18*preparation-config.extend*thrust,
    b.elbow.y,b.elbow.z);
  u.knife.rotation.set(b.blade.x+config.knifeX*thrust,-quarterTurn,
    b.blade.z+config.knifeZ*thrust);
  u.al.rotation.set(-.04,0,-.12);
  u.ael.rotation.set(.17,0,-.04);
  u.knife.visible=true;
  u.gun.visible=false;
  model.rotation.set(0,0,0);
  model.position.set(0,0,0);
  return {wristDegrees:90*wrist,thrust,preparation};
}
