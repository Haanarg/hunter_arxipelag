#!/usr/bin/env node
'use strict';
// Inventari estàtic: els HTML sense referents interns poden tenir enllaços
// externs vigents. No esborra fitxers, ni altera el joc o el seu RNG.
const fs=require('node:fs'),path=require('node:path'),posix=path.posix;
const ROOT=path.resolve(__dirname,'..');
const OMIT=new Set(['.git','node_modules','dist','vendor','assets']);
const TEXT=new Set(['.js','.cjs','.mjs','.html','.md','.json','.jsonc','.yml','.yaml','.css']);
function allFiles(root=ROOT){
 const found=[];
 function walk(folder){
  for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
   if(entry.isDirectory()){if(!OMIT.has(entry.name))walk(path.join(folder,entry.name));continue;}
   if(!entry.isFile()||!TEXT.has(path.extname(entry.name)))continue;
   found.push(path.relative(root,path.join(folder,entry.name)).split(path.sep).join('/'));
  }
 }
 walk(root);return found.sort();
}
function inspectRepository({root=ROOT}={}){
 const files=allFiles(root),exists=new Set(files),read=f=>fs.readFileSync(path.join(root,f),'utf8');
 const source=read('src/runtime-scripts.mjs');
 const parsed=source.match(/export const runtimeScripts\s*=\s*(\[[\s\S]*?\]);?/);
 if(!parsed)throw new Error('No es pot analitzar src/runtime-scripts.mjs');
 const runtimeScripts=JSON.parse(parsed[1]);
 const missingRuntime=runtimeScripts.filter(f=>!exists.has(f));
 const duplicateRuntime=runtimeScripts.filter((f,i)=>runtimeScripts.indexOf(f)!==i);
 const rootHtml=files.filter(f=>f.endsWith('.html')&&!f.includes('/'));
 const labs=rootHtml.filter(f=>!['index.html','menu-background.html'].includes(f));
 const inbound=Object.fromEntries(labs.map(f=>[f,[]]));
 for(const file of files){
  if(file==='to-do.MD')continue; // un TODO no és cap consumidor del fitxer
  const content=read(file);
  for(const html of labs)if(file!==html&&content.includes(html))inbound[html].push(file);
 }
 // Seguiment conservador dels imports ESM locals de l'entrada i del Worker.
 const roots=['src/menu-boot.mjs','src/bootstrap.mjs','server/worker.mjs'];
 const visited=new Set(),missingImports=new Set(),queue=[...roots];
 const from=/\b(?:import|export)\s+[^;'"]*?\s+from\s*(['"])(\.\.?\/[^'"]+)\1/g,
   side=/\bimport\s*(['"])(\.\.?\/[^'"]+)\1/g,
   dynamic=/\bimport\s*\(\s*(['"])(\.\.?\/[^'"]+)\1/g;
 while(queue.length){
  const file=queue.shift();
  if(visited.has(file)||!exists.has(file))continue;
  visited.add(file);
  const content=read(file);
  for(const regexp of [from,side,dynamic]){
   regexp.lastIndex=0;let match;
   while((match=regexp.exec(content))){
    const dest=posix.normalize(posix.join(posix.dirname(file),match[2].split(/[?#]/)[0]));
    if(!/\.(?:mjs|cjs|js|json)$/.test(dest))continue;
    if(!exists.has(dest))missingImports.add(file+' -> '+dest);
    else if(!visited.has(dest))queue.push(dest);
   }
  }
 }
 const unreferenced=labs.filter(f=>!inbound[f].length);
 return {
  runtime:{count:runtimeScripts.length,missing:missingRuntime,duplicates:duplicateRuntime},
  productionEsm:{entrypoints:roots,reachable:visited.size,missing:[...missingImports].sort()},
  laboratories:{total:labs.length,linked:labs.length-unreferenced.length,
   noInternalRefs:unreferenced,
   internalRefs:Object.fromEntries(Object.entries(inbound).filter(([file,refs])=>refs.length))}
 };
}
if(require.main===module){
 try{
  const result=inspectRepository();
  if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
  else{
   console.log('Runtime: '+result.runtime.count+' scripts; '+result.runtime.missing.length+
     ' absents; '+result.runtime.duplicates.length+' repetits');
   console.log('ESM de producció: '+result.productionEsm.reachable+' fitxers; '+
     result.productionEsm.missing.length+' imports no resolts');
   console.log('Laboratoris: '+result.laboratories.total+
     ' HTML; '+result.laboratories.noInternalRefs.length+' sense referents interns coneguts');
   for(const f of result.laboratories.noInternalRefs)
    console.log('  comprovar URL extern abans de retirar: '+f);
  }
  if(result.runtime.missing.length||result.runtime.duplicates.length||
     result.productionEsm.missing.length)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={allFiles,inspectRepository};
