// Model tàctic aprovat: cos únic per al jugador i els conductors.
// Eix frontal -Z; la flexió anatòmica dels genolls és negativa en X.
window.HUNTER_PLAYER_MODEL=Object.freeze({
 create(T,{unitScale=1,palette=window.HUNTER_PALETTE}={}){
 
 const p={chest:1.04,waist:.76,head:.44,arm:.27,leg:.35,pack:.66};
 const g=new T.Group(),u=g.userData;u.boots=[];
 const colors={green:0x3ee43a,lime:0x72f05a,dark:0x18271e,olive:0x46602d,skin:0xf0c9a0,black:0x162021};
 const mats=new Map(),mat=(c)=>{if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.9,metalness:0,flatShading:true}));return mats.get(c)};
 function mesh(parent,geo,c,x=0,y=0,z=0){const m=new T.Mesh(geo,mat(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
 const box=(pa,w,h,d,c,x,y,z)=>mesh(pa,new T.BoxGeometry(w,h,d),c,x,y,z);
 const oval=(pa,xr,yr,zr,c,x,y,z,seg=10)=>{const m=mesh(pa,new T.SphereGeometry(1,seg,6),c,x,y,z);m.scale.set(xr,yr,zr);return m};
 const segment=(pa,top,bottom,h,depth,c,x,y,z)=>{const m=mesh(pa,new T.CylinderGeometry(top,bottom,h,8),c,x,y,z);m.scale.z=depth;return m};
 function torsoShape(width,waist,h,depth,c,y){
  const a=width/2,b=waist/2,d=depth/2,k=.15;
  const ring=w=>[[-w+k,-d], [w-k,-d],[w,-d+k],[w,d-k],[w-k,d],[-w+k,d],[-w,d-k],[-w,-d+k]];
  const lo=ring(b),hi=ring(a),pts=[],indices=[];
  for(const [x,z]of lo)pts.push(x,-h/2,z);for(const[x,z]of hi)pts.push(x,h/2,z);
  for(let j=0;j<8;j++){const n=(j+1)%8;indices.push(j,n,n+8,j,n+8,j+8)}for(let j=1;j<7;j++){indices.push(0,j+1,j,8,8+j,8+j+1)}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));geo.setIndex(indices.reverse());geo.computeVertexNormals();return mesh(g,geo,c,0,y,0);
 }
 // Cames articulades; peu a y=0 i maluc a 1.72.
 for(const side of[-1,1]){
  const hip=new T.Group();hip.position.set(side*.265,1.73,0);g.add(hip);
  segment(hip,p.leg*.58,p.leg*.48,.77,1.12,colors.green,0,-.37,0);
  const knee=new T.Group();knee.position.y=-.75;hip.add(knee);
  segment(knee,p.leg*.49,p.leg*.4,.68,1.12,colors.green,0,-.33,0);
  box(knee,p.leg*.91,.28,.13,colors.olive,0,-.02,-p.leg*.55);
  // Anatomical boot: narrow ankle, sloped instep, rounded toe and separate heel.
  const boot=new T.Group();knee.add(boot);u.boots.push(boot);
  const bootColor=0x202d28;
  segment(boot,.14,.16,.31,1.1,bootColor,0,-.68,.025);
  const outline=[[-.13,.16],[.13,.16],[.17,.02],[.18,-.27],[.12,-.36],[-.12,-.36],[-.18,-.27],[-.17,.02]];
  const points=[],idx=[];
  for(const level of[0,1])for(const[x,z]of outline){points.push(x,level?(-.77+(z>.0?.075:0)):-.89,z)}
  for(let j=0;j<8;j++){let n=(j+1)%8;idx.push(j,n,n+8,j,n+8,j+8)}
  for(let j=1;j<7;j++){idx.push(0,j+1,j,8,8+j,8+j+1)}
  const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(points,3));bg.setIndex(idx);bg.computeVertexNormals();
  // Outline is clockwise when viewed from above: these faces point outward.
  mesh(boot,bg,bootColor);
  const soleShape=new T.Shape();outline.forEach(([x,z],j)=>j?soleShape.lineTo(x,-z):soleShape.moveTo(x,-z));soleShape.closePath();
  const sole=mesh(boot,new T.ExtrudeGeometry(soleShape,{depth:.045,bevelEnabled:false}),0x121b17,0,-.92,0);sole.rotation.x=-Math.PI/2;
  box(boot,.25,.055,.16,0x111914,0,-.925,.075);
  for(let j=0;j<3;j++){const lace=box(boot,.16,.018,.024,0x87856d,0,-.74-j*.021,-.035-j*.055);lace.rotation.x=.3}
  boot.children.forEach(o=>o.position.y+=.82);boot.position.y=-.82;
  oval(knee,p.leg*.44,.13,p.leg*.46,colors.green,0,0,0,8);
  u[side<0?'ll':'lr']=hip;u[side<0?'lkl':'lkr']=knee;
 }
 torsoShape(p.chest,p.waist,1.23,.61,colors.green,2.31);
 box(g,p.waist+.08,.15,.65,colors.dark,0,1.77,0);box(g,.19,.13,.055,0xb1b48a,0,1.78,-.355);
  torsoShape(p.chest+.05,p.waist+.06,.94,.76,0x314d27,2.35);
  for(const x of[-.30,0,.30]){
   box(g,.25,.34,.14,0x395333,x,2.12,-.44);
   box(g,.26,.055,.155,colors.olive,x,2.29,-.445);
  }
  for(const y of[2.46,2.55])box(g,.70,.035,.04,0x708854,0,y,-.405);
  for(const x of[-.34,.34])box(g,.18,.25,.16,colors.olive,x,2.87,-.26);
  box(g,.26,.12,.025,colors.lime,.24,2.66,-.405);

 // Motxilla diferenciada i tirants (vista posterior també renderitzada).
 {box(g,p.pack,1.02,.38,colors.olive,0,2.31,.48);box(g,p.pack*.86,.32,.12,0x607b38,0,2.11,.72);box(g,p.pack+.02,.16,.41,0x607b38,0,2.87,.49)}
 for(const x of[-.3,.3])box(g,.1,1.1,.09,colors.dark,x,2.33,.35);
 // Braços amb espatlla i colze; postura neutra comuna.
 for(const side of[-1,1]){
  const shoulder=new T.Group();shoulder.position.set(side*.57,2.90,0);shoulder.rotation.z=side*.12;g.add(shoulder);
  oval(shoulder,p.arm*.65,.22,p.arm*.65,colors.lime,0,-.11,0,8);
  segment(shoulder,p.arm*.57,p.arm*.49,.567,1,colors.green,0,-.336,0);
  const elbow=new T.Group();elbow.position.y=-.63;elbow.rotation.x=-.08;elbow.rotation.z=side*.04;shoulder.add(elbow);
  segment(elbow,p.arm*.49,p.arm*.38,.525,1,colors.green,0,-.252,0);
  oval(elbow,.13,.16,.135,colors.dark,0,-.62,-.025,8);
  oval(elbow,p.arm*.45,.115,p.arm*.46,colors.green,0,0,0,8);
  oval(elbow,.12,.14,.05,colors.olive,0,.01,.12,8);
  u[side<0?'al':'ar']=shoulder;u[side<0?'ael':'aer']=elbow;
 }
 segment(g,.16,.18,.28,1,colors.skin,0,3.02,0);
 const head=new T.Group();head.position.set(0,3.38,0);g.add(head);u.head=head;
 oval(head,p.head*.78,p.head,p.head*.77,colors.skin,0,0,0,12);
 // Petit nas, orelles, clatell: silhouettes lisibles sense textures.
 oval(head,.075,.085,.10,colors.skin,0,-.03,-p.head*.77,8);
 for(const side of[-1,1])oval(head,.07,.12,.065,colors.skin,side*p.head*.78,-.015,.02,8);
 // Hair follows the skull below the cap, with an irregular tapered edge and exposed ears.
 const hairColor=0x63432b;
 const hp=[],hi=[],n=18;
 for(let r=0;r<3;r++)for(let j=0;j<=n;j++){
  const angle=-1.52+j/n*3.04;
  const edge=-.09 + .045*Math.cos(angle*3+3) + (Math.abs(angle)>1.18?.095:0);
  const y=r===0?.30:r===1?.12:edge;
  const rad=Math.sqrt(Math.max(.01,1-(y/.45)**2));
  hp.push(Math.sin(angle)*.356*rad,y,Math.cos(angle)*.35*rad+.012);
 }
 for(let r=0;r<2;r++)for(let j=0;j<n;j++){const a=r*(n+1)+j,b=a+n+1;hi.push(a,b,a+1,a+1,b,b+1)}
 const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(hp,3));hg.setIndex(hi);hg.computeVertexNormals();mesh(head,hg,hairColor);
 for(const side of[-1,1]){
  oval(head,.036,.105,.066,hairColor,side*.333,.105,-.024,8);
 }
 // Close-fitting cap; the edge hugs the skull and covers the hair roots.
 const capSettings={y:.195,r:.334,h:.265,length:.40,drop:.035};
 const c=capSettings;
 const cap=mesh(head,new T.SphereGeometry(1,16,7,0,Math.PI*2,0,Math.PI/2),colors.green,0,c.y,0);cap.scale.set(c.r,c.h,c.r*.99);
 // A rounded, slightly downturned bill, rather than a rectangular slab.
 const vp=[],vi=[],steps=12;
 for(let j=0;j<=steps;j++){
  const t=-Math.PI/2+j/steps*Math.PI,x=Math.sin(t)*.305,z=-.205-Math.cos(t)*c.length;
  const drop=c.drop*Math.cos(t);
  vp.push(x,c.y-.014,-.16,x,c.y-.014-drop,z,x,c.y-.047-drop,z,x,c.y-.047,-.16);
 }
 for(let j=0;j<steps;j++)for(let k=0;k<4;k++){const a=j*4+k,b=(j+1)*4+k,n=(k+1)%4;vi.push(a,b,j*4+n,b,(j+1)*4+n,j*4+n)}
 const vg=new T.BufferGeometry();vg.setAttribute('position',new T.Float32BufferAttribute(vp,3));vg.setIndex(vi);vg.computeVertexNormals();const bill=mesh(head,vg,colors.green);u.visor=bill;u.cap=cap;bill.material=new T.MeshStandardMaterial({color:colors.green,roughness:.9,flatShading:true,side:T.DoubleSide});
 for(const side of[-1,1]){box(head,p.head*.61,.14,.06,colors.black,side*p.head*.37,.065,-p.head*.73);box(head,.04,.045,.28,colors.black,side*p.head*.72,.09,-p.head*.45)}
 box(head,.09,.045,.06,colors.black,0,.08,-p.head*.8);
 {box(head,.085,.2,.1,colors.black,.4,-.03,.02);box(head,.04,.04,.22,colors.black,.35,-.16,-.1)}
 // Bake the requested unit size into geometry and pivots, keeping animation rotations intact.
 g.traverse(o=>{if(o!==g)o.position.multiplyScalar(unitScale);if(o.isMesh)o.geometry.scale(unitScale,unitScale,unitScale)});
 u.mats=[];
 const swaps=new Map([[colors.green,palette.enemy.primary],[colors.lime,palette.enemy.general],
  [0x314d27,palette.enemy.vest],[0x395333,palette.enemy.secondary],[colors.olive,palette.enemy.vest],
  [0x607b38,palette.enemy.secondary],[0x708854,palette.enemy.secondary]]);
 for(const [color,m]of mats)if(swaps.has(color))u.mats.push([m,color,swaps.get(color)]);
 u.mats.push([bill.material,colors.green,palette.enemy.primary]);
 u.profile='tactic-approved-long-visor';u.forwardAxis='-Z';u.kneeFlexionSign=-1;
 u.hipHeight=1.73*unitScale;
 return g;
 }
});
