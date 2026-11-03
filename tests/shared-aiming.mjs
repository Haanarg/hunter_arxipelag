import assert from 'node:assert/strict';
import * as aiming from '../src/aiming-core.mjs';
// The previous 512-case fingerprint encoded the old, deliberately wider assault
// aim. Check the new 80° contract directly instead of blessing a stale hash.
const make=(options={})=>aiming.createAimSelector({origin:{x:0,y:1.5,z:0},direction:[0,0,-1],range:85,cone:.82,shotClass:'pistol',...options});
assert.ok(Math.abs(aiming.RIFLE_AIM_HALF_ANGLE*180/Math.PI-40)<1e-10);
for(const kind of ['assault','sniper'])for(const height of [1.5,30,-20]){
  const atAngle=deg=>({x:Math.sin(deg*Math.PI/180)*20,y:height,z:-Math.cos(deg*Math.PI/180)*20});
  for(const angle of [-39.9,39.9]){
    const aim=make({shotClass:kind,cone:aiming.RIFLE_AIM_CONE}),t=atAngle(angle);
    aim.consider({t:'soldat'},'enemy',0,t.x,t.y,t.z);
    assert.equal(aim.hasTarget,true,`${kind} must accept ${angle} degrees at y=${height}`);
  }
  for(const angle of [-40.1,40.1,80]){
    const aim=make({shotClass:kind,cone:aiming.RIFLE_AIM_CONE}),t=atAngle(angle);
    aim.consider({t:'soldat'},'enemy',0,t.x,t.y,t.z);
    assert.equal(aim.hasTarget,false,`${kind} must reject ${angle} degrees at y=${height}`);
  }
}
let focus={target:'stale',point:{},kind:'stale'},select=make({focus});assert.deepEqual(select.direction(),[0,0,-1]);assert.equal(focus.target,null);const vehicle={id:'car',t:'jeep'},soldier={id:'soldier',t:'soldat'};
select.consider(vehicle,'enemy',aiming.weaponTargetPriority(vehicle,'pistol'),0,1.5,-6);select.consider(soldier,'enemy',aiming.weaponTargetPriority(soldier,'pistol'),3,1.5,-15);assert.equal(focus.target,soldier,'danger class priority beats distance');assert.equal(focus.kind,'enemy');assert.ok(select.direction()[0]>0);
focus={};select=make({focus,isClear:(x,y,z,tx)=>tx!==0});select.consider(soldier,'enemy',0,0,1.5,-10);assert.equal(select.hasTarget,false,'blocked candidate is never acquired');select.consider(vehicle,'enemy',1,3,1.5,-10);assert.equal(focus.target,vehicle);
select=make();select.consider(soldier,'enemy',0,0,1.5,8);assert.equal(select.hasTarget,false,'no aim behind on level ground');select.consider(soldier,'enemy',0,50,1.5,-5);assert.equal(select.hasTarget,false,'no sideways aim outside cone');select.consider(soldier,'enemy',0,0,1.5,-90);assert.equal(select.hasTarget,false,'range is authoritative');
select=make();select.consider(soldier,'enemy',0,0,30,0);assert.ok(select.direction()[1]>.99,'overhead small-arms exception');
let terrainFlag=false;focus={};select=make({shotClass:'heavy',focus,cone:.73,isClear:(...args)=>(terrainFlag=args.at(-1),true)});select.consider(soldier,'enemy',1,0,1.5,-10);const tower={id:'tower',t:'torre'};select.consider(tower,'enemy',aiming.weaponTargetPriority(tower,'heavy'),6,10,-30);assert.equal(focus.target,tower);assert.equal(terrainFlag,true,'heavy aim requests terrain occlusion');
const moving=aiming.bazookaInterceptPoint({x:0,z:-20,hd:-Math.PI/2,speed:6},0,0,0,0,30);assert.ok(moving.x>3.9&&moving.x<4.2);assert.equal(moving.z,-20);assert.deepEqual(aiming.bazookaInterceptPoint({x:0,z:-20,hd:0,speed:0},0,0,0,0,30),{x:0,y:0,z:-20});
console.log('shared aiming: strict ±40° assault/sniper limits, priorities, pistol overhead, vertical range, occlusion, focus and moving-target interception passed');
