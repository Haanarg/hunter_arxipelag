import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {vegetationLayout} from '../src/vegetation-layout.mjs';
import {createWorldRandom} from '../src/world-generation-core.mjs';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
// Golden output captured by executing the individual generator from commit 29df8d6.
const layout=vegetationLayout({halfSize:400,islands:[{x:0,z:0,r:230,peakX:0,peakZ:0},{x:230,z:-180,r:160,peakX:230,peakZ:-180}],heightAt:(x,z)=>24+18*Math.cos(x/160)*Math.cos(z/140),seed:79,random:createWorldRandom(123456789),spawn:{x:-100,z:-100},buildings:[{x:0,z:0,w:24,d:26}],stairs:[{x:100,z:100,nx:0,nz:1,length:10,width:3,top:25,steps:10,tread:1,rise:.3}],compounds:[{x:-180,z:180,r:45}]});
const canonical=JSON.stringify({...layout,trees:layout.trees.slice().sort((a,b)=>a.x-b.x||a.z-b.z)});
assert.equal(createHash('sha256').update(canonical).digest('hex'),'5cffac7eb869798b48d04bd2f940edeb9ddbd233a34b43bd03591ef802d25024','unchanged original positions, variants, colors, collider records, rock fields and RNG state');
for(const scale of [1,2]){
 const g=generateRelayMission({id:'plants',revision:1,seed:67,mapScale:scale,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a'},{id:'b'}]},{mode:'world'}),server=createStaticWorldAdapter(g.geometry),client=createStaticWorldAdapter(JSON.parse(JSON.stringify(g.geometry)));
 assert.ok(server.vegetation.palms.length>1000);assert.ok(server.vegetation.bushes.length>100);assert.ok(server.vegetation.rocks.length>100);
 assert.deepEqual(client.vegetation,server.vegetation,'client recipe reproduces authoritative vegetation');assert.equal(g.geometry.trees.length,0,'trees are not duplicated in the wire payload');
 assert.ok(Buffer.byteLength(JSON.stringify(restoreRelayMission(g.record,g.geometry).setup('a')))<1_000_000,'forest remains within current socket envelope');
 const snapshot=server.snapshot();assert.equal(snapshot.trees.length,0);assert.deepEqual(createStaticWorldAdapter(snapshot).vegetation,server.vegetation,'snapshot does not duplicate generated trees');
 const palm=server.vegetation.trees.find(t=>t.p),p={x:palm.x+.01,y:palm.y+.4,z:palm.z+.01,hd:0},a=server.resolveBody(p,p),b=client.resolveBody(p,p);assert.deepEqual(a,b);assert.ok(Math.hypot(a.x-p.x,a.z-p.z)>.1,'native palm trunk collider exists');
 for(const tree of server.vegetation.trees)assert.ok(!g.record.meta.compounds.some(c=>Math.hypot(tree.x-c.x,tree.z-c.z)<c.r),'compound reservations remain clear');
}
console.log('shared vegetation: golden individual output/RNG, full forests at both scales, compact deterministic replication, snapshot and native trunk collisions passed');
