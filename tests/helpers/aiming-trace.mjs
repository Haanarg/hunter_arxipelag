import vm from 'node:vm';
import {createHash} from 'node:crypto';
export function aimingTrace(source,shared){
 const between=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
 // Source comments use straight apostrophes; extract each function by its next declaration/comment.
 const helper=between('function weaponTargetPriority(','// La caseta')+
   (source.includes('function smallArmsAimHorizontalCone(')?between('function smallArmsAimHorizontalCone(',"// Punt d'intercepció"):'')+
   between('function bazookaInterceptPoint(','// Alçada del centre')+
   between('function marineHullTargetY(',"// L'adquisició")+
   between('function autoAimWeaponShot(',"// La retícula i el míssil");
 let value=521736;const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
 const context={Math,window:{HUNTER_SHARED_AIMING:shared},E:[],cv:null,VS:{llanxa:1.95},TOWER_CABIN_CENTER_Y:9.15,hAt:(x,z)=>Math.sin(x*.1)*.3,
   weaponAimClear:(x,y,z,tx,ty,tz)=>Math.abs(Math.round(tx+tz))%7!==0,
   wallCandidates:()=>[{id:'fence',barbed:true,hp:8,x0:-1,x1:1,y0:0,y1:3,z0:-12,z1:-12,cx:0,cz:-12}],
   vehicleCandidatesAt:()=>[{id:'empty-car',t:'cotxe',x:2,z:-14,o:{position:{y:0}}}],vehicleRadius:()=>3.8,
   buildingCandidates:()=>[{id:'house',x:0,z:-30,fy:0,h:6,rhp:12}]};
 vm.createContext(context);vm.runInContext(helper+'\nglobalThis.aim=autoAimWeaponShot;',context);
 const kinds=['soldat','general','jeep','tanqueta','tanc','patrulla_marina','torre'],classes=['pistol','assault','heavy','light','attackCannon'],rows=[];
 for(let n=0;n<512;n++){
  context.E=Array.from({length:n%9},(_,i)=>({id:'target-'+i,t:kinds[Math.floor(random()*kinds.length)],x:(random()-.5)*80,z:(random()-.85)*90,gy:random()*8,hp:i===7?0:12,rocketSoldier:i===5,o:{position:{y:random()*12}},hd:random()*6,speed:random()*12}));
  const focus={},kind=classes[n%classes.length],origin={x:0,y:(n%11)*3,z:0},fx=Math.sin(n*.3)*.3,fy=n%3===0?-.4:0,fz=-1;
  const direction=context.aim(origin.x,origin.y,origin.z,fx,fy,fz,90,kind==='pistol'||kind==='assault'?.82:.73,kind,focus,130,n%4===0?.9:Math.PI/2);
  rows.push({direction:Array.from(direction,x=>Math.round(x*1e9)),target:focus.target?.id||null,kind:focus.kind,point:focus.point&&Object.values(focus.point).map(x=>Math.round(x*1e9))});
 }
 return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
