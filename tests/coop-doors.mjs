import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
const room={id:'doors-room',revision:4,seed:3,mapScale:1,difficulty:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},g=generateRelayMission(room),door=g.record.meta.doors[0];
assert.ok(door&&g.record.meta.doors.length===3);
const command=(id,open=true)=>({epoch:g.record.meta.id,doorId:door.id,open,commandId:id});
g.record.status='running';g.record.checkpoint.players[0]={...g.record.checkpoint.players[0],x:door.cx,z:door.cz+2,y:door.floor+.06};
let m=restoreRelayMission(g.record,g.geometry);
assert.equal(m.doorCommand('outsider',command('outside')).code,'INVALID');
assert.equal(m.doorCommand('b',command('remote')).code,'TOO_FAR');assert.equal(m.snapshot().doorRevision,0);
const result=m.doorCommand('a',command('open-1'));assert.equal(result.code,'OPENED');assert.equal(m.snapshot().doorRevision,1);
assert.equal(m.setup('a').geometry.walls[door.wallIndex].open,true,'setup includes current collision state');
assert.equal(m.doorCommand('a',command('open-1',false)).duplicate,true);assert.equal(m.snapshot().doors.find(d=>d.id===door.id).open,true,'duplicate ID cannot change payload');
assert.equal(m.doorCommand('a',command('close-too-quick',false)).code,'COOLDOWN');
let sequence=0;
for(let i=0;i<15;i++){m.accept('a',{protocol:1,epoch:m.meta.id,sequence:++sequence,input:{forward:1,turn:0,strafe:0,run:false},interact:false});m.step();}
assert.ok(m.snapshot().players[0].z<door.cz-1,'open doorway can be crossed using actual movement');
const checkpoint=m.checkpoint(Date.now()+100),restored=restoreRelayMission(checkpoint,g.geometry);
assert.deepEqual(restored.snapshot(),m.snapshot(),'door state/revision survive checkpoint');assert.equal(restored.doorCommand('a',command('open-1')).duplicate,true,'idempotency survives restore');

// Trusted checkpoint fixture positions A in the opening and B next to it.
const occupied=m.checkpoint(Date.now()+100);occupied.checkpoint.players[0]={...occupied.checkpoint.players[0],x:door.cx,z:door.cz,y:door.floor+.06};occupied.checkpoint.players[1]={...occupied.checkpoint.players[1],x:door.cx,z:door.cz+2,y:door.floor+.06};
m=restoreRelayMission(occupied,g.geometry);assert.equal(m.doorCommand('b',command('occupied',false)).code,'OCCUPIED');assert.equal(m.snapshot().doorRevision,1);
for(let i=0;i<20;i++){m.accept('a',{protocol:1,epoch:m.meta.id,sequence:++sequence,input:{forward:1,turn:0,strafe:0,run:false},interact:false});m.step();}
assert.equal(m.doorCommand('b',command('close-safe',false)).code,'CLOSED');assert.equal(m.snapshot().doorRevision,2);
for(let i=0;i<20;i++){m.accept('b',{protocol:1,epoch:m.meta.id,sequence:++sequence,input:{forward:1,turn:0,strafe:0,run:false},interact:false});m.step();}
assert.ok(m.snapshot().players[1].z>door.cz+.7,'closing updates collision for the other actor');
m.setStatus('paused');assert.equal(m.doorCommand('b',command('paused')).code,'NOT_ACTIVE');
const upper=m.checkpoint(Date.now()+100);upper.status='running';upper.checkpoint.players[1].y=door.floor+6;
m=restoreRelayMission(upper,g.geometry);assert.equal(m.doorCommand('b',command('upper-floor')).code,'TOO_FAR','upper floor cannot operate downstairs door');
for(let i=0;i<40;i++)m.doorCommand('b',command('bounded-'+i));assert.equal(m.checkpoint(0).commandResults.length,32,'bounded persisted command history');
console.log('cooperative doors: trusted proximity/height, open/cross, shared closing collision, occupied doorway safety, cooldown, idempotent checkpoint, pause and bounded history passed');
