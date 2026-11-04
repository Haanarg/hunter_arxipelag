// Esteles i esquitxos agrupats en només quatre malles instanciades.
// El sistema és visual i no consumeix mai el RNG de generació d'illes.
window.HUNTER_MOVEMENT_FX=Object.freeze({
 create(T,{scene,quality='desktop',waveModel,waterTime,waterBed}){
   const settings={
     // Enemics: distàncies LOD pròpies segons qualitat, sense més draw calls.
     desktop:{wake:210,ripple:64,air:155,smoke:105,range:250,enemyRange:240,spacing:1},
     mobile:{wake:110,ripple:40,air:86,smoke:64,range:185,enemyRange:160,spacing:1.35},
     ultra:{wake:60,ripple:24,air:48,smoke:36,range:140,enemyRange:95,spacing:1.9}
   }[quality]||{wake:210,ripple:64,air:155,smoke:105,range:250,enemyRange:200,spacing:1};
   const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=Math.random,
     dummy=new T.Object3D(),face=new T.Quaternion(),color=new T.Color();
   const stats={
     emitted:{wake:0,ripple:0,air:0,smoke:0},
     active:{wake:0,ripple:0,air:0,smoke:0},
     steps:0,droplets:0,landTrails:0,waterTrails:0,downwash:0,
     drawMeshes:0,resets:0,quality
   };
   let waterVisible=true,previousFootBucket=null,previousSwimBucket=null;
   const groups={};
   function pool(name,capacity,flat){
     const geometry=new T.PlaneGeometry(1,1);
     if(flat)geometry.rotateX(-Math.PI/2);
     const alpha=new T.InstancedBufferAttribute(new Float32Array(capacity),1),
       tint=new T.InstancedBufferAttribute(new Float32Array(capacity*3),3),
       seabed=new T.InstancedBufferAttribute(new Float32Array(capacity),1);
     for(const attr of [alpha,tint,seabed])attr.setUsage(T.DynamicDrawUsage);
     geometry.setAttribute('fxAlpha',alpha);
     geometry.setAttribute('fxTint',tint);
     geometry.setAttribute('fxBed',seabed);
     const material=new T.ShaderMaterial({
       uniforms:{time:waterTime},transparent:true,depthWrite:false,
       side:T.DoubleSide,
       vertexShader:[
         'uniform float time;',
         'attribute float fxAlpha,fxBed;',
         'attribute vec3 fxTint;',
         'varying vec2 uvFX;varying vec3 tintFX;varying float alphaFX;',
         waveModel.glsl,
         'void main(){',
         '  vec4 p=instanceMatrix*vec4(position,1.);',
         flat?'  p.y+=hunterWaveHeight(p.xz,time,fxBed);':'',
         '  uvFX=uv;tintFX=fxTint;alphaFX=fxAlpha;',
         '  gl_Position=projectionMatrix*modelViewMatrix*p;',
         '}'
       ].join('\n'),
       fragmentShader:[
         'varying vec2 uvFX;varying vec3 tintFX;varying float alphaFX;',
         'void main(){',
         '  vec2 q=(uvFX-.5)*2.;float dist=length(q);',
         name==='ripple'
           ?'  float shape=smoothstep(.38,.6,dist)*(1.-smoothstep(.76,.98,dist));'
           :name==='wake'
             ?'  float shape=pow(max(0.,1.-dist*dist),1.9)*(.76+.12*sin(q.x*19.)+.12*cos(q.y*17.));'
             :'  float shape=pow(max(0.,1.-dist*dist),2.15);',
         '  float a=clamp(shape*alphaFX,0.,.80);',
         '  if(a<.008)discard;',
         '  gl_FragColor=vec4(tintFX,a);',
         '#include <tonemapping_fragment>',
         '#include <colorspace_fragment>',
         '}'
       ].join('\n')
     });
     const mesh=new T.InstancedMesh(geometry,material,capacity);
     mesh.name='hunter-motion-'+name;
     mesh.renderOrder=flat?4:5;
     mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
     mesh.frustumCulled=false;mesh.count=0;mesh.visible=false;
     scene.add(mesh);
     groups[name]={mesh,geometry,material,alpha,tint,seabed,
       flat,capacity,particles:[]};
   }
   pool('wake',settings.wake,true);
   pool('ripple',settings.ripple,true);
   pool('air',settings.air,false);
   pool('smoke',settings.smoke,false);
   function emit(kind,p){
     if(!waterVisible&&(kind==='wake'||kind==='ripple'))return false;
     const g=groups[kind];if(!g)return false;
     const list=g.particles;
     if(list.length>=g.capacity)list.shift();
     color.setHex(p.color??0xffffff);
     list.push({
       x:p.x,z:p.z,y:p.y||0,vx:p.vx||0,vz:p.vz||0,vy:p.vy||0,
       width:p.width??1,length:p.length??p.width??1,
       heading:p.heading||0,bed:p.bed??(g.flat?waterBed(p.x,p.z):0),
       age:0,life:p.life??1.2,alpha:p.alpha??.7,
       growth:p.growth??1.4,gravity:p.gravity||0,ground:p.ground??-Infinity,
       cr:color.r,cg:color.g,cb:color.b
     });
     stats.emitted[kind]++;return true;
   }
   function footstep(x,z,depth,side=1){
     if(depth<.15||depth>2.15||!waterVisible)return false;
     const bed=waterBed(x,z),power=clamp(depth/1.25,.3,1);
     emit('ripple',{x,z,y:.12,bed,width:1.6+power*.7,
       length:1.35+power*.6,life:1.04,alpha:.72,growth:1.9,color:0xdbf9fa});
     const surface=waveModel.height(x,z,waterTime.value,bed);
     for(let i=0;i<3;i++){
       const angle=(i+.18*rand())*Math.PI*2/3+side*.75,
         speed=1.3+power*2+rand()*.7;
       emit('air',{x:x+Math.cos(angle)*.09,z:z+Math.sin(angle)*.09,
         y:surface+.22,bed,
         vx:Math.cos(angle)*speed*.44,vz:Math.sin(angle)*speed*.44,
         vy:1.7+power*1.6+rand()*.5,gravity:8,
         ground:surface+.02,
         width:.08+power*.075,life:.6,
         alpha:.94,growth:.45,color:0xcdf7ff});
       stats.droplets++;
     }
     stats.steps++;return true;
   }
   function playerStep({phase,x,z,heading,moving,swimming,inVehicle,falling,surfaceAt,groundAt}){
     const bucket=Math.floor(phase/Math.PI);
     if(previousFootBucket===null){previousFootBucket=bucket;return false}
     if(bucket===previousFootBucket)return false;
     previousFootBucket=bucket;
     if(!moving||swimming||inVehicle||falling)return false;
     const side=bucket%2?1:-1,
       px=x+Math.cos(heading)*side*.32-Math.sin(heading)*.24,
       pz=z-Math.sin(heading)*side*.32-Math.cos(heading)*.24;
     return footstep(px,pz,surfaceAt(px,pz)-groundAt(px,pz),side);
   }
   function swimStroke({phase,x,z,heading,swimming,crawling,moving,surfaceAt}){
     const bucket=Math.floor((phase+Math.PI/2)/Math.PI);
     if(!swimming||!crawling||!moving||!waterVisible){previousSwimBucket=null;return false}
     if(previousSwimBucket===null){previousSwimBucket=bucket;return false}
     if(bucket===previousSwimBucket)return false;
     previousSwimBucket=bucket;
     // Alternam braços: esquitx visible a banda i banda al llarg del crol.
     const side=bucket%2?1:-1,rx=Math.cos(heading),rz=-Math.sin(heading),
       fx=-Math.sin(heading),fz=-Math.cos(heading);
     for(const s of [-1,1]){
       const x0=x+rx*s*.72+fx*.45,z0=z+rz*s*.72+fz*.45,
         surface=surfaceAt(x0,z0),bed=waterBed(x0,z0),power=s===side?1:.67;
       emit('ripple',{x:x0,z:z0,y:.13,bed,width:1.35*power,length:1.75*power,
         life:.75,alpha:.75,growth:1.9,color:0xd7f7ff});
       for(let i=0;i<4;i++){
         const spread=(i-1.5)*.32,speed=1.5+i*.23;
         emit('air',{x:x0+spread*fx,z:z0+spread*fz,y:surface+.12,bed,
           vx:rx*s*speed+fx*.55,vz:rz*s*speed+fz*.55,
           vy:(2.2+i*.29)*power,gravity:9,ground:surface+.03,
           width:.10+power*.045,life:.54,alpha:.9,growth:.28,color:0xd8f8ff});
         stats.droplets++;
       }
     }
     return true;
   }
   function boatTrail(v,speed,back,width){
     const s=Math.sin(v.hd),c=Math.cos(v.hd),turn=clamp(v.yawRate||0,-2,2),
       spread=width*(1+Math.min(.4,Math.abs(turn)*.2)),
       lifetime=1.8+Math.min(1.7,speed/22);
     for(const side of [-1,1]){
       const x=v.x+s*back+side*c*spread,z=v.z+c*back-side*s*spread;
       emit('wake',{x,z,y:.10,
         vx:s*speed*.07+side*c*(.65+speed*.025),
         vz:c*speed*.07-side*s*(.65+speed*.025),
         heading:v.hd,width:.6+width*.28+speed*.02,
         length:1.5+speed*.12,life:lifetime,
         alpha:.68,growth:1.6,bed:waterBed(x,z),
         color:side>0?0xc5eff2:0xe2f9fa});
     }
     if(speed>11){
       const x=v.x+s*back,z=v.z+c*back;
       emit('wake',{x,z,y:.10,vx:s*speed*.035,vz:c*speed*.035,
         heading:v.hd,width:width*.7+1,length:2.3+speed*.14,
         life:1.4,alpha:.52,growth:1.5,color:0xe8faf6});
     }
     stats.waterTrails++;
   }
   const landWidths={bici:.43,moto:.49,cotxe:1.08,camio:1.8,
     tanc:2.15,tanqueta:1.55};
   const waterWidths={barca_rems:.55,windsurf:.4,moto_aquatica:.65,
     llanxa:1.65,llanxa_coets:1.85,hover:1.45,ferry:4.4};
   const backs={barca_rems:1.5,windsurf:1.4,moto_aquatica:1.55,
     llanxa:3.3,llanxa_coets:3.7,hover:2.3,ferry:7.5,
     bici:1.1,moto:1.1,cotxe:2.05,camio:3.35,tanc:3.3,tanqueta:2.5};
   function landTrail(v,speed,back,ground,type=v.t){
     const s=Math.sin(v.hd),c=Math.cos(v.hd),width=landWidths[type]||1,
       bike=type==='bici',heavy=['tanc','tanqueta','camio'].includes(type),
       density=clamp((speed-3)/22,.16,.8)*(bike?.42:1);
     for(const side of [-1,1]){
       const x=v.x+s*back+side*c*width,z=v.z+c*back-side*s*width;
       emit('air',{x,z,y:ground+.22,
         vx:s*speed*.07+side*c*.52,vz:c*speed*.07-side*s*.52,
         vy:.25,life:heavy?1.75:1.32,
         width:.7+speed*.025+(heavy?.45:0),
         color:heavy?0xada296:0xc4b39b,alpha:density,growth:2.1});
     }
     // Escapament: mai a la bicicleta, més dens en camions i blindats.
     if(!bike){
       const x=v.x+s*back,z=v.z+c*back;
       emit('smoke',{x,z,y:ground+(heavy?1.65:.9),
         vx:s*speed*.11,vz:c*speed*.11,vy:.42,
         width:heavy?.7:.37,life:1.16+speed*.014,
         color:heavy?0x666660:0x94908a,alpha:heavy?.48:.3,growth:1.65});
     }
     stats.landTrails++;
   }
   function rotorDownwash(v,dt,terrain,waterY){
     const limit=v.t==='heli_combat'?15:13,
       height=v.alt-Math.max(terrain,waterY),
       intensity=clamp((limit-height)/limit,0,1);
     if(intensity<=.01)return;
     v.fxRotorAccum=(v.fxRotorAccum||0)+dt;
     const delay=(quality==='desktop'?.10:.16)/Math.max(.35,intensity);
     if(v.fxRotorAccum<delay)return;
     v.fxRotorAccum%=delay;
     const overSea=terrain<waterY-.3,count=quality==='ultra'?2:3;
     for(let i=0;i<count;i++){
       const angle=(i+rand()*.45)*Math.PI*2/count+v.hd,
         radius=2+rand()*3.4,
         x=v.x+Math.cos(angle)*radius,z=v.z+Math.sin(angle)*radius,
         vx=Math.cos(angle)*(3+intensity*5),vz=Math.sin(angle)*(3+intensity*5);
       if(overSea){
         emit('wake',{x,z,y:.12,vx,vz,width:1.5+intensity*1.4,
           length:1.7+intensity*1.5,life:.95,alpha:intensity*.49,
           growth:1.7,color:0xe5f8ff});
       }else{
         emit('air',{x,z,y:terrain+.24,vx,vz,vy:.5+intensity*.5,
           life:1.1+intensity*.65,width:1.7+intensity*1.7,
           alpha:intensity*.36,color:0xb4a58d,growth:2.5});
       }
     }
     stats.downwash++;
   }
   function vehicle(v,dt,{playerX,playerZ,playerVehicle=null,terrainAt,waterAt,enemy=false}){
     if(v.destroyed||v.crashing||v.carrier)return;
     // Jeep i patrullera comparteixen el model visual del cotxe i la llanxa.
     const type=enemy?(v.t==='jeep'?'cotxe':
       v.t==='patrulla_marina'?'llanxa':v.t):v.t;
     const dx=v.x-playerX,dz=v.z-playerZ,
       range=enemy?settings.enemyRange:settings.range,
       near=dx*dx+dz*dz<range*range,
       prevX=v.fxPrevX,prevZ=v.fxPrevZ;
     // Sempre actualitzam la posició per evitar esteles gegants al
     // tornar a entrar dins la distància visible.
     v.fxPrevX=v.x;v.fxPrevZ=v.z;
     const distance=prevX==null?0:Math.hypot(v.x-prevX,v.z-prevZ),
       moved=distance<28?Math.min(distance,4):0,
       // Els hostils no exposen velocitat 'v': feim servir el seu
       // desplaçament real (així no hi ha fum si queden encallats).
       speed=enemy?(dt>.0001&&distance<28?distance/dt:0):Math.abs(v.v||0);
     if(!near){if(enemy)v.fxTrailDist=0;return}
     const terrain=terrainAt(v.x,v.z),water=waterAt(v.x,v.z),
       mode=window.HUNTER_VEHICLE_DYNAMICS.types[type]?.m;
     if(mode==='a'){
       if(v===playerVehicle||(enemy&&speed>.5))
         rotorDownwash(v,dt,terrain,water);
       return;
     }
     const watery=mode==='w'||(mode==='wl'&&water>terrain+.6);
     if(watery&&!waterVisible)return;
     if(speed<(watery?2.2:4)||moved<.04)return;
     const spacing=(watery?2.8:2.1)*settings.spacing;
     v.fxTrailDist=(v.fxTrailDist||0)+moved;
     if(v.fxTrailDist<spacing)return;
     v.fxTrailDist%=spacing;
     const back=(backs[type]||2)*(enemy||v.v>=0?1:-1);
     if(watery)boatTrail(v,speed,back,waterWidths[type]||1);
     else landTrail(v,speed,back,terrain,type);
   }
   function damageSmoke(v,damage,y,sourceX=v.x,sourceZ=v.z){
     const dark=damage>.65?0x2b2b2c:0x696966,
       width=.35+damage*.55;
     for(let i=0;i<(damage>.65?2:1);i++)
       emit('smoke',{x:sourceX+(rand()-.5)*.9,
         z:sourceZ+(rand()-.5)*.9,y:y+(rand()-.5)*.24,
         vx:(rand()-.5)*1.2,vz:(rand()-.5)*1.2,
         vy:1.1+damage*1.35,width,life:1.65+damage*.85,
         alpha:.46+damage*.29,growth:2.5,color:dark});
   }
   function update(dt,camera){
     if(camera)face.copy(camera.quaternion);
     let draws=0;
     for(const [kind,group] of Object.entries(groups)){
       const live=group.particles,alphas=group.alpha.array,
         colors=group.tint.array,beds=group.seabed.array;
       let count=0;
       for(let i=0;i<live.length;i++){
         const p=live[i];p.age+=dt;
         if(p.age>=p.life)continue;
         const progress=p.age/p.life;
         p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
         p.vy-=p.gravity*dt;
         if(p.gravity&&p.y<p.ground)continue;
         const size=1+p.growth*progress;
         dummy.position.set(p.x,p.y,p.z);
         if(group.flat)dummy.rotation.set(0,p.heading,0);
         else dummy.quaternion.copy(face);
         if(group.flat)dummy.scale.set(p.width*size,1,p.length*size);
         else dummy.scale.set(p.width*size,p.length*size,1);
         dummy.updateMatrix();
         group.mesh.setMatrixAt(count,dummy.matrix);
         alphas[count]=p.alpha*Math.pow(1-progress,1.25);
         colors[count*3]=p.cr;colors[count*3+1]=p.cg;colors[count*3+2]=p.cb;
         beds[count]=p.bed;live[count]=p;count++;
       }
       live.length=count;group.mesh.count=count;
       group.mesh.visible=count>0&&(waterVisible||!group.flat);
       stats.active[kind]=count;
       if(count){
         group.mesh.instanceMatrix.needsUpdate=true;
         group.alpha.needsUpdate=true;group.tint.needsUpdate=true;
         group.seabed.needsUpdate=true;
         if(group.mesh.visible)draws++;
       }
     }
     stats.drawMeshes=draws;
   }
   function setWaterVisible(value){
     waterVisible=!!value;
     for(const kind of ['wake','ripple'])
       groups[kind].mesh.visible=waterVisible&&groups[kind].particles.length>0;
   }
   function reset(){
     previousFootBucket=null;previousSwimBucket=null;
     for(const [name,group] of Object.entries(groups)){
       group.particles.length=0;group.mesh.count=0;group.mesh.visible=false;
       stats.active[name]=0;
     }
     stats.drawMeshes=0;stats.resets++;
   }
   function dispose(){
     for(const group of Object.values(groups)){
       scene.remove(group.mesh);group.geometry.dispose();group.material.dispose();
     }
   }
   return{stats,groups,emit,footstep,playerStep,swimStroke,vehicle,damageSmoke,update,
     setWaterVisible,reset,dispose};
 }
});
