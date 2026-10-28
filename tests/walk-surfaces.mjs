import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as walk from '../src/walk-surfaces.mjs';
const reference=createRequire(import.meta.url)('./fixtures/walk-surfaces-v062.cjs');
const stair={x:0,z:0,nx:0,nz:1,top:10,bottom:0,length:10,width:4,ramp:true},pier={x:30,z:0,ux:1,uz:0,px:0,pz:1,length:10,width:4,y:5};
const building={x:50,z:0,w:12,d:12,h:10,fy:0,angle:Math.PI/2,rhp:10,rb:false,upperFloor:true,localW:12,localD:12,storey:5,interiorStair:{...stair,x:50,z:3}};
const bunker={x:80,z:0,w:38,d:32,h:8,fy:2,angle:0,rhp:10,basement:{halfX:25,halfZ:25,floorY:-10,stair:{x:0,width:4,zTop:0,zBottom:15}}};
const terminal={x:100,z:0,ux:1,uz:0,length:10,startY:5,endY:8};
const data={heightAt:()=>-20,stairs:[stair,{...stair,x:10,ramp:false,steps:10,tread:1,rise:1}],piers:[pier],buildings:[building],bunker,terminalRamps:[terminal]};
const old=reference(data);
for(let x=-2;x<=115;x+=.5)for(const z of [-3,0,2,5,10,15])for(const previous of [-Infinity,-12,0,5,10,15]){
 const actual=walk.walkingHeightAt({...data,physical:data.heightAt(x,z)},x,z,previous);assert.equal(actual,old.groundAt(x,z,previous),'legacy walking surface parity');
}
assert.equal(walk.stairHeight(stair,0,5),5);assert.equal(walk.stairHeight({...stair,internal:true,owner:{rb:true}},0,5),null);
assert.equal(walk.pierHeight(pier,30,0,0),null,'cannot jump from water onto pier');assert.equal(walk.pierHeight(pier,30,0,5),5);
assert.equal(walk.upperFloorHeight(building,50,0,0),null,'ground-floor actor cannot teleport upstairs');assert.equal(walk.upperFloorHeight(building,50,0,5),5.15);
assert.equal(walk.bunkerFloorAt(bunker,85,5,-10),-10);assert.equal(walk.terminalRampSurfaceHeight(terminal,105,0),6.5);
assert.equal(walk.walkingHeightAt({physical:0,visible:2},0,0),2,'visible ground remains a local support override');
console.log('walking surfaces: independent legacy parity, ramps/treads, rotated upper floor, no pier/floor teleport, bunker, terminal bridge and local visual support passed');
