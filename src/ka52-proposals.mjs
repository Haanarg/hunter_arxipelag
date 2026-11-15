// Native low-poly studies from the photographs linked in the model catalogue.
// Metres, +Y up, nose -Z. A/B/C are proportion studies, not real Ka-52 variants.
export const KA52_PROPOSAL_VERSION='ka52-proposals-20261115-1';
export const KA52_PROPOSALS=Object.freeze({
 'ka52-a':{title:'Ka-52 · A · Equilibrat',note:'Morro arrodonit · cabina ampla · proporcions de referència',nose:1,width:1,canopy:1,roundness:.82,segments:12},
 'ka52-b':{title:'Ka-52 · B · Morro ample',note:'Radom més ple · cabina més ampla i baixa',nose:.94,width:1.12,canopy:.94,roundness:.66,segments:12},
 'ka52-c':{title:'Ka-52 · C · Perfil afilat',note:'Morro més llarg i baix · cabina més angular',nose:1.16,width:.98,canopy:.98,roundness:1.06,segments:12},
 'ka52-d':{title:'Ka-52 · D · Facetat lleuger',note:'Volums més simples · menys cares i detalls petits',nose:1.02,width:1.04,canopy:1,roundness:.88,segments:8,light:true}
});

export function createKa52Proposal(T,id){
 const p=KA52_PROPOSALS[id];if(!p)throw Error('Proposta Ka-52 desconeguda: '+id);
 const root=new T.Group();root.name=p.title;
 const c={body:0x63725b,top:0x78816b,radome:0x577477,dark:0x242b29,metal:0x7e8985,glass:0x7dabb7,rubber:0x171c1a};
 const materials=new Map();
 const mat=(color,glass=false)=>{
  const key=color+':'+glass;
  if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,flatShading:true,side:T.DoubleSide,roughness:glass?.2:.8,metalness:glass?.08:.12,transparent:glass,opacity:glass?.36:1,depthWrite:!glass}));
  return materials.get(key);
 };
 const group=(name,parent=root)=>{const g=new T.Group();g.name=name;parent.add(g);return g};
 const mesh=(g,name,geo,color=c.body,glass=false)=>{const m=new T.Mesh(geo,mat(color,glass));m.name=name;m.castShadow=!glass;m.receiveShadow=true;g.add(m);return m};
 const poly=(g,name,points,color=c.body,glass=false)=>{
  const v=[];for(let i=1;i<points.length-1;i++)v.push(...points[0],...points[i],...points[i+1]);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.computeVertexNormals();return mesh(g,name,geo,color,glass);
 };
 const box=(g,name,size,pos,color=c.body)=>{const m=mesh(g,name,new T.BoxGeometry(...size),color);m.position.set(...pos);return m};
 const cyl=(g,name,r,len,pos,color=c.metal,axis='y',segments=p.light?8:12)=>{
  const m=mesh(g,name,new T.CylinderGeometry(r,r,len,segments),color);m.position.set(...pos);
  if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;return m;
 };
 const rod=(g,name,a,b,r=.025,color=c.metal)=>{
  const v=new T.Vector3(...b).sub(new T.Vector3(...a)),m=cyl(g,name,r,v.length(),[0,0,0],color,'y',p.light?4:6);
  m.position.set(...a).addScaledVector(v,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;
 };
 const ellipsoid=(g,name,pos,scale,color=c.body)=>{const m=mesh(g,name,new T.SphereGeometry(1,p.light?8:12,p.light?6:8),color);m.position.set(...pos);m.scale.set(...scale);return m};
 // [z, half width, underside, roof, belt]. A rounded rectangle gives the
 // radome and cabin their broad front, instead of a pointed circular tube.
 const ring=(s,n=12,exponent=.85)=>Array.from({length:n},(_,i)=>{
  const a=i*2*Math.PI/n,cs=Math.cos(a),sn=Math.sin(a),pow=v=>Math.sign(v)*Math.abs(v)**exponent;
  return [s[1]*pow(cs),s[4]+pow(sn)*(sn>=0?s[3]-s[4]:s[4]-s[2]),s[0]];
 });
 const loft=(g,name,sections,{color=c.body,n=12,exponent=.85,glass=()=>false,caps=[true,true],endRing=null}={})=>{
  const rings=sections.map(s=>ring(s,n,exponent));
  if(endRing)rings[rings.length-1]=endRing;
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<n;k++){
   const q=[rings[j][k],rings[j+1][k],rings[j+1][(k+1)%n],rings[j][(k+1)%n]],isGlass=glass(j,k);
   poly(g,(isGlass?'Vidre ':'')+name+' '+j+'/'+k,q,isGlass?c.glass:color,isGlass);
   if(isGlass){
    const adjacent=[[j,(k+n-1)%n],[j+1,k],[j,(k+1)%n],[j-1,k]];
    for(let e=0;e<4;e++){
     const [jj,kk]=adjacent[e];
     if(jj<0||jj>=rings.length-1||!glass(jj,kk)||e===0&&k===3)
      rod(g,'Marc cabina',q[e],q[(e+1)%4],.024,c.dark);
    }
   }
  }
  if(caps[0])poly(g,name+' frontal',rings[0].slice().reverse(),color);
  if(caps[1])poly(g,name+' posterior',rings.at(-1),color);
  return rings;
 };
 const hull=group('Fuselatge i cabina'),radome=group('Radom arrodonit'),tail=group('Botaló i deriva');
 const w=p.width,noseZ=-3.76-1.82*p.nose;
 const join=[-3.76,1.02*w,1.02,id==='ka52-c'?2.14:2.26,1.92];
 const noseSections=[
  [noseZ,.065*w,1.51,1.64,1.57],
  [noseZ+.22,.49*w,1.24,1.91,1.59],
  [-4.75-.32*(p.nose-1),.89*w,1.08,id==='ka52-c'?2.03:2.13,1.64],join
 ];
 if(p.light)noseSections.splice(1,1);
 loft(radome,'Radom',noseSections,{color:c.radome,exponent:p.roundness,caps:[true,false],endRing:ring(join)});
 const tailJoin=[3.40,.57,1.26,2.36,1.75];
 loft(hull,'Cabina',[
  join,[-2.60,1.11*w,.96,2.12+1.02*p.canopy,1.96],
  [-1.33,1.08*w,.92,2.12+1.04*p.canopy,1.94],
  [-.45,.99,.91,2.83,1.75],[1.65,.94,1.03,2.69,1.76],tailJoin
 ],{glass:(j,k)=>j===0&&k<6||j===1&&[0,1,4,5].includes(k),caps:[false,false]});
 loft(tail,'Botaló',[tailJoin,[4.90,.40,1.40,2.17,1.78],[6.9,.26,1.54,2.0,1.77],[8.50,.13,1.66,1.94,1.8]],{caps:[false,true]});
 // Opaque floor and rear bulkhead, two real seats behind transparent panes.
 const cabin=group('Interior de dos pilots');
 box(cabin,'Terra cabina',[1.82*w,.09,2.27],[0,1.09,-2.46],c.dark);
 box(cabin,'Mampara posterior',[1.78*w,1.51,.08],[0,1.9,-1.23],c.body);
 for(const side of [-1,1]){
  const x=side*.49*w;
  box(cabin,'Seient pilot',[.45,.13,.48],[x,1.47,-2.20],c.dark);
  box(cabin,'Respatller pilot',[.45,.61,.13],[x,1.78,-1.99],c.dark);
  box(cabin,'Reposacaps pilot',[.27,.19,.14],[x,2.17,-1.98],c.dark);
  if(!p.light)rod(cabin,'Palanca cíclic',[x,1.47,-2.51],[x,1.85,-2.66],.022,c.dark);
 }
 box(cabin,'Tauler instruments',[1.65*w,.19,.38],[0,1.92,-3.10],c.dark);
 if(!p.light)for(const x of [-.46,.46])box(cabin,'Pantalla instruments',[.3,.13,.025],[x,1.96,-2.90],0x324952);
 // Nacelles with real recessed front openings, rather than dark discs
 // painted on a solid cap. The outer cowling grows smoothly around them.
 for(const side of [-1,1]){
  const engine=group(side<0?'Motor esquerre':'Motor dret');engine.position.x=side*1.02;
  const first=[-1.19,.38,2.13,3.03,2.57],r=ring(first,p.segments,.9);
  loft(engine,'Nacel·la',[first,[-.68,.48,2.02,3.20,2.60],[1.55,.46,2.06,3.14,2.60],[2.42,.33,2.12,2.87,2.52]],{n:p.segments,caps:[false,true]});
  const mouth=r.map(v=>[v[0]*.77,2.57+(v[1]-2.57)*.78,v[2]-.015]);
  const inner=mouth.map(v=>[v[0]*.90,2.57+(v[1]-2.57)*.9,v[2]+.28]);
  for(let i=0;i<r.length;i++){
   const j=(i+1)%r.length;
   poly(engine,'Llavi presa aire',[r[i],r[j],mouth[j],mouth[i]],c.body);
   poly(engine,'Conducte presa aire',[mouth[i],mouth[j],inner[j],inner[i]],c.dark);
  }
  poly(engine,'Fons presa aire',inner,c.dark);
  // Exhaust exits outboard/aft, as seen in the side photograph.
  const pipe=cyl(engine,'Escapament exterior',.30,.53,[side*.35,2.54,2.04],c.dark,'x',p.segments);
  pipe.rotation.y=side*.38;
  cyl(engine,'Boca escapament',.24,.045,[side*.61,2.54,2.13],0x101615,'x',p.segments);
  if(!p.light)for(let i=0;i<3;i++)box(engine,'Reixeta motor',[.29,.022,.10],[side*.12,3.14,1.0+i*.14],c.dark);
 }
 const gearbox=group('Transmissió coaxial');
 loft(gearbox,'Carenat transmissió',[[-1.02,.49,2.53,3.19,2.85],[-.40,.58,2.57,3.37,2.9],[.65,.56,2.50,3.33,2.9],[1.56,.37,2.47,2.92,2.7]],{n:8});
 cyl(gearbox,'Eix coaxial',.115,1.61,[0,4.02,0],c.metal);
 cyl(gearbox,'Màniga coaxial',.19,.48,[0,4.20,0],c.dark);
 for(const [height,sign] of [[3.84,1],[4.82,-1]]){
  const rotor=group(sign>0?'Rotor coaxial inferior':'Rotor coaxial superior');rotor.position.y=height;
  rotor.userData.kamovRotor={axis:'y',speed:sign*9};
  cyl(rotor,'Boixa rotor',.27,.17,[0,0,0],c.metal);
  for(let i=0;i<3;i++){
   const blade=group('Pala coaxial '+(i+1),rotor);blade.rotation.y=i*Math.PI*2/3+(sign<0?.42:0);
   rod(blade,'Braç articulat',[.17,0,0],[1.04,0,0],.065,c.metal);
   if(!p.light){
    rod(blade,'Biela rotor',[.33,-.23,.12],[.83,.025,.12],.026,c.metal);
    cyl(blade,'Articulació pala',.09,.17,[.84,0,0],c.dark);
   }
   const q=[[.94,.01,-.18],[6.87,-.06,-.22],[7.25,-.08,-.02],[7.25,-.08,.14],[1.18,.01,.24]];
   poly(blade,'Pala principal',q,c.dark);
   if(!p.light){poly(blade,'Intrados pala',q.map(v=>[v[0],v[1]-.035,v[2]]).reverse(),c.dark);
    for(let k=0;k<q.length;k++){const j=(k+1)%q.length;poly(blade,'Cantell pala',[q[k],q[j],[q[j][0],q[j][1]-.035,q[j][2]],[q[k][0],q[k][1]-.035,q[k][2]]],c.dark)}}
   box(blade,'Punta pala',[.20,.037,.25],[7.11,-.075,.025],0xa4aa92);
  }
 }
 // Stub wings, short pylons and recognisable low-poly external stores.
 const plate=(g,name,upper,thickness=.10)=>{
  const lower=upper.map(v=>[v[0],v[1]-thickness,v[2]]);
  poly(g,name,upper,c.top);poly(g,name+' inferior',lower.slice().reverse());
  for(let i=0;i<upper.length;i++){const j=(i+1)%upper.length;poly(g,name+' cantell',[upper[i],upper[j],lower[j],lower[i]])}
 };
 for(const side of [-1,1]){
  const wing=group(side<0?'Ala i càrrega esquerra':'Ala i càrrega dreta');
  plate(wing,'Ala curta',[[side*.85,1.91,-.20],[side*3.60,1.79,.23],[side*3.60,1.77,1.08],[side*.85,1.91,1.25]],.12);
  for(const x of [1.80,2.62,3.29])box(wing,'Piló',[.13,.33,.55],[side*x,1.60,.55],c.body);
  cyl(wing,'Contenidor coets',.29,1.7,[side*1.80,1.23,.1],c.metal,'z',p.segments);
  cyl(wing,'Cara contenidor coets',.275,.03,[side*1.80,1.23,-.765],c.dark,'z',p.segments);
  const count=p.light?7:12;
  for(let i=0;i<count;i++){const a=i*2*Math.PI/count;cyl(wing,'Boca coet',.036,.035,[side*1.8+Math.cos(a)*.19,1.23+Math.sin(a)*.19,-.79],c.rubber,'z',6)}
  for(const dy of [-.13,.13])for(const dx of [-.13,0,.13])cyl(wing,'Tub míssil',.057,1.88,[side*2.62+dx,1.24+dy,.08],c.dark,'z',6);
  box(wing,'Sensor punta ala',[.23,.32,.81],[side*3.57,1.96,.73],c.body);
  if(!p.light)ellipsoid(wing,'Sensor esfèric punta',[side*3.57,2.14,.42],[.105,.11,.15],c.dark);
  plate(tail,'Estabilitzador lateral',[[side*.22,1.93,5.80],[side*1.53,1.89,6.12],[side*1.53,1.88,6.79],[side*.22,1.93,6.53]],.065);
 }
 const profile=[[6.90,1.76],[7.55,3.65],[8.23,3.67],[8.53,1.71]],left=profile.map(([z,y])=>[-.115,y,z]),right=profile.map(([z,y])=>[.115,y,z]);
 poly(tail,'Deriva vertical',left,c.body);poly(tail,'Deriva vertical dreta',right.slice().reverse(),c.body);
 for(let i=0;i<left.length;i++){const j=(i+1)%left.length;poly(tail,'Cantell deriva',[left[i],left[j],right[j],right[i]],c.body)}
 if(!p.light){rod(tail,'Frontissa timó',[.12,1.9,8.38],[.12,3.52,8.2],.016,c.dark);
  box(tail,'Antena dorsal',[.035,.30,.23],[0,2.29,4.8],c.dark)}
 const gear=group('Tren aterratge');
 const wheel=(x,y,z,r)=>{
  cyl(gear,'Pneumàtic',r,.23,[x,y,z],c.rubber,'x',16);
  cyl(gear,'Llanta',r*.57,.245,[x,y,z],c.metal,'x',12);
 };
 for(const side of [-1,1]){
  wheel(side*1.59,.43,1.49,.43);
  rod(gear,'Amortidor principal',[side*1.59,.52,1.49],[side*1.13,1.42,1.12],.065,c.metal);
  rod(gear,'Tirant principal',[side*1.55,.68,1.5],[side*.95,1.19,2.05],.04,c.dark);
  box(gear,'Portella tren',[.10,.54,.80],[side*.99,1.10,1.5],c.body);
  wheel(side*.13,.29,-3.83,.29);
 }
 rod(gear,'Amortidor tren davanter',[0,.35,-3.83],[0,1.16,-3.45],.065,c.metal);
 const sensors=group('Sensors del morro');
 ellipsoid(sensors,'Torreta electroòptica',[0,.87,-4.45],[.38,.40,.38],c.metal);
 for(const [x,r] of [[-.14,.105],[.13,.075]])cyl(sensors,'Lent electroòptica',r,.045,[x,.88,-4.80],0x152e38,'z',p.segments);
 for(const side of [-1,1]){
  ellipsoid(sensors,'Sensor lateral',[side*1.02*w,1.80,-3.80],[.12,.13,.12],c.metal);
  if(!p.light)rod(sensors,'Pitot',[side*.98*w,2.10,-3.47],[side*1.1*w,2.14,-4.20],.016,c.dark);
 }
 const gun=group('Canó lateral dret');
 box(gun,'Culata canó',[.23,.25,.65],[1.14,1.31,-.71],c.dark);
 box(gun,'Suport canó',[.24,.30,.62],[1.04,1.28,-1.15],c.body);
 rod(gun,'Canó lateral dret',[1.25,1.25,-1.10],[1.25,1.25,-3.60],.046,c.dark);
 cyl(gun,'Boca canó',.062,.16,[1.25,1.25,-3.64],c.dark,'z',8);
 // Merge only direct opaque children of each named assembly. Keep glass,
 // editable assemblies and both animated rotor pivots independent.
 const merge=g=>{
  for(const child of [...g.children])if(child.isGroup)merge(child);
  const batches=new Map();
  for(const child of g.children)if(child.isMesh&&!child.material.transparent){
   const key=child.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(child);
  }
  for(const items of batches.values()){
   if(items.length<2)continue;
   const positions=[],normals=[],parts=[];
   for(const m of items){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);
    positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);parts.push(m.name);geo.dispose();g.remove(m);m.geometry.dispose();}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
   const m=new T.Mesh(geo,items[0].material);m.name=g.name+' · '+m.material.color.getHexString();m.castShadow=true;m.receiveShadow=true;m.userData.batchedParts=parts;g.add(m);
  }
 };merge(root);
 Object.assign(root.userData,{ka52Proposal:id,referenceVersion:KA52_PROPOSAL_VERSION,kamovCandidate:'ka52',crewSeats:2,rotorDiameter:14.5,labSizeMultiplier:1,ka52Assemblies:true});
 return root;
}
