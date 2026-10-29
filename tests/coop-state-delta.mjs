import assert from 'node:assert/strict';
import {diffCoopState,applyCoopDelta} from '../src/coop-state-delta.mjs';
const wire=value=>JSON.parse(JSON.stringify(value));
let state={tick:0,players:[{id:'a',x:0,hp:25},{id:'b',x:3,hp:25}],combat:{targets:[{id:'guard',hp:4,patrol:[{x:10,z:20}]}],projectiles:[],effects:[]},vehicles:[{id:'v',destroyed:false,seats:[null,null]}],walls:[]},client=wire(state);
for(let tick=1;tick<=200;tick++){
 const previous=JSON.stringify(state),next=structuredClone(state);next.tick=tick;next.players[0].x+=.4;
 if(tick%7===0)next.combat.projectiles.push({id:'p'+tick,x:tick,life:2});
 for(const p of next.combat.projectiles){p.x++;p.life-=.1;}next.combat.projectiles=next.combat.projectiles.filter(p=>p.life>0);
 if(tick===20)next.vehicles[0].seats=['a',null];if(tick===30)next.vehicles[0].destroyed=true;
 if(tick===40)next.players.reverse();if(tick===50)next.combat.targets[0].aim={x:1};if(tick===60)delete next.combat.targets[0].aim;
 if(tick===70)next.walls=[1,3,7];if(tick===80)next.combat.targets[0].optional=undefined;
 const delta=wire(diffCoopState(state,next));client=applyCoopDelta(client,delta);assert.deepEqual(client,wire(next),'lossless delta at '+tick);assert.equal(JSON.stringify(state),previous,'encoding never mutates baseline');state=next;
}
assert.equal(diffCoopState(state,structuredClone(state)),null);
console.log('state deltas: 200 frames, entity insert/remove/reorder, nested updates/deletions, vehicle seats/destruction and immutable baselines passed');
