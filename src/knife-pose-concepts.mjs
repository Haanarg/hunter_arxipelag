// Comparador visual: usa el model real del jugador, sense modificar
// l'animació del joc fins que es triï una de les quatre postures.
export const knifePoseConcepts=Object.freeze([
  Object.freeze({
    name:'A · Lateral discret',
    description:'Braç dret lleugerament separat de la cuixa i ganivet inclinat cap enrere. Canvi mínim.',
    tag:'Discret',
    shoulder:{x:-.10,y:0,z:-.27},
    elbow:{x:.22,y:0,z:-.12},
    grip:{x:-1.27,y:0,z:.08}, offset:{x:.05,y:-.72,z:.06}
  }),
  Object.freeze({
    name:'B · Fulla cap avall',
    description:'Colze obert i empunyadura baixa; el perfil de la fulla queda visible al costat dret de la motxilla.',
    tag:'Baix · extern',
    shoulder:{x:-.22,y:-.08,z:-.36},
    elbow:{x:.53,y:-.12,z:-.13},
    grip:{x:-1.03,y:0,z:-.22},offset:{x:.09,y:-.70,z:.11}
  }),
  Object.freeze({
    name:'C · Ganivet a la cintura',
    description:'Braç recollit i fulla diagonal a prop del maluc, visible en una vista posterior de tres quarts.',
    tag:'Diagonal',
    shoulder:{x:-.39,y:-.10,z:-.48},
    elbow:{x:.95,y:-.12,z:-.08},
    grip:{x:-1.45,y:.24,z:.4},offset:{x:.06,y:-.70,z:.12}
  }),
  Object.freeze({
    name:'D · Guàrdia curta',
    description:'Avantbraç una mica més elevat i fulla cap a fora. Silueta clara sense tapar el cos.',
    tag:'Més visible',
    shoulder:{x:-.45,y:-.08,z:-.60},
    elbow:{x:1.12,y:.12,z:-.18},
    grip:{x:-1.19,y:0,z:-.36},offset:{x:.10,y:-.68,z:.16}
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
