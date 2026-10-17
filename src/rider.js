// Pilot visual per vehicles oberts. La física del vehicle continua al nucli.
window.HUNTER_RIDER=Object.freeze({
  create(THREE,{scene,box,material,scales,heightAt,shadows}){
    const g=new THREE.Group(),torso=new THREE.Group();g.add(torso);
    // El rider és el mateix protagonista: fa servir el cap D i el coll curt,
    // sense canviar cap seient, escala del vehicle ni pivot de les extremitats.
    const model=window.HUNTER_PLAYER_MODEL.create(THREE,{headVariant:'compactD'}),rig=model.userData;
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
    // Pistola visual pròpia del rider; no reempram la del model ocult a peu.
    // Mateixa geometria i retrocés que l'arma de la resta del joc.
    const pistol=new THREE.Group();pistol.scale.setScalar(.92);g.add(pistol);
    const pistolParts=createPlayerPistol(THREE,pistol);
    pistol.visible=false;
    g.userData={torso,limbs,boots,head:rig.head,neck:rig.neck,headVariant:rig.headVariant,
      mats:rig.mats,profile:rig.profile,motion:0,shotTime:0,shotAge:10,shotBlend:0,
      pistol,pistolParts,pistolAim:null};
    g.visible=false;g.traverse(o=>{if(o.isMesh)o.castShadow=shadows});scene.add(g);
    const down=new THREE.Vector3(0,-1,0),delta=new THREE.Vector3();
    const limbBetween=(m,a,b)=>{
      delta.copy(b).sub(a);const length=delta.length();m.position.copy(a);
      m.scale.y=length/m.userData.restLength;
      if(length>1e-6)m.quaternion.setFromUnitVectors(down,delta.multiplyScalar(1/length));
    };
    const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
    const shoulderAt=side=>vec(side*.57,1.17,0).applyQuaternion(torso.quaternion).add(torso.position);
    const muzzleLocal=new THREE.Vector3(0,.183,-.84),
          forward=new THREE.Vector3(0,0,-1);
    // Animació superposada després de la postura de conducció: la mà
    // esquerra continua al manillar, rem o botavara; la dreta apunta.
    const aimOneHand=(v,dt)=>{
      const u=g.userData;
      u.shotTime=Math.max(0,u.shotTime-dt);
      u.shotAge=Math.min(10,u.shotAge+dt);
      const active=u.shotTime>0;
      u.shotBlend+=(Number(active)-u.shotBlend)*(1-Math.exp(-18*dt));
      if(!active&&u.shotBlend<.01){
        pistol.visible=false;pistolParts.flash.visible=false;return;
      }
      pistol.visible=true;
      const sc=v.t==='llanxa'?1.3:v.t==='llanxa_coets'?1.35:scales[v.t],
            rowing=v.t==='barca_rems',
            twist=v.t==='windsurf'?.33:.24;
      if(rowing){
        // Remant mira a popa (Y=PI). Per disparar es gira per la seva
        // DRETA (angle DECREIXENT: PI -> 0, passant per PI/2) fins
        // encarar la proa (-Z). No giriam el buc ni les cames.
        torso.rotation.y=Math.PI*(1-u.shotBlend);
      }else torso.rotation.y+=twist*u.shotBlend;
      const shoulder=shoulderAt(1),
            forearm=limbs[3],
            restingHand=new THREE.Vector3(0,-forearm.userData.restLength*forearm.scale.y,0)
              .applyQuaternion(forearm.quaternion).add(forearm.position),
            // La mà acompanya el gir del tors, davant de l'espatlla
            // anatòmica dreta. A la barca acabarem apuntant a proa.
            reach=rowing?vec(.52*sc,-.29,-.75*sc):
              vec(.25*sc,-.29,-1.13*sc);
      // En la transició popa->proa, el braç dret es manté al
      // costat dret i passa davant del pit sense travessar-lo.
      if(rowing)reach.applyQuaternion(torso.quaternion);
      const target=shoulder.clone().add(reach),
            hand=restingHand.lerp(target,u.shotBlend),
            elbow=shoulder.clone().lerp(hand,.57);
      elbow.y-=.12;elbow.x+=rowing?-.12*sc:.12*sc;
      limbBetween(limbs[2],shoulder,elbow);limbBetween(limbs[3],elbow,hand);
      // La mà esquerra solta el rem durant el gir de cintura i
      // acompanya el tronc, sense estirar el braç a l'altre costat.
      if(rowing&&u.shotBlend>.001){
        const leftShoulder=shoulderAt(-1),
              relax=vec(-.22*sc,-.70,-.24*sc).applyQuaternion(torso.quaternion),
              leftHand=leftShoulder.clone().add(relax),
              leftElbow=leftShoulder.clone().lerp(leftHand,.53);
        leftElbow.y-=.12;
        const oldHand=vec(0,-limbs[1].userData.restLength*limbs[1].scale.y,0)
          .applyQuaternion(limbs[1].quaternion).add(limbs[1].position);
        const oldElbow=limbs[1].position.clone();
        oldHand.lerp(leftHand,u.shotBlend);oldElbow.lerp(leftElbow,u.shotBlend);
        limbBetween(limbs[0],leftShoulder,oldElbow);
        limbBetween(limbs[1],oldElbow,oldHand);
      }
      const recoil=Math.exp(-u.shotAge*18)*.095;
      pistol.position.copy(hand).add(vec(0,0,recoil));
      // La pistola apunta a proa (-Z) quan el remador s'hi gira.
      pistol.quaternion.identity();
      if(u.pistolAim)pistol.quaternion.setFromUnitVectors(forward,u.pistolAim);
      pistolParts.slide.position.z=recoil*.65;
      pistolParts.flash.visible=u.shotAge<.055;
    };
    // Retorna el tret des de la boca REAL de la pistola, i orienta
    // l'arma segons l'autoapuntat del sistema existent.
    const firePistol=(v,autoAim)=>{
      if(!v||!g.visible)return null;
      const u=g.userData;u.shotTime=.34;u.shotAge=0;
      u.shotBlend=Math.max(u.shotBlend,.82);u.pistolAim=null;
      aimOneHand(v,0);
      g.updateWorldMatrix(true,true);
      let origin=pistol.localToWorld(muzzleLocal.clone());
      const initial=forward.clone().applyQuaternion(pistol.getWorldQuaternion(new THREE.Quaternion()));
      const desired=autoAim(origin,initial);
      if(desired){
        const direction=new THREE.Vector3(...desired).normalize(),
              localDirection=direction.clone()
                .applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()).invert());
        u.pistolAim=localDirection;
        pistol.quaternion.setFromUnitVectors(forward,localDirection);
        g.updateWorldMatrix(true,true);
        origin=pistol.localToWorld(muzzleLocal.clone());
      }
      return {origin,direction:forward.clone().applyQuaternion(
        pistol.getWorldQuaternion(new THREE.Quaternion())).normalize()};
    };
    const update=(v,dt)=>{
      const open=!!v&&['bici','moto','moto_aquatica','llanxa','llanxa_coets','barca_rems','windsurf'].includes(v.t);g.visible=open;
      if(!open){g.userData.shotTime=0;g.userData.shotBlend=0;g.userData.pistolAim=null;pistol.visible=false;return}
      const u=g.userData,sc=v.t==='llanxa'?1.3:v.t==='llanxa_coets'?1.35:scales[v.t],moving=Math.min(1,Math.abs(v.v)/1.8);u.motion+=(moving-u.motion)*(1-Math.exp(-12*dt));const motion=u.motion,phase=(v.t==='bici'||v.t==='barca_rems')?-(v.pedalPhase||0):(v.pedalPhase||0);
      g.position.copy(v.o.position);g.quaternion.copy(v.o.quaternion);torso.rotation.set(0,0,0);boots.forEach(b=>b.rotation.set(0,0,0));

      if(v.t==='bici'||v.t==='moto'){
        const seat=1.65*sc;torso.position.set(0,seat,.4*sc);torso.rotation.x=.15*motion;
        for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.28,seat,.4*sc),shoulder=shoulderAt(side),hand=vec(side*.5*sc,1.96*sc,-sc),elbow=shoulder.clone().lerp(hand,.52);elbow.x+=side*.1;elbow.y-=.2;limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(side*.55,0,.45*sc),worldFoot=foot.clone().applyQuaternion(g.quaternion).add(g.position);worldFoot.y=heightAt(worldFoot.x,worldFoot.z)+.14;const groundFoot=worldFoot.sub(g.position).applyQuaternion(g.quaternion.clone().invert());const pedal=v.t==='bici'?vec(side*.4*sc,(.75-side*Math.sin(phase)*.28)*sc,side*Math.cos(phase)*.28*sc):vec(side*.5*sc,.72*sc,.1*sc);foot.copy(groundFoot).lerp(pedal,motion);const knee=hip.clone().lerp(foot,.5);knee.z-=.5*motion;knee.x+=side*.12*(1-motion);limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot);boots[i].rotation.x=0}
        aimOneHand(v,dt);return;
      }

      if(v.t==='moto_aquatica'){
        const seat=.98*sc,lean=.18+.12*motion;torso.position.set(0,seat,.3*sc);torso.rotation.x=lean;
        for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.25,seat,.3*sc),shoulder=shoulderAt(side),hand=vec(side*.38*sc,1.32*sc,-.58*sc),elbow=shoulder.clone().lerp(hand,.55);elbow.y-=.12;limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(side*.38*sc,.48*sc,.58*sc),knee=hip.clone().lerp(foot,.5);knee.z-=.25;limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot);boots[i].rotation.x=.15}
        aimOneHand(v,dt);return;
      }

      if(v.t==='barca_rems'){
        const seat=v.o.userData.rowingSeat,seatY=seat.y*sc,seatZ=seat.z*sc;
        const pull=(1-Math.cos(phase))*.5;
        torso.position.set(0,seatY,seatZ);torso.rotation.set(-.06+.15*pull*motion,Math.PI,0);
        v.o.updateWorldMatrix(true,true);g.updateWorldMatrix(true,false);
        for(let i=0;i<2;i++){
          const side=i?1:-1,boatSide=-side,
                hip=vec(boatSide*.27,seatY,seatZ),
                // Quan el remador mira a popa la seva dreta anatòmica
                // és babord (-X). Cada mà agafa el rem del seu costat:
                // el braç dret = limbs[2,3] = rem de babord (índex 0).
                shoulder=shoulderAt(side);
          const oar=v.o.userData.oars[1-i],
                hand=g.worldToLocal(oar.localToWorld(oar.userData.grip.clone()));
          const elbow=shoulder.clone().lerp(hand,.5);
          elbow.x+=boatSide*.18;elbow.y-=.13;
          limbBetween(limbs[i*2],shoulder,elbow);
          limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(boatSide*.34,.2*sc,seatZ+.97*sc),
                knee=vec(boatSide*.32,seatY-.05,seatZ+.52*sc);
          limbBetween(limbs[4+i*2],hip,knee);
          limbBetween(limbs[5+i*2],knee,foot);
          boots[i].position.copy(foot);boots[i].rotation.set(0,Math.PI,0);
        }
        aimOneHand(v,dt);return;
      }

      if(v.t==='windsurf'){
        // Tors de costat i cames rectes. Les dues mans agafen el mateix
        // costat del travesser (+Z), davant de la vela i de cara a la càmera.
        const lean=Math.max(-.08,Math.min(.08,v.v/42)),
              bodyX=-.44*sc,hipY=1.36*sc,footY=.29*sc;
        torso.position.set(bodyX,hipY,.18*sc);
        torso.rotation.set(0,-Math.PI/2,-.035+lean);
        const hips=[vec(bodyX,hipY,-.25*sc),vec(bodyX,hipY,.25*sc)];
        const shoulders=[shoulderAt(1),shoulderAt(-1)];
        // Llegim els punts reals del travesser: si en canviam la mida,
        // les mans continuaran exactament al mateix costat visible.
        v.o.updateWorldMatrix(true,true);
        g.updateWorldMatrix(true,false);
        const grips=v.o.userData.windsurfGrips;
        const hands=grips.map(point=>g.worldToLocal(v.o.localToWorld(point.clone())));
        const feet=[vec(bodyX,footY,.72*sc),vec(bodyX,footY,-.72*sc)];
        for(let i=0;i<2;i++){
          const hip=hips[i],shoulder=shoulders[i],hand=hands[i],foot=feet[i];
          const elbow=shoulder.clone().lerp(hand,.58);
          elbow.y-=.1;elbow.z=Math.max(elbow.z,.52*sc);
          limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const knee=hip.clone().lerp(foot,.5);knee.x+=.015*sc;
          limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);
          boots[i].position.copy(foot);boots[i].rotation.set(0,-Math.PI/2,0);
        }
        aimOneHand(v,dt);return;
      }

      if(v.t==='llanxa'||v.t==='llanxa_coets'){
        // Les dues llanxes comparteixen ara la mateixa escala gran del casc,
        // però cada rider conserva la mida que tenia abans del redisseny.
        const riderSc=v.t==='llanxa'?1.3:1.35,
              boatSc=scales[v.t]||1.95,
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
        aimOneHand(v,dt);return;
      }

      const seat=1.45*sc;torso.position.set(0,seat,.55*sc);torso.rotation.x=.04;
      for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.28,seat,.55*sc),shoulder=shoulderAt(side),hand=vec(side*.48*sc,seat+.7,-.7*sc),elbow=shoulder.clone().lerp(hand,.52);limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
        const foot=vec(side*.42*sc,.92*sc,-.35*sc),knee=hip.clone().lerp(foot,.5);knee.y+=.18;limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot)}
      aimOneHand(v,dt);
    };
    const reset=()=>{g.visible=false;g.userData.motion=0;g.userData.shotTime=0;
      g.userData.shotBlend=0;g.userData.pistolAim=null;pistol.visible=false};
    return {object:g,update,reset,firePistol};
  }
});


