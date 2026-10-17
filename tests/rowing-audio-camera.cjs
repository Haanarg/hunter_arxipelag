#!/usr/bin/env node
// Verificació del comportament acústic, càmera i espatlla del rider.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const root=path.join(__dirname,'..'),T=await import(pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')).href);
 const core=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8');
 assert.ok(core.includes("cv.t==='windsurf'||cv.t==='barca_rems'"),'Rema amb el so del windsurf');
 assert.ok(core.includes("'bici','windsurf','barca_rems'"),'La barca no activa el motor');
 const ctx={window:{}};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'src/vehicle-dynamics.js'),'utf8'),ctx);
 const v=ctx.window.HUNTER_VEHICLE_DYNAMICS.types;
 assert.ok(v.barca_rems.cd>=14&&v.barca_rems.ch>=7,'Càmera de rems allunyada');
 const rider=fs.readFileSync(path.join(root,'src/rider.js'),'utf8');
 assert.ok(rider.includes('shoulder=shoulderAt(1)'),'El dret surt de la seva espatlla');
 assert.ok(rider.includes('torso.rotation.y+=twist*u.shotBlend'),'El rider gira la cintura');
 console.log('OK barca: so de rems, càmera i espatlla de dispar');
})().catch(e=>{console.error(e);process.exitCode=1});
