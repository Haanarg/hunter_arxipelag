import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {createCombatView} from '../src/coop-combat-view.mjs';
const scene=new T.Scene(),view=createCombatView(T,scene),state={targets:[{id:'red',x:1,y:0,z:1,hp:8}],grenades:[{id:'grenade-1',x:2,y:4,z:3}],effects:[{id:2,kind:'shot',from:{x:0,y:1,z:0},to:{x:3,y:1,z:3},hit:'red',tick:4},{id:3,kind:'explosion',at:{x:5,y:0,z:5},radius:8,tick:4}]};
view.update(state,8);scene.updateMatrixWorld();assert.equal(scene.children.length,4);assert.equal(scene.children.find(o=>o.userData.targetId==='red').children[1].scale.x,8/12);for(const o of scene.children)assert.ok(o.matrixWorld.elements.every(Number.isFinite));
const old=scene.children.find(o=>o.userData.grenadeId==='grenade-1');let disposed=false;old.geometry.addEventListener('dispose',()=>disposed=true);view.update({...state,grenades:[],effects:[],targets:[{...state.targets[0],hp:0}]},9);assert.equal(disposed,true);assert.equal(scene.children.length,1);assert.equal(scene.children[0].visible,false);view.destroy();assert.equal(scene.children.length,0);
console.log('combat view: actual Three target health, grenade/shot/explosion geometry, removal/disposal and destroyed target visibility passed (no GPU test)');
