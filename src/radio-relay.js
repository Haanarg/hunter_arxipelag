// Els relés transmeten informació coneguda; no creen enemics ni revelen el jugador ocult.
window.HUNTER_RADIO_RELAY=Object.freeze({
  create({THREE:T,heightAt=()=>0,clearLine=()=>true,notify=()=>{},sound=()=>{},
    onAlert=()=>{},onRelease=()=>{},registerCollider=()=>{},unregisterCollider=()=>{}}={}){
    const relays=[],resources=new Set(),leases=new Map(),receiverPools=new Map();
    const DISCOVER_RANGE=70,ACTION_RANGE=2.9,COOLDOWN=18,DEFENSE_SECONDS=30;
    let time=0,world=null;
    const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
    const point=(record,x,z)=>{
      const c=Math.round(Math.cos(record.angle||0)),s=Math.round(Math.sin(record.angle||0));
      return {x:record.x+x*c-z*s,z:record.z+x*s+z*c};
    };
    const alive=u=>u&&u.hp>0&&!u.destroyed;
    const footY=p=>Number.isFinite(p?.y)?p.y:
      (p?.t==='heli'||p?.t==='heli_combat')&&Number.isFinite(p.alt)?p.alt:
      Number.isFinite(p?.o?.position?.y)?p.o.position.y:
      Number.isFinite(p?.alt)?p.alt:heightAt(p.x,p.z);
    const playerFor=context=>context?.vehicle||context?.player;
    function own(resource){resources.add(resource);return resource}
    function reset(){
      for(const relay of relays){unregisterCollider(relay.collider);relay.o?.removeFromParent()}
      for(const resource of resources)resource.dispose?.();
      relays.length=0;resources.clear();leases.clear();receiverPools.clear();time=0;world=null;
    }
    function panelPosition(record){
      const layout=record.layout,radio=layout.buildings.find(b=>b.id==='radio'),
        a=layout.antenna||{x:radio?.x||0,z:(radio?.z||0)+(radio?.d||0)/2+3.5,scale:0},
        radius=layout.antenna?4*(a.scale||1):0,margin=1.35,
        fencePoints=layout.fence?.flat()||[],
        bounds={x:fencePoints.length?Math.max(...fencePoints.map(p=>Math.abs(p[0]))):layout.size[0]/2-2,
          z:fencePoints.length?Math.max(...fencePoints.map(p=>Math.abs(p[1]))):layout.size[1]/2-2};
      // A free-standing control beside the solid plinth, with room to stand in front.
      const offsets=[];
      for(const distance of[radius+2.6,radius+5.2,radius+8.2]){
        for(const [dx,dz]of[[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]])
          offsets.push([a.x+dx*distance,a.z+dz*distance]);
      }
      const blocked=(x,z)=>{
        if(Math.abs(x)>bounds.x-margin||Math.abs(z)>bounds.z-margin)return true;
        if(radius&&Math.abs(x-a.x)<radius+margin&&Math.abs(z-a.z)<radius+margin)return true;
        if(layout.buildings.some(b=>{
          const turn=Math.abs(Math.round(Math.sin(b.rotationY||0))),w=turn?b.d:b.w,d=turn?b.w:b.d;
          return Math.abs(x-b.x)<w/2+margin&&Math.abs(z-b.z)<d/2+margin;
        }))return true;
        return (layout.props||[]).some(([kind,px,pz])=>{
          const r=kind==='generator'?4.5:kind==='fuel'?3.8:kind==='flag'?5.5:2;
          return Math.hypot(x-px,z-pz)<r+margin;
        });
      };
      let local=offsets.find(([x,z])=>!blocked(x,z));
      if(!local){
        // The search is local, deterministic and bounded for unusual authored variants.
        const candidates=[];
        for(let x=-bounds.x+2;x<bounds.x-2;x+=2)for(let z=-bounds.z+2;z<bounds.z-2;z+=2)
          if(!blocked(x,z))candidates.push({x,z,d:(x-a.x)**2+(z-a.z)**2});
        candidates.sort((a,b)=>a.d-b.d);if(candidates.length)local=[candidates[0].x,candidates[0].z];
      }
      if(!local)return null;
      const p=point(record,...local);p.y=heightAt(p.x,p.z);
      return {...p,local:{x:local[0],z:local[1]}};
    }
    function createPanel(relay){
      const root=new T.Group();root.name='radio-relay-panel';root.position.set(relay.x,relay.y,relay.z);
      root.rotation.y=-(relay.source.angle||0);
      const dark=own(new T.MeshStandardMaterial({color:0x354440,roughness:.8})),
        metal=own(new T.MeshStandardMaterial({color:0x89958d,roughness:.65})),
        light=own(new T.MeshBasicMaterial({color:0x6be89b})),
        broken=own(new T.MeshBasicMaterial({color:0xe57a60}));
      const box=(w,h,d,mat,x,y,z)=>{
        const mesh=new T.Mesh(own(new T.BoxGeometry(w,h,d)),mat);mesh.position.set(x,y,z);
        mesh.castShadow=false;root.add(mesh);return mesh;
      };
      box(.16,1.8,.16,metal,0,.9,0);box(1.1,.82,.56,dark,0,1.6,0);
      box(.66,.25,.06,metal,-.1,1.64,.31);relay.lamp=box(.17,.17,.08,light,.34,1.65,.32);
      box(.5,.06,.07,metal,-.14,1.37,.32);
      const cut=new T.Group();cut.name='radio-relay-disabled';cut.visible=false;
      for(const sign of[-1,1]){
        const mesh=new T.Mesh(own(new T.BoxGeometry(.7,.09,.08)),broken);
        mesh.rotation.z=sign*.65;mesh.position.set(-.1,1.64,.38);cut.add(mesh);
      }
      root.add(cut);relay.cutVisual=cut;relay.o=root;world.add(root);
    }
    function entryFor(receiver){
      const entry=receiver.entrances?.[0]||[receiver.x,receiver.z+(receiver.r||70)*.8];
      const dx=entry[0]-receiver.x,dz=entry[1]-receiver.z,len=Math.hypot(dx,dz)||1;
      return {x:entry[0],z:entry[1],nx:dx/len,nz:dz/len};
    }
    function poolFor(receiver){
      if(receiverPools.has(receiver))return receiverPools.get(receiver);
      const entry=entryFor(receiver),units=(receiver.soldiers||[])
        .filter(u=>u.t==='soldat'&&!u.elite&&!u.basement&&alive(u))
        .slice().sort((a,b)=>Math.hypot(a.x-entry.x,a.z-entry.z)-Math.hypot(b.x-entry.x,b.z-entry.z))
        .slice(0,2);
      receiverPools.set(receiver,units);return units;
    }
    function configure({world:nextWorld,compounds=[],logicalOnly=false}={}){
      reset();world=nextWorld||null;
      const receiver=compounds.find(c=>c.id==='hq'&&!c.layout?.friendly&&!c.layout?.civilian);
      for(const source of compounds){
        if(source.id!=='comunicacions'||!source.layout)continue;
        const p=panelPosition(source);if(!p)continue;
        const relay={id:'radio-'+relays.length,source,receiver:receiver||null,...p,
          operational:true,disabledReason:null,discovered:false,lastWarn:-Infinity,
          reports:0,dispatches:0,lastReport:null,o:null,lamp:null,cutVisual:null};
        const turned=Math.abs(Math.round(Math.sin(source.angle||0))),hx=turned?.35:.6,hz=turned?.6:.35;
        relay.collider={x0:p.x-hx,x1:p.x+hx,z0:p.z-hz,z1:p.z+hz,y0:p.y+.8,y1:p.y+2.1,
          hp:4,m:null,parts:[],owner:{compound:'comunicacions',kind:'radio-relay'},
          rammable:true,door:false,open:false,cx:p.x,cz:p.z};
        relays.push(relay);if(receiver)poolFor(receiver);
        if(world&&!logicalOnly)createPanel(relay);
        relay.collider.m=relay.o;relay.collider.parts=relay.o?[relay.o]:[];
        registerCollider(relay.collider);
        syncDestroyed(relay);
      }
      return relays.length;
    }
    function disable(relay,reason){
      if(!relay.operational)return false;
      relay.operational=false;relay.disabledReason=reason;
      if(relay.lamp)relay.lamp.material.color.setHex(0x7a302b);
      if(relay.cutVisual)relay.cutVisual.visible=true;
      // Already dispatched defenders retain the information they received.
      return true;
    }
    function syncDestroyed(relay){
      if(relay.collider?.hp<=0||relay.source.antennaFooting?.hp<=0)disable(relay,'destroyed');
    }
    function visibleTo(relay,p){
      if(!p)return false;
      const eye={x:p.x,y:footY(p)+1.55,z:p.z},control={x:relay.x,y:relay.y+1.6,z:relay.z};
      return clearLine(eye,control,relay.collider);
    }
    function discover(relay,context){
      if(relay.discovered)return;
      const p=playerFor(context);if(!p)return;
      if(Math.hypot(p.x-relay.x,footY(p)-relay.y,p.z-relay.z)<=DISCOVER_RANGE&&visibleTo(relay,p)){
        relay.discovered=true;
        notify(relay.operational?'Relé de ràdio descobert · Enllaç amb el quarter general.':'Relé de ràdio destruït.');
      }
    }
    function update(dt,context={}){
      if(context.active===false)return;
      time+=Math.max(0,Number.isFinite(dt)?dt:0);
      const observer=playerFor(context),visualRange=Number.isFinite(context.visualRange)?Math.max(0,context.visualRange):400;
      for(const relay of relays){
        syncDestroyed(relay);discover(relay,context);
        if(relay.o)relay.o.visible=relay.collider.hp>0&&!!observer&&
          Math.hypot(observer.x-relay.x,footY(observer)-relay.y,observer.z-relay.z)<visualRange;
      }
      for(const [unit,lease]of leases){
        if(time>=lease.until||!alive(unit)){
          leases.delete(unit);
          if(alive(unit)&&!unit.canSee&&Math.hypot((unit.lastSeenX??Infinity)-lease.destination.x,
            (unit.lastSeenZ??Infinity)-lease.destination.z)<.1)
            onRelease(unit,{...lease.destination});
        }
      }
    }
    function getAction(context={}){
      if(context.active===false||context.vehicle||!context.player)return null;
      const p=context.player;
      for(const relay of relays){
        syncDestroyed(relay);
        if(!relay.operational||Math.hypot(p.x-relay.x,p.z-relay.z)>ACTION_RANGE||
          Math.abs(footY(p)-relay.y)>2||!visibleTo(relay,p))continue;
        discover(relay,context);
        return {kind:'sabotage',label:'Sabotejar el relé de ràdio',icon:'📡',target:relay};
      }
      return null;
    }
    function interact(action,context={}){
      if(action?.kind!=='sabotage'||!relays.includes(action.target))return false;
      const current=getAction(context);
      if(!current||current.target!==action.target)return false;
      disable(action.target,'sabotage');
      notify('Relé sabotejat · Tallats els avisos al quarter general.');
      sound('pick',.45,{x:action.target.x,y:action.target.y+1.6,z:action.target.z});return true;
    }
    function destinationFor(relay,index,report){
      const receiver=relay.receiver,near=Math.hypot(report.x-receiver.x,report.z-receiver.z)<(receiver.r||100)+35;
      if(near)return {x:report.x+(index?3:-3),y:report.y,z:report.z,duration:DEFENSE_SECONDS,
        defensive:false,report:{...report}};
      const entry=entryFor(receiver),side=index?1:-1;
      const x=entry.x-entry.nx*8-entry.nz*side*5,z=entry.z-entry.nz*8+entry.nx*side*5;
      return {x,y:heightAt(x,z),z,duration:DEFENSE_SECONDS,defensive:true,report:{...report}};
    }
    function warn(witness,target,targetY,context={}){
      if(context.active===false||witness?.t!=='soldat'||!alive(witness)||witness.canSee!==true)return 0;
      const report={x:target?.x,y:targetY,z:target?.z};if(!finite(report))return 0;
      const enemies=context.enemies||[];
      if(!enemies.includes(witness))return 0;
      let dispatched=0;
      for(const relay of relays){
        syncDestroyed(relay);
        if(!relay.operational||!relay.receiver||time-relay.lastWarn<COOLDOWN||
          !relay.source.soldiers?.includes(witness)||
          Math.hypot(witness.x-relay.source.x,witness.z-relay.source.z)>(relay.source.r||100)+35)continue;
        relay.lastWarn=time;relay.lastReport=Object.freeze({...report});relay.reports++;
        const units=poolFor(relay.receiver);
        for(let i=0;i<units.length;i++){
          const unit=units[i];
          if(!alive(unit)||unit.canSee||unit.aiMode==='combat'||leases.has(unit)||!enemies.includes(unit))continue;
          const destination=destinationFor(relay,i,report);
          leases.set(unit,{until:time+DEFENSE_SECONDS,destination:{...destination}});
          onAlert(unit,{...destination,report:{...report}});relay.dispatches++;dispatched++;
        }
        if(relay.discovered&&dispatched)notify('Avís de ràdio · Guàrdies del quarter general mobilitzats.');
      }
      return dispatched;
    }
    function markers(){return relays.filter(r=>r.discovered).map(r=>({kind:'radio',id:r.id,x:r.x,z:r.z,
      label:r.operational?'Ràdio → HQ':'Ràdio desactivada',state:r.operational?'active':'disabled'}))}
    function snapshot(){return {time,activeDefenders:leases.size,relays:relays.map(r=>({
      id:r.id,x:r.x,y:r.y,z:r.z,local:{...r.local},operational:r.operational,
      disabledReason:r.disabledReason,discovered:r.discovered,sourceId:r.source.layoutId||r.source.id,
      receiverId:r.receiver?.layoutId||r.receiver?.id||null,reports:r.reports,dispatches:r.dispatches,
      lastReport:r.lastReport?{...r.lastReport}:null}))}}
    return Object.freeze({configure,reset,update,getAction,interact,warn,markers,snapshot});
  }
});
