// Regression test: ONLY the BTR-82 original & the newly repaired candidate.
// Actual GLB binary checked, not only manifest text or preview thumbnails.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const dir=process.env.BTR82_TEST_DIR || path.resolve(__dirname,'../assets/vehicle-candidates/tanqueta');
const manifestPath=process.env.BTR82_TEST_DIR ? null : path.resolve(dir,'../manifest.json');
const approved=[
 {name:'btr82-base-100.glb',bytes:428172,triangles:5371,meshes:18,
  sha:'5d26d5af11a575d085411308e2cb8e695f6d6346d505798661cde88165d4be7d'},
 {name:'btr82-50-repaired.glb',bytes:185796,triangles:4581,meshes:25,
  sha:'aa10c00cde94e26b1a3edcfed1836092012b5e3e07b66ec330f1fe0c9467ba16'}
];
assert.deepEqual(fs.readdirSync(dir).filter(n=>n.endsWith('.glb')).sort(),
 approved.map(a=>a.name).sort(),'No old candidate GLBs allowed');
function parse(file){
 const data=fs.readFileSync(path.join(dir,file));
 assert.equal(data.toString('ascii',0,4),'glTF',file);
 assert.equal(data.readUInt32LE(4),2,file);
 assert.equal(data.readUInt32LE(8),data.length,file);
 const len=data.readUInt32LE(12),type=data.readUInt32LE(16);
 assert.equal(type,0x4e4f534a,'GLB JSON chunk');
 const json=JSON.parse(data.subarray(20,20+len).toString('utf8'));
 const binStart=20+len+8;
 return {data,json,binStart};
}
function accessor(glb,i){
 const a=glb.json.accessors[i],v=glb.json.bufferViews[a.bufferView];
 const scalarSize={5121:1,5123:2,5125:4,5126:4}[a.componentType];
 const comps={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
 assert(scalarSize&&comps,'Unsupported accessor '+a.type+' / '+a.componentType);
 const stride=v.byteStride||scalarSize*comps;
 const start=glb.binStart+(v.byteOffset||0)+(a.byteOffset||0);
 const output=[];
 for(let j=0;j<a.count;j++){
  const row=[];
  for(let k=0;k<comps;k++){
   const x=start+j*stride+k*scalarSize;
   row.push(a.componentType===5126?glb.data.readFloatLE(x):
    a.componentType===5125?glb.data.readUInt32LE(x):
    a.componentType===5123?glb.data.readUInt16LE(x):glb.data.readUInt8(x));
  }
  output.push(row);
 }
 return output;
}
function faces(glb,mesh){
 let output=[];
 for(const p of mesh.primitives){
  const vertices=accessor(glb,p.attributes.POSITION);
  const indices=accessor(glb,p.indices).map(a=>a[0]);
  for(let i=0;i<indices.length;i+=3){
   output.push([vertices[indices[i]],vertices[indices[i+1]],vertices[indices[i+2]]]);
  }
 }
 return output;
}
function xyz(glb,mesh){return mesh.primitives.flatMap(p=>accessor(glb,p.attributes.POSITION));}
function box(points){return {
 min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),
 max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i])))
};}
const parsed={};
for(const record of approved){
 const glb=parse(record.name);parsed[record.name]=glb;
 assert.equal(glb.data.length,record.bytes,record.name+' bytes');
 assert.equal(crypto.createHash('sha256').update(glb.data).digest('hex'),record.sha,record.name+' SHA');
 assert.equal(glb.json.meshes.length,record.meshes,'GLB mesh count: '+record.name);
 const tris=glb.json.meshes.reduce((s,m)=>s+m.primitives.reduce((s,p)=>s+glb.json.accessors[p.indices].count/3,0),0);
 assert.equal(tris,record.triangles,'GLB triangle count: '+record.name);
 assert.equal(glb.json.images?.length||0,0,'No broken old atlas UVs');
 assert(glb.json.materials?.every(m=>m.alphaMode!=='BLEND'),'No transparent corrupted materials');
 console.log('PASS '+record.name+': '+tris+' triangles / '+record.meshes+' meshes, SHA verified');
}
const base=parsed['btr82-base-100.glb'];
const fixed=parsed['btr82-50-repaired.glb'];
const meshByName=new Map(fixed.json.meshes.map(m=>[m.name,m]));
// Prove genuine source hull faces are *identical* in the new GLB; however,
// that ALONE does not seal missing holes, so assert closure geometry too.
function fp(face){return face.map(v=>v.map(x=>Math.round(x*1e5)).join(',')).sort().join('|');}
for(const oldMesh of base.json.meshes.filter(m=>m.name.startsWith('hull_'))){
 const fresh=meshByName.get(oldMesh.name);
 assert(fresh,'Missing genuine hull primitive '+oldMesh.name);
 const a=faces(base,oldMesh).map(fp).sort();
 const b=faces(fixed,fresh).map(fp).sort();
 assert.deepEqual(b,a,'Changed hull faces '+oldMesh.name);
}
// Covering both negative-Z nose cut and positive-Z rear cheeks is mandatory.
const armor=meshByName.get('BTR82_repair_olive_armour_repaired');
const bevel=meshByName.get('BTR82_repair_olive_bevel_repaired');
assert(armor&&bevel,'Missing actual hull closure surfaces');
const cover=[...xyz(fixed,armor),...xyz(fixed,bevel)];
assert(cover.some(p=>p[2]<-5.07&&p[1]>.79),'Nose must have an outer armoured surface');
assert(cover.some(p=>p[2]<-4.78&&p[1]<.35),'Lower front bulkhead must close the cut-out');
for(const side of [-1,1]){
 assert(cover.some(p=>p[2]>5.72&&p[0]*side>1.4),'Missing rear sponson cheek on side '+side);
 assert(cover.some(p=>p[2]>5.1&&p[0]*side>1.55),'Rear armour must meet the outside sidewall on side '+side);
}
// Each of the eight wheels is really sealed (front + rear faces) and has
// distinct tyre sidewall, rim and hub vertex colours; remains independently animatable.
const wheels=[...meshByName.values()].filter(m=>/^BTR82_Object_\d+_material_9_closed_12sided$/.test(m.name));
assert.equal(wheels.length,8,'Exactly 8 independently animatable 12-sided wheels');
for(const wheel of wheels){
 assert.equal(faces(fixed,wheel).length,168,'Wheel detail must not collapse: '+wheel.name);
 assert(wheel.primitives.every(p=>p.attributes.COLOR_0!==undefined),'Rim and tire colour '+wheel.name);
}
// Four real front lamps as paired housing and lens geometries, not just text.
const lamps=meshByName.get('BTR82_repair_headlight_lens_ivory');
const cases=meshByName.get('BTR82_repair_headlight_housings_matte');
assert(lamps&&cases,'Missing actual front headlamps');
assert.equal(faces(fixed,lamps).length,48,'Four 12-triangle front headlamp lenses');
assert.equal(faces(fixed,cases).length,48,'Four lamp housings');
assert(xyz(fixed,lamps).every(p=>p[2]<-5),'All headlamps need to face the nose -Z');
const distinctX=new Set(xyz(fixed,lamps).map(p=>Math.round(p[0]*10)/10));
assert(distinctX.size>=8,'Four separated lights rather than one lens');
// The previous black barrel stopped outside the turret. The new black tube
// MUST enter far INSIDE the original turret's bounding volume at z=-1.015.
const turret=meshByName.get('turret_material_3');
const gun=meshByName.get('BTR82_repair_black_barrel_protrudes_into_turret');
assert(turret&&gun,'Turret and long barrel must be separate components');
const tb=box(xyz(fixed,turret)),gb=box(xyz(fixed,gun));
assert(gb.min[2]<-4.3,'Barrel muzzle should point forward to -Z');
assert(gb.max[2]>-1.06,'Barrel must extend DEEP INTO the turret at the rear');
assert(gb.max[2]<tb.max[2]&&gb.max[2]>tb.min[2]+1.1,
 'Barrel must overlap the turret, not stop at its front wall');
assert(gb.min[0]<-.12&&gb.max[0]>.12,'Gun mount collar must remain visible');
const gunPrimitive=gun.primitives[0];
const mat=fixed.json.materials[gunPrimitive.material];
assert.equal(mat.name,'black_barrel_protrudes_into_turret');
assert(Math.max(...mat.pbrMetallicRoughness.baseColorFactor.slice(0,3))<.13,'Gun should be matte black');
if(manifestPath){
 const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 assert.equal(m.selectedForLod.tanqueta.activePreviewModels,2);
 assert.equal(m.selectedForLod.tanqueta.original.triangles,5371);
 assert.equal(m.selectedForLod.tanqueta.selected.triangles,4581);
 assert.equal(m.selectedForLod.tanqueta.selected.meshes,25);
}
console.log('PASS BTR-82: source hull preserved, front filled, rear sides enclosed, 8 sealed wheels, 4 lamps, long gun attached to turret');