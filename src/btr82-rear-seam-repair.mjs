import * as THREE from '../vendor/three-r186.module.mjs';

// Reparació quirúrgica de les discontinuïtats marcades per l'usuari.
// Els punts són coordenades del BTR-82 a l'escena del model sense normalitzar.
export const BTR82_REAR_MARKS=Object.freeze([
 {group:1,label:'Coberta posterior superior',points:[
  [-.580,1.588,5.674],[.515,1.805,5.503],[.121,1.750,5.547],
  [.942,1.896,5.432],[-1.026,1.481,5.758]
 ]},
 {group:2,label:'Baixos posteriors',points:[
  [-.352,.543,5.518],[1.327,.517,5.511],
  [-.772,.551,5.521],[-1.164,.556,5.522]
 ]}
]);

const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const midpoint=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
const key=v=>v.map(x=>Math.round(x*10000)).join(',');

function triangleArea(a,b,c){
 const ab=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
 const ac=new THREE.Vector3(c[0]-a[0],c[1]-a[1],c[2]-a[2]);
 return ab.cross(ac).length()/2;
}

// Omple només escletxes entre dues arestes LLIURES i properes de la mateixa
// zona marcada. S'afegeixen triangles a la malla existent: cap planxa flotant,
// cap material diferent i cap modificació de la resta de la carrosseria.
export function repairMarkedRearSeams(scene){
 const hull=scene.getObjectByName('hull_material_0');
 if(!hull?.isMesh||!hull.geometry?.index)
  throw Error('No es pot reparar el posterior: falta hull_material_0 indexat');
 const original=hull.geometry;
 const positions=original.getAttribute('position');
 const idx=original.index;
 const coord=i=>[positions.getX(i),positions.getY(i),positions.getZ(i)];
 const records=new Map();
 const faces=[];
 for(let i=0;i<idx.count;i+=3){
  const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
  faces.push(a,b,c);
  for(const [u,v,w] of [[a,b,c],[b,c,a],[c,a,b]]){
   const keyA=key(coord(u)),keyB=key(coord(v));
   if(keyA===keyB)continue;
   const ek=keyA<keyB?keyA+'|'+keyB:keyB+'|'+keyA;
   const e=records.get(ek)||{count:0};
   e.count++;
   e.a=u;e.b=v;e.opposite=w;
   records.set(ek,e);
  }
 }
 const boundary=[...records.values()].filter(e=>e.count===1).map(e=>{
  const a=coord(e.a),b=coord(e.b),o=coord(e.opposite);
  const mid=midpoint(a,b);
  const edge=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
  const outward=new THREE.Vector3(...o).sub(new THREE.Vector3(...a));
  const normal=edge.clone().cross(outward).normalize();
  return {...e,pa:a,pb:b,mid,normal,len:distance(a,b)};
 });
 const used=new Set(),patches=[],groups=[];
 for(const group of BTR82_REAR_MARKS){
  const isUpper=group.group===1;
  const candidates=boundary.filter(e=>
   e.mid[2]>5.25&&e.mid[2]<5.93&&
   (isUpper?e.mid[1]>1.32&&e.mid[1]<2.09:e.mid[1]>.20&&e.mid[1]<.91)&&
   Math.abs(e.mid[0])<1.72&&
   e.len>.035&&e.len<1.25&&
   group.points.some(p=>distance(e.mid,p)<.90)
  );
  const pairs=[];
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
   const a=candidates[i],b=candidates[j];
   if(a.a===b.a||a.a===b.b||a.b===b.a||a.b===b.b)continue;
   // Tria l'emparellament que manté l'ordre dels extrems del contorn.
   const straight=distance(a.pa,b.pa)+distance(a.pb,b.pb);
   const reversed=distance(a.pa,b.pb)+distance(a.pb,b.pa);
   const flip=reversed<straight;
   const start=flip?b.pb:b.pa,end=flip?b.pa:b.pb;
   const gap0=distance(a.pa,start),gap1=distance(a.pb,end);
   const gap=Math.max(gap0,gap1);
   const center=midpoint(a.mid,b.mid);
   if(gap<.025||gap>.43||distance(a.mid,b.mid)>.46)continue;
   if(Math.abs(a.len-b.len)>Math.max(.22,Math.min(a.len,b.len)*.7))continue;
   // No unir una aresta amb una altra del mateix contorn ja contigua.
   if(Math.abs(a.mid[1]-b.mid[1])>.28||Math.abs(a.mid[2]-b.mid[2])>.30)continue;
   if(!group.points.some(p=>distance(center,p)<.67))continue;
   // Evita qualsevol triangle degenerat o un empalmament de dues cares
   // que en realitat ja estiguin gairebé al mateix lloc.
   if(triangleArea(a.pa,a.pb,start)<.002||
      triangleArea(a.pb,end,start)<.002)continue;
   pairs.push({i,j,score:gap0+gap1+distance(a.mid,b.mid),flip});
  }
  pairs.sort((a,b)=>a.score-b.score);
  let added=0;
  for(const pair of pairs){
   if(used.has(candidates[pair.i])||used.has(candidates[pair.j]))continue;
   const e=candidates[pair.i],f=candidates[pair.j];
   const f0=pair.flip?f.b:f.a,f1=pair.flip?f.a:f.b;
   // Els triangles comparteixen arestes reals de la mateixa hull_material_0.
   // Orientació coherent amb la normal de l'aresta existent.
   let t1=[e.a,e.b,f0],t2=[e.b,f1,f0];
   const a=coord(t1[0]),b=coord(t1[1]),c=coord(t1[2]);
   const n=new THREE.Vector3(...b).sub(new THREE.Vector3(...a))
    .cross(new THREE.Vector3(...c).sub(new THREE.Vector3(...a)));
   if(n.dot(e.normal)<0){t1=[e.b,e.a,f0];t2=[e.b,f0,f1]}
   patches.push(...t1,...t2);
   used.add(e);used.add(f);added+=2;
   if(added>=36)break; // protecció contra unions excessives
  }
  groups.push({group:group.group,label:group.label,bridges:added/2,triangles:added});
 }
 if(patches.length){
  const joined=original.clone();
  joined.setIndex([...faces,...patches]);
  joined.userData.candidateSimplified=true;
  joined.computeVertexNormals();
  joined.computeBoundingBox();joined.computeBoundingSphere();
  hull.geometry=joined;
 }
 scene.userData.btr82RearRepairs=groups;
 return groups;
}
