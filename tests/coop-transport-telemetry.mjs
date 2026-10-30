import assert from 'node:assert/strict';
import {CoopRoomHub} from '../server/coop-hub.mjs';
import {createNativeCoopConnection} from '../src/native-coop-connection.mjs';
import {GAME_VERSION} from '../src/version.mjs';
const originalNow=Date.now;
let now=3000;
Date.now=()=>now;
try{
  const ctx={storage:{get:async()=>undefined},blockConcurrencyWhile:fn=>fn()};
  const hub=new CoopRoomHub(ctx,{});await hub.loading;
  let accepted=0,attachments=0,closed=null;
  hub.mission={meta:{id:'mission'},accept(){accepted++;}};
  hub.verify=async ws=>ws.deserializeAttachment();
  const actor={actorId:'a',gameClient:true,gameVersion:GAME_VERSION};
  const ws={
    readyState:1,
    deserializeAttachment:()=>actor,
    serializeAttachment(){attachments++},
    sent:[],send(text){this.sent.push(JSON.parse(text))},
    close(code){closed=code}
  };
  const input=sequence=>JSON.stringify({type:'input',protocol:1,epoch:'mission',
    sequence,input:{forward:0,turn:0,strafe:0,run:false},interact:false});
  for(let i=1;i<=45;i++)await hub.messageInner(ws,input(i));
  assert.equal(accepted,45,'Totes les entrades vàlides arriben a la simulació');
  assert.equal(attachments,0,'Cap escriptura persistent per les 45 entrades ràpides');
  await hub.messageInner(ws,input(46));
  assert.equal(closed,1008,'El límit de 45 entrades per segon es manté');
  now+=1000;closed=null;
  await hub.messageInner(ws,input(47));
  assert.equal(accepted,46,'Nou interval admet un altre paquet');
  hub.frameMetrics={tickMs:18,saveMs:12,broadcastMs:3,tick:600};
  const ping=nonce=>JSON.stringify({type:'latency-ping',protocol:1,epoch:'mission',
    nonce,clientTime:now});
  await hub.messageInner(ws,ping(1));
  assert.deepEqual(ws.sent.at(-1),{type:'latency-pong',nonce:1,clientTime:now,
    server:hub.frameMetrics});
  await hub.messageInner(ws,ping(2));
  assert.equal(closed,null,'Dues sondes per segon estan permeses');
  await hub.messageInner(ws,ping(3));
  assert.equal(closed,1008,'Una ràfega de sondes no supera el límit');
  assert.equal(attachments,0,'Ni controls ni sondes serialitzen attachments');
  const sockets=[];let inputTick=null;
  class Socket{
    constructor(){this.readyState=0;this.sent=[];sockets.push(this)}
    send(text){this.sent.push(JSON.parse(text))}
    open(){this.readyState=1;this.onopen()}
    data(body){this.onmessage({data:JSON.stringify(body)})}
    close(){}
  }
  const channel=createNativeCoopConnection({room:{id:'room',revision:1},
    origin:'https://hunter.test',WebSocketImpl:Socket,now:()=>now,
    getInput:()=>({forward:0,turn:0,strafe:0,run:false}),
    onRoom(){},onMission(){},onState(){},onStatus(){},onError(){},
    setInputTimer:fn=>(inputTick=fn,1),clearInputTimer(){},
    setTimer:()=>1,clearTimer(){}});
  channel.start();const client=sockets[0];client.open();
  client.data({type:'native-mission',self:'a',meta:{id:'mission'},telemetry:1,
    state:{missionId:'mission',tick:600,status:'running',players:[{id:'a',acknowledged:0}]}});
  now+=2100;inputTick();
  const outbound=client.sent.find(msg=>msg.type==='latency-ping');
  assert(outbound&&outbound.clientTime===now,'La sonda s’envia cada dos segons');
  assert.equal(client.sent.at(-1).type,'input','La sonda no retarda ni substitueix controls');
  now+=67;
  client.data({type:'latency-pong',nonce:outbound.nonce,
    clientTime:outbound.clientTime,server:hub.frameMetrics});
  assert.equal(channel.stats.rttMs,67,'RTT sense sincronització de rellotges entre dispositius');
  assert.equal(channel.stats.serverTickMs,18);
  assert.equal(channel.stats.serverSaveMs,12);
  assert.equal(channel.stats.serverBroadcastMs,3);
  assert.equal(channel.stats.serverTick,600);
  assert.equal(channel.stats.stateFrames,1);
  assert(channel.stats.stateBytes>0,'Es compten els bytes reals de l’estat rebut');
  now+=120;
  client.data({type:'state',state:{missionId:'mission',tick:603,status:'running',
    players:[{id:'a',acknowledged:1}]}});
  assert.equal(channel.stats.stateFrames,2);
  assert.equal(channel.stats.avgStateGapMs,2287,'Compta l’interval real des de l’estat inicial');
  assert(channel.stats.stateBytes>channel.stats.stateFrames,'S’acumulen dades de xarxa');
  // Perfil lleuger: cada 16è estat analitza només les seccions modificades.
  for(let revision=1;revision<=14;revision++){
    now+=100;
    client.data({type:'state-delta',missionId:'mission',
      baseRevision:revision-1,revision,
      delta:{p:{tick:{v:603+revision}}}});
  }
  assert.equal(channel.stats.fullStateFrames,2,'Es diferencien estats complets');
  assert.equal(channel.stats.deltaFrames,14,'Es compten deltes, no tot com a snapshot complet');
  assert.equal(channel.stats.deltaProfile.samples,1,'Mostreig cada 16 paquets');
  assert(channel.stats.deltaProfile.bySection.tick>0,'El perfil compta la secció tick');
  // Mostreig de ritme real del render: no depèn de dt clamped del joc.
  channel.noteFrame();
  now+=16;channel.noteFrame();
  now+=40;channel.noteFrame();
  now+=60;channel.noteFrame();
  assert.equal(channel.stats.clientFrame.samples,3);
  assert.equal(channel.stats.clientFrame.maxGapMs,60);
  assert.equal(channel.stats.clientFrame.over33Ms,2);
  assert.equal(channel.stats.clientFrame.over50Ms,1);
  channel.noteFrame(false);now+=3000;channel.noteFrame();
  assert.equal(channel.stats.clientFrame.samples,3,
   'Canviar de pestanya no compta com a frame de 3 segons');
  now+=16;channel.noteFrame();
  assert.equal(channel.stats.clientFrame.samples,4);

  channel.stop();
  // Un frontend nou no pot enviar sondes a un Worker antic: en aquell
  // protocol els paquets desconeguts provocarien un tancament 1008.
  const oldWorkerClient=createNativeCoopConnection({room:{id:'room',revision:1},
    origin:'https://hunter.test',WebSocketImpl:Socket,now:()=>now,
    getInput:()=>({forward:0,turn:0,strafe:0,run:false}),
    onRoom(){},onMission(){},onState(){},onStatus(){},onError(){},
    setInputTimer:fn=>(inputTick=fn,1),clearInputTimer(){},
    setTimer:()=>1,clearTimer(){}});
  oldWorkerClient.start();const legacy=sockets.at(-1);legacy.open();
  legacy.data({type:'native-mission',self:'a',meta:{id:'old-worker'},
    state:{missionId:'old-worker',tick:1,status:'running',players:[{id:'a',acknowledged:0}]}});
  now+=3000;inputTick();
  assert.equal(legacy.sent.filter(m=>m.type==='latency-ping').length,0,
    'El client no envia sondes fins que el servidor en confirma el suport');
  oldWorkerClient.stop();
  console.log('coop telemetry: input limits, RTT, frame costs, state bytes and mixed-worker compatibility passed');
}finally{Date.now=originalNow}
