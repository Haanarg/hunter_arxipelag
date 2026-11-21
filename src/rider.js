// Pilot visual per vehicles oberts. La física del vehicle continua al nucli.
window.HUNTER_RIDER=Object.freeze({
  create(THREE,{scene,box,material,scales,heightAt,shadows,createPistol=null}){
    const g=new THREE.Group(),torso=new THREE.Group();g.add(torso);
    // El rider és el mateix protagonista: fa servir el cap D i el coll curt,
    // sense canviar cap seient, escala del vehicle ni pivot de les extremitats.
    const model=window.HUNTER_PLAYER_MODEL.create(THREE,{
      headVariant:'compactD',controllerOnly:true
    }),rig=model.userData;
    if(!rig.humanControllerOnly)
      throw Error('Rider V18: controlador sense pell redundant requerit');
    // El model vell només alimenta les postures dels altres vehicles.
    // Per a moto i bicicleta empram directament el rig de l'editor:
    // exactament la mateixa geometria, 2 m anatòmics i escala a peu.
    const twoWheel=window.HUNTER_HUMAN_V17.createTwoWheelRider(THREE),
          cycleBody=twoWheel.root,cycleJoints=twoWheel.joints;
    // Els seients de cotxe i hovercraft empren una figura V18 separada
    // de la moto/bici i de les peces extensibles del controlador antic.
    // La fàbrica cuina la talla a geometria i pivots una sola vegada.
    const nativeSeatVariants=new Map();
    const getNativeSeat=size=>{
      if(!nativeSeatVariants.has(size)){
        const seat=window.HUNTER_HUMAN_V17.createSeatRider(THREE,size);
        seat.root.name='Tripulant canònic V18 · cabina '+size;
        seat.root.visible=false;
        g.add(seat.root);
        nativeSeatVariants.set(size,seat);
      }
      return nativeSeatVariants.get(size);
    };
    const standingHipY=cycleJoints.pelvis.getWorldPosition(new THREE.Vector3()).y;
    // Mesuram la part més baixa dels pantalons del model a peu, no
    // aproximam els malucs a l'altura del selló: abans el cul hi entrava.
    const pelvisBounds=new THREE.Box3();
    for(const part of cycleJoints.pelvis.children)
      if(part.isMesh)pelvisBounds.expandByObject(part);
    const buttBelowHip=pelvisBounds.isEmpty() ? .13*cycleBody.scale.y :
      standingHipY-pelvisBounds.min.y;
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
    // El laboratori injecta una pistola neutra, sense carregar els
    // scripts de combat; el joc conserva la fàbrica d'arma real.
    const pistolParts=(createPistol||createPlayerPistol)(THREE,pistol);
    const nativePistolGrip=pistol.getObjectByName('hunter-pistol-grip-center'),
          nativePistolMuzzle=pistol.getObjectByName('hunter-pistol-muzzle');
    // L'origen real del tret i l'encaix a la mà venen de la fàbrica de
    // la pistola; mai del vector fix 0,.183,-1.47 o d'un factor del V17.
    if(!nativePistolGrip||!nativePistolMuzzle)
      throw Error('Pistola V18 de rider sense grip o boca geomètrica');
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
    // No es descompon aquest model en cilindres/segments estirables.
    cycleBody.visible=false;g.add(cycleBody);
    g.updateWorldMatrix(true,true);
    // Els joints «motion» tenen posició local ZERO: la longitud real
    // queda al grup de repòs (parent). No llegir mai knee.position!
    const upperLegLength=cycleJoints.hipL.getWorldPosition(new THREE.Vector3())
      .distanceTo(cycleJoints.kneeL.getWorldPosition(new THREE.Vector3())),
          lowerLegLength=cycleJoints.kneeL.getWorldPosition(new THREE.Vector3())
      .distanceTo(cycleJoints.ankleL.getWorldPosition(new THREE.Vector3()));
    if(upperLegLength<.1||lowerLegLength<.1)
      throw Error('Longitud zero a les cames canòniques del pilot');
    g.userData.twoWheelCanonicalLegLengths={thigh:upperLegLength,shin:lowerLegLength};
    g.userData.twoWheelCanonicalHeight=twoWheel.standingHeight;
    g.userData.twoWheelButtBelowHip=buttBelowHip;
    g.userData.riderFarProxy=riderFar;
    g.userData.riderDetailNodes=riderDetailNodes;
    g.userData.riderV18ControlsOnly=true;
    // Els pivots antics alimenten la cinemàtica lògica; la pell
    // visible del rider és sempre V18 o el proxy distant.
    g.userData.riderSeatCanonicalActive=false;
    g.userData.riderSeatCanonicalBody=null;
    g.userData.riderSeatCanonicalJoints=null;
    g.userData.riderFarActive=false;
    // Mides de cabina consolidades en geometria i pivots: cap escala
    // sobre l'arrel en temps de joc. El V18 de moto/bici queda exclòs.
    // Les geometries del rider són pròpies: no compartim bufers amb
    // els altres personatges ni reconstruïm malles per fotograma.
    const nativeParts=[...riderDetailNodes,riderFar];
    const restPositions=new Map(),baseMeshes=new Map(),nativeVariants=new Map();
    for(const root of nativeParts)root.traverse(node=>{
      if(node!==root)restPositions.set(node,node.position.clone());
      if(node.isMesh&&node.geometry)baseMeshes.set(node,node.geometry);
    });
    // Una única cocció per talla: en canviar de vehicle només assignam
    // geometries immutables ja preparades i pivots absoluts de repòs.
    // Cap multiplicació acumulativa, cap resize() de buffer a cada tick.
    nativeVariants.set(1,baseMeshes);
    let nativeSize=1;
    const setNativeRiderSize=size=>{
      if(!(Number.isFinite(size)&&size>0))throw Error('Talla nativa de rider invàlida');
      if(size===nativeSize)return;
      if(!nativeVariants.has(size)){
        const generated=new Map();
        for(const [node,original]of baseMeshes){
          const geo=original.clone();
          geo.scale(size,size,size);
          generated.set(node,geo);
        }
        nativeVariants.set(size,generated);
      }
      for(const [node,geometry]of nativeVariants.get(size))node.geometry=geometry;
      for(const [node,position]of restPositions)
        node.position.copy(position).multiplyScalar(size);
      nativeSize=size;
      g.userData.riderNativeSize=size;
      g.userData.riderNativeGeometry=true;
    };
    g.userData.riderNativeSize=1;
    g.visible=false;g.traverse(o=>{if(o.isMesh&&!o.userData.noCastShadow)o.castShadow=shadows});scene.add(g);
    const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
    const ikDown=new THREE.Vector3(0,-1,0),ikQuaternion=new THREE.Quaternion();
    const pointJoint=(joint,target)=>{
      const direction=target.clone().sub(joint.getWorldPosition(new THREE.Vector3()));
      if(direction.lengthSq()<1e-8)return;
      joint.parent.getWorldQuaternion(ikQuaternion);
      direction.applyQuaternion(ikQuaternion.invert()).normalize();
      joint.quaternion.setFromUnitVectors(ikDown,direction);
      g.updateWorldMatrix(true,true);
    };
    // IK de dos ossos amb longituds mesurades a la malla a peu.
    // El genoll/colze es doblega; MAI no es canvia scale.y ni la malla.
    const placeCanonicalLimb=(upper,lower,end,targetLocal,side,leg)=>{
      g.updateWorldMatrix(true,true);
      const start=upper.getWorldPosition(new THREE.Vector3()),
            mid=lower.getWorldPosition(new THREE.Vector3()),
            finish=end.getWorldPosition(new THREE.Vector3()),
            upperLength=start.distanceTo(mid),lowerLength=mid.distanceTo(finish),
            desired=g.localToWorld(targetLocal.clone()),
            axis=desired.sub(start);
      if(axis.lengthSq()<1e-8)return;
      const reach=axis.length(),length=Math.max(
        Math.abs(upperLength-lowerLength)+.0005,
        Math.min(upperLength+lowerLength-.0005,reach));
      axis.normalize();
      const goal=start.clone().addScaledVector(axis,length),
            preferred=new THREE.Vector3(side*(leg?.24:.8),leg?0:-.4,-1)
              .applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
      preferred.addScaledVector(axis,-preferred.dot(axis)).normalize();
      if(preferred.lengthSq()<1e-8)preferred.set(side,0,0);
      const along=(upperLength*upperLength+length*length-
        lowerLength*lowerLength)/(2*length),
            bend=Math.sqrt(Math.max(0,upperLength*upperLength-along*along)),
            hinge=start.clone().addScaledVector(axis,along)
              .addScaledVector(preferred,bend);
      pointJoint(upper,hinge);
      pointJoint(lower,goal);
      if(leg){
        // Botes en posició de pedalar, sense torsions acumulades als turmells.
        end.parent.getWorldQuaternion(ikQuaternion);
        end.quaternion.copy(ikQuaternion.invert().multiply(
          g.getWorldQuaternion(new THREE.Quaternion())));
      }
    };
    const mountPistolToNativeWrist=wrist=>{
      if(!wrist||!pistol.visible)return;
      const wristTarget=g.worldToLocal(
        wrist.getWorldPosition(new THREE.Vector3()));
      // Reancoram DESPRÉS de cada canvi d'autoapuntat: girar el canó
      // no pot desenganxar la culata del puny del conductor V18.
      pistol.position.set(0,0,0);
      pistol.updateWorldMatrix(true,true);
      const reference=g.worldToLocal(
        nativePistolGrip.getWorldPosition(new THREE.Vector3()));
      pistol.position.copy(wristTarget).sub(reference);
      g.userData.riderNativePistolWrist=wristTarget.clone();
      g.userData.riderNativePistolMounted=true;
    };
    // Pilot i passatger de cabina: la pelvis V18 se situa exactament
    // sobre el punt autoritatiu del seient, i els ossos de longitud fixa
    // arriben al volant, reposabraços i pedals amb la IK anatòmica nativa.
    // El control extensible antic continua fora de vista per a la pistola
    // i per compatibilitat de física, però no dibuixa el tripulant.
    const poseCanonicalSeat=(seat,hipSeat,lean,hands,feet,shotBlend=0,wholeBody=false)=>{
      const body=seat.root,j=seat.joints;
      // Els remadors miren a popa i els surfistes giren envers la vela:
      // l'eix anatòmic V18 segueix el tors real, no un yaw V17 forçat
      // a zero. Restam el pivot de pelvis girat, en unitats natives.
      body.rotation.set(0,0,0);
      if(wholeBody)body.quaternion.copy(torso.quaternion);
      const pelvicOffset=new THREE.Vector3(0,seat.pelvisRestY,0)
        .applyQuaternion(body.quaternion);
      body.position.copy(hipSeat).sub(pelvicOffset);
      for(const id of ['pelvis','spine','neck','head','hipL','hipR',
        'kneeL','kneeR','ankleL','ankleR','shoulderL','shoulderR',
        'elbowL','elbowR','wristL','wristR'])j[id].quaternion.identity();
      j.spine.rotation.x=wholeBody?0:lean;
      j.head.rotation.x=-lean*.25;
      g.updateWorldMatrix(true,true);
      for(let i=0;i<2;i++){
        const side=i?1:-1,letter=i?'R':'L';
        const hip=j['hip'+letter],knee=j['knee'+letter],ankle=j['ankle'+letter];
        const shoulder=j['shoulder'+letter],elbow=j['elbow'+letter],
              wrist=j['wrist'+letter];
        placeCanonicalLimb(hip,knee,ankle,feet[i],side,true);
        let hand=hands[i];
        // El tret del rider continua usant les regles de combat actuals,
        // però la mà V18 segueix la posició real de la pistola visible.
        if(i===1&&pistol.visible&&shotBlend>.001){
          // El destí de tir surt de l'espatlla V18 REAL i de la llargada
          // de l'húmer/avantbraç, mai de limbs[3] ni del puny invisible.
          const shoulderLocal=g.worldToLocal(
            shoulder.getWorldPosition(new THREE.Vector3()));
          const type=g.userData.riderSeatVehicleType;
          const reach=type==='barca_rems'?vec(-.08,-.26,-.48):
            type==='windsurf'?vec(.17,-.14,-1.02):vec(.25,-.29,-1.13);
          const upperLength=elbow.parent.position.length(),
                lowerLength=wrist.parent.position.length();
          reach.normalize().multiplyScalar((upperLength+lowerLength)*.83);
          hand=hand.clone().lerp(shoulderLocal.add(reach),
            Math.max(0,Math.min(1,shotBlend)));
        }
        placeCanonicalLimb(shoulder,elbow,wrist,hand,side,false);
      }
      // L'arma visible es munta a l'empunyadura sobre el canell V18.
      // El seu espai és g, per la qual cosa la física de la boca també
      // continua correcta si COOP canvia el pare de la figura.
      if(pistol.visible){
        mountPistolToNativeWrist(j.wristR);
      }else{
        g.userData.riderNativePistolWrist=null;
        g.userData.riderNativePistolMounted=false;
      }
      g.userData.riderSeatCanonicalHip=hipSeat.clone();
      g.userData.riderSeatCanonicalHeight=seat.height;
      g.userData.riderSeatCanonicalSize=seat.root.userData.humanSeatNativeSize;
      g.userData.riderSeatCanonicalPose={
        hands:hands.map(x=>x.clone()),feet:feet.map(x=>x.clone()),
        lean,wholeBody,rotation:body.quaternion.clone()
      };
    };
    // Els ancoratges són objectes del model real. El punt dels punys
    // segueix la direcció i els pedals giren amb el pedalier; tots els
    // punts es converteixen al marc mundial del rider (escala = 1).
    const riderAnchor=(v,node,fallback)=>{
      if(!node)return fallback.clone();
      v.o.updateWorldMatrix(true,true);
      g.updateWorldMatrix(true,true);
      return g.worldToLocal(node.getWorldPosition(new THREE.Vector3()));
    };
    const poseCanonicalTwoWheel=(v,sc,motion,phase)=>{
      const bike=v.t==='bici',user=v.o.userData||{},
            visual=bike?(user.bicycleVisualScale??.74):
              (user.motorcycleVisualScale??1.24),
            fit=sc*visual,anchors=user.twoWheelAnchors||{},
            seat=riderAnchor(v,anchors.seat,
              vec(0,(bike?1.905:.88)*fit,(bike?.33:.54)*fit)),
            // La mateixa cama de l'avatar a peu: no s'escalen ni se
            // substitueixen el fèmur, la tíbia o les malles.
            upperLeg=upperLegLength,
            lowerLeg=lowerLegLength,
            seatHipY=seat.y+buttBelowHip+.018,
            footReference=g.localToWorld(vec(0,0,seat.z)),
            floorWorld=vec(footReference.x,
              heightAt(footReference.x,footReference.z)+.14,footReference.z),
            floorY=g.worldToLocal(floorWorld).y,
            // Quan el vehicle s'atura, l'abast és el 82% de la cama:
            // genoll FLEXIONAT, sense enfonsar el tors ni mantenir
            // els malucs al selló a qualsevol preu.
            stopHipY=floorY+(upperLeg+lowerLeg)*.82,
            stopped=Math.max(0,1-motion),
            drop=Math.max(0,seatHipY-stopHipY)*stopped,
            forward=(bike?.23:.07)*fit*stopped;
      // Posar el maluc a la cota REAL mesurada DESPRÉS de muntar
      // el rig sota el rider. El càlcul antic restava una alçada
      // mostrejada abans del reparenting i podia enviar la pelvis
      // gairebé al nivell del terra, amb tors i cames desencaixats.
      cycleBody.position.set(0,0,seat.z-forward);
      g.updateWorldMatrix(true,true);
      const realHipY=g.worldToLocal(
        cycleJoints.pelvis.getWorldPosition(new THREE.Vector3())).y;
      cycleBody.position.y+=seatHipY-drop-realHipY;
      cycleJoints.pelvis.rotation.set(0,0,0);
      cycleJoints.spine.rotation.set(
        bike?-.48+.32*stopped:-.48+.32*stopped,0,0);
      cycleJoints.head.rotation.set(bike?.13:.07,0,0);
      g.updateWorldMatrix(true,true);
      for(let i=0;i<2;i++){
        const side=i?1:-1,letter=i?'R':'L',
              hip=cycleJoints['hip'+letter],knee=cycleJoints['knee'+letter],
              ankle=cycleJoints['ankle'+letter],
              shoulder=cycleJoints['shoulder'+letter],
              elbow=cycleJoints['elbow'+letter],
              wrist=cycleJoints['wrist'+letter];
        const hand=riderAnchor(v,anchors['grip'+letter],
          bike?vec(side*.42*fit,1.97*fit,-.78*fit):
            vec(side*.36*fit,1.10*fit,-.34*fit));
        const footAtRest=vec(side*(bike?.28:.23)*fit,0,
          seat.z-(bike?.18:.035)*fit);
        const ground=g.localToWorld(footAtRest);
        ground.y=heightAt(ground.x,ground.z)+.14;
        const footOnGround=g.worldToLocal(ground),
              footOnPedal=riderAnchor(v,anchors['pedal'+letter],
                bike?vec(side*.24*fit,
                  (.62-side*Math.sin(phase)*.30)*fit,
                  side*Math.cos(phase)*.30*fit):
                  vec(side*.24*fit,.42*fit,.16*fit)),
              // El turmell va per DAMUNT del pedal/reposepeus;
              // el peu i la sola queden al punt físic de contacte.
              foot=footOnGround.lerp(footOnPedal.add(
                vec(0,bike?.09:.07,0)),motion);
        placeCanonicalLimb(hip,knee,ankle,foot,side,true);
        placeCanonicalLimb(shoulder,elbow,wrist,hand,side,false);
      }
      g.userData.twoWheelSeatHip=seatHipY;
      g.userData.twoWheelFloorY=floorY;
      g.userData.twoWheelStopped=stopped;
    };
    const aimCanonicalPistol=(v,dt)=>{
      const u=g.userData;
      u.shotTime=Math.max(0,u.shotTime-dt);
      u.shotAge=Math.min(10,u.shotAge+dt);
      const active=u.shotTime>0;
      u.shotBlend+=(Number(active)-u.shotBlend)*(1-Math.exp(-(active?8:9)*dt));
      if(!active&&u.shotBlend<.01){
        pistol.visible=false;pistolParts.flash.visible=false;return;
      }
      const shoulder=cycleJoints.shoulderR.getWorldPosition(new THREE.Vector3());
      const shoulderLocal=g.worldToLocal(shoulder),
            resting=g.worldToLocal(cycleJoints.wristR.getWorldPosition(new THREE.Vector3())),
            raised=shoulderLocal.clone().add(vec(.22,-.22,-.75));
      resting.lerp(raised,u.shotBlend);
      placeCanonicalLimb(cycleJoints.shoulderR,cycleJoints.elbowR,
        cycleJoints.wristR,resting,1,false);
      pistol.visible=true;pistol.scale.setScalar(.70);
      pistol.quaternion.identity();
      if(u.pistolAim)pistol.quaternion.setFromUnitVectors(forward,u.pistolAim);
      mountPistolToNativeWrist(cycleJoints.wristR);
      pistolParts.slide.position.z=Math.exp(-u.shotAge*18)*.055;
      pistolParts.flash.visible=false;
    };
    const forward=new THREE.Vector3(0,0,-1);
    const pistolMuzzleWorld=()=>{
      // La boca real pertany a la corredora del silenciador i acompanya
      // les animacions de retrocés. També funciona en COOP i en moto.
      g.updateWorldMatrix(true,true);
      return nativePistolMuzzle.getWorldPosition(new THREE.Vector3());
    };
    const aimNativeSeatPistol=(v,dt)=>{
      const u=g.userData,rowing=v.t==='barca_rems';
      u.shotTime=Math.max(0,u.shotTime-dt);
      u.shotAge=Math.min(10,u.shotAge+dt);
      const active=u.shotTime>0;
      u.shotBlend+=(Number(active)-u.shotBlend)*
        (1-Math.exp(-(active?8:9)*dt));
      if(!active&&u.shotBlend<.01){
        pistol.visible=false;pistolParts.flash.visible=false;
        u.riderNativeShotActive=false;
        return;
      }
      pistol.visible=true;
      // Compatibilitat de les dimensions aprovades, però orientació
      // i posició del puny exclusivament V18 (poseCanonicalSeat).
      pistol.scale.setScalar(rowing?.56:.92);
      if(rowing)torso.rotation.y=Math.PI-.52*u.shotBlend;
      else torso.rotation.y+=(v.t==='windsurf'?.055:.24)*u.shotBlend;
      pistol.quaternion.identity();
      if(u.pistolAim)pistol.quaternion.setFromUnitVectors(forward,u.pistolAim);
      const recoil=Math.exp(-u.shotAge*18)*(rowing?.045:.095)*nativeSize;
      pistolParts.slide.position.z=recoil*.65;
      pistolParts.flash.visible=false;
      u.riderNativeShotActive=true;
    };
    // Retorna el tret des de la boca REAL de la pistola, i orienta
    // l'arma segons l'autoapuntat del sistema existent.
    const firePistol=(v,autoAim)=>{
      if(!v||!g.visible)return null;
      const u=g.userData;u.shotTime=v.t==='barca_rems' ? .52 : .34;u.shotAge=0;
      // No forçam shotBlend: l'animació del remador s'interpola en update().
      if(v.t!=='barca_rems')u.shotBlend=Math.max(u.shotBlend,.82);
      u.pistolAim=null;
      // El LOD llunyà conserva dues malles econòmiques, però un
      // tret eventual s'origina igualment al grip i al canell V18.
      if(u.riderFarActive){
        const seat=getNativeSeat(u.riderNativeSize),size=u.riderNativeSize;
        const hip=u.riderFarProxy.position.clone().add(vec(0,.40*size,0));
        const hands=[vec(-.24,.14,-.46),vec(.24,.14,-.46)]
          .map(offset=>hip.clone().add(offset.multiplyScalar(size)));
        const feet=[vec(-.21,-.45,-.18),vec(.21,-.45,-.18)]
          .map(offset=>hip.clone().add(offset.multiplyScalar(size)));
        u.riderSeatVehicleType=v.t;
        aimNativeSeatPistol(v,0);
        poseCanonicalSeat(seat,hip,0,hands,feet,u.shotBlend);
        u.riderFarShotWrist=seat.joints.wristR;
      }else if(v.t==='bici'||v.t==='moto')aimCanonicalPistol(v,0);
      else if(u.riderSeatCanonicalActive&&u.riderSeatCanonicalBody){
        aimNativeSeatPistol(v,0);
        const pose=u.riderSeatCanonicalPose;
        if(pose)poseCanonicalSeat(
          getNativeSeat(u.riderSeatCanonicalSize),
          u.riderSeatCanonicalHip,pose.lean,pose.hands,pose.feet,
          u.shotBlend,pose.wholeBody);
      }else throw Error('Rider V18: falta el suport balístic natiu de '+v.t);
      let origin=pistolMuzzleWorld();
      const initial=forward.clone().applyQuaternion(pistol.getWorldQuaternion(new THREE.Quaternion()));
      const desired=autoAim(origin,initial);
      if(desired){
        const direction=new THREE.Vector3(...desired).normalize(),
              localDirection=direction.clone()
                .applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()).invert());
        u.pistolAim=localDirection;
        pistol.quaternion.setFromUnitVectors(forward,localDirection);
        if(u.riderFarActive&&u.riderFarShotWrist)
          mountPistolToNativeWrist(u.riderFarShotWrist);
        else if(u.riderSeatCanonicalActive&&u.riderSeatCanonicalJoints?.wristR)
          mountPistolToNativeWrist(u.riderSeatCanonicalJoints.wristR);
        else if(v.t==='bici'||v.t==='moto')
          mountPistolToNativeWrist(cycleJoints.wristR);
        origin=pistolMuzzleWorld();
      }
      const direction=forward.clone().applyQuaternion(
        pistol.getWorldQuaternion(new THREE.Quaternion())).normalize();
      if(u.riderFarActive){
        // No deixa pistoles flotants ni efectes pendents en tornar a prop.
        pistol.visible=false;u.shotTime=0;u.shotBlend=0;
        u.riderNativeShotActive=false;
      }
      return {origin,direction};
    };
    const update=(v,dt,seatIndex=null,viewDistance=0)=>{
      // null = partida individual: conserva exactament la postura existent.
      // 0/1 = seient autoritatiu COOP (pilot esquerra, passatger dreta).
      const passenger=seatIndex===1,coopSeat=seatIndex===0||passenger;
      const car=!!v&&(v.t==='cotxe_civil'||v.t==='cotxe');
      const open=!!v&&(car||['bici','moto','moto_aquatica','llanxa','llanxa_coets','barca_rems','windsurf','hover'].includes(v.t));g.visible=open;
      if(!open){
        g.userData.shotTime=0;g.userData.shotBlend=0;
        g.userData.pistolAim=null;pistol.visible=false;
        g.userData.riderNativePistolWrist=null;
        g.userData.riderNativePistolMounted=false;
        g.userData.riderNativeShotActive=false;
        g.userData.riderFarShotWrist=null;
        g.userData.riderSeatCanonicalActive=false;
        g.userData.riderSeatCanonicalBody=null;
        g.userData.riderSeatCanonicalJoints=null;
        return;
      }
      const u=g.userData,sc=v.t==='llanxa'?1.3:v.t==='llanxa_coets'?1.35:scales[v.t],moving=Math.min(1,Math.abs(v.v)/1.8);u.motion+=(moving-u.motion)*(1-Math.exp(-12*dt));const motion=u.motion,phase=v.t==='barca_rems'&&Math.abs(v.v)<.7&&Math.abs(v.yawRate||0)>.08?-(v.rowSpinPhase||0):(v.t==='bici'||v.t==='barca_rems')?-(v.pedalPhase||0):(v.pedalPhase||0);
      // La mida pròpia dels ocupants deriva del tipus de cabina.
      // Les malles i els punts de repòs es consoliden en canviar
      // de vehicle; l'arrel del rider ja no es redimensiona.
      const twoWheeled=v.t==='moto'||v.t==='bici';
      const gazTigr=car&&v.o?.userData?.gazModel==='Tigr-M';
      const cabinSize=twoWheeled?1:gazTigr?.825:car?.82:v.t==='hover'?.63:1;
      setNativeRiderSize(cabinSize);
      g.position.copy(v.o.position);g.quaternion.copy(v.o.quaternion);
      // La silueta simplificada no pot substituir el model canònic en dues rodes.
      const far=!twoWheeled&&Number.isFinite(viewDistance)&&viewDistance>
        (u.riderFarActive?350:430);
      // Figura V18 de seient per a pilot/passatger (SOLO i COOP),
      // en comptes del manequí de segments reescalables del V17.
      const canonicalSeat=(car||v.t==='hover'||
        ['llanxa','llanxa_coets','barca_rems','moto_aquatica','windsurf'].includes(v.t))&&!far?
        getNativeSeat(cabinSize):null;
      // Per a TOTS els vehicles oberts del joc hi ha una via V18
      // de seient o de dues rodes. No pot tornar a usar els braços
      // telescòpics de l'antic rider si no s'ha creat el seient.
      if(!far&&!twoWheeled&&!canonicalSeat)
        throw Error('Rider V18: falta el seient natiu del vehicle '+v.t);
      u.riderNativeOnlyPose=!!(canonicalSeat||twoWheeled);
      u.riderFarActive=far;
      u.riderFarShotWrist=null;
      cycleBody.visible=twoWheeled;
      for(const seat of nativeSeatVariants.values())
        seat.root.visible=seat===canonicalSeat;
      for(const child of riderDetailNodes)if(child!==pistol)
        child.visible=!far&&!twoWheeled&&!canonicalSeat;
      riderFar.visible=far;
      u.riderSeatCanonicalActive=!!canonicalSeat;
      u.riderSeatCanonicalBody=canonicalSeat?.root||null;
      u.riderSeatCanonicalJoints=canonicalSeat?.joints||null;
      if(twoWheeled)pistol.visible=false;
      if(far){
        // El cos simplificat es posa sobre el seient sense animar cames,
        // mans o arma; la simulació i el seient autoritatiu són idèntics.
        const seatX=coopSeat?(passenger?1:-1)*(car?.65:.58)*sc:0,
          deckY=car?1.20*sc:v.t==='hover'?1.25*sc:
            v.t==='windsurf'?1.05*sc:1.35*sc;
        const twoWheel=v.t==='moto'||v.t==='bici';
        const visualScale=v.t==='moto'?(v.o?.userData?.motorcycleVisualScale??1):
          (v.o?.userData?.bicycleVisualScale??.70);
        const fit=sc*visualScale;
        riderFar.position.set(seatX*nativeSize,
          (twoWheel?(v.t==='moto'?.99:1.65)*fit/cabinSize:deckY)*nativeSize,
          (twoWheel?(v.t==='moto'?.26:.4)*fit/cabinSize:0)*nativeSize);
        pistol.visible=false;
        u.riderNativePistolWrist=null;
        u.riderNativePistolMounted=false;
        u.riderNativeShotActive=false;
        return;
      }
      // El cap i les botes del controlador ocult no es tornen a
      // animar. La pose visible pertany al V18 de seient/dos rodes.
      torso.rotation.set(0,0,0);

      // Les sis postures V18 de seient es resolen directament amb
      // mans/peus geomètrics. No es calcula cap segment ni botina
      // del controlador V17 en cotxes, llanxes, jetski, rems o vela.
      if(car){
        // Seient esquerre, darrere del volant (C1A i cotxe utilitari).
        // Posicions físiques convertides al sistema del rider escalat.
        const civil=v.t==='cotxe_civil',
              humvee=!civil&&v.o?.userData?.humveeModel==='D3.1',
              cabinScale=gazTigr?1.25:1,
              // The Humvee cabin is forward-facing -Z and wider than the
              // previous military car. Rider and wheel now share this seat.
              seatX=(civil?.613:humvee?.84:.72)*sc*cabinScale*(passenger?1:-1),
              seatY=(civil?1.14:humvee?1.24:1.22)*sc*cabinScale,
              seatZ=(civil?-.60:humvee?-.26:.42)*sc*cabinScale,
              steeringX=seatX,
              steeringY=(civil?1.66:humvee?1.60:1.91)*sc*cabinScale,
              steeringZ=(civil?-.94:humvee?-.87:-.67)*sc*cabinScale;
        torso.position.set(seatX,seatY,seatZ);
        torso.rotation.x=-.05;
        const nativeHands=[],nativeFeet=[];
        for(let i=0;i<2;i++){
          const side=i?1:-1,
                hand=passenger?
                  vec((seatX+side*.23*sc),
                    (seatY+.16*sc),(seatZ-.32*sc)):
                  vec((steeringX+side*.22*sc),
                    steeringY,steeringZ),
                foot=vec((seatX+side*.20*sc),
                  .87*sc*cabinScale,(civil?-1.31:humvee?-1.10:-.95)*sc*cabinScale);
          nativeHands.push(hand);nativeFeet.push(foot);
        }
        // També els conductors de cotxe han de mostrar el gest real
        // de treure la pistola en disparar (local i company COOP).
        u.riderSeatVehicleType=v.t;
        aimNativeSeatPistol(v,dt);
        poseCanonicalSeat(canonicalSeat,torso.position,torso.rotation.x,
            nativeHands,nativeFeet,u.shotBlend);
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
              seatZ=(station?.z??-1.08)*sc;
        torso.position.set(seatX,seatY,seatZ);
        torso.rotation.x=-.07;
        const nativeHands=[],nativeFeet=[];
        for(let i=0;i<2;i++){
          const side=i?1:-1,
                hand=passenger?
                  vec((seatX+side*.18*sc),
                    (seatY+.13*sc),(seatZ-.16*sc)):
                  vec(((helm?.x??-.30)+side*.105)*sc,
                    ((helm?.y??1.88)+.012)*sc,
                    (helm?.z??-1.98)*sc),
                foot=vec((seatX+side*.16*sc),
                  1.42*sc,(seatZ-.36*sc));
          nativeHands.push(hand);nativeFeet.push(foot);
        }
        // Disparar des del seient conserva la mà esquerra al comandament
        // en les animacions del mode individual i del company remot.
        u.riderSeatVehicleType=v.t;
        aimNativeSeatPistol(v,dt);
        poseCanonicalSeat(canonicalSeat,torso.position,torso.rotation.x,
            nativeHands,nativeFeet,u.shotBlend);
        return;
      }

      if(twoWheeled){
        // Exactament la malla de 3,2 m del protagonista a peu, no un
        // pilot antic miniaturitzat. Mans i peus segueixen els controls
        // per rotació dels ossos (sense mai allargar les extremitats).
        poseCanonicalTwoWheel(v,sc,motion,phase);
        aimCanonicalPistol(v,dt);
        return;
      }
      if(v.t==='moto_aquatica'){
        const seat=.98*sc,lean=.18+.12*motion;
        torso.position.set(0,seat,.3*sc);torso.rotation.x=lean;
        const nativeHands=[],nativeFeet=[];
        for(let i=0;i<2;i++){
          const side=i?1:-1,
            hand=vec(side*.38*sc,1.32*sc,-.58*sc),
            foot=vec(side*.38*sc,.48*sc,.58*sc);
          nativeHands.push(hand);nativeFeet.push(foot);
        }
        u.riderSeatVehicleType=v.t;
        aimNativeSeatPistol(v,dt);
        poseCanonicalSeat(canonicalSeat,torso.position,torso.rotation.x,
            nativeHands,nativeFeet,u.shotBlend,true);
        return;
      }

      if(v.t==='barca_rems'){
        const seat=v.o.userData.rowingSeat,seatY=seat.y*sc,seatZ=seat.z*sc;
        const pull=(1-Math.cos(phase))*.5;
        torso.position.set(0,seatY,seatZ);torso.rotation.set(-.06+.15*pull*motion,Math.PI,0);
        v.o.updateWorldMatrix(true,true);g.updateWorldMatrix(true,false);
        const nativeHands=[],nativeFeet=[];
        for(let i=0;i<2;i++){
          // Remador mirant a popa: la dreta anatòmica agafa
          // el rem de babord. Els grips són els del model 3D real.
          const side=i?1:-1,boatSide=-side,
                oar=v.o.userData.oars[1-i],
                hand=g.worldToLocal(oar.localToWorld(oar.userData.grip.clone())),
                foot=vec(boatSide*.34,.2*sc,seatZ+.97*sc);
          nativeHands.push(hand);nativeFeet.push(foot);
        }
        u.riderSeatVehicleType=v.t;
        aimNativeSeatPistol(v,dt);
        poseCanonicalSeat(canonicalSeat,torso.position,torso.rotation.x,
            nativeHands,nativeFeet,u.shotBlend,true);
        return;
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
        // Les mans del windsurf provenen dels punts de la botavara.
        // El V18 conserva l'ordre anatòmic esquerra/dreta.
        v.o.updateWorldMatrix(true,true);
        g.updateWorldMatrix(true,false);
        const hands=grips.map(p=>g.worldToLocal(
          (sail||v.o).localToWorld(p.clone())));
        const feet=[vec(.66*sc,footY,.99*sc),
                    vec(.72*sc,footY,-.63*sc)];
        const nativeHands=[];
        for(let i=0;i<2;i++)
          nativeHands.push(hands[i]||vec(-.5*sc,2.6*sc,.5*sc));
        // La mà dreta V18 segueix el dispar; l'esquerra manté la
        // botavara original com a destí en coordenades del vehicle.
        u.riderSeatVehicleType=v.t;
        aimNativeSeatPistol(v,dt);
        poseCanonicalSeat(canonicalSeat,torso.position,torso.rotation.x,
            nativeHands,feet,u.shotBlend,true);
        return;
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
        const nativeHands=[],nativeFeet=[];
        for(let i=0;i<2;i++){
          const side=i?1:-1,
                hand=passenger?
                  vec(seatX+side*.32*riderSc,seat+.16,seatZ-.42*riderSc):
                  vec(seatX+side*.48*riderSc,seat+.7,-.7*riderSc+offZ),
                foot=vec(seatX+side*.42*riderSc,.92*riderSc+offY,-.35*riderSc+offZ);
          nativeHands.push(hand);nativeFeet.push(foot);
        }
        u.riderSeatVehicleType=v.t;
        aimNativeSeatPistol(v,dt);
        poseCanonicalSeat(canonicalSeat,torso.position,torso.rotation.x,
            nativeHands,nativeFeet,u.shotBlend,true);
        return;
      }

      // Totes les postures obertes tenen una ruta V18 obligatòria.
      // Mai no retornam a braços extensibles ni a ancoratges V17.
      throw Error('Rider V18: postura desconeguda de '+v.t);
    };
    const reset=()=>{g.visible=false;g.userData.motion=0;g.userData.shotTime=0;
      g.userData.shotBlend=0;g.userData.pistolAim=null;pistol.visible=false;
      for(const seat of nativeSeatVariants.values())seat.root.visible=false;
      g.userData.riderSeatCanonicalActive=false;
      g.userData.riderSeatCanonicalBody=null;
      g.userData.riderSeatCanonicalJoints=null;
      g.userData.riderNativePistolWrist=null;
      g.userData.riderNativePistolMounted=false;
      g.userData.riderNativeShotActive=false;};
    return {object:g,update,reset,firePistol};
  }
});


