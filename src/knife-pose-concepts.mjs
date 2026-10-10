// Comparador visual: usa el model real del jugador, sense modificar
// l'animació del joc fins que es triï una de les quatre postures.
export const knifePoseConcepts=Object.freeze([
  Object.freeze({
    name:'A · Lateral discret',
    description:'Ganivet baix i separat de la cuixa. Fulla cap avall, ben visible de darrere amb el canvi mínim.',
    tag:'Discret',
    shoulder:{x:-.20,y:0,z:.36},
    elbow:{x:-.25,y:0,z:.12},
    grip:{x:-1.57,y:0,z:.05}, offset:{x:.05,y:-.72,z:.17}
  }),
  Object.freeze({
    name:'B · Empunyadura oberta',
    description:'Colze una mica més obert i fulla lleugerament enrere, sense elevar gaire la mà.',
    tag:'Obert',
    shoulder:{x:-.30,y:0,z:.48},
    elbow:{x:-.40,y:0,z:.12},
    grip:{x:-1.57,y:0,z:-.05},offset:{x:.07,y:-.70,z:.22}
  }),
  Object.freeze({
    name:'C · Diagonal a la cintura',
    description:'Braç separat i ganivet en diagonal: mostra clarament la fulla des del costat posterior.',
    tag:'Diagonal',
    shoulder:{x:-.40,y:0,z:.62},
    elbow:{x:-.20,y:0,z:.16},
    grip:{x:-1.30,y:0,z:-.10},offset:{x:.07,y:-.70,z:.24}
  }),
  Object.freeze({
    name:'D · Guàrdia curta',
    description:'Mà a l’alçada del maluc i fulla més elevada, preparada per atacar i visible des del darrere.',
    tag:'Guàrdia',
    shoulder:{x:-.45,y:0,z:.78},
    elbow:{x:-.55,y:0,z:.16},
    grip:{x:-1.50,y:0,z:.35},offset:{x:.09,y:-.68,z:.30}
  })
]);
export function createKnifePoseConcept(THREE,index=0){
  const spec=knifePoseConcepts[index];
  if(!spec)throw new RangeError('Proposta de ganivet desconeguda: '+index);
  const mats=new Map();
  const box=(parent,w,h,d,color,x=0,y=0,z=0)=>{
    let mat=mats.get(color);
    if(!mat){mat=new THREE.MeshStandardMaterial({color,roughness:.7,metalness:color===0xc7ced0?.48:.12,flatShading:true});mats.set(color,mat)}
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  };
  const model=window.HUNTER_CHARACTERS.createPlayer(THREE,{box}),
        u=model.userData;
  // El visor del joc està basat en el mateix model aprovat D.
  u.gun.visible=false;u.bazooka.visible=false;u.sniper.visible=false;u.grenade.visible=false;
  u.knife.visible=true;
  u.ar.rotation.set(spec.shoulder.x,spec.shoulder.y,spec.shoulder.z);
  u.aer.rotation.set(spec.elbow.x,spec.elbow.y,spec.elbow.z);
  u.knife.rotation.set(spec.grip.x,spec.grip.y,spec.grip.z);
  u.knife.position.set(spec.offset.x,spec.offset.y,spec.offset.z);
  u.al.rotation.set(-.04,0,-.12);
  u.ael.rotation.set(.17,0,-.04);
  model.userData.knifePoseConcept=spec.name;
  return model;
}
