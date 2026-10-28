import {Miniflare} from 'miniflare';
import {getMigrations} from 'better-auth/db/migration';
import {writeFile,mkdir} from 'node:fs/promises';
import {createAuth} from '../server/auth.mjs';
const mf=new Miniflare({modules:true,script:"export default {fetch(){return new Response('schema')}}",d1Databases:['DB'],compatibilityDate:'2026-08-06'});
try{
 const database=await mf.getD1Database('DB');
 const auth=createAuth({DB:database,AUTH_SECRET:'local-schema-generation-not-a-production-secret',AUTH_ORIGIN:'http://localhost'});
 const plan=await getMigrations(auth.options);
 await mkdir(new URL('../server/migrations/',import.meta.url),{recursive:true});
 await writeFile(new URL('../server/migrations/0001_auth.sql',import.meta.url),'-- Generated from better-auth 1.7.14 by tools/generate-auth-schema.mjs\n'+await plan.compileMigrations());
 console.log('Generated Better Auth D1 schema.');
}finally{await mf.dispose();}
