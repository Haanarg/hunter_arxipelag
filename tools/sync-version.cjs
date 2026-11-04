#!/usr/bin/env node
'use strict';
// Canonical version: src/version.mjs. Update only cache-busting query values
// and the static first-paint badge, preserving every other UI/feature flag.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const FILES=Object.freeze(['index.html','src/menu-boot.mjs','src/bootstrap.mjs']);
function gameVersion(source){
 const match=source.match(/export const GAME_VERSION\s*=\s*['"]([0-9]+\.[0-9]+\.[0-9]+)['"]/);
 if(!match)throw new Error('GAME_VERSION invàlida a src/version.mjs');
 return match[1];
}
function syncEntry(source,version,file){
 let stamps=0;
 const output=source.replace(/([?&](?:v|local)=)([0-9]+\.[0-9]+\.[0-9]+)/g,
   (_,prefix)=>{stamps++;return prefix+version;});
 if(stamps<(file==='src/bootstrap.mjs'?15:2))
  throw new Error(file+': falten segells de versió ('+stamps+')');
 let result=output;
 if(file==='index.html'){
  let badges=0;
  result=result.replace(/(<[^>]+id=["']versionBadge["'][^>]*>v)([0-9]+\.[0-9]+\.[0-9]+)/g,
    (_,prefix)=>{badges++;return prefix+version;});
  if(badges!==1)throw new Error('index.html: cal una etiqueta de versió visible');
 }
 return {content:result,stamps};
}
function syncVersion({root=ROOT,write=false}={}){
 const version=gameVersion(fs.readFileSync(path.join(root,'src/version.mjs'),'utf8'));
 const updated=[];
 for(const file of FILES){
  const dest=path.join(root,file),source=fs.readFileSync(dest,'utf8');
  const result=syncEntry(source,version,file);
  if(result.content===source)continue;
  updated.push(file);
  if(write)fs.writeFileSync(dest,result.content);
 }
 return {version,updated};
}
if(require.main===module){
 try{
  const write=process.argv.includes('--write'),result=syncVersion({write});
  if(result.updated.length&&!write)
   throw new Error('Versions desincronitzades: '+result.updated.join(', ')+
     '. Executa npm run sync:version i després npm run build.');
  console.log('Versió '+result.version+(write?' sincronitzada':' coherent')+
    ', '+result.updated.length+' fitxers '+(write?'actualitzats':'pendents'));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={gameVersion,syncEntry,syncVersion,FILES};
