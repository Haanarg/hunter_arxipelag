import assert from 'node:assert/strict';
import {createNativeCoopConnection} from '../src/native-coop-connection.mjs';
const sockets=[],timers=new Map(),inputs=new Map(),statuses=[],actions=[];let serial=0,time=0;
class Socket{
 constructor(){this.readyState=0;this.sent=[];sockets.push(this);}
 send(text){this.sent.push(JSON.parse(text));}
 open(){this.readyState=1;this.onopen();}
 data(body){this.onmessage({data:JSON.stringify(body)});}
 close(code=1000){this.readyState=3;this.onclose?.({code});}
}
function advance(ms){const entry=[...timers].find(([,timer])=>timer.ms===ms);assert.ok(entry,'expected timer '+ms);timers.delete(entry[0]);time+=ms;entry[1].fn();}
const room={id:'r',revision:1,allReady:true};let missions=0;
const channel=createNativeCoopConnection({room,origin:'https://hunter.test',WebSocketImpl:Socket,now:()=>time,getInput:()=>({forward:0,turn:0,strafe:0,run:false}),onMission:()=>missions++,onState(){},onStatus:s=>statuses.push(s),onAction:r=>actions.push(r),setTimer:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimer:id=>timers.delete(id),setInputTimer:fn=>{inputs.set(++serial,fn);return serial;},clearInputTimer:id=>inputs.delete(id)});
channel.prepare({host:true,payload:{world:true},fingerprint:'a'.repeat(64)});channel.start();const first=sockets[0];first.open();first.data({type:'room',room});
function setup(ws,id,ack){ws.data({type:'native-mission',self:'a',meta:{id},state:{status:'running',players:[{id:'a',acknowledged:ack}]}});}
setup(first,'epoch',12);for(const fn of inputs.values())fn();assert.equal(first.sent.at(-1).sequence,13);
first.data({type:'action',ok:false,code:'MOVING'});assert.equal(actions[0].code,'MOVING');
advance(20000);advance(20000);assert.equal(first.readyState,3,'silent open connection is closed instead of freezing indefinitely');assert.equal(inputs.size,0);assert.ok(statuses.includes('retrying'));
advance(1000);const second=sockets[1];second.open();second.data({type:'room',room});assert.equal(second.sent.filter(m=>m.type==='native-world').length,1,'reconnect can resubmit preparation');setup(second,'epoch',15);for(const fn of inputs.values())fn();assert.equal(second.sent.at(-1).sequence,16);
setup(first,'stale',0);assert.equal(missions,2,'stale socket cannot replace resumed mission');
setup(second,'new-epoch',0);for(const fn of inputs.values())fn();assert.equal(second.sent.at(-1).sequence,1,'different mission resets input sequence');
second.close(1008);assert.equal(timers.size,0,'protocol rejection cannot cause an endless reconnect loop');assert.equal(inputs.size,0);assert.equal(statuses.at(-1),'ended');channel.stop();
console.log('native reconnect: silent socket recovery, action feedback, preparation replay, sequence continuity/reset, stale socket isolation and fatal cleanup passed');
