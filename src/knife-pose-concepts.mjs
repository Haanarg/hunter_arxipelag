// Cinc proves del ganivet: quatre postures originals i variant 4B cap endavant.
// Són només propostes: no alteren la postura de combat del joc.
export const knifePoseConcepts=Object.freeze([
  Object.freeze({
    name:'A · Lateral natural',tag:'Discret',
    description:'Colze flexionat cap endavant. Mà baixa al maluc i fulla lleument orientada enrere.',
    shoulder:{x:-.08,y:0,z:.34},elbow:{x:.35,y:0,z:-.06},
    blade:{x:-.95,y:0,z:.30}
  }),
  Object.freeze({
    name:'B · Braç obert',tag:'Obert',
    description:'Colze cap endavant i espatlla una mica oberta. Ganivet cap avall i enfora, subjectat amb el puny.',
    shoulder:{x:-.13,y:0,z:.48},elbow:{x:.55,y:0,z:-.10},
    blade:{x:-1.30,y:0,z:.20}
  }),
  Object.freeze({
    name:'C · Cintura diagonal',tag:'Diagonal',
    description:'Avantbraç plegat de manera anatòmica, mà a la cintura i fulla en diagonal cap enrere.',
    shoulder:{x:-.25,y:0,z:.60},elbow:{x:.76,y:0,z:-.06},
    blade:{x:-1.55,y:0,z:.44}
  }),
  Object.freeze({
    name:'4A · Guàrdia curta · original',tag:'Fulla enrere',
    description:'Proposta 4 original: colze flexionat cap endavant, empunyadura dins el puny i fulla orientada cap enrere.',
    shoulder:{x:-.10,y:0,z:.55},elbow:{x:.92,y:0,z:-.08},
    blade:{x:-2.00,y:0,z:.50}
  }),
  Object.freeze({
    name:'4B · Guàrdia curta · fulla endavant',tag:'Fulla endavant',
    description:'Exactament el mateix braç i la mateixa empunyadura que la 4A. Només gira el ganivet perquè la punta miri clarament cap al davant.',
    shoulder:window.HUNTER_CHARACTERS.knifePose4B.shoulder,
    elbow:window.HUNTER_CHARACTERS.knifePose4B.elbow,
    blade:window.HUNTER_CHARACTERS.knifePose4B.blade
  })
]);

// El ganivet de les proves és el mateix objecte que crea src/characters.js.
// Model, empunyadura i fulla es comparteixen amb el joc sense duplicar peces.

export function createKnifePoseConcept(THREE,index=0){
  const spec=knifePoseConcepts[index];
  if(!spec)throw new RangeError('Proposta de ganivet desconeguda: '+index);
  const mats=new Map();
  const box=(parent,w,h,d,color,x=0,y=0,z=0)=>{
    let mat=mats.get(color);
    if(!mat){
      mat=new THREE.MeshStandardMaterial({
        color,roughness:.7,metalness:color===0xc7ced0?.48:.12,flatShading:true
      });
      mats.set(color,mat);
    }
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  };
  const model=window.HUNTER_CHARACTERS.createPlayer(THREE,{box}),u=model.userData;
  u.gun.visible=false;u.bazooka.visible=false;u.sniper.visible=false;u.grenade.visible=false;
  // La flexió correcta del colze d'aquest rig és X POSITIVA,
  // en direcció al pit (front -Z), mai cap a l'esquena.
  u.ar.rotation.set(spec.shoulder.x,spec.shoulder.y,spec.shoulder.z);
  u.aer.rotation.set(spec.elbow.x,spec.elbow.y,spec.elbow.z);
  // createPlayer ja proporciona el mànec centrat al puny i la fulla
  // compartida amb el model de joc; només adaptem la postura del comparador.
  u.knife.rotation.set(spec.blade.x,spec.blade.y,spec.blade.z);
  u.knife.visible=true;
  u.al.rotation.set(-.04,0,-.12);
  u.ael.rotation.set(.17,0,-.04);
  model.userData.knifePoseConcept=spec.name;
  return model;
}
