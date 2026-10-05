// Pilot visual per vehicles oberts. La física del vehicle continua al nucli.
window.HUNTER_RIDER=Object.freeze({
  create(THREE,{scene,box,material,scales,heightAt,shadows}){
    const g=new THREE.Group(),torso=new THREE.Group();g.add(torso);
    const cloth=material(0x49e52c),pants=material(0x32c52a);
    box(torso,1.13,1.1,.63,0x49e52c,0,.58,0);box(torso,.74,.88,.3,0x6a5632,0,.65,.43);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.2,.22,.28,10),material(0xf0c9a0));neck.position.set(0,1.05,-.08);torso.add(neck);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.44,12,8,0,Math.PI*2,.28,Math.PI-.62),material(0xf0c9a0));head.scale.set(.82,1,.8);head.position.set(0,1.42,-.12);torso.add(head);
    const hairMat=material(0x3a2b22);
    // Cap del rider: X ±.361 / Z ±.352. El cabell queda lleugerament per fora i cap enrere.
    const hairShell=new THREE.Mesh(new THREE.CylinderGeometry(.355,.37,.31,12,1,true,Math.PI*1.18,Math.PI*1.64),hairMat);
    hairShell.position.set(0,1.52,.09);hairShell.rotation.y=Math.PI;torso.add(hairShell);
    const hairBack=new THREE.Mesh(new THREE.CylinderGeometry(.35,.37,.21,12,1,true,0,Math.PI*2),hairMat);
    hairBack.scale.set(.98,.92,.84);hairBack.position.set(0,1.395,.17);torso.add(hairBack);
    box(torso,.39,.12,.1,0x3a2b22,0,1.3,.24);
    box(torso,.32,.15,.06,0x11161a,-.18,1.48,-.45);box(torso,.32,.15,.06,0x11161a,.18,1.48,-.45);box(torso,.1,.05,.06,0x151515,0,1.48,-.45);
    const capCrown=new THREE.Mesh(new THREE.SphereGeometry(.47,12,6,0,Math.PI*2,0,Math.PI/2),material(0x22b72c));capCrown.scale.set(.9,.42,.93);capCrown.position.set(0,1.63,-.13);torso.add(capCrown);
    const visor=box(torso,.66,.075,.44,0x22b72c,0,1.615,-.47);visor.rotation.x=-.1;
    const limbs=[];for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(i<4?.17:.2,i<4?.17:.2,1,6),i<4?cloth:pants);g.add(m);limbs.push(m)}
    const boots=[-1,1].map(()=>box(g,.4,.22,.65,0x222222,0,0,0));
    g.userData={torso,limbs,boots,motion:0};g.visible=false;g.traverse(o=>{if(o.isMesh)o.castShadow=shadows});scene.add(g);
    const limbBetween=(m,a,b)=>{const delta=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=delta.length();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())};
    const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
    const update=(v,dt)=>{
      const open=!!v&&['bici','moto','moto_aquatica','llanxa','llanxa_coets','barca_rems','windsurf'].includes(v.t);g.visible=open;if(!open)return;
      const u=g.userData,sc=scales[v.t],moving=Math.min(1,Math.abs(v.v)/1.8);u.motion+=(moving-u.motion)*(1-Math.exp(-12*dt));const motion=u.motion,phase=(v.t==='bici'||v.t==='barca_rems')?-(v.pedalPhase||0):(v.pedalPhase||0);
      g.position.copy(v.o.position);g.quaternion.copy(v.o.quaternion);torso.rotation.set(0,0,0);

      if(v.t==='bici'||v.t==='moto'){
        const seat=1.65*sc;torso.position.set(0,seat,.4*sc);torso.rotation.x=.15*motion;
        for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.28,seat,.4*sc),shoulder=vec(side*.64,seat+1.04,.4*sc-.15*motion),hand=vec(side*.5*sc,1.96*sc,-sc),elbow=shoulder.clone().lerp(hand,.52);elbow.x+=side*.1;elbow.y-=.2;limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(side*.55,0,.45*sc),worldFoot=foot.clone().applyQuaternion(g.quaternion).add(g.position);worldFoot.y=heightAt(worldFoot.x,worldFoot.z)+.12;const groundFoot=worldFoot.sub(g.position).applyQuaternion(g.quaternion.clone().invert());const pedal=v.t==='bici'?vec(side*.4*sc,(.75-side*Math.sin(phase)*.28)*sc,side*Math.cos(phase)*.28*sc):vec(side*.5*sc,.72*sc,.1*sc);foot.copy(groundFoot).lerp(pedal,motion);const knee=hip.clone().lerp(foot,.5);knee.z-=.5*motion;knee.x+=side*.12*(1-motion);limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot);boots[i].rotation.x=0}
        return;
      }

      if(v.t==='moto_aquatica'){
        const seat=.98*sc,lean=.18+.12*motion;torso.position.set(0,seat,.3*sc);torso.rotation.x=lean;
        for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.25,seat,.3*sc),shoulder=vec(side*.55,seat+1.02,.12*sc),hand=vec(side*.38*sc,1.32*sc,-.58*sc),elbow=shoulder.clone().lerp(hand,.55);elbow.y-=.12;limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(side*.38*sc,.48*sc,.58*sc),knee=hip.clone().lerp(foot,.5);knee.z-=.25;limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot);boots[i].rotation.x=.15}
        return;
      }

      if(v.t==='barca_rems'){
        const seat=1.03*sc,pull=(1-Math.cos(phase))*.5,sweep=Math.sin(phase)*.18*motion;
        torso.position.set(0,seat,.05*sc);torso.rotation.y=Math.PI;torso.rotation.x=-.08+.18*pull*motion;
        for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.27,seat,.05*sc),shoulder=vec(side*.55,seat+1.02,.12*sc),hand=vec(side*(.82+.08*Math.cos(phase))*sc,seat+.48*sc,(.04+sweep*side)*sc),elbow=shoulder.clone().lerp(hand,.52);elbow.x+=side*.12;limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          const foot=vec(side*.35,.66*sc,-.78*sc),knee=hip.clone().lerp(foot,.48);knee.y+=.2;limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot);boots[i].rotation.x=.1}
        return;
      }

      if(v.t==='windsurf'){
        // Postura real de windsurf: dempeus, cames gairebé rectes, tors de costat i mans al travesser.
        const lean=Math.max(-.08,Math.min(.08,v.v/42)),bodyX=-.62*sc,hipY=1.36*sc,footY=.29*sc;
        torso.position.set(bodyX,hipY,.08*sc);
        torso.rotation.set(0,Math.PI/2,-.035+lean);
        const hips=[vec(bodyX,hipY,.25*sc),vec(bodyX,hipY,-.25*sc)];
        const shoulders=[vec(bodyX,hipY+1.03,.22*sc),vec(bodyX,hipY+1.03,-.22*sc)];
        const hands=[vec(.52*sc,2.39*sc,.25*sc),vec(1.2*sc,2.08*sc,.25*sc)];
        const feet=[vec(bodyX,footY,-.72*sc),vec(bodyX,footY,.72*sc)];
        for(let i=0;i<2;i++){
          const hip=hips[i],shoulder=shoulders[i],hand=hands[i],foot=feet[i];
          const elbow=shoulder.clone().lerp(hand,.55);
          elbow.y-=.1;elbow.z+=(i?-.06:.06);
          limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
          // Genoll sobre la línia cama-maluc-peu: només una flexió mínima visual.
          const knee=hip.clone().lerp(foot,.5);knee.x+=.015*sc;
          limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);
          boots[i].position.copy(foot);boots[i].rotation.set(0,Math.PI/2,0);
        }
        return;
      }

      const seat=1.45*sc;torso.position.set(0,seat,.55*sc);torso.rotation.x=.04;
      for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.28,seat,.55*sc),shoulder=vec(side*.58,seat+1.02,.45*sc),hand=vec(side*.48*sc,seat+.7,-.7*sc),elbow=shoulder.clone().lerp(hand,.52);limbBetween(limbs[i*2],shoulder,elbow);limbBetween(limbs[i*2+1],elbow,hand);
        const foot=vec(side*.42*sc,.92*sc,-.35*sc),knee=hip.clone().lerp(foot,.5);knee.y+=.18;limbBetween(limbs[4+i*2],hip,knee);limbBetween(limbs[5+i*2],knee,foot);boots[i].position.copy(foot)}
    };
    const reset=()=>{g.visible=false;g.userData.motion=0};
    return {object:g,update,reset};
  }
});
