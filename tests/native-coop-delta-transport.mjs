import assert from 'node:assert/strict';
import {createNativeCoopConnection} from '../src/native-coop-connection.mjs';
import {diffCoopState} from '../src/coop-state-delta.mjs';
const sockets=[],states=[];class Socket{constructor(){this.readyState=0;sockets.push(this);}send(){}open(){this.readyState=1;this.onopen();}data(body){this.onmessage({data:JSON.stringify(body)});}close(code){this.code=code;this.readyState=3;this.onclose?.({code});}}
const channel=createNativeCoopConnection({room:{id:'r',revision:1},origin:'https://hunter.test',WebSocketImpl:Socket,getInput:()=>({forward:0,turn:0,strafe:0,run:false}),onMission(){},onState:s=>states.push(s),setInputTimer:()=>1,clearInputTimer(){},setTimer:()=>1,clearTimer(){}});channel.start();const ws=sockets[0];ws.open();
let state={missionId:'m',tick:3,status:'running',players:[{id:'a',hp:25,acknowledged:0}],inventories:[]};ws.data({type:'native-mission',self:'a',meta:{id:'m'},state});
for(let revision=1;revision<=2;revision++){const next=structuredClone(state);next.players[0].hp--;ws.data({type:'state-delta',missionId:'m',baseRevision:revision-1,revision,delta:diffCoopState(state,next)});state=next;}
assert.equal(states.length,2);assert.equal(states.at(-1).players[0].hp,23,'multiple commands at one tick use revisions rather than ambiguous tick numbers');
ws.data({type:'state-delta',missionId:'old',baseRevision:2,revision:3,delta:{v:null}});assert.equal(states.length,2);
ws.data({type:'state-delta',missionId:'m',baseRevision:0,revision:1,delta:{v:null}});assert.equal(ws.code,1002,'missing baseline forces reconnect instead of corrupting state');assert.equal(channel.combat('pistol'),false);channel.stop();
console.log('native delta transport: same-tick revisions, lossless application, stale epochs and missing-baseline reconnect passed');
