// Quatre estudis del camió militar 4x4 inspirats en el MAN HX60.
// Només per a la pàgina de comparació: no modifica el vehicle del joc.
export const truckConcepts=Object.freeze([
  {id:'A',name:'HX60 · Fidel al referent',tag:'Cabina original + lona',description:'Cabina avançada, parabrisa ample inclinat, defensa amb cabrestant, rodes de camp i lona tensada amb corretges.',
    cab:0x626c58,canvas:0x8d887e,roof:0x59624f,accent:0xd4a352,trim:0x313935},
  {id:'B',name:'HX60 · Patrulla reforçada',tag:'Proteccions + sostre baix',description:'Frontal protegit, reixa als fars, barra exterior, llums tàctics i lona baixa de color verd fosc.',
    cab:0x475344,canvas:0x596554,roof:0x3f4b3c,accent:0xd2a44b,trim:0x272f2a},
  {id:'C',name:'HX60 · Logístic de campanya',tag:'Caixa oberta + material',description:'Tendaló replegat, caixes de subministrament visibles, laterals abatibles i acabat militar color arena.',
    cab:0xb0a17d,canvas:0x898876,roof:0xa89976,accent:0xe3b358,trim:0x48483f},
  {id:'D',name:'HX60 · Expedició tot terreny',tag:'Lona alta + equipament',description:'Cabina amb presa d’aire elevada, roda de recanvi, escala posterior, sostre reforçat i lona amb panells de camuflatge.',
    cab:0x535f4c,canvas:0x757f69,roof:0x4b5946,accent:0xdfa950,trim:0x303b32}
]);

export function createTruckConcept(T,variant=0){
 const cfg=truckConcepts[variant];if(!cfg)throw new Error('Proposta de camió desconeguda');
 const g=new T.Group();g.name='MAN HX60 · proposta '+cfg.id;
 const material=(hex,roughness=.79,metalness=.05)=>new T.MeshStandardMaterial({color:hex,roughness,metalness,flatShading:true,side:T.DoubleSide});
 const body=material(cfg.cab),roof=material(cfg.roof),trim=material(cfg.trim,.67,.21),
   canvas=material(cfg.canvas,.94),canvasLight=material(new T.Color(cfg.canvas).multiplyScalar(1.085).getHex(),.95),
   canvasDark=material(new T.Color(cfg.canvas).multiplyScalar(.86).getHex(),.95),
   glass=material(0x263e4b,.19,.18),frame=material(0x292d28),rubber=material(0x242825,.92),
   hub=material(0x444940,.64,.3),steel=material(0x74796c,.52,.35),lamp=material(0xf4e2b4,.33),
   amber=material(cfg.accent,.46),red=material(0xa02e27,.39),wood=material(0x655d4c,.93);
 function part(geo,m,parent=g){const obj=new T.Mesh(geo,m);obj.castShadow=obj.receiveShadow=true;parent.add(obj);return obj}
 function box(w,h,d,m,x,y,z,parent=g){const o=part(new T.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o}
 function rod(a,b,r,m=trim,parent=g){const aa=new T.Vector3(...a),bb=new T.Vector3(...b),v=bb.clone().sub(aa),o=part(new T.CylinderGeometry(r,r,v.length(),8),m,parent);o.position.copy(aa.add(bb).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o}
 function face(vertices,m,parent=g){const p=[],idx=[];for(const v of vertices)p.push(...v);for(let i=1;i<vertices.length-1;i++)idx.push(0,i,i+1);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();return part(geo,m,parent)}
 function cyl(r,h,m,x,y,z,axis='x',parent=g){const o=part(new T.CylinderGeometry(r,r,h,18),m,parent);o.position.set(x,y,z);if(axis==='x')o.rotation.z=Math.PI/2;else if(axis==='z')o.rotation.x=Math.PI/2;return o}
 function wheel(x,z){
   const w=new T.Group();w.position.set(x,.88,z);g.add(w);
   // Pneumàtic de perfil alt i banda de rodament amb tacs en ziga-zaga.
   cyl(.86,.44,rubber,0,0,0,'x',w);
   for(const side of[-1,1]){
     cyl(.67,.042,rubber,side*.245,0,0,'x',w);
     cyl(.43,.05,hub,side*.274,0,0,'x',w);
     cyl(.28,.062,trim,side*.305,0,0,'x',w);
     cyl(.14,.075,steel,side*.34,0,0,'x',w);
     for(let i=0;i<8;i++){
       const a=i*Math.PI/4;
       cyl(.033,.038,steel,side*.335,Math.cos(a)*.34,Math.sin(a)*.34,'x',w)
     }
   }
   for(let k=0;k<22;k++){
     const a=k*Math.PI/11,y=Math.sin(a)*.858,zp=Math.cos(a)*.858;
     for(const xSide of[-.135,.135]){
       const tread=box(.21,.17,.30,rubber,xSide,y,zp,w);
       tread.rotation.x=-a+(xSide>0?.17:-.17)
     }
   }
   return w
 }
 for(const z of[-2.68,2.73])for(const x of[-1.62,1.62])wheel(x,z);

 // Bastidor d'escala, ballestes, eixos, dipòsits i parafangs.
 for(const x of[-1.06,1.06])box(.19,.28,7.65,trim,x,1.18,.02);
 for(const z of[-3.25,-1.32,.32,1.72,3.28])box(2.36,.14,.16,steel,0,1.12,z);
 for(const z of[-2.68,2.73]){
   rod([-1.62,.89,z],[1.62,.89,z],.11,hub);
   for(const x of[-1.07,1.07]){box(.20,.12,1.63,hub,x,1.01,z);for(const p of[-.48,.48])rod([x,1.13,z+p],[x,.90,z],.042,steel)}
   // Parafangs segmentats: només la meitat superior de cada roda.
   for(const sign of[-1,1])for(let j=0;j<10;j++){
     const a=Math.PI*j/10,b=Math.PI*(j+1)/10,mid=(a+b)/2;
     const x=sign*1.60,ya=.88+Math.sin(a)*1.03,za=z+Math.cos(a)*1.03,
       yb=.88+Math.sin(b)*1.03,zb=z+Math.cos(b)*1.03;
     rod([x,ya,za],[x,yb,zb],.065,body)
   }
 }
 for(const sign of[-1,1]){
   box(.55,.49,1.45,trim,sign*1.29,1.26,.18);
   box(.65,.12,1.58,steel,sign*1.28,.92,.16);
   box(.73,.51,1.12,body,sign*1.22,1.25,1.48);
   box(.52,.04,.9,trim,sign*1.23,1.52,1.48);
   for(const z of[-.96,-.65,-.34])box(.72,.065,.19,steel,sign*1.22,1.10,z)
 }

 // Cabina avançada: capó curt (en realitat, frontal vertical), muntants,
 // portes, parabrisa escairat i línia de sostre amb una mica de caiguda.
 box(2.80,1.10,2.15,body,0,1.93,-2.55);
 box(2.80,1.23,1.78,body,0,3.07,-2.58);
 box(2.93,.18,2.03,roof,0,3.73,-2.58);
 box(2.63,.09,1.84,trim,0,3.83,-2.56);
 // Cantonades del frontal i protecció de la part baixa del parabrisa.
 for(const sign of[-1,1]){
   face([[sign*1.40,2.42,-3.65],[sign*1.24,2.42,-3.79],[sign*1.24,3.50,-3.59],[sign*1.40,3.52,-3.39]],body);
   const sx=sign*1.434;
   face([[sx,2.57,-3.35],[sx,3.42,-3.16],[sx,3.42,-2.21],[sx,2.55,-2.16]],glass);
   for(const [y1,z1,y2,z2]of[[2.57,-3.35,3.42,-3.16],[3.42,-3.16,3.42,-2.21],[3.42,-2.21,2.55,-2.16]])
     rod([sx,y1,z1],[sx,y2,z2],.033,frame);
   rod([sx,2.55,-2.16],[sx,2.48,-2.16],.032,frame);
   box(.042,.05,1.58,trim,sx,2.42,-2.53);
   box(.045,.05,.31,trim,sx,2.11,-2.34); // Maneta de la porta
   rod([sx,1.45,-1.62],[sx,3.50,-1.62],.019,trim);
   rod([sx,1.49,-3.36],[sx,1.49,-1.62],.022,trim);
   // Retrovisor rectangular suspès per dos braços tubulars.
   const mirrorX=sign*1.86;
   rod([sx,3.16,-3.23],[mirrorX,3.23,-3.28],.028,trim);
   rod([sx,2.64,-3.05],[mirrorX,2.81,-3.27],.026,trim);
   box(.15,.68,.36,trim,mirrorX,3.09,-3.27);
   box(.025,.56,.28,glass,mirrorX+sign*.09,3.09,-3.27);
   // Intermitent i posició lateral a l'extrem baix.
   box(.20,.27,.09,amber,sign*1.24,1.73,-3.70);
   box(.07,.12,.14,amber,sign*1.44,1.58,-2.91);
 }
 face([[-1.22,2.54,-3.784],[1.22,2.54,-3.784],[1.22,3.45,-3.584],[-1.22,3.45,-3.584]],glass);
 for(const sign of[-1,1]){
   rod([sign*1.23,2.52,-3.80],[sign*1.23,3.48,-3.59],.036,frame);
   rod([sign*.06,2.57,-3.81],[sign*1.08,2.83,-3.76],.022,frame);
 }
 rod([-1.26,3.47,-3.61],[1.26,3.47,-3.61],.045,frame);
 rod([-1.26,2.52,-3.80],[1.26,2.52,-3.80],.055,frame);
 rod([0,2.56,-3.78],[0,3.46,-3.60],.028,frame);

 // Reixa frontal amb graella de 7 lames, emblema discret i fars.
 box(2.03,.78,.10,trim,0,1.92,-3.77);
 for(let k=0;k<7;k++)box(1.88,.035,.12,steel,0,1.61+k*.103,-3.843);
 box(.76,.14,.022,steel,0,2.41,-3.77);
 for(const sign of[-1,1]){
   box(.33,.27,.12,frame,sign*1.17,1.94,-3.80);
   box(.27,.19,.028,lamp,sign*1.17,1.94,-3.869);
   box(.11,.13,.026,amber,sign*1.20,1.67,-3.875);
 }
 box(3.13,.20,.37,trim,0,1.39,-3.92);
 box(1.05,.39,.32,hub,0,1.37,-4.03);
 cyl(.16,.10,steel,0,1.39,-4.24,'z');
 for(const x of[-.40,.40])rod([x,1.29,-4.18],[x,1.00,-4.29],.07,steel);
 for(const x of[-1.18,1.18])rod([x,1.33,-3.98],[x*1.05,1.04,-4.07],.06,steel);

 // El voladís i la caixa mantenen la mida entre variants (comparació justa).
 box(3.05,.24,4.66,body,0,1.69,1.40);
 for(const sign of[-1,1]){
   box(.13,.51,4.62,body,sign*1.49,1.99,1.40);
   box(.075,.075,4.58,steel,sign*1.50,2.28,1.40);
   for(let z=-.61;z<3.6;z+=.52){
     rod([sign*1.55,1.80,z],[sign*1.55,2.32,z],.025,steel)
   }
 }
 box(3.03,.69,.12,body,0,2.03,3.76);
 for(const z of[-.90,3.77])box(3.21,.075,.17,trim,0,1.55,z);
 for(const x of[-1.37,1.37]){
   box(.065,.40,.09,trim,x,1.93,3.83);
   box(.35,.18,.065,red,x,1.76,3.86)
 }

 // Lona facetejada de sostre arrodonit, costures i amarres.
 const baseZ=-.83,backZ=3.72;
 function tarp(z0,z1,top=3.89){
   const section=[[-1.53,2.24],[-1.54,3.51],[-1.28,top-.08],[-.65,top],[.65,top],[1.28,top-.08],[1.54,3.51],[1.53,2.24]];
   for(let i=0;i<section.length-1;i++){
     const a=section[i],b=section[i+1],m=i%3===0?canvasDark:i%2===0?canvasLight:canvas;
     face([[a[0],a[1],z0],[b[0],b[1],z0],[b[0],b[1],z1],[a[0],a[1],z1]],m)
   }
   for(const z of[z0,z1])face(section.map(p=>[p[0],p[1],z]),canvasDark);
   for(let z=z0+.56;z<z1-.15;z+=.64){
     for(const sign of[-1,1]){
       rod([sign*1.546,2.32,z],[sign*1.546,3.49,z],.016,canvasDark);
       rod([sign*1.57,2.22,z],[sign*1.53,1.91,z+.10],.023,trim)
     }
     // Costura longitudinal visible per damunt del sostre.
     rod([0,top+.007,z-.27],[0,top+.007,z+.26],.008,canvasLight)
   }
   for(const sign of[-1,1])rod([sign*1.55,2.20,z0],[sign*1.55,2.20,z1],.035,canvasDark);
   for(const z of[z0+.10,z1-.10])for(const x of[-.90,0,.90])box(.035,.30,.025,canvasDark,x,top-.23,z)
 }
 if(variant===2){
   // Lona replegada: la plataforma i les caixes no queden tapades.
   tarp(baseZ,.36,3.73);
   const roll=cyl(.19,3.0,canvasDark,0,3.59,.50,'x');roll.rotation.z=Math.PI/2+.025;
   for(const z of[.80,2.05,3.16]){
     for(const x of[-.86,.18,.94]){
       const height=(z===2.05?.67:.43),bx=box(.84,height,.84,wood,x,2.01+height*.5,z);
       for(const yy of[-.27,.27])box(.87,.045,.04,trim,x,bx.position.y+yy*height,z+.425)
     }
   }
   for(const sign of[-1,1]){
     box(.095,.41,2.85,body,sign*1.53,2.21,2.04);
     for(const z of[1.17,2.35,3.41])rod([sign*1.53,2.44,z],[sign*1.36,2.18,z],.026,steel)
   }
 }else tarp(baseZ,backZ,variant===3?4.06:variant===1?3.72:3.89);

 if(variant===1){
   // B · Protecció metàl·lica sense canviar la silueta de la cabina.
   for(const x of[-1.42,1.42])rod([x,1.29,-4.19],[x,2.14,-4.02],.092,trim);
   for(const y of[1.50,1.98])rod([-1.51,y,-4.14],[1.51,y,-4.14],.07,trim);
   for(const x of[-1.1,1.1])for(const y of[1.84,2.01,2.17])rod([x-.20,y,-3.90],[x+.20,y,-3.90],.025,trim);
   box(2.92,.12,.20,trim,0,3.94,-3.14);
   for(const x of[-1.05,-.37,.37,1.05])box(.25,.16,.22,lamp,x,4.02,-3.18);
   for(const x of[-1.47,1.47])rod([x,3.80,-3.32],[x,3.80,-1.89],.045,trim)
 }
 if(variant===3){
   // D · Entrada d'aire amb capçal orientat enrere, i recanvi a la caixa.
   rod([1.41,1.61,-1.44],[1.58,4.03,-1.44],.12,trim);
   box(.31,.22,.51,trim,1.57,4.13,-1.63);
   box(.22,.10,.34,steel,1.57,4.18,-1.67);
   const spare=new T.Group();spare.position.set(-1.59,2.78,2.68);spare.rotation.z=.16;g.add(spare);
   cyl(.71,.24,rubber,0,0,0,'x',spare);cyl(.37,.26,hub,-.13,0,0,'x',spare);
   for(let k=0;k<15;k++){const a=k*Math.PI*2/15,t=box(.24,.14,.28,rubber,-.03,Math.cos(a)*.7,Math.sin(a)*.7,spare);t.rotation.x=-a}
   for(const side of[-1,1])rod([side*1.35,1.62,3.91],[side*1.35,3.92,3.91],.055,trim);
   for(let y=1.79;y<3.90;y+=.30)rod([-1.35,y,3.95],[1.35,y,3.95],.036,trim);
   for(const [x,y,z]of[[.15,4.06,1.00],[-.65,4.07,2.30],[.73,3.99,3.21]]){
     const patch=box(.86,.012,.60,canvasDark,x,y,z);patch.rotation.y=.35;
   }
 }

 // Punts de fixació, ganxos i escala del conductor.
 for(const sign of[-1,1]){
   for(const z of[-.48,.64,1.74,2.84,3.58])rod([sign*1.56,2.09,z],[sign*1.63,1.83,z],.028,trim);
   for(const z of[-2.74,-2.42])box(.48,.08,.24,steel,sign*1.61,1.22,z)
 }
 g.userData.truckVariant=cfg.id;
 g.userData.axles=[-2.68,2.73];g.userData.cabin='cab-over MAN HX60';
 return g
}
