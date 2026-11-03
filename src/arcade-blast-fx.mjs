// Hunter: Arxipèlag — model 03 (ona energètica arcade).
// FX cosmètic compartit: el càlcul de dany/col·lisió segueix al combat.
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export const ARCADE_BLAST_STYLE=Object.freeze({
  id:3,name:'Ona energètica',coreOpacity:.40,
  colorFire:Object.freeze([0xfff4b1,0xffe44e,0xffb02f,0xff6726,0xe64736]),
  colorDust:Object.freeze([0xc8ad85,0xad9980,0xe0bc88]),
  colorSmoke:Object.freeze([0x6b6870,0x777079,0x8d7e75,0x555961]),
  colorSparks:Object.freeze([0xffef8e,0xffa629,0xff6035,0xffe868]),
  colorShards:Object.freeze([0x413f45,0x6b5b4e,0x9b7056,0x897b69])
});
export function arcadeBlastKind(source){
  const weapon=typeof source==='string'?source:source?.weapon;
  // Tota detonació usa la granada per defecte. El C4 és l'única excepció.
  return weapon==='c4'?'c4':'grenade';
}
export function arcadeBlastProfile(kind,quality='desktop'){
  if(kind!=='grenade'&&kind!=='c4')return null;
  const big=kind==='c4',low=quality==='mobile',factor=low?.55:1;
  // Radi purament visual: el C4 fa ~1,7× la granada, no 3×.
  return Object.freeze({
    kind,scale:big?1.70:1,duration:big?4.4:3.1,
    fire:Math.round((big?40:29)*factor),
    smoke:Math.round((big?25:17)*factor),
    dust:Math.round((big?34:25)*factor),
    sparks:Math.round((big?65:48)*factor),
    shards:Math.round((big?32:24)*factor),
    flashDuration:big?.22:.15
  });
}
function randomGenerator(seed){
  let state=seed>>>0;
  return ()=>{
    state=(state+0x6d2b79f5)>>>0;
    let v=state;v=Math.imul(v^v>>>15,v|1);
    v^=v+Math.imul(v^v>>>7,v|61);
    return ((v^v>>>14)>>>0)/4294967296;
  };
}
export function createArcadeBlastFX(T,scene,{quality='desktop',limit=8}={}){
  const geometry={
    fire:new T.SphereGeometry(1,15,11),
    smoke:new T.SphereGeometry(1,10,8),
    dust:new T.DodecahedronGeometry(1,0),
    sparks:new T.TetrahedronGeometry(1),
    shards:new T.TetrahedronGeometry(1),
    shell:new T.SphereGeometry(1,24,16),
    ring:new T.RingGeometry(.91,1,48)
  };
  const up=new T.Vector3(0,1,0),vec=new T.Vector3(),dummy=new T.Object3D();
  const groups=[],max=Math.max(1,Math.min(12,Math.floor(limit)));
  const maxCount={};
  for(const key of ['fire','smoke','dust','sparks','shards']){
    maxCount[key]=Math.max(arcadeBlastProfile('grenade',quality)[key],arcadeBlastProfile('c4',quality)[key]);
  }
  let sequence=0;
  const scaleColor={
    fire:ARCADE_BLAST_STYLE.colorFire,
    smoke:ARCADE_BLAST_STYLE.colorSmoke,
    dust:ARCADE_BLAST_STYLE.colorDust,
    sparks:ARCADE_BLAST_STYLE.colorSparks,
    shards:ARCADE_BLAST_STYLE.colorShards
  };
  function makeGroup(){
    const root=new T.Group();
    root.visible=false;scene.add(root);
    const batches={};
    for(const kind of ['fire','smoke','dust','sparks','shards']){
      const material=new T.MeshBasicMaterial({
        color:0xffffff,transparent:true,opacity:.5,
        depthWrite:false,depthTest:true,side:T.DoubleSide,
        blending:kind==='sparks'?T.AdditiveBlending:T.NormalBlending
      });
      const mesh=new T.InstancedMesh(geometry[kind],material,maxCount[kind]);
      mesh.frustumCulled=false;
      mesh.count=0;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.renderOrder=kind==='smoke'?5:kind==='fire'?6:kind==='dust'?7:8;
      root.add(mesh);batches[kind]={mesh,material,items:[]};
    }
    const fadeMaterial=(color,additive=false)=>new T.MeshBasicMaterial({
      color,transparent:true,opacity:0,depthWrite:false,depthTest:true,
      side:T.DoubleSide,blending:additive?T.AdditiveBlending:T.NormalBlending
    });
    const shell=new T.Mesh(geometry.shell,fadeMaterial(0xffdc76));
    shell.renderOrder=4;root.add(shell);
    const ring=new T.Mesh(geometry.ring,fadeMaterial(0xffed95,true));
    ring.rotation.x=-Math.PI/2;ring.position.y=.08;ring.renderOrder=9;root.add(ring);
    const ring2=new T.Mesh(geometry.ring,fadeMaterial(0xffaa41,true));
    ring2.rotation.x=-Math.PI/2;ring2.position.y=.11;ring2.renderOrder=9;root.add(ring2);
    const flash=new T.Mesh(geometry.shell,fadeMaterial(0xfff7c1,true));
    flash.renderOrder=10;root.add(flash);
    // Màxim vuit flaixos locals; la simulació no transporta llums per xarxa.
    const light=new T.PointLight(0xffa64c,0,22);
    root.add(light);
    const g={root,batches,shell,ring,ring2,flash,light,age:100,profile:null};
    groups.push(g);return g;
  }
  function prepare(g,at,profile,seed){
    const rand=randomGenerator(seed),scale=profile.scale;
    g.root.position.set(at.x,at.y,at.z);
    g.root.visible=true;g.age=0;g.profile=profile;
    for(const [kind,b] of Object.entries(g.batches)){
      const n=profile[kind];b.mesh.count=n;b.mesh.visible=n>0;
      const items=b.items;items.length=0;
      const palette=scaleColor[kind];
      for(let i=0;i<n;i++){
        const a=rand()*Math.PI*2,
          elevation=kind==='dust'?rand()*.20:.07+rand()*1.19,
          dx=Math.cos(a)*Math.cos(elevation),dy=Math.sin(elevation),
          dz=Math.sin(a)*Math.cos(elevation);
        const speed=kind==='fire'?1.5+rand()*2.5:
          kind==='smoke'?.6+rand()*1.4:
          kind==='dust'?2.5+rand()*2.7:
          kind==='sparks'?4.5+rand()*5.5:3+rand()*4.5;
        const radius=kind==='smoke'?.33:kind==='dust'?.45:.20;
        const born=kind==='smoke'?.18+rand()*.36:
          kind==='dust'?.06+rand()*.16:rand()*.16;
        const life=(kind==='fire'?.39+rand()*.45:
          kind==='smoke'?1.5+rand()*1.2:
          kind==='dust'?.7+rand()*.6:
          kind==='sparks'?.33+rand()*.65:.7+rand()*.6)*(profile.kind==='c4'?1.32:1);
        const size=(kind==='fire'?.29+rand()*.33:
          kind==='smoke'?.29+rand()*.36:
          kind==='dust'?.17+rand()*.20:
          kind==='sparks'?.035+rand()*.065:.08+rand()*.16)*scale;
        items.push({dx,dy,dz,speed:speed*scale,
          x:(rand()-.5)*radius,y:kind==='dust'?.15+rand()*.20:.55+rand()*.85,
          z:(rand()-.5)*radius,born,life,size,spin:rand()*Math.PI*2});
        b.mesh.setColorAt(i,new T.Color(palette[Math.floor(rand()*palette.length)]));
      }
      if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;
    }
    return g;
  }
  function emit(x,y,z,source,seed){
    const kind=arcadeBlastKind(source);
    const profile=arcadeBlastProfile(kind,quality);
    if(!profile||![x,y,z].every(Number.isFinite))return false;
    const position={x,y,z};
    const g=groups.find(g=>!g.root.visible)||
      (groups.length<max?makeGroup():groups.reduce((a,b)=>a.age>b.age?a:b));
    const derived=Number.isFinite(seed)?seed:
      (Math.imul((Math.round(x*13)^Math.round(z*19))|0,1103515245)+Math.imul(++sequence,12345))>>>0;
    prepare(g,position,profile,derived);
    return true;
  }
  function update(dt){
    if(!(dt>0))return;
    for(const g of groups){
      if(!g.root.visible)continue;
      const p=g.profile,t=g.age+=Math.min(dt,.075);
      if(t>=p.duration){g.root.visible=false;continue;}
      for(const [kind,b] of Object.entries(g.batches)){
        const items=b.items,mesh=b.mesh;
        b.material.opacity=kind==='fire'?.40*Math.max(.06,1-Math.max(0,t-.55)/(.75*p.scale)):
          kind==='smoke'?.30*Math.max(.04,1-Math.max(0,t-1.6)/(1.65*p.scale)):
          kind==='dust'?.49*Math.max(.04,1-Math.max(0,t-.6)/(1.05*p.scale)):
          kind==='sparks'?.92:.84;
        for(let i=0;i<items.length;i++){
          const v=items[i],age=t-v.born,q=clamp(age/v.life,0,1);
          if(age<0||age>=v.life){
            dummy.position.set(0,-999,0);dummy.scale.setScalar(.00001);dummy.quaternion.identity();
          }else{
            const drag=kind==='smoke'?.55:kind==='fire'?.55:kind==='dust'?.8:1;
            const distance=age*v.speed*drag;
            let x=v.x+v.dx*distance,y=v.y+v.dy*distance,z=v.z+v.dz*distance;
            if(kind==='sparks'||kind==='shards')y-=4.1*age*age;
            else if(kind==='dust')y=.12+age*.24;
            else if(kind==='smoke')y+=age*age*.4;
            else if(kind==='fire'){x+=Math.sin(v.spin+age*5)*.14;z+=Math.cos(v.spin+age*5)*.14;}
            y=Math.max(.07,y);
            dummy.position.set(x,y,z);
            const expansion=kind==='fire'?.28+1.35*Math.sin(q*Math.PI):
              kind==='smoke'?.34+q*2.35:
              kind==='dust'?.55+q*1.6:
              kind==='sparks'?Math.max(.1,1-q):Math.max(.1,1-q*.6);
            const size=v.size*Math.max(.01,expansion);
            dummy.scale.setScalar(size);
            if(kind==='sparks'){
              // Estel radial petit, no una esfera flotant.
              dummy.scale.set(size*.55,size*2.8,size*.55);
              vec.set(v.dx,v.dy,v.dz);dummy.quaternion.setFromUnitVectors(up,vec);
            }else{
              dummy.rotation.set(v.spin+age*.7,v.spin+age*.9,age*.8);
              dummy.quaternion.setFromEuler(dummy.rotation);
            }
          }
          dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate=true;
      }
      const flashQ=clamp(t/p.flashDuration,0,1);
      g.flash.visible=flashQ<1;
      g.flash.position.set(0,.95*p.scale,0);
      g.flash.scale.setScalar((.1+flashQ*2.1)*p.scale);
      g.flash.material.opacity=(1-flashQ)*.85;
      // Model 3: pell esfèrica de baixa opacitat; no tapa parets i portes.
      const wave=clamp((t-.07)/(p.kind==='c4'?1.05:.79),0,1);
      g.shell.visible=t>.07&&wave<1;
      g.shell.position.set(0,p.scale,0);
      g.shell.scale.setScalar((.22+wave*3.5)*p.scale);
      g.shell.material.opacity=.25*(1-wave);
      const ringQ=clamp((t-.08)/(p.kind==='c4'?1.0:.7),0,1);
      g.ring.visible=t>.08&&ringQ<1;
      g.ring.scale.setScalar((.28+ringQ*4.5)*p.scale);
      g.ring.material.opacity=.76*(1-ringQ);
      const delay=p.kind==='c4'?.32:.16;
      const q2=clamp((t-delay)/(p.kind==='c4'?1.10:.61),0,1);
      g.ring2.visible=t>delay&&q2<1;
      g.ring2.scale.setScalar((.24+q2*4.1)*p.scale);
      g.ring2.material.opacity=.42*(1-q2);
      g.light.position.set(0,1.3*p.scale,0);
      g.light.intensity=t<.4?Math.sin(t/.4*Math.PI)*5*p.scale:0;
    }
  }
  function clear(){for(const g of groups)g.root.visible=false;}
  function dispose(){
    for(const g of groups){
      scene.remove(g.root);
      for(const b of Object.values(g.batches))b.material.dispose();
      for(const obj of [g.shell,g.ring,g.ring2,g.flash])obj.material.dispose();
    }
    groups.length=0;
    Object.values(geometry).forEach(g=>g.dispose());
  }
  return {scene,emit,update,clear,dispose,get active(){return groups.filter(g=>g.root.visible).length}};
}
