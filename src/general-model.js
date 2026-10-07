window.HUNTER_GENERAL_MODEL=Object.freeze({create(T,{palette=window.HUNTER_PALETTE}={}){
 const index=1;
 const g=HUNTER_PLAYER_MODEL.create(T,{palette}),u=g.userData,h=u.head;
 const cfg={name:'ESTAT MAJOR',coat:0x681d30,lapel:0xda3143,hat:0x7e2030,hem:.92};
 const gold=0xe9bc52,dark=0x202327,skin=0xc99370;
 // Keep the current player rig and latest shoulder/elbow proportions; replace equipment with a coat.
 const joints=new Set([u.ll,u.lr,u.al,u.ar,h]);
 for(const o of [...g.children])if(!joints.has(o))g.remove(o);
 for(const [m,,]of u.mats)m.color.setHex(cfg.coat);
 g.traverse(o=>{if(o.isMesh&&o.material.color.getHex()===0xf0c9a0)o.material.color.setHex(skin)});
 h.remove(u.cap,u.visor);for(const o of [...h.children])if(o.material?.color.getHex()===0x162021)h.remove(o);
 const mats=new Map(),mat=c=>{if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:c===gold?.43:.86,metalness:c===gold?.45:0,flatShading:true}));return mats.get(c)};
 const mesh=(pa,geo,c,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;pa.add(m);return m};
 const box=(pa,w,hh,d,c,x,y,z)=>mesh(pa,new T.BoxGeometry(w,hh,d),c,x,y,z);
 const oval=(pa,rx,ry,rz,c,x,y,z)=>{const m=mesh(pa,new T.SphereGeometry(1,12,6),c,x,y,z);m.scale.set(rx,ry,rz);return m};
 function taper(pa,top,bottom,height,depth,c,x,y,z){const geo=new T.CylinderGeometry(1,1,height,4,1,false,Math.PI/4);const a=geo.attributes.position;for(let i=0;i<a.count;i++){const upper=a.getY(i)>0;a.setX(i,a.getX(i)*(upper?top:bottom)/Math.SQRT2);a.setZ(i,a.getZ(i)*depth/Math.SQRT2)}geo.computeVertexNormals();return mesh(pa,geo,c,x,y,z)}
 taper(g,1.05,.86,1.17,.69,cfg.coat,0,2.32,0);
 mesh(g,new T.CylinderGeometry(.16,.18,.28,10),skin,0,3.02,0);
 // Split tails follow each thigh so the knees can flex below the coat.
 for(const side of[-1,1]){
  const hip=side<0?u.ll:u.lr,length=1.73-cfg.hem;
  taper(hip,.44,.58,length,.76,cfg.coat,side*.008,-length/2,.015);
  box(hip,.43,.045,.11,cfg.lapel,side*.02,-length+.15,-.402);
  const lapel=box(g,.22,.61,.07,cfg.lapel,side*.24,2.65,-.386);lapel.rotation.z=-side*.40;
  const collar=box(g,.23,.17,.36,cfg.lapel,side*.19,2.98,-.05);collar.rotation.z=-side*.24;
  const arm=side<0?u.al:u.ar;
  // Muscleres unides al pivot del braç: cobreixen l'espatlla també en flexió.
  box(arm,.38,.14,.38,gold,0,.115,0);
  box(arm,.30,.022,.30,0xf8d575,0,.196,0);
  for(let j=0;j<4;j++)box(arm,.027,.11,.024,gold,side*.187,.013,-.115+j*.076);
  const elbow=side<0?u.ael:u.aer;
  for(const y of[-.40,-.455])box(elbow,.27,.025,.29,gold,0,y,0);
 }
 box(g,.94,.13,.76,dark,0,1.86,0);box(g,.19,.15,.045,gold,0,1.86,-.401);box(g,.10,.08,.053,dark,0,1.86,-.415);
 // Double-breasted buttons and ten actual medal meshes, not a texture.
 for(const x of[-.10,.10])for(const y of[2.04,2.22,2.40])oval(g,.029,.029,.015,gold,x,y,-.395);
 const ribbon=[0xc52838,0x285880,0xd5d5bd,0x318562,0x553b82];
 for(let row=0;row<2;row++)for(let j=0;j<5;j++){
  const x=.08+j*.073,y=2.70-row*.21;
  box(g,.055,.09,.024,ribbon[(j+index)%5],x,y,-.445);
  const medal=mesh(g,new T.CylinderGeometry(.032,.032,.018,j%2?6:10),gold,x,y-.068,-.463);medal.rotation.x=Math.PI/2;
 }
 for(let j=0;j<3;j++)for(let k=0;k<3;k++)box(g,.065,.025,.025,ribbon[(j+k)%5],-.34+j*.07,2.64-k*.045,-.449);
 if(index===1||index===3){const cord=mesh(g,new T.TorusGeometry(.19,.018,5,14,Math.PI),gold,-.34,2.55,-.45);cord.rotation.z=Math.PI}
 // Broad, flat officer's cap with a dark band, peak and gold badge.
 const band=mesh(h,new T.CylinderGeometry(.346,.35,.13,14),dark,0,.22,0);band.scale.z=.97;
 const crown=mesh(h,new T.CylinderGeometry(index===1?.455:.43,.345,.17,14),cfg.hat,0,.36,0);crown.scale.z=.95;crown.rotation.x=-.07;
 oval(h,.32,.04,.28,dark,0,.16,-.29);
 const braid=mesh(h,new T.TorusGeometry(.285,.015,5,16,Math.PI),gold,0,.225,-.028);braid.rotation.x=Math.PI/2;
 box(h,.095,.09,.036,gold,0,.30,-.35);
 // Aviator teardrop lenses with visible metallic frames and double bridge.
 function lens(pa,side,c,scale,z){const shape=new T.Shape();shape.moveTo(-.12,.065);shape.quadraticCurveTo(.05,.11,.14,.05);shape.quadraticCurveTo(.14,-.08,.04,-.125);shape.quadraticCurveTo(-.11,-.13,-.13,-.025);shape.closePath();const m=mesh(pa,new T.ShapeGeometry(shape,5),c,side*.16,.055,z);m.scale.set(scale,scale,1);m.rotation.y=Math.PI;return m}
 for(const side of[-1,1]){lens(h,side,gold,1,-.348);lens(h,side,index===2?0x52656c:0x202c30,.84,-.355);box(h,.025,.025,.24,gold,side*.325,.09,-.23)}
 for(const y of[.09,.045])box(h,.08,.018,.025,gold,0,y,-.357);
 // Thick moustache, separated from the glasses and extending past the nose.
 for(const side of[-1,1]){const must=oval(h,.155,.065,.062,index===3?0x574338:0x30221b,side*.115,-.142,-.309);must.rotation.z=side*-.10;}
 // Keep the general's existing weapon and enemy-animation contracts.
 const gun=new T.Group();gun.position.set(0,-.6195,-.035);gun.rotation.x=-Math.PI/2;u.aer.add(gun);
 box(gun,.16,.2,1.5,palette.enemy.metal,0,0,-.25);box(gun,.18,.36,.25,dark,0,-.24,0);box(gun,.18,.2,.45,0x66513c,0,0,.55);
 u.gun=gun;u.legs=[u.ll,u.lr];u.arms=[u.al,u.ar];u.knees=[u.lkl,u.lkr];u.elbows=[u.ael,u.aer];
 u.profile='general-approved-thick-epaulettes';
 // Match the previous general's world height; keep scale=1 for the existing game contract.
 g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g),fit=3.55/(bounds.max.y-bounds.min.y);
 for(const child of g.children)child.position.y-=bounds.min.y;
 g.traverse(o=>{if(o!==g)o.position.multiplyScalar(fit);if(o.isMesh)o.geometry.scale(fit,fit,fit)});
 return g;
}});
