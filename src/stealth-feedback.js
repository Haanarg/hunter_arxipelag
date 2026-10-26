// Senyals de joc independents de F9: només es mostren després de validar visibilitat.
window.HUNTER_STEALTH_FEEDBACK=Object.freeze({
  create(T,{limit=24,maxChecks=48,maxDistance=100}={}){
    const retain=window.HUNTER_RESOURCES.retain,geometries={},materials={},entries=[],
      shapes={
        suspicion:[-.2,.24,.02,0,.36,.02,0,.36,.02,.2,.24,.02,.2,.24,.02,.2,.08,.02,.2,.08,.02,0,-.06,.02,0,-.06,.02,0,-.19,.02,0,-.3,.02,0,-.34,.02],
        contact:[0,.36,.02,0,-.15,.02,0,-.28,.02,0,-.35,.02],
        search:[0,.35,.02,.27,0,.02,.27,0,.02,0,-.35,.02,0,-.35,.02,-.27,0,.02,-.27,0,.02,0,.35,.02]
      },colors={suspicion:0xe7c47e,contact:0xe2937f,search:0x9dcbd2},
      frustum=new T.Frustum(),projection=new T.Matrix4(),body=new T.Vector3(),marker=new T.Vector3(),
      stats={visible:0,checks:0,allocated:0,limit,maxChecks,maxDistance};
    let cursor=0,enemySource=null,enemyCount=-1,members=new Set();
    // Reutilitzar les estructures evita generar brossa a cada dibuix.
    const seen=new Set();
    for(const mode of Object.keys(shapes)){
      geometries[mode]=retain(new T.BufferGeometry());
      geometries[mode].setAttribute('position',new T.Float32BufferAttribute(shapes[mode],3));
      materials[mode]=retain(new T.LineBasicMaterial({color:colors[mode],depthTest:true,depthWrite:false,transparent:true,opacity:.88}));
    }
    const modeFor=u=>u.canSee?'contact':u.aiMode==='suspicious'?'suspicion':
      u.aiMode==='search'||u.aiMode==='investigate'?'search':null;
    function reset(){
      for(const entry of entries){entry.mesh.visible=false;entry.mesh.removeFromParent();entry.unit=null;entry.mode=null}
      cursor=0;stats.visible=0;stats.checks=0;
      enemySource=null;enemyCount=-1;members.clear();
    }
    function update({world,camera,enemies,active,visible}){
      if(!active||!world){reset();return}
      camera.updateMatrixWorld(true);
      projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projection);stats.checks=0;stats.visible=0;
      if(enemySource!==enemies||enemyCount!==enemies.length){
        members=new Set(enemies);enemySource=enemies;enemyCount=enemies.length;
      }
      seen.clear();
      function show(u,entry=null){
        if(stats.checks>=maxChecks||!u||seen.has(u))return false;
        seen.add(u);stats.checks++;
        const mode=modeFor(u);
        if(u.t!=='soldat'||u.hp<=0||u.destroyed||!mode||!u.o?.parent)return false;
        for(let node=u.o;node;node=node.parent)if(!node.visible)return false;
        body.set(u.x,u.o.position.y+1.6,u.z);marker.set(u.x,u.o.position.y+3.9,u.z);
        if(camera.position.distanceToSquared(body)>maxDistance*maxDistance||
          !frustum.containsPoint(body)||!frustum.containsPoint(marker)||!visible(u,body,marker))return false;
        if(!entry){
          entry=entries.find(item=>!item.unit);
          if(!entry){
            if(entries.length>=limit)return false;
            const mesh=new T.LineSegments(geometries[mode],materials[mode]);mesh.name='stealth-state-marker';
            mesh.userData.noCastShadow=true;entries.push(entry={mesh,unit:null,mode:null});stats.allocated=entries.length;
          }
        }
        entry.unit=u;entry.mode=mode;entry.mesh.geometry=geometries[mode];entry.mesh.material=materials[mode];
        entry.mesh.position.copy(marker);entry.mesh.quaternion.copy(camera.quaternion);entry.mesh.visible=true;
        if(entry.mesh.parent!==world)world.add(entry.mesh);
        stats.visible++;return true;
      }
      // Els senyals ja visibles es tornen a validar CADA dibuix, sense memòria de LOS.
      for(const entry of entries){
        const u=entry.unit;entry.mesh.visible=false;
        if(!u||!members.has(u)||!show(u,entry)){entry.unit=null;entry.mode=null}
      }
      for(let visited=0;visited<enemies.length&&stats.checks<maxChecks&&stats.visible<limit;visited++){
        if(cursor>=enemies.length)cursor=0;show(enemies[cursor++]);
      }
    }
    return Object.freeze({update,reset,stats,entries});
  }
});
