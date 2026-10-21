#!/usr/bin/env node
'use strict';
// La copa segueix la tangent final del tronc sense separar-se'n.
// Els tres nivells de detall mantenen la mateixa orientació i el color
// de cada fulla no afegeix draw calls ni consumeix random() addicional.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const THREE=await import('../vendor/three-r186.module.mjs');
 const source=fs.readFileSync(path.resolve(__dirname,'../src/vegetation.js'),'utf8');
 const context=vm.createContext({window:{}});
 vm.runInContext(source,context);
 let randomCalls=0;
 const factory=context.window.HUNTER_VEGETATION.create(THREE,{
   materialProfile:()=>({}),
   random:(lo,hi)=>{randomCalls++;return lo+(hi-lo)*.53}
 });
 const {geometry}=factory;
 for(const geo of [
   ...geometry.palmVariants.flatMap(v=>[v.crown,v.crown2]),
   geometry.midCrown,geometry.farCrown
 ]){
   assert(geo.getAttribute('color'),'Fulles sense colors de vèrtex');
   assert.equal(geo.getAttribute('color').count,
     geo.getAttribute('position').count,'Falten colors per a alguns vèrtexs');
 }
 const leafGeometry=geometry.palmVariants[1].crown;
 const colorAttr=leafGeometry.getAttribute('color'),palette=new Set();
 for(let i=0;i<colorAttr.count;i+=24){
   const col=new THREE.Color().fromBufferAttribute(colorAttr,i);
   palette.add(col.getHexString());
 }
 assert(palette.size>=3,'Calen diversos tons dins una mateixa copa');
 const rows=[
   [15,0,18,1,0,-1,-.12],
   [40,0,20,1.25,1.3,0,.14],
   [71,0,45,.9,2.5,1,0]
 ];
 const world=new THREE.Group();
 const built=factory.build({world,palms:rows,bushes:[],rocks:[],
   playerX:20,playerZ:20,lodProfile:'desktop'});
 assert.equal(randomCalls,11*rows.length,
   'Les noves copes no han de consumir tirades aleatòries addicionals');
 const pivot=new THREE.Vector3(0,6.2,0),matrix=new THREE.Matrix4(),
       trunk=new THREE.Matrix4(),crown=new THREE.Matrix4(),
       medium=new THREE.Matrix4(),far=new THREE.Matrix4(),
       second=new THREE.Matrix4();
 for(let i=0;i<rows.length;i++){
   const ref=built.palms.variantMap[i],sector=ref.chunk;
   sector.trunk.getMatrixAt(ref.trunkIndex,trunk);
   sector.primary[ref.variant].getMatrixAt(ref.index,crown);
   sector.secondary[ref.variant].getMatrixAt(ref.index,second);
   sector.midCrown.getMatrixAt(ref.trunkIndex,medium);
   sector.farCrown.getMatrixAt(ref.trunkIndex,far);
   const pTrunk=pivot.clone().applyMatrix4(trunk),
         pCrown=pivot.clone().applyMatrix4(crown);
   assert(pTrunk.distanceTo(pCrown)<1e-4,
     'La copa s’ha desenganxat de la punta del tronc');
   const axisTrunk=new THREE.Vector3(0,1,0).transformDirection(trunk),
         axisCrown=new THREE.Vector3(0,1,0).transformDirection(crown),
         angle=Math.acos(THREE.MathUtils.clamp(axisTrunk.dot(axisCrown),-1,1));
   assert(angle>.20&&angle<.72,'Cal seguir parcialment l’angle terminal del tronc');
   for(const other of [second,medium,far])
     for(let k=0;k<16;k++)assert(Math.abs(other.elements[k]-crown.elements[k])<1e-5,
       'Canvi sobtat d’inclinació entre les capes de copa o LOD');
   assert.equal(sector.primary[ref.variant].material.vertexColors,true,
     'Les fulles properes han de combinar colors de vèrtex i per instància');
   sector.primary[ref.variant].getColorAt(ref.index,new THREE.Color());
 }
 // A mida que s'allunya el jugador continuen existint els LOD compartits.
 built.palms.update(1900,1900,true);
 built.palms.update(0,0,true);
 console.log('OK palmeres: copes orientades, palette variada, tres LOD i llavor intacta');
})().catch(e=>{console.error(e);process.exitCode=1});
