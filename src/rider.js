// Pilot visual per bicicleta i moto. La física del vehicle continua al nucli.
window.HUNTER_RIDER=Object.freeze({
  create(THREE,{scene,box,material,scales,heightAt,shadows}){
    const g=new THREE.Group(),torso=new THREE.Group();g.add(torso);
    const cloth=material(0x49e52c),pants=material(0x32c52a);
    box(torso,1.13,1.1,.63,0x49e52c,0,.58,0);box(torso,.74,.88,.3,0x6a5632,0,.65,.43);box(torso,.63,.63,.63,0xf0c9a0,0,1.45,-.12);box(torso,.73,.33,.73,0x22b72c,0,1.78,-.12);box(torso,.55,.14,.07,0x151515,0,1.5,-.45);
    const limbs=[];for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(i<4?.17:.2,i<4?.17:.2,1,6),i<4?cloth:pants);g.add(m);limbs.push(m)}
    const boots=[-1,1].map(()=>box(g,.4,.22,.65,0x222222,0,0,0));
    g.userData={torso,limbs,boots,motion:0};g.visible=false;g.traverse(o=>{if(o.isMesh)o.castShadow=shadows});scene.add(g);
    const limbBetween=(m,a,b)=>{const delta=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=delta.length();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())};
    const update=(v,dt)=>{g.visible=!!v&&(v.t==='bici'||v.t==='moto');if(!g.visible)return;const u=g.userData,sc=scales[v.t],seat=1.65*sc,moving=Math.min(1,Math.abs(v.v)/1.8);u.motion+=(moving-u.motion)*(1-Math.exp(-12*dt));const motion=u.motion,phase=v.pedalPhase||0;g.position.copy(v.o.position);g.quaternion.copy(v.o.quaternion);u.torso.position.set(0,seat,.4*sc);u.torso.rotation.x=.15*motion;const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
      for(let i=0;i<2;i++){const side=i?1:-1,hip=vec(side*.28,seat,.4*sc),shoulder=vec(side*.64,seat+1.04,.4*sc-.15*motion),hand=vec(side*.5*sc,1.96*sc,-sc),elbow=shoulder.clone().lerp(hand,.52);elbow.x+=side*.1;elbow.y-=.2;limbBetween(u.limbs[i*2],shoulder,elbow);limbBetween(u.limbs[i*2+1],elbow,hand);
        const foot=vec(side*.55,0,.45*sc),worldFoot=foot.clone().applyQuaternion(g.quaternion).add(g.position);worldFoot.y=heightAt(worldFoot.x,worldFoot.z)+.12;const groundFoot=worldFoot.sub(g.position).applyQuaternion(g.quaternion.clone().invert());const pedal=v.t==='bici'?vec(side*.4*sc,(.75-side*Math.sin(phase)*.28)*sc,side*Math.cos(phase)*.28*sc):vec(side*.5*sc,.72*sc,.1*sc);foot.copy(groundFoot).lerp(pedal,motion);const knee=hip.clone().lerp(foot,.5);knee.z-=.5*motion;knee.x+=side*.12*(1-motion);limbBetween(u.limbs[4+i*2],hip,knee);limbBetween(u.limbs[5+i*2],knee,foot);u.boots[i].position.copy(foot);u.boots[i].rotation.x=0}
    };
    const reset=()=>{g.visible=false;g.userData.motion=0};
    return {object:g,update,reset};
  }
});
