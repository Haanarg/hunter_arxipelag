import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAimSelector,weaponTargetPriority,considerArmoredBazooka} from '../src/aiming-core.mjs';
const btr={t:'tanqueta',x:0,z:-45,hd:0},soldier={t:'soldat',x:1,z:-15};
const make=(focus,extra={})=>createAimSelector({origin:{x:0,y:1.9,z:0},direction:[0,0,-1],
 range:200,cone:Math.SQRT1_2,verticalCone:Math.PI/4,shotClass:'heavy',focus,...extra});
assert.equal(weaponTargetPriority(btr,'heavy',true),0);
assert.equal(weaponTargetPriority(btr,'heavy'),2);
assert.equal(weaponTargetPriority(btr,'light',true),1);
for(const kind of ['enemy','vehicle']){
 const focus={},selector=make(focus);
 selector.consider(soldier,'enemy',weaponTargetPriority(soldier,'heavy',true),1,1.5,-15);
 considerArmoredBazooka(selector,btr,kind,0,0);
 assert.equal(focus.target,btr);assert.equal(focus.kind,kind);
 const partial={},visible=make(partial,{isOnScreen:(x,y)=>y>=3.1,isClear:(x,y,z,tx,ty)=>ty>=3.1});
 considerArmoredBazooka(visible,btr,kind,0,0);
 assert.equal(partial.target,btr);assert.ok(partial.point.y>=3.1);
 for(const extra of [{isOnScreen:()=>false},{isClear:()=>false}]){
  const no={},blocked=make(no,extra);considerArmoredBazooka(blocked,btr,kind,0,0);assert.equal(no.target,null);
 }
}
const outside={...btr,x:60,z:-15},focus={},selector=make(focus);
considerArmoredBazooka(selector,outside,'enemy',0,0);assert.equal(focus.target,null);
const solo=readFileSync(new URL('../src/combat.js',import.meta.url),'utf8'),coop=readFileSync(new URL('../server/coop-combat.mjs',import.meta.url),'utf8');
assert.ok(solo.includes("considerArmor(seated,'vehicle',weaponTargetPriority(seated,'heavy',true))"));
assert.ok(coop.includes("considerArmor(carrier,'vehicle',weaponTargetPriority(carrier,'heavy',true))"));
console.log('Bazooka: patrol and boarded BTR-82, armour priority, partial cover, screen and cone OK');
