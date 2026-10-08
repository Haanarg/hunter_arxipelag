// Pilot visual per vehicles oberts. La física del vehicle continua al nucli.
window.HUNTER_RIDER=Object.freeze({
  create(THREE,{scene,box,material,scales,heightAt,shadows}){
    const g=new THREE.Group(),torso=new THREE.Group();g.add(torso);
    const model=window.HUNTER_PLAYER_MODEL.create(THREE),rig=model.userData;
    const limbs=[],boots=rig.boots;
    for(let i=0;i<2;i++){
      const shoulder=i?rig.ar:rig.al,elbow=i?rig.aer:rig.ael;
      const hip=i?rig.lr:rig.ll,knee=i?rig.lkr:rig.lkl;
      for(const [part,len,slot]of[[shoulder,.63,i*2],[elbow,.62,i*2+1],[hip,.75,4+i*2],[knee,.82,5+i*2]]){
        g.add(part);part.userData.restLength=len;part.rotation.set(0,0,0);limbs[slot]=part;
      }
      g.add(boots[i]);
    }
    // The torso origin is the seat/hip, as expected by the existing vehicle poses.
    for(const part of [...model.children]){part.position.y-=rig.hipHeight;torso.add(part)}
    g.userData={torso,limbs,boots,mats:rig.mats,profile:rig.profile,motion:0};
    g.visible=false;g.traverse(o=>{if(o.isMesh)o.castShadow=shadows});scene.add(g);
    const down=new THREE.Vector3(0,-1,0),delta=new THREE.Vector3();
    const limbBetween=(m,a,b)=>{
      delta.copy(b).sub(a);const length=delta.length();m.position.copy(a);
      m.scale.y=length/m.userData.restLength;
      if(length>1e-6)m.quaternion.setFromUnitVectors(down,delta.multiplyScalar(1/length));
    };
    const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
    const shoulderAt=side=>vec(side*.57,1.17,0).applyQuaternion(torso.quaternion).add(torso.position);
    const update=(v,dt)=>{
      const open=!!v&&['bici','moto','moto_aquatica','llanxa','llanxa_coets','barca_rems','windsurf'].includes(v.t);g.visible=open;if(!open)return;
      const u=g.userData,sc=v.t==='llanxa'?1.3:scales[v.t],moving=Math.min(1,Math.abs(v.v)/1.8);u.motion+=(moving-u.motion)*(1-Math.exp(-12*dt));const motion=u.motion,phase=(v.t==='bici'||v.t==='barca_rems')?-(v.pedalPhase||0):(v.pedalPhase||0);
      g.position.copy(v.o.position);g.quaternion.copy(v.o.quaternion);torso.rotation.set(0,0,0);boots.forEach(b=>b.rotation.set(0,0,0));

      if(v.t==='bici'||v.t==='moto'){
        const seat=1.65*sc;torso.position.set(0,seat,.4*sc);torso.rotation.x=.15*motion;
        for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.28,seat,.4*sc),shoulder=shoulderAt(side),hand=vec(side*.5*sc,1.96*sc,-sc),elbow=shoulder.clone().lerp(hand,.52);elbow.x+=side*.1;elbow.y-=.2;limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(side*.55,0,.45*sc),worldFoot=foot.clone().applyQuaternion(g.quaternion).add(g.position);worldFoot.y=heightAt(worldFoot.x,worldFoot.z)+.14;const groundFoot=worldFoot.sub(g.position).applyQuaternion(g.quaternion.clone().invert());const pedal=v.t==='bici'?vec(side*.4*sc,(.75-side*Math.sin(phase)*.28)*sc,side*Math.cos(phase)*.28*sc):vec(side*.5*sc,.72*sc,.1*sc);foot.copy(groundFoot).lerp(pedal,motion);const knee=hip.clone().lerp(foot,.5);knee.z-=.5*motion;knee.x+=side*.12*(1-motion);limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot);boots[i].rotation.x=0}
        return;
      }

      if(v.t==='moto_aquatica'){
        const seat=.98*sc,lean=.18+.12*motion;torso.position.set(0,seat,.3*sc);torso.rotation.x=lean;
        for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.25,seat,.3*sc),shoulder=shoulderAt(side),hand=vec(side*.38*sc,1.32*sc,-.58*sc),elbow=shoulder.clone().lerp(hand,.55);elbow.y-=.12;limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(side*.38*sc,.48*sc,.58*sc),knee=hip.clone().lerp(foot,.5);knee.z-=.25;limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot);boots[i].rotation.x=.15}
        return;
      }

      if(v.t==='barca_rems'){
        const seat=v.o.userData.rowingSeat,seatY=seat.y*sc,seatZ=seat.z*sc;
        const pull=(1-Math.cos(phase))*.5;
        torso.position.set(0,seatY,seatZ);torso.rotation.set(-.06+.15*pull*motion,Math.PI,0);
        v.o.updateWorldMatrix(true,true);g.updateWorldMatrix(true,false);
        for(let i=0;i<2;i++){
          const side=i?1:-1,hip=vec(side*.27,seatY,seatZ);
          const shoulder=shoulderAt(-side);
          // El punt d'agafada és el mateix que dibuixa el rem, incloent el balanceig del buc.
          const oar=v.o.userData.oars[i],hand=g.worldToLocal(oar.localToWorld(oar.userData.grip.clone()));
          const elbow=shoulder.clone().lerp(hand,.5);elbow.x+=side*.18;elbow.y-=.13;
          limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(side*.34,.2*sc,seatZ+.97*sc),knee=vec(side*.32,seatY-.05,seatZ+.52*sc);
          limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);
          boots[i].position.copy(foot);boots[i].rotation.set(0,Math.PI,0);
        }
        return;
      }

      if(v.t==='windsurf'){
        // Postura real de windsurf: dempeus, cames gairebé rectes, tors de costat i mans al travesser.
        const lean=Math.max(-.08,Math.min(.08,v.v/42)),bodyX=-.62*sc,hipY=1.36*sc,footY=.29*sc;
        torso.position.set(bodyX,hipY,.08*sc);
        // Tors i cap miren cap a la vela; braços i cames mantenen la seva postura actual.
        torso.rotation.set(0,-Math.PI/2,-.035+lean);
        // La part inferior del cos gira 180° respecte del tors: cintura, cames i peus miren al costat correcte de la taula.
        const hips=[vec(bodyX,hipY,-.25*sc),vec(bodyX,hipY,.25*sc)];
        const shoulders=[shoulderAt(1),shoulderAt(-1)];
        const hands=[vec(.52*sc,2.39*sc,.25*sc),vec(1.2*sc,2.08*sc,.25*sc)];
        const feet=[vec(bodyX,footY,.72*sc),vec(bodyX,footY,-.72*sc)];
        for(let i=0;i<2;i++){
          const hip=hips[i],shoulder=shoulders[i],hand=hands[i],foot=feet[i];
          const elbow=shoulder.clone().lerp(hand,.55);
          elbow.y-=.1;elbow.z+=(i?-.06:.06);
          limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          // Genoll sobre la línia cama-maluc-peu: només una flexió mínima visual.
          const knee=hip.clone().lerp(foot,.5);knee.x+=.015*sc;
          limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);
          boots[i].position.copy(foot);boots[i].rotation.set(0,-Math.PI/2,0);
        }
        return;
      }

      if(v.t==='llanxa'){
        // La llanxa és ara un 50% més gran, però el rider conserva exactament
        // l'escala corporal anterior (1.3). Només traslladem la postura perquè
        // continuï assegut al mateix lloc relatiu dins la cabina ampliada.
        const boatSc=scales.llanxa||1.95,riderSc=1.3,
              offY=1.45*(boatSc-riderSc),offZ=.55*(boatSc-riderSc),
              seat=1.45*riderSc+offY,seatZ=.55*riderSc+offZ;
        torso.position.set(0,seat,seatZ);torso.rotation.x=.04;
        for(let i=0;i<2;i++){
          const side=i?1:-1,
                hip=vec(side*.28,seat,seatZ),
                shoulder=shoulderAt(side),
                hand=vec(side*.48*riderSc,seat+.7,-.7*riderSc+offZ),
                elbow=shoulder.clone().lerp(hand,.52);
          limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(side*.42*riderSc,.92*riderSc+offY,-.35*riderSc+offZ),
                knee=hip.clone().lerp(foot,.5);knee.y+=.18;
          limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot)
        }
        return;
      }

      const seat=1.45*sc;torso.position.set(0,seat,.55*sc);torso.rotation.x=.04;
      for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.28,seat,.55*sc),shoulder=shoulderAt(side),hand=vec(side*.48*sc,seat+.7,-.7*sc),elbow=shoulder.clone().lerp(hand,.52);limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
        const foot=vec(side*.42*sc,.92*sc,-.35*sc),knee=hip.clone().lerp(foot,.5);knee.y+=.18;limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot)}
    };
    const reset=()=>{g.visible=false;g.userData.motion=0};
    return {object:g,update,reset};
  }
});


