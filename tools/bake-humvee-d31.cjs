// Deterministic, dependency-free GLB baker for the approved Humvee D3.1.
// Run in Node with repository access, or call bakeD31(...) directly.
// The ORIGINAL source GLB is retained for the interactive editor until QA.
// The output is a standalone 175% glTF 2.0 binary: body UV texture, glass,
// grille/handles, antenna, axles, and four A4.3 wheel meshes with named pivots.
'use strict';
const SCALE=1.75;
const WHEELS={axles:[-1.78,1.45],centerY:.49,offsetZ:1.02,truckScale:.625};
const C={dark:0x202824,shadow:0x343c32,olive:0x707957,metal:0x979889,
       axle:0x333b31,rubber:0x242924,hub:0x717b70,trim:0x303930};
const between=(a,b,t)=>a+(b-a)*t;
function decode(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const check=(c,m)=>{if(!c)throw Error('Source GLB: '+m)};
 check(d.getUint32(0,true)===0x46546c67,'bad magic');
 const jlen=d.getUint32(12,true);
 const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+jlen)));
 const binStart=20+jlen+8;
 const view=i=>json.bufferViews[i];
 function getAccessor(id,index){
  const a=json.accessors[id],v=view(a.bufferView);
  const comp=a.type==='VEC3'?3:a.type==='VEC2'?2:1;
  const size=a.componentType===5125?4:a.componentType===5126?4:2;
  const start=binStart+(v.byteOffset||0)+(a.byteOffset||0)+index*size*comp;
  return Array.from({length:comp},(_,i)=>{
   const off=start+i*size;
   return a.componentType===5125?d.getUint32(off,true):
      a.componentType===5126?d.getFloat32(off,true):d.getUint16(off,true);
  });
 }
 const prim=json.meshes[0].primitives[0],faces=[];
 for(let i=0;i<json.accessors[prim.indices].count;i+=3){
  const tri=[];
  for(let j=0;j<3;j++){
   const id=getAccessor(prim.indices,i+j)[0];
   tri.push({p:getAccessor(prim.attributes.POSITION,id),
     uv:getAccessor(prim.attributes.TEXCOORD_0,id),n:[0,1,0]});
  }
  faces.push(tri);
 }
 const v=view(json.images[0].bufferView);
 const png=bytes.slice(binStart+(v.byteOffset||0),binStart+(v.byteOffset||0)+v.byteLength);
 const allZ=faces.flatMap(f=>f.map(v=>v.p[2])).sort((a,b)=>a-b);
 const axis=(allZ[Math.floor(.05*(allZ.length-1))]+allZ[Math.floor(.95*(allZ.length-1))])*.5;
 const allX=faces.flatMap(f=>f.map(v=>v.p[0]));
 const centerX=(Math.min(...allX)+Math.max(...allX))*.5;
 return {faces,axis,centerX,png,json};
}
function v3add(a,b){return a.map((v,i)=>v+b[i]);}
function v3sub(a,b){return a.map((v,i)=>v-b[i]);}
function v3mul(a,f){return a.map(v=>v*f);}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function norm(v){const l=Math.hypot(...v);return l>1e-9?v3mul(v,1/l):[0,1,0];}
function addTriangle(mesh,a,b,c,UV){
 const n=norm(cross(v3sub(b,a),v3sub(c,a)));
 for(const [j,v] of [a,b,c].entries()){
  mesh.positions.push(...v);mesh.normals.push(...n);
  if(UV)mesh.uvs.push(...UV[j]);
 }
 mesh.faces++;
}
function makeCollector(){return {positions:[],normals:[],uvs:[],faces:0};}
function box(collector,tr,x,y,z,sx,sy,sz){
 const v=(i,j,k)=>tr([x+i*sx/2,y+j*sy/2,z+k*sz/2]);
 const a=v(-1,-1,-1),b=v(1,-1,-1),c=v(1,1,-1),d=v(-1,1,-1);
 const e=v(-1,-1,1),f=v(1,-1,1),g=v(1,1,1),h=v(-1,1,1);
 for(const q of [[a,d,c,b],[e,f,g,h],[a,e,h,d],[b,c,g,f],[a,b,f,e],[d,h,g,c]]){
  addTriangle(collector,q[0],q[1],q[2]);addTriangle(collector,q[0],q[2],q[3]);
 }
}
function disk(collector,center,axis,radius,length,segments=10){
 // Cylinder shaft along world unit axis; same flat A4.3 tyre/rim form.
 const unit=norm(axis),reference=Math.abs(unit[1])<.90?[0,1,0]:[0,0,1];
 const right=norm(cross(reference,unit)),up=cross(unit,right);
 const o0=v3add(center,v3mul(unit,-length/2)),o1=v3add(center,v3mul(unit,length/2));
 const cir=(c,i)=>{
  const a=2*Math.PI*i/segments;
  return v3add(c,v3add(v3mul(right,radius*Math.cos(a)),v3mul(up,radius*Math.sin(a))));
 };
 for(let i=0;i<segments;i++){
  const p=cir(o0,i),q=cir(o0,i+1),s=cir(o1,i),t=cir(o1,i+1);
  addTriangle(collector,p,t,q);addTriangle(collector,p,s,t);
  addTriangle(collector,o0,q,p);addTriangle(collector,o1,s,t);
 }
}
function rod(collector,tr,a,b,r,segments=7){
 const p=tr(a),q=tr(b),direction=v3sub(q,p),center=v3mul(v3add(p,q),.5);
 disk(collector,center,direction,r*SCALE,Math.hypot(...direction),segments);
}
function quad(collector,tr,vertices){
 const pts=vertices.map(tr);
 addTriangle(collector,pts[0],pts[1],pts[2]);
 addTriangle(collector,pts[0],pts[2],pts[3]);
}
function meshToBuffer(binary,bytes){
 const offset=(binary.length+3)&~3;
 while(binary.length<offset)binary.push(0);
 const arr=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const start=binary.length;
 for(const b of arr)binary.push(b);
 return {byteOffset:start,byteLength:arr.byteLength};
}
function colorFactor(hex,alpha=1){
 const c=x=>{const s=(x/255);return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4)};
 // GLTF expects LINEAR baseColorFactor (sRGB CSS hex is decoded)
 return [c((hex>>16)&255),c((hex>>8)&255),c(hex&255),alpha];
}
function toBase64(bytes){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',out=[];
 for(let i=0;i<bytes.length;i+=3){
  const a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,c=i+2<bytes.length?bytes[i+2]:0;
  out.push(alphabet[a>>2],alphabet[((a&3)<<4)|(b>>4)],
   i+1<bytes.length?alphabet[((b&15)<<2)|(c>>6)]:'=',
   i+2<bytes.length?alphabet[c&63]:'=');
 }
 return out.join('');
}
function bakeHumveeD31(baseBytes,geometryFns){
 const {deriveSymmetricD3,removeOriginalTires,flattenSelectedDoorPatchOnAllDoors}=geometryFns;
 const input=decode(baseBytes);
 const derive=deriveSymmetricD3(input.faces,input.axis,[2200],{dropDoorFacets:false})[0];
 const untired=removeOriginalTires(derive.triangles,input.axis);
 const flat=flattenSelectedDoorPatchOnAllDoors(untired.triangles,input.axis,[1242,1246,1250,1252]);
 if(flat.stats.doors!==4||flat.stats.panels!==8)throw Error('D3.1 incorrect patch count');
 // Exactly the same transform as the preview's oriented Y=-PI/2 and
 // inner model.position(-center.x,0,-axis), scaled to 175%.
 const ymin=Math.min(-.011,...flat.triangles.flatMap(t=>t.map(v=>v.p[1])));
 const tr=p=>[-(p[2]-input.axis)*SCALE,(p[1]-ymin)*SCALE,
             (p[0]-input.centerX)*SCALE];
 const hull=makeCollector();
 for(const tri of flat.triangles) addTriangle(hull,...tri.map(v=>tr(v.p)),tri.map(v=>v.uv));
 const components=new Map();
 const get=name=>{if(!components.has(name))components.set(name,makeCollector());return components.get(name)};
 // Transparent windows: preserve the six actual preview polygons.
 const glass=get('glass');
 for(const side of [-1,1]){
  quad(glass,tr,[[-.790,1.242,side*1.093],[-.065,1.242,side*1.093],[-.106,1.714,side*.985],[-.748,1.714,side*.985]]);
  quad(glass,tr,[[.076,1.242,side*1.093],[.772,1.242,side*1.093],[.727,1.708,side*.985],[.112,1.708,side*.985]]);
 }
 quad(glass,tr,[[-.941,1.254,-.977],[-.941,1.254,.977],[-.810,1.713,.913],[-.810,1.713,-.913]]);
 quad(glass,tr,[[.851,1.255,-.964],[.851,1.255,.964],[.796,1.703,.911],[.796,1.703,-.911]]);
 const bk=(m,x,y,z,sx,sy,sz)=>box(get(m),tr,x,y,z,sx,sy,sz);
 const seam=(m,a,b,r)=>rod(get(m),tr,a,b,r,7);
 const x=-2.295;
 bk('dark',x+.020,.965,0,.024,.267,.89);
 for(let i=0;i<9;i++){
  const z=-.351+i*.702/8;
  bk('metal',x-.028,.966,z,.033,.213,.019);
 }
 bk('metal',x-.016,1.100,0,.036,.021,.89);
 bk('dark',x-.020,.828,0,.039,.022,.89);
 for(const z of [-.453,.453])bk('dark',x-.016,.964,z,.038,.263,.029);
 for(const side of [-1,1]){
  const z=side*1.134;
  for(const cx of [-.446,.426]){
   const half=cx<0?.342:.333;
   seam('shadow',[cx-half,1.280,z],[cx+half,1.280,z],.008);
   seam('shadow',[cx-half,1.280,z],[cx-half,1.052,z],.007);
   seam('shadow',[cx+half,1.280,z],[cx+half,1.052,z],.007);
   bk('dark',cx+.147,1.266,z+side*.015,.126,.036,.024);
  }
 }
 // Antenna (exact approved rear mount) including tiny metallic tip.
 const antennaX=1.87,antennaZ=input.axis+.79;
 bk('shadow',antennaX,1.58,antennaZ,.16,.16,.14);
 seam('shadow',[antennaX,1.63,antennaZ],[antennaX,1.89,antennaZ],.040);
 seam('antennaMetal',[antennaX,1.88,antennaZ],[antennaX+.026,2.37,antennaZ-.012],.014);
 const end=tr([antennaX+.026,2.37,antennaZ-.012]);
 disk(get('antennaMetal'),end,[0,1,0],.032*SCALE,.038*SCALE,8);
 // Axles reproduce the preview's internal span.
 for(const axle of WHEELS.axles){
  const a=tr([axle,WHEELS.centerY,input.axis-WHEELS.offsetZ*.985]);
  const b=tr([axle,WHEELS.centerY,input.axis+WHEELS.offsetZ*.985]);
  const delta=v3sub(b,a);
  disk(get('axle'),v3mul(v3add(a,b),.5),delta,.078*SCALE,Math.hypot(...delta),8);
 }
 // Four A4.3 wheels each comprises the identical original truck tyre/rim/cap.
 // Groups are retained in the GLB to animate rolling and steering.
 const wheels=[];
 for(const axle of WHEELS.axles){
  for(const side of [-1,1]){
   const center=tr([axle,WHEELS.centerY,input.axis+side*WHEELS.offsetZ]);
   wheels.push({center,front:axle===WHEELS.axles[0],side});
  }
 }
 const sharedWheels=[];
 for(const [name,radius,length,segments] of [
  ['rubber',.80,.47,12],['hub',.46,.485,10],['trim',.20,.50,8]
 ]){
  const geo=makeCollector();
  disk(geo,[0,0,0],[1,0,0],radius*WHEELS.truckScale*SCALE,
   length*WHEELS.truckScale*SCALE,segments);
  sharedWheels.push([name,geo]);
 }
 const bin=[],views=[],accessors=[],meshes=[],materials=[],nodes=[];
 const gltf={asset:{version:'2.0',generator:'Hunter Arxipèlag D3.1 deterministic baker',
   extras:{approval:'Four doors flattened; A4.3 wheels; 175%'}},
  scenes:[{nodes:[0]}],scene:0,buffers:[{byteLength:0}],
  bufferViews:views,accessors,meshes,materials,nodes,
  images:[],textures:[],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}]};
 function buffer(array,target){
  const v=meshToBuffer(bin,array);v.buffer=0;if(target)v.target=target;
  const index=views.length;views.push(v);return index;
 }
 function accessor(array,type,minmax){
  const componentType=5126;
  const v=buffer(new Uint8Array(new Float32Array(array).buffer),34962);
  const count=array.length/({SCALAR:1,VEC2:2,VEC3:3}[type]);
  const a={bufferView:v,componentType,count,type};
  if(minmax){const width=type==='VEC3'?3:2;const min=Array(width).fill(Infinity),max=Array(width).fill(-Infinity);
   for(let i=0;i<count;i++)for(let k=0;k<width;k++){
    const n=array[i*width+k];min[k]=Math.min(min[k],n);max[k]=Math.max(max[k],n);
   }
   a.min=min;a.max=max;
  }
  const index=accessors.length;accessors.push(a);return index;
 }
 const image=buffer(input.png);gltf.images.push({bufferView:image,mimeType:'image/png'});
 gltf.textures.push({source:0,sampler:0});
 materials.push({name:'Humvee original atlas',doubleSided:true,
  pbrMetallicRoughness:{baseColorTexture:{index:0},baseColorFactor:[1,1,1,1],
   metallicFactor:.4,roughnessFactor:1}});
 const matName=new Map([['body',0]]);
 for(const [name,col,alpha] of [
  ['glass',0xa3bfc0,.34],['dark',C.dark,1],['shadow',C.shadow,1],
  ['metal',C.metal,1],['antennaMetal',0x7c8179,1],['axle',C.axle,1],
  ['rubber',C.rubber,1],['hub',C.hub,1],['trim',C.trim,1]
 ]){
  const idx=materials.length;matName.set(name,idx);
  materials.push({name,alphaMode:alpha<1?'BLEND':'OPAQUE',doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:colorFactor(col,alpha),
     metallicFactor:name==='metal'||name==='hub'?.24:0,
     roughnessFactor:name==='glass'?.12:.86}});
 }
 function makeMesh(name,collector,materialKey){
  if(!collector.faces)return null;
  const positions=accessor(collector.positions,'VEC3',true);
  const normals=accessor(collector.normals,'VEC3');
  const attributes={POSITION:positions,NORMAL:normals};
  if(collector.uvs.length)attributes.TEXCOORD_0=accessor(collector.uvs,'VEC2');
  const id=meshes.length;
  meshes.push({name,primitives:[{attributes,material:matName.get(materialKey)||0,mode:4}]});
  return id;
 }
 function node(name,meshIndex,additional={}){
  const id=nodes.length;nodes.push({name,...(meshIndex!=null?{mesh:meshIndex}:{}),...additional});return id;
 }
 const root=node('Humvee D3.1 · 175%',null,{children:[],
  extras:{model:'D3.1',gameScale:SCALE,bodyTriangles:flat.triangles.length,
   frontAxis:'-Z',baked:true}});
 const attach=(child)=>nodes[root].children.push(child);
 attach(node('D31_Flattened_Body',makeMesh('D31_flattened_body',hull,'body')));
 for(const [name,collector] of components){
  attach(node('D31_'+name,makeMesh('D31_'+name,collector,name)));
 }
 const wheelMeshes=sharedWheels.map(([name,collector])=>[name,makeMesh('A4.3_'+name,collector,name)]);
 for(let i=0;i<wheels.length;i++){
  const w=wheels[i],wheelId=node('wheel-'+(w.front?'front':'rear')+'-'+(w.side<0?'right':'left'),null,{
   translation:w.center,children:[],extras:{wheel:true,front:w.front,side:w.side,radius:.5*SCALE}});
  for(const [name,meshId] of wheelMeshes){
   nodes[wheelId].children.push(node('A4.3_'+name,meshId));
  }
  attach(wheelId);
 }
 while(bin.length%4)bin.push(0);
 gltf.buffers[0].byteLength=bin.length;
 const jsonText=JSON.stringify(gltf),encoder=new TextEncoder();
 const jb=encoder.encode(jsonText),paddedJson=(jb.length+3)&~3;
 const total=12+8+paddedJson+8+bin.length;
 const output=new Uint8Array(total);
 const view=new DataView(output.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,total,true);
 view.setUint32(12,paddedJson,true);view.setUint32(16,0x4e4f534a,true);
 output.set(jb,20);
 output.fill(0x20,20+jb.length,20+paddedJson);
 const binHeader=20+paddedJson;
 view.setUint32(binHeader,bin.length,true);view.setUint32(binHeader+4,0x004e4942,true);
 output.set(bin,binHeader+8);
 return {bytes:output,base64:toBase64(output),summary:{
  scale:SCALE,sourceFaces:input.faces.length,reducedFaces:derive.faces,
  bodyFaces:flat.triangles.length,wheelCount:wheels.length,
  materials:materials.length,drawCalls:meshes.length,
  triangleCount:meshes.reduce((sum,m)=>sum+(m.primitives[0].attributes.POSITION!=null?
   accessors[m.primitives[0].attributes.POSITION].count/3:0),0),
  bytes:output.length,centerX:input.centerX,axis:input.axis
 }};
}
if(typeof module!=='undefined'&&module.exports)module.exports={bakeHumveeD31};
if(typeof require==='function'&&typeof module!=='undefined'&&require.main===module){
 (async()=>{
  const fs=require('node:fs'),path=require('node:path');
  const root=path.resolve(__dirname,'..');
  const [geo,ref,patch]=await Promise.all([
   import('../src/humvee-d3-geometry.mjs'),
   import('../src/humvee-d31-refinements.mjs'),
   import('../src/humvee-d31-selected-patch.mjs')
  ]);
  const input=fs.readFileSync(path.join(root,'assets/humvee/humvee_D.glb'));
  const {bytes,summary}=bakeHumveeD31(input,{
   deriveSymmetricD3:geo.deriveSymmetricD3,
   removeOriginalTires:ref.removeOriginalTires,
   flattenSelectedDoorPatchOnAllDoors:patch.flattenSelectedDoorPatchOnAllDoors
  });
  const output=path.join(root,'assets/humvee/humvee_D31_175.glb');
  fs.writeFileSync(output,bytes);
  console.log('Created baked Humvee D3.1:',output,summary);
 })().catch(error=>{console.error(error);process.exitCode=1});
}
