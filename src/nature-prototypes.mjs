// Prototips independents de la partida: roques instanciades i mossegades de passada.
// Les escenes Three.js les construeix roques-taurons-proves.html.
export const ROCK_CONCEPTS=Object.freeze([
 {id:'A',name:'Blocs erosionats',subtitle:'Pedres disperses de mides molt diferents',family:0,count:17,drawCalls:1},
 {id:'B',name:'Lloses irregulars',subtitle:'Roques baixes, allargades i estratificades',family:1,count:19,drawCalls:1},
 {id:'C',name:'Escull de platja',subtitle:'Clúster continu de la sorra cap a dins l’aigua',family:2,count:35,drawCalls:2},
 {id:'D',name:'Afloraments de cim',subtitle:'Roques gegants amb blocs menors al voltant',family:3,count:13,drawCalls:2}
]);
const frac=n=>n-Math.floor(n);
const hash=(a,b=0)=>frac(Math.sin(a*127.1+b*311.7+19.71)*43758.5453);
export function rockGeometry(THREE,kind=0){
 const geoms=[
  new THREE.IcosahedronGeometry(1,0),    // 20 triangles
  new THREE.DodecahedronGeometry(1,0),   // 36 triangles
  new THREE.IcosahedronGeometry(1,0),
  new THREE.DodecahedronGeometry(1,0)
 ];
 const g=geoms[Math.min(3,Math.max(0,kind))];
 for(let n=0;n<geoms.length;n++)if(n!==kind)geoms[n].dispose();
 const a=g.getAttribute('position');
 for(let i=0;i<a.count;i++){
   const x=a.getX(i),y=a.getY(i),z=a.getZ(i);
   // Deformació analítica contínua: els vèrtexs compartits no s'esquincen.
   const ripple=.11*Math.sin(x*5.1+z*2.3)+.09*Math.cos(z*4.8-y*3.2);
   const r=1+ripple;
   const stretch=kind===1?[1.63,.47,1.1]:kind===3?[1.22,1.33,.95]:[1.1,.83,1.17];
   a.setXYZ(i,x*stretch[0]*r,y*stretch[1]*(1+ripple*.4),z*stretch[2]*r);
 }
 a.needsUpdate=true;g.computeVertexNormals();
 return g;
}
export function rockInstances(family){
 const type=family|0,rows=[],count=ROCK_CONCEPTS[type]?.count??17;
 for(let i=0;i<count;i++){
  const n=i+1,side=hash(n,type+10)*2-1,along=hash(n+31,type)*2-1;
  let x=side*14,z=along*10,y=0,scale=.65+hash(n+91,type)*1.65,kind=type===1?1:0;
  if(type===0){scale=.4+Math.pow(hash(n+89,type),1.8)*2.7;}
  if(type===1){scale=.55+hash(n+19,type)*2.2;z*=.73;}
  if(type===2){
   // Espiga irregular: de la riba (z=-2) a 9 m mar endins.
   const t=i/(count-1),offset=hash(n,19)*2-1;
   z=-4+t*15+offset*1.6;
   x=Math.sin(t*6.8)*2.6+side*(1.1+1.4*t);
   scale=.65+(1-hash(n+42,4)**2)*1.65;
   kind=i%4===0?1:0;
   y=z>1?-.16:0; // una part enterrada sota la superfície
  }
  if(type===3){
   const big=i<4;
   x=side*(big?9:14);z=along*(big?7:10);
   scale=big?3.3+hash(n+30,5)*2.5:.65+hash(n,7)*1.95;
   kind=big?3:1;
  }
  rows.push({x,y,z,scale,rotation:hash(n,77)*Math.PI*2,
   tilt:(hash(n,79)-.5)*.17,kind,
   // Collider independent de la geometria; opcionalment 2 cercles per lloses llargues.
   radius:scale*(kind===1?1.45:kind===3?1.30:1.05),
   halfHeight:scale*(kind===3?1.4:.9),tone:hash(n,83)});
 }
 return rows;
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
function between(a,b,t){return {x:mix(a[0],b[0],t),z:mix(a[1],b[1],t)}}
function bezier(a,b,c,t){
 const u=1-t;return {x:u*u*a[0]+2*u*t*b[0]+t*t*c[0],
 z:u*u*a[1]+2*u*t*b[1]+t*t*c[1]};
}
export const SHARK_CYCLE=12;
export const SHARK_BITES=Object.freeze([2.65,8.35]);
export function sharkSample(seconds){
 const t=((seconds%SHARK_CYCLE)+SHARK_CYCLE)%SHARK_CYCLE;
 let p,phase;
 if(t<2.65){p=between([-14,-25],[1.65,-.15],smooth(t/2.65));phase='Aproximació'}
 else if(t<3.85){p=between([1.65,-.15],[5.8,22],smooth((t-2.65)/1.2));phase='Mossegada i passada'}
 else if(t<6.05){p=bezier([5.8,22],[1.8,38],[-18,18],smooth((t-3.85)/2.2));phase='Gir ample'}
 else if(t<8.35){p=between([-18,18],[-1.7,.2],smooth((t-6.05)/2.3));phase='Nova embestida'}
 else if(t<9.8){p=between([-1.7,.2],[-8,-23],smooth((t-8.35)/1.45));phase='Passada de llarg'}
 else {p=bezier([-8,-23],[-19,-35],[-14,-25],smooth((t-9.8)/2.2));phase='Recol·locació'}
 const earlier=sharkPositionAt(t-.015),later=sharkPositionAt(t+.015);
 const yaw=Math.atan2(later.x-earlier.x,later.z-earlier.z);
 const biteAge=Math.min(...SHARK_BITES.map(b=>{const delta=(t-b+SHARK_CYCLE)%SHARK_CYCLE;return delta}));
 return {...p,yaw,phase,bite:biteAge<.13,biteAge,
   // Ambdós punts de mossegada passen al costat del nedador, no pel centre.
   biteOffset:Math.hypot(p.x,p.z)};
}
function sharkPositionAt(t){
 const v=((t%SHARK_CYCLE)+SHARK_CYCLE)%SHARK_CYCLE;
 if(v<2.65)return between([-14,-25],[1.65,-.15],smooth(v/2.65));
 if(v<3.85)return between([1.65,-.15],[5.8,22],smooth((v-2.65)/1.2));
 if(v<6.05)return bezier([5.8,22],[1.8,38],[-18,18],smooth((v-3.85)/2.2));
 if(v<8.35)return between([-18,18],[-1.7,.2],smooth((v-6.05)/2.3));
 if(v<9.8)return between([-1.7,.2],[-8,-23],smooth((v-8.35)/1.45));
 return bezier([-8,-23],[-19,-35],[-14,-25],smooth((v-9.8)/2.2));
}
