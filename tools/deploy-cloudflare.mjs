import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

// Transfer the existing build secret to a runtime secret during the same deploy.
// Never put its value in command arguments, repository assets or console output.
export function deployCloudflare({env=process.env,run=spawnSync}={}){
  const secret=env.AUTH_SECRET;
  if(typeof secret!=='string'||secret.length<32)throw new Error('Falta AUTH_SECRET (mínim 32 caràcters) als secrets de compilació de Cloudflare.');
  const dir=mkdtempSync(join(tmpdir(),'hunter-deploy-'));
  try{
    const file=join(dir,'secrets.json');
    writeFileSync(file,JSON.stringify({AUTH_SECRET:secret}),{mode:0o600});
    const childEnv={...env};delete childEnv.AUTH_SECRET;
    const result=run('npx',['--yes','wrangler@4.154.0','deploy','--secrets-file',file],{stdio:'inherit',env:childEnv,shell:false});
    if(result.error)throw new Error('No s’ha pogut executar Wrangler.');
    return Number.isInteger(result.status)?result.status:1;
  }finally{rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{process.exitCode=deployCloudflare();}catch(_){console.error('No s’ha pogut desplegar. Comprova que AUTH_SECRET existeix als secrets de compilació i té almenys 32 caràcters.');process.exitCode=1;}
}
