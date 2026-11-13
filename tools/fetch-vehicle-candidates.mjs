#!/usr/bin/env node
// Descarrega les alternatives GLB (CC0) al repositori, sense tocar el joc.
// Executar: node tools/fetch-vehicle-candidates.mjs [--force]
// Límits per defecte: fitxer <= 32 MiB; total <= 128 MiB.
// Els models Sketchfab es mostren només al seu visor oficial: no hi ha
// cap URL pública de GLB que puguem obtenir sense consentiment/autenticació.
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CATALOG} from '../src/vehicle-candidate-catalog.mjs';

const root=fileURLToPath(new URL('../assets/vehicle-candidates/',import.meta.url));
const force=process.argv.includes('--force'),MAX_FILE=32*1024*1024,MAX_TOTAL=128*1024*1024;
// Són només alternatives consultables en línia: no regenerar els GLB retirats.
const REMOTE_ONLY_CATEGORIES=new Set(['llanxa_coets','ferry']);
const canonical=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const safeName=s=>String(s||'asset').replace(/[^a-z0-9-]/gi,'-').slice(0,100);
const toUrl=s=>typeof s==='string'&&/^https:\/\/cdn\.3dassets\.dev\/assets\/\d+\/v\d+\/model\.glb$/.test(s);
const packCache=new Map(),searchCache=new Map();

async function json(url){
  for(let retry=0;retry<3;retry++){
    try{
      const res=await fetch(url,{headers:{'User-Agent':'Hunter-Arxipelag-asset-curator/1.0'},signal:AbortSignal.timeout(18000)});
      if(!res.ok)throw Error('HTTP '+res.status);
      return await res.json();
    }catch(e){if(retry===2)throw e;await pause((retry+1)*600);}
  }
}
async function pack(slug){
  if(!packCache.has(slug))packCache.set(slug,json('https://3dassets.dev/api/v1/packs/'+encodeURIComponent(slug)).then(data=>data.data?.assets||data.assets||[]));
  return packCache.get(slug);
}
async function search(query){
  if(!searchCache.has(query))searchCache.set(query,json('https://3dassets.dev/api/v1/assets?q='+encodeURIComponent(query)+'&category=vehicles&limit=40')
    .then(data=>Array.isArray(data.data)?data.data:data.data?.assets||data.assets||data.results||[]));
  return searchCache.get(query);
}
async function resolve(entry,used){
  const target=canonical(entry.match||entry.query);
  let candidates=[];
  if(entry.pack){
    try{
      const entries=await pack(entry.pack);
      candidates=entries.filter(a=>{
        const title=canonical(a.title).split(' (')[0];
        return title===target||title.startsWith(target);
      });
    }catch(e){console.warn('  manifest fallit:',entry.pack,String(e).slice(0,160))}
  }
  if(!candidates.length){
    try{
      const found=await search(entry.query);
      candidates=found.filter(a=>a.category?.slug==='vehicles'||!a.category);
      // No substituir mai una opció amb qualsevol model que contingui una sola paraula.
      const words=target.split(/\s+/).filter(x=>x.length>3);
      candidates=candidates.filter(a=>words.filter(w=>canonical(a.title).includes(w)).length>=Math.max(1,Math.ceil(words.length*.6)));
    }catch(e){console.warn('  cerca fallida:',entry.query,String(e).slice(0,160))}
  }
  return candidates.find(a=>a.license?.slug==='cc0-1.0'&&toUrl(a.cdnUrl)&&!used.has(String(a.id)))||null;
}
async function getBinary(url){
  for(let retry=0;retry<3;retry++){
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
      if(!response.ok)throw Error('HTTP '+response.status);
      const length=Number(response.headers.get('content-length'));
      if(length>MAX_FILE)throw Error('GLB massa gran: '+length+' bytes');
      const data=Buffer.from(await response.arrayBuffer());
      if(data.byteLength>MAX_FILE)throw Error('GLB massa gran: '+data.byteLength+' bytes');
      if(data.toString('ascii',0,4)!=='glTF'||data.readUInt32LE(4)!==2||
         data.readUInt32LE(8)!==data.byteLength)throw Error('Capçalera GLB invàlida');
      return data;
    }catch(e){if(retry===2||/massa gran/.test(String(e)))throw e;await pause((retry+1)*700)}
  }
}
async function main(){
  await mkdir(root,{recursive:true});
  const path=join(root,'manifest.json');
  let old={models:{}};try{old=JSON.parse(await readFile(path,'utf8'))}catch{}
  const manifest={version:1,generatedAt:new Date().toISOString(),source:'https://3dassets.dev/',
    license:'CC0-1.0',limits:{maxFileBytes:MAX_FILE,maxTotalBytes:MAX_TOTAL},models:{},externalModels:{}};
  const used=new Set();let total=0,count=0,skipped=0;
  for(const config of CATALOG){
    manifest.models[config.id]=[];
    const references=config.options.filter(o=>o.provider==='sketchfab');
    if(references.length){
      // Mai substituir aquests candidats amb assets aleatoris del pack CC0.
      manifest.externalModels[config.id]=references;
    }
    if(REMOTE_ONLY_CATEGORIES.has(config.id))continue;
    for(let i=0;i<config.options.length;i++){
      const entry=config.options[i];
      if(entry.provider==='sketchfab'||entry.provider==='procedural')continue;
      const oldEntry=old.models?.[config.id]?.find(a=>a.slot===i+1);
      if(oldEntry&&!force){
        const abs=join(root,oldEntry.file);
        try{
          const st=await stat(abs);
          if(st.size===oldEntry.bytes&&st.size<=MAX_FILE){
            used.add(String(oldEntry.id));total+=st.size;count++;
            manifest.models[config.id].push(oldEntry);
            console.log(config.id,i+1,'ja desat',Math.round(st.size/1024)+' KiB');continue;
          }
        }catch{}
      }
      let asset;
      try{asset=await resolve(entry,used)}catch(e){console.warn('No trobat',config.id,i+1,e.message)}
      if(!asset){console.warn('No hi ha candidat verificat',config.id,i+1,entry.query);skipped++;continue}
      if((asset.stats?.fileSize||0)>MAX_FILE||total+(asset.stats?.fileSize||0)>MAX_TOTAL){
        console.warn('Massa gran',config.id,i+1,asset.title);skipped++;continue;
      }
      let bytes;
      try{bytes=await getBinary(asset.cdnUrl)}catch(e){console.warn('Descàrrega fallida',config.id,i+1,e.message);skipped++;continue}
      if(total+bytes.byteLength>MAX_TOTAL){console.warn('Límit total assolit',config.id,i+1);skipped++;continue}
      const file=config.id+'/'+String(i+1)+'-'+safeName(asset.slug||asset.id)+'.glb';
      const absolute=join(root,file);
      await mkdir(dirname(absolute),{recursive:true});
      await writeFile(absolute,bytes);
      used.add(String(asset.id));
      const record={slot:i+1,id:String(asset.id),title:asset.title,bytes:bytes.byteLength,
        triangles:asset.stats?.triangles||null,file,
        url:asset.url,cdnUrl:asset.cdnUrl,license:'CC0-1.0'};
      manifest.models[config.id].push(record);
      total+=bytes.byteLength;count++;
      console.log('Desat:',file,Math.round(bytes.length/1024)+' KiB');
    }
  }
  manifest.savedModels=count;manifest.savedBytes=total;manifest.skipped=skipped;
  manifest.lastCurated=new Date().toISOString();
  await writeFile(path,JSON.stringify(manifest,null,2)+'\n');
  console.log('\nResultat:',count,'GLB desats;',skipped,'opcions no disponibles;', (total/1048576).toFixed(2),'MiB');
  if(!count)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1});
