import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {deployCloudflare} from '../tools/deploy-cloudflare.mjs';
const secret='test-only-deployment-secret-01234567890123456789';
let file;
for(const status of [0,1]){
 const result=deployCloudflare({env:{AUTH_SECRET:secret,CLOUDFLARE_API_TOKEN:'test-only-token'},run:(command,args,options)=>{
  assert.equal(command,'npx');assert.deepEqual(args.slice(0,4),['--yes','wrangler@4.154.0','deploy','--secrets-file']);
  file=args[4];assert.ok(!JSON.stringify(args).includes(secret));
  assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),{AUTH_SECRET:secret});
  assert.equal(statSync(file).mode&0o777,0o600);assert.equal(options.env.AUTH_SECRET,undefined);
  assert.equal(options.env.CLOUDFLARE_API_TOKEN,'test-only-token');assert.equal(options.shell,false);
  return {status};
 }});
 assert.equal(result,status);assert.equal(existsSync(file),false,'temporary secret removed on success or failure');
}
assert.throws(()=>deployCloudflare({env:{},run:()=>assert.fail('must not deploy without secret')}));
assert.throws(()=>deployCloudflare({env:{AUTH_SECRET:secret},run:(command,args)=>{file=args[4];throw new Error('simulated failure');}}));
assert.equal(existsSync(file),false,'cleanup after thrown runner error');
console.log('deployment: runtime secret file, restricted permissions, no secret in arguments/child environment, failure propagation and cleanup passed');
