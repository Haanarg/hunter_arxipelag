#!/usr/bin/env node
'use strict';
// Bateria conjunta sense repetits; cada suite original continua disponible.
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const DEFAULT=Object.freeze(['test:optimization','test:coop:offline',
 'test:coop:integration','test:play','test:saves','test:accounts']);
function planSuiteRuns(scripts,groups=DEFAULT){
 const seen=new Set(),runs=[];let requested=0;
 for(const group of groups){
  const script=scripts[group];
  if(typeof script!=='string')throw new Error('Suite desconeguda: '+group);
  for(const raw of script.split(/\s*&&\s*/)){
   const command=raw.trim(),args=command.split(/\s+/);
   // Evitam invocar una shell amb arguments provinents de package.json.
   if(args[0]!=='node'||args.length<2||
      !/^(?:tests|tools)\/[\w./-]+\.(?:cjs|mjs|js)$/.test(args[1])||
      args.slice(2).some(arg=>!/^--[a-z\d-]+$/i.test(arg)))
    throw new Error('Ordre no admesa a '+group+': '+command);
   requested++;
   if(seen.has(command))continue;
   seen.add(command);
   runs.push({group,command,args:args.slice(1)});
  }
 }
 return {groups,runs,requested,skipped:requested-runs.length};
}
function main({argv=process.argv.slice(2),scripts,run=spawnSync}={}){
 const list=argv.includes('--list'),groups=argv.filter(a=>a!=='--list');
 if(!groups.length)groups.push(...DEFAULT);
 const pkgScripts=scripts||JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).scripts,
   plan=planSuiteRuns(pkgScripts,groups);
 for(const task of plan.runs)if(!fs.existsSync(path.join(ROOT,task.args[0])))
  throw new Error('Ordre sense fitxer: '+task.command);
 console.log('Bateria: '+plan.requested+' ordres originals, '+
  plan.runs.length+' úniques; '+plan.skipped+' repeticions evitades');
 if(list){for(const t of plan.runs)console.log('['+t.group+'] '+t.command);return plan;}
 for(const [i,task] of plan.runs.entries()){
  console.log('['+(i+1)+'/'+plan.runs.length+'] '+task.command);
  const result=run(process.execPath,task.args,{cwd:ROOT,stdio:'inherit',shell:false});
  if(result.error)throw result.error;
  if(result.status!==0){
   process.exitCode=result.status||1;
   throw new Error('Prova fallida: '+task.command);
  }
 }
 return plan;
}
if(require.main===module){
 try{main();}catch(error){console.error(error.message);process.exitCode ||= 1;}
}
module.exports={DEFAULT,planSuiteRuns,main};
