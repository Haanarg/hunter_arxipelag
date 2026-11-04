import assert from 'node:assert/strict';
import {CoopRoomHub} from '../server/coop-hub.mjs';
import {applyCoopDelta} from '../src/coop-state-delta.mjs';

// Dos WebSockets d'una sessió nativa reben la mateixa càrrega útil quan
// comparteixen baseline i revisió; un error d'un client no desquadra l'altre.
const ctx={storage:{get:async()=>undefined},blockConcurrencyWhile:fn=>fn()};
const hub=new CoopRoomHub(ctx,{});
await hub.loading;
function socket(id){
 return {id,readyState:1,raw:[],closed:[],fail:false,
  deserializeAttachment(){return {actorId:id}},
  send(text){if(this.fail)throw Error('network interrupted');this.raw.push(text)},
  close(code){this.closed.push(code)}
 };
}
const host=socket('host'),guest=socket('guest');
hub.games=()=>[host,guest];
const clone=value=>JSON.parse(JSON.stringify(value));
const initial={missionId:'m',tick:30,status:'running',
 players:[{id:'host',x:0,hp:25},{id:'guest',x:2,hp:25}],
 vehicles:[{id:'car',x:5,seats:[null,null],destroyed:false}],
 inventories:[{actorId:'host',bullets:12}]};
let latest=clone(initial);
hub.mission={meta:{id:'m',mode:'native'},snapshot:()=>latest};
for(const ws of [host,guest])
 assert.equal(hub.send(ws,{type:'native-mission',self:ws.id,meta:hub.mission.meta,
  state:initial,stateRevision:0}),true);
latest=clone(initial);
latest.tick=33;
latest.vehicles[0].x=8;
const originalStringify=JSON.stringify;
let encodes=0;
JSON.stringify=(...args)=>{encodes++;return originalStringify(...args)};
try{hub.broadcastState()}finally{JSON.stringify=originalStringify}
assert.equal(encodes,1,'Mateixa baseline/revisió: un únic JSON.stringify');
const first=JSON.parse(host.raw.at(-1)),other=JSON.parse(guest.raw.at(-1));
assert.deepEqual(first,other,'Els clients reben el mateix delta');
assert.equal(first.baseRevision,0);
assert.equal(first.revision,1);
assert.deepEqual(applyCoopDelta(initial,first.delta),latest);
assert.equal(hub.stateBaselines.get(host).revision,1);
assert.equal(hub.stateBaselines.get(guest).revision,1);

// Una ordre al mateix tick té una revisió pròpia, encara que el tick no
// canviï. La fallada de xarxa no ha d'avançar la baseline del receptor.
const second=clone(latest);
second.inventories[0].bullets=11;
latest=second;guest.fail=true;
hub.broadcastState();
assert.equal(hub.stateBaselines.get(host).revision,2);
assert.equal(hub.stateBaselines.get(guest).revision,1);
assert.deepEqual(guest.closed,[1011]);
const atSameTick=JSON.parse(host.raw.at(-1));
assert.equal(atSameTick.revision,2);
assert.equal(atSameTick.baseRevision,1);
assert.equal(atSameTick.delta.p.tick,undefined);

// El receptor recuperat es posa al dia a partir de la seva pròpia base,
// mentre l'amfitrió avança a una revisió diferent. No es pot reciclar
// erròniament el JSON de l'amfitrió per a la connexió antiga.
guest.fail=false;
const third=clone(second);
third.tick=36;third.players[1].x=4;latest=third;
hub.broadcastState();
const hostDelta=JSON.parse(host.raw.at(-1));
const guestDelta=JSON.parse(guest.raw.at(-1));
assert.equal(hostDelta.baseRevision,2);
assert.equal(guestDelta.baseRevision,1);
assert.equal(hostDelta.revision,3);
assert.equal(guestDelta.revision,2);
assert.deepEqual(applyCoopDelta(second,hostDelta.delta),third);
assert.deepEqual(applyCoopDelta(clone(initial),first.delta),clone({
 ...initial,tick:33,vehicles:[{...initial.vehicles[0],x:8}]
}));
assert.deepEqual(applyCoopDelta(
 applyCoopDelta(initial,first.delta),guestDelta.delta),third);
assert.equal(hub.stateBaselines.get(host).revision,3);
assert.equal(hub.stateBaselines.get(guest).revision,2);

// Snapshot sense diferències: no hi ha cap paquet ni revisió nova.
const lengths=[host.raw.length,guest.raw.length];
latest=clone(third);
hub.broadcastState();
assert.deepEqual([host.raw.length,guest.raw.length],lengths);
// Una sala sense clients no ha de generar snapshots complets a cada alarma.
const emptyHub=new CoopRoomHub(ctx,{});
await emptyHub.loading;
let emptySnapshots=0;
emptyHub.games=()=>[];
emptyHub.mission={meta:{mode:'native'},snapshot:()=>{emptySnapshots++;return latest;}};
emptyHub.broadcastState();
assert.equal(emptySnapshots,0,'No clients: no unnecessary snapshot for broadcast');
console.log('coop broadcast encoding: shared JSON, same-tick commands, per-socket failures and revision recovery passed');
