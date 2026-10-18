#!/usr/bin/env node
// El pou ha de tenir volum interior, brocal i un fons visible.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/world-generation.js'),'utf8');
const start=source.indexOf('const addVillageWell='),end=source.indexOf('const compoundProp=',start);
assert.ok(start>=0&&end>start);
const geometry=(type,params)=>({type,params});
const THREE={
  BackSide:1,
  Mesh:class{constructor(geo,material){this.geometry=geo;this.material=material;this.position={y:0};this.rotation={x:0}}},
  CylinderGeometry:class{constructor(...params){Object.assign(this,geometry('cylinder',params))}},
  RingGeometry:class{constructor(...params){Object.assign(this,geometry('ring',params))}},
  CircleGeometry:class{constructor(...params){Object.assign(this,geometry('circle',params))}}
};
const ctx={THREE,M:color=>({color,side:0,clone(){return {...this}}}),Math};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end)+'\nthis.addWell=addVillageWell;',ctx);
const meshes=[],g={add:mesh=>meshes.push(mesh)};
ctx.addWell(g);
assert.equal(meshes.length,5,'Cal paret exterior, interior, brocal, aigua i ombra');
const walls=meshes.filter(m=>m.geometry.type==='cylinder');
assert.equal(walls.length,2);
assert.ok(walls.some(m=>m.material.side===THREE.BackSide),
  'La paret interior ha de tenir la cara visible des de dins');
assert.ok(meshes.some(m=>m.geometry.type==='ring'&&m.position.y>1.5),
  'El brocal ha de cobrir el gruix del pou');
assert.ok(meshes.some(m=>m.geometry.type==='circle'&&m.position.y<.4),
  'El fons ha de quedar clarament per sota del brocal');
console.log('OK pou: revestiment interior, brocal i profunditat');
