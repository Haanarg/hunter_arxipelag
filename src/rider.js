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
    // A més de la postura completa, els riders remots tenen una figura
    // de dues malles compartides per evitar dibuixar totes les articulacions
    // a llargues distàncies. El rider local mai entra en aquest LOD.
    const riderDetailNodes=[...g.children],riderFar=new THREE.Group();
    const farBody=new THREE.Mesh(new THREE.BoxGeometry(.62,.88,.39),material(0x58634b,'paint'));
    farBody.position.y=.48;
    const farHead=new THREE.Mesh(new THREE.BoxGeometry(.43,.40,.43),material(0xc59a78,'skin'));
    farHead.position.y=1.10;
    riderFar.add(farBody,farHead);riderFar.visible=false;
    riderFar.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.userData.noCastShadow=true}});
    g.add(riderFar);
    g.userData.riderFarProxy=riderFar;
    g.userData.riderDetailNodes=riderDetailNodes;
    g.userData.riderFarActive=false;
    g.visible=false;g.traverse(o=>{if(o.isMesh&&!o.userData.noCastShadow)o.castShadow=shadows});scene.add(g);
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
      // Transicions suaus: el tret ja no força un gir instantani del tronc.
      u.shotBlend+=(Number(active)-u.shotBlend)*(1-Math.exp(-(active?8:9)*dt));
      if(!active&&u.shotBlend<.01){
        pistol.visible=false;pistolParts.flash.visible=false;return;
      }
      pistol.visible=true;
      const sc=v.t==='llanxa'?1.3:v.t==='llanxa_coets'?1.35:scales[v.t],
            rowing=v.t==='barca_rems',
            twist=v.t==='windsurf'?.055:.24;
      // A la barca l'arma s'ha de veure a escala amb el remador.
      pistol.scale.setScalar(rowing?.56:.92);
      if(rowing){
        // El remador només gira un poc les espatlles (uns 30°),
        // sense retorçar el tronc ni passar de cop al perfil.
        torso.rotation.y=Math.PI-.52*u.shotBlend;
      }else torso.rotation.y+=twist*u.shotBlend;
      const shoulder=shoulderAt(1),
            forearm=limbs[3],
            restingHand=new THREE.Vector3(0,-forearm.userData.restLength*forearm.scale.y,0)
              .applyQuaternion(forearm.quaternion).add(forearm.position),
            // El braç dret surt del rem amb una extensió curta cap a proa.
            // Evitam que travessi el pit o arribi a l'altre costat del buc.
            reach=rowing?vec(-.08*sc,-.26,-.48*sc):
              v.t==='windsurf'?vec(.17*sc,-.14,-1.02*sc):
              vec(.25*sc,-.29,-1.13*sc);
      const target=shoulder.clone().add(reach),
            hand=restingHand.lerp(target,u.shotBlend),
            elbow=shoulder.clone().lerp(hand,.57);
      elbow.y-=.12;elbow.x+=rowing?-.05*sc:.12*sc;
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
        // La mà esquerra continua pràcticament sobre el rem.
        oldHand.lerp(leftHand,u.shotBlend*.2);oldElbow.lerp(leftElbow,u.shotBlend*.2);
        limbBetween(limbs[0],leftShoulder,oldElbow);
        limbBetween(limbs[1],oldElbow,oldHand);
      }
      const recoil=Math.exp(-u.shotAge*18)*(rowing ? .045 : .095);
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
      const u=g.userData;u.shotTime=v.t==='barca_rems' ? .52 : .34;u.shotAge=0;
      // No forçam shotBlend: l'animació del remador s'interpola en update().
      if(v.t!=='barca_rems')u.shotBlend=Math.max(u.shotBlend,.82);
      u.pistolAim=null;
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
    const update=(v,dt,seatIndex=null,viewDistance=0)=>{
      // null = partida individual: conserva exactament la postura existent.
      // 0/1 = seient autoritatiu COOP (pilot esquerra, passatger dreta).
      const passenger=seatIndex===1,coopSeat=seatIndex===0||passenger;
      const car=!!v&&(v.t==='cotxe_civil'||v.t==='cotxe');
      const open=!!v&&(car||['bici','moto','moto_aquatica','llanxa','llanxa_coets','barca_rems','windsurf','hover'].includes(v.t));g.visible=open;
      if(!open){g.userData.shotTime=0;g.userData.shotBlend=0;g.userData.pistolAim=null;pistol.visible=false;g.scale.setScalar(1);return}
      const u=g.userData,sc=v.t==='llanxa'?1.3:v.t==='llanxa_coets'?1.35:scales[v.t],moving=Math.min(1,Math.abs(v.v)/1.8);u.motion+=(moving-u.motion)*(1-Math.exp(-12*dt));const motion=u.motion,phase=(v.t==='bici'||v.t==='barca_rems')?-(v.pedalPhase||0):(v.pedalPhase||0);
      // En cotxes l'habitacle és més baix que el protagonista dret.
      // Escalam el mateix model de jugador i preservam l'orientació
      // tridimensional del xassís en girs i pendents.
      const riderScale=car?.82:v.t==='hover'?.63:1;
      g.scale.setScalar(riderScale);
      g.position.copy(v.o.position);g.quaternion.copy(v.o.quaternion);
      const far=Number.isFinite(viewDistance)&&viewDistance>
        (u.riderFarActive?350:430);
      if(far!==u.riderFarActive){
        u.riderFarActive=far;
        for(const child of riderDetailNodes)child.visible=!far&&child!==pistol;
        riderFar.visible=far;
      }
      if(far){
        // El cos simplificat es posa sobre el seient sense animar cames,
        // mans o arma; la simulació i el seient autoritatiu són idèntics.
        const seatX=coopSeat?(passenger?1:-1)*(car?.65:.58)*sc:0,
          deckY=car?1.20*sc:v.t==='hover'?1.25*sc:
            v.t==='windsurf'?1.05*sc:1.35*sc;
        riderFar.position.set(seatX,v.t==='moto'?.98*sc*(v.o?.userData?.motorcycleVisualScale??1):deckY,(v.t==='bici'||v.t==='moto')?0.12*sc*(v.t==='moto'?(v.o?.userData?.motorcycleVisualScale??1):1):0);
        pistol.visible=false;
        return;
      }
      torso.rotation.set(0,0,0);boots.forEach(b=>b.rotation.set(0,0,0));

      if(car){
        // Seient esquerre, darrere del volant (C1A i cotxe utilitari).
        // Posicions físiques convertides al sistema del rider escalat.
        const civil=v.t==='cotxe_civil',
              humvee=!civil&&v.o?.userData?.humveeModel==='D3.1',
              // The Humvee cabin is forward-facing -Z and wider than the
              // previous military car. Rider and wheel now share this seat.
              seatX=(civil?.613:humvee?.84:.72)*sc*(passenger?1:-1),
              seatY=(civil?1.14:humvee?1.24:1.22)*sc,
              seatZ=(civil?-.60:humvee?-.26:.42)*sc,
              steeringX=seatX,
              steeringY=(civil?1.66:humvee?1.60:1.91)*sc,
              steeringZ=(civil?-.94:humvee?-.87:-.67)*sc,
              invScale=1/riderScale;
        torso.position.set(seatX*invScale,seatY*invScale,seatZ*invScale);
        torso.rotation.x=-.05;
        for(let i=0;i<2;i++){
          const side=i?1:-1,
                shoulder=shoulderAt(side),
                hip=vec((seatX+side*.20*sc)*invScale,
                  seatY*invScale,seatZ*invScale),
                hand=passenger?
                  vec((seatX+side*.23*sc)*invScale,
                    (seatY+.16*sc)*invScale,(seatZ-.32*sc)*invScale):
                  vec((steeringX+side*.22*sc)*invScale,
                    steeringY*invScale,steeringZ*invScale),
                elbow=shoulder.clone().lerp(hand,.50),
                foot=vec((seatX+side*.20*sc)*invScale,
                  .87*sc*invScale,(civil?-1.31:humvee?-1.10:-.95)*sc*invScale),
                knee=hip.clone().lerp(foot,.52);
          elbow.y-=.10*sc*invScale;
          knee.y+=.08*sc*invScale;knee.z+=.11*sc*invScale;
          limbBetween(limbs[i*2],shoulder,elbow);
          limbBetween(limbs[i*2+1],elbow,hand);
          limbBetween(limbs[4+i*2],hip,knee);
          limbBetween(limbs[5+i*2],knee,foot);
          boots[i].position.copy(foot);
          boots[i].rotation.x=-.2;
        }
        // També els conductors de cotxe han de mostrar el gest real
        // de treure la pistola en disparar (local i company COOP).
        aimOneHand(v,dt);
        return;
      }

      if(v.t==='hover'){
        // La variant D té una cabina amb dos seients de veritat, no una
        // figura damunt del sostre. Les posicions són les del model 3D.
        // El mode individual utilitza el seient del pilot (esquerre).
        // En COOP, el servidor assigna 0=pilot i 1=passatger.
        const positions=v.o.userData.hovercraftSeatPositions,
              station=positions?.[passenger?1:0],
              helm=v.o.userData.hovercraftSteeringPosition,
              seatX=(station?.x??(passenger?.30:-.30))*sc,
              seatY=(station?.y??1.58)*sc,
              seatZ=(station?.z??-1.08)*sc,
              invScale=1/riderScale;
        torso.position.set(seatX*invScale,seatY*invScale,seatZ*invScale);
        torso.rotation.x=-.07;
        for(let i=0;i<2;i++){
          const side=i?1:-1,
                hip=vec((seatX+side*.145*sc)*invScale,
                  seatY*invScale,seatZ*invScale),
                shoulder=shoulderAt(side),
                hand=passenger?
                  vec((seatX+side*.18*sc)*invScale,
                    (seatY+.13*sc)*invScale,(seatZ-.16*sc)*invScale):
                  vec(((helm?.x??-.30)+side*.105)*sc*invScale,
                    ((helm?.y??1.88)+.012)*sc*invScale,
                    (helm?.z??-1.98)*sc*invScale),
                elbow=shoulder.clone().lerp(hand,.55),
                foot=vec((seatX+side*.16*sc)*invScale,
                  1.42*sc*invScale,(seatZ-.36*sc)*invScale),
                knee=hip.clone().lerp(foot,.52);
          elbow.y-=.07*sc*invScale;
          knee.y+=.12*sc*invScale;
          limbBetween(limbs[i*2],shoulder,elbow);
          limbBetween(limbs[i*2+1],elbow,hand);
          limbBetween(limbs[4+i*2],hip,knee);
          limbBetween(limbs[5+i*2],knee,foot);
          boots[i].position.copy(foot);
          boots[i].rotation.x=-.13;
        }
        // Disparar des del seient conserva la mà esquerra al comandament
        // en les animacions del mode individual i del company remot.
        aimOneHand(v,dt);
        return;
      }

      if(v.t==='moto'){
        // Naked streetfighter 25%, ara ampliada +50% respecte la variant
        // anterior. Seient i mans mantenen la posició relativa al xassís.
        // El punt de presa segueix el
        // mateix pivot de direcció visual, inclòs el gir dels punys.
        const steering=v.o?.userData?.steeringPivots?.[0],
              size=v.o?.userData?.motorcycleVisualScale??1,
              fit=sc*size,
              turn=steering?.rotation?.y||0,
              pivotZ=(steering?.position?.z??-.28)*fit,
              pivotY=(steering?.position?.y??1.07)*fit,
              seat=.99*fit,seatZ=.26*fit;
        torso.position.set(0,seat,seatZ);
        torso.rotation.x=.12*motion;
        for(let i=0;i<2;i++){
          const side=i?1:-1,hip=vec(side*.25*size,seat,seatZ),
                shoulder=shoulderAt(side),
                x=side*.34*fit,
                hand=vec(x*Math.cos(turn),pivotY-.015*fit,
                  pivotZ-x*Math.sin(turn)),
                elbow=shoulder.clone().lerp(hand,.54);
          elbow.x+=side*.08;elbow.y-=.12;
          limbBetween(limbs[i*2],shoulder,elbow);
          limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(side*.34*fit,.42*fit,.16*fit),
                knee=hip.clone().lerp(foot,.54);
          knee.z-=.12*motion;knee.x+=side*.07;
          limbBetween(limbs[4+i*2],hip,knee);
          limbBetween(limbs[5+i*2],knee,foot);
          boots[i].position.copy(foot);boots[i].rotation.x=0;
        }
        aimOneHand(v,dt);return;
      }
      if(v.t==='bici'){
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
        // 7/8 mirrored relative to the old silhouette: surfer stands on
        // starboard (+X) and faces across the board toward the mirrored
        // sail on port (-X), with hips back and slightly bent knees.
        // The rig pitches toward the bow; both hands follow actual points
        // on the moving boom, not hand positions guessed in rider space.
        const bodyX=.42*sc,hipY=1.38*sc,footY=.35*sc,
              sail=v.o.userData.windsurfRig,
              grips=v.o.userData.windsurfGrips||[],
              lean=.17+Math.min(.07,Math.abs(v.v)/230);
        torso.position.set(bodyX,hipY,.29*sc);
        torso.rotation.set(lean,1.13,.08);
        const hips=[vec(bodyX-.05*sc,hipY,.04*sc),
                    vec(bodyX+.08*sc,hipY,.46*sc)];
        // Crucial: anatomically correct shoulder index.
        // i=0 -> left arm, i=1 -> right arm (firing arm).
        v.o.updateWorldMatrix(true,true);
        g.updateWorldMatrix(true,false);
        const hands=grips.map(p=>g.worldToLocal(
          (sail||v.o).localToWorld(p.clone())));
        const feet=[vec(.66*sc,footY,.99*sc),
                    vec(.72*sc,footY,-.63*sc)];
        for(let i=0;i<2;i++){
          const shoulder=shoulderAt(i?1:-1),hip=hips[i],
                hand=hands[i]||vec(-.5*sc,2.6*sc,.5*sc),
                foot=feet[i],
                elbow=shoulder.clone().lerp(hand,.47),
                knee=hip.clone().lerp(foot,.51);
          // Bend the elbows down slightly, without forcing an
          // impossible knee/elbow pose away from the true grip.
          elbow.y-=.17*sc;
          elbow.z+=i?.08*sc:-.055*sc;
          limbBetween(limbs[i*2],shoulder,elbow);
          limbBetween(limbs[i*2+1],elbow,hand);
          knee.y+=.13*sc;knee.x-=.10*sc;
          limbBetween(limbs[4+i*2],hip,knee);
          limbBetween(limbs[5+i*2],knee,foot);
          boots[i].position.copy(foot);
          boots[i].rotation.set(-.12,1.13,0);
        }
        // Right hand releases only during the pistol animation; the
        // left hand stays planted on the rig and the torso barely twists.
        aimOneHand(v,dt);return;
      }

      if(v.t==='llanxa'||v.t==='llanxa_coets'){
        // Les dues llanxes comparteixen ara la mateixa escala gran del casc,
        // però cada rider conserva la mida que tenia abans del redisseny.
        const riderSc=v.t==='llanxa'?1.3:1.35,
              boatSc=scales[v.t]||1.95,
              offY=1.45*(boatSc-riderSc),offZ=.55*(boatSc-riderSc),
              seat=1.45*riderSc+offY,seatZ=.55*riderSc+offZ,
              // L'habitacle té dos llocs paral·lels, amb el mateix
              // banc, escala i orientació del buc original. El pilot
              // del mode individual es manté al centre.
              seatX=coopSeat?(passenger?1:-1)*.58*boatSc:0;
        torso.position.set(seatX,seat,seatZ);torso.rotation.x=.04;
        for(let i=0;i<2;i++){
          const side=i?1:-1,
                hip=vec(seatX+side*.28,seat,seatZ),
                shoulder=shoulderAt(side),
                hand=passenger?
                  vec(seatX+side*.32*riderSc,seat+.16,seatZ-.42*riderSc):
                  vec(seatX+side*.48*riderSc,seat+.7,-.7*riderSc+offZ),
                elbow=shoulder.clone().lerp(hand,.52);
          limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(seatX+side*.42*riderSc,.92*riderSc+offY,-.35*riderSc+offZ),
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


