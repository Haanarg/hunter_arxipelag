// Cosmetic projection only. Health, trajectories and hit positions come from server state.
export function createCombatView(T,scene){
  const objects=new Map();
  function remove(id){const o=objects.get(id);if(!o)return;scene.remove(o);o.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});objects.delete(id);}
  function update(combat,tick){
    const rows=[...(combat?.targets||[]).map(t=>({key:'target:'+t.id,kind:'target',...t})),...(combat?.grenades||[]).map(g=>({key:g.id,kind:'grenade',...g})),...(combat?.effects||[]).map(e=>({key:'effect:'+e.id,...e}))],live=new Set(rows.map(r=>r.key));
    for(const id of objects.keys())if(!live.has(id))remove(id);
    for(const r of rows){let o=objects.get(r.key);
      if(!o){
        if(r.kind==='target'){o=new T.Group();const body=new T.Mesh(new T.BoxGeometry(1.6,3,1.6),new T.MeshStandardMaterial({color:0xc83e42}));body.position.y=1.5;o.add(body);const bar=new T.Mesh(new T.BoxGeometry(2,.2,.2),new T.MeshBasicMaterial({color:0x95fa86}));bar.position.y=3.5;o.add(bar);o.userData.targetId=r.id;}
        else if(r.kind==='grenade'){o=new T.Mesh(new T.SphereGeometry(.65,8,6),new T.MeshStandardMaterial({color:0xa5ba53}));o.userData.grenadeId=r.id;}
        else if(r.kind==='shot'){o=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(r.from.x,r.from.y,r.from.z),new T.Vector3(r.to.x,r.to.y,r.to.z)]),new T.LineBasicMaterial({color:r.hit?0xff6855:0xffe18a}));}
        else{o=new T.Mesh(new T.SphereGeometry(1,16,8),new T.MeshBasicMaterial({color:0xff9a32,transparent:true,opacity:.35,wireframe:true}));}
        objects.set(r.key,o);scene.add(o);
      }
      if(r.kind==='target'){o.position.set(r.x,r.y,r.z);o.visible=r.hp>0;o.children[1].scale.x=Math.max(0,r.hp/12);}
      else if(r.kind==='grenade')o.position.set(r.x,r.y,r.z);
      else if(r.kind==='explosion'){o.position.set(r.at.x,r.at.y,r.at.z);o.scale.setScalar(Math.max(.3,r.radius*Math.min(1,(tick-r.tick+1)/12)));o.material.opacity=Math.max(0,.45*(1-(tick-r.tick)/25));}
    }
  }
  return {update,destroy(){for(const id of [...objects.keys()])remove(id);}};
}
