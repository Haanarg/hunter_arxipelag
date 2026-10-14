const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
  const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
  const headers=read('_headers');
  const immutable=headers.match(/\/dist\/\*[\s\S]*?Cache-Control:\s*([^\n]+)/);
  assert(immutable&&/max-age=31536000/.test(immutable[1])&&/immutable/.test(immutable[1]),'hashed dist assets must be immutable');
  assert(/\/src\/\*\.mjs[\s\S]*?max-age=0/.test(headers),'ESM manifests must revalidate');
  assert(/\/index\.html[\s\S]*?max-age=0/.test(headers),'HTML must revalidate');
  const boot=read('src/bootstrap.mjs');
  const menu=read('src/menu-boot.mjs');
  assert(boot.includes('RUNTIME_BUNDLE_PATH')&&menu.includes('RUNTIME_BUNDLE_PATH'),'both boot paths must share the manifest');
  const {RUNTIME_BUNDLE_PATH}=await import(pathToFileURL(path.join(root,'src/runtime-bundle.mjs')).href);
  if(RUNTIME_BUNDLE_PATH!==null){
    assert(/^dist\/hunter-runtime\.[a-f0-9]{16}\.js$/.test(RUNTIME_BUNDLE_PATH),'bundle filename must use content hash');
    assert(fs.statSync(path.join(root,RUNTIME_BUNDLE_PATH)).size>400000,'bundle exists with runtime systems');
  }
  console.log('PASS: Cloudflare cache policy, ESM revalidation and content-addressed bundle '+(RUNTIME_BUNDLE_PATH||'(fallback pending)'));
})().catch(e=>{console.error(e);process.exitCode=1});
