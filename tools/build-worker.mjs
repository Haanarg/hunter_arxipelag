import {build} from 'esbuild';
const output=process.argv[2]||'/tmp/hunter-worker.mjs';
await build({entryPoints:['server/worker.mjs'],bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','worker','browser'],mainFields:['module','main'],external:['node:*','bun:sqlite'],outfile:output});
console.log('Worker compiled: '+output);
