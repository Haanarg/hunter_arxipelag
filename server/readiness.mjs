import {configurationIssues} from './auth.mjs';
export async function accountReadiness(env){
  const issues=configurationIssues(env);
  if(issues.length)return {ready:false,reason:'configuration',issues};
  try{
    const table=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='hunter_schema'").first();
    if(!table)return {ready:false,reason:'migrations'};
    const schema=await env.DB.prepare('SELECT max(version) AS version FROM hunter_schema').first();
    if(schema?.version!==4)return {ready:false,reason:'migrations'};
    // Check bucket access without exposing names, IDs or private objects.
    await env.SAVES.list({prefix:'__hunter_health/',limit:1});
    return {ready:true};
  }catch(_){return {ready:false,reason:'storage'};}
}
