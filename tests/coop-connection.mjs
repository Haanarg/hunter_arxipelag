import assert from 'node:assert/strict';
import {createCoopConnection} from '../src/coop-connection.mjs';
const sockets=[],timers=new Map();let serial=0,active=true;const states=[],rooms=[];
class Socket{
 constructor(url){this.url=url;this.readyState=0;sockets.push(this);this.sent=[];}
 send(data){this.sent.push(JSON.parse(data));}
 close(code=1000){this.readyState=3;this.onclose?.({code});}
 open(){this.readyState=1;this.onopen();}
 message(body){this.onmessage({data:JSON.stringify(body)});}
}
const channel=createCoopConnection({url:'wss://example.test/api/coop/socket?room=room-id',WebSocketImpl:Socket,isActive:()=>active,onRoom:r=>rooms.push(r),onStatus:s=>states.push(s),setTimer:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimer:id=>timers.delete(id)});
function advance(ms){const entry=[...timers].find(([,t])=>t.ms===ms);assert.ok(entry,'expected timer '+ms);timers.delete(entry[0]);entry[1].fn();}
channel.start();assert.equal(sockets.length,1);const first=sockets[0];first.open();assert.equal(channel.isOpen(),true);
first.message({type:'room',room:{id:'room-id',members:[]}});assert.equal(rooms.length,1);
advance(20000);assert.deepEqual(first.sent,[{type:'heartbeat',protocol:1}]);first.message({type:'room',room:{id:'room-id',members:[]}});
first.close(1006);assert.equal(channel.isOpen(),false);assert.ok(states.includes('retrying'));advance(1000);const second=sockets[1];second.open();
first.message({type:'room',room:null});assert.equal(rooms.length,2,'stale socket cannot overwrite new connection');
advance(20000);advance(20000);assert.equal(second.readyState,3,'missing heartbeat response forces reconnect');advance(1000);
const third=sockets[2];third.open();third.close(4001);assert.equal(timers.size,0,'replacement cannot create reconnect duel');
channel.start();const fourth=sockets[3];fourth.open();active=false;advance(20000);assert.equal(fourth.readyState,3);assert.equal(timers.size,0);
active=true;channel.start();const fifth=sockets[4];fifth.open();channel.stop();assert.equal(timers.size,0);assert.equal(channel.isOpen(),false);
fifth.message({type:'room',room:null});assert.equal(rooms.length,2);
console.log('room client: connection, snapshots, heartbeat, retry, stale events, missing responses, replacement, inactive panel and timer cleanup passed');
