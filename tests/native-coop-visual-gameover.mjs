import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const runtime=source('src/coop-world-runtime.js');
const menu=source('src/coop-menu.js');
const transport=source('src/native-coop-connection.mjs');
// Esteles del mode individual (aigua i terra), actualitzades cada frame.
assert.match(runtime,/movementFx\.vehicle\(v,dt,fxContext\)/);
assert.match(runtime,/movementFx\.update\(dt,cam\)/);
assert.match(runtime,/swimVisualLift\([\s\S]*?pl,wy\(P\.x,P\.z,elapsed\),P\.y\)/);
assert.match(runtime,/swimVisualLift\([\s\S]*?model,wy\(target\.x,target\.z,elapsed\),target\.y\)/);
// El GUEST té reconnexió tant des del joc com des de la sala.
assert.match(menu,/Reconnectar a la partida/);
assert.match(menu,/room\.phase==='playing'/);
assert.match(menu,/window\.HUNTER_NATIVE_COOP\.reconnect\(\)/);
assert.match(transport,/reconnect\(\)\{socket\.stop\(\);readyRoom=false;published=false;socket\.start\(\);\}/);
// GAME OVER per a tots dos només després de la mort definitiva; el 0 HP
// encara permet reanimació i no ha d'aparèixer cap pantalla final.
const start=runtime.indexOf('function showNativeCoopGameOver(');
const end=runtime.indexOf('const NATIVE_VEHICLE_POSE_KEYS',start);
assert.ok(start>=0&&end>start);
const panels=[],nodes=[];
const document={
 createElement(tag){const node={tag,style:{},children:[],append(...children){this.children.push(...children);}};nodes.push(node);return node;},
 body:{appendChild(node){panels.push(node);}}
};
let stopped=0,closed=0;
const show=new Function('document','scopeActive','setSniperScope','cancelGrenadeCharge','stopNativeCoop','ui',
 runtime.slice(start,end)+'\nreturn showNativeCoopGameOver;')(
 document,false,()=>{},()=>{},()=>{stopped++},{show:()=>{closed++}});
const session={};
show(session,{phase:'relay',players:[{hp:0},{hp:25}]});
assert.equal(panels.length,0,'Downed player can still be revived');
show(session,{phase:'failed',players:[{hp:0},{hp:25}]});
assert.equal(panels.length,1,'Game over screen shown on final death');
assert.equal(panels[0].children[0].textContent,'GAME OVER');
show(session,{phase:'failed',players:[{hp:0},{hp:25}]});
assert.equal(panels.length,1,'No duplicate game over screens');
panels[0].children[2].onclick();
assert.equal(stopped,1,'Exit button leaves cooperative runtime');
assert.equal(closed,1,'Exit button opens room lobby');
console.log('native coop visual parity: vehicle trails, swimming, guest reconnect and definitive team GAME OVER passed');
