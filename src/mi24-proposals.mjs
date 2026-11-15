// Original Three.js geometry based on Mi-24V photographs in the lab catalogue.
// Metres, +Y up, nose -Z. A-D are shape studies, not aircraft designations.
export const MI24_VERSION='mi24-proposals-20261115-2';
export const MI24_MODELS=Object.freeze({
 'mi24-main':{title:'Mil Mi-24V · Principal',note:'Cabines i fuselatge revisats · model complet',width:1,bubble:1,nose:0,roundness:.85,segments:16},
 'mi24-a':{title:'Mi-24 · A · Cabines arrodonides',note:'Cúpules més plenes · transicions més suaus',width:1,bubble:1.09,nose:0,roundness:1,segments:16},
 'mi24-b':{title:'Mi-24 · B · Cos robust',note:'Fuselatge més ample · ventre més profund',width:1.10,bubble:1.02,nose:0,roundness:.78,segments:12},
 'mi24-c':{title:'Mi-24 · C · Perfil estilitzat',note:'Morro més llarg · cabines més baixes i angulars',width:.96,bubble:.92,nose:.32,roundness:1.12,segments:12},
 'mi24-d':{title:'Mi-24 · D · Facetat lleuger',note:'Menys triangles · silueta i finestres conservades',width:1.02,bubble:1,nose:.05,roundness:1,segments:8,light:true}
});

export function createMi24Proposal(T,id='mi24-main'){
 const p=MI24_MODELS[id];if(!p)throw Error('Proposta Mi-24 desconeguda: '+id);
 const root=new T.Group();root.name=p.title;
 const c={body:0x667451,top:0x7b8564,belly:0x617a78,dark:0x242c27,metal:0x86918a,rubber:0x1b201b,glass:0x81b0ba};
 const mats=new Map();
 const material=(color,glass=false)=>{
  const key=color+':'+glass;if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,side:T.DoubleSide,flatShading:true,roughness:glass?.19:.83,metalness:glass?.08:.12,transparent:glass,opacity:glass?.35:1,depthWrite:!glass}));return mats.get(key);
 };
 const group=(name,parent=root)=>{const g=new T.Group();g.name=name;parent.add(g);return g};
 const mesh=(g,name,geo,color=c.body,glass=false)=>{
  geo.userData.labOwned=true;const m=new T.Mesh(geo,material(color,glass));m.name=name;m.castShadow=!glass;m.receiveShadow=true;g.add(m);return m;
 };
 const poly=(g,name,points,color=c.body,glass=false)=>{
  const data=[];for(let i=1;i<points.length-1;i++)data.push(...points[0],...points[i],...points[i+1]);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data,3));geo.computeVertexNormals();return mesh(g,name,geo,color,glass);
 };
 const box=(g,name,size,pos,color=c.body)=>{const m=mesh(g,name,new T.BoxGeometry(...size),color);m.position.set(...pos);return m};
 const cyl=(g,name,r,len,pos,color=c.metal,axis='y',segments=p.segments)=>{
  const m=mesh(g,name,new T.CylinderGeometry(r,r,len,segments),color);m.position.set(...pos);if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;return m;
 };
 const rod=(g,name,a,b,r=.025,color=c.metal)=>{
  const v=new T.Vector3(...b).sub(new T.Vector3(...a)),m=cyl(g,name,r,v.length(),[0,0,0],color,'y',p.light?4:6);
  m.position.set(...a).addScaledVector(v,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;
 };
 const sphere=(g,name,pos,size,color=c.body)=>{const m=mesh(g,name,new T.SphereGeometry(1,p.light?8:12,p.light?6:8),color);m.position.set(...pos);m.scale.set(...size);return m};
 // Cross sections share vertices at every join. Cargo windows and both
 // canopies replace body panels; no opaque wall sits behind the glass.
 const ring=(s,n=12,exponent=p.roundness,body=false)=>Array.from({length:n},(_,i)=>{
  const a=i*2*Math.PI/n,cs=Math.cos(a),sn=Math.sin(a),q=v=>Math.sign(v)*Math.abs(v)**exponent;
  // The cabin section is tall-sided with a broad keel. Circular sections
  // made the underside too pointed and the cargo body look like a capsule.
  if(body&&n===12&&i>=6){
   const lower=[[ -1,0],[-.96,.57],[-.64,.94],[0,1],[.64,.94],[.96,.57]][i-6];
   return [s[1]*lower[0],s[4]-(s[4]-s[2])*lower[1],s[0]];
  }
  return [s[1]*q(cs),s[4]+q(sn)*(sn>=0?s[3]-s[4]:s[4]-s[2]),s[0]];
 });
 const cargoWindow=(g,name,q)=>{
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),at=(u,v)=>mix(mix(q[0],q[1],u),mix(q[3],q[2],u),v);
  const win=[at(.24,.18),at(.76,.18),at(.76,.72),at(.24,.72)];
  for(let i=0;i<4;i++){const j=(i+1)%4;poly(g,'Xapa al voltant '+name,[q[i],q[j],win[j],win[i]]);rod(g,'Junta '+name,win[i],win[j],.016,c.dark)}
  poly(g,name,win,c.glass,true);
 };
 const loft=(g,name,sections,{n=12,exponent=p.roundness,color=c.body,state=()=>false,caps=[true,true],belly=false,body=false}={})=>{
  const rings=sections.map(s=>ring(s,n,exponent,body));
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<n;k++){
   const q=[rings[j][k],rings[j+1][k],rings[j+1][(k+1)%n],rings[j][(k+1)%n]],mode=state(j,k),glass=mode==='glass';
   if(mode==='window'){cargoWindow(g,'Finestra càrrega '+j+'/'+k,q);continue}
   poly(g,(glass?'Vidre ':'')+name+' '+j+'/'+k,q,glass?c.glass:belly&&k>=n/2?c.belly:color,glass);
   if(glass){
    const adjacent=[[j,(k+n-1)%n],[j+1,k],[j,(k+1)%n],[j-1,k]];
    for(let e=0;e<4;e++){
     const [jj,kk]=adjacent[e];
     if(jj<0||jj>=rings.length-1||state(jj,kk)!=='glass'||e===0&&k===3||e===1&&[2,5].includes(j))
      rod(g,'Marc cabina',q[e],q[(e+1)%4],.025,c.dark);
    }
   }
  }
  if(caps[0])poly(g,name+' frontal',rings[0].slice().reverse(),color);
  if(caps[1])poly(g,name+' posterior',rings.at(-1),color);
 };
 const hull=group('Fuselatge i cabines en tàndem'),tail=group('Botaló i deriva');
 const sections=[
  [-6.15,.12,1.12,1.64,1.43],[-5.94,.42,.98,1.98,1.51],
  [-5.72,.57,.88,2.10,1.61],[-5.17,.72,.82,2.68,1.79],[-4.48,.73,.80,2.73,1.85],
  // A narrow rising bridge, rather than a deep saddle between two domes.
  [-4.30,.75,.80,2.75,1.88],[-3.65,.84,.80,3.29,2.04],
  [-3.14,.90,.80,3.47,2.10],[-2.53,.97,.80,3.43,2.11],
  [-1.10,1.20,.80,3.49,2.08],[-.20,1.25,.80,3.43,2.08],[.70,1.26,.81,3.37,2.08],
  [1.60,1.24,.85,3.31,2.10],[2.50,1.12,1.03,3.23,2.13],
  [3.45,.91,1.35,3.16,2.18],[4.15,.67,1.72,3.08,2.32]
 ].map((s,i)=>{
  const out=[...s];out[1]*=p.width;
  if(i<=5)out[0]-=p.nose*(1-i/6);
  if(i>=2&&i<=8){out[3]=out[4]+(out[3]-out[4])*p.bubble;out[1]*=p.bubble**.3}
  if(id==='mi24-b'&&i>=2&&i<=13)out[2]-=.12;
  return out;
 });
 loft(hull,'Fuselatge Mi-24',sections,{belly:true,body:true,caps:[true,false],state:(j,k)=>{
  if([2,3,5,6,7].includes(j)&&k<6)return 'glass';
  if(j>=9&&j<=12&&[0,5].includes(k))return 'window';
  return false;
 }});
 // Shared root ring: the broad belly rises into a long, nearly level roof.
 loft(tail,'Botaló',[sections.at(-1),[5.25,.50,2.04,3.05,2.49],[6.50,.37,2.26,3.03,2.63],[8.35,.24,2.48,3.02,2.76],[10.68,.14,2.64,3.01,2.83]],{belly:true,body:true,caps:[false,true]});
 const inside=group('Interior');
 for(const [name,z,y] of [['Artiller',-4.96,1.32],['Pilot',-3.08,1.98]]){
  box(inside,'Seient '+name,[.43,.14,.50],[0,y,z],c.dark);
  box(inside,'Respatller '+name,[.43,.57,.13],[0,y+.30,z+.25],c.dark);
  box(inside,'Reposacaps '+name,[.26,.19,.12],[0,y+.68,z+.25],c.dark);
  box(inside,'Tauler '+name,[.79,.15,.25],[0,y+.27,z-.48],c.dark);
  if(!p.light)rod(inside,'Palanca '+name,[0,y,z-.20],[0,y+.31,z-.33],.022,c.dark);
 }
 box(inside,'Terra càrrega',[2.15*p.width,.08,3.4],[0,1.05,.70],c.dark);
 box(inside,'Mampara posterior',[1.96*p.width,1.77,.07],[0,1.95,2.44],c.body);
 for(const side of [-1,1])for(const z of [-.55,.25,1.05,1.85]){
  box(inside,'Seient transport',[.43,.12,.52],[side*.79*p.width,1.25,z],c.dark);
  box(inside,'Respatller transport',[.12,.54,.52],[side*.99*p.width,1.55,z],c.dark);
 }
 // Paired circular intake mouths above the rear canopy, recessed into
 // the engine housings. The dorsal hump flows into the cargo fuselage.
 for(const side of [-1,1]){
  const engine=group(side<0?'Motor esquerre':'Motor dret');engine.position.x=side*.57;
  const first=[-2.48,.39,3.24,4.02,3.63],r=ring(first,p.segments,1);
  loft(engine,'Carenat motor',[first,[-1.62,.48,3.18,4.13,3.66],[-.75,.51,3.05,4.15,3.62],[.70,.49,3.02,4.02,3.58],[1.50,.40,3.02,3.80,3.40],[2.42,.22,2.97,3.36,3.16],[3.10,.06,2.94,3.05,3.0]],{n:p.segments,exponent:1,caps:[false,true]});
  const lip=r.map(v=>[v[0]*.83,3.63+(v[1]-3.63)*.83,v[2]-.015]),inner=lip.map(v=>[v[0]*.86,3.63+(v[1]-3.63)*.86,v[2]+.24]);
  for(let i=0;i<r.length;i++){const j=(i+1)%r.length;poly(engine,'Llavi presa aire',[r[i],r[j],lip[j],lip[i]]);poly(engine,'Conducte presa aire',[lip[i],lip[j],inner[j],inner[i]],c.dark)}
  poly(engine,'Fons presa aire',inner,c.dark);
  cyl(engine,'Escapament lateral',.32,.65,[side*.54,3.50,.34],c.dark,'x');
  cyl(engine,'Boca escapament',.25,.03,[side*.87,3.50,.34],0x111916,'x');
  if(!p.light)for(let z=.9;z<1.4;z+=.17)box(engine,'Reixeta dorsal',[.34,.025,.07],[side*.06,3.91,z],c.dark);
 }
 const transmission=group('Transmissió i rotor');
 loft(transmission,'Carenat transmissió',[[-.85,.43,3.34,4.10,3.72],[0,.56,3.34,4.37,3.8],[.9,.45,3.21,4.03,3.65]],{n:8});
 cyl(transmission,'Eix principal',.13,.66,[0,4.48,0],c.metal);
 const main=group('Rotor principal de cinc pales');main.position.set(0,4.83,0);main.userData.kamovRotor={axis:'y',speed:9};
 cyl(main,'Boixa principal',.27,.20,[0,0,0],c.metal);
 for(let i=0;i<5;i++){
  const blade=group('Pala principal '+(i+1),main);blade.rotation.y=i*2*Math.PI/5;
  rod(blade,'Braç articulat',[.16,0,0],[1.02,0,0],.06,c.metal);
  if(!p.light)rod(blade,'Biela rotor',[.30,-.26,.1],[.88,.02,.1],.025,c.metal);
  const q=[[.91,0,-.19],[8.40,-.10,-.27],[8.65,-.12,-.11],[8.65,-.12,.20],[1.05,0,.25]];
  poly(blade,'Pala principal',q,c.dark);
  if(!p.light){poly(blade,'Intrados pala',q.map(v=>[v[0],v[1]-.035,v[2]]).reverse(),c.dark);
   for(let j=0;j<q.length;j++){const k=(j+1)%q.length;poly(blade,'Cantell pala',[q[j],q[k],[q[k][0],q[k][1]-.035,q[k][2]],[q[j][0],q[j][1]-.035,q[j][2]]],c.dark)}}
  box(blade,'Punta pala',[.20,.036,.37],[8.49,-.112,-.035],0xb5bcaa);
 }
 const plate=(g,name,points,thickness=.1)=>{
  const lower=points.map(v=>[v[0],v[1]-thickness,v[2]]);poly(g,name,points,c.top);poly(g,name+' inferior',lower.slice().reverse(),c.body);
  for(let i=0;i<points.length;i++){const j=(i+1)%points.length;poly(g,name+' cantell',[points[i],points[j],lower[j],lower[i]])}
 };
 for(const side of [-1,1]){
  const wing=group(side<0?'Ala esquerra i càrrega':'Ala dreta i càrrega');
  wing.position.z=1.05;
  plate(wing,'Ala descendent',[[side*1.10,2.62,-.55],[side*3.25,2.08,.27],[side*3.25,2.02,1.16],[side*1.10,2.57,1.36]],.13);
  for(const x of [1.87,2.55]){
   const y=2.45-(x-1.10)*.24;
   box(wing,'Piló càrrega',[.13,.33,.56],[side*x,y-.27,.71]);
   cyl(wing,'Contenidor coets',.25,1.72,[side*x,y-.66,.33],c.metal,'z');
   cyl(wing,'Cara contenidor coets',.235,.03,[side*x,y-.66,-.54],c.dark,'z');
   for(let n=0;n<(p.light?6:10);n++){
    const a=n*2*Math.PI/(p.light?6:10);cyl(wing,'Boca coet',.032,.035,[side*x+Math.cos(a)*.16,y-.66+Math.sin(a)*.16,-.565],c.rubber,'z',6);
   }
  }
  // Drooping wingtip pylons and the two long launch containers are
  // prominent in the Mi-24V front view.
  const tip=[[side*3.25,2.09,.28],[side*3.25,2.02,1.15],[side*3.25,1.21,1.03],[side*3.25,1.25,.39]];
  poly(wing,'Piló terminal vertical',tip,c.body);
  poly(wing,'Piló terminal cara interior',tip.map(v=>[v[0]-side*.075,v[1],v[2]]).reverse(),c.body);
  for(const dx of [-.12,.12])cyl(wing,'Tub míssil terminal',.076,1.92,[side*3.25+dx,1.15,.64],c.dark,'z',p.light?6:10);
  plate(tail,'Estabilitzador horitzontal',[[side*.20,2.47,7.13],[side*1.70,2.42,7.70],[side*1.70,2.40,8.33],[side*.20,2.47,7.91]],.065);
  if(!p.light)rod(hull,'Esglaó cabina',[side*.98*p.width,1.37,-2.70],[side*.98*p.width,1.37,-1.9],.024,c.dark);
 }
 const finProfile=[[8.60,2.49],[9.72,4.68],[10.61,4.88],[10.68,2.50]],left=finProfile.map(([z,y])=>[-.13,y,z]),right=finProfile.map(([z,y])=>[.13,y,z]);
 poly(tail,'Deriva inclinada',left);poly(tail,'Deriva inclinada dreta',right.slice().reverse());
 for(let i=0;i<left.length;i++){const j=(i+1)%left.length;poly(tail,'Cantell deriva',[left[i],left[j],right[j],right[i]])}
 rod(tail,'Patí protector cua',[0,2.50,10.10],[0,1.90,10.63],.035,c.dark);
 const rear=group('Rotor de cua de tres pales');rear.position.set(-.29,4.38,10.18);rear.userData.kamovRotor={axis:'x',speed:-17};
 cyl(rear,'Boixa rotor de cua',.16,.38,[0,0,0],c.metal,'x');
 for(let i=0;i<3;i++){
  const blade=group('Pala cua '+(i+1),rear);blade.rotation.x=i*2*Math.PI/3;
  rod(blade,'Arrel pala cua',[0,.10,0],[0,.49,0],.05,c.metal);
  poly(blade,'Pala rotor de cua',[[0,.42,-.11],[0,1.954,-.14],[0,1.954,.15],[0,.50,.12]],0xb1b9ae);
  box(blade,'Punta vermella rotor cua',[.04,.16,.29],[0,1.87,.005],0xb74736);
 }
 const gear=group('Tren aterratge');
 const wheel=(x,y,z,r)=>{cyl(gear,'Pneumàtic',r,.25,[x,y,z],c.rubber,'x',16);cyl(gear,'Llanta',r*.56,.268,[x,y,z],c.metal,'x',12)};
 for(const side of [-1,1]){
  wheel(side*1.61,.49,1.88,.49);
  rod(gear,'Amortidor principal',[side*1.61,.55,1.88],[side*1.01,1.68,1.40],.072,c.metal);
  rod(gear,'Tirant principal',[side*1.55,.69,1.88],[side*.98,1.2,2.53],.043,c.dark);
  const door=box(gear,'Portella tren principal',[.08,.49,.74],[side*1.25,1.35,1.75]);door.rotation.z=side*.40;
  wheel(side*.145,.33,-4.48,.33);
 }
 rod(gear,'Amortidor davanter',[0,.37,-4.48],[0,1.19,-4.16],.065,c.metal);
 const nose=group('Torreta i sensors frontals');
 sphere(nose,'Torreta sota el morro',[0,1.13,-5.71],[.35,.31,.40],c.body);
 for(const x of [-.055,.055])for(const y of [1.07,1.18])rod(nose,'Canó de torreta',[x,y,-5.82-p.nose],[x,y,-6.65-p.nose],.023,c.dark);
 cyl(nose,'Anella canons',.105,.055,[0,1.125,-6.47-p.nose],c.dark,'z',8);
 sphere(nose,'Sensor sota cabina',[-.38,1.07,-5.03],[.26,.24,.37],c.belly);
 cyl(nose,'Lent sensor',.12,.04,[-.38,1.07,-5.38],0x213b3b,'z');
 if(!p.light)for(const side of [-1,1])rod(nose,'Pitot',[side*.40,1.83,-5.79],[side*.55,1.86,-6.24-p.nose],.016,c.dark);
 // Opaque meshes are batched per named assembly; glass and animated
 // rotor pivots remain independent for selection, edits and serialization.
 const merge=g=>{
  for(const child of [...g.children])if(child.isGroup)merge(child);
  const batches=new Map();
  for(const m of g.children)if(m.isMesh&&!m.material.transparent){const key=m.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m)}
  for(const items of batches.values()){
   if(items.length<2)continue;const position=[],normal=[],parts=[];
   for(const m of items){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);position.push(...geo.attributes.position.array);normal.push(...geo.attributes.normal.array);parts.push(m.name);geo.dispose();g.remove(m);m.geometry.dispose()}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(position,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normal,3));geo.userData.labOwned=true;
   const m=new T.Mesh(geo,items[0].material);m.name=g.name+' · '+m.material.color.getHexString();m.castShadow=true;m.receiveShadow=true;m.userData.batchedParts=parts;g.add(m);
  }
 };merge(root);
 Object.assign(root.userData,{mi24Proposal:id,referenceVersion:MI24_VERSION,crewSeats:2,transportSeats:8,rotorDiameter:17.3,tailRotorDiameter:3.908,labSizeMultiplier:1,labAssemblies:true});
 return root;
}
