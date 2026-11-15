// Ferri costaner D aprovat. Geometria editable compartida pel joc i l'editor.
import {vehicleSpecs} from './vehicle-specs.mjs';
export const FERRY_MODEL_ID='ferry-d';
const p=Object.freeze({title:'Ferri costaner · D',hull:0x294d70,trim:0xe8e8df,deck:0x747a7c,shoulder:13.6,keel:10.0,side:1.35});
export function createFerryModel(T){
 const d=vehicleSpecs.decks.ferry, root=new T.Group();root.name=p.title;
 root.userData.ferryModel=FERRY_MODEL_ID;root.userData.labFixedScale=true;
 const colors={metal:0x44535a,dark:0x263538,white:p.trim,glass:0x456973,yellow:0xe6c15c,red:0xc34e38,waterline:0x303c43,rubber:0x22282c};
 const materials=new Map();
 const mat=(color,glass=false)=>{const k=color+':'+glass;if(!materials.has(k))materials.set(k,new T.MeshStandardMaterial({color,roughness:glass?.2:.83,metalness:glass?.08:.12,transparent:glass,opacity:glass?.44:1,depthWrite:!glass,side:T.DoubleSide,flatShading:true}));return materials.get(k)};
 const group=(name,parent=root)=>{const g=new T.Group();g.name=name;parent.add(g);return g};
 const mesh=(g,name,geo,c,glass=false)=>{geo.userData.labOwned=true;const m=new T.Mesh(geo,mat(c,glass));m.name=name;m.castShadow=!glass;m.receiveShadow=true;g.add(m);return m};
 const box=(g,name,s,pos,c,glass=false)=>{const m=mesh(g,name,new T.BoxGeometry(...s),c,glass);m.position.set(...pos);return m};
 const faces=(g,name,quads,c,glass=false)=>{const a=[];for(const q of quads)for(let k=1;k<q.length-1;k++)a.push(...q[0],...q[k],...q[k+1]);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(a,3));geo.computeVertexNormals();return mesh(g,name,geo,c,glass)};
 const rod=(g,name,a,b,r,c,segments=6)=>{const v=new T.Vector3(...b).sub(new T.Vector3(...a)),m=mesh(g,name,new T.CylinderGeometry(r,r,v.length(),segments),c);m.position.set(...a).addScaledVector(v,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m};
 const hull=group('Casc i línia de flotació');
 // Broad working deck, two tapered ends, visibly distinct bilge/chine shapes.
 // At both ends the clear ramp spans x=±6.7 and starts at z=±25.6.
 const rows=[[-25.6,14.3,p.shoulder*.79,p.keel*.63],[-21.2,15.9,p.shoulder,p.keel],[-12.0,16,p.shoulder+.7,p.keel+.5],[0,16,p.shoulder+.7,p.keel+.5],[12,16,p.shoulder+.7,p.keel+.5],[21.2,15.9,p.shoulder,p.keel],[25.6,14.3,p.shoulder*.79,p.keel*.63]];
 const rings=rows.map(([z,w,s,k])=>[[-w,2.2,z],[-w,.87,z],[-s,-.04,z],[-k,-.425,z],[k,-.425,z],[s,-.04,z],[w,.87,z],[w,2.2,z]]);
 const above=[],below=[],bottom=[];
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<7;j++){
  const q=[rings[i][j],rings[i+1][j],rings[i+1][j+1],rings[i][j+1]];
  (j===0||j===6?above:j===3?bottom:below).push(q);
 }
 faces(hull,'Costats del casc',above,p.hull);
 faces(hull,'Obra viva facetada',below,colors.waterline);
 faces(hull,'Fons del casc',bottom,colors.waterline);
 faces(hull,'Tancament proa i popa',[rings[0].slice().reverse(),rings.at(-1)],p.hull);
 const deck=group('Coberta de vehicles');
 box(deck,'Plataforma de càrrega',[28.6,.28,51.2],[0,d.y-.14,0],p.deck);
 // Fill shoulders between continuous flat driving surface and actual sheer line.
 const shoulderQuads=[];
 for(let i=0;i<rows.length-1;i++)for(const side of [-1,1]){
  const [z,w]=rows[i],[zz,ww]=rows[i+1];shoulderQuads.push([[side*14.3,d.y,z],[side*w,d.y,z],[side*ww,d.y,zz],[side*14.3,d.y,zz]]);
 }
 faces(deck,'Passadissos laterals',shoulderQuads,p.deck);
 for(const side of [-1,1]){
  const edge=side*14.5;
  box(deck,'Banda lateral',[.48,p.side,40],[edge,d.y+p.side/2,0],p.trim);
  for(const end of [-1,1]){
   // End panels remain outside the ramp opening.
   box(deck,'Aleta extrema de protecció',[5.9,p.side,.27],[side*10.35,d.y+p.side/2,end*25.35],p.trim);
   rod(deck,'Coronament lateral',[edge,d.y+p.side,20*end],[side*14.05,d.y+p.side,25.35*end],.095,colors.metal);
  }
  for(const z of [-18,-9,0,9,18]){
   box(deck,'Defensa lateral',[.22,.58,1.65],[side*15.94,1.34,z],colors.rubber);
  }
  for(const z of [-18,-9,0,9,18])
   box(deck,'Muntant de barana',[.16,.54,.17],[edge,d.y+p.side+.27,z],p.trim);
  rod(deck,'Barana lateral',[edge,d.y+p.side+.54,-20],[edge,d.y+p.side+.54,20],.065,colors.metal);
 }
 for(const x of [-6.2,0,6.2]){
  for(const z of [-20,-10,0,10,20])box(deck,'Marca de carril',[.12,.014,4.2],[x,d.y+.009,z],0xe5dfc9);
 }
 for(const side of [-1,1]){
  const ramp=group(side<0?'Rampa de proa':'Rampa de popa');
  ramp.position.set(0,d.y,side*d.halfL);
  ramp.rotation.x=side*Math.asin((d.y-d.rampY)/d.ramp);
  ramp.userData.ferryRamp=side;
  const length=d.ramp;
  box(ramp,'Planxa mòbil',[2*d.rampHalfW,.25,length],[0,-.125,side*length/2],p.deck);
  for(const x of [-6.54,6.54])box(ramp,'Vorada de rampa',[.22,.27,length],[x,.135,side*length/2],colors.yellow);
  for(const j of [1,2,3])box(ramp,'Nervi antilliscant',[12.7,.045,.085],[0,.02,side*length*j/4],colors.metal);
  for(const x of [-7.08,7.08]){
   rod(deck,'Pal de rampa',[x,d.y,side*23.8],[x,d.y+2.65,side*23.8],.14,p.trim);
   box(deck,'Base del pal',[.50,.30,.5],[x,d.y+.15,side*23.8],p.hull);
  }
  for(const x of [-6,-3,0,3,6])box(deck,'Marca de llindar',[1.6,.018,.21],[x,d.y+.012,side*24.9],colors.yellow);
 }
 // Each wheelhouse is built from opaque wall bands and actual glazing,
 // not glass over a solid box. Floor and ceiling remain distinct pieces.
 const bridge=(g,x,z,y,w,len,h,overhang=.45)=>{
  const winBase=y+h*.43,winTop=y+h*.88,roof=y+h;
  box(g,'Sòl de cabina',[w,.17,len],[x,y+.085,z],colors.metal);
  box(g,'Cos inferior cabina',[w,winBase-y-.17,len],[x,(winBase+y+.17)/2,z],p.trim);
  for(const side of [-1,1]){
   const zz=z+side*len/2,xx=x+side*w/2;
   faces(g,'Vidre frontal panoràmic',[[[x-w/2,winBase,zz],[x+w/2,winBase,zz],[x+w/2,winTop,zz],[x-w/2,winTop,zz]]],colors.glass,true);
   faces(g,'Vidre lateral panoràmic',[[[xx,winBase,z-len/2],[xx,winBase,z+len/2],[xx,winTop,z+len/2],[xx,winTop,z-len/2]]],colors.glass,true);
   for(const f of [-.5,0,.5]){
    box(g,'Marc de finestra',[.10,winTop-winBase,.10],[x+w*f,(winBase+winTop)/2,zz],colors.dark);
    box(g,'Marc de finestra',[.10,winTop-winBase,.10],[xx,(winBase+winTop)/2,z+len*f],colors.dark);
   }
  }
  box(g,'Fris superior',[w,roof-winTop,len],[x,(roof+winTop)/2,z],p.trim);
  box(g,'Sostre pont',[w+overhang,.19,len+overhang],[x,roof+.095,z],p.hull);
  box(g,'Consola interior',[w*.65,.65,.45],[x,y+.53,z-len*.28],colors.dark);
  return roof+.19;
 };
 const house=group('Superestructura i pont de comandament');
 const mastX=11.5,mastZ=1.8;
 // The two-level wheelhouse stays inside the original cabin footprint.
 box(house,'Bloc inferior de serveis',[3.45,2.8,7.6],[11.5,d.y+1.4,1.8],p.trim);
 for(const z of [-.35,1.8,3.95])for(const x of [9.77,13.23])
  box(house,'Finestra de serveis',[.025,.57,.83],[x,d.y+1.91,z],0x364e56);
 const mastY=bridge(house,11.5,1.8,d.y+2.8,3.45,6.8,2.50,.35);
 root.userData.damageSmokeOrigin=[mastX,mastY+.15,mastZ];
 rod(house,'Màstil de navegació',[mastX,mastY,mastZ],[mastX,mastY+3,mastZ],.12,colors.metal);
 box(house,'Radar',[2.1,.17,.20],[mastX,mastY+2.85,mastZ],p.trim);
 for(const side of [-1,1]){
  const ring=mesh(house,'Salvavides',new T.TorusGeometry(.39,.10,6,12),colors.red);
  ring.rotation.y=Math.PI/2;ring.position.set(side*14.78,d.y+p.side+.12,-6.5);
  box(house,'Llum de navegació',[.26,.27,.30],[side*15.25,d.y+p.side+.28,4.5],side<0?0xcc4437:0x389c56);
 }
 root.userData.deckContract={...d,cabin:{...d.cabin}};
 return root;
}

export function installFerryModel(T,host){
 const model=createFerryModel(T);
 host.add(model);
 host.userData.ferryModel=FERRY_MODEL_ID;
 host.userData.ferryDeck=true;
 host.userData.ferryRamps=model.children.filter(g=>g.userData.ferryRamp).map(hinge=>({hinge,side:hinge.userData.ferryRamp}));
 host.userData.damageSmokeOrigin=model.userData.damageSmokeOrigin.slice();
 return model;
}
