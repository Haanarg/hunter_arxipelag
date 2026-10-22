// Ragdoll lleuger: ressorts angulars i articulacions del model existent.
// Cap biblioteca física, cap malla extra ni raycasts per extremitat.
// La trajectòria del cos i el terra continuen governats pel motor del joc.
window.HUNTER_RAGDOLL=Object.freeze((()=>{
  const LIMITS={arm:[-2.65,2.65],elbow:[-.25,1.85],
    leg:[-1.45,1.5],knee:[-1.9,.28],head:[-.72,.72]};
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const make=(model,{blast=false,seed=0,impulse=null}={})=>{
    const rig=model?.userData||{},joints=[];
    const config=[
      ['al','arm',-1],['ar','arm',1],['ael','elbow',-1],['aer','elbow',1],
      ['ll','leg',-1],['lr','leg',1],['lkl','knee',-1],['lkr','knee',1],
      ['head','head',1]
    ];
    for(let i=0;i<config.length;i++){
      const [key,type,side]=config[i],node=rig[key];
      if(!node?.rotation)continue;
      const s=Math.sin((seed+1)*.71+i*2.399),
            home={x:node.rotation.x,y:node.rotation.y,z:node.rotation.z},
            position={x:node.position.x,y:node.position.y,z:node.position.z};
      joints.push({node,type,side,home,position,
        angleX:home.x,angleZ:home.z,
        vx:(s*.7+(impulse?.vy||0)*.025)*(blast?1.5:.5),
        vz:(Math.cos(i*1.97+seed)*1.3+side*.5)*(blast?1.7:.4),
        offset:0,offsetV:0,variant:s});
    }
    return {model,joints,blast,age:0,groundAge:0,strength:blast?1:.5,
      active:true,seed};
  };
  function update(state,dt,{airborne=false,grounded=false,impact=false}={}){
    if(!state?.active)return;
    const h=clamp(Number.isFinite(dt)?dt:0,0,.05);
    if(!h)return;
    state.age+=h;
    state.groundAge=grounded?state.groundAge+h:0;
    // Durant el vol, "estrella" còmica: braços molt oberts,
    // cames separades i colzes/genolls flexionats. En aterrar es
    // relaxen progressivament en una postura asimètrica.
    const spread=state.blast?1:.48,
          airborneWeight=airborne?1:Math.exp(-state.groundAge*3.8),
          s=spread*airborneWeight,
          wind=state.blast?Math.exp(-state.age*.65):Math.exp(-state.age*1.2);
    for(const [i,j] of state.joints.entries()){
      let tx=j.home.x,tz=j.home.z;
      if(j.type==='arm'){
        tx=-.22*s+j.variant*.30*wind;
        tz=j.side*(1.68*s+.28*(1-s));
      }else if(j.type==='elbow'){
        tx=.75*s+.32*(1-s)+j.variant*.25*wind;
        tz=j.side*.17*s;
      }else if(j.type==='leg'){
        tx=(j.side===-1?.38:-.47)*s+j.variant*.34*wind;
        tz=j.side*(.70*s+.12*(1-s));
      }else if(j.type==='knee'){
        tx=-.9*s-.27*(1-s);
        tz=j.side*.09*s;
      }else if(j.type==='head'){
        tx=.12*wind+j.variant*.16;
        tz=j.variant*.26*s;
      }
      // Oscil·lació amortida + integració semimplícita de ressort.
      // Són únicament 9 articulacions i 2 canals angulars.
      const spring=airborne?31:19,damp=airborne?5.6:8.8,
            gust=airborne?Math.sin(state.age*7.3+i*1.71)*wind*(state.blast?4:1):0;
      // Els animadors normals poden escriure angles cada fotograma.
      // Integrem en un estat propi per evitar que el moviment còmic
      // quedi anul·lat per la postura de caminar o de disparar.
      j.vx+=(spring*(tx-j.angleX)-damp*j.vx+gust)*h;
      j.vz+=(spring*(tz-j.angleZ)-damp*j.vz+
        gust*j.side*.65)*h;
      j.angleX=clamp(j.angleX+j.vx*h,...LIMITS[j.type]);
      j.angleZ=clamp(j.angleZ+j.vz*h,-2.25,2.25);
      j.node.rotation.x=j.angleX;
      j.node.rotation.z=j.angleZ;
      // Obrim espatlles i malucs sense separar malles del cos:
      // el pivot continua connectat i la posició retorna en aterrar.
      if(j.type==='arm'||j.type==='leg'){
        const maxShift=j.type==='arm'?.32:.17;
        const target=j.side*maxShift*s;
        j.offsetV+=(33*(target-j.offset)-9*j.offsetV)*h;
        j.offset=clamp(j.offset+j.offsetV*h,-maxShift,maxShift);
        j.node.position.x=j.position.x+j.offset;
      }
    }
  }
  function reset(state){
    if(!state)return;
    for(const j of state.joints){
      j.node.position.set(j.position.x,j.position.y,j.position.z);
      j.node.rotation.set(j.home.x,j.home.y,j.home.z);
    }
    state.active=false;
  }
  return {make,update,reset};
})());
