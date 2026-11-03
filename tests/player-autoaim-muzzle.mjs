import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const player=read('src/characters.js'),combat=read('src/combat.js');
const checks=[
  [player.includes('u.visualAimTargetLocked=false'),'player initializes aim lock'],
  [combat.includes('pl.userData.visualAimTargetLocked=!!focus.target'),'reticle feeds lock to player pose'],
  [player.includes('u.pistolAimTime>0||u.visualAimTargetLocked'),'pistol aims before firing when reticle acquires a target'],
  [player.includes('rig.aimQ.copy(u.visualAimQuaternion)'),'pistol barrel follows actual autoaim quaternion'],
  [player.includes('u.bazookaRightGrip.localToWorld(rig.right)') &&
   player.includes('u.bazookaLeftGrip.localToWorld(rig.left)'),'launcher grip positions follow its rotation'],
  [player.includes('group.quaternion.slerp(u.visualAimQuaternion'),'long guns ease toward selected direction'],
  [!combat.includes('u.assault.rotation.x=-u.upperBody.rotation.x') &&
   !combat.includes('u.assault.rotation.y=-u.upperBody.rotation.y'),'assault shot cannot reset the barrel angle'],
];
for(const [ok,description] of checks)assert.ok(ok,description);
console.log('Player weapon autoaim visuals: static regression assertions passed');
