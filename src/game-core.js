window.addEventListener("error",e=>{const p=document.getElementById("ini");if(p&&p.style.display!=="none"){const esc=v=>String(v||"").replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c])),m=(e&&e.message)?e.message:"Error desconegut",where=e&&e.filename?(e.filename.split("/").pop()+":"+e.lineno+":"+e.colno):"",stack=e&&e.error&&e.error.stack?e.error.stack:"";p.innerHTML="<h1>No s’ha pogut iniciar el joc</h1><p style=\"max-width:560px\">Error d’arrencada: <b>"+esc(m)+"</b></p>"+(where?"<p><b>"+esc(where)+"</b></p>":"")+(stack?"<pre style=\"max-width:90vw;white-space:pre-wrap;text-align:left;font-size:11px;opacity:.8\">"+esc(stack)+"</pre>":"")+"<p style=\"opacity:.8\">Envia una captura d’aquest missatge si persisteix.</p>"}});
const requiredModules=['HUNTER_VISUAL_CONFIG','HUNTER_MATERIALS','HUNTER_PALETTE','HUNTER_WATER','HUNTER_RENDERING','HUNTER_WATER_SYSTEM','HUNTER_WAVES','HUNTER_TERRAIN','HUNTER_VEHICLES','HUNTER_VEHICLE_DYNAMICS','HUNTER_JOYSTICK','HUNTER_RIDER','HUNTER_VEGETATION','HUNTER_BUILDINGS','HUNTER_CHARACTERS','HUNTER_FAUNA','HUNTER_MINIMAP','HUNTER_UI'];
const missingModules=requiredModules.filter(name=>!window[name]);if(missingModules.length)throw new Error('Mòduls Hunter absents: '+missingModules.join(', '));
const missingSystems=Object.entries({generation:typeof build,combat:typeof fire,enemies:typeof updEn,audio:typeof initAudio}).filter(([,type])=>type!=='function').map(([name])=>name);if(missingSystems.length)throw new Error('Sistemes Hunter absents: '+missingSystems.join(', '));
let MAP_SCALE=1,S=4800,H=S/2;const SEG=400,vivid=c=>{const k=new THREE.Color(c),h={};k.getHSL(h);return k.setHSL(h.h,Math.min(1,h.s*1.5),h.l)};
const materialProfile=(name='organic')=>window.HUNTER_MATERIALS[name]||window.HUNTER_MATERIALS.organic;
const M=(c,profile='organic')=>new THREE.MeshStandardMaterial({color:vivid(c),flatShading:true,...materialProfile(profile)});
const MAT={
 terrain:()=>new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,...materialProfile('terrain')}),
 painted:c=>M(c,'paint'),metal:c=>M(c,'metal'),rubber:c=>M(c,'rubber'),glass:c=>M(c,'glass'),masonry:c=>M(c,'masonry')
};
let seed,R,islands,A,Bi,world,B=[],requestedSeed=null;
const seedFromText=v=>{v=String(v??'').trim();if(/^-?\d+$/.test(v))return Number(v)>>>0;let h=2166136261>>>0;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const hash=(x,y)=>{const h=Math.sin(x*127.1+y*311.7+seed*.001)*43758.5453;return h-Math.floor(h)};
function vn(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
return hash(ix,iy)*(1-u)*(1-v)+hash(ix+1,iy)*u*(1-v)+hash(ix,iy+1)*(1-u)*v+hash(ix+1,iy+1)*u*v}
const fbm=(x,y)=>vn(x,y)*.5+vn(x*2,y*2)*.25+vn(x*4,y*4)*.125+vn(x*8,y*8)*.0625;
function rawHAt(x,z){let m=-1;for(const i of islands)m=Math.max(m,1-Math.hypot(x-i.x,z-i.z)/i.r);
let h=(m-.25+.6*(fbm(x/520,z/520)-.47))*45;const e=Math.max(Math.abs(x),Math.abs(z));
if(e>H-120)h=Math.min(h,-4-(e-(H-120))*.05);
if(h>=-1.5)return h;
const depth=-h-1.5;return -1.5-Math.min(72,depth*depth*2.8+depth*.8)}
let terrainLevels=[];
const smooth01=t=>t*t*(3-2*t);
const addLevelArea=(x,z,w,d,y,rot=0,blend=12)=>{terrainLevels.push({x,z,hw:w/2,hd:d/2,y,rot,c:Math.cos(rot),s:Math.sin(rot),blend})};
function hAt(x,z){let h=rawHAt(x,z);for(const m of terrainLevels){const dx=x-m.x,dz=z-m.z,lx=dx*m.c+dz*m.s,lz=-dx*m.s+dz*m.c,ox=Math.max(0,Math.abs(lx)-m.hw),oz=Math.max(0,Math.abs(lz)-m.hd),out=Math.hypot(ox,oz);if(out<m.blend){const k=out<=0?1:1-smooth01(out/m.blend);h=h+(m.y-h)*k}}return h}
const waveAmp=window.HUNTER_WAVES.amplitude;
const wy=(x,z,t)=>water.surfaceHeight(x,z,t);
const rr=(a,b)=>a+R()*(b-a);
function genIslands(){R=mul(seed);const q=R()<.5?-1:1,q2=R()<.5?-1:1,extent=MAP_SCALE===1?1000:2200,baseMin=MAP_SCALE===1?500:1200,baseMax=MAP_SCALE===1?800:1800;
A={x:-q*rr(baseMin,baseMax)*2,z:-q2*rr(baseMin,baseMax)*2,r:rr(520,680)};Bi={x:q*rr(baseMin,baseMax)*2,z:q2*rr(baseMin,baseMax)*2,r:rr(520,680)};
islands=[A,Bi];const regular=22*MAP_SCALE*MAP_SCALE,large=2*MAP_SCALE*MAP_SCALE;
for(let i=0;i<regular;i++)islands.push({x:rr(-extent,extent)*2,z:rr(-extent,extent)*2,r:rr(180,520)});
for(let i=0;i<large;i++)islands.push({x:rr(-extent*.55,extent*.55)*2,z:rr(-extent*.55,extent*.55)*2,r:rr(800,1040)})}
const slope=(x,z,h)=>Math.abs(hAt(x+5,z)-h)+Math.abs(hAt(x,z+5)-h);
function land(i,n=600,fl){for(let k=0;k<n;k++){const a=R()*6.283,d=R()*i.r*.75,x=i.x+Math.cos(a)*d,z=i.z+Math.sin(a)*d,h=hAt(x,z);
if(h>3&&h<14&&slope(x,z,h)<2.5&&(!fl||fr(x,z)<2.2)&&!B.some(b=>Math.abs(b.x-x)<b.hw+24&&Math.abs(b.z-z)<b.hd+24)&&!treeHit(x,z,3)&&Math.abs(x)<H-150&&Math.abs(z)<H-150)return{x,z,h}}return null}
// escena
const coarse=matchMedia('(pointer:coarse)').matches;
const qualityName=coarse?'mobile':'desktop';
const visualQuality=window.HUNTER_VISUAL_CONFIG[qualityName];
const rendering=window.HUNTER_RENDERING.create(THREE,visualQuality);
const ren=rendering.renderer,scene=rendering.scene,cam=rendering.camera,sunDir=rendering.sunDir,sun=rendering.sun,sky=rendering.sky,sunM=rendering.sunMesh;
document.body.prepend(ren.domElement);
const rs=rendering.resize;addEventListener('resize',rs);rs();
const water=window.HUNTER_WATER_SYSTEM.create(THREE,{scene,sunDir,size:9600,segments:visualQuality.waterSegments,heightAt:hAt,config:window.HUNTER_WATER});
const waterMat=water.material,waterUniforms=water.uniforms;
const updateSeabed=()=>water.setWorldSize(S);
const waves=water.update;
// terreny visual a src/terrain.js
let stairs=[],piers=[];
let Wl=[],Dr=[],items=[],inv={},msg='',msgT=0,HQ=null,ib=null;
const ICON={
med:'<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="16" width="46" height="34" rx="5" fill="#fff" stroke="#657078" stroke-width="3"/><rect x="18" y="28" width="28" height="9" rx="4.5" fill="#d7ae7c" transform="rotate(-28 32 32.5)"/><circle cx="27" cy="35" r="1.8" fill="#9a6f45"/><circle cx="37" cy="30" r="1.8" fill="#9a6f45"/></svg>',
expl:'<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#6c1717" stroke-width="2"><rect x="12" y="20" width="11" height="31" rx="5" fill="#d63b32"/><rect x="26" y="18" width="11" height="33" rx="5" fill="#d63b32"/><rect x="40" y="21" width="11" height="30" rx="5" fill="#d63b32"/></g><path d="M32 18 C34 9 46 13 48 5" fill="none" stroke="#c49a4d" stroke-width="3"/><circle cx="49" cy="5" r="3" fill="#ffcf4a"/></svg>',
disf:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 12 L30 17 L34 17 L42 12 L54 22 L47 30 L43 27 L43 55 L21 55 L21 27 L17 30 L10 22 Z" fill="#b83232" stroke="#661d1d" stroke-width="3"/><path d="M28 16 Q32 23 36 16" fill="none" stroke="#f0c7a2" stroke-width="3"/></svg>',
mapa:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 13 L25 9 L39 14 L56 10 L56 51 L39 55 L25 50 L8 54 Z" fill="#ead69b" stroke="#7c693c" stroke-width="3"/><path d="M25 9 V50 M39 14 V55" stroke="#a18b56" stroke-width="2"/><rect x="30" y="28" width="15" height="11" fill="#7c4f3a"/><path d="M29 28 L37.5 21 L46 28" fill="#a33b32"/></svg>',
mapa_heli:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 13 L25 9 L39 14 L56 10 L56 51 L39 55 L25 50 L8 54 Z" fill="#d9edf5" stroke="#557986" stroke-width="3"/><path d="M17 33 H49 M32 20 V46" stroke="#557986" stroke-width="2"/><ellipse cx="32" cy="33" rx="11" ry="5" fill="#587766"/><path d="M43 33 H54 M21 33 H10" stroke="#35453c" stroke-width="3"/></svg>',
mapa_tanc:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 13 L25 9 L39 14 L56 10 L56 51 L39 55 L25 50 L8 54 Z" fill="#e5d6a8" stroke="#786b46" stroke-width="3"/><rect x="18" y="31" width="28" height="11" rx="4" fill="#68754b"/><rect x="25" y="25" width="15" height="8" rx="3" fill="#78845b"/><path d="M40 29 H55" stroke="#40473a" stroke-width="3"/></svg>',
bazooka:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 35 L51 18" stroke="#536148" stroke-width="11" stroke-linecap="round"/><path d="M8 38 L17 34" stroke="#252b27" stroke-width="13" stroke-linecap="round"/><path d="M48 20 L56 17" stroke="#252b27" stroke-width="14" stroke-linecap="round"/><path d="M29 30 L25 42" stroke="#2c302d" stroke-width="5" stroke-linecap="round"/><path d="M35 26 L39 18" stroke="#737b74" stroke-width="3"/><circle cx="51" cy="18" r="4" fill="#b76b2d"/></svg>',
arma:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 19 H54 V50 H10 Z" fill="#75583a" stroke="#3e3024" stroke-width="3"/><path d="M14 24 H50" stroke="#b58a56" stroke-width="3"/><g fill="#d4aa42" stroke="#70591e" stroke-width="1"><circle cx="20" cy="34" r="4"/><circle cx="31" cy="34" r="4"/><circle cx="42" cy="34" r="4"/><circle cx="25" cy="44" r="4"/><circle cx="36" cy="44" r="4"/></g></svg>'
};
const IT={
med:{n:'Farmaciola',c:0xf2f3de,s:[1.2,.8,.8],icon:ICON.med,desc:'Recupera 40 punts de vida.',usable:true},
mapa:{n:'Mapa de l’HQ',c:0xffe27a,s:[1.6,.08,1.2],icon:ICON.mapa,desc:'Obre la carta de navegació i revela l’HQ enemic.',usable:true},
mapa_heli:{n:'Mapa d’helicòpters',c:0x9fd7ff,s:[1.6,.08,1.2],icon:ICON.mapa_heli,desc:'Marca a la carta la posició de tots els helicòpters actius del mapa.',usable:true},
mapa_tanc:{n:'Mapa de tancs',c:0xc6b06a,s:[1.6,.08,1.2],icon:ICON.mapa_tanc,desc:'Marca a la carta la posició de tots els tancs actius del mapa.',usable:true},
bazooka:{n:'Bazooka',c:0x58664a,s:[2.1,.45,.45],icon:ICON.bazooka,desc:'Llançacoets d’un sol ús. Equipa’l i dispara una càrrega d’alt poder destructiu.',usable:true},
arma:{n:'Munició',c:0x555b66,s:[1.6,.35,.35],icon:ICON.arma,desc:'Caixa de munició per a l’arma personal.',usable:false},
expl:{n:'Explosius',c:0xe02020,s:[.9,.9,.9],icon:ICON.expl,desc:'Manat de TNT amb metxa. Planta una càrrega amb retard de 3 segons.',usable:true},
disf:{n:'Disfressa enemiga',c:0x4a7a3a,s:[1,1.2,.6],icon:ICON.disf,desc:'Camisa enemiga vermella. Activa o desactiva la disfressa.',usable:true}
};
// combat i enemics
let E=[],Pj=[],bombs=[],fx=[],DEAD=[],hp=100,ammo=0,disg=false,bazookaEquipped=false,over=0,fcd=0,kills=0,intelMarks=[],playerEject=null,playerFall=null;
const endEl=document.getElementById('end'),gB=new THREE.BoxGeometry(.35,.35,.35),sphG=new THREE.SphereGeometry(1,10,8),
mB=new THREE.MeshBasicMaterial({color:0xffe45a}),mS=new THREE.MeshBasicMaterial({color:0xff7a1a}),mE=new THREE.MeshBasicMaterial({color:0xff4040});
const EC={soldat:{hp:30,sp:7,rng:32,rate:1.1,dmg:7,spl:0,r:2},jeep:{hp:70,sp:22,rng:22,rate:.5,dmg:5,spl:0,r:3.9},tanqueta:{hp:115,sp:13,rng:42,rate:.72,dmg:9,spl:0,r:4.5},tanc:{hp:140,sp:8,rng:50,rate:2.5,dmg:22,spl:7,r:6.8},
torre:{hp:90,sp:0,rng:112.5,rate:.7,dmg:8,spl:0,r:3},general:{hp:45,sp:0,rng:30,rate:.9,dmg:9,spl:0,r:2}};
// extres: so, partícules, fauna, diari
let started=0,DIF=1,AC=null,eng=null,seaAudio=null,logb=[],fa=[],pi_=0;const lastS={},rn=(a,b)=>a+Math.random()*(b-a);
const PT=[];for(let i=0;i<100;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false}));m.visible=false;scene.add(m);PT.push({m,life:0,max:1,s:1})}
function puff(x,y,z,c,s,rise=0){const p=PT[pi_++%100];p.life=p.max=1.1;p.s=s;p.rise=rise;p.m.material.color.setHex(c);p.m.position.set(x+rn(-.6,.6),y,z+rn(-.6,.6));p.m.visible=true}
function mark(){const q=cv||P;logb.push({n:'P'+(logb.length+1),x:q.x,z:q.z});msg='Coordenades guardades: '+(q.x|0)+', '+(q.z|0);msgT=2}
function spawnFauna(){fa=[];for(let k=0;k<16;k++){const bird=window.HUNTER_FAUNA.createGull(THREE,{box:bx,material:M}),o=bird.o,wl=bird.wl,wr=bird.wr;world.add(o);
fa.push({k:'g',o,wl,wr,cx:rn(-H+200,H-200),cz:rn(-H+200,H-200),r:rn(40,120),a:rn(0,6.28),sp:rn(.15,.3),y:rn(25,55),x:0,z:0})}
for(let k=0;k<10;k++){let cx,cz,n=0;do{cx=rn(-H+150,H-150);cz=rn(-H+150,H-150)}while(hAt(cx,cz)>-6&&++n<60);if(hAt(cx,cz)>-6)continue;
const o=window.HUNTER_FAUNA.createShark(THREE,{material:M});world.add(o);fa.push({k:'s',o,cx,cz,r:rn(12,28),a:rn(0,6.28),sp:rn(.25,.45),x:cx,z:cz})}}
function updExtra(dt,t){updDeb(dt);
fa.forEach(f=>{f.a+=f.sp*dt;f.x=f.cx+Math.cos(f.a)*f.r;f.z=f.cz+Math.sin(f.a)*f.r;f.o.rotation.y=Math.PI-f.a;
if(f.k=='g'){f.o.position.set(f.x,f.y+Math.sin(t+f.cx)*2,f.z);f.wl.rotation.z=Math.sin(t*8+f.cx)*.5;f.wr.rotation.z=-f.wl.rotation.z}
else{f.o.position.set(f.x,wy(f.x,f.z,t)*.8+.8,f.z);if(Math.random()<.1)puff(f.x,f.o.position.y-.6,f.z,0xffffff,1.2);
if(!cv&&!over&&Math.hypot(P.x-f.x,P.z-f.z)<6&&hAt(P.x,P.z)<-1.2){hurtP(dt*10);msg='Un tauró et mossega!';msgT=1}}});
V.forEach(v=>{
  if(v.destroyed)return;
  v.playerHitCd=Math.max(0,(v.playerHitCd||0)-dt);
  const frac=1-(v.life/(v.maxLife||1));
  if(frac>.08){
    v.smokeT=(v.smokeT||0)-dt;
    if(v.smokeT<=0){
      const baseY=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
      if(v.smokeTopOffset==null&&v.o){
        v.o.updateMatrixWorld(true);
        const bb=new THREE.Box3().setFromObject(v.o);
        v.smokeTopOffset=Math.max(.7,bb.max.y-baseY);
      }
      const topY=baseY+(v.smokeTopOffset||1.8),count=frac>.65?3:2,
            col=frac>.65?0x0d0f10:0x1d2022,
            spread=Math.min(.8,vehicleRadius(v.t)*.09);
      for(let i=0;i<count;i++){
        puff(
          v.x+rn(-spread,spread),
          topY+rn(-.04,.12),
          v.z+rn(-spread,spread),
          col,
          .16+frac*.3,
          1.45+frac*1.85
        )
      }
      v.smokeT=Math.max(.08,.55-frac*.42)
    }
  }
});
if(cv){const c=VT[cv.t],sp=Math.abs(cv.v),s=Math.sin(cv.hd),co=Math.cos(cv.hd),L=c.m=='l'?2.5:5,gy=Math.max(0,hAt(cv.x,cv.z));
if(sp>6&&(c.m=='w'||c.m=='wl')){const sd=Math.random()<.5?-1:1;puff(cv.x+s*L+co*sd*1.6,cv.o.position.y+.2,cv.z+co*L-s*sd*1.6,0xffffff,1.6)}
else if(sp>12&&c.m=='l')puff(cv.x+s*L,gy+.3,cv.z+co*L,0xc9b48a,1.4);
else if(c.m=='a'&&cv.alt-gy<12)puff(cv.x+rn(-6,6),gy+.3,cv.z+rn(-6,6),hAt(cv.x,cv.z)>0?0xc9b48a:0xffffff,2.2)}
PT.forEach(p=>{if(p.life>0){p.life-=dt;if(p.rise)p.m.position.y+=p.rise*dt;p.m.scale.setScalar(p.s*(1+(1-p.life/p.max)*1.15));p.m.material.opacity=Math.max(0,p.life/p.max)*.8;if(p.life<=0){p.m.visible=false;p.rise=0}}});
if(seaAudio){const coastal=Math.max(.25,1-Math.max(0,hAt(P.x,P.z))/22);seaAudio.gain.gain.setTargetAtTime(over?0:.035+coastal*.05,AC.currentTime,.5)}if(eng){const c=cv?VT[cv.t]:null;eng.g.gain.value=c&&cv.t!=='bici'&&!over?.02+Math.min(1,Math.abs(cv.v)/40)*.03:0;eng.o.frequency.value=c?(c.m=='a'?60:35)+Math.abs(cv.v)*(c.m=='a'?1:2.5):40}}
const seedRandomEl=document.getElementById('seedRandom'),seedInputEl=document.getElementById('seedInput'),iniEl=document.getElementById('ini');
const applyStartScreenshot=()=>{
  try{
    const shot=localStorage.getItem('hunterStartScreenshot');
    if(shot)iniEl.style.background="linear-gradient(#15253677,#15253677),url('"+shot+"') center/cover no-repeat";
  }catch(_){}
};
const captureRealStartScreenshot=()=>{
  try{
    const wasVisible=pl.visible,ground=groundAt(P.x,P.z),hd=P.hd,dist=26;
    pl.visible=false;
    cam.position.set(P.x+Math.sin(hd)*dist,ground+13,P.z+Math.cos(hd)*dist);
    cam.lookAt(P.x-Math.sin(hd)*10,ground+2.2,P.z-Math.cos(hd)*10);
    sun.target.position.set(P.x,0,P.z);sun.position.copy(sun.target.position).addScaledVector(sunDir,500);
    sky.position.copy(cam.position);sunM.position.copy(cam.position).addScaledVector(sunDir,3500);
    ren.render(scene,cam);
    const shot=ren.domElement.toDataURL('image/webp',.86);
    if(shot&&shot.length>1000)localStorage.setItem('hunterStartScreenshot',shot);
    pl.visible=wasVisible;
  }catch(_){pl.visible=true}
};
applyStartScreenshot();
seedRandomEl.onchange=()=>{seedInputEl.disabled=seedRandomEl.checked;if(!seedRandomEl.checked)seedInputEl.focus()};
document.querySelectorAll('#ini button[data-d]').forEach(b=>b.onclick=()=>{
  DIF=+b.dataset.d;MAP_SCALE=+(document.querySelector('input[name="mapSize"]:checked')?.value||1);S=4800*MAP_SCALE;H=S/2;
  const rawSeed=seedRandomEl.checked?null:seedFromText(seedInputEl.value||'hunter');
  requestedSeed=rawSeed==null?null:(rawSeed^Math.imul(MAP_SCALE,0x45d9f3b))>>>0;
  build();minimap.setWorldSize(S,H);minimap.reset();mini();
  captureRealStartScreenshot();
  started=1;iniEl.style.display='none';initAudio()
});
// animacions de destrucció
const DB=[],WA=[],dgeo=new THREE.BoxGeometry(1,1,1),dmc={},dmat=c=>dmc[c]||(dmc[c]=M(c));
function debris(x,y,z,col,n,sz,sp){for(let i=0;i<n;i++){const m=new THREE.Mesh(dgeo,dmat(col)),s=rn(.4,1)*sz;m.scale.set(s,s*rn(.5,1.2),s);m.position.set(x+rn(-1,1),y,z+rn(-1,1));m.rotation.set(rn(0,3),rn(0,3),0);world.add(m);
DB.push({m,s0:m.scale.clone(),vx:rn(-sp,sp),vy:rn(sp*.4,sp*1.3),vz:rn(-sp,sp),rx:rn(-6,6),life:rn(1.2,2)})}
while(DB.length>160)world.remove(DB.shift().m)}
function vehicleDebris(v,baseY){
  if(!v?.o)return;
  v.o.updateMatrixWorld(true);
  const meshes=[];v.o.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.geometry)meshes.push(o)});
  const heavy=['tanc','tanqueta','camio'].includes(v.t),air=v.t==='heli'||v.t==='heli_combat',maxPieces=heavy?24:air?20:16;
  const chosen=meshes.length<=maxPieces?meshes:meshes.filter((_,i)=>i%Math.ceil(meshes.length/maxPieces)===0).slice(0,maxPieces);
  const center=new THREE.Vector3(v.x,baseY+1,v.z),p=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3();
  for(const src of chosen){
    src.matrixWorld.decompose(p,q,sc);
    const piece=new THREE.Mesh(src.geometry,src.material);piece.position.copy(p);piece.quaternion.copy(q);piece.scale.copy(sc);piece.castShadow=true;piece.receiveShadow=true;world.add(piece);
    const dx=p.x-center.x,dz=p.z-center.z,d=Math.max(.3,Math.hypot(dx,dz)),out=heavy?rn(7,16):rn(9,20);
    DB.push({m:piece,s0:piece.scale.clone(),vx:dx/d*out+rn(-5,5),vy:rn(10,heavy?22:26),vz:dz/d*out+rn(-5,5),rx:rn(-9,9),ry:rn(-9,9),rz:rn(-9,9),life:rn(2.2,4.2),vehiclePart:true})
  }
  const burst=heavy?14:10;debris(v.x,baseY+1.3,v.z,0x34383a,burst,.45,14);
  for(let i=0;i<(heavy?7:5);i++)puff(v.x+rn(-2,2),baseY+rn(.5,2.2),v.z+rn(-2,2),i%2?0x3b3b38:0x787064,rn(1.6,3.2));
  while(DB.length>240){const d=DB.shift();if(d?.m)world.remove(d.m)}
}
function wallBreak(w){const h=w.y1-w.y0-1,parts=w.parts&&w.parts.length?w.parts:[w.m],base=parts[0],col=base.material.color.getHex(),cx=(w.x0+w.x1)/2,cz=(w.z0+w.z1)/2;
if(w.parts&&w.parts.length){parts.forEach(m=>m.visible=false)}else if(w.m.visible)WA.push({m:w.m,h,t:.5});else world.remove(w.m);
for(let i=0;i<(w.door?6:10);i++)debris(rn(w.x0,w.x1),w.y0+1+h*rn(.2,.9),rn(w.z0,w.z1),col,1,.9,7);
for(let i=0;i<3;i++)puff(cx,w.y0+1+h*rn(.1,.6),cz,0xc9b48a,3.5)}
function roofBreak(b){if(b.rb)return;b.rb=1;b.rhp=0;b.roof.visible=false;const col=b.roof.material?b.roof.material.color.getHex():(b.roof.userData.color||0x777777),y=b.fy+b.h+.6;
for(let i=0;i<20;i++)debris(b.x+rn(-b.w/2,b.w/2),y,b.z+rn(-b.d/2,b.d/2),col,1,1.3,9);
for(let i=0;i<8;i++)puff(b.x+rn(-b.w/2,b.w/2),y,b.z+rn(-b.d/2,b.d/2),0xc9b48a,4.5);snd('boom',.4)}
function updDeb(dt){for(let i=DB.length-1;i>=0;i--){const d=DB[i],m=d.m;d.vy-=28*dt;m.position.x+=d.vx*dt;m.position.y+=d.vy*dt;m.position.z+=d.vz*dt;m.rotation.x+=d.rx*dt;m.rotation.y+=(d.ry||0)*dt;m.rotation.z+=(d.rz||0)*dt;
const g=Math.max(0,hAt(m.position.x,m.position.z))+.2;if(m.position.y<g){m.position.y=g;d.vy*=-.3;d.vx*=.6;d.vz*=.6;d.rx*=.82;if(d.ry)d.ry*=.82;if(d.rz)d.rz*=.82}
d.life-=dt;const fade=d.vehiclePart?.55:.4,k=Math.max(0,Math.min(1,d.life/fade));m.scale.set(d.s0.x*k,d.s0.y*k,d.s0.z*k);if(d.life<=0){world.remove(m);DB.splice(i,1)}}
for(let i=WA.length-1;i>=0;i--){const a=WA[i];a.t-=dt;const s=Math.max(0,a.t/.5);a.m.scale.y=s;a.m.position.y=a.h/2*s;if(a.t<=0){world.remove(a.m);WA.splice(i,1)}}
updFA(dt)}
// vegetació
const TG=new Map();
function treeHit(x,z,r){const cx=Math.floor(x/16),cz=Math.floor(z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=TG.get((cx+a)+','+(cz+b));if(L)for(const t of L)if(Math.hypot(x-t.x,z-t.z)<t.r+r)return true}return false}
function treePush(){const r0=.5,cx=Math.floor(P.x/16),cz=Math.floor(P.z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=TG.get((cx+a)+','+(cz+b));if(L)for(const t of L){const dx=P.x-t.x,dz=P.z-t.z,d=Math.hypot(dx,dz),m=t.r+r0;if(d<m&&d>.001){P.x=t.x+dx/d*m;P.z=t.z+dz/d*m}}}}
function vehiclePushPlayer(){
  if(cv||playerFall)return;
  for(const v of [...V,...E.filter(u=>['jeep','tanqueta','tanc'].includes(u.t))]){
    if(v.destroyed||!circleVehicleOverlap(P.x,P.z,.62,v))continue;
    const b=vehicleBox(v),dx=P.x-b.x,dz=P.z-b.z,s=Math.sin(b.hd),c=Math.cos(b.hd),lx=dx*c-dz*s,lz=dx*s+dz*c,ex=b.w/2+.66-Math.abs(lx),ez=b.d/2+.66-Math.abs(lz);
    if(ex<ez){const sign=lx<0?-1:1,wx=sign*c,wz=-sign*s;P.x=b.x+(sign*(b.w/2+.66))*c+lz*s;P.z=b.z-(sign*(b.w/2+.66))*s+lz*c}
    else{const sign=lz<0?-1:1;P.x=b.x+lx*c+sign*(b.d/2+.66)*s;P.z=b.z-lx*s+sign*(b.d/2+.66)*c}
    const sp=Math.abs(v.v||0);if(sp>5&&(!v.playerHitCd||v.playerHitCd<=0)){hurtP(Math.min(22,2+sp*.55));v.playerHitCd=.45;msg='Impacte amb un vehicle!';msgT=1.5}
  }
}
const PL=[],FA=[],ZM=new THREE.Matrix4().makeScale(0,0,0);let PM={};
const vegetationVisual=window.HUNTER_VEGETATION.create(THREE,{materialProfile,random:rr});
const PG={t:vegetationVisual.geometry.trunk,c:vegetationVisual.geometry.crown,c2:vegetationVisual.geometry.crown2};
let compoundClear=[];
function treeAt(x,z,r){const cx=Math.floor(x/16),cz=Math.floor(z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=TG.get((cx+a)+','+(cz+b));if(L)for(const t of L)if(Math.hypot(x-t.x,z-t.z)<t.r+r)return t}return null}
function crush(x,z,r){const cx=Math.floor(x/16),cz=Math.floor(z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=TG.get((cx+a)+','+(cz+b));if(L)L.slice().forEach(t=>{if(t.p&&Math.hypot(x-t.x,z-t.z)<t.r+r)killPalm(t)})}}
function dmgP(t,d){if(!t.alive)return;t.hp-=d;if(t.hp<=0)killPalm(t)}
function killPalm(t){if(!t.alive)return;t.alive=false;const a=TG.get(t.k);if(a){const i=a.indexOf(t);if(i>=0)a.splice(i,1)}
if(PM.t){PM.t.setMatrixAt(t.i,ZM);PM.t.instanceMatrix.needsUpdate=true}
const vm=PM.variantMap?.[t.i];if(vm){const vg=PM.variants?.[vm.variant];[vg?.crown,vg?.crown2].forEach(m=>{if(m){m.setMatrixAt(vm.index,ZM);m.instanceMatrix.needsUpdate=true}})}
const y=new THREE.Group(),g=new THREE.Group();y.position.set(t.x,t.y,t.z);y.rotation.y=t.yaw;y.scale.setScalar(t.s);y.add(g);
[[PG.t,0x8a6a3a],[PG.c,0x4fa03a],[PG.c2,0x6fbf3a]].forEach(([ge,c])=>g.add(new THREE.Mesh(ge,dmat(c))));world.add(y);FA.push({y,g,t:0,s:t.s,x:t.x,z:t.z,yaw:t.yaw})}
function updFA(dt){for(let i=FA.length-1;i>=0;i--){const a=FA[i];a.t+=dt;const k=Math.min(1,a.t/.9);a.g.rotation.z=-k*k*1.5;
if(k>=1){const c=Math.cos(a.yaw),s=Math.sin(a.yaw),lx=a.x+c*6.4*a.s,lz=a.z-s*6.4*a.s,ly=Math.max(hAt(lx,lz),0)+.6;
debris(lx,ly,lz,0x4fa03a,8,1,5);debris(a.x+c*3*a.s,ly,a.z-s*3*a.s,0x8a6a3a,4,.7,3);puff(lx,ly,lz,0xc9b48a,3);world.remove(a.y);FA.splice(i,1)}}}
function vegetate(pa){TG.clear();PL.length=0;FA.length=0;const pm=[],bu=[],rk=[],put=e=>{e.k=Math.floor(e.x/16)+','+Math.floor(e.z/16);let a=TG.get(e.k);if(!a)TG.set(e.k,a=[]);a.push(e)};
for(let x=-H+40;x<H-40;x+=14)for(let z=-H+40;z<H-40;z+=14){const px=x+rr(-4,4),pz=z+rr(-4,4),h=hAt(px,pz);if(h<1.3||h>42)continue;
const dn=fbm(px/80+7,pz/80+3),q=R();let L=null;
if(h<4)L=q<.12?pm:null;else if(dn>.55&&h<28)L=q<.20?pm:null;else if(h<42&&q<.06)L=pm;else if(dn>.4)L=q<.2?bu:null;else if(h>8&&q<.04)L=rk;else if(q<.024)L=pm;
if(!L||slope(px,pz,h)>4.5)continue;
if(stairs.some(s=>stairContains(s,px,pz,2))||Math.hypot(px-pa.x,pz-pa.z)<14||B.some(b=>Math.abs(px-b.x)<b.w/2+5&&Math.abs(pz-b.z)<b.d/2+5)||compoundClear.some(c=>Math.hypot(px-c.x,pz-c.z)<c.r))continue;
const s=1.15*rr(.75,1.25),yaw=rr(0,6.28);
if(L==pm){const leafVar=R()<.33?-1:R()<.66?0:1,tone=rr(-.25,.25),idx=pm.length;pm.push([px,h-.3,pz,s,yaw,leafVar,tone]);const e={x:px,z:pz,y:h-.3,s,yaw,r:.6*Math.max(.75,s),p:true,alive:true,hp:40,i:idx,leafVar,tone};put(e);PL.push(e)}
else{L.push([px,h-.3,pz,s,yaw]);if(L==rk)put({x:px,z:pz,r:1.4,rock:true})}}
const vegetationMeshes=vegetationVisual.build({world,palms:pm,bushes:bu,rocks:rk});
PM={t:vegetationMeshes.palms.trunk,c:vegetationMeshes.palms.crown,c2:vegetationMeshes.palms.crown2,variants:vegetationMeshes.palms.variants,variantMap:vegetationMeshes.palms.variantMap}}
function fr(x,z){let a=1e9,b=-1e9;for(const[i,j]of[[0,0],[9,9],[-9,9],[9,-9],[-9,-9],[9,0],[-9,0],[0,9],[0,-9]]){const h=hAt(x+i,z+j);a=Math.min(a,h);b=Math.max(b,h)}return b-a}
function dmgW(w,d){w.hp-=d;if(w.hp<=0){wallBreak(w);let i=Wl.indexOf(w);if(i>=0)Wl.splice(i,1);i=Dr.indexOf(w);if(i>=0)Dr.splice(i,1);snd('boom',.3)}}
function mkB(x,z,w,d,h,col,roof,opt={}){const fy=hAt(x,z),visual=(opt.hangar?buildingVisual.createHangarShell:buildingVisual.createShell)({width:w,depth:d,height:h,wallColor:col,roofColor:roof}),g=visual.group,wm=visual.walls,dm=visual.doors,t=.8,dw=opt.doorWidth||2.5,ds=opt.doorSide==null?Math.floor(R()*4):opt.doorSide;
const seg=(lx,lz,sx,sz,dr,windows=false)=>{if(!dr){const parts=windows?buildingVisual.addWindowedWall(g,{lx,lz,sx,sz,height:h,material:wm}):[buildingVisual.addWall(g,{lx,lz,sx,sz,height:h,material:wm})],m=parts[0],o={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:fy-1,y1:fy+h,hp:90,m,parts:windows?parts:null,door:false,open:false,cx:x+lx,cz:z+lz};Wl.push(o);return}
const parts=buildingVisual.addDoor(g,{lx,lz,sx,sz,height:h,wallMaterial:wm,doorMaterial:dm,doorHeight:opt.doorHeight||4.4}),door={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:fy-1,y1:fy+parts.doorHeight,hp:35,m:parts.door,door:true,open:!!opt.openDoor,alwaysOpen:!!opt.openDoor,locked:!!opt.lockedDoor,cx:x+lx,cz:z+lz};Wl.push(door);Dr.push(door);
if(parts.lintel)Wl.push({x0:door.x0,x1:door.x1,z0:door.z0,z1:door.z1,y0:fy+parts.doorHeight,y1:fy+h,hp:70,m:parts.lintel,door:false,open:false,playerBlock:false,cx:x+lx,cz:z+lz})};
if(opt.hangar){
  const sh=visual.spring||Math.max(3.1,h*.3),push=(lx,lz,sx,sz)=>{
    const m=buildingVisual.addWall(g,{lx,lz,sx,sz,height:sh,material:wm}),o={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:fy-1,y1:fy+sh,hp:110,m,door:false,open:false,cx:x+lx,cz:z+lz};Wl.push(o);return o
  };
  // Laterals longitudinals baixos.
  push(w/2-t/2,0,t,d);push(-w/2+t/2,0,t,d);
  // Darrere tancat.
  const backZ=ds===0?-d/2+t/2:d/2-t/2;push(0,backZ,w,t);
  // Boca ampla oberta al costat de la porta (hangars actuals: costat Z).
  const frontZ=ds===0?d/2-t/2:-d/2+t/2,sl=Math.max(.5,(w-dw)/2),off=dw/2+sl/2;
  push(-off,frontZ,sl,t);push(off,frontZ,sl,t);
}else{
  [[0,d/2-t/2,w,t,0],[0,-d/2+t/2,w,t,0],[w/2-t/2,0,t,d-2*t,1],[-w/2+t/2,0,t,d-2*t,1]].forEach(([cx,cz,sx,sz,ax],k)=>{if(k!=ds){seg(cx,cz,sx,sz,0,!opt.bunker);return}const L=ax?sz:sx,sl=(L-dw)/2,off=dw/2+sl/2;for(const q of[-1,1]){if(ax)seg(cx,cz+q*off,sx,sl);else seg(cx+q*off,cz,sl,sz)}if(ax)seg(cx,cz,sx,dw,1);else seg(cx,cz,dw,sz,1)});
  if(!opt.bunker&&w*d>=140&&R()<.5){const al=w>=d,L=al?d:w,gp=rr(-L/4,L/4),px=(R()<.5?-1:1)*rr((al?w:d)*.12,(al?w:d)*.2),a0=-L/2+t,a1=L/2-t,ps=(a,b)=>{if(b-a<.5)return;const cc=(a+b)/2,l=b-a;if(al)seg(px,cc,t,l);else seg(cc,px,l,t)};ps(a0,gp-1.6);ps(gp+1.6,a1)}
}
g.position.set(x,fy,z);world.add(g);
const b={o:g,x,z,hw:w/2+1.5,hd:d/2+1.5,w,d,h,fy,wm,dm,roof:visual.roof,rhp:120,hangar:!!opt.hangar,doorSide:ds,doorWidth:dw,kind:opt.kind||'house'};B.push(b);if(opt.hangar)addRampAccess(b,ds);else addStairs(b,ds);return b}
function mkEnemyBunker(x,z){
  const b=mkB(x,z,34,28,9,0xd9ded2,0xbfc6bb,{kind:'enemy_bunker',bunker:true,doorSide:0,doorWidth:3.4,doorHeight:4.2,openDoor:false,lockedDoor:true}),g=b.o,concrete=0xd2d8cb,dark=0x777f76,t=.55;
  const left=bx(g,6.2,8.7,28.6,concrete,-16.1,4.05,0,'masonry'),right=bx(g,6.2,8.7,28.6,concrete,16.1,4.05,0,'masonry');left.rotation.z=-.18;right.rotation.z=.18;
  const brow=bx(g,7.2,.9,2.2,dark,0,6.15,13.45,'masonry');brow.rotation.x=-.08;
  bx(g,5.4,.45,1.2,0x8c4b33,0,5.25,13.7,'paint');
  const wall=(lx,lz,sx,sz)=>{const m=buildingVisual.addWall(g,{lx,lz,sx,sz,height:8.2,material:b.wm}),o={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:b.fy-1,y1:b.fy+8.2,hp:90,m,door:false,open:false,cx:x+lx,cz:z+lz};Wl.push(o);return o};
  // Passadís central amb quatre cambres laterals i una cambra posterior.
  wall(-8.2,1.2,t,18.8);wall(8.2,1.2,t,18.8);
  wall(-12.1,4.2,7.3,t);wall(-12.1,-5.0,7.3,t);wall(12.1,4.2,7.3,t);wall(12.1,-5.0,7.3,t);
  wall(-4.9,-7.6,6.2,t);wall(4.9,-7.6,6.2,t);
  b.generalSpots=[
    {x:x-12,z:z+8},{x:x+12,z:z+8},{x:x-12,z:z-1},{x:x+12,z:z-1},
    {x:x-12,z:z-9},{x:x+12,z:z-9},{x:x,z:z-10.5}
  ];
  return b
}
// Door-aligned treads share the exact same geometry and walking height.
function stairLocal(s,x,z){const dx=x-s.x,dz=z-s.z;return{along:dx*s.nx+dz*s.nz,side:dx*s.nz-dz*s.nx}}
function stairContains(s,x,z,margin=0){const q=stairLocal(s,x,z);return q.along>=-margin&&q.along<=s.length+margin&&Math.abs(q.side)<=s.width/2+margin}
function groundAt(x,z){let y=hAt(x,z);for(const s of stairs){if(stairContains(s,x,z)){const q=stairLocal(s,x,z);if(s.ramp){const t=Math.max(0,Math.min(1,q.along/s.length));y=Math.max(y,s.top+(s.bottom-s.top)*t)}else{const i=Math.min(s.steps-1,Math.max(0,Math.floor(q.along/s.tread)));y=Math.max(y,s.top-i*s.rise)}}}
for(const p of piers){const dx=x-p.x,dz=z-p.z,along=dx*p.ux+dz*p.uz,side=dx*p.px+dz*p.pz;if(Math.abs(along)<=p.length/2+.35&&Math.abs(side)<=p.width/2+.2)y=Math.max(y,p.y)}
return y}
function addRampAccess(b,side){const [nx,nz]=[[0,1],[0,-1],[1,0],[-1,0]][side],edge=(nx?b.w:b.d)/2+.2,x=b.x+nx*edge,z=b.z+nz*edge,top=b.fy+.3;
let length=8,bottom=hAt(x+nx*length,z+nz*length);for(let L=8;L<=26;L+=2){const yy=hAt(x+nx*L,z+nz*L);if(Math.abs(top-yy)<Math.abs(top-bottom)){length=L;bottom=yy}if(Math.abs(top-yy)<.35){length=L;bottom=yy;break}}
if(Math.abs(top-bottom)<.1)return;const width=Math.max(6,Math.min(b.doorWidth-.8,30)),r={x,z,nx,nz,top,bottom,length,width,ramp:true};stairs.push(r);b.stair=r;
buildingVisual.addRamp(b.o,{alongAxis:!!nx,length,width,top:top-b.fy,bottom:bottom-b.fy,x:x-b.x+nx*length/2,z:z-b.z+nz*length/2,color:0x8f918e,direction:nx||nz})}
function addStairs(b,side){const [nx,nz]=[[0,1],[0,-1],[1,0],[-1,0]][side],edge=(nx?b.w:b.d)/2+.15,x=b.x+nx*edge,z=b.z+nz*edge,top=b.fy+.3;
if(top-hAt(x,z)<.12)return;
const tread=.75;let steps=1;for(;steps<80;steps++){const end=steps*tread;if(top-hAt(x+nx*end,z+nz*end)<=steps*.32)break}
const length=steps*tread,bottom=hAt(x+nx*length,z+nz*length),rise=Math.max(0,(top-bottom)/steps),s={x,z,nx,nz,top,steps,tread,length,rise,width:4.2};stairs.push(s);b.stair=s;
for(let i=0;i<steps;i++){const a=(i+.5)*tread,xx=x+nx*a,zz=z+nz*a,y=top-i*rise,base=Math.min(y-.16,hAt(xx,zz)-.15);buildingVisual.addStep(b.o,{alongAxis:!!nx,riseWidth:tread,height:y-b.fy,base:base-b.fy,x:xx-b.x,z:zz-b.z,color:i%2?0xa69982:0xb5a68e})}
}
function wallPush(){const r=.6;for(const w of Wl){if(w.playerBlock===false)continue;if(!w.open&&P.x>w.x0-r&&P.x<w.x1+r&&P.z>w.z0-r&&P.z<w.z1+r){const a=[P.x-(w.x0-r),w.x1+r-P.x,P.z-(w.z0-r),w.z1+r-P.z],i=a.indexOf(Math.min(...a));
if(i==0)P.x=w.x0-r;else if(i==1)P.x=w.x1+r;else if(i==2)P.z=w.z0-r;else P.z=w.z1+r}}}
function itemMapTexture(kind){const c=document.createElement('canvas');c.width=192;c.height=144;const q=c.getContext('2d');q.fillStyle=kind==='heli'?'#dceff4':kind==='tanc'?'#eadfb9':'#ead59b';q.fillRect(0,0,c.width,c.height);q.strokeStyle='#8f7b52';q.lineWidth=5;q.strokeRect(5,5,c.width-10,c.height-10);q.strokeStyle='#baa36b';q.lineWidth=2;for(let x=30;x<190;x+=32){q.beginPath();q.moveTo(x,7);q.lineTo(x,137);q.stroke()}for(let y=26;y<140;y+=28){q.beginPath();q.moveTo(7,y);q.lineTo(185,y);q.stroke()}
  q.save();q.translate(96,72);q.strokeStyle='#313a36';q.fillStyle='#596d55';q.lineWidth=6;
  if(kind==='heli'){q.beginPath();q.ellipse(0,5,32,13,0,0,Math.PI*2);q.fill();q.beginPath();q.moveTo(-55,-13);q.lineTo(55,-13);q.stroke();q.beginPath();q.moveTo(0,-31);q.lineTo(0,22);q.stroke();q.fillRect(28,1,35,7)}
  else if(kind==='tanc'){q.fillRect(-34,-8,58,24);q.fillRect(-18,-21,29,15);q.beginPath();q.moveTo(10,-14);q.lineTo(48,-14);q.stroke();q.strokeRect(-38,17,67,9)}
  else{q.fillStyle='#7a4e3d';q.fillRect(-28,-4,56,31);q.fillStyle='#a94338';q.beginPath();q.moveTo(-34,-4);q.lineTo(0,-33);q.lineTo(34,-4);q.closePath();q.fill();q.fillStyle='#ead59b';q.fillRect(-6,12,12,15)}
  q.restore();const tex=new THREE.CanvasTexture(c);tex.needsUpdate=true;return tex}
function createItemVisual(t){const g=new THREE.Group(),metal=0x454b4e,dark=0x3d3025;
  if(t==='mapa'||t==='mapa_heli'||t==='mapa_tanc'){const kind=t==='mapa_heli'?'heli':t==='mapa_tanc'?'tanc':'hq',paper=new THREE.Mesh(new THREE.BoxGeometry(1.65,.07,1.25),M(t==='mapa_heli'?0xdceff4:t==='mapa_tanc'?0xeadfb9:0xead59b,'paint'));g.add(paper);const top=new THREE.Mesh(new THREE.PlaneGeometry(1.52,1.12),new THREE.MeshBasicMaterial({map:itemMapTexture(kind),transparent:false}));top.rotation.x=-Math.PI/2;top.position.y=.041;g.add(top)}
  else if(t==='expl'){for(const x of[-.34,0,.34]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,1.05,10),M(0xc8322d,'paint'));m.position.set(x,.52,0);g.add(m)}bx(g,1.05,.13,.55,0x5b4a2d,0,.52,0,'paint');for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.32,6),M(0xc39a4a,'metal'));m.position.set(.25+i*.08,.98+.12*i,0);m.rotation.z=-.55;g.add(m)}}
  else if(t==='med'){bx(g,1.35,.7,1,0xf4f4f0,0,.35,0,'paint');bx(g,1.05,.08,.28,0xd5aa76,0,.74,0,'paint');bx(g,.28,.08,.95,0xd5aa76,0,.75,0,'paint');for(const x of[-.18,.18])for(const z of[-.18,.18]){const d=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.03,6),M(0x9b734b,'paint'));d.position.set(x,.81,z);g.add(d)}}
  else if(t==='arma'){bx(g,1.45,.55,1.05,0x745539,0,.28,0,'paint');bx(g,1.5,.1,1.1,dark,0,.04,0,'metal');for(const x of[-.48,-.16,.16,.48])for(const z of[-.27,.27]){const bullet=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.48,8),M(0xc9a23f,'metal'));bullet.position.set(x,.72,z);g.add(bullet);const tip=new THREE.Mesh(new THREE.ConeGeometry(.08,.16,8),M(0xb7772b,'metal'));tip.position.set(x,1.04,z);g.add(tip)}}
  else if(t==='bazooka'){const tube=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,2.65,10),M(0x58664a,'paint'));tube.rotation.z=Math.PI/2;tube.position.set(0,.62,0);g.add(tube);const rear=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.18,10),M(0x252b27,'metal'));rear.rotation.z=Math.PI/2;rear.position.set(-1.37,.62,0);g.add(rear);const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.29,.22,.24,10),M(0x252b27,'metal'));muzzle.rotation.z=Math.PI/2;muzzle.position.set(1.42,.62,0);g.add(muzzle);bx(g,.16,.4,.22,0x252b27,-.35,.35,0,'metal');bx(g,.12,.2,.3,0x737b74,.35,.83,0,'metal')}
  else if(t==='disf'){bx(g,.78,1.3,.16,0xb53232,0,.8,0,'paint');const l=bx(g,.7,.38,.16,0xb53232,-.62,1.18,0,'paint'),r=bx(g,.7,.38,.16,0xb53232,.62,1.18,0,'paint');l.rotation.z=-.55;r.rotation.z=.55;bx(g,.16,.18,.18,0xf1c7a1,0,1.44,0,'organic');bx(g,.08,1.05,.19,0x6f1f1f,0,.75,-.02,'paint')}
  else bx(g,...IT[t].s,IT[t].c,0,.4,0,'paint');
  return g}
function addIt(t,b){const c=IT[t];if(!c){console.warn('Tipus d’objecte desconegut:',t);return null}let x,z;for(let k=0;k<25;k++){x=b.x+rr(-(b.w/2-2),b.w/2-2);z=b.z+rr(-(b.d/2-2),b.d/2-2);if(!Wl.some(w=>x>w.x0-1.2&&x<w.x1+1.2&&z>w.z0-1.2&&z<w.z1+1.2))break}
const y=b.fy+1.3,o=createItemVisual(t);o.position.set(x,y,z);world.add(o);items.push({t,x,z,y,o})}
function flag(x,z,c){world.add(buildingVisual.createFlag({x,y:hAt(x,z),z,color:c}))}
// jugador i vehicles
const bx=(g,w,h,d,c,x,y,z,profile='organic')=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,profile));m.position.set(x,y,z);g.add(m);return m};
const buildingVisual=window.HUNTER_BUILDINGS.create(THREE,{material:M,materialProfile,box:bx});
const pl=window.HUNTER_CHARACTERS.createPlayer(THREE,{box:bx});scene.add(pl);
const animPl=(f,dt)=>window.HUNTER_CHARACTERS.animatePlayer(pl,{forward:f,dt,swimming,inVehicle:!!cv,ammo,bazookaEquipped});
const VT=window.HUNTER_VEHICLE_DYNAMICS.types;
const VS=window.HUNTER_VEHICLES.scales;
const vehicleRadius=t=>window.HUNTER_VEHICLES.radii[t]*VS[t];
const VHB=window.HUNTER_VEHICLES.hitboxes;
const vehicleHitType=t=>t==='jeep'?'cotxe':t;
const vehicleBox=(v,x=v.x,z=v.z,hd=v.hd)=>{const t=vehicleHitType(v.t),hb=VHB[t]||[vehicleRadius(t)*1.25,vehicleRadius(t)*1.6],sc=VS[t]||1;return{x,z,hd,w:hb[0]*sc,d:hb[1]*sc,v}};
const obbAxes=b=>{const s=Math.sin(b.hd),c=Math.cos(b.hd);return[{x:c,z:-s},{x:s,z:c}]};
const obbOverlap=(a,b)=>{const A=obbAxes(a),B=obbAxes(b),dx=b.x-a.x,dz=b.z-a.z,axes=[...A,...B];for(const ax of axes){const dist=Math.abs(dx*ax.x+dz*ax.z),ra=Math.abs(A[0].x*ax.x+A[0].z*ax.z)*a.w/2+Math.abs(A[1].x*ax.x+A[1].z*ax.z)*a.d/2,rb=Math.abs(B[0].x*ax.x+B[0].z*ax.z)*b.w/2+Math.abs(B[1].x*ax.x+B[1].z*ax.z)*b.d/2;if(dist>ra+rb)return false}return true};
const circleVehicleOverlap=(x,z,r,v)=>{const b=vehicleBox(v),dx=x-b.x,dz=z-b.z,s=Math.sin(b.hd),c=Math.cos(b.hd),lx=dx*c-dz*s,lz=dx*s+dz*c,cx=Math.max(-b.w/2,Math.min(b.w/2,lx)),cz=Math.max(-b.d/2,Math.min(b.d/2,lz)),ex=lx-cx,ez=lz-cz;return ex*ex+ez*ez<r*r};
const vehicleY=v=>v.alt!=null&&VT[vehicleHitType(v.t)]?.m==='a'?v.alt:(v.o?.position?.y??Math.max(0,hAt(v.x,v.z)));
const vehicleHeightCompatible=(a,b)=>Math.abs(vehicleY(a)-vehicleY(b))<Math.max(2.2,Math.min(vehicleRadius(vehicleHitType(a.t)),vehicleRadius(vehicleHitType(b.t)))*.55);
const vehicleObstacles=v=>[...V,...E.filter(u=>['jeep','tanqueta','tanc'].includes(u.t))].filter(o=>o!==v&&!o.destroyed);
const mkV=window.HUNTER_VEHICLES.createFactory(THREE,{box:bx,material:M,shadows:visualQuality.shadows});
const riderSystem=window.HUNTER_RIDER.create(THREE,{scene,box:bx,material:M,scales:VS,heightAt:hAt,shadows:visualQuality.shadows});
const rider=riderSystem.object,poseRider=riderSystem.update;
let swimming=false;let V=[],cv=null;const P={x:0,z:0,y:0,hd:0};
const setPatrol=(u,pts,guard=false)=>{if(!u)return u;u.patrol=pts.map(([x,z])=>({x,z}));u.pi=-1;u.guard=guard;u.wt=0;return u};
const setDefense=(u,pts)=>{if(!u)return u;u.defense=pts.map(([x,z])=>({x,z}));u.defenseTarget=null;return u};
const chooseDefense=(u,q)=>{
  if(!u.defense||!u.defense.length)return null;let best=null,score=1e9;
  for(const p of u.defense){if(hAt(p.x,p.z)<-.5||treeHit(p.x,p.z,1))continue;const du=Math.hypot(p.x-u.x,p.z-u.z),dq=Math.hypot(p.x-q.x,p.z-q.z),sc=du+dq*.08;if(sc<score&&sight(p.x,p.z,q.x,q.z,hAt(p.x,p.z)+1.7)){score=sc;best=p}}
  return best
};
const wireRod=(a,b,r=.045,c=0x3d4143)=>{const v=new THREE.Vector3(...a),w=new THREE.Vector3(...b),d=w.clone().sub(v),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),6),M(c,'metal'));m.position.copy(v.add(w).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());world.add(m);return m};
const barbedSection=(x1,z1,x2,z2)=>{
  const y1=Math.max(hAt(x1,z1),0),y2=Math.max(hAt(x2,z2),0),parts=[],dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L,px=-uz,pz=ux,Hw=4.9;
  for(const [x,z,y] of [[x1,z1,y1],[x2,z2,y2]]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,Hw,6),M(0x4a4f52,'metal'));p.position.set(x,y+Hw/2,z);world.add(p);parts.push(p)}
  for(const h of[.55,1.55,2.55,3.55,4.35])parts.push(wireRod([x1,y1+h,z1],[x2,y2+h,z2],.028,0x30363a));
  for(const [a,b] of[[.6,2.5],[2.5,4.35],[4.35,2.5],[2.5,.6]])parts.push(wireRod([x1,y1+a,z1],[x2,y2+b,z2],.024,0x353b3e));
  for(let i=0;i<4;i++){const a=(i+.12)/4,b=(i+.88)/4,xa=x1+dx*a,za=z1+dz*a,xb=x1+dx*b,zb=z1+dz*b,ya=Math.max(hAt(xa,za),0)+4.72,yb=Math.max(hAt(xb,zb),0)+4.72,side=i%2?-.22:.22;parts.push(wireRod([xa+px*side,ya,za+pz*side],[xb-px*side,yb,zb-pz*side],.024,0x292f32))}
  const pad=.24,w={x0:Math.min(x1,x2)-pad,x1:Math.max(x1,x2)+pad,z0:Math.min(z1,z2)-pad,z1:Math.max(z1,z2)+pad,y0:Math.min(y1,y2),y1:Math.max(y1,y2)+5,hp:32,m:parts[0],parts,door:false,open:false,barbed:true,rammable:true,cx:(x1+x2)/2,cz:(z1+z2)/2};Wl.push(w);return w
};
const barbedSegment=(x1,z1,x2,z2)=>{
  const L=Math.hypot(x2-x1,z2-z1),n=Math.max(1,Math.ceil(L/6));
  for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n;barbedSection(x1+(x2-x1)*a,z1+(z2-z1)*a,x1+(x2-x1)*b,z1+(z2-z1)*b)}
};
const barbedHQ=(cx,cz,hw=50,hd=46,gap=13,gateOffset=0)=>{
  const n=cz-hd,s=cz+hd,w=cx-hw,e=cx+hw,gx=Math.max(w+gap,Math.min(e-gap,cx+gateOffset));
  barbedSegment(w,n,e,n);barbedSegment(w,n,w,s);barbedSegment(e,n,e,s);
  barbedSegment(w,s,gx-gap/2,s);barbedSegment(gx+gap/2,s,e,s);
  compoundClear.push({x:cx,z:cz,r:Math.hypot(hw,hd)*1.02});
};
// construir món
// minimapa
const mc=document.getElementById('mm');
const minimap=window.HUNTER_MINIMAP.create({
  THREE,canvas:mc,worldSize:S,halfSize:H,heightAt:hAt,colorAt:window.HUNTER_TERRAIN.colorAt,
  getState:()=>({base:P.base,hq:HQ,mapKnown:!!inv.mapa,current:cv||P,currentVehicle:cv,vehicles:V,enemies:E,log:logb,intel:intelMarks})
});
const mini=()=>minimap.draw();
// control
let paused=false,muted=false,zoom=1,waypoint=null,elapsed=0,uiTick=0;
const K={},joystick=window.HUNTER_JOYSTICK.create(document.getElementById('joystick')),clearKeys=()=>{Object.keys(K).forEach(k=>K[k]=0);joystick.reset();document.querySelectorAll('[data-k]').forEach(b=>b.classList.remove('held'))};
const act=c=>{if(c==='Escape'||c==='KeyP'){if(started)paused?resume():panel('pause');return}if(c==='KeyM'){if(started)paused?resume():panel('map');return}if(c==='KeyI'){if(started)paused?resume():panel('inventory');return}if(!started||paused||over)return;if(c==='KeyE'){if(cv||nearV())toggle();else panel('inventory')}if(c==='KeyG'){if(!secondaryWeapon())plant();}if(c==='KeyC'){if(inv.disf)setDis(!disg);else{msg='Busca una disfressa dins dels edificis.';msgT=3}}if(c==='KeyL')mark()};
const nearV=()=>{let b=null,bd=Infinity;V.forEach(v=>{const d=Math.hypot(v.x-P.x,v.z-P.z);if((circleVehicleOverlap(P.x,P.z,5,v)||d<vehicleRadius(v.t)+5)&&d<bd){bd=d;b=v}});return b};
function toggle(){if(cv){
const leaving=cv,speed=Math.abs(leaving.v),isAir=VT[leaving.t].m==='a',ground=Math.max(0,hAt(leaving.x,leaving.z)),height=Math.max(0,leaving.alt-ground);
if(isAir&&height>4){
  const fx=-Math.sin(leaving.hd),fz=-Math.cos(leaving.hd),side=rn(-1,1)<0?-1:1;
  P.x=leaving.x+Math.cos(leaving.hd)*side*1.8;P.z=leaving.z-Math.sin(leaving.hd)*side*1.8;P.hd=leaving.hd;P.y=leaving.alt;
  playerFall={y:leaving.alt,vy:0,vx:fx*leaving.v*.82+Math.cos(leaving.hd)*side*2.5,vz:fz*leaving.v*.82-Math.sin(leaving.hd)*side*2.5,startHeight:height,t:0,spin:side};
  leaving.crashing=true;leaving.crashT=0;leaving.crashSpin=rn(-1,1)<0?-1:1;leaving.driveInput=0;leaving.steerInput=0;
  cv=null;swimming=false;msg='Has saltat! L’helicòpter està fora de control!';msgT=3;return
}
const moving=speed>3,side=rn(-1,1)<0?-1:1,rrad=vehicleRadius(leaving.t)+2.2;let spot=null;
for(let i=0;i<16;i++){const a=leaving.hd+side*Math.PI/2+i*Math.PI/8,x=leaving.x+Math.cos(a)*rrad,z=leaving.z+Math.sin(a)*rrad;if(Math.abs(x)>H-3||Math.abs(z)>H-3||treeHit(x,z,1)||Wl.some(w=>!w.open&&x>w.x0-1&&x<w.x1+1&&z>w.z0-1&&z<w.z1+1))continue;spot={x,z};if(hAt(x,z)>0||VT[leaving.t].m==='w')break}
if(!spot){msg='No hi ha espai per baixar aquí.';msgT=3;return}
P.x=spot.x;P.z=spot.z;P.hd=leaving.hd;leaving.driveInput=0;leaving.steerInput=0;
if(moving){const fx=-Math.sin(leaving.hd),fz=-Math.cos(leaving.hd),sx=Math.cos(leaving.hd)*side,sz=-Math.sin(leaving.hd)*side,carry=Math.min(28,speed*.72);playerEject={kind:'flip',vx:fx*carry+sx*1.4,vz:fz*carry+sz*1.4,t:.5,dur:.5,height:.68};hurtP(Math.min(16,2+speed*.28));msg='Has saltat del vehicle en marxa!';msgT=2.5}
cv=null}else{const v=nearV();if(v){cv=v;swimming=false;P.hd=v.hd;msg=VT[v.t].n+' · accelera amb joystick / W';msgT=3}}}
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;act(e.code);if(started&&!paused&&!over)K[e.code]=1});addEventListener('keyup',e=>K[e.code]=0);
let fireHoldTimer=null;
for(const b of document.querySelectorAll('[data-k]')){const c=b.dataset.k;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);act(c);if(started&&!paused&&!over){K[c]=1;b.classList.add('held');if(c==='KeyF'&&cv?.t==='heli_combat'){clearTimeout(fireHoldTimer);fireHoldTimer=setTimeout(()=>{if(K.KeyF&&cv?.t==='heli_combat')secondaryWeapon()},650)}}});for(const v of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(v,()=>{K[c]=0;b.classList.remove('held');if(c==='KeyF'){clearTimeout(fireHoldTimer);fireHoldTimer=null}})}
addEventListener('blur',()=>{clearKeys();if(started&&!paused&&!over)panel('pause')});document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!over)panel('pause')});
ren.domElement.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.7,Math.min(1.9,zoom+e.deltaY*.001))},{passive:false});
let drag=null;ren.domElement.addEventListener('pointerdown',e=>{if(!started||paused||over)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};ren.domElement.setPointerCapture(e.pointerId)});ren.domElement.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||paused)return;const dx=e.clientX-drag.x;const q=cv||P;q.hd-=dx*.006;drag.x=e.clientX});ren.domElement.addEventListener('pointerup',()=>drag=null);ren.domElement.addEventListener('pointercancel',()=>drag=null);
function resume(){paused=false;clearKeys();ui.hide();if(AC&&!muted)AC.resume()}
function panel(mode){paused=true;clearKeys();if(eng)eng.g.gain.value=0;if(AC)AC.suspend();ui.show(mode)}
function useInvItem(id){
  if(!inv[id])return false;
  if(id==='med'){if(hp>=100){msg='Ja tens la vida al màxim.';msgT=2;return false}inv.med--;if(inv.med<=0)delete inv.med;hp=Math.min(100,hp+40);msg='Has usat una farmaciola.';msgT=2;snd('pick');return true}
  if(id==='expl'){if(cv||swimming){msg='No pots col·locar explosius des d’aquí.';msgT=2;return false}resume();plant();return true}
  if(id==='bazooka'){if(cv||swimming){msg='Has d’anar a peu per equipar el bazooka.';msgT=2;return false}bazookaEquipped=!bazookaEquipped;resume();msg=bazookaEquipped?'Bazooka equipat: un sol tret.':'Bazooka desequipat.';msgT=2;return true}
  if(id==='disf'){setDis(!disg);msg=disg?'Disfressa activada.':'Disfressa desactivada.';msgT=2;return true}
  if(id==='mapa'){panel('map');return true}
  if(id==='mapa_tanc'){const tanks=[...V.filter(v=>v.t==='tanc'),...E.filter(u=>u.t==='tanc')];if(!tanks.length){msg='No hi ha tancs actius al mapa.';msgT=2;return false}intelMarks=intelMarks.filter(m=>m.kind!=='tanc');tanks.forEach((v,i)=>intelMarks.push({kind:'tanc',ref:v,label:'Tanc '+(i+1)}));msg='S’han marcat '+tanks.length+' tancs.';msgT=2;panel('map');return true}
  if(id==='mapa_heli'){const helis=V.filter(v=>v.t==='heli'||v.t==='heli_combat');if(!helis.length){msg='No hi ha helicòpters actius al mapa.';msgT=2;return false}intelMarks=intelMarks.filter(m=>m.kind!=='heli');helis.forEach((v,i)=>intelMarks.push({kind:'heli',ref:v,label:(v.t==='heli_combat'?'Helicòpter de combat ':'Helicòpter ')+(i+1)}));msg='S’han marcat '+helis.length+' helicòpters.';msgT=2;panel('map');return true}
  return false
}
function dropInvItem(id){
  if(!inv[id]||id==='arma')return false;inv[id]--;if(inv[id]<=0)delete inv[id];if(id==='disf'&&disg)setDis(false);if(id==='bazooka'&&bazookaEquipped)bazookaEquipped=false;
  msg='Has deixat: '+IT[id].n;msgT=2;return true
}
const ui=window.HUNTER_UI.create({
  hud:document.getElementById('hud'),
  panel:document.getElementById('gamepanel'),
  title:document.getElementById('panelTitle'),
  body:document.getElementById('panelBody'),
  resumeButton:document.getElementById('resumeButton'),
  minimap,
  getState:()=>({
    hp,ammo,kills,vehicle:cv,vehicleTypes:VT,inside:ib,swimming,disguised:disg,bazookaEquipped,
    inventory:inv,itemTypes:IT,player:P,nearVehicle:cv?null:nearV(),messageTime:msgT,message:msg,
    waypoint,worldSize:S,seed,mapScale:MAP_SCALE
  }),
  actions:{
    resume,
    open:mode=>panel(mode),
    setWaypoint:v=>waypoint=v,
    useItem:id=>useInvItem(id),
    dropItem:id=>dropInvItem(id),
    restart:d=>{DIF=d;elapsed=0;build();minimap.reset();mini();resume()},
    zoom:d=>zoom=Math.max(.7,Math.min(1.9,zoom+d))
  }
});
mc.onclick=()=>started&&panel('map');
function vehicleImpactFx(x,y,z){debris(x,y,z,0xffc14d,5,.16,5);puff(x,y,z,0x8a8478,.8)}
function handleVehicleImpacts(v,dt){
  const c=VT[v.t],speed=Math.abs(v.v),radius=vehicleRadius(v.t);v.ramCd=Math.max(0,(v.ramCd||0)-dt);v.envCd=Math.max(0,(v.envCd||0)-dt);v.bump=Math.max(0,(v.bump||0)-dt);
  if(speed<2.5||c.m==='a'||c.m==='w')return;
  if(v.ramCd<=0){
    for(const u of E){if(u.t!=='soldat')continue;const d=Math.hypot(v.x-u.x,v.z-u.z);if(d<radius*.68+u.r*.45){const dmg=Math.min(48,6+speed*2.4);hurtE(u,dmg);damageVehicle(v,dmg*.22,1);if(v.destroyed)return;u.alert=12;v.ramCd=.35;v.v*=.86;msg='Atropellament!';msgT=1;break}}
  }
  if(v.envCd>0)return;
  const t=treeAt(v.x,v.z,radius*.48);if(!t)return;
  if(t.p&&t.alive){killPalm(t);damageVehicle(v,Math.min(18,5+speed*.55),speed>18?2:1);if(v.destroyed)return;v.v*=.9;v.bump=.18;v.envCd=.28;msg='Has tombat una palmera.';msgT=1;return}
  if(t.rock){damageVehicle(v,Math.min(14,4+speed*.45),1);vehicleImpactFx(t.x,Math.max(0,hAt(t.x,t.z))+.8,t.z);if(v.destroyed)return;v.v*=.8;v.bump=.22;v.hd+=rn(-.045,.045);v.envCd=.32;msg='Impacte amb roca!';msgT=1}
}
function stepV(v,f,tr,ud,dt){
const c=VT[v.t],a=c.m==='a',water=c.m==='w'||c.m==='wl',land=c.m==='l',radius=vehicleRadius(v.t),input=window.HUNTER_VEHICLE_DYNAMICS.inputs(v,f,tr,dt);f=input.forward;tr=input.turn;
v.v+=f*c.a*dt;
const dragBase=c.dr*(water?1.08:land?.86:1),coastBoost=Math.abs(f)<.03?(water?1.18:land?1.04:.82):1;
v.v*=Math.max(0,1-dragBase*coastBoost*dt);
v.v=Math.max(-(c.maxR||12),Math.min(c.maxF||40,v.v));

let steerScale=1;
if(land){const speed=Math.abs(v.v),fade=c.steerFade??.4;steerScale=(.35+.65*Math.min(1,speed/9))*(1-fade*Math.min(1,speed/(c.maxF||35))*.55)}
else if(water){const speed=Math.abs(v.v),min=c.waterSteerMin??.2;steerScale=min+(1-min)*Math.min(1,speed/10)}
const targetYaw=tr*c.tu*steerScale*(a?1:(v.v<0?-1:1));
v.yawRate=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.yawRate||0,targetYaw,c.yawResponse||4,dt);
v.hd+=v.yawRate*dt;

let sideV=0;
if(water){
  const drift=(c.waterDrift||0)*v.v*v.yawRate;
  v.sideV=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.sideV||0,drift,2.2,dt);
  sideV=v.sideV;
}else if(land){
  const grip=c.landGrip??.9,slip=(1-grip)*v.v*v.yawRate*.42;
  v.sideV=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.sideV||0,slip,5+grip*5,dt);
  sideV=v.sideV;
}else v.sideV=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.sideV||0,0,4,dt);

const fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),sx=Math.cos(v.hd),sz=-Math.sin(v.hd);
const nx=v.x+(fx*v.v+sx*sideV)*dt,nz=v.z+(fz*v.v+sz*sideV)*dt,raw=hAt(nx,nz),h=land?groundAt(nx,nz):raw,g=Math.max(0,h);let ok=Math.abs(nx)<H-radius&&Math.abs(nz)<H-radius;
if(c.m==='w')ok=ok&&raw<-1.2;if(c.m==='l')ok=ok&&h>-1.2;if(ok&&a&&v.alt-g<8&&treeHit(nx,nz,radius))ok=false;
if(!a||v.alt-g<16){for(const w of Wl)if(!w.open&&w.playerBlock!==false&&nx>w.x0-radius&&nx<w.x1+radius&&nz>w.z0-radius&&nz<w.z1+radius){
  if(w.rammable&&land&&Math.abs(v.v)>3.5&&v.envCd<=0){const speed=Math.abs(v.v);dmgW(w,Math.max(8,speed*2.1));damageVehicle(v,Math.min(12,2+speed*.35),1);vehicleImpactFx(w.cx,Math.max(0,hAt(w.cx,w.cz))+1.1,w.cz);if(v.destroyed)return false;v.v*=.72;v.bump=.14;v.envCd=.22;if(!Wl.includes(w)){msg='Has obert pas a la filferrada.';msgT=1;continue}}
  ok=false;break
}}
if(ok){const test=vehicleBox(v,nx,nz,v.hd),hit=vehicleObstacles(v).find(o=>vehicleHeightCompatible(v,o)&&obbOverlap(test,vehicleBox(o)));if(hit){const rel=Math.abs(v.v-(hit.v||0));const ownMass=c.mass||1,otherMass=VT[vehicleHitType(hit.t)]?.mass||1,ratio=Math.max(.35,Math.min(2.5,otherMass/ownMass));v.v*=rel>5?Math.max(.16,.42/ratio):Math.max(.3,.62/ratio);if('v'in hit)hit.v*=Math.max(.3,.72/Math.max(.5,ownMass/otherMass));if(rel>6){damageVehicle(v,Math.min(18,rel*.7*ratio),1);if(V.includes(hit))damageVehicle(hit,Math.min(18,rel*.55/ratio),1);vehicleImpactFx((v.x+hit.x)/2,Math.max(vehicleY(v),vehicleY(hit))+.5,(v.z+hit.z)/2)}v.bump=.14;v.envCd=.18;ok=false}}
if(ok){v.x=nx;v.z=nz;handleVehicleImpacts(v,dt);if(v.destroyed)return false;if(v.t==='tanc'||v.t==='tanqueta')crush(nx,nz,(v.t==='tanc'?3.2:2.4)*VS[v.t])}else{v.v*=Math.exp(-12*dt);v.sideV*=Math.exp(-10*dt)}
if(a){
  const g2=Math.max(0,hAt(v.x,v.z)),targetVz=ud*(c.climb||24);
  v.verticalV=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.verticalV||0,targetVz,c.liftResponse||2.5,dt);
  if(Math.abs(ud)<.01)v.verticalV*=Math.exp(-1.5*dt);
  v.alt=Math.max(g2+.8,Math.min(150,v.alt+v.verticalV*dt));
}
return !v.destroyed}
function animateTankTracks(v,dt){
  const tracks=v.o?.userData?.tracks;if(!tracks?.length)return;
  const scale=VS[v.t]||1,yaw=v.yawRate||0,halfTrack=2.1;
  for(const track of tracks){
    // Fase positiva = la part superior de l'eruga corre cap enrere (+Z local).
    // En gir pivotant, yaw reparteix velocitats oposades a esquerra/dreta.
    const beltSpeed=v.v/scale+track.side*yaw*halfTrack;
    track.phase=(track.phase+beltSpeed*dt)%track.perimeter;if(track.phase<0)track.phase+=track.perimeter;
    for(const link of track.links){
      let q=(link.userData.trackOffset+track.phase)%track.perimeter;
      let y,z,rx=0;
      if(q<track.straight){
        y=track.cy+track.r;z=track.front+q;rx=0;
      }else if((q-=track.straight)<Math.PI*track.r){
        const a=q/track.r;y=track.cy+track.r*Math.cos(a);z=track.rear+track.r*Math.sin(a);rx=a;
      }else if((q-=Math.PI*track.r)<track.straight){
        y=track.cy-track.r;z=track.rear-q;rx=Math.PI;
      }else{
        q-=track.straight;const a=q/track.r;y=track.cy-track.r*Math.cos(a);z=track.front-track.r*Math.sin(a);rx=Math.PI+a;
      }
      link.position.set(track.x,y,z);link.rotation.set(rx,0,0);
    }
  }
}
function place(v,t,dt,tr){const c=VT[v.t],o=v.o,g=hAt(v.x,v.z);let y,pi=0,ro=Math.sin(t*2+v.x)*.02;
if(c.m==='a'){
  y=v.alt;const speedN=Math.max(-1,Math.min(1,v.v/(c.maxF||35))),yawN=Math.max(-1,Math.min(1,(v.yawRate||0)/(c.tu||1)));
  pi=-speedN*(c.pitch||.2);ro=-yawN*(c.bank||.32);
  if(v.crashing){pi+=Math.sin(v.crashT*3)*.35;ro+=(v.crashSpin||1)*(.45+Math.min(.65,v.crashT*.12))}
}
else if(c.m==='w'){y=wy(v.x,v.z,t)+.2;const speed=Math.min(1,Math.abs(v.v)/(c.maxF||30)),wave=Math.sin(t*2.4+v.x*.03+v.z*.025);pi=wave*.035*speed;ro=-(v.yawRate||0)*.11+wave*.025}
else if(c.m==='wl'){y=Math.max(g,wy(v.x,v.z,t))+.6;ro=-(v.yawRate||0)*.08}
else{y=groundAt(v.x,v.z)+.05;const s2=Math.sin(v.hd),k=Math.cos(v.hd);pi=Math.atan((groundAt(v.x-s2*3,v.z-k*3)-groundAt(v.x+s2*3,v.z+k*3))/6);ro=-(v.sideV||0)*.018}
if(v.bump>0)y+=Math.sin((1-v.bump/.22)*Math.PI)*.34;o.position.set(v.x,y,v.z);o.rotation.set(pi,v.hd,ro);
v.pedalPhase=(v.pedalPhase||0)+v.v*dt/1.5;if(o.userData.crank)o.userData.crank.rotation.x=(v.t==='bici'?-v.pedalPhase:v.pedalPhase);if(o.userData.oars){const power=Math.min(1,Math.abs(v.v)/1.6),rowPhase=v.t==='barca_rems'?-(v.pedalPhase||0):(v.pedalPhase||0),sweep=Math.sin(rowPhase)*.5*power,dip=.12+.18*(.5+.5*Math.cos(rowPhase))*power;o.userData.oars.forEach((r,i)=>{const side=i?1:-1;r.rotation.y=side*sweep;r.rotation.z=-side*(.12+dip);r.rotation.x=.06*Math.sin(rowPhase)})}if(o.userData.rotor)o.userData.rotor.rotation.y+=dt*(v===cv?30:v.crashing?Math.max(5,26-(v.crashT||0)*4):0);if(o.userData.fan)o.userData.fan.rotation.z+=dt*(v===cv?35:0);if(o.userData.tailRotor)o.userData.tailRotor.rotation.x+=dt*(v===cv?40:v.crashing?Math.max(7,32-(v.crashT||0)*5):0);if(v.t==='tanc')animateTankTracks(v,dt);(o.userData.wheels||[]).forEach(w=>{const side=w.userData.trackSide;if(v.t==='tanc'&&side){const sideSpeed=v.v+side*(v.yawRate||0)*2.1*(VS[v.t]||1);w.rotation.x-=sideSpeed*dt/(w.userData.radius||.6)}else w.rotation.x-=v.v*dt/(w.userData.radius||.6)})}
function update(dt,t){if(!started||paused||over){if(eng)eng.g.gain.value=0;return}elapsed+=dt;const jf=-joystick.state.y,jtr=-joystick.state.x,f=Math.max(-1,Math.min(1,(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0)+jf)),tr=Math.max(-1,Math.min(1,(K.KeyA||K.ArrowLeft?1:0)-(K.KeyD||K.ArrowRight?1:0)+jtr)),
ud=(K.KeyU||K.Space?1:0)-(K.KeyJ||K.ShiftLeft?1:0),lim=H-2;
if(cv){const driven=cv,alive=stepV(driven,f,tr,ud,dt);if(alive&&cv===driven){P.x=driven.x;P.z=driven.z;P.hd=driven.hd}}
else{P.hd+=tr*dt*2.2;if(playerFall){playerFall.t+=dt;playerFall.vy-=24*dt;playerFall.vx*=Math.exp(-.18*dt);playerFall.vz*=Math.exp(-.18*dt);P.x=Math.max(-lim,Math.min(lim,P.x+playerFall.vx*dt));P.z=Math.max(-lim,Math.min(lim,P.z+playerFall.vz*dt));playerFall.y+=playerFall.vy*dt;const water=wy(P.x,P.z,t),landing=Math.max(hAt(P.x,P.z),water-1.4);P.y=playerFall.y;if(playerFall.y<=landing){P.y=landing;const fallH=playerFall.startHeight,impact=Math.max(0,-playerFall.vy),waterLanding=water>hAt(P.x,P.z)+1.5,dmg=Math.min(100,Math.max(0,(fallH-4)*(waterLanding?.42:.9)+Math.max(0,impact-12)*(waterLanding?.45:.8)));playerFall=null;if(dmg>0)hurtP(dmg);msg=waterLanding?'Has caigut a l’aigua.':'Has impactat contra el terra!';msgT=2.5}}
else if(playerEject&&playerEject.t>0){P.x=Math.max(-lim,Math.min(lim,P.x+playerEject.vx*dt));P.z=Math.max(-lim,Math.min(lim,P.z+playerEject.vz*dt));playerEject.vx*=Math.exp(-2.4*dt);playerEject.vz*=Math.exp(-2.4*dt);playerEject.t=Math.max(0,playerEject.t-dt)}else{const ss=(swimming?5:12)*f*dt;P.x=Math.max(-lim,Math.min(lim,P.x-Math.sin(P.hd)*ss));P.z=Math.max(-lim,Math.min(lim,P.z-Math.cos(P.hd)*ss))}
if(!playerFall){wallPush();treePush();vehiclePushPlayer()}}
V.slice().forEach(v=>{if(v===cv)return;if(v.crashing){v.crashT=(v.crashT||0)+dt;v.hd+=(v.crashSpin||1)*(1.8+v.crashT*.35)*dt;v.v*=Math.exp(-.12*dt);v.x-=Math.sin(v.hd)*v.v*dt;v.z-=Math.cos(v.hd)*v.v*dt;const ground=Math.max(0,hAt(v.x,v.z)),water=wy(v.x,v.z,t),impactY=Math.max(ground,water);v.alt-=(5+v.crashT*8)*dt;if(v.alt<=impactY+1){v.alt=impactY+.8;explodeVehicle(v)}return}if(Math.abs(v.v)>.08){v.driveInput=0;v.steerInput=0;stepV(v,0,0,0,dt);if(Math.abs(v.v)<.08)v.v=0}});
ib=cv?null:B.find(b=>Math.abs(P.x-b.x)<b.w/2&&Math.abs(P.z-b.z)<b.d/2)||null;
const floor=ib?ib.fy+.3:groundAt(P.x,P.z),surface=wy(P.x,P.z,t);swimming=!cv&&!ib&&!playerFall&&floor<surface-2.1;if(!playerFall)P.y=ib?floor:Math.max(floor,surface-2.1);
B.forEach(b=>{const i=b===ib;b.o.visible=i||Math.hypot(b.x-P.x,b.z-P.z)<1800;b.roof.visible=!i&&b.rhp>0;b.wm.opacity=b.dm.opacity=i?.18:1});
Dr.forEach(d=>{const o=d.alwaysOpen||(!d.locked&&!cv&&Math.hypot(P.x-d.cx,P.z-d.cz)<(d.open?6:4.5));d.open=o;d.m.visible=!o});
items.forEach(it=>{it.o.rotation.y=t*2;it.o.position.y=it.y+Math.sin(t*3+it.x)*.25});
if(!cv)for(let k=items.length-1;k>=0;k--){const it=items[k];if(Math.hypot(P.x-it.x,P.z-it.z)<2.2&&Math.abs(P.y-it.y)<3){if(it.t=='arma')ammo+=40;inv[it.t]=(inv[it.t]||0)+1;world.remove(it.o);items.splice(k,1);msg='Has trobat: '+IT[it.t].n;msgT=3;snd('pick')}}
msgT-=dt;pl.position.set(P.x,P.y,P.z);pl.rotation.y=P.hd;pl.visible=!cv;animPl(cv?0:f,dt);
if(!cv&&playerFall){pl.position.y=playerFall.y;pl.rotation.x=(playerFall.spin||1)*playerFall.t*7.5;pl.rotation.z=Math.sin(playerFall.t*8)*.45}
else if(!cv&&playerEject&&playerEject.t>=0){
  const dur=playerEject.dur||.5,p=Math.max(0,Math.min(1,1-playerEject.t/dur)),u=pl.userData;
  if(playerEject.kind==='flip'){
    // Una sola volta completa. L'últim frame és exactament dret, sense correcció posterior.
    const turn=p>=1?0:-Math.PI*2*p,waistLocal=2.05,waistScaled=waistLocal*pl.scale.y;
    pl.rotation.x=turn;pl.rotation.z=0;
    const waistOffset=new THREE.Vector3(0,waistScaled,0).applyQuaternion(pl.quaternion);
    pl.position.x-=waistOffset.x;
    pl.position.y+=waistScaled-waistOffset.y+Math.sin(Math.PI*p)*(playerEject.height||.68);
    pl.position.z-=waistOffset.z;
    const compact=1-Math.pow(p,8);
    if(u.al)u.al.rotation.x=.58*compact;if(u.ar)u.ar.rotation.x=.58*compact;
    if(u.ael)u.ael.rotation.x=.5*compact;if(u.aer)u.aer.rotation.x=.5*compact;
    if(u.ll)u.ll.rotation.x=-.28*compact;if(u.lr)u.lr.rotation.x=-.28*compact;
    if(u.lkl)u.lkl.rotation.x=-.5*compact;if(u.lkr)u.lkr.rotation.x=-.5*compact;
  }
}
V.forEach(v=>place(v,t,dt,v===cv?(v.steerInput||0):0));poseRider(cv,dt);
const T=cv||P,c=cv?VT[cv.t]:ib?{cd:6,ch:11}:{cd:10,ch:5},ty=cv?cv.o.position.y:P.y,w=new THREE.Vector3(T.x+Math.sin(T.hd)*c.cd*zoom*(cv?Math.sqrt(VS[cv.t]):1),0,T.z+Math.cos(T.hd)*c.cd*zoom*(cv?Math.sqrt(VS[cv.t]):1));
w.y=Math.max(ty+c.ch*zoom*(cv?Math.sqrt(VS[cv.t]):1),hAt(w.x,w.z)+3,2.5);
cam.position.lerp(w,1-Math.pow(.001,dt));
cam.lookAt(T.x-Math.sin(T.hd)*8,ty+2,T.z-Math.cos(T.hd)*8);
if(playerEject&&playerEject.t<=0)playerEject=null;
fcd-=dt;if(K.KeyF)fire();updEn(dt);updDead(dt);updPj(dt);updFx(dt);updExtra(dt,t);
const nv=cv?null:nearV();
uiTick+=dt;if(uiTick>.12){uiTick=0;const contextButtons=document.getElementById('contextButtons');if(contextButtons)contextButtons.classList.toggle('heli-active',!!cv&&VT[cv.t]?.m==='a');mini();ui.renderHUD();}}


let last=performance.now();
(function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;const t=elapsed+(started&&!paused&&!over?dt:0);update(dt,t);waves(t);
sun.target.position.set(P.x,0,P.z);sun.position.copy(sun.target.position).addScaledVector(sunDir,500);sky.position.copy(cam.position);sunM.position.copy(cam.position).addScaledVector(sunDir,3500);if(rendering.glow)rendering.glow.position.copy(sunM.position);ren.render(scene,cam);requestAnimationFrame(loop)})(last);
